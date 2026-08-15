# Voltairs storefront plan

Working plan for the Voltairs storefront, written 2026-08-09 after a trust and
structure pass. Read `PRODUCT.md` first for positioning and design principles.
This file is the entry point for anyone (human or agent) picking the work up cold.

---

## Hard constraints

Read these before touching anything. They are the difference between a change
that ships and a change that 404s the live homepage.

**Pushing to `main` deploys to the live store.** The repo is GitHub-connected to
the published theme. There is no staging step. The corollary bit us on 2026-08-10:
local commits do nothing until they are pushed, so `git log` is not evidence that
a change is live. Seven commits had piled up unpushed and the live product page
was still serving pre-`b7b4745` content. Before auditing "the live page", check
`git rev-list --left-right --count origin/main...HEAD` and confirm against the
rendered HTML, not against the repo. Shopify silently rejects
individual files that fail validation during sync: the rest of the theme syncs
and a rejected `templates/index.json` takes the homepage down with no error in
the admin UI. A rejected block file cascades, so any JSON template referencing
its type is rejected too.

Validation rules that have bitten us before:

- Image settings in JSON templates must use `shopify://shop_images/<filename>`.
- Text `font_size` takes fixed rem values only, never CSS variables.
- Range settings must sit exactly on their min/step grid, and a range may have
  at most about 101 steps or the whole block file is rejected.
- Quote block `line_height` accepts only 1, 1.3, or 1.6.

To get an exact validation error, upsert the file to an *unpublished* theme as
something like `templates/index.probe.json` via `themeFilesUpsert`. Writes to the
main theme are blocked by the MCP connection.

**Copy rules.** No em dashes anywhere in customer-facing text; they read as
AI-generated. No fabricated reviews, star counts, countdown timers, or stock
bars. The hero carries no price or discount offer. Benefit detail goes inline,
never behind an accordion. Full rationale in `PRODUCT.md` under Anti-references.

**Scope limits of this connection.** The Shopify MCP app lacks
`write_legal_policies`, so shop policies cannot be edited programmatically. They
need a manual paste in Settings, Policies.

---

## Canonical claims

**The product page is the source of truth.** `templates/product.json` and the
live Shopify `descriptionHtml` are where Hani sets the offer, the savings maths,
and the kit contents. When the homepage and the product page disagree, the
homepage is the stale one: fix the homepage, do not "correct" the product page
back. Confirmed by Hani 2026-08-15 after a pass that had it backwards.

Every claim below appears in multiple places. Changing one means changing all of
them. Verify with the sweep commands at the bottom of this file.

| Claim | Canonical value |
| --- | --- |
| Guarantee | 100-day money-back, from delivery date, discounted orders included |
| Shipping | Free US shipping. Never "worldwide" |
| Delivery | 2 business days processing, then 6 to 10 business days transit |
| Baggage fee | $56 each way, $112 per round trip |
| Contact | info@voltairs.com. Never the voltairstravel@gmail.com account address |
| Kit contents | Per kit: 1 vacuum bag (18.5" x 11.8" x 5.9") plus one 30W multi-function pump |
| Offer tiers | Solo: 1 kit + 1 bonus travel bag. Family: 2 kits + 2 bonus bags + AI Travel Upgrade |
| Compression | Compresses to 40% of original size, up to 60% space saved |
| Price | $89.99 solo, no compare-at anchor. Bundle pricing lives in the bundlex app |

Two of these moved on 2026-08-15 and the older values are still worth knowing.

**Baggage fee.** August 2026 had this at "$45 to $50 each way, $90 to $100 per
round trip", on the reasoning that $56 overstated the real first-bag fee on
American, Delta, and United ($45 prepaid, $50 at the airport) and that a buyer
can check it in seconds. Hani's product-page rebuild put $56 and $112 back, and
the live product description, the savings calculator, and the "What You Save in
One Trip" cards now all agree on them. That is the current claim. The earlier
objection was never answered, only overridden, so if the number is ever
challenged the fix is one value in `voltairs-savings-calc`, one string in
`section_pdp_problem`, and the Shopify description, on both templates at once.

**Kit contents.** Was "2 vacuum bags plus one pump". A kit is now one bag and one
pump, with a second bag arriving as the solo tier's bonus travel bag. The
per-kit figure and the per-order figure are easy to conflate; the FAQ's capacity
answers are written per bag.

---

## Current state

Shipped 2026-08-09 in commits `34757d7`, `f8008fe`, `42ba362`:

- One guarantee everywhere (100-day), replacing a live mix of 30, 90, and 100 day
  claims across the header bar, offers banner, buy box, USP grid, and marquee.
- Removed content belonging to other products: a hair-clipper comparison table,
  a leg-wrap and control-panel kit list, a skincare free-gifts block, an
  anniversary-sale countdown, a fabricated "(4.8) Backed by 30,000+ happy client"
  rating, and placeholder skincare reviews. Plus 33 orphaned `ai_gen_block_*`
  files no template referenced.
- Shipping wording unified to "Free US shipping" against the real US-only policy.
- Baggage fee math corrected everywhere including the calculator default.
- Homepage restructured so proof and price arrive early.
- New `section_trust` (four cards) and `section_final_cta` on the homepage.
- Hero gained a primary purchase CTA next to "See it in action", no price on it.
- Live Shopify product: removed three fabricated testimonials and cleared the
  $179.99 compare-at anchor on an $89.99 product.

Restructured 2026-08-15: the homepage now mirrors the product page. Everything
between the hero and the offer is the product page's content in the product
page's order, so the two templates share section keys and block IDs and can be
diffed against each other directly. The homepage-only middle (how it works,
quotes, the four benefit sections, trust cards, email signup) and the
baggage-fee stats marquee were removed with it.

Homepage section order in `templates/index.json`:

1. hero, 2. marquee, 3. before & after, 4. the real cost, 5. savings,
6. comparison table, 7. product details, 8. faq, 9. final cta, 10. offer

The hero's two CTAs carry the page: "Get the Voltairs Kit" jumps to `#offer` at
the very bottom, "See how it works" jumps to `#compare-demo`, the next section
down. The comparison table and final CTA buttons also point at `#offer`, since
the homepage has no buy box to anchor to. `#offer` sits on the first block
inside the offer card, so a jump lands on the top of the card.

The eight mirrored sections are byte-identical to `templates/product.json` apart
from those two link values, so `diff` between the templates is meaningful and
should stay that way. The offer card is the one homepage-only selling surface: it
was still telling a "Version 2, rebuilt on what the first kit taught us" story
that the product page had dropped, and still listed a single kit, so it now
carries the solo and family tiers in the product page's own words.

---

## Next work, ranked

Ordered by conversion impact, not by visibility. The section merge is last on
purpose: it is the change an outside audit emphasized most and the one that moves
the least.

### 1. Mobile sticky add-to-cart (needs a decision from Hani)

Most traffic is phones and the add-to-cart button sits below the gallery and the
full description with no sticky bar. This is the largest remaining leak in the
buy path. Sticky behaviour in `blocks/_product-details.liquid` is desktop-only
today.

Build a bottom-anchored bar on the product page that appears once the real button
scrolls out of view, showing price and "Add to cart". Touch target at least 44px
per the accessibility standard in `PRODUCT.md`. Must not cover the footer CTA or
fight the existing header behaviour.

Deferred in August as a look-and-behaviour judgment call rather than a bug, which
is why it needs a yes before it ships.

### 2. Compression video in the product gallery

The gallery is eight static PNGs. The first design principle is "show the
compression, don't claim it", and the site currently claims it in six places and
shows it in exactly one homepage drag-slider. One short clip of the pump
flattening a packed bag, placed first in the gallery, should outperform any
further copy work.

Same pass: all eight gallery images have empty alt text. Cheap accessibility and
image-search win.

### 3. Real reviews (blocked on Hani)

The site has no social proof at all now that `section_quotes` is gone with the
old homepage middle. Its eight unattributed quotes were the weakest usable form
of proof anyway; if any came from real V1 buyers, a first name and a trip against
even four of them is worth more than the section ever was.

Blocked deliberately: inventing names is the fake social proof the brand rules
ban. Needs Hani to confirm which quotes are real and who said them. The V1
product exists as a draft (`voltairs-travel-vacuum-bag-kit-v1`) if buyer records
are reachable from there. The old quotes are recoverable from git history at
`bdcb4d8:templates/index.json`.

### 4. Decide what the mirrored homepage still owes

Superseded, in part: "collapse the benefit middle" is moot because the middle is
gone. What replaced it is a question rather than an answer. The homepage and the
product page now say the same things in the same order, which is coherent but
means a visitor who lands on the homepage and clicks through reads the whole
argument twice. Three things the old homepage carried and the mirror does not:

- **Trust cards.** Four cards on guarantee, shipping, returns, and contact.
  Reassurance right before the offer, and the mirrored page ends without any.
  Recoverable as `section_trust` from `bdcb4d8:templates/index.json`, and the
  product page has its own copy as `section_pdp_trust` in
  `templates/product.upselling-products.json`.
- **Email capture.** `section_email` was the only list-building surface on the
  site. Nothing replaced it.
- **How it works.** Three steps, pack, zip, pump. The hero's "See how it works"
  CTA now lands on the before/after slider instead, which shows the result rather
  than the method.

Each is a judgment call about whether the homepage should mirror the product page
exactly or lead into it. Ask before restoring any of them.

---

## Open items owned by Hani

- **Refund policy paste.** A rewritten policy is at
  `~/Desktop/voltairs-refund-policy.html`, pending because this connection lacks
  `write_legal_policies`. The live policy is still half German, contains a
  `[RÜCKSENDEADRESSE EINFÜGEN]` placeholder, exposes the gmail address, excludes
  sale items in contradiction of the guarantee, and carries leaked AI research
  citation links. It also requires returns be "unused, unworn, in original
  packaging", which is incompatible with a 100-day guarantee that invites you to
  take the kit on a trip. The replacement fixes all of it.
- **Draft V1 product** still carries the old description with the three
  fabricated testimonials. Not public, but it will bite if ever published.
- **Sticky add-to-cart**, above.
- **Review attribution**, above.
- Smaller deferred mobile calls: `mobile_quick_add` is off; the product-page
  offers banner is page-width so it shows 16px gutters on mobile; the header logo
  at `custom_height_mobile: 46` letterboxes inside the mobile centre track and
  wants an on-device look at 28 to 32px.

---

## Verification

Run before any push. All four should come back internally consistent.

```bash
# guarantee: expect 100-day only
grep -rn -o -i "[0-9]\{2,3\}[- ]day[^\"<]\{0,40\}" templates/*.json sections/*-group.json blocks/*.liquid | grep -v locales

# shipping: expect "Free US shipping", never "worldwide"
grep -rn -o -i "free[a-z ]*shipping[^\"<]\{0,30\}\|worldwide" templates/*.json sections/*-group.json blocks/*.liquid | grep -v locales

# contact: expect info@voltairs.com only
grep -rn -o "[a-z0-9._-]*@[a-z0-9.-]*\.[a-z]*" templates/*.json sections/*-group.json | grep -v "@media"

# em dashes: expect zero
grep -rc "—" templates/*.json sections/*.json
```

JSON templates carry a leading `/* auto-generated */` comment, so strip it before
parsing:

```python
json.loads(re.sub(r'^\s*/\*.*?\*/', '', open(path).read(), flags=re.S))
```
