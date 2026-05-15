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

The first two are the lowest-risk AFK refactoring slices: behavior should stay the same, but Module Depth, Locality, and Leverage should improve.

The Scene Snapshot Reducer is now pick-up-able as an AFK implementation slice. Its key location-storage decision is already made: keep `SceneSnapshot.location` embedded for now, but treat it as a synchronized projection from canonical `campaign.locations`.

The Turn Runtime shaping split into two tickets:

- `04-narrator-stream-protocol-module.md` is the AFK first slice. It makes stream event contracts typed and shared without changing sequencing.
- `05-client-turn-orchestrator-module.md` is the later HITL slice. It extracts the client narrator loop after the protocol contract exists.

The prompt/genre shaping split into three tickets:

- `06-prompt-surface-inventory-and-parity-audit.md` is the audit gate. It should not alter prompt behavior.
- `07-sf2-genre-narrative-profile-module.md` is architecture work that can proceed in parallel by consolidating existing genre bibles/examples without rewriting them.
- `08-narrator-prompt-surface-module.md` is a blocked draft. It depends on decisions from the audit and on the genre profile Interface before implementation.
