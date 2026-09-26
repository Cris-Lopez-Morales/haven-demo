# Verification record and reproducible tests

## Included build

The included build was checked with Node.js v22.16.0, TypeScript v5.8.3, and Python Playwright driving Chromium.

| Suite | Result | Scope |
| --- | --- | --- |
| Strict TypeScript compilation | Passed | Build completed without type errors. |
| Node unit/server tests | 189 passed, 0 failed | Original domain tests, assistant parsing/matching, search, output validation, mocked provider contracts and actual local HTTP request gates. |
| Chromium original-workflow checks | 77 passed, 0 failed | Existing app workflows, updated for the larger catalog, in isolated mode. |
| Chromium catalog/motion checks | 36 passed, 0 failed | Full-catalog search, progressive loading, new-property workflows, active animations, reduced motion, fallback APIs, and mobile fit. |
| Chromium assistant/picker checks | 81 passed, 0 failed | Guided chat, full queries, recommendations and actions, refinements, unsupported cases, autocomplete, mobile fit, keyboard navigation and motion. |
| Chromium ranking/theme checks | 104 passed, 0 failed | Direct numerical queries, exact fixture winners, preserved constraints, honest unavailable data, both complete themes, appearance controls and 29 rendered-text contrast sample groups. |
| Uncaught application errors during browser workflows | 0 | The workflows in the supplied browser suite, not all possible usage. |

The raw unit output is `unit-test-results.txt`. Browser output is `browser-test-results.txt`, and every checked assertion appears in `browser-test-results.json`. The new suite has `catalog-motion-results.txt` and `catalog-motion-results.json`. The assistant suite has `assistant-browser-results.txt` and `assistant-browser-results.json`. The ranking/theme suite has `ranking-theme-results.json` and `ranking-theme-results.txt`. The four browser suites contain 298 passing assertions in total; these are not a coverage percentage.

## Run unit tests

For the included compiled build:

```bash
npm test
```

After editing source:

```bash
npm install
npm run build
npm test
```

The unit tests cover fixed-rate mortgage reference values, zero and near-zero rates, all-cash purchases, invalid inputs, management's correct rent base, the separation of NOI from capital reserves and financing, cash-on-cash with zero initial cash, amortization conservation, fixture validity, filtering/sorting, HTML escaping, CSV formula-trigger mitigation, workspace limits, backup round trips, reserved IDs, prototype-sensitive keys, denied storage and corrupt-state recovery.

## Run the browser suite normally

Install Python Playwright and a supported Chromium browser:

```bash
python -m pip install playwright
python -m playwright install chromium
```

Start the app in one terminal:

```bash
npm start
```

Run in another terminal:

```bash
python tests/browser_smoke.py --url http://localhost:3000/dist/index.html
```

The suite detects a system Chromium/Google Chrome first and otherwise uses the Playwright browser. It creates a fresh browser context; it does not target your normal browser profile. It does exercise destructive actions inside that test workspace, including reset and import. Do not point it at a production account or a page containing important data.

Normal mode uses actual navigation, page reload and native localStorage. A successful normal-mode run would validate reload persistence in that browser context, but still would not establish cross-device synchronization or all-browser support.

## Isolated mode used for the delivered result

The inherited test setup uses isolated browser documents because browser navigation/storage are restricted here. A new direct `file:` navigation attempt returned `ERR_BLOCKED_BY_ADMINISTRATOR`; the prior version also recorded a blocked local-HTTP browser navigation. The test therefore loaded the generated HTML into a Playwright document with `set_content` and supplied an in-memory implementation of the Storage interface:

```bash
python tests/browser_smoke.py --isolated
```

This is an explicit test configuration, not a change to the distributed app. The production code still uses native localStorage. The adapter survives app re-initialization within the test, allowing restoration logic to be tested. A separate page without the adapter verifies the native denied-storage warning and usable session-only fallback.

**Not verified in this environment:** native localStorage across browser restarts or actual page navigation, opening the standalone file directly, native HTTP page loading, Safari, Firefox, physical mobile devices, a hosted deployment, normal successful third-party-photo fetching, or a complete accessibility/security audit. The local server was exercised over actual local HTTP using Node tests, including public assets, availability status, unconfigured mode, private-file rejection, same-origin enforcement, content types and request validation. This is not an end-to-end browser-to-provider test. Provider-contract tests use mocked fetch; no live API key or real model response was exercised.

## Browser checks include

Search and combined filters; no-results and empty saved states; sorting and grid/list views; saved searches; favorites; note restoration and inert markup; modal feedback and Escape; three-home comparison and CSV content; live calculator changes; zero-interest and all-cash outputs; invalid inputs; cents handling; whole-year enforcement; mortgage-insurance reminders; saved scenarios; report content; custom-property create/edit/delete; safe names; JSON export; confirmed reset/import; malformed-import rejection; deletion cleanup; failed-photo fallback; and no uncaught application exceptions.

All five main views were checked for page overflow at 390, 768, 1024 and 1440 pixels. Mobile navigation open/close/inert behavior and custom-form fit were checked. Passing an overflow check does not replace full usability or visual review; the included desktop, calculator and mobile screenshots were also inspected.

## Suggested next verification

Before publishing, run normal mode on your machine, restart your browser to check persistence manually, test Safari/Firefox, navigate entirely by keyboard, review contrast and screen-reader behavior, and check your deployed static site's browser console and backup downloads. Do not publish the current test count as a coverage percentage or as proof of production readiness.

## Catalog and motion regression suite added in 1.1

```bash
python tests/catalog_motion_browser.py
```

This suite uses the same isolated-document and memory-storage approach. It runs with normal motion first, then switches the reduced-motion preference during the session. Assertions inspect actual running Web Animations, not just CSS class names. A short wait allows the browser's asynchronous media-query change event to fire.

Checks cover 60 records and 20 city options; appending 12 records at a time without replacing existing cards; keyboard focus on the first newly loaded property; all 60 unique records being reachable; no extra load button at the end; complete-catalog filtering and sorting; new homes in notes, favorites, comparison, and the calculator; no hero replay when saving; finite dialog/page effects; reduced-motion cancellation and visible content; older backup compatibility; mobile overflow/navigation; and usable content when animation/observer APIs are absent.

The sixteen added unit tests cover catalog counts, unique IDs/names/addresses, property schemas, unchanged original financial inputs, all four property types, global search/sort, finite calculated outputs, coherent tags, progressive rendering, empty/final pages, old/new ID backup round trips, and deterministic type-specific illustrations.

Visual inspection included the updated desktop landing page, Chicago results, and a 390-pixel mobile viewport. This is not a frame-rate benchmark, physical-device test, or full accessibility audit. Native HTTP navigation was attempted and blocked by the build environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); it is not reported as a passing browser check.

## Assistant and picker suite added in 1.2

```bash
python tests/assistant_browser.py --isolated
# On your own machine, with npm start running:
python tests/assistant_browser.py --url http://localhost:3000/dist/index.html
```

The 81 assertions check the widget on every page; disclosure and ARIA state; focus and Escape; budget/city/type/must-have extraction with immediate results rather than mandatory questions; up to three catalogue-grounded cards; price/location/feature reasons; saving and shared state; detail and calculator actions; in-tab conversation preservation; reset; more-results pagination; budget and city changes; no-match and unsupported-city behavior; unverified amenity caveats; inert user markup; IME and multiline entry; current-selection labeling; per-letter and mixed-token property search; numerical calculator updates only after selection; keyboard and pointer selection; no-results recovery; Tab/outside dismissal; custom-property inclusion in the picker but not the recommendation corpus; mobile panel/menu fit; a shortened viewport; and reduced/normal motion.

Screenshots were visually inspected on desktop and at 390 px mobile width. The mobile review caught an overly narrow flex item in the calculator context; it was corrected and a minimum usable width assertion added. This is still not a physical-device, screen-reader, comprehensive contrast or keyboard-IME audit.

Server tests start and stop local loopback servers. The configured-server test uses a clearly fake test credential and exercises only validation failures before the provider is contacted. Successful structured-output responses, invalid outputs, provider failures, refusal and incomplete output use mocks in `ai.test.mjs`. No live model behavior or billed request is reported as tested.


## Numerical queries and appearance suite added in 1.3

```bash
npm run build
npm test
python tests/ranking_theme_browser.py
```

The 104 browser assertions check direct global and constrained comparisons; exact winner IDs and ordering; no mandatory city gate; affordable interpretation; numeric rank explanations; downtown-data limitations; targeted clarification of a vague “good house”; theme bootstrap and live system changes; explicit device overrides; a simulated saved preference and denied storage; the appearance menu's keyboard and dismiss behavior; unchanged inputs and chat across a theme switch; the complete discover/saved/compare/calculator/workspace surfaces; details, forms, messages and dialogs; native control color scheme; calculator autocomplete, outputs and tables; 320/390-pixel mobile fit; and no uncaught application errors.

There are 29 rendered-text contrast sample groups. The suite composites inherited background colors and checks visible, enabled text against a 4.5:1 normal-text threshold (3:1 for large text). Image overlays, some native/input contents, hidden/disabled/inert elements, physical devices, assistive technologies and every possible state are not covered. See `THEMES.md` for limits. No full accessibility conformance or coverage percentage is claimed.

The 71 additional Node assertions exercise ranking aliases and direction for every metric; exact/min/max constraints; deterministic ties and catalogue shuffling; mutation of fixture numbers to rule out hard-coded winners; retained scope and pagination; named and contextual comparative references; absent geographic data; ambiguity; model assumptions; updated schema bounds; pure theme resolution; and complete CSS custom-property definitions, including motion easing. Existing 1.2 tests were updated where mandatory-slot expectations conflicted with the new immediate-answer behavior.

All four browser suites were executed against the bundled distribution with an isolated Storage adapter. Native HTTP navigation was attempted but denied by this environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); native cross-session saving, direct-file runtime behavior, real-provider responses, Safari and Firefox are not reported as tested. The actual Node HTTP endpoint tests and mocked provider contracts still pass.
