# Buy Box Density Proposal

Proposal for the buy box on `templates/product.json`, prompted by a mobile screenshot of the
current state. Audit date: 2026-08-11. Everything below is measured against the code as it
stands on `main`, not against a mockup.

Scope: the region from the delivery selector down to the buy-box accordion. Almost all of it
renders from one block, `blocks/voltairs-preorder-offers.liquid`, plus two sibling blocks in
`main > product-details`.

Rules this proposal follows: `PRODUCT.md` (design principles, anti-references, copy rules) and
`PDP-PLAN.md` (the standing offer decisions in section 5).

---

## 1. What is actually on the screen

Counted from the rendered copy, title excluded, one phone screen:

| | Count |
| --- | --- |
| Words of copy | 174 |
| Discrete text runs | 36 |
| Visual groups (bordered or filled boxes) | 7 |
| Tap targets | 10 |
| Choices the shopper is asked to make | 3 |
| Choices that actually change the order | 2 |
| Separate mentions of "sold out" | 3 |
| Separate mentions of the 100-day guarantee | 3 |
| Separate mentions of free US shipping | 2 (3 counting the marquee above) |
| Separate mentions of the delivery window | 2 |
| Struck-through prices | 3 |
| Amber elements competing for the eye | 4 |

A further 68 words sit inside the add-on's `More details` table.

Element inventory, top to bottom, with the source of each:

| # | Element | Source |
| --- | --- | --- |
| 1 | Locked "Order now / Sold out" radio row | `voltairs-preorder-offers`, `mode_now_enabled: false` |
| 2 | "Pre-order the next batch / Arrives Aug 18 to Aug 31" radio row | same block, `mode_pre_label`, `mode_pre_sub` |
| 3 | 19-word reason line | same block, `modes_note` |
| 4 | 1 Kit card | same block, `offer_1_*` |
| 5 | 2 Kits card with "EXTRA 10% OFF" chip | same block, `offer_2_*`, `offer_2_save_label` |
| 6 | Dashed amber upsell nudge with "Switch" | same block, `nudge_text`, `nudge_action` |
| 7 | Amber add-on card, 9 stacked layers | same block, `addon_*`, `provider_*`, `details_*` |
| 8 | Free shipping and delivery line | same block, `shipping_highlight`, `ship_fallback_text` |
| 9 | Amber CTA with price | same block, `cta_label` |
| 10 | "Secure checkout. 100-day money-back guarantee." | same block, `trust_line` |
| 11 | "100-day money-back guarantee. Take it on a real trip first, then decide." | `text_tJbBCg` |
| 12 | Shipping and delivery / Returns and guarantee accordion | `accordion_bQn6Wi` |

Eleven of those twelve are stacked between the kit choice and the button. The kit choice is the
only one the shopper has to engage with.

---

## 2. Why it reads as confusing

Six findings, worst first. These are not style opinions, each one is a place where the page
contradicts itself or asks for work it does not need.

### 2.1 The button price does not match the selected card

The 1 Kit card is selected and reads **$89.99**. The button reads **$99.99**. The only thing on
screen that explains the gap is `+ $10.00` in the add-on row, three elements away and in a
different colour block. There is no summary, no subtotal, no line that adds up.

This is the single most damaging item on the screen. A shopper who notices reads it as either a
bait price on the card or a silent upsell in the button, and both readings kill the sale. A
shopper who does not notice finds the surprise in the cart instead.

`syncSelection()` in the block already knows the correct total: it swaps `data-price` for
`data-price-with-addon` at line 1410. The arithmetic is right, it is just never shown.

The fix has to close the gap without adding to it. An itemised order summary was the first draft
of 4.1 and it was the wrong call: it cuts five elements and adds a sixth, and it makes a promise
the theme cannot keep. The bundle discount is display only, as the comment at line 83 says, so a
row reading **Total $161.99** looks like a receipt while being computed from the same display
math as the card. If the automatic discount in Shopify is ever misconfigured, breaking that
promise costs more than breaking the card's. A summary starts to earn its space at three or more
line items, or once shipping tiers or pre-checkout tax enter the picture. At two line items it is
overhead.

### 2.2 One card tells two different discount stories

The 2 Kits card carries an `EXTRA 10% OFF` chip while its own struck-through price says
$161.99 against $299.96, which is 46 percent off. The 10 percent is the incremental bundle
discount, the 46 percent is the bundle discount stacked on the variant's compare-at price. Both
numbers are arithmetically true and they cannot both be the headline.

The compare-at price is also new since the last audit. `PDP-PLAN.md` section 1 records
"Fake $179.99 anchor and permanent 50% off, `compareAtPrice` cleared, sells at honest $89.99",
and section 5 says "Hold $89.99, no anchor, no countdown. The savings math is the discount
story." The variant now carries $149.98, so `o1_baseline` at line 106 picks it up, the anchor is
back on both cards, and `PRODUCT.md` lists "50% OFF TODAY badges" as a named anti-reference.

That is a merchandising decision, not a bug, so it needs the founder's call rather than a commit.
But whichever way it goes, one discount statement per card is the fix.

### 2.3 The same upgrade is sold three times in a row

Within about 300 vertical pixels, the 2-kit upgrade is pitched by: the `EXTRA 10% OFF` chip and
the `$80.99 per kit` line on the card, then the 19-word nudge restating the identical offer
immediately below it, then the add-on's "Free with 2 kits" state.

The nudge is the clearest cut on the page. It is the second-heaviest element on the screen after
the button, it sits directly beneath the card that already says the same thing, and it exists to
sell a choice the shopper is looking at. Repeating an offer does not make it more persuasive, it
makes the page look like it is pushing.

### 2.4 A radio group with one available option

`mode_now_enabled` is `false`, so the delivery fieldset renders a dashed, 55-percent-opacity
"Order now / Sold out" row above the real one. Two radios, one selectable. Then the 19-word
`modes_note` explains the sold-out state a third time, after the locked row's "Sold out" and the
word "Pre-order" in the label.

A radio group is a promise that there is something to decide. When there is not, it costs three
lines, two tap targets and a moment of reading to arrive back where the shopper started. The
control should exist only while both modes are live.

### 2.5 The add-on is a nine-layer object for a ten dollar digital item

Counting the layers: checkbox, icon, eyebrow, title, `EXCLUSIVE` badge, 23-word description,
"Works with the AI you already use" label, four provider logos plus "and more", price, and a
`More details` disclosure holding a four-row comparison table.

It is the deepest, tallest and most decorated thing in the buy box, and it is not the product.
It out-competes the kit choice for attention on a screen where the kit choice is the decision
that matters. The add-on deserves a line, an amount, and a way to learn more, in that order.

### 2.6 Amber has stopped meaning anything

`PRODUCT.md` design principle 3: "Amber is reserved for the one thing that should draw the eye."
Amber currently carries the 2 Kits savings chip, the nudge border and its `+` mark, the add-on
card fill and its checkbox, and the CTA. Four amber things, so the button is not visually the
answer to the page, it is one of four highlights.

The related duplication is cheaper still to fix: the guarantee is stated in `trust_line`, then
again verbatim in `text_tJbBCg` one line below, then a third time in the accordion's "Returns
and guarantee" row. The delivery window appears in the pre-order row and again in the shipping
line. And the struck-through `$14.90` shipping cost sits beside two struck-through product
prices, which reads as a third discount rather than as a shipping benefit.

---

## 3. The proposed buy box

Target order on mobile, at 390px:

| # | Element | Change |
| --- | --- | --- |
| 1 | One-line batch status: "Sold out. The next batch arrives Aug 18 to Aug 31 and yours ships the day it lands." | replaces items 1 to 3 |
| 2 | 1 Kit / 2 Kits cards, one discount statement each, per-kit price on the bundle | kept, simplified |
| 3 | "Free US shipping. Tracking lands in your inbox the moment it ships." | kept, shortened |
| 4 | Add-on: title, price, checkbox on one row. Description, providers and table behind one disclosure | collapsed, **moved** to sit directly above the button |
| 5 | CTA naming what it charges for: "Pre-order 1 Kit + planner &nbsp; $99.99" | kept, label reconciles the price |
| 6 | One line under the button: secure checkout, 100 days, trip-first framing | merged from two |
| 7 | Shipping and delivery / Returns and guarantee accordion | kept |

Removed outright: the locked radio row, the reason line as a separate paragraph, the upsell
nudge, the duplicate guarantee line, the second delivery window, the struck-through shipping
price.

Nothing is added. The price gap in 2.1 closes by moving the add-on next to the button rather than
three elements away from it, and by letting the button say what is in the order.

Projected effect: 174 words to 94, 36 text runs to 21, seven visual groups to four, ten tap
targets to seven, three asked-for choices to two, and one amber element instead of four. The
number of facts the page communicates does not change; it stops saying each of them twice.

---

## 4. Change list

### P0, fixes a contradiction the shopper can see

**4.1 Make the button explain its own price.** Two moves, no new elements.

First, move the add-on above the CTA so the ship line no longer sits between the `+ $10.00` and
the total it changes. Adjacency does most of the work: the two numbers that have to reconcile end
up next to each other.

Second, when the add-on is billed, name it in the button: `Pre-order 1 Kit + planner  $99.99`.
`syncSelection()` already computes `billed` at line 1409, one line below where the label is set,
so this is a reorder of two statements plus a suffix. At 390px the label renders at 0.92rem in a
56px flex row, which holds the extra two words.
*Where:* `blocks/voltairs-preorder-offers.liquid`, lines 1141 to 1294 for the order, lines 1372 to
1414 for the label. *Effort:* small.

**4.2 Collapse the delivery selector when only one mode is live.** When `mode_now_enabled` is
false, render a single status line that folds `modes_note` and the arrival window together, and
skip the fieldset. When it flips true, the radios come back unchanged.
*Where:* same block, lines 984 to 1029. *Effort:* small.

**4.3 Delete the upsell nudge from the template.** Clear `nudge_text` in
`templates/product.json`. The block already hides it when 2 Kits is selected, so it is only ever
redundant with the card above it. Keep the setting and the code so it can be reused where the
alternative offer is not on screen, for example in a cart drawer.
*Where:* `templates/product.json`, `voltairs_preorder_offers_WVpQXg.settings.nudge_text`.
*Effort:* one line.

**4.4 Delete the duplicate guarantee line.** Remove `text_tJbBCg` and fold its trip-first
framing into `trust_line`: "Secure checkout. 100-day money-back guarantee, so you can take it on
a real trip first." One statement, in the place a shopper looks for it, which is directly under
the button.
*Where:* `templates/product.json`. *Effort:* one line.

### P1, removes competing signals

**4.5 Reduce the add-on to one row plus a disclosure.** Keep the checkbox, the title, and the
price visible. Move `addon_sub`, the provider logos and the comparison table inside a single
`What it does` disclosure, and drop either the amber card fill or the `EXCLUSIVE` badge, since
two badges on one row is the crowding.
*Where:* same block, lines 1141 to 1258, plus its stylesheet. *Effort:* medium.

**4.6 Take amber down to one use.** Amber for the CTA only. The savings chip goes navy on the
pale blue already used for section eyebrows, and the add-on card goes to the same white surface
and grey border as the offer cards. This is the change that makes the button obvious again.
*Where:* same block's stylesheet, plus `accent_color` usage. *Effort:* small.

**4.7 Drop the struck-through shipping price.** Remove `shipping_was`. "Free US shipping" is the
benefit; a struck-through $14.90 beside two struck-through product prices reads as a third
discount and invites the question of whether $14.90 was ever charged.
*Where:* `templates/product.json`. *Effort:* one line.

**4.8 Show the delivery window once.** With 4.2 in place the arrival date lives in the status
line, so the shipping line keeps only "Free US shipping. Tracking lands in your inbox the moment
it ships."
*Where:* `templates/product.json`, `ship_fallback_text`. *Effort:* one line.

### P2, polish

**4.9 Replace the ticked-and-disabled add-on checkbox.** When the add-on is free with 2 kits the
input is `checked` and `disabled`, so it leaves the tab order and reads as a control that broke.
Render a static "Included free" row with a checkmark instead, and keep the real checkbox for the
paid state only.
*Where:* same block, lines 1144 to 1154. *Effort:* small.

**4.10 One discount statement per card.** Mechanical once section 5 below is decided.
*Where:* `templates/product.json`, or Shopify admin if the anchor is cleared. *Effort:* small.

---

## 5. Two decisions needed before 4.10 ships

**5.1 The $149.98 compare-at price.** It was cleared once already, on the reasoning in
`PDP-PLAN.md` sections 1 and 5, and it is back on the variant. Either it stays, in which case
the cards should lead with the compare-at saving and the `EXTRA 10% OFF` chip becomes a
secondary line, or it is cleared again and the 10 percent bundle discount is the only discount
the buy box claims. My recommendation is to clear it: a 1.67x anchor on a product with zero
reviews is the exact pattern `PRODUCT.md` names as an anti-reference, and the savings-versus-fees
math is a stronger and defensible story. Either way, one number per card.

**5.2 Whether the planner should be pre-ticked.** `addon_default_checked` is `false`, which is
the honest default, and the reason the button price ever disagrees with the card price is that the
shopper ticked it themselves. Worth confirming that is intended, because with 4.1 in place a
pre-ticked add-on becomes defensible: the button would name it outright, so it reads as a line the
shopper can see and untick rather than a $10 gap they have to work out.

---

## 6. Deliberately not proposed

- **An itemised order summary.** Considered and dropped, for the reasons in 2.1: it adds a group
  to a buy box whose problem is that it has too many, and it presents display-only bundle maths as
  a total. Revisit at three or more line items.
- **Cutting facts.** Every claim on the screen earns its place: the sold-out state, the arrival
  window, free shipping, the guarantee, the bundle discount, the add-on price. The proposal
  removes repetitions and one contradiction, not information.
- **Moving the offer cards or the CTA.** The order of the buy box is right. Choose the kit, see
  the total, buy.
- **Hiding the add-on behind the accordion.** It is a real revenue lever and `PRODUCT.md` rules
  against burying detail in accordions. One row and a disclosure keeps it sellable.
- **A sticky mobile add-to-cart bar.** Still the right next thing to build, but it is a separate
  piece of work and is already tracked as `PDP-PLAN.md` item 2.2.
