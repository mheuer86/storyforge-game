# Tempo-Aware Suggested Actions

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / Narrator / suggested actions

## What to build

Make suggested actions respect narrative tempo so the UI stops pulling the player back into tiny "ask / inspect / press / check" loops after the system has identified broad intent or scene exhaustion.

When the recommended tempo is non-micro, at least one suggested action should invite macro-intent: compressing routine steps, traveling, waiting for a consequence, following a lead, shifting venue, moving the plan forward, or choosing which consequence to accept.

## Acceptance criteria

- [ ] Narrator prompt guidance tells the model to produce tempo-aware suggested actions.
- [ ] In `micro_scene`, suggested actions remain concrete immediate moves.
- [ ] In `compression_turn`, `time_jump`, `montage`, `aftermath`, `downtime`, or `chapter_turn`, at least one suggested action may be a broader verb phrase that advances time, accepts a cost, follows a lead, changes venue, or moves to the next live situation.
- [ ] Broad suggested actions still obey the grounding rule: they may only reference people, places, facts, and pressures that have been shown or made legible in player-facing prose.
- [ ] Deterministic quick-action repair does not strip useful macro actions just because they lack skill tags.
- [ ] When scene exhaustion is detected and all model actions are micro-actions, deterministic repair can replace one with a safe macro fallback.
- [ ] Fixtures cover a non-micro recommendation producing or repairing at least one macro action, and a micro-scene recommendation preserving immediate actions.

## Blocked by

- [Deterministic Tempo Recommendation and Scene Exhaustion](02-deterministic-tempo-recommendation-and-scene-exhaustion.md)

## Implementation notes

Built 2026-05-20:

- Updated Narrator prompt guidance for tempo-aware suggested actions.
- Added deterministic macro fallback repair in `lib/sf2/narrator/suggested-actions.ts`.
- Covered non-micro repair with `fixtures/sf2/replay/quick-actions-tempo-macro-fallback.json`.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/narrator/prompt/role.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/narrator/suggested-actions.ts`
- route repair/salvage path in `app/api/sf2/narrator/route.ts`

Use existing quick-action repair patterns. Avoid inventing unseen NPCs, locations, or secret facts.

## Out of scope

- Redesigning suggested actions UI.
- Adding a visible "macro action" category to the client.
- Forcing all actions to be broad in non-micro tempo.
