# Shadow Story Surface And Scope Telemetry

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / diagnostics / narrative scope

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Add diagnostics-only telemetry that evaluates whether the handover-derived Story Surface is producing chapter-scale movement.

This is the V3 Conductor learning slice, but in shadow mode. Do not enforce scope shifts yet. Instead, derive and export signals that show whether the current scene is looping, whether owed questions moved, whether pressure was embodied, and whether a major delta or phase change happened in time.

Scope here means narrative scale: close micro play, sequence advance, montage, pivot scene, downtime/relationship scene, or chapter-level move. This ticket records recommendations only.

## Acceptance criteria

- [ ] Diagnostics include the Current Story Surface used for the turn or opening.
- [ ] Diagnostics include owed-question movement status: touched, sharpened, answered, deferred-with-cost, or untouched.
- [ ] Diagnostics include repeated-procedure / scene-exhaustion signals such as repeated nouns, repeated obstacle, turns since concrete delta, and recommended scope shift.
- [ ] Diagnostics include pressure-embodiment status for pressure advances: who pays / what hurts / visible image present or missing.
- [ ] Diagnostics include any divergence between the Story Surface/handover and structured state, with structured state marked authoritative for hard facts.
- [ ] Diagnostics include chapter motion status: candidate major deltas, whether one has landed, and whether the chapter is at risk of zero advancement after 8-12 turns.
- [ ] Shadow scope recommendations are recorded but do not change Narrator behavior yet.
- [ ] Replay/helper coverage proves the telemetry fires for a procedural-loop fixture and stays quiet for a scene with concrete delta.

## Blocked by

- 01-campaign-setup-produces-start-brief.md
- 03-compile-chapter-close-gm-handover.md
