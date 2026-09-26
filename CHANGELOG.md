# Changelog

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
