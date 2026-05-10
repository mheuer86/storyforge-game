# Procedure-Aware Chapter Transitions

Status: verified-built
Labels: verified-built
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Teach chapter close and next-chapter setup to respect active procedures. If an operation, access/infiltration, exploration, investigation, or combat procedure is unresolved at chapter close, Chapter Meaning and Chapter Author should carry it forward, resolve it, or explicitly reframe it. They should not treat the next chapter as unrelated escalation while the live procedure is still active.

This is the product answer to the Iron Veil granularity problem: SF2 does not need to preserve one huge chapter just because the benchmark transcript used one chapter heading. It needs to preserve the live procedure, its consequences, and its meaning across chapter boundaries when the dramatic unit spans multiple chapters.

## Definitions

- **Procedure residue** — what remains of a procedure after a chapter ends. Four categories:
  - `live` — procedure is unresolved and still load-bearing for the next chapter (e.g. operation in `preparation` phase, access/intrusion ongoing).
  - `background_constraint` — procedure resolved or paused but its consequences still gate next-chapter affordances (e.g. burned credential/mask, faction heat from prior access attempt, ward attention from castle infiltration, trace from network intrusion).
  - `leverage` — earned advantage or asset from a resolved procedure (e.g. archive data, NPC disposition shift, faction credit) that informs next-chapter setup.
  - `discarded_mechanism` — procedure mechanism is no longer relevant (egress complete, fight over, mystery solved); only narrative consequences carry forward.
- **Carry-forward** — next chapter continues the same procedure runtime as a live foreground concern. Chapter title and frame reflect the procedure's current phase.
- **Reframe** — next chapter promotes a successor pressure that is *related to* the procedure's outcome but is not the same procedure. Example: operation completed → next chapter is the political fallout.
- **Discard** — next chapter is unrelated to the procedure entirely. Only allowed when residue is `discarded_mechanism` with no live `background_constraint`.

## Carry-vs-reframe decision rule

At chapter close, for each procedure with non-discarded residue:

1. If `live`: next chapter **carries forward** the procedure as the foreground frame. Phase persists; runtime state persists.
2. If only `background_constraint` and/or `leverage` remain (no `live`): next chapter **reframes** to a successor pressure that interacts with those constraints/leverage.
3. If all residue is `discarded_mechanism`: chapter close treats the procedure as fully done; next chapter selection follows the normal Author logic.

A single chapter can carry forward at most one operation procedure as the foreground frame, with access, investigation, exploration, or combat as active child/overlay procedures when their state remains load-bearing.

## Acceptance criteria

- [ ] Chapter Meaning records procedure residue in the transition seed, classified into the four categories above.
- [ ] Carry-vs-reframe decision rule is implemented and observable in instrumentation.
- [ ] When residue is `live`: Chapter Author continues the procedure runtime; phase and procedure facts persist; chapter frame reflects the current phase.
- [ ] When residue is `background_constraint` and/or `leverage`: Chapter Author reframes to a successor pressure that interacts with the residue.
- [ ] When residue is fully `discarded_mechanism`: chapter close completes the procedure; next chapter selection runs normal Author logic.
- [ ] Chapter Author can split one operation across chapters such that already-resolved semantic phases (e.g. `orientation` already done) are not restaged.
- [ ] Chapter Author can introduce new NPCs or pressure points inside the carried-forward procedure without resetting procedure facts, complications, or active assessments.
- [ ] Anti-restaging rules still prevent replaying already-resolved beats *within* the carried procedure.
- [ ] Chapter close can fire at a natural dramatic beat (forward-motion contract, ticket 10) even when the broader operation remains live.
- [ ] At most one operation procedure may be the foreground frame in a chapter; access, investigation, exploration, and combat ride along as active child/overlay procedures when relevant.
- [ ] A replay fixture covers an operation in `preparation` phase at chapter close, carried forward as the next chapter's foreground frame, with phase and procedure facts intact.
- [ ] A replay fixture covers a completed operation (residue: `leverage` + `background_constraint`) producing a successor chapter (political fallout / consequence) rather than restaging the operation.
- [ ] A replay fixture covers a fully-discarded operation (residue: `discarded_mechanism` only) producing an unrelated next chapter via normal Author logic.
- [ ] A genre-neutral fixture covers carry-forward for a space-opera operation, grimdark castle infiltration, or cyberpunk intrusion using the same residue categories.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/01-operation-procedure-runtime-mvp.md
- .scratch/sf2-stateful-procedure-layer/issues/03-operation-linked-infiltration-runtime.md

## Implementation update - 2026-05-10

> *This was generated by AI during triage.*

Verified built as a procedure-transition support contract.

- Added `lib/sf2/procedure-transitions.ts` to classify procedure residue as `live`, `background_constraint`, `leverage`, or `discarded_mechanism`.
- Added carry-forward/reframe/discard decision logic and mapping back to existing chapter transition residue modes.
- Runner now asserts `expected.procedureTransitions`.
- Verified with `npm run build` and `npm run sf2:replay -- fixtures/sf2/replay/procedure-chapter-carry-forward.json`.
