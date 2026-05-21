# Retire Author Waits After Brief Path Proves Out

Status: ready-for-human
Labels: ready-for-human
Type: HITL
Area: SF2 / architecture / role pipeline

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to decide

Decide whether Arc Author and Chapter Author should be removed, demoted to fallback/debug-only paths, or retained for specific scenarios after the brief-driven setup and transition paths have real evidence.

This is deliberately a decision ticket, not an implementation ticket. The risky part is not deleting code; it is deciding whether the GM handover + Narrator + Archivist loop now carries enough structure to replace hidden authoring waits without regressing chapter coherence.

## Acceptance criteria

- [ ] Compare at least one campaign start and one cross-chapter transition through the brief path against the old Author path.
- [ ] Include at least one terminal-run artifact bundle in the comparison, so the decision is based on repeatable evidence and not only browser feel.
- [ ] Review diagnostics for latency, continuity corrections, rejected patches, display leaks, unresolved pressure, story-surface quality, owed-question movement, scene-exhaustion signals, major-delta movement, and player-visible setup feel.
- [ ] Decide the future role of Arc Author: remove, fallback-only, or keep for multi-chapter arc planning.
- [ ] Decide the future role of Chapter Author: remove, fallback-only, or keep for specific chapter types.
- [ ] If removal/demotion is approved, create AFK implementation tickets with concrete migration and fallback steps.
- [ ] If removal/demotion is rejected, update the GM handover PRD with the narrower supported role.

## Blocked by

- 02-feed-start-brief-to-narrator-chapter-1.md
- 04-feed-session-brief-to-narrator-continuation.md
- 05-shadow-story-surface-and-scope-telemetry.md
- 06-exercise-brief-flow-through-terminal-runner.md
