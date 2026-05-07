# Continuity-Locked Chapter 2 Evaluation Gate

Status: needs-triage
Type: HITL
Area: SF2B / evaluation / product decision

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Run and review a new Forty Thousand Chapter 1 -> Chapter 2 playtest after the continuity-locked iteration lands.

This ticket decides whether the hybrid is worth continuing: SF2B narrator freedom, SF2-style hook + tension scoring, hard continuity lock, and objective-aware close/reframe behavior.

## Acceptance criteria

- [ ] A fresh SF2B playthrough reaches Chapter 2 from the same campaign id and exports as `runtimeMode: "sf2b"`.
- [ ] The Chapter 2 opening preserves the exact Chapter 1 continuity or explicitly bridges every major change.
- [ ] The opening contains a live social/faction/relational pressure surface, not just passive transit procedure.
- [ ] The Author emits a tension score with 3-4 distinct pressure lines, and play visibly draws on at least two of them without exposing the score as a checklist.
- [ ] The unresolved tail/cutter pressure is honored, transformed, or intentionally backgrounded with a state-visible reason.
- [ ] The chapter closes or reframes when the authored objective is resolved.
- [ ] The evaluation compares the result against the disconnected strong SF2 Chapter 2 and the prior SF2B Chapter 1.
- [ ] The decision is recorded: promote this hybrid direction, iterate once more, or fold only selected fixes back into SF2.

## Blocked by

- [SF2B Author Emits a Hook + Chapter Tension Score](03-sf2b-author-adopts-the-strong-sf2-v1-hook-ingredients.md)
- [Objective-Resolved Close and Reframe Gate](04-objective-resolved-close-and-reframe-gate.md)
- [Thread Resolution and Carry-Forward Contracts](05-thread-resolution-and-carry-forward-contracts.md)
- [Player Skill Tags Bind Roll Requests Deterministically](06-player-skill-tags-bind-roll-requests-deterministically.md)
- [Repeated-Beat Advisory Detects Stagnant Predicates Only](07-repeated-beat-advisory-detects-stagnant-predicates-only.md)

## Out of scope

- Implementing the resulting decision.
- Declaring success based on architecture alone.
- Expanding the evaluation to every genre.

## Comments

This is intentionally HITL because the deciding question is product taste plus architectural evidence: did this make the game better?
