# Home decision workspace — implementation notes

## Quick tour

1. Open **Home workspace** or choose **Explore your life here** on a property card.
2. In **Your Life Here**, set up a household plan or explicitly load the sample budget. The latter is labeled as fictional example personal finances.
3. Save several homes. The comparison table uses the active profile’s same household budget and each home’s own ownership assumptions.
4. In **Together**, edit your priorities, add a local participant, record opinions, and move the home through a shared stage. Switch the active profile to try the other perspective.
5. In **Before You Tour**, answer a question with its source, add another question, record a visit note, and export the brief.

## Boundaries

This is a local-first prototype, not a real listings service, lender, inspection service, or authenticated collaboration platform. All 60 starter listings are fictional. A live language model is not activated. Profiles on the same device can access one another’s data by switching profiles. No external messaging, calendar appointment, or document upload occurs.

## Architecture

- `decision-engine.ts`: pure owner-occupant calculations, participant defaults, conservative fact/priority comparison, tour-question generation, strict import validation, and cleanup of removed properties.
- `decision-views.ts`: escaped HTML presentation, semantic provenance labels, accessible tabs/forms, budgets, comparisons, profile views, and tour briefing.
- `decision-workspace.ts`: event orchestration, validation, per-home selection, per-profile state, explicit destructive confirmations, and CSV/text exports.
- `types.ts`: explicit types for household budgets, ownership assumptions, people, requirements, opinions, questions, stages, visit notes, and frozen scenarios.
- `storage.ts`: adds the optional-on-import `decisions` extension to the existing version-1 backup format. Old backups migrate into a default profile with no budget.

There are no new runtime dependencies, CDN imports, external fonts, live listings requests, or remote image dependencies for the default experience.

## Household model

All amounts are USD. Every number is user-entered, a fictional fixture input, or an editable sample assumption. Income is monthly take-home pay, not gross annual salary. Expenses should exclude the new home’s housing costs and utilities and exclude the separate savings goal to prevent double counting.

```text
Down payment = purchase price × down-payment percent
Loan = purchase price − down payment
Monthly principal & interest = existing tested fixed-rate mortgagePayment function
Housing = principal & interest + annual tax / 12 + home insurance + HOA
          + mortgage insurance + utilities + maintenance reserve
Monthly remaining = take-home income − housing − other expenses − savings goal
Difference from cushion target = monthly remaining − cushion target
Upfront cash = down payment + closing costs + moving + initial repairs
Remaining cash = available cash − upfront cash − one-time stress repair, if selected
```

The monthly cushion is a comparison target, not another expense. No borrowing is invented to cover insufficient cash. The all-cash case suppresses mortgage principal/interest and mortgage insurance. No rental income, tax benefits, capital growth, selling costs, loan qualification, or rent growth are modeled in this owner-occupant planner. The separate existing **Deal calculator** remains the investment/rental tool.

Sample defaults: 20% down, 6.5% illustrative fixed interest, 30 years, 3% closing costs, $250/month utilities, $1,500 moving, $0 initial repairs, and a maintenance reserve of 1% of price per year divided by 12 and rounded. Taxes, home insurance, and HOA come from fictional records or custom entries. Mortgage insurance begins at $0 and is explicitly flagged as incomplete with less than 20% down. These are not quotes or verified expenses.

One what-if operates at a time. Income loss lowers take-home pay; extra non-housing expenses lower monthly remainder; the one-time repair reduces cash, not monthly income or recurring spending. Inputs for these switches persist, while the selected what-if is also saved in a scenario snapshot. A reset or import starts the live view on the baseline scenario.

Snapshots preserve purchase price, household budget, every ownership input, and the selected stress case. Loading first displays the frozen result and asks for confirmation. Applying a snapshot replaces this profile’s budget and the target home’s ownership assumptions; the live view uses the property’s current price. The confirmation explicitly distinguishes the two prices. CSV exports include all input fields and calculation results.

## Together: presentation privacy is not security

Each of up to eight participants has their own name, optional household budget, must-haves, and per-property ownership inputs. Home opinions and notes are keyed by profile. A shared stage belongs to the home, not to an individual.

Common fit is not a mystery score. A property must meet every recorded requirement for every participant. A profile with no criteria is not assumed to agree. Missing feature data is unknown, not false. Combined duplex bedrooms and size are never treated as evidence of the size of an owner-occupied unit. Free-text requirements are preserved for discussion, not silently interpreted by a nonexistent AI model.

Raw budgets are not rendered in Together. A person can explicitly display only the modeled monthly remainder. The switch does not secure the underlying data. A full backup includes every profile’s budget and must be handled as sensitive. Production collaboration would require authentication, server-side authorization, per-user financial data access, invitation consent, synchronization, and a separately designed sharing model.

Removing a profile confirms deletion of that person’s budget, scenarios, priorities, and home opinions. Shared tour notes and answers are preserved without the deleted author reference. Removing a custom property removes its decision records, ownership inputs, and snapshots.

## Tour research and provenance

The brief uses the active profile’s recorded requirements and listing facts. It does not infer building defects from a home’s age. Roof/system condition, inspection results, and actual utility bills remain unknown until the user records information. A source is an explicitly entered reference, not a fetched page or verified document.

Questions adapt to association fees, condos/townhouses, duplexes, outdoor space, and natural-light priorities. A question cannot be marked answered without both nonempty answer text and a source. Answers remain labeled user-recorded. Saved custom or answered questions are not silently discarded when priorities change. The visit datetime is stored as a local planning string; it neither creates an appointment nor notifies anyone.

The text tour export includes property facts, active priorities, stage, questions, answers, source references, and shared visit notes. It does not include any household budget, hidden participant financial fields, or life-scenario snapshot. The separate life CSV and full workspace JSON do include financial inputs.

## Validation and persistence

Finite numeric caps apply to all budgets, ownership assumptions, and stress inputs. Invalid form values retain the previous valid result and disable save/export until corrected. Valid ownership-input edits save automatically; budgets, profile priorities, opinions, visit notes, and question answers use explicit save actions.

Backup validation checks extension version, person IDs, active-profile membership, object keys, property references at normalization, bounded strings, numeric limits, scenario types, question status/source consistency, stage enums, and author references. Malformed saved workspaces are kept in a recovery key and a new session starts with a visible notice, following the existing storage policy.

This release retains the 3 MB import cap and the original workspace storage key. Storage-denied/full behavior remains session-only with visible warnings and a manual export path. Native storage behavior across file URLs and browser sessions was not verified in the test environment.
