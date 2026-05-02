# Chapter Pressure Runtime Module

Status: ready-for-agent
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: first active deepening slice. Ticket-level shape selected; ready for implementation with human oversight.

Ticket-level shaping: `.scratch/architecture-deepening/issues/01-chapter-pressure-runtime-shaping.md`

Selected ticket shape: **A: Runtime Facade Over Live Pressure Behavior**.

## What to build

Deepen SF2 chapter pressure into one runtime Module that owns ladder-fire acceptance, cooldown/cap rules, reheat, pressure-engine recompute, spine promotion, successor pressure, and close-readiness projection.

Today, pressure behavior is split across validation, pressure helpers, turn finalization, chapter close, and UI display. The UI and callers should consume a pressure projection; they should not need to know pressure mechanics.

Relevant files:

- `lib/sf2/pressure/runtime.ts`
- `lib/sf2/pressure/reheat.ts`
- `lib/sf2/validation/apply-patch.ts`
- `lib/sf2/runtime/turn-pipeline.ts`
- `lib/sf2/runtime/pressure-ladder.ts`
- `components/sf2/play-shell.tsx`

## Acceptance criteria

- [ ] There is a clear chapter pressure runtime Module with one public Interface for applying/deriving pressure state.
- [ ] Ladder fire cooldown, max-fires-per-turn, reheat, pressure-engine recompute, spine promotion, and successor-required notes are owned behind that Interface.
- [ ] Close readiness and UI pressure display consume a projection from the pressure Module instead of re-deriving pressure rules locally.
- [ ] The dead or hypothetical `lib/sf2/runtime/pressure-ladder.ts` seam is removed or folded into the live pressure Module.
- [ ] Existing SF2 replay fixtures for pressure, ladder cooldown, reheat, and close readiness still pass or are updated with intentional behavior changes.
- [ ] No prompt-only pressure rule is added where a code-derived signal can carry the responsibility.

## Blocked by

None - can start immediately.

## Comments

Architecture review note: this is the highest-priority deepening candidate because it sits directly on SF2's thesis that pacing and pressure should be computed, not improvised.
