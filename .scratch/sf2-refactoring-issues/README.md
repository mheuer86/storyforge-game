# SF2 refactoring issues

These issues come from the architecture review after the V1 narrator quality merge into SF2.

Selected first:

1. Archivist Extraction Adapter - implemented
2. Chapter Opening Module - implemented
3. Scene Snapshot Reducer - implemented
4. Narrator Stream Protocol Module - implemented
5. Client Turn Orchestrator Module - implemented as part of 08 scope
6. Prompt Surface Inventory And Parity Audit - implemented
7. SF2 Genre Narrative Profile Module - implemented
8. Narrator Prompt Surface Module - implemented
9. Narrator Prompt Facade Import Cleanup - satisfied by 08 implementation
10. Narrator Turn Context Orchestrator Cleanup - implemented as part of 08 scope

## Current status after Ticket 08

Ticket 08 landed and reviewed on 2026-05-16. The implementation did more than the narrow prompt-surface extraction:

- `lib/sf2/narrator/prompt.ts` is now the public facade.
- `lib/sf2/narrator/prompt/` owns `core`, `role`, and `situation`.
- `lib/sf2/genre-profile/` owns SF2 bibles and examples.
- `lib/sf2/narrator/stream-protocol/` owns the shared stream event parser/types.
- `lib/sf2/runtime/client-turn-orchestrator.ts` now owns the browser Narrator stream loop.
- `lib/sf2/narrator/turn-context.ts` has already been split across system-blocks, roll-resume, roll-result, diagnostics, sentinel-context, and replay-metadata helpers.

Do not assign tickets 05, 09, or 10 as written. They are now historical tickets. If further work is desired there, write a smaller residual ticket from the current code.

Post-08 verification:

- `npm run sf2:replay -- fixtures/sf2/replay` passed: 225/225.
- `npm run sf2:check-prompt-genre-leaks` passed.
- `npm run build` passed.
- `npm run lint` still cannot run because `eslint` is not installed in this repo.

Smoke artifact note: `.scratch/sf2-refactoring-issues/artifacts/smoke-08/` contains a successful browser smoke run through chapter opening, four committed turns, two roll pauses, roll resume, diagnostics, and copy exports. Its session summary has `overallPass: false` only because of two low Archivist anchor misses on generated document attribution, not because of prompt extraction, stream protocol, or UI flow failure.

The first two are the lowest-risk AFK refactoring slices: behavior should stay the same, but Module Depth, Locality, and Leverage should improve.

The Scene Snapshot Reducer is now pick-up-able as an AFK implementation slice. Its key location-storage decision is already made: keep `SceneSnapshot.location` embedded for now, but treat it as a synchronized projection from canonical `campaign.locations`.

Tickets 01-03 implementation note:

- `01-archivist-extraction-adapter.md`: implemented with `lib/sf2/archivist/extraction.ts` and focused Archivist extraction replay coverage.
- `02-chapter-opening-module.md`: implemented with `lib/sf2/author/chapter-opening.ts` and continuation chapter-opening replay coverage.
- `03-scene-snapshot-reducer.md`: implemented with `lib/sf2/scene-snapshot/reducer.ts`, focused scene/location/focus fixtures, and canonical location projection coverage.

The Turn Runtime shaping originally split into two tickets:

- `04-narrator-stream-protocol-module.md` is implemented.
- `05-client-turn-orchestrator-module.md` was implemented as extra scope during the 08 landing. Treat it as done unless new residual issues are written.

The prompt/genre shaping split into five tickets:

- `06-prompt-surface-inventory-and-parity-audit.md` is implemented.
- `07-sf2-genre-narrative-profile-module.md` is implemented.
- `08-narrator-prompt-surface-module.md` is implemented.
- `09-narrator-prompt-facade-import-cleanup.md` is satisfied by the 08 implementation; no accidental route/script/application deep imports were found.
- `10-narrator-turn-context-orchestrator-cleanup.md` was implemented as extra scope during 08.

Key prompt-surface decisions from shaping:

- No V1 systems are restored in Ticket 08. Restorations require dedicated tickets.
- Duplicated bug-scar rules stay duplicated until sentinel/replay coverage proves they can be removed.
- `buildNarratorSituation(state)` can move, but its output must be byte-equivalent.
- The boundary between cached chapter situation, cached scene bundle, and per-turn mutable delta is not in scope to change.
- Fixtures are required for validation, using the existing SF2 replay harness.
