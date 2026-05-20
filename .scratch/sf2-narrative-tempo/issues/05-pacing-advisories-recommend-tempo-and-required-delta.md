# Pacing Advisories Recommend Tempo and Required Delta

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / pacing / Narrator guidance

## What to build

Upgrade pacing advisories so they do not merely say that play is stagnant or arc-dormant. They should recommend a narrative tempo remedy and name the kind of concrete delta the next turn needs.

For example, an arc-dormancy advisory should be able to say: use `compression_turn` or `chapter_turn`, produce a new named fact or faction move, and do not restate the same procedural surface.

## Acceptance criteria

- [ ] Pacing advisory output can include `recommendedTempoMode`, `requiredDelta`, and `forbiddenRepeat` fields or equivalent rendered guidance.
- [ ] Stagnant-thread guidance recommends compression, resting the thread, or a concrete state change instead of another small obstacle.
- [ ] Arc-dormant guidance recommends re-engaging a constituent thread through `compression_turn` or `chapter_turn` when appropriate.
- [ ] Low-reactivity guidance can recommend a world-initiated tempo shift, not only "let an NPC act."
- [ ] Rendered Narrator guidance names forbidden repeats when they can be derived safely, such as "do not ask for another filing" or "do not restate the hold."
- [ ] Existing pacing event payload remains backward compatible for the client.
- [ ] Fixtures cover stagnant thread, arc dormant, low reactivity, and no-advisory cases.

## Blocked by

- [Deterministic Tempo Recommendation and Scene Exhaustion](02-deterministic-tempo-recommendation-and-scene-exhaustion.md)

## Implementation notes

Built 2026-05-20:

- Added `recommendedTempoMode`, `requiredDelta`, and `forbiddenRepeat` to pacing advisories.
- Rendered tempo remedies in private Narrator guidance and diagnostics payloads.
- Kept the client payload backward compatible while extending replay assertions.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/pacing/signals.ts`
- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- diagnostics event typing
- replay fixtures

Do not hard-block turns in this slice. The point is stronger private guidance and instrumentation.

## Out of scope

- Full Conductor.
- Automatic chapter transition.
- Evaluating prose quality subjectively.
