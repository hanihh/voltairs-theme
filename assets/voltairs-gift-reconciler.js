import { CartUpdateEvent, ThemeEvents } from '@theme/events';

/**
 * Keeps the free Smart Travel Planner in step with how many kits are in the cart.
 *
 * The product page's offer block can only act when its own button is pressed, so a
 * shopper who reaches two kits by bumping the quantity in the cart drawer would never
 * get the gift. This watches the cart itself, so any route to two kits works.
 *
 * The gift is the ordinary paid planner, zeroed by the store's "Free Planner" Buy X Get
 * Y discount, rather than a separate $0.00 product. A $0.00 product would be orderable
 * on its own by anyone who read the page source, and would need its own copy of the
 * digital file. Letting the discount do it means Shopify enforces the two kit condition
 * server side: below two kits the planner is simply charged at full price.
 *
 * That leans on the BXGY discount combining with the store's percentage-off discount,
 * which is not a given. BXGY will not stack against a product discount that targets its
 * own customer-buys product, and Shopify silently keeps whichever is worth more. So
 * after adding the gift this checks that the line really came out free, and pulls it
 * back out if it did not. Failing to a missing gift is recoverable; quietly charging for
 * one is not.
 *
 * Config arrives from snippets/voltairs-gift-reconciler.liquid.
 */

const SOURCE_ID = 'voltairs-gift-reconciler';

/** Hidden line item property marking a line this script or the offer block added. */
const GIFT_MARK = '_voltairs_gift';

/** @typedef {{kitProductId: number, plannerProductId: number, plannerVariantId: number, minKitQty: number, giftNoteLabel: string, giftNoteValue: string}} GiftConfig */

/**
 * Reads the config the snippet embedded in the page.
 * @returns {GiftConfig | null}
 */
function readConfig() {
  const el = document.getElementById('voltairs-gift-config');

  if (!el?.textContent) return null;

  try {
    const parsed = JSON.parse(el.textContent);
    const config = {
      kitProductId: Number(parsed.kitProductId),
      plannerProductId: Number(parsed.plannerProductId),
      plannerVariantId: Number(parsed.plannerVariantId),
      minKitQty: Number(parsed.minKitQty),
      giftNoteLabel: String(parsed.giftNoteLabel || 'Smart Travel Planner'),
      giftNoteValue: String(parsed.giftNoteValue || 'Free with 2 kits'),
    };

    // A missing product resolves to 0, which would match nothing and reconcile
    // against the wrong line. Better to stay switched off.
    if (!config.kitProductId || !config.plannerProductId || !config.plannerVariantId) return null;
    if (config.minKitQty < 1) return null;

    return config;
  } catch (_) {
    return null;
  }
}

/**
 * @typedef {{key: string, product_id: number, variant_id: number, quantity: number, final_line_price: number, properties: Record<string, string> | null}} CartLine
 */

/**
 * Splits the cart into the numbers this script reasons about.
 * @param {GiftConfig} config
 * @param {{items?: CartLine[]}} cart
 */
function survey(config, cart) {
  const items = cart.items ?? [];
  const kitCount = items
    .filter((item) => item.product_id === config.kitProductId)
    .reduce((total, item) => total + item.quantity, 0);

  const planners = items.filter((item) => item.product_id === config.plannerProductId);

  return {
    kitCount,
    qualifies: kitCount >= config.minKitQty,
    planners,
    ours: planners.filter((item) => item.properties?.[GIFT_MARK] === 'true'),
  };
}

/**
 * Cart section ids rendered on this page, so the theme can morph rather than refetch.
 * @returns {string[]}
 */
function cartSectionIds() {
  return [...document.querySelectorAll('cart-items-component[data-section-id]')].flatMap((el) =>
    el instanceof HTMLElement && el.dataset.sectionId ? [el.dataset.sectionId] : []
  );
}

/**
 * Tells the theme the cart changed, without tripping the drawer's auto-open.
 *
 * The drawer opens on any cart:update while it carries auto-open, which would pop it
 * open on page load or while the shopper is reading the cart page. cart-icon defaults a
 * missing itemCount to 0, so the real count has to travel with the event.
 * @param {{item_count: number}} cart
 * @param {Record<string, string>} [sections]
 */
function announce(cart, sections) {
  const drawers = [...document.querySelectorAll('cart-drawer-component[auto-open]')];
  const restore = drawers.map((el) => /** @type {[Element, string | null]} */ ([el, el.getAttribute('auto-open')]));

  for (const [el] of restore) el.removeAttribute('auto-open');

  try {
    document.dispatchEvent(new CartUpdateEvent(cart, SOURCE_ID, { itemCount: cart.item_count, sections }));
  } finally {
    // Listeners run synchronously during dispatch, so this is safe to put back now.
    for (const [el, value] of restore) el.setAttribute('auto-open', value ?? '');
  }
}

/**
 * @param {string} route
 * @param {object} body
 */
async function post(route, body) {
  const response = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`${route} responded ${response.status}`);

  return response.json();
}

/**
 * Theme.routes ships cart_add_url with the .js suffix already on it, but not the others.
 * @param {string} route
 */
function js(route) {
  return route.endsWith('.js') ? route : `${route}.js`;
}

let running = false;

/**
 * Set once the discount has been seen not to zero the planner. Stops this from adding
 * and removing the same line on every cart change for the rest of the page's life.
 */
let giftUnavailable = false;

/**
 * Brings the cart in line with the gift rule. Silent when nothing needs changing.
 * @param {GiftConfig} config
 */
async function reconcile(config) {
  if (running) return;
  running = true;

  try {
    let cart = await (await fetch(js(Theme.routes.cart_url))).json();
    let state = survey(config, cart);
    let changed = false;

    if (state.qualifies) {
      // Any planner already in the cart is the one the discount will zero, whether the
      // shopper chose it or the offer block added it. Only step in when there is none.
      if (state.planners.length === 0 && !giftUnavailable) {
        await post(js(Theme.routes.cart_add_url), {
          items: [
            {
              id: config.plannerVariantId,
              quantity: 1,
              properties: { [config.giftNoteLabel]: config.giftNoteValue, [GIFT_MARK]: 'true' },
            },
          ],
        });

        cart = await (await fetch(js(Theme.routes.cart_url))).json();
        state = survey(config, cart);
        changed = true;

        // The discount has to actually land, or the shopper pays for the gift.
        const unpaidFor = state.ours.every((line) => line.final_line_price === 0);

        if (!unpaidFor) {
          giftUnavailable = true;

          for (const line of state.ours) {
            cart = await post(js(Theme.routes.cart_change_url), { id: line.key, quantity: 0 });
          }
        }
      }
    } else if (state.ours.length > 0) {
      // Below the bundle the gift goes back out, but a copy the shopper paid for stays.
      for (const line of state.ours) {
        cart = await post(js(Theme.routes.cart_change_url), { id: line.key, quantity: 0 });
      }

      changed = true;
    }

    if (!changed) return;

    // Re-render from the server so line prices and discount rows are the real ones.
    const sectionIds = cartSectionIds();

    if (sectionIds.length) {
      cart = await post(js(Theme.routes.cart_update_url), {
        updates: {},
        sections: sectionIds.join(','),
        sections_url: window.location.pathname,
      });
    }

    announce(cart, cart.sections);
  } catch (_) {
    // The cart still works without the gift. Never block checkout over it.
  } finally {
    running = false;
  }
}

const config = readConfig();

if (config) {
  document.addEventListener(ThemeEvents.cartUpdate, (event) => {
    // Our own announcement would otherwise send us straight back round.
    if (/** @type {CustomEvent} */ (event).detail?.sourceId === SOURCE_ID) return;

    reconcile(config);
  });

  // Catch carts that already drifted, e.g. two kits carried over from a past session.
  reconcile(config);
}
