> **1.6 update:** This calculator feature is retained. Property details now extend its saved results with explicitly illustrative utilities and commute information; see [LIVING-COSTS.md](LIVING-COSTS.md). The calculator itself still excludes utilities and commute.

# Transparent cost breakdown — feature 1 of 4

Haven 1.5 extends the existing investment calculator. All defaults are editable **demo assumptions**, not quotes or national averages. Nothing in this feature requires a network connection. No utility/commute model, rejected-property learning, or negotiation panel is added in this release.

## Where to find it

Open **Deal calculator**, select a home using the existing searchable property picker, and find **Ownership costs, without the guesswork**. The cost breakdown and purchase-cash summary update on every valid input event, not just on blur or submission. Existing financing, rent, vacancy, management, capital-reserve, mortgage-insurance and amortization controls remain available.

## Defaults, units, and interpretation

| Control | Starting value and provenance | Effective calculation |
|---|---|---|
| Property tax rate | Sample annual tax ÷ sample asking price × 100, rounded to 0.001 percentage point for a new plan. A rate applied to purchase price, not an assessed-value or jurisdiction-specific tax model. | Purchase price × rate / 1,200 per month. |
| Annual insurance | Sample monthly insurance × 12. No insurer, coverage, or premium quote. | Annual dollars / 12. |
| Routine maintenance | Fixed monthly dollars equal to the pre-existing sample allowance: 5% of that home’s sample gross rent. This avoids silently replacing the starting model with an unrelated cost. After initialization it is no longer linked to rent. | Monthly dollars, OR purchase price × annual % / 1,200. |
| HOA | Sample monthly fee; enabled only if positive. A zero fictional input is not evidence that a real association has no dues. | Entered monthly dollars when enabled; zero when off. |
| Closing costs | Existing illustrative 3% purchase-price allowance. Excludes down payment and initial repairs. | Purchase price × % / 100, OR one-time dollars. Never divided by 12 or added to monthly operating costs. |

Every numeric calculator field has a why-default explanation, including the existing loan and advanced allowances. Explain buttons work by hover, keyboard focus, and click/tap. Escape dismisses without losing focus. Tooltips stay inside the viewport and can be hovered; clicking outside dismisses them. Annual/monthly equivalents appear next to the inputs and require no tooltip.

Switching either unit selector preserves the current dollar amount, without rounding the internal conversion. A percent tracks subsequent purchase-price changes; a dollar amount does not. A conversion outside supported input bounds leaves the prior valid units/amount intact and explains why. Zero is a valid input. Blank, negative, nonfinite, malformed or out-of-range values are rejected; old saved data must also pass validation.

HOA’s disabled, hidden input is not counted or validated as an active cost. Its dormant amount is retained so toggling on restores it. The breakdown omits the HOA line when off.

## What the totals mean

```text
monthly ownership outflow = principal & interest + monthly tax + insurance
                           + applicable HOA + routine maintenance
                           + management + capital reserve + applicable mortgage insurance
rental cash flow = rent after vacancy − monthly ownership outflow
upfront cash = down payment + ONE-TIME closing costs + initial repairs
first-year cash outlay = upfront cash + monthly ownership outflow × 12
```

The top cash-flow figure remains explicitly **rental** cash flow. Management is still based on collected rent; capital reserve is still based on gross scheduled rent. Routine maintenance and capital reserve are separate allocations for upkeep vs larger replacements, not two labels for the same expense. Users should enter non-overlapping amounts.

First-year outlay is **before rental income**. It includes down payment and loan principal that build equity, plus reserves that set cash aside; these amounts are not all money lost or bills paid. Totals use full precision; line items display cents and may differ by a cent when rounded and added. Closing costs change upfront/first-year cash once, never the monthly total.

This is not a complete cost-of-living estimate. Utilities, commute, moving costs, income taxes, appreciation, selling costs, rent growth, loan eligibility and lender-specific requirements are outside this investment model. The pre-existing owner-occupant Home workspace has its own household plan and utilities; its values are not silently overwritten by calculator edits.

## Compatibility and storage

The engine remains in `src/finance.ts`. `Assumptions.costs` adds explicit units; when absent, original legacy finance behavior applies. `defaultAssumptions` remains unchanged for listing cards, Compare, and deterministic assistant rankings. Calculator-only defaults use `defaultCalculatorAssumptions`.

Older named scenarios remain frozen. Opening one converts its original annual tax into an exact percentage, annualizes insurance, freezes its original rental-based maintenance amount as monthly dollars, and preserves closing % and HOA. The initial modeled dollar result is preserved, but future rent edits no longer alter that converted routine-maintenance reserve. Conversion does not rewrite the original saved snapshot. New default tax rounding is not applied to legacy snapshots.

Valid calculator plans are saved per property in `workspace.calculator.drafts`; the active home is stored in `activePropertyId`. Both live under the existing `haven.workspace.v1` key and in full JSON backups. No second financial store or account system is introduced. Fresh workspaces and pre-1.5 backups migrate to an empty calculator store. Invalid plans do not replace valid ones. Save failures are visibly session-only and the current valid in-memory plan can still be exported.

Reset restores only the current home’s defaults. Removing a custom property removes its plan and restores the fallback home’s saved plan rather than overwriting it. Full workspace reset clears all calculator plans. Import validation rejects malformed units, invalid numbers, duplicate/reserved property identities and unsafe calculator keys. No silent migration of household budget inputs occurs.

CSV reports export effective annual tax, annual insurance, chosen maintenance basis, included HOA, closing unit and one-time amount, monthly total, upfront cash, and first-year outlay. Excluded HOA is exported as zero with its applicability flag. They do not mislabel modern maintenance as a rental-income percentage. Full backups also contain all local participants’ financial inputs; keep them private.

## Quick review checklist

1. Open The Willow House. Change annual insurance from $1,500 to $2,400: monthly ownership cost increases by $75. The tax rate and other inputs should stay unchanged.
2. Change closing from 3% to 4%: only one-time/first-year cash and return-on-invested-cash outputs change, not recurring ownership cost. Switch it to dollars: the amount stays the same.
3. Set maintenance to $250/month and switch to annual home-value %. The monthly dollar allocation stays $250 at the same purchase price; editing price now changes this percentage-based amount.
4. Turn HOA on, enter a fee, then off and on again. The fee is excluded while off and restored while on.
5. Edit a second home, return to the first, then export/import a backup. Each should recover its own inputs. Test blank/negative entries: the last valid result is clearly stale, not silently saved.
6. Test the info buttons with Tab/Escape and touch, both themes, and a narrow screen. Default animations follow the device’s reduced-motion preference.

## Verification scope

See `TESTING.md`. The feature adds 58 unit tests and 145 Chromium assertions. Tests cover the actual generated UI, independent finance arithmetic, unit conversion, live edits, state isolation, nested snapshots, old backups, exports/imports, storage denial, deletion/reset, keyboard/touch explanations, five viewport sizes, both themes, reduced motion, and no attempted external requests. Storage is simulated in browser tests; native cross-session storage and other browser engines were not verified.
