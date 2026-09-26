# Verification record and reproducible tests

## Included build

The included build was checked with Node.js v22.16.0, TypeScript v5.8.3, and Python Playwright driving Chromium.

| Suite | Result | Scope |
| --- | --- | --- |
| Strict TypeScript compilation | Passed | Build completed without type errors. |
| Node unit tests | 62 passed, 0 failed | Calculations, filtering, encoding, validation, storage, catalog compatibility, artwork, and pagination. |
| Chromium original-workflow checks | 77 passed, 0 failed | Existing app workflows, updated for the larger catalog, in isolated mode. |
| Chromium catalog/motion checks | 36 passed, 0 failed | Full-catalog search, progressive loading, new-property workflows, active animations, reduced motion, fallback APIs, and mobile fit. |
| Uncaught application errors during browser workflows | 0 | The workflows in the supplied browser suite, not all possible usage. |

The raw unit output is `unit-test-results.txt`. Browser output is `browser-test-results.txt`, and every checked assertion appears in `browser-test-results.json`. The new suite has `catalog-motion-results.txt` and `catalog-motion-results.json`. The two browser suites contain 113 passing assertions in total; these are not a coverage percentage.

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

The build environment blocked navigation to local HTTP and `file:` pages. The test therefore loaded the generated HTML into a Playwright document with `set_content` and supplied an in-memory implementation of the Storage interface:

```bash
python tests/browser_smoke.py --isolated
```

This is an explicit test configuration, not a change to the distributed app. The production code still uses native localStorage. The adapter survives app re-initialization within the test, allowing restoration logic to be tested. A separate page without the adapter verifies the native denied-storage warning and usable session-only fallback.

**Not verified in this environment:** native localStorage across browser restarts or actual page navigation, opening the standalone file directly, native HTTP page loading, Safari, Firefox, physical mobile devices, a hosted deployment, normal successful third-party-photo fetching, or a complete accessibility/security audit. The local server started successfully, but restricted browser navigation prevented end-to-end HTTP-mode verification.

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
