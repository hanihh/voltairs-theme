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

Every one of these appears in multiple places. Changing one means changing all of
them. Verify with the sweep commands at the bottom of this file.

| Claim | Canonical value |
| --- | --- |
| Guarantee | 100-day money-back, from delivery date, discounted orders included |
| Shipping | Free US shipping. Never "worldwide" |
| Delivery | 2 business days processing, then 6 to 10 business days transit |
| Baggage fee | $45 to $50 each way, $90 to $100 per round trip |
| Contact | info@voltairs.com. Never the voltairstravel@gmail.com account address |
| Kit contents | 2 vacuum bags (18.5" x 11.8" x 5.9") plus one 30W multi-function pump |
| Compression | Compresses to 40% of original size, up to 60% space saved |
| Price | $89.99, no compare-at anchor |

The baggage figure is the one most likely to drift back. It was previously
"$56+ each way / $112 per flight", which overstated the real 2026 first-bag fee
on American, Delta, and United ($45 prepaid, $50 at the airport). The entire
savings pitch and the calculator default rest on it, and a buyer can check it in
seconds, so it must stay defensible.

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

Homepage section order in `templates/index.json`:

1. hero, 2. stats marquee, 3. compare demo, 4. how it works, 5. quotes,
6. offer, 7. benefit space, 8. benefit money, 9. savings, 10. benefit pump,
11. benefit seal, 12. compare, 13. trust, 14. faq, 15. final cta, 16. email

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

`section_quotes` holds eight quotes with no attribution, which is the weakest
usable form of proof. If these came from real V1 buyers, attaching a first name
and a trip to even four of them makes the section worth more than the entire
benefits middle.

Blocked deliberately: inventing names is the fake social proof the brand rules
ban. Needs Hani to confirm which quotes are real and who said them. The V1
product exists as a draft (`voltairs-travel-vacuum-bag-kit-v1`) if buyer records
are reachable from there.

### 4. Collapse the benefit middle

Takes the homepage from 16 sections to 13 and the run between offer and trust
from six sections to three. Merge on subject, not by trimming words:

- `section_benefit_space` + `section_benefit_seal` become one section about the
  bag itself: 22 lb of clothes, three inches thick, and it stays that way because
  of the D-ring zipper and IPX8 shell.
- `section_benefit_money` folds into `section_savings`. They make the same
  argument twice, once in prose and once interactively; let the calculator carry
  it.
- `section_benefit_pump` stays standalone. The free 30W pump is the actual
  differentiator against every competitor in the comparison table.

The goal is that each remaining section answers a different question (what is it,
why is it effortless, what does it save you) instead of three variations of "you
can pack more".

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
