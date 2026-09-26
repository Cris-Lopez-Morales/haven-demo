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
