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
11. Social Roll Modifier Advisories - implemented
12. SF2 Setup Compiler For V1 Hooks And Playbooks - implemented
13. Passive Perception Equivalent - implemented
14. Wire Public Play Route To SF2 - implemented

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

## Current status after V1 carry-over shaping

The first post-audit V1 carry-over decisions were made on 2026-05-16.

Tickets 11-14 were implemented on 2026-05-16:

- `11-social-roll-modifier-advisories.md`: SF2-native social modifier advisories and roll reconciliation landed with origin/disposition/cohesion fixtures.
- `12-sf2-setup-compiler-for-v1-hooks-and-playbooks.md`: SF2 setup now compiles V1 genre/origin/playbook/hook selections into `AuthorInputSeed` while preserving Arc Author -> Chapter Author -> Narrator startup.
- `13-passive-perception-equivalent.md`: passive Perception evaluates explicit surface-detail cues into dynamic Narrator context and marks delivered cues to avoid repeat spam.
- `14-wire-public-play-route-to-sf2.md`: `/play` now renders the gated SF2 app, `/play/v2` is an alias, and legacy V1 is available at `/play/v1`.

Post-14 verification:

- Focused new fixtures passed.
- `npm run sf2:replay -- fixtures/sf2/replay` passed: 233/233.
- `npm run build` passed.
- Browser smoke on `http://localhost:3001`: `/play?byok=1` BYOK gate, `/play` SF2 setup/create/reload, `/play/v2` alias, `/play/v1` legacy route, and diagnostics copy controls all worked. Live Arc Author / Chapter Author model calls were not run with the smoke's dummy local BYOK key.

Implemented carry-over slices:

- `11-social-roll-modifier-advisories.md`: bring over origin as persistent social modifier, plus disposition/cohesion/origin based advantage/disadvantage advisories. This should be SF2-native and code-owned, not copied as V1 prompt prose.
- `12-sf2-setup-compiler-for-v1-hooks-and-playbooks.md`: let SF2 start from the existing V1 genre/origin/playbook/opening-hook data by compiling selections into `AuthorInputSeed`, while preserving the Arc Author -> Chapter Author -> Narrator flow.
- `13-passive-perception-equivalent.md`: add a modest SF2 passive awareness path. First slice uses classic passive Perception only, explicit passive-awareness cues, surface detail reveal only, and dynamic Narrator advisories. No hidden-answer reveal and no red-herring machinery.

Implemented migration boundary:

- `14-wire-public-play-route-to-sf2.md`: after the SF2 setup compiler lands, make `/play` use SF2 and keep `/play/v2` as a temporary alias/dev route. This is the public route flip that finalizes the V1 -> SF2 migration for normal play.

Explicitly not being restored now:

- Witness marks: late-game mechanic, not proven enough to carry into SF2 yet.
- Failed-investigation/red-herring machinery: current SF2 prompt defenses stay as-is, but no new system/validator is added unless playthroughs show the failure again.
- Roll drought / pacing pressure: observe more gameplays before restoring.
