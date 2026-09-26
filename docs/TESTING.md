# Haven 1.4 verification record

## Included build

Tested with Node.js v22.16.0, strict TypeScript compilation, and Python Playwright driving Chromium. All 60 original fixture records are unchanged.

| Suite | Passed | Scope |
|---|---:|---|
| Strict TypeScript build | Yes | No type errors; self-contained HTML bundle produced. |
| Unit/server | 241 | Original app and AI contract tests plus 52 household, stress, profile-fit, tour-question, migration, and import-validation tests. |
| Original browser workflows | 77 | Discovery, save, compare, calculator, notes, custom properties, exports, imports, reset, mobile behavior. |
| Catalog/motion browser | 36 | Progressive loading, all-catalog filtering, animation and reduced-motion behavior. |
| Assistant/picker browser | 81 | Existing local assistant and calculator autocomplete. |
| Ranking/theme browser | 104 | Data-based rankings and existing whole-app theme behavior; 29 rendered-text contrast groups. |
| Decision workspace browser | 93 | New budgets, what-ifs, snapshots, exports, profiles, priorities, privacy presentation, tour answers, sources, visit notes, import/migration, and responsive UI; 14 additional contrast groups. |

**Total: 241 unit/server tests and 391 browser assertions.** These are assertion counts, not a test coverage percentage. No uncaught application errors occurred in the exercised browser workflows.

## Important limits

The browser environment blocks direct localhost navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Browser suites therefore run the generated HTML in an isolated document and replace `localStorage` with a clearly identified in-memory adapter. They exercise real DOM controls and file download/import flows, but **do not verify native cross-session persistence, cross-tab synchronization, or a deployed domain**. Node server tests exercise actual local HTTP request handling independently.

Only Chromium was exercised. This is not Safari, Firefox, screen-reader, or complete accessibility certification. Contrast checks sample rendered text, not every possible state or accessibility criterion. New layouts were checked at 320, 390, 768, and 1440 CSS pixels in light and dark themes.

Live AI was intentionally not configured. Model calls in provider-contract tests are mocked. No real provider response, charge, or production AI integration is claimed. Together is intentionally a local demo, not a cross-device or authenticated feature.

## Reproduce

The archive includes compiled JavaScript, so `npm test` and `npm start` work without dependency installation. For source changes:

```bash
npm install
npm run build
npm test
```

Install Python Playwright and Chromium before browser tests:

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/browser_smoke.py --isolated
python tests/catalog_motion_browser.py
python tests/assistant_browser.py --isolated
python tests/ranking_theme_browser.py
python tests/decision_browser.py
```

The tests discover a locally installed Chromium executable when available; otherwise the decision suite uses Playwright’s installed Chromium. The original workflow and assistant suites can also run against `npm start` without `--isolated` in an unrestricted browser environment.

Raw results: `unit-test-results-v1.4.txt`, `browser_smoke-v1.4.txt`, `catalog_motion_browser-v1.4.txt`, `assistant_browser-v1.4.txt`, `ranking_theme_browser-v1.4.txt`, `decision-browser-results.txt`, plus their JSON reports. Screenshots named `decision-*.png` use explicitly fictional sample budgets and people, not real user financial information.
