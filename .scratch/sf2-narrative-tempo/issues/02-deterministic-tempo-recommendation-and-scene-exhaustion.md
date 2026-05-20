# Deterministic Tempo Recommendation and Scene Exhaustion

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / pacing / scene packet

## What to build

Add a deterministic narrative tempo recommendation layer that sits beside existing `beatMode`.

`beatMode` remains the activity/procedure classifier. The new recommendation chooses the scale of narration for the current turn using player intent, existing beat mode, pacing signals, recent material change, and scene exhaustion.

The recommendation should be rendered into the Narrator's per-turn delta as private guidance. It should never be shown to the player.

## Acceptance criteria

- [ ] A pure helper derives a recommended narrative tempo from state, player input, current `beatMode`, and recent turn context.
- [ ] The helper can recommend at least `micro_scene`, `compression_turn`, `time_jump`, `montage`, `aftermath`, `downtime`, and `chapter_turn`.
- [ ] Broad player intents such as "investigate", "prepare", "travel", "wait until morning", "follow the lead", "skip ahead", and "spend the day" bias away from `micro_scene` unless there is a live embodied confrontation.
- [ ] Scene exhaustion is detected from repeated predicates with no material change, not from recurring thread/entity names alone.
- [ ] Active exploration no longer prevents explicit montage/time-jump intent from being recognized when the player clearly asks to travel, skip, wait, or compress routine steps.
- [ ] The per-turn delta renders the recommendation with a short reason and a concrete remedy such as "compress repeated steps and land at the next changed situation."
- [ ] Fixtures cover: explicit travel/skip input, repeated same procedural surface, broad investigation input, recent aftermath, and a genuine live micro-scene that should remain `micro_scene`.

## Blocked by

- [Narrator Tempo Prompt Contract](01-narrator-tempo-prompt-contract.md)

## Implementation notes

Built 2026-05-20:

- Added the pure tempo recommendation layer in `lib/sf2/narrative-tempo.ts`.
- Rendered tempo guidance through the scene packet and per-turn delta.
- Covered broad-goal compression and repeated procedural surface behavior with replay fixtures.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/beat-mode.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/retrieval/packets/mechanics.ts`
- a new helper near pacing or narrator prompt code
- `fixtures/sf2/replay/*.json`

Prefer pure helper tests via replay fixtures. Do not depend on live Anthropic calls.

## Out of scope

- Persisting the chosen tempo mode.
- Adding player-visible UI.
- Enforcing tempo mechanically.
- Building full metrics.
