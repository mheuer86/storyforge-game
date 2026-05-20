# Broad Goal Resolution Stays Goal-Scale

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / rolls / player intent

## What to build

Teach the Narrator and roll-gate guidance to resolve broad player goals at the scale of the goal, not by automatically reducing them to the next tiny physical step.

Examples of broad goals:

- "I investigate the registry."
- "I search for the hidden child."
- "I prepare the safehouse."
- "I get us through Orvyn's Gap."
- "I spend the next day following the lead."
- "I wait until morning."

If uncertainty matters, the system may still require a roll. The important change is what happens after the roll: success or failure should resolve the broad intent through compressed consequence, not stall at the first terminal, document, refusal, or checkpoint.

## Acceptance criteria

- [ ] Broad-goal intent is detected deterministically or rendered clearly in the per-turn delta.
- [ ] Roll-gate guidance for broad goals tells the Narrator to pause for one appropriate roll, then resolve at goal scale after the result returns.
- [ ] Failure guidance says important story failures usually mean progress arrives late, publicly, through the wrong person, at a cost, or after an antagonist move, not "nothing happens."
- [ ] Prompt guidance forbids converting broad goals into repeated document/request/check/refusal loops.
- [ ] A replay fixture asserts that broad-goal roll guidance includes "resolve at goal scale" or equivalent.
- [ ] A fixture covers a broad investigation input that should recommend `compression_turn`, not default micro-scene handling.
- [ ] Existing narrow actions still produce normal micro roll gates.

## Blocked by

- [Deterministic Tempo Recommendation and Scene Exhaustion](02-deterministic-tempo-recommendation-and-scene-exhaustion.md)

## Implementation notes

Built 2026-05-20:

- Biased broad investigation, travel, prep, wait, and skip intents toward goal-scale tempo recommendations.
- Updated roll-gate guidance so expected broad-goal rolls can fail forward instead of stalling at the first small obstacle.
- Covered broad-goal compression and expected roll-gate behavior with replay fixtures.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/action-resolver/resolve.ts`
- `lib/sf2/narrator/roll-gates.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/narrator/prompt/role.ts`
- replay fixtures

Be careful not to remove roll discipline. The goal is one meaningful gate for the broad action, not free progress.

## Out of scope

- Changing dice math.
- Bypassing skill-tag binding.
- Making broad goals always succeed.
- Adding live-model tests.
