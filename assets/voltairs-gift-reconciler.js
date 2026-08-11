import { CartUpdateEvent, ThemeEvents } from '@theme/events';

/**
 * Keeps the free Smart Travel Planner in step with how many kits are in the cart.
 *
 * The product page's offer block can only act when its own button is pressed, so a
 * customer who reaches two kits by bumping the quantity in the cart drawer would never
 * get the gift. This watches the cart itself instead, so any route to two kits works.
 *
 * The gift is a separate $0.00 product rather than a Shopify Buy X Get Y discount.
 * A BXGY discount will not stack against a product discount that targets its own
 * customer-buys product, and the store's percentage-off discount does exactly that, so
 * Shopify keeps the larger of the two and the planner never comes out free.
 *
 * Config arrives from snippets/voltairs-gift-reconciler.liquid.
 */

const SOURCE_ID = 'voltairs-gift-reconciler';

/** @typedef {{kitProductId: number, freeVariantId: number, paidVariantId: number, minKitQty: number}} GiftConfig */

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
      freeVariantId: Number(parsed.freeVariantId),
      paidVariantId: Number(parsed.paidVariantId),
      minKitQty: Number(parsed.minKitQty),
    };

    // A missing product resolves to 0, which would match nothing and quietly
    // reconcile against the wrong line. Better to stay switched off.
    if (!config.kitProductId || !config.freeVariantId || config.minKitQty < 1) return null;

    return config;
  } catch (_) {
    return null;
  }
}

/**
 * Works out which line quantities need changing, if any.
 * @param {GiftConfig} config
 * @param {{items: Array<{product_id: number, variant_id: number, quantity: number}>}} cart
 * @returns {Record<number, number>} Absolute quantities keyed by variant id.
 */
function planUpdates(config, cart) {
  const items = cart.items ?? [];
  const kitCount = items
    .filter((item) => item.product_id === config.kitProductId)
    .reduce((total, item) => total + item.quantity, 0);

  const free = items.find((item) => item.variant_id === config.freeVariantId);
  const paid = items.find((item) => item.variant_id === config.paidVariantId);

  /** @type {Record<number, number>} */
  const updates = {};

  if (kitCount >= config.minKitQty) {
    if (free?.quantity !== 1) updates[config.freeVariantId] = 1;

    // The planner is free at this quantity, so leaving a paid copy in the cart
    // would charge for the gift.
    if (config.paidVariantId && paid) updates[config.paidVariantId] = 0;
  } else if (free) {
    updates[config.freeVariantId] = 0;
  }

  return updates;
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
 * The drawer opens on any cart:update when it carries auto-open, which would pop it
 * open on page load or while the customer is reading the cart page.
 * @param {object} cart
 * @param {Record<string, string> | undefined} sections
 */
function announce(cart, sections) {
  const drawers = [...document.querySelectorAll('cart-drawer-component[auto-open]')];
  const restore = drawers.map((el) => /** @type {const} */ ([el, el.getAttribute('auto-open')]));

  for (const [el] of restore) el.removeAttribute('auto-open');

  try {
    document.dispatchEvent(
      new CartUpdateEvent(cart, SOURCE_ID, {
        itemCount: cart.item_count,
        sections,
      })
    );
  } finally {
    // Listeners run synchronously during dispatch, so the attribute is safe to put
    // back straight away.
    for (const [el, value] of restore) el.setAttribute('auto-open', value ?? '');
  }
}

let running = false;

/**
 * Brings the cart in line with the gift rule. Silent when nothing needs changing.
 * @param {GiftConfig} config
 */
async function reconcile(config) {
  if (running) return;
  running = true;

  try {
    const cart = await (await fetch(`${Theme.routes.cart_url}.js`)).json();
    const updates = planUpdates(config, cart);

    if (Object.keys(updates).length === 0) return;

    const sectionIds = cartSectionIds();
    const response = await fetch(`${Theme.routes.cart_update_url}.js`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        updates,
        ...(sectionIds.length ? { sections: sectionIds.join(','), sections_url: window.location.pathname } : {}),
      }),
    });

    if (!response.ok) return;

    const updated = await response.json();
    announce(updated, updated.sections);
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
