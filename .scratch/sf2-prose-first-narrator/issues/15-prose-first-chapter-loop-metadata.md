# 15 - Add Prose-First Chapter Loop Metadata
Status: ready Type: AFK Area: SF2 prose-first prototype / narrator metadata

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

Add hidden chapter-loop metadata to prose-first narrator turns so the app can observe the narrator's chapter judgment without relying on prose heuristics.

The narrator should still write prose-first, but every committed non-roll turn should include structured chapter-loop fields: phase, foreground question, whether it is answered, close intent, handover readiness, true close signals, active blockers, next required delta, and what not to repeat next.

This slice should be additive and safe for the existing SF2 narrator path. If the same narrator tool is shared, make the new metadata optional and only require it through prose-first prompt/repair behavior.

## Acceptance criteria

- [ ] Prose-first narrator instructions include the optimized `v4d` close rule: active-scene guard, fact-locked reasoning, handover readiness, and close-after-peak guidance.
- [ ] The narrator tool schema accepts hidden chapter-loop metadata without breaking existing non-prototype narrator calls.
- [ ] Prose-first committed turns emit a diagnostic entry containing the chapter-loop metadata when available.
- [ ] The metadata is not rendered in player-facing prose.
- [ ] Roll-pause turns still call `request_roll` and stop as before; chapter-loop metadata is required only for completed non-roll turns.
- [ ] Existing missing-commit repair still works for ordinary narrator annotations.
- [ ] At least one focused test or replay fixture proves a prose-first turn can carry chapter-loop metadata through the route and client pipeline.

## Blocked by

None - can start immediately.
