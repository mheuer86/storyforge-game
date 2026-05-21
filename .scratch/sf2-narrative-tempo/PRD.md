# SF2 Narrative Tempo Modes

Status: verified-built
Type: Planning artifact
Completed: 2026-05-20
Verification: `npm run sf2:replay -- fixtures/sf2/replay` (261/261), `npm run build`
Review: Low-thinking code review found and fixed expected-gate streaming/sentinel regressions plus over-broad resistance-save detection.

## Diagnosis

SF2's Narrator is tempo-monocultural. It is very good at close-up, coherent, state-bound beats, but its own prompt stack implicitly makes wide shots feel like bad behavior.

The current prompt rewards:

- one focused beat
- short prose
- no scene concatenation
- continuity inside the current scene
- one meaningful change per turn
- stopping at each live roll gate

Those rules are still correct for tense close play. The problem is that they currently dominate travel, investigation, aftermath, prep, downtime, and chapter movement too. The result is all close-ups and too few wide shots.

## Product Direction

Do not relax micro-scene rigor globally. Add a narrative tempo layer that tells the Narrator when the close-up rules apply and when a wider scale is required.

Existing `beatMode` should remain an activity/procedure classifier. Narrative tempo is a separate scale choice layered on top:

- `micro_scene`
- `compression_turn`
- `time_jump`
- `montage`
- `aftermath`
- `downtime`
- `chapter_turn`

A social beat can be either `micro_scene` or `compression_turn`. An exploration beat can become `time_jump`. An aftermath beat can stay intimate or bridge to a new scene.

## Guardrails

- `chapter_turn` does not give the Narrator ownership of chapter setup, chapter meaning, durable arc writes, or Author artifacts.
- Non-micro tempo may change multiple visible things, but durable state still comes through Narrator mechanical effects plus Archivist extraction and validation.
- Intentional compression is allowed; aimless "and then" concatenation is still forbidden.
- Scene exhaustion should be detected by repeated predicates with no material change, not by recurring nouns or active threads merely remaining relevant.
- Prompt changes must preserve streaming and roll pause behavior.

## Ticket Index

1. [Narrator Tempo Prompt Contract](issues/01-narrator-tempo-prompt-contract.md)
2. [Deterministic Tempo Recommendation and Scene Exhaustion](issues/02-deterministic-tempo-recommendation-and-scene-exhaustion.md)
3. [Tempo-Aware Suggested Actions](issues/03-tempo-aware-suggested-actions.md)
4. [Hidden Tempo Annotation and Diagnostics](issues/04-hidden-tempo-annotation-and-diagnostics.md)
5. [Pacing Advisories Recommend Tempo and Required Delta](issues/05-pacing-advisories-recommend-tempo-and-required-delta.md)
6. [Broad Goal Resolution Stays Goal-Scale](issues/06-broad-goal-resolution-stays-goal-scale.md)
7. [Narrative Tempo Metrics and Replay Guards](issues/07-narrative-tempo-metrics-and-replay-guards.md)
8. [Initial Campaign Setup Narrative Calibration Questions](issues/08-initial-campaign-setup-narrative-calibration-questions.md)
9. [Relax Roll Gate Tags for Freeform Play](issues/09-relax-roll-gate-tags-for-freeform-play.md)
10. [Quick Actions Offer Narrative Pacing Choices](issues/10-quick-actions-offer-narrative-pacing-choices.md)

## Deferred

The larger Conductor / Chapter Meaning / Owed Questions architecture remains plausible, but this milestone should land first. A Conductor will be easier to shape once the Narrator already understands narrative scale.

2026-05-21 refinement: the stronger next shape is GM handover briefs plus the V3 Story Surface/scope layer rather than a generic Conductor first. See `.scratch/sf2-gm-handover/` for the follow-up direction: setup and chapter close produce readable GM prep artifacts; those artifacts render into Current Story Surface, Owed Questions, embodied pressure, do-not-restage, and shadow scope telemetry; the Narrator opens from them behind reversible gates before Arc Author / Chapter Author are demoted. Roughdraft decisions: ask setup questions after hook selection, integrate handover compilation into Chapter Meaning first, keep the full handover available as reference/cached prep where useful, and use terminal-run artifacts as early evidence.
