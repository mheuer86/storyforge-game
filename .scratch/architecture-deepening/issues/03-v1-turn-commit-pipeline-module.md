# V1 Turn Commit Pipeline Module

Status: needs-triage
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: deferred V1 safety slice. Keep discoverable, but do not shape next unless active work touches V1 turn commits, streaming event finalization, scene summaries, or save-shape regressions.

## What to build

Deepen V1 turn commit finalization so one Module owns "apply tool results and finalize this turn": state mutation, GM history append, scene summary persistence, scope signals, rules-engine invocation, stat changes, debug drain, and one-shot flags.

Today, commit application and turn finalization are split between the tool processor, stream parser, narrative handler, rules engine, and roll continuation path. That weakens Locality around what exactly happens when a turn commits.

Relevant files:

- `lib/tool-processor.ts`
- `lib/stream-parser.ts`
- `lib/tool-handlers/narrative.ts`
- `lib/rules-engine.ts`
- `components/game/game-screen.tsx`

## Acceptance criteria

- [ ] A single V1 commit pipeline Module owns turn finalization after `commit_turn` tools are applied.
- [ ] The pipeline handles GM history append, scene summaries, scope signals, rules warnings, `_pendingSceneSummary`, `_objectiveResolvedAtTurn`, and stat chips consistently.
- [ ] Roll-resolution turns pass their roll context through the same pipeline rather than running a separate rules-engine ceremony.
- [ ] Scene summaries are not duplicated between tool-handler and parser finalization paths.
- [ ] Focused fixtures cover normal turn, roll-resolution turn, scene boundary, missing `commit_turn`, and objective-resolved turn.
- [ ] Streaming event timing and player-facing text cadence are unchanged.

## Blocked by

None - can start immediately. Deferred by selected-shape sequencing.

## Comments

Architecture review note: `applyToolResults` has Depth, but the real missing Depth is one layer higher: the turn commit seam.
