# Changelog

## 1.8.0 — Inspectable negotiation context (feature 4 of 4)

- Added a compact native disclosure on each property detail view with fixed-snapshot days on market, asking-price history, recorded reductions, comparable sold examples and one computed sample takeaway.
- Preserved all 60 original active records. Added separate, immutable fixtures for 60 listing histories and 240 invented sold examples, explicitly dated September 26, 2026. No runtime asking-price-derived comp generation or wall-clock aging.
- Selected 3–5 same-type, same fictional-neighborhood sold examples by transparent ±20% area, ±1 bedroom and 180-day recency rules. Selection uses size similarity, not favorable pricing. Deduplicated evidence and withheld a percentage when fewer than three records qualify.
- Calculated the median of individual sold-price-per-square-foot ratios and compared it with the subject’s asking ratio. Exposed the formula, values, rounding, scope and omitted adjustments. Above/below/near-equal outcomes have no recommendation styling or hardcoded property verdicts.
- Kept missing custom-property history and inconsistent records visibly unavailable, rather than inventing dates, proximity, seller motives or discounts. Labeled duplex figures as whole-building/both-unit values.
- Added no workspace fields, migration, account, external dependency, network calls, personal-data transmission or AI activation. Calculator edits, notes, saved homes, household profiles and learned preferences remain independent and backwards compatible.
- Preserved mobile layouts, whole-app light/dark tokens, native keyboard controls and reduced-motion preferences. Fixed a pre-existing low-contrast custom-property badge discovered by the new coverage.
- Verified the strict build, 546 unit/server tests and 1,051 Chromium browser assertions, zero failures. Added 87 unit tests and 166 browser assertions including 32 new contrast groups. Existing assertions remain intact; one legacy import test now waits for asynchronous file reading before checking confirmation. Browser persistence uses an isolated adapter, not verified native cross-session storage.
- Completed feature #4 and stopped; no additional roadmap features were started.

## 1.7.0 — Visible, reversible preference learning (feature 3 of 4)

- Added a distinct Not interested flow to cards, property details and chat, with native radio reason chips, optional context, required Other text, an explicit confirmation and no premature storage writes.
- Stored one validated, bounded snapshot per passed home in the existing workspace. Older backups migrate without inventing feedback; custom deletion prunes stale evidence. Repeating or editing a home cannot manufacture multiple votes.
- Derived soft median thresholds only after two distinct comparable passes for price, area, positive HOA fee or fictional commute distance. Other notes, missing distances and zero HOA fees do not train unsupported traits. Feedback comes from listing snapshots, not private budgets or calculator overrides.
- Added Recommended discovery order and actual general-assistant re-ranking, with explicit numeric sorts and hard filters preserved. Excluded specific passed homes from new recommendations while keeping saved homes, notes, finances and tours intact. Show passed and undo restore access without data loss.
- Added a compact named-trait panel, global preferences entry points, full evidence/history and method disclosure, per-home undo and edit, pausing, and a confirmed feedback-only reset. Assistant explanations name the relevant rule and the property's actual metric; old answers are identified as snapshots.
- Scoped distance learning to the same explicitly fictional work city/position. Changed setups immediately suspend incompatible evidence. Unknown routes receive no distance score and are never called nearer.
- Preserved incomplete finance/household forms when feedback changes. Kept both full semantic palettes, native keyboard access, mobile grid/list layouts and reduced-motion support.
- No fixture data, financial formula, external dependency, real API key, account system, or live AI was added. Optional AI history now omits assistant replies to avoid forwarding learned summaries; rejection records and notes are not attached.
- Verified strict build, 459 unit/server tests and 885 browser assertions, zero failures. Added 90 unit and 184 browser assertions, including 41 new rendered-text contrast groups. Tests use isolated storage; no native cross-session persistence or full accessibility certification is claimed. Refined one older export-test selector to target the open dialog rather than the simultaneously visible session-warning action; no regression assertions were removed.
- Stopped after feature #3. Negotiation intelligence (#4) remains pending review.

## 1.6.0 — What this actually costs to live here (feature 2 of 4)

- Added a property-detail section using each home’s last-valid calculator plan, an explicit utility-adjusted rental cash-flow result, and a separate owner-occupant monthly cash-outlay view. No full-property rent is counted as income to an occupant; rental management is excluded from that view.
- Kept feature #1’s arithmetic and saved snapshots intact. Disclosed retained reserve conventions, whole-building duplex inputs, one-time exclusions and missing mortgage-insurance inputs. The separate household planner remains independent.
- Added an openly illustrative size/age utility formula, complete hover/focus/tap explanation, per-home manual overrides/reset, live recalculation, invalid/stale states, keyboard-focus preservation, and session-only storage warnings.
- Added one workspace-wide optional work setup. Same-city fictional homes use explicitly invented grid points and visible distance/time formulas; cross-city and custom listings have no fabricated route. Location labels are not geocoded; no mapping service, traffic, commute dollars, or AI data transmission is introduced.
- Added backward-compatible settings validation, JSON backup round trips, import rejection, deletion/reset cleanup, work-from-home/off privacy clearing, and preservation of unsaved property notes when returning from work settings.
- Matched both semantic color themes and mobile/reduced-motion behavior. Preserved all 60 fixture records and left live AI off.
- Verified strict TypeScript build, 369 unit/server tests and 701 browser assertions, zero failures. Added 70 unit tests and 165 browser assertions; 40 additional contrast sample groups. Persistence tests use simulated browser storage; native cross-session persistence, live model output, real travel estimates and utility accuracy are not claimed.
- Stopped after feature #2. Features #3 and #4 remain pending user review.

## 1.5.0 — Transparent cost breakdown (feature 1 of 4)

- Extended, not replaced, the existing finance engine with explicit annual tax %, annual insurance, monthly/home-value maintenance, applicable HOA, and %/dollar one-time closing inputs.
- Added source-based why-default explanations to every calculator numeric field, with focus/hover/tap, Escape, viewport clamping and scroll positioning. No unsupported national-average or current-rate claims.
- Added live, per-property valid-plan persistence using `haven.workspace.v1`, old-backup migration, nested scenario cloning, full backup/report support, session-only warnings and readable invalid-result states.
- Preserved dollar amounts when switching units; invalid conversions fail atomically rather than clamp. HOA toggles preserve excluded values and omit hidden charges.
- Separated monthly costs/reserves from upfront purchase costs and an explicitly defined first-year cash-outlay formula. Closing costs are counted once. Scope labels distinguish cash allocation, equity, and reserves from economic loss or a full living-cost budget.
- Retained the legacy baseline for cards, comparison and assistant ranking. Home workspace budgets are independent and not overwritten. Legacy saved scenarios preserve their initial dollar results and stored snapshots.
- Added deletion/reset cleanup for calculator plans without overwriting a surviving home’s saved inputs.
- Preserved all 60 fixture records, whole-app light/dark themes, reduced-motion support, and the existing calculator/property picker. No new external calls, accounts or API keys.
- Verified strict build; 299 unit/server tests and 536 browser assertions, zero failures. Added 58 unit and 145 browser assertions, including 20 new rendered-text contrast groups. Browser persistence uses an isolated in-memory adapter; native cross-session storage is not claimed.
- Deliberately stopped after feature #1. Proposed features #2–#4 are not implemented in this release.

## 1.4.0 — The home decision workspace

- Added Your Life Here: per-profile budgets, owner-occupant costs, explicit sample inputs, one-at-a-time stress scenarios, cash shortfalls, saved-home comparisons, full-input snapshots, and CSV exports.
- Added Together: up to eight local participants, per-person priorities and opinions, shared stages, conservative common-fit logic, and opt-in summary display. Not secure accounts or online collaboration.
- Added Before You Tour: source-labeled briefs, adaptive unknown-information questions, required answer/source for completion, custom questions, visit notes, and budget-free text exports.
- Added entry points from navigation, discovery cards, listing details, and assistant recommendations; reused per-keystroke autocomplete.
- Extended all semantic themes and responsive layouts. Fixed workspace-picker focus reopening and mobile table/popup overflow during browser tests.
- Migrates old backups without introducing a personal budget. Full exports now include all profile budgets, with explicit privacy notice.
- Preserved all 60 fixture records. Live AI remains optional and unconfigured; no new personal workspace data is attached to provider requests.
- Verified strict build, 241 unit/server tests, and 391 browser assertions across five suites using isolated storage.


## 1.3.0 — Real comparisons, a calmer dark mode

- Replaced mandatory assistant intake with immediate catalogue queries when the user provides a measurable criterion. Superlatives and descriptive intent map to numerical operators, not literal city searches.
- Added deterministic rankings for price, size, bedrooms, bathrooms, construction year, fees, tax, insurance, sample rent, price per area and explicitly disclosed model metrics. Explanations name the winner, scope, actual numbers, ties and combined duplex totals.
- Added exact/maximum physical bounds, named and contextual relative comparisons, preserved filter scope and explicit full-catalog reset. Unsupported geography produces an honest data limitation; subjective or conflicting goals get targeted clarifications.
- Added complete semantic light/dark palettes and a keyboard-accessible Light/Dark/Use device setting menu. Prepaint application and media changes do not reset page state. Appearance persists separately where browser storage is available.
- Retained all 60 fixture records, identifiers, financial formulas, workspace backups, calculator autocomplete, animations and optional opt-in server-side AI. Known comparison requests run locally in either assistant mode.
- Verified 189 Node unit/server tests and 298 Chromium browser assertions in the documented isolated mode, including 29 contrast-sample groups. No live AI, native cross-session persistence, cross-browser coverage or full accessibility conformance is claimed.


## 1.2.0 — A little help finding home

- Persistent Ask Haven chat widget on all five pages, with preserved in-tab conversation, a search recap, quick replies, keyboard support and reduced-motion-aware transitions.
- Multi-turn city, purchase-budget, property-type and must-have collection; supports complete queries and follow-up edits.
- Up to three recommendations drawn only from the existing 60 fictional fixtures. Prices, location, size and feature explanations are computed from the records, not invented by a model.
- Detail, calculator and Save actions on every recommendation; additional-match pagination; honest one/no-match and unverified-feature states.
- Explicit local-demo mode with no required API key; optional opt-in server-side AI preference interpretation with schema validation and visible failure fallback.
- Replaced the native calculator selector with a responsive, illustrated, per-keystroke searchable combobox including demo and custom properties.
- Added pure search/interpreter/matching tests, mocked AI-provider contracts, local HTTP server checks, and 81 assistant/picker browser assertions. The complete build passes 118 Node tests and 194 browser assertions in the documented isolated mode.
- Original property data, finance functions, workspace schema and backup compatibility preserved.


## 1.1.0 — More places, softer motion

### Added

- 48 new fictional property records; the catalog now contains 60 homes in 20 cities.
- A broader range of single-family homes, condos, townhouses, and duplexes, with type-appropriate tags and descriptions.
- Townhome, duplex, and ranch-style illustration variants, plus a bounded artwork cache.
- “Show more” pagination in groups of 12, a visible result count, and a progress indicator.
- Larger budget filter options: $800,000 and $1,000,000.
- One-shot landing/navigation entrances, on-scroll staggered card reveals, hover transitions, favorite feedback, filter expansion, dialog entrances, and comparison-tray motion.
- A reduced-motion-aware Web Animations/IntersectionObserver module with graceful fallbacks and keyboard-focus safeguards.
- Sixteen catalog/pagination unit tests and thirty-six catalog/motion browser assertions.

### Preserved

- Haven's name, layout, typography, palette, and original twelve illustrations.
- Original sample IDs and original property financial inputs, preserving backup compatibility.
- Local-only storage and JSON import/export; no account or backend requirement.
- Existing property editing, search, saving, comparison, notes, calculator, scenarios, and export workflows.

### Interaction details

- Saving and comparing do not replay the entire page entrance.
- Already loaded cards remain in place when more cards are appended.
- Keyboard focus is restored across filter/action re-renders where the control still exists.
- Filtering and sorting run against the whole collection before pagination.
- All sample records are explicitly fictional. No new live-data integration or current market estimates are represented.
