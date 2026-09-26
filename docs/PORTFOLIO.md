# Haven 1.4 — portfolio extension

The latest work adds an explicit owner-occupant household-budget model, property-specific scenarios, local multi-profile decision-making, and sourced tour research. Use these as discussion points, not claims of a production or deployed multiuser service.

Useful interview topics: pure calculation functions and budget conservation; one-time versus recurring cash flows; nullable personal data and explicit sample inputs; strict backward-compatible import validation; per-participant presentation rules versus real access control; unknown versus unmet requirements; frozen snapshots versus current property facts; accessible tabs and autocomplete; browser test scope and its limitations.

Understand and modify the code yourself before representing its development as your own work. Do not describe the local parser as a live LLM, the profile selector as secure authentication, or fictional figures as real market data.

A possible honest project description after you have worked with and can explain the implementation:

> Built and extended a TypeScript home-decision prototype with household-budget modeling, per-profile scenarios, shared-priority comparisons, and sourced tour checklists. Added backward-compatible workspace imports, accessible interactions, and automated tests. Uses fictional property data and browser-local storage.

# Turn Haven into an internship portfolio project

## Three real-estate project directions

| Concept | User problem | Engineering story |
| --- | --- | --- |
| **Haven: property research and deal analysis** | A user needs to compare homes and test purchase/rental assumptions without losing notes or scenarios. | Typed domain logic, calculation correctness, responsive UI, persistence, exports, validation and complete user workflows. This is the implemented project in this archive. |
| **House-hack planner** | An owner-occupant wants to compare renting rooms or one side of a duplex under different occupancy and expense assumptions. | Scenario comparison, owner-vs-tenant cost allocation, transparent assumptions and cash-flow visualization. This is an alternative idea, not an implemented feature. |
| **Property due-diligence notebook** | A buyer needs one place to track inspections, repair estimates, questions, evidence and unresolved tasks. | Document metadata, task states, search, collaboration and an audit trail. This is an alternative idea, not an implemented feature. |

My recommendation is to start with Haven because it connects a polished interface to enough real application logic to discuss meaningful tradeoffs. This is a design judgment, not a promise about recruiter response.

## What to put in the repository

Use a clear title such as **Haven — Real Estate Analysis Workspace**. Keep the README, demo screenshot, model specification and tests. Add a link to a deployed static demo after you actually deploy it. State clearly that listing data is fictional and the first version is browser-local.

The current stack is **TypeScript, CSS, native DOM/browser APIs, Node.js development tooling and Python Playwright**. It is not React, Next.js, a database-backed service or an ML valuation model. Describe technologies you actually use, rather than attaching extra framework names to the project.

## One substantive extension

Build an account-backed workspace so saved properties and scenarios synchronize across devices. Keep the calculator module unchanged and place persistence behind an interface, with a local implementation for demo mode and a server implementation for signed-in users.

A good definition of done is: authentication, per-user authorization, server-side input validation, database migrations, loading/error states, tests showing one user cannot access another user's workspace, and a clear import path from the existing local backup. Do not label a mock login form as authentication. This extension is **not included** in the current build.

Doing and documenting one extension yourself gives you a concrete contribution to explain, rather than just presenting a generated starting point unchanged. Discuss assistance and your own work accurately when asked.

## A 90-second demo

Start with the problem: “I wanted one workspace to shortlist properties and understand the assumptions behind a rental scenario.”

Show search and filtering, save a home, add a note, and compare three properties. Move into the calculator and change the down payment or rent; explain why NOI and after-financing cash flow differ. Show an all-cash case, save the scenario, export its report, and finish with a custom property or backup restoration.

Then open one regression test and show how the zero-interest case or invalid backup is handled. Explain one deliberate limitation: fictional data, local-only persistence, fixed-rate modeling, or the isolated browser-test environment.

## Resume wording to adapt after your contribution

> Developed a TypeScript real-estate research app with property comparison, rental cash-flow modeling, saved scenarios, validated data import/export, and responsive layouts; tested financial and persistence logic with 62 automated unit tests.

Use “extended,” “implemented [your feature],” or other more precise language when that better reflects your contribution. Update the test count after your changes. Do not invent users, revenue, investment performance, conversion improvements, latency measurements, production deployment, or team ownership.

## Interview questions worth being ready for

Explain how you avoid NaN and zero-interest failures; why capital reserves and debt service are not deducted in the cap-rate numerator; why management uses rent after vacancy; how backup validation prevents malformed records from breaking rendering; what browser storage does and does not protect; how safe text rendering and CSV escaping differ; and which browser behaviors the supplied tests did not establish.

A useful closing point is what you would change at scale: a standard bundler, explicit component/state boundaries as UI complexity grows, server-side authorization and persistence, and a permitted real-data source with freshness and provenance clearly displayed. None of those future capabilities should be represented as already shipped.

## New 1.2 demo segment

Open **Ask Haven** and use “Lincoln or Omaha, under $400k. A house with 3 bedrooms and outdoor space.” Show the preference recap and one reasoned recommendation. Save it, run its numbers, then search “Austin condo” in the calculator picker. Explain how the chat state survives page re-renders while the rest of the app reuses its existing actions.

Be precise about the AI boundary: the standalone experience is rule-based. With the optional server configured and the user opted in, a model extracts structured preferences, while deterministic code chooses and explains catalogue records. Discuss schema validation, hallucination prevention through catalogue IDs, unverified features, prompt injection boundaries, error fallback, private API-key handling, and tests. Do not claim a live model integration was tested with a real key until you have actually done that.


## 1.3 demo segment: queries and appearance

Ask “cheapest house,” “the biggest place,” and “most bedrooms.” Show that the named answers, numbers and order follow all 60 fixture records immediately. Then narrow the scope with a budget or city, request another ordering, and show that hard constraints remain intact. Ask “closest to downtown” to demonstrate the distinction between absent data and genuine intent ambiguity. The app refuses to fabricate measurements.

Switch between Light, Dark and Use device setting with the header control. Keep a calculator input edited or a chat open to demonstrate that appearance is independent of application state. Discuss semantic design tokens, prepaint application, reduced-motion support and what the rendered contrast samples do and do not verify. Explain that this local intent engine is deterministic and bounded; do not represent it as a trained model or claim a live-provider benchmark.
