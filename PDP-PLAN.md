# Product Page Plan

Working plan for the Voltairs Travel Vacuum Bag Kit product page (`templates/product.json`).
Audit date: 2026-08-08. State verified against repo and live Shopify data: 2026-08-09.

Store context at audit time: 0 orders, 25 units in stock, single variant at $89.99, Basic plan.
Rules this plan follows: `PRODUCT.md` (brand, anti-references, copy rules) and the canonical claim
set (100-day guarantee, free US shipping, info@voltairs.com).

---

## 1. Already fixed (do not redo)

Landed in commits `34757d7`, `f8008fe`, `42ba362`.

| Issue | Resolution |
| --- | --- |
| Hair-clipper comparison table live in "Voltairs vs. The Rest" (Pitbull Gold Pro GX5, Remington Balder Boss, "Nose Trimmer FREE", "33,818 reviews") | Block removed from `templates/product.json` |
| Stray leftover block listing "Adjustable Leg Wraps / Control Panel / 90-Day Satisfaction Guarantee" | Removed |
| Fabricated testimonials (Jake M., Sarah K., Marco D.) in the Shopify description | "What Travelers Say" section deleted from `descriptionHtml` |
| Four conflicting guarantees (30 / 90 / 100-day / Lifetime) | Unified to 100-day everywhere |
| Fake $179.99 anchor and permanent "50% off" | `compareAtPrice` cleared, sells at honest $89.99 |
| Inflated fee math ("$56+ each way, $112+ per flight") | Corrected to $45 to $50 each way, $90 to $100 per round trip; family figure now $700+ |
| "per flight" vs "per round trip" inconsistency between homepage and PDP | Standardized on per round trip |
| Em dashes throughout, including the `—and` spacing bug | Removed from template and description |
| Named-competitor table ("Aerless", "Ekster", prices as "Higher") | Replaced with honest category comparison |
| Two empty enabled sections (`section_akcqcb`, `section_bfpLe6`) | Disabled |
| Buy-box accordion with an empty row | Replaced with real shipping and returns rows |

---

## 2. Open items, in priority order

### P0 — Blocks the page from converting paid traffic

**2.1 No compression demo in the gallery**
The gallery is 8 static PNGs. `PRODUCT.md` design principle #1 is "show the compression, don't
claim it," and the PDP gallery is the surface where that matters most. A 10 to 15 second
before/after loop (pile of clothes to flat bag, single take, no cuts) belongs in gallery slot 1 or 2.
The media gallery block already supports video (`media_presentation: carousel`, `video_loop`
available in `main > media-gallery`). This is an asset problem, not a code problem.

**2.2 Mobile checkout friction**
Most traffic is phones and the page is long, so the buy button scrolls away and never comes back.
Three separate fixes:
- Sticky add-to-cart bar on mobile. Not present in the theme; needs building. Carried over from the
  earlier mobile audit where it is also still open.
- `accelerated-checkout` block is `disabled: true` in `main > product-details > buy_buttons_eYQEYi`.
  Enabling it puts Shop Pay and PayPal express on the PDP. One-line change in the template.
- Shop Pay installments display is off (`show_installments: false` on `price_a7krng`). At $89.99,
  showing roughly $22.50 x 4 measurably softens the sticker.

**2.3 No objection handling**
The page answers "why buy" but never answers "what could go wrong," which is what a skeptical
buyer actually needs. Missing, in rough order of how often they kill a sale:
- Do clothes come out wrinkled? (the #1 objection for compression bags, currently unmentioned)
- Does compression help with airline *weight* limits? Honest answer is no, it saves space not
  weight. Saying so builds more trust than dodging.
- Will TSA or airport security flag a vacuum-sealed bag?
- How does the pump charge, is it USB-C, does it work on 220V abroad?
- How many trips do the bags survive before the seal gives out?

Best placed as a short, plainly-worded FAQ below "Product details." This outperforms adding another
benefits block.

### P1 — Meaningful conversion and revenue lift

**2.4 The best sales copy is hidden in closed accordions**
The Problem, The Solution, What's in the Kit, and How It Works all sit behind collapsed rows in
`section_7YAPWW`. This contradicts the "details inline, not accordions" rule in `PRODUCT.md`, and
most visitors never open an accordion. Promote The Problem, The Solution, and How It Works to
visible sections. Keep accordions only for genuine reference material: dimensions, shipping,
returns, FAQ.

**2.5 No AOV lever**
Single variant, `quantity` block disabled, no bundle. Families are a named persona in `PRODUCT.md`
and one kit is genuinely not enough for four people. Add a two-kit bundle around $149 to $159.
Requires a second variant or a bundle product in Shopify, plus a variant picker on the PDP.

**2.6 Start collecting real reviews from day one**
The fake testimonials are gone, which is correct, but the page now has zero social proof and the
$89.99 price needs it. Install a review app (Judge.me free tier or similar) with post-delivery
request emails, so real reviews accumulate from the first orders. Do not display a rating widget
until there are real ratings to show.

### P2 — Polish, SEO, accessibility

**2.7 Product title is a dropship tell**
"Voltairs Travel Vacuum Bag Kit - Updated Version" — updated from what? Suggest
"Voltairs Travel Vacuum Kit | 2 Compression Bags + Electric Pump", which carries the offer and
reads as a real product. Shopify admin change.

**2.8 All 8 product images have empty alt text**
Against the WCAG 2.1 AA commitment in `PRODUCT.md`, and free SEO left on the table. Shopify admin
or API change.

**2.9 Empty section still rendering**
`blocks_MHJiUw` (type `_blocks`) is enabled with zero blocks. Disable or remove.

---

## 3. Product story: V1 and V2

Decided 2026-08-09.

**What exists.** Two products in Shopify: the live kit (25 in stock, $89.99) and
`Voltairs Travel Vacuum Bag Kit - V1` (`gid://shopify/Product/15646101733716`), which is **DRAFT,
never published, 0 inventory, 0 sales**. V1 carries the exact same 8 images as V2, the same price,
and the pre-fix description: the $112 fee math, em dashes, the fake Jake M. / Sarah K. / Marco D.
testimonials, the 30-day guarantee, and the invented "Aerless" and "Ekster" competitors.

**Decision: do not publish the V1 page.** Reasons, in order of weight:

1. Publishing it republishes the fake reviews and the wrong fee math that commits `34757d7` through
   `42ba362` just removed. The testimonials are an FTC violation, not a style problem.
2. Two live pages with identical images, identical price, and near-identical copy is duplicate
   content. Google picks one canonical, and it may well pick the out-of-stock one. Real harm to a
   store that has never ranked.
3. The usual reasons to keep a legacy product page do not apply here. No backlinks, no rankings, no
   install base, no owners needing support docs. Nothing to preserve.
4. It creates a dead end: a page a visitor can read but not buy from.
5. There are no V1 photos. V1 reuses V2's images, so "similar page, different images" has no assets
   behind it.

V1 stays in draft. If the URL is ever wanted, 301 it to the live product.

**Decision: tell the improvement story on the live page, framed against the generic bag.**
Since V1 was never sold to anyone, a "we fixed what was wrong with V1" narrative would be invented
product history, the same category of manufactured credibility as the testimonials just removed, and
against the fabrication rule in `PRODUCT.md`. The improvements themselves are real relative to the
standard vacuum bag every competitor sells, so that is the honest and strategically stronger
comparison: it differentiates against rivals instead of against your own past self.

Shipped as `section_Rv2Chg1` ("What we changed in this version"), inline rather than in an accordion,
placed after Product details. Three changes, each stated as a traveler benefit:
- D-ring on both sides of the zipper, so it seals in one pass instead of fighting back
- Sized to lie flat in a carry-on or backpack at 18.5 x 11.8 x 5.9 in
- Heavier water-resistant laminate that holds compression overnight

**Deliberately left out: "we made the instructions more visible."**
Pre-purchase, it answers a question no one asked and plants the doubt that the kit is fiddly, which
works directly against the "compresses in seconds" pitch. The improvement is worth keeping in the
box; the claim costs more than it earns on the sales page. Put it in the FAQ under "how do I use
it" instead.

**Open:** "improved material" currently reads as a generic claim. It needs a real spec to persuade
(laminate type and thickness, e.g. 0.1mm PA+PE versus the standard 0.08mm). If the supplier sheet
has those numbers, put them in. If V1 was in fact sold through another channel such as Amazon or
TikTok Shop, then explicit V1-to-V2 language becomes honest and this section can be reworded.

## 4. Social proof: what can and cannot be said yet

State as of 2026-08-10: **0 orders, ever.** Two customer records exist, both with `numberOfOrders: 0`,
so they are signups or abandoned checkouts, not buyers. Nobody has received the kit.

**A "What our customers say" section cannot ship until there are customers.** Writing one now means
inventing a reviewer, which is what the Jake M. / Sarah K. / Marco D. block was, and that block was
removed because fabricated reviews violate the FTC rule (16 CFR Part 465, per-violation penalties)
and the fabrication rule in `PRODUCT.md`. Framing does not fix it: "our customers say" with zero
customers is the same claim regardless of wording.

**What shipped instead.** The trip content (five days solo in one carry-on, second bag for laundry,
no odor once zipped, pays for itself) is all usable as product capability rather than testimony,
because it describes what the kit does rather than who liked it. Shipped as `section_Wy2Bag1`
("Why two bags, not one"), placed after the benefits grid and before Product details:

- One clean bag, one for worn clothes, with the odor sealed in. This finally answers *why* two bags,
  which is the main differentiator against every single-bag competitor and was previously unexplained
  anywhere on the page.
- A five-day solo wardrobe fits one bag and leaves the second free. Consistent with the existing
  8-to-10-days-per-bag capacity claim, and deliberately conservative against it.
- $89.99 once versus $90 to $100 per round trip in fees, stated inline rather than buried in an
  accordion.

**Shipped: the founder's note** (`section_Fndr01`, "Why I built this", after What we changed).
Approved 2026-08-10 and expanded with the founder's family account: three kids, three checked bags,
two suitcases lost and returned days later, then five people's clothes in one checked bag and about
$250 back. It keeps the admission that a checked bag was still needed, which is what makes the rest
credible, and it closes by putting the 100-day guarantee in the founder's own voice. This is the
page's credibility anchor until real reviews exist.

Two details worth tightening:

- **The $250 is defensible but the page cannot show its work.** A reader doing the arithmetic off the
  page's own "$45 to $50 each way" gets $180 to $200 for two bags saved in both directions, not $250.
  The gap is real and in the founder's favour: second and third checked bags cost far more than the
  first, often $60 to $100 each and higher internationally. The page never says that. Naming it in
  half a sentence ("the second and third bags are the expensive ones") both justifies the number and
  adds a fee argument the page is currently missing.
- **Confirm whether that trip took one kit or two.** One kit is two bags, and the page claims 8 to 10
  days of clothes per bag, so five people on a short trip is plausible on a single kit but not obvious.
  If it took two, saying so is better: it prevents families buying one kit and being disappointed, and
  it makes the two-kit bundle in item 2.5 self-evident.

A photo of the founder or the packed carry-on beside this note would do more for trust than any
further copy. No such asset exists yet.

**Superseded draft, kept for reference:** The Spain trip is a real, first-hand experience and
can be published honestly if attributed to the person who had it rather than to an anonymous
customer. For a brand with no reviews this outperforms a testimonial, because it is specific,
verifiable, and something a dropshipper cannot copy. Draft:

> I built this kit because I got tired of paying to check a bag I did not need. Five days in Spain,
> solo, everything in one carry-on: clothes compressed into the first bag, the second one saved for
> what I had already worn. Zipped shut, nothing leaked. I walked past baggage claim both ways.
> — Hani, founder

(The solo Spain version above was folded into the family account rather than run alongside it. Its
clean-versus-worn and odor detail now lives in `section_Wy2Bag1` as product capability.)

**Also submitted as testimonials, handled the same way.** Two further quotes were proposed ("packed
all of my kids' clothes into two of these, usually they take a full check-in bag" and "the air pump is
much powerful, I used it for the full trip without charging it"). Same constraint: no customers, so no
testimonials. Both were assessed as claims instead:

- The family capacity point is usable and shipped, added to `section_Wy2Bag1`: two bags hold roughly
  what a full checked bag holds, so a family's kids' clothes go in the carry-on instead of costing a
  checked bag each way. Consistent with the existing 8-to-10-days-per-bag claim, and families are a
  named persona in `PRODUCT.md` that the page was not serving.
- **The pump battery claim is blocked pending a real spec.** "Used it for the full trip without
  charging" is a performance claim, and unlike the others it cannot be derived from anything already
  on the page: there is no battery figure anywhere in the copy or the product data. Publishing it
  unverified risks returns and chargebacks from buyers whose pump dies mid-trip, which is worse than
  omitting it. Needed from the supplier sheet: battery capacity in mAh and the number of bag cycles
  per full charge, plus charge port type and input voltage. With those numbers this becomes a strong
  FAQ answer, and it is already listed as an open objection in item 2.3.

**The real fix is a review pipeline.** Install Judge.me (free tier) or similar with post-delivery
request emails now, so genuine reviews accumulate from the first orders. Do not display a rating
widget until real ratings exist. Once they do, "What our customers say" becomes true and can replace
or sit alongside the founder's note.

## 5. Offer assessment

The offer *structure* is right: 2 bags + free 30W pump + 100-day guarantee + free US shipping, with
savings math that pays the kit back in one round trip. What is missing is proof, not structure.

$89.99 is premium for this category. Functionally similar kits run $25 to $45 on Amazon, and a
shopper who reverse-image-searches the product PNGs will find them. The price can hold, but only on
demonstration (2.1), risk reversal (already fixed), and real reviews (2.6). Those three are what
justify the gap.

Recommended offer shape:
- Hold $89.99, no anchor, no countdown. The savings math is the discount story.
- Lead with the 100-day guarantee as the hero risk reversal. Frame it as "try it on your next three
  trips," which is what 100 days actually buys.
- Enable Shop Pay installments so the sticker reads as $22.50 x 4.
- Add the two-kit family bundle at $149 to $159 as the only upsell.

## 6. Where each change lives

- **Theme repo** (`templates/product.json`, auto-syncs to the live theme from `main`): 2.2 template
  toggles, 2.3 FAQ section, 2.4 accordion restructure, 2.9 empty section.
- **Needs new code in the theme**: 2.2 sticky mobile add-to-cart bar.
- **Shopify admin or API**: 2.5 bundle variant, 2.7 title, 2.8 alt text.
- **Asset production, not code**: 2.1 compression video.
- **Third-party app**: 2.6 reviews.

Note: the live Refund policy in Shopify admin is still out of sync (German first half, a
`[RÜCKSENDEADRESSE EINFÜGEN]` placeholder, exposes the gmail address, excludes sale items which
contradicts the 100-day guarantee). It needs a manual paste in Settings > Policies because the
Shopify connection lacks the `write_legal_policies` scope. Not a PDP change, but it undercuts the
guarantee printed on every page.
