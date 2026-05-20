# Hidden Tempo Annotation and Diagnostics

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / Narrator / diagnostics

## What to build

Add an optional hidden `tempo_mode` annotation to `narrate_turn` so diagnostics and replay exports can compare the recommended narrative tempo against what the Narrator says it chose.

This is for debugging and evaluation only. It must not appear in player-facing prose.

## Acceptance criteria

- [ ] `narrate_turn` accepts optional `tempo_mode` with the seven narrative tempo values.
- [ ] The Narrator prompt asks the model to choose the tempo silently and include it in `narrate_turn`, never in prose.
- [ ] History normalization preserves the chosen tempo in the compact narrator annotation or replay-safe metadata.
- [ ] The raw annotation remains backward compatible when older turns omit `tempo_mode`.
- [ ] Diagnostics record recommended tempo, chosen tempo, and whether they matched.
- [ ] Actor/firewall observation treats tempo annotation as within Narrator ownership.
- [ ] Fixtures cover annotation normalization, omission fallback, and a diagnostics event containing recommended vs chosen tempo.

## Blocked by

- [Deterministic Tempo Recommendation and Scene Exhaustion](02-deterministic-tempo-recommendation-and-scene-exhaustion.md)

## Implementation notes

Built 2026-05-20:

- Added optional `tempo_mode` and suggested-action tempo hints to the Narrator tool/schema path.
- Preserved tempo annotations in SF2 types, replay protocol parsing, and diagnostics events.
- Added `tempo_diagnostic` flow through the narrator route, client orchestrator, and diagnostics store.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/narrator/tools.ts`
- `lib/sf2/types.ts`
- `lib/sf2/runtime/turn-pipeline.ts`
- `lib/sf2/firewall/actor.ts`
- `app/api/sf2/narrator/route.ts`
- replay diagnostics fixtures

Make the field optional. Do not make this slice depend on perfect model compliance.

## Out of scope

- Showing tempo mode in the player UI.
- Blocking a turn because chosen tempo differs from recommended tempo.
- Reworking replay export format beyond the minimal metadata needed.
