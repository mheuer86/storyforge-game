# SF2 refactoring issues

These issues come from the architecture review after the V1 narrator quality merge into SF2.

Selected first:

1. Archivist Extraction Adapter
2. Chapter Opening Module
3. Scene Snapshot Reducer
4. Narrator Stream Protocol Module
5. Client Turn Orchestrator Module
6. Prompt Surface Inventory And Parity Audit
7. SF2 Genre Narrative Profile Module
8. Narrator Prompt Surface Module
9. Narrator Prompt Facade Import Cleanup
10. Narrator Turn Context Orchestrator Cleanup

The first two are the lowest-risk AFK refactoring slices: behavior should stay the same, but Module Depth, Locality, and Leverage should improve.

The Scene Snapshot Reducer is now pick-up-able as an AFK implementation slice. Its key location-storage decision is already made: keep `SceneSnapshot.location` embedded for now, but treat it as a synchronized projection from canonical `campaign.locations`.

The Turn Runtime shaping split into two tickets:

- `04-narrator-stream-protocol-module.md` is the AFK first slice. It makes stream event contracts typed and shared without changing sequencing.
- `05-client-turn-orchestrator-module.md` is the later HITL slice. It extracts the client narrator loop after the protocol contract exists.

The prompt/genre shaping split into five tickets:

- `06-prompt-surface-inventory-and-parity-audit.md` is the audit gate. It should not alter prompt behavior.
- `07-sf2-genre-narrative-profile-module.md` is architecture work that can proceed in parallel by consolidating existing genre bibles/examples without rewriting them.
- `08-narrator-prompt-surface-module.md` is now shaped as a structure-only AFK refactor. It extracts Narrator prompt core/role/situation into a clearer internal module while preserving prompt text, cache placement, and the public `prompt.ts` facade.
- `09-narrator-prompt-facade-import-cleanup.md` follows 08. It standardizes imports around the formal public `lib/sf2/narrator/prompt.ts` facade.
- `10-narrator-turn-context-orchestrator-cleanup.md` follows 08. It refactors `turn-context.ts` orchestration separately so Ticket 08 stays focused on prompt text ownership.

Key prompt-surface decisions from shaping:

- No V1 systems are restored in Ticket 08. Restorations require dedicated tickets.
- Duplicated bug-scar rules stay duplicated until sentinel/replay coverage proves they can be removed.
- `buildNarratorSituation(state)` can move, but its output must be byte-equivalent.
- The boundary between cached chapter situation, cached scene bundle, and per-turn mutable delta is not in scope to change.
- Fixtures are required for validation, using the existing SF2 replay harness.
