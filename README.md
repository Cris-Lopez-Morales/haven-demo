# Haven

**Good places. Better possibilities.**

A real-estate discovery and investment-analysis workspace built with TypeScript, CSS, and native browser APIs. Explore a property, compare the numbers, model a scenario, and save a decision.

This is a working local-first portfolio prototype, not a live listing service. All 60 starter properties across 20 cities use fictional addresses, neighborhood labels, prices, rents, and costs. The default interest rate is illustrative, not a current quote. There is no account system, backend, or live MLS integration.

![Haven discovery screen](docs/discover.png)

## What changed in 1.1

The same clean visual system, with a larger sample world and subtle motion:

- **60 fictional properties in 20 cities**, up from 12 in four cities. New examples include Chicago, Austin, Raleigh, Seattle, Portland, and San Diego. All four property types have at least 12 examples.
- **Progressive browsing in groups of 12.** “Show more” appends cards without rebuilding existing ones, moves focus to the first new home, and updates a visible progress indicator. Search, filters, sorting, saved homes, comparisons, notes, and the calculator operate on the complete catalog, not just loaded cards.
- **Finite, lightweight motion.** Landing-page reveals, on-scroll staggered cards, card/image hover effects, heart feedback, dialog entrances, filter expansion, and the comparison tray. No animation library or infinite decorative loops. Reduced-motion preferences are respected, including changes during a session.
- **Compatible backups.** Original property IDs and financial inputs remain unchanged. Export a JSON backup from the old version and import it through **Your workspace** in the updated version to transfer saved homes, notes, and scenarios between file locations.

The new illustrations use the same palette and style, with additional townhome, duplex, and low-rise facades. No live listing service or new network dependency has been added.

## Start in under a minute

You need Node.js 20 or newer for the local server. The archive includes the compiled app, so **no dependency installation is needed just to run it**.

```bash
cd haven
npm start
```

Open `http://localhost:3000` in your browser. Keep the terminal running; press Ctrl+C to stop. Set the `PORT` environment variable when port 3000 is already in use.

The fully bundled version is at `http://localhost:3000/dist/index.html`. It is also distributed separately as `Haven.html`: one file containing the application, styles, and original illustration code. Open that file in a modern browser for a quick look. Browser handling of local-file storage varies, so use the local server or a static HTTPS deployment for reliable workspace saving.

No API key, database configuration, remote script, or external font is required.

## What actually works

| Area | Implemented behavior |
| --- | --- |
| Discovery | Live search; city, budget, bedroom, area, cash-flow and property-type filters; five sort options; progressive loading; grid/list layouts; empty states; named saved searches. |
| Saved homes | Save and remove homes, review a saved-only view, and write explicit-save notes in a property detail dialog. |
| Comparison | Select up to three properties, remove or clear selections, compare consistent baseline metrics, and export CSV. |
| Deal calculator | Live fixed-rate financing, cash flow, cap rate, cash-on-cash return, upfront cash, expense breakdown, rent/rate sensitivity, loan-balance chart, and annual amortization. |
| Scenarios | Change financing and operating assumptions, use presets, save named snapshots, reload them, delete them, and export a detailed report. |
| Your properties | Add, edit and delete custom entries with validated inputs. Deletion also cleans associated saved state. |
| Workspace | Browser-local persistence, JSON export, validated import with replacement confirmation, and reset with confirmation. |
| Resilience | Session-only warning when storage fails; corrupt-data recovery; invalid-input states; optional-photo fallback; CSV escaping; user text rendered as text. |

The mobile layout includes a navigation drawer. Native dialogs support Escape and focus management. Inputs have labels, tables have captions or headings, feedback uses live regions, and animations respect reduced-motion preferences. These are implemented accessibility features, **not a claim of complete accessibility certification**.

### Try this demo flow

1. Filter Discover to Lincoln and save a named search.
2. Open The Willow House, add a note, and save the home.
3. Compare it with two other properties, then export the comparison.
4. Choose **Run the numbers**, switch to **All cash**, or change rent and vacancy. Save the scenario and export the report.
5. Add your own property. Export a workspace backup, reset, and import the backup to restore it.

## Editing the project

The running app has zero third-party runtime dependencies. TypeScript is the sole npm development dependency, pinned to the compiler version used for this build.

```bash
npm install
npm run build
npm test
npm start
```

`npm run build` compiles strict TypeScript into `build/`, then creates the portable `dist/index.html`. Run it after source changes. `npm test` runs tests against the compiled modules, so rebuild first when editing TypeScript. `npm run typecheck` checks source without emitting files.

The included build output lets a reviewer run the original app and unit tests before installing the compiler. No lockfile is included in this generated archive; generate and commit one with `npm install` when setting up your repository.

### Structure

```text
src/
  types.ts          Typed domain models, assumptions, filters, and workspace schema
  finance.ts        Pure calculations, amortization, validation, filtering, sorting
  data.ts           60 clearly fictional starter properties across 20 cities
  storage.ts        Workspace persistence, import validation, limits, recovery
  ui.ts             Escaping, formatting, icons, original architectural SVG artwork
  motion.ts         Observer-driven reveals, Web Animations, reduced-motion support
  views.ts          Discovery, saved, compare, property details, and workspace views
  calculator.ts     Calculator inputs, results, sensitivity, and loan visualizations
  app.ts            Application state, navigation, event handling, dialogs, exports
  styles.css        Responsive visual system and interaction states
scripts/
  build.mjs         Small static-module bundler for the known application graph
  serve.mjs         Node-built-in development server, bound to localhost
build/              Precompiled ES modules, also used by unit tests
dist/index.html     Self-contained distribution file
tests/              Node unit tests and two Python Playwright browser suites
docs/               Screenshots, formulas, test results, and portfolio guidance
```

Pure business logic is separated from rendering and persistence. This makes the calculations independently testable and makes a future UI-framework or storage migration possible without rewriting the model.

The bundler deliberately supports only this project's known static named-import/export graph. It is not a general JavaScript bundler. Use a general-purpose bundler before introducing dynamic imports, complex module syntax, or a large dependency graph.

## Model and data boundaries

Every result is conditional on editable inputs. Defaults are 20% down, 6.5% illustrative interest, a 30-year loan, 5% vacancy, 5% maintenance, 8% management, 3% capital reserve, and 3% closing costs. Property fixtures supply price, rent, tax, property insurance and HOA. Initial repairs and mortgage insurance default to zero; add any applicable amounts yourself.

Net operating income excludes financing and capital reserves. Cash flow subtracts both, plus entered mortgage insurance. Management uses rent after vacancy; maintenance and capital reserves use gross scheduled rent. Initial cash includes down payment, closing costs and initial repairs.

See [the model specification](docs/MODEL.md) for exact formulas and a reproducible example. The app does not estimate appreciation, tax benefits, future rent increases, selling costs, adjustable-rate loans, eligibility, legal compliance, or lender-specific requirements. It is not financial advice.

## Persistence and privacy

Workspace data is stored in this browser under `haven.workspace.v1`. Saved homes, comparison selections, custom properties, notes, named searches, and saved scenarios are included. Unsaved calculator edits, current navigation, sort/layout controls, and temporary filters are not a cross-session workspace record.

There is no sign-in, analytics, server upload, cloud synchronization, or encryption of your notes. Do not treat browser storage as a secure document vault. Other devices and browser profiles do not share the workspace. Clearing site data removes it, so export backups regularly. Imports replace rather than merge the workspace, after validation and explicit confirmation.

Limits include 500 custom properties, 50 saved searches, 100 saved scenarios, three comparison slots, and a 3 MB import file limit. These are prototype guardrails, not a tested maximum-scale performance guarantee.

If storage is denied or unavailable, the app continues in memory and shows a warning with a backup option. Browser behavior for `file:` URLs is not standardized for localStorage; serve over localhost or HTTPS. See [MDN's localStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Original architectural SVG artwork is the default and works without a network. The optional photograph setting in About requests illustrative images from Unsplash. Those images are not photographs of the fictional properties; enabling them sends normal image requests to a third party. A failed request falls back to the original artwork. No external font files are included.

## Verification

The supplied build passed **62 Node unit tests and 113 Chromium browser checks** (77 existing workflow checks plus 36 catalog/motion checks). The browser run used an isolated document with an in-memory Storage adapter because native navigation/storage were restricted in the build environment. App state restoration and denied-storage handling were exercised; native cross-session localStorage, direct-file opening, Firefox and Safari were not verified here.

See [testing instructions and scope](docs/TESTING.md), [unit results](docs/unit-test-results.txt), the [machine-readable browser results](docs/browser-test-results.json), and [catalog/motion results](docs/catalog-motion-results.json). No test-coverage percentage or production-readiness claim is implied.

## Publish

Upload **only `dist/index.html`** as the root `index.html` of a static site. No runtime build command or backend is necessary for the prebuilt artifact. Keep your source, README and tests in a separate public repository. This archive has not been deployed on your behalf.

The included local server is a development convenience, not a production server. For a configured strict Content Security Policy, account for the bundled inline scripts/styles and data-URI SVG images, or split them into external build assets and use suitable hashes/nonces. Do not simply disable an existing site's security policy.

## Make it a portfolio project

The strongest story is the complete decision workflow, not simply a house-card UI. Explain the financing assumptions, edge cases, import validation, failed-storage behavior and tests. See [portfolio guidance](docs/PORTFOLIO.md) for alternative real-estate concepts, a demo outline, and a next-step extension. Treat this as a starting codebase: understand it, make substantive changes, and describe your contribution accurately.
