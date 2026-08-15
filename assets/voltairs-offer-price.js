/**
 * Takes the theme's price block off the product page once the Bundlex offer widget
 * has drawn itself, so the page carries one price rather than two.
 *
 * The trigger is the widget being on screen, not the page having loaded. The widget
 * is the app's to render and it does not always turn up, and a product page with no
 * price on it is worse than one with a price too many, so the block stays until
 * there is something to replace it.
 *
 * Hiding is one way for the same reason the trigger is what it is. The app redraws
 * its widget whenever the shopper switches offer, and the wrapper is empty for a
 * moment in the middle of that; a rule that hid and showed by what is on screen
 * right now would flash the old price back every time somebody picked an offer.
 *
 * Config arrives from snippets/voltairs-offer-price.liquid.
 */

const CONFIG_ID = 'voltairs-offer-price-config';

/**
 * A widget shorter than this is a wrapper the app has not filled in yet. Shopify
 * renders the block whether or not the app ever answers, so the wrapper's own
 * presence says nothing.
 */
const MIN_HEIGHT = 40;

/** The theme's own utility, `display: none !important`; see base.css. */
const HIDDEN = 'hidden';

const configEl = document.getElementById(CONFIG_ID);

if (configEl?.textContent) init(JSON.parse(configEl.textContent));

/**
 * @typedef {{priceSelector: string, widgetSelector: string}} OfferPriceConfig
 */

/**
 * @param {OfferPriceConfig} config
 */
function init(config) {
  if (!config.priceSelector || !config.widgetSelector) return;

  let drawn = false;
  let frame = 0;

  /**
   * Whether the widget is on screen. Only asked until the answer is yes, since it
   * costs a layout and the answer is not allowed to go back to no.
   * @returns {boolean}
   */
  function widgetDrawn() {
    return [...document.querySelectorAll(config.widgetSelector)].some(
      (el) => el instanceof HTMLElement && el.offsetHeight >= MIN_HEIGHT && el.firstElementChild
    );
  }

  /**
   * Hides every price block, once the widget has been seen. Re-queried rather than
   * held onto: the section is re-rendered on a variant change in some themes, and a
   * block that came back would come back without the class.
   */
  function apply() {
    if (!drawn) drawn = widgetDrawn();

    if (!drawn) return;

    for (const price of document.querySelectorAll(config.priceSelector)) {
      price.classList.add(HIDDEN);
    }
  }

  /** Mutations arrive in bursts while the app draws; one look per frame is enough. */
  function schedule() {
    if (frame) return;

    frame = requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  apply();

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('shopify:section:load', schedule);
}
