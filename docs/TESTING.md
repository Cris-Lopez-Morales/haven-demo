# Haven 1.8 verification record

Tested with Node.js v22.16.0, TypeScript 5.8.3 (strict mode), and Python Playwright driving Chromium 144.0.7559.96. This release implements **feature #4** and preserves features #1–#3. All four requested improvements are now present. The original 60 active fixture records are unchanged; fictional history and sold examples live in a separate module.

| Suite | Passed | Failed | Scope |
|---|---:|---:|---|
| Strict TypeScript build | Yes | 0 | Portable HTML and development modules produced. |
| Unit/server | 546 | 0 | 459 existing + 87 new calendar, history, selection, median, fixed-snapshot, missing-data, fixture, state-isolation and rendering tests. |
| Original browser workflows | 77 | 0 | Discovery, save, compare, calculator, notes, custom entries, exports, import/reset and mobile. |
| Catalog/motion browser | 36 | 0 | Progressive loading, filtering, finite motion and reduced motion. |
| Assistant/picker browser | 81 | 0 | Existing local assistant and calculator autocomplete, using isolated mode. |
| Ranking/theme browser | 104 | 0 | Deterministic rankings and both themes; 29 contrast groups. |
| Decision workspace browser | 93 | 0 | Budgets, stress tests, profiles, priorities, tour notes and backups; 14 contrast groups. |
| Transparent-cost browser | 145 | 0 | Independent inputs, live arithmetic, persistence, legacy snapshots, tooltip accessibility; 20 contrast groups. |
| Living-cost browser | 165 | 0 | Utilities, fictional work/commute setup, missing data, backups and storage failures; 40 contrast groups. |
| Rejection-memory browser | 184 | 0 | Actual re-ranking, reason evidence, explicit-sort priority, history/edit/undo/pause/reset, assistant integration and privacy; 41 contrast groups. |
| Negotiation-context browser | 166 | 0 | Independent fixture arithmetic, actual sales displayed, native disclosures, no/multiple cuts, duplex scope, missing custom evidence, budget isolation, backups, fixed dates, keyboard, mobile, themes, reduced motion and no networking; 32 contrast groups. |

**Final totals: 546 unit/server tests and 1,051 Chromium browser assertions, zero failures.** New for feature #4: **87 unit tests and 166 browser assertions**. The **176 rendered-text contrast groups** across all suites are already included in browser counts, not additional tests. Counts do not imply complete code coverage or accessibility certification.

## What the new tests verify

The Node tests validate every active fixture's history and 3–5 eligible sold examples. Synthetic tests cover inclusive area/bedroom/date boundaries; wrong type, city, state and neighborhood; future and malformed dates; duplicate IDs and repeat addresses; insufficient records; price increases and multiple reductions; odd/even medians; extreme outliers; rounding near parity; immutable data; custom-property identity spoofing; and preservation of personal state. Takeaways change when underlying comparison inputs change, not from hardcoded listing IDs.

The browser suite imports raw records, not the negotiation engine's output, and computes expected results independently in Python. Nine representative homes cover multiple types, markets, 3/4/5 sales and 0/1/2 cuts. It verifies displayed IDs, sold prices, sizes, dates, days on market, and the exact calculated takeaway. A $450,000 calculator what-if leaves the Willow House's $325,000 source asking price and reference sales unchanged.

Both themes are exercised at **320, 390, 768, 1024 and 1440 CSS pixels**, with the panel collapsed, expanded, and its formula/method open. Native Enter/Space, visible focus, touch-target heights, modal Escape, preserved focus, and live reduced-motion changes are checked. Custom-property no-data states are audited in both palettes. Tests sample text contrast, not every possible screen-reader or display interaction. Mobile screenshots show a vertically scrolling modal, not the entire panel forced into one viewport.

The new feature suite reports **zero uncaught application errors, zero attempted fetches, and zero external resource requests**. Comps and dates are tested as fictional arithmetic, not independently verified geographic or financial evidence.

## Issues found and corrected during verification

- An existing custom-property badge used white accent text on a pale surface. The expanded contrast coverage caught it; it now uses the corresponding semantic foreground token in both themes.
- One legacy cost test checked for an import-confirmation dialog immediately after dispatching a file upload. The handler awaits `File.text()`, so the test now explicitly waits for the actual dialog before making its original assertion. No regression assertions were removed or relaxed.
- The first assistant-suite invocation omitted its required `--isolated` flag and was blocked from navigating to localhost in this environment. It was rerun successfully with the supported isolated harness. Final counts above are from completed passing runs against the bundled build.

## Persistence and safety limits

Browser suites use isolated documents with an explicit **in-memory `localStorage` adapter**. They test actual UI changes, downloads, imports, saved-JSON reinitialization, denied writes, and session-only behavior. They do **not** verify native cross-session storage, `file:` origin behavior, deployed-origin persistence, cross-tab synchronization, Safari or Firefox. Server tests separately cover local HTTP contracts.

The negotiation feature itself is read-only and has no storage schema or migration. It leaves existing budgets, profile notes and rejection evidence alone. All earlier backup privacy limitations still apply. No account, real listing source, geocoder, remote AI or mapping was activated. Optional legacy online photography/AI modes were not used in the new workflows. Live-provider tests use mocks; there is no verified real API response or charge.

## Reproduce

Compiled JavaScript is included. Rebuild after editing TypeScript; `npm test` tests those compiled modules.

```bash
npm install
npm run build
npm test

# Requires Python Playwright and an installed Chromium browser.
python tests/browser_smoke.py --isolated
python tests/assistant_browser.py --isolated
for suite in catalog_motion_browser ranking_theme_browser decision_browser costs_browser living_browser rejections_browser negotiation_browser; do
  python "tests/$suite.py"
done
```

No live API key is needed. `npm install` is only needed to set up the pinned compiler for source edits; the included output runs directly with `npm start`.

## Evidence

- `unit-test-results-v1.8.txt`: final Node TAP output.
- `build-v1.8.txt`: strict compiler/bundler output.
- `*-v1.8.txt` and existing named `*-results.json` files: final regression-suite outputs.
- `negotiation-browser-results.json` / `.txt`: individual checks, exceptions, requests, contrast groups and scope.
- `regression-status-v1.8.json`: final completed browser-suite exit codes.
- `build-verification-v1.8.json`: aggregate totals, file checksum and source/fixture checks.
- `negotiation-light.png`, `negotiation-dark.png`, mobile counterparts, and `negotiation-method-mobile-dark.png`: screenshots of the actual bundled UI.
