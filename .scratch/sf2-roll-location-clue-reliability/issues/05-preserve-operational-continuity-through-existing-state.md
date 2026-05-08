Status: needs-triage
Type: AFK

# Preserve Operational Continuity Through Existing State

## What to build

Verify that removing operational clue spam does not lose important continuity. Outcomes like "Voss cleared the hold" should persist through existing state lanes: thread/gate resolution, documents, temporal anchors, pressure events, scene state, or other already-modeled structures.

Do not introduce a new generic "fact" entity for this slice. The goal is to use the existing SF2 state model correctly rather than creating another catch-all memory bucket.

## Acceptance criteria

- [ ] A focused replay fixture covers the failure where an operational hold appears to remain active after prose established it was cleared.
- [ ] The operational outcome persists through an existing state lane, not through a clue and not through a new generic fact entity.
- [ ] Retrieval/Narrator context surfaces the resolved operational state so later turns do not re-open the same cleared obstacle.
- [ ] The fix coexists with clue restriction: no invalid clue is needed to preserve the operational continuity.
- [ ] Diagnostics or replay output make it clear which existing state lane carried the continuity fact.

## Blocked by

- `.scratch/sf2-roll-location-clue-reliability/issues/04-restrict-clues-to-investigation-evidence.md`

