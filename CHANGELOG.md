# Changelog

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
