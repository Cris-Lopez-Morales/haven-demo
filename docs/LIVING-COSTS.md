# What this actually costs to live here — Haven 1.6

Feature **#2 of the four-part trust roadmap**. Feature #1's finance engine is extended, not replaced. Rejection-learning (#3) and negotiation intelligence (#4) remain unimplemented pending review. All 60 existing listing records are unchanged.

## Try it

1. Open a home's details from Discover, Saved, the calculator's **View property** button, or an assistant recommendation. Scroll to **What this actually costs to live here.** No city, work location, or household budget is required to see the costs.
2. Inspect the two distinct outcomes: **Living here · no rental income**, and **Rental scenario · owner pays utilities**. Expand **See exactly what is included** for line items, formulas and exclusions.
3. Hover, focus, or tap the utility information button. Change **Estimated utilities ($ / month)** and observe both totals updating immediately. **Use size & age estimate** restores the formula for that home only.
4. Choose **Your workspace → Work location & commute** (or **Your work trip → Set up once** in the home). Choose no estimate, work from home, or a fictional commute. For a commute, enter a nickname/location label, choose a demo city and invented grid position, and optionally change the assumed speed. Save once and revisit other homes.

## Same underlying calculator, two carefully separated interpretations

Each property's current plan comes from `workspace.calculator.drafts[propertyId]`. Without a draft, the existing `defaultCalculatorAssumptions(property)` supplies the defaults. `withOwnershipCosts()` preserves valid legacy scenario dollar amounts. Another property's active plan is never substituted. Invalid calculator edits do not replace the last valid saved values.

Let `M = calculate(plan)` and `U = the utility allowance`:

- **Calculator rental cash flow:** `M.cashflow`. This unmodified number is shown explicitly.
- **Rental cash flow after utilities:** `M.cashflow − U`, assuming the owner pays that allowance. Utilities are subtracted exactly once. The existing calculator does not already include them.
- **Ownership subtotal, before utilities:** `M.totalOutflow − M.management`.
- **Living-here monthly cash outlay:** `M.totalOutflow − M.management + U`.

The living-here view cannot count full-property rent as income to someone occupying it. Rental management is therefore excluded from that view. Mortgage principal and interest, taxes, insurance, applicable HOA, mortgage insurance, routine maintenance and the calculator's capital reserve are retained. The existing capital reserve is still a percentage of gross-rent input, even in the no-rent view; that convention is stated in the expanded explanation instead of silently changing feature #1.

This is **cash outlay including reserves**, not a pure expense or loss measure: loan principal builds equity, and reserves are planned savings rather than bills. Down payment, closing costs, initial repairs and moving are one-time and not rolled into the recurring total. Commute costs, internet, food, other household expenses, and any unentered premiums are excluded. A low down payment with zero mortgage insurance gets a warning. Duplex numbers explicitly cover the **whole building / both units**; they are not an occupied-unit estimate or house-hacking plan.

The original **Your Life Here** household planner stays separate. No private participant utility input, budget, or scenario is silently overwritten or imported. The new section links to it for a fuller household plan. Listing cards, Compare and assistant financial rankings retain their established baseline assumptions. Property-detail quick metrics now use the same last-valid per-property calculator plan as the new section, with their provenance shown.

## Utility formula: editable and openly illustrative

All coefficients are chosen demo assumptions, **not empirical averages, measured local rates, or a claim about a home's actual efficiency**:

```text
reference year  = 2026 (fixed for reproducibility)
age            = max(2026 − yearBuilt, 0)
age used       = min(age, 100)
age multiplier = 1 + 0.002 × age used
utilities      = round($65 + $0.10 × square feet × age multiplier)
```

The flat amount is a combined energy/water allowance. Climate, number of occupants, energy source, renovations, insulation, real tariffs, internet and local fees are not modeled. A future construction year receives no age adjustment and is flagged in the explanation. The model uses the listing's full square footage, including both units of a duplex.

Example using the unchanged Willow fixture: 1,840 sq ft, built in 1998. Age is 28, the multiplier is 1.056, and the formula yields `$259/month` after rounding. On default calculator inputs, this produces an estimated living-here cash outlay of `$2,651.40/month` and a rental cash flow after utilities of `−$204.20/month` (numbers displayed to cents, with unrounded finance arithmetic internally). These are invented planning examples, not bills or market data.

An entered amount replaces the formula; it is not added to it. `$0` is a deliberate valid override. Values from $0 to $1,000,000/month are supported, covering the existing application's extreme-input limits. Empty, nonnumeric, negative or over-limit edits pause saving and mark the displayed last-valid result as stale. The information button explains both the default formula and any override. A valid edit preserves keyboard focus, an expanded breakdown, and unsaved tour notes. The reset removes only that home's utility override.

## Commute: a demonstrator, not a route estimate

**There are no coordinates in the 60 original listings. There is no mapping, geocoding, location permission, traffic, transit, or external API.** The app does not infer location from an address or work label. A nickname is sufficient; an actual address is unnecessary.

To demonstrate the comparison experience honestly, each catalog home receives a stable **invented grid point** based on its position among same-city fixture records. Points are not stored in or substituted for the original listing data. Each city has a separate, imaginary mile-unit grid. Work positions are center `(0,0)`, cardinal positions 5 grid miles away, or diagonal positions with both axes at ±5. Names like "North" refer to this grid, not a neighborhood or real city geography.

```text
straight-line grid miles = sqrt((homeX − workX)² + (homeY − workY)²)
simulated road miles     = straight-line grid miles × 1.3
one-way minutes          = ceil(road miles ÷ assumed speed × 60 + 5)
```

Time uses unrounded distance. Distance displays to a tenth of a mile and time rounds up to whole minutes, both prefixed with `~`. The default assumed speed is 25 mph; users may enter 5–80 mph as a model parameter. The road factor, speed and five-minute allowance are **illustrative, not travel advice**. The tooltip exposes the points and full calculation. The zero-distance special case returns zero, without adding the fixed allowance.

The property panel says **Invented positions, not a real route** beside the numbers. **Do not use them for travel or actual property decisions.** Homes in another city show no comparable local estimate. Custom entries have no grid point and also show no commute estimate. The app never invents an intercity route or infers coordinates from a custom address. Work-from-home mode explicitly indicates no routine work trip assumed, rather than suggesting a measured zero-minute journey.

The work setting is global to this local workspace, not repeated per property. Changing it updates the next rendered panel for every home. It does not change any dollar total and is not supplied to the assistant or its rankings. Selecting no estimate or work from home removes the previously stored location fields. Cancel preserves the saved setup and returns to the previous view, preserving an unsaved property note.

## Persistence and privacy

Added under the existing `haven.workspace.v1` key:

```json
{
  "living": {
    "version": 1,
    "commute": null,
    "utilityOverrides": {}
  }
}
```

A commute is either `null`, `{ "mode": "remote" }`, or a validated simulated choice containing a label, city, state, work anchor and assumed speed. Manual utility amounts are keyed by property ID. Pre-1.6 backups omit `living` and migrate to empty settings. Malformed settings fail import without replacing the active workspace. Deletion prunes only the deleted home's override; full reset clears all new settings. Old saved financial snapshots are not modified.

Valid updates use the existing storage mechanism. Storage failures warn **Session only**, while the in-memory plan continues working and remains exportable. Native cross-session persistence is subject to browser/storage policy and was not verified here. Full JSON backups include utility overrides and the work label; treat backups as sensitive. Local profiles are not private accounts. The data is not attached to AI requests, tour-brief exports, or a network request. Optional legacy photo/AI modes remain off by default.

## Verification

See [TESTING.md](TESTING.md) for the complete counts and limits. `tests/living.test.mjs` adds 70 unit tests; `tests/living_browser.py` adds 165 browser assertions, including 40 rendered-text contrast groups, both themes at 320/390/768/1024/1440 px, keyboard/tap/hover tooltips, reduced motion, backup migration, exact finance integration, denied storage, and no attempted fetch/resource calls. All existing suites were rerun. No native storage, map accuracy, utility accuracy, live AI, or complete accessibility conformance is claimed.
