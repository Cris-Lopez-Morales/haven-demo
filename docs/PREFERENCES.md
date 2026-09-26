# Rejection memory and transparent re-ranking — Haven 1.7

Feature **3 of 4**. Features 1 and 2 remain intact. The negotiation-intelligence panel (#4) is deliberately not implemented pending review.

## Try it

1. In Discover, search **The Cedar Loft**. Choose **Not interested → HOA too high → Pass on this home**. One record is saved; no rule is inferred.
2. Repeat for **The Terrace**. Their fictional listed HOA fees are $320 and $220/month. The learned soft threshold is their median, **$270/month**.
3. Clear the search and choose **Recommended**. Remaining homes at or above $270/month in listed HOA fees move below homes that do not cross the threshold. Every other explicit filter still applies.
4. Ask the assistant **“Use my learned preferences.”** It names the HOA rule and gives explanations referring to the actual fee and threshold on its matches.
5. Ask **“Show me the cheapest home.”** The true ascending asking-price order wins among unpassed matching homes. The assistant explicitly explains the exclusion and sort scope.
6. Open **Your preferences** from Discover, the global sidebar, Your workspace, or chat. Inspect the evidence, pause learning, edit a reason, undo a pass, or reset all passes after confirmation.

This is a deterministic, local demo. No language model or key is needed for learning. All 60 starter properties remain fictional and unchanged.

## Exact algorithm

Memory is workspace-wide, not a private Together participant account. Only deliberate **Not interested** submissions count. Views, saves, comparison choices, financial inputs, participant reviews (including “Not for me”), and free text do not implicitly train the ranking.

Each property has one current pass record. It contains one reason, an optional note (required for Other), a timestamp, and a snapshot of the listing's asking price, floor area, HOA fee, name, and city. When available at pass time, a fictional commute-distance snapshot contains the work city/position and distance, not the work label. Re-passing or editing the same home replaces its record; it cannot manufacture additional votes. Changing a listing later does not rewrite historical evidence. Editing its reason deliberately captures a new snapshot.

A reason becomes a learned rule after **two distinct homes with comparable, usable data** have been passed on for that reason. The threshold is the median of the supporting values, not a national benchmark or a subjective affordability judgment.

| Reason | Soft conflict for a candidate home | Evidence exclusions |
|---|---|---|
| Price too high | Asking price **at or above** the median of passed prices | No missing/invalid prices accepted |
| Too small | Listed sq ft **at or below** the median of passed areas | Duplex area means both units combined |
| HOA too high | Listed monthly HOA **at or above** the median of positive passed fees | Zero-HOA passes are remembered but do not train a high-fee rule |
| Too far | Fictional one-way road miles **at or above** the median of comparable passed routes | Requires the same demo work city, state, and position; no actual routes are available |
| Other | None | Text is retained only as context; never parsed into hidden traits |

Apply explicit filters first. Exclude specifically passed homes from new recommendations. Each active threshold a candidate crosses contributes **one equal-weight conflict**. Sort by fewer conflicts, keeping the pre-existing order for ties. There is no opaque desirability score, protected-trait inference, or hidden budget relaxation. Additional passes update the median; they do not silently increase that reason's weight.

- **Discover → Recommended:** learns from passes; ties use the existing recently-added order. All custom and demo homes are eligible.
- **Other Discover sorts:** remain strictly ordered by their selected metric. The 60-home catalog itself is never reordered or mutated.
- **Assistant, general requests:** learns from passes; ties retain the existing lower-price/greater-area/ID order. Its existing scope is the 60 demo homes, not custom entries. Workspace-wide feedback from custom entries may still contribute numeric preference evidence; the assistant's excluded-home count only counts passed demo records.
- **Assistant, numeric requests:** keep the explicit metric and direction, with passed homes excluded and that scope explained. “Use my learned preferences” returns to general ranking while retaining explicit search constraints.
- **Saved homes, Compare, calculator picker, and Home Workspace:** remain accessible and are not filtered by this feedback. Passing never deletes a save, note, budget, comparison, scenario, or tour answer.
- **Show passed homes:** restores passed entries to Discover with visible Passed labels and Undo controls. This is a transient browsing choice, not an instruction to recommend them in chat.

Learning affects future answers. Previous chat messages remain labeled snapshots, with their pass controls updated. The next request uses the latest memory; the pagination cursor resets when that memory or work setup changes. A full chat reset does not clear persistent feedback—use Your preferences to do that.

## Distance and missing data

The existing 1.6 commute model uses invented positions. None of these are geocoded addresses, actual commute distances, or traffic predictions. “Too far” without a comparable demo route records only the explicit pass. It cannot train a distance rule retroactively when a work setup is later added.

Changing work city or position suspends incompatible distance evidence. Returning to the original setup can reactivate it. Changing the display label or assumed speed does not change a distance-based threshold. Work from home/off suspends distance learning. The history remains available to review and undo.

Custom/outside-city homes without comparable distances receive **no distance score**. They may still appear in recommendations; the assistant explicitly says this does not mean they are nearer. No geographic substitute, neighborhood-name heuristic, or mapping API is used.

## Inspect, reverse, and persist

The compact Discover panel names the learned traits. The detailed panel shows thresholds, evidence counts, the full method, pending/unsupported reasons, all passed homes, and their notes. The native radio reason picker supports keyboard navigation. New UI uses existing semantic light/dark colors, visible focus states and reduced-motion rules.

- **Undo:** removes that pass and its evidence. Thresholds recalculate immediately; a rule with fewer than two eligible records stops applying.
- **Edit reason:** updates the single record, removing its contribution to the previous reason.
- **Pause:** stops learned weighting without forgetting individual passes. They remain excluded from new recommendations.
- **Reset:** confirms first, then clears all passes, notes, and rules. It leaves other workspace data unchanged.
- **Custom property deletion:** prunes its feedback and recalculates derived rules.

Feedback uses the existing `haven.workspace.v1` storage key in a new validated `rejections` section. Older backups load with empty memory. New backups retain memory; invalid imports fail before replacement. A denied/full storage backend shows session-only warnings; a JSON export still preserves valid session state. Native cross-session persistence is not verified by the isolated browser test adapter.

Full backups contain subjective rejection notes, numeric snapshots, and existing personal financial data. Keep them private. This local prototype has no cross-device synchronization, user accounts, or per-participant security boundary.

## Network and optional AI

No new request or dependency is introduced. The default standalone workflow is local and requires no token. Existing opt-in external photography and optional connected AI remain off by default.

Structured rejection memory, personal notes, work labels, and financial profiles are never attached to AI requests. The optional interpreter now receives only user-written messages from the bounded transcript—not assistant replies that can contain learned summaries. Anything a user deliberately types into chat would still be sent when they separately opt into connected AI. These contracts are tested locally; no live model was exercised or activated.

## Implementation

- `rejection-engine.ts`: schema validation, snapshots, pruning, eligibility, medians, stable re-ranking and explanations.
- `rejection-views.ts`: compact panel, reason picker, review/history controls and readable method disclosure.
- `rejection-controller.ts`: explicit pass/undo/edit/pause/reset interactions; existing persistence/notifications.
- `views.ts` / `app.ts`: Recommended browsing, filtering scope, global entry points, migration and deletion cleanup. Feedback actions do not rebuild incomplete calculator or household forms.
- `assistant-engine.ts` / `assistant-widget.ts`: current memory and work setup, specific explanations, exclusions, chat actions, sort priority and local/private context.
- `living-controller.ts`: refreshes learned ranking when the shared work setup changes, without replacing unrelated financial inputs.

Tests and recorded results are described in `TESTING.md`.
