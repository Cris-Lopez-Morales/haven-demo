# Negotiation context · Haven 1.8

Feature #4 completes the four requested decision-support additions. It does not change the earlier calculator, utility/commute model, rejection memory, or household workspace.

## Where to find it

Open a home's property details from Discover, Saved homes, My properties, or an assistant recommendation. Expand **Negotiation context**, immediately above **What this actually costs to live here**. It is collapsed initially. Expand **How this comparison is calculated** for the selection rules, arithmetic, and limitations.

The native `details`/`summary` controls work with click, tap, Enter, and Space. Escape retains the surrounding modal's original close behavior. No duplicate manual `aria-expanded` state is maintained. Chevron transitions stop when reduced motion is requested. The whole panel uses the existing light/dark semantic palette; no theme-specific hardcoded surface was added.

## What the data actually is

- The original 60 active listing records, IDs, prices, sizes, and financial inputs are unchanged.
- A separate, static fixture module contains **60 asking-price histories and 240 fictional sold examples**. All sale prices, addresses, dates, and neighborhood relationships are invented teaching data, not sourced transactions or market estimates.
- **Fixed snapshot: September 26, 2026.** “Days on market” and “recent” are relative to this date, not today's computer clock. The sample history does not become more current when the file is reopened.
- Sold values are committed literal records. They are not generated at runtime from the asking price, financing scenario, budget, save/pass state, or system date. Illustrative sold pricing was authored with arbitrary fixture coefficients, not observed local prices. An attractive-looking sample comparison is not independent evidence that a real property is undervalued.
- “Nearby” means the same **fictional city/state/neighborhood labels**, not measured proximity. No coordinates, routes, geocoding, location lookup, or mapping API are used.
- These sold examples do not become new active listings, assistant recommendations, saved-home records, or search results. The active catalogue remains 60.

Custom properties intentionally have **no attached sample history or comparison**. The panel explains the missing data. It never manufactures days on market or a price advantage from the user's address. Reusing a fixture ID with a custom flag or mismatched identity does not borrow sample history.

## Asking-price history

The engine validates the record's property ID, address, city/state, initial date, strict chronological order, positive prices, dates no later than the snapshot, and final asking price. Inconsistent history is unavailable rather than silently repaired.

```
days on market = UTC calendar days(snapshot date − listed date)
change amount = recorded asking price − preceding asking price
change percent = change amount / preceding asking price × 100
recorded reduction count = number of negative changes
total recorded reductions = sum of absolute negative changes
```

The first event is the original asking price. An unchanged price is not a reduction. The engine can represent increases honestly; reductions are not confused with net change after an increase. The fixture collection exercises no-cut, one-cut and two-cut histories. Each percentage is relative to the immediately preceding asking price.

These are asking-price events, not closed-sale prices for the subject. Days describe one sample listing period, not cumulative exposure across relistings. No inference about urgency, seller motivation, buyer leverage, or likely acceptance of an offer is made.

## Comparable selection

The following policy is explicit in the UI and exported as `COMPARABLE_POLICY` for tests:

1. Same city, state, fictional neighborhood label and property type.
2. Area within **±20%** of the subject and bedrooms within **±1**. The boundaries are inclusive.
3. A valid closed-sale date from **0 to 180 UTC calendar days before the fixed snapshot**, inclusive; positive finite price and area, integer nonnegative bedrooms.
4. Exclude the subject's own ID/address. Conflicting duplicate sale IDs are excluded. A repeated address contributes only its latest eligible sale (stable ID tie-break).
5. Select at most **five closest in area**; break equal-area ties by most recent sale date, then ID. Asking price and sale price are not selection filters. Display the selected sales newest first.
6. Require **at least three** to produce a percentage takeaway. If fewer qualify, show the available evidence and explicitly withhold the percentage. Do not widen the criteria to fill the list.

All 60 shipped homes have between three and five eligible records. The pure tests separately exercise zero/two matches, incompatible records, duplicate addresses, out-of-window dates, wrong types, and exact threshold boundaries.

For a duplex, asking price, sale price, area and bedrooms cover the **whole building/both units**. No per-unit comparison is implied.

## Computed takeaway

For each selected sale:

```
sale $/sq ft = sold price / that sale's area
benchmark = median(individual sale $/sq ft values)
asking $/sq ft = subject asking price / subject area
difference (%) = (asking $/sq ft / benchmark − 1) × 100
```

The engine uses the median of the **individual ratios**, not the ratio of median prices and sizes and not an average of raw sale prices. Even-count medians average the middle two ratios. Full-precision values are used; money-per-foot is displayed to cents and the final absolute percentage to one decimal. A difference that rounds to zero is described as within 0.1% rather than “0.0% below.”

Example from the committed Willow House fixtures:

- Asking price $325,000 / 1,840 sq ft ≈ $176.63/sq ft.
- Three separate sold examples: $297,000 / 1,690; $368,000 / 1,950; $333,000 / 1,810.
- Median ≈ $183.98/sq ft.
- The computed takeaway is **“Asking about 4.0% below this sample’s median sold price per sq ft.”**

Changing a sold record or the subject's asking price in the data changes the calculation. A calculator what-if never does: it remains a separate financial scenario. The UI presents above, below and near-equal outcomes with the same neutral colors, not a deal badge or recommended offer.

## What is deliberately not inferred

This is size-only sample context. There are no adjustments for condition, renovation, lot, age, exact bedroom difference, concessions or sale timing; no verified market boundaries; and no price forecast, valuation, suggested discount, automated offer, or negotiation recommendation. The fixed, intentionally constructed sample cannot support an actual real-estate decision. Its purpose is to demonstrate transparent evidence handling in the portfolio application.

## State, privacy and runtime

The feature is read-only. It creates no new local-storage key or workspace field. Existing backups import unchanged; there is no migration or data reset. Merely opening disclosures causes no workspace writes. Save, notes, household budgets, calculator drafts, commute settings and rejection history keep their existing behavior. Financial edits cannot mutate the immutable sale/history fixtures.

No API key, account, external request, new package, live model or analytics was added. The previous optional online photography/AI modes are untouched and remain disabled by default; this panel does not use or activate them. No personal inputs or fictional comp data are attached to AI requests.

## Files and verification

- `src/negotiation-data.ts`: fixed source records and snapshot.
- `src/negotiation-engine.ts`: strict calendar arithmetic, history validation, comp selection, and computed takeaway.
- `src/negotiation-views.ts`: native disclosure rendering and explanations.
- `src/views.ts`: single integration in property details.
- `tests/negotiation.test.mjs`: fixture coverage plus pure calculation/validation/state-isolation tests.
- `tests/negotiation_browser.py`: actual browser interactions, independent Python expected results, mobile/theme/contrast, keyboard/reduced motion, no-network and backup checks.

A pre-existing custom-property badge contrast defect was discovered in the expanded browser coverage and fixed by using the matching semantic foreground color. No old assertions were removed. See `TESTING.md` for actual pass/fail totals and environment limits.
