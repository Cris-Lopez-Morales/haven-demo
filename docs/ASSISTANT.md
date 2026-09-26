## Haven 1.7: explicit feedback and learned order

The local assistant now reads the workspace's **explicit pass memory** when computing new recommendations. General searches apply the same median-threshold rules shown in **Your preferences**; numerical requests retain their true order. Passed homes are excluded and the scope is stated. The widget offers Not interested / Undo and a direct preferences-panel link. “Use my learned preferences” resets only the conversational sort, not explicit city/budget requirements. Earlier answers remain snapshots.

No live model or API key is required. Free-text rejection notes are not interpreted. Structured memory, private profiles, work labels, or calculator/utility data are never attached to AI requests. When optional connected AI is separately enabled, the interpreter's history contains only user-written messages, not assistant summaries that could reveal learned thresholds. Anything deliberately typed into the conversation can still be sent with that opt-in. The existing default remains local demo mode.

See **PREFERENCES.md** for the exact algorithm, threshold units, pause/undo/reset semantics, duplicate protection, distance limitations, and tested privacy boundaries. The existing 60-demo-home scope remains unchanged; custom entries can supply explicit workspace feedback but are not returned as assistant recommendations.

---

# Haven assistant and property picker

## Version 1.4 status

Live AI has been **left unconfigured**. The existing local demo matcher remains active. It can still compare and rank the 60 fictional properties; each recommendation now includes an action to open that home’s decision workspace. The new budget, Together, and tour tools are implemented through deterministic application code, not an LLM. The optional model integration below is unchanged and does not yet orchestrate those three new tools.

Household budgets, participant profiles, tour answers, and new scenario snapshots are not attached to provider requests. Anything a person types into the chat itself will be sent if they separately configure and explicitly enable live AI. The distributed file has no embedded API key, and this release does not activate paid services.

## Two modes, no hidden dependency

The distributed HTML works immediately with a **local, rule-based conversational matcher**. It is not a live language model, and both the chat's mode label and disclosure say so. It recognizes common purchase-budget expressions, catalogue cities, property types, bedroom/bathroom/area bounds, numerical comparisons, and a bounded feature vocabulary. It remembers the conversation while you navigate or close the widget. Refreshing clears the chat; saved homes still use the ordinary workspace.

The source also includes an **optional live-AI interpreter**. It improves preference extraction, while the same deterministic code still filters and explains fixture-based recommendations. It is off by default, requires a server-side API key, and asks the user to opt in before sending chat data. No API key belongs in the HTML, browser storage, or client code.

All 60 starter properties remain fictional. The assistant does not browse websites, query an MLS, estimate live prices, claim availability, or provide financial advice. Custom properties are deliberately excluded from its recommendation corpus. They are included in the calculator's property picker.

## Optional live-AI setup

The precompiled project needs Node.js 20 or newer. For local demo mode, use `npm start`; no key or installation is needed.

To connect AI:

1. Copy `.env.example` to `.env` and put your own OpenAI API key in `OPENAI_API_KEY`. Keep this file private; it is ignored by Git. API usage can incur charges.
2. Run `node --env-file=.env scripts/serve.mjs` from the project folder.
3. Open the localhost URL printed in the terminal. Open **Ask Haven → Fictional listings → Enable connected AI**. The disclosure explains what is sent before opting in.

The default model is `gpt-4.1-mini`; `OPENAI_MODEL` can specify another model compatible with the Responses API and the structured-output schema. The API integration uses the Responses API's strict JSON-schema output format. It requests `store: false` and uses no previous-response IDs. Consult your provider's account settings and data policies; this setting alone is not a universal data-retention guarantee.

A standalone `file:` page and a static-only deployment cannot hold a private API credential or supply the server endpoint. They continue to use local mode. Static hosting does not automatically activate AI.

### Data flow

```text
User message + previous preferences + up to 9 recent text turns
    → same-origin /api/assistant
    → server validates and bounds the request
    → OpenAI returns structured preferences, not listing cards
    → server and browser both validate that output
    → local matching checks all 60 fixture records
    → deterministic reasons reference actual prices, cities, size and tags
```

The browser does not send workspace notes, backups, saved scenarios, custom-property data, or the API key. Text a user deliberately types into chat is part of the transmitted chat when AI mode is enabled. The server does not persist the transcript. Provider errors, timeouts, refusals, incomplete JSON, or invalid preferences trigger a visible return to local mode.

The included server binds to loopback only. It checks Host and Origin, allows only specific public asset paths, bounds request bodies, limits AI requests to 20 per minute, applies a timeout, and does not expose `.env` files. This is **development scaffolding**, not a production API gateway. Before public deployment, add authentication, per-user quotas, usage limits, monitoring, deployment-specific origin checks, and a reviewed privacy policy. Do not expose an unrestricted API-key proxy publicly.

## How recommendations work (1.3)

Unmentioned preferences are unrestricted, not required questionnaire slots. A meaningful request can be answered immediately without a city, purchase budget or type. The local parser produces typed constraints and a numeric ranking operator; the engine applies them to **all 60 fixture records**, not just the currently visible discovery cards. It then returns up to three qualifying homes and direct explanations grounded in those same records. No-match requests never get padded with mismatches. Pagination preserves the active sort.

| Request | Interpretation and actual first result |
| --- | --- |
| “Show me the cheapest house” | Single-family only, asking price ascending: **The Clover Cottage**, Des Moines, **$219,000**. |
| “The cheapest home” / “something affordable” | All types, asking price ascending: **The Terrace**, Kansas City, **$198,000**. The answer explicitly names the price-based proxy. |
| “The biggest place” | Floor area descending: **The Courtyard Two**, Chicago, **3,040 sq ft**. This duplex figure combines both units. |
| “Most bedrooms” | Bedroom count descending: **The Courtyard Two**, **6 bedrooms**, combined across both units. |
| “Lowest price per square foot” | Asking price divided by floor area, ascending: **The Elm Street Duplex**, about **$124.48/sq ft**. |
| “Closest to downtown” | Immediate limitation: no coordinates, downtown reference points, travel times or distances exist in the fixtures. No winner is invented and a city is not requested as a prerequisite. |

These names and figures are example outputs, not an answer lookup table. `ranking.ts` computes every winner at runtime. Tests modify a listing's numbers and verify that the ranking changes. Every ranking is stable under catalogue reordering; ties are disclosed and then resolved by lower asking price, larger floor area and ID. “House” means single-family; generic “home” and “place” cover all four types. Reasons include the numeric rank, comparison scope and matching price, location, size or features. Duplex area and bedroom totals are explicitly identified as combined-unit values.

Supported numerical orderings include asking price, area, bedroom and bathroom counts, construction year, HOA, property tax, insurance, and sample rent. Price per square foot is derived directly from fixture asking price and area. Gross rental yield, cash flow and cap rate use the existing calculation model. Responses disclose their formulas or default assumptions and identify them as fictional, not forecasts or advice; rankings do not silently use a user's edited calculator scenario. “Best value” is defined as price per square foot, never an overall claim about investment quality.

Hard constraints run before ranking: price range, cities, types, minimum/maximum/exact bedroom and bathroom counts, floor-area bounds, and supported features. Asking for a ranking retains prior explicit constraints. “Any city” clears only cities; “across all 60 listings” or “ignore all filters” explicitly resets narrowing. Named comparisons such as “cheaper than The Willow House” compare its actual asking price. “Bigger than that” refers to the most recently recommended first home; without a reference it asks which home, not which city.

No-result messages retain the user's constraints and offer explicit adjustments. Budget-increase suggestions are computed from the cheapest qualifying fixture when a larger budget alone would produce a match. Nothing is widened until the user accepts or asks for a change.

A vague “a good house” asks what makes a house good for that user. Conflicting unweighted goals such as “the cheapest and biggest home” ask which matters first rather than claiming a universal winner. Supported descriptive words are mapped to explicit criteria rather than used as literal city or title searches. Unsupported or genuinely unclear messages still need clarification: the offline parser is a bounded intent parser, not a general-purpose language model.

Supported features are outdoor space, private garden, natural light, open-plan living, generous storage, flexible layout, private/separate entry, two living spaces, and zero monthly HOA. Features use explicit tags; no-HOA checks its numeric fixture input. A garden is not inferred from generic outdoor space. Pool, parking, pet policy, accessibility, school, commute, safety and other unsupported requirements are marked **unverified**, not advertised as matches. There is no geospatial radius, safety-scoring, school-rating, suitability or demographic-steering model. A fictional neighborhood name cannot establish a downtown distance.

Known numerical/relative requests are answered locally even when optional connected AI is enabled. Other messages may use the opt-in AI interpreter for structured extraction, but final filtering, ranking and listing explanations still come from local data. The response schema includes all supported ranking operators and physical bounds. A real provider call was not tested for this release.

Every recommendation can open the existing detail modal, load that property's calculator assumptions, or toggle the existing Saved homes state. It uses fixture IDs, not generated URLs. Chat is in-tab memory, not a stored history; appearance changes and ordinary navigation do not reset it.

## Searchable calculator picker

The old browser-native select is replaced with an editable combobox. Search is synchronous and token-based over names, cities, states, neighborhoods, addresses, property types, prices and floor-area strings. Case, common punctuation, accents, and basic type aliases are normalized. No debounce, network request, or automatic input replacement interrupts typing. It is partial-string search, not semantic search or arbitrary spelling correction.

Opening the menu shows all demo and custom properties. Each option includes an illustration, name, location, type, beds, area and price. The current selection is marked; Arrow Up/Down moves the active option, Enter chooses it, Escape or clicking outside restores the selected property's label, and Tab dismisses without selecting. Clearing the text reopens the full list. No-result searches leave the current scenario untouched. Inputs change only after a deliberate selection.

The widget and picker support reduced motion, labeled controls, live announcements, keyboard interactions and responsive layouts. They have not undergone a full assistive-technology or accessibility audit.

## References for the optional integration

- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Default model documentation: https://developers.openai.com/api/docs/models/gpt-4.1-mini

These document the optional provider contract, not the fictional property dataset. Live API behavior with a real key was not tested in the build environment. Automated provider tests use mocks; the local HTTP server's asset serving, availability status, and input/security gates were exercised without contacting the provider.
