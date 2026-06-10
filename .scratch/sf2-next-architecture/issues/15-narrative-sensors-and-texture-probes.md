# Narrative Sensors: Scene Cadence, Complication Distribution, Texture-Survival Probes

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / instrumentation / evaluation

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

The reliability sensors exist; the narrative sensors mostly do not (prompt: Validation and Evaluation Requirements). Build them as offline analyzers over exported session JSON first (same harness as issue 01's script), promoting to live session-summary entries where cheap:

- **Scene-end cadence**: scenes per N turns with bands, from scene boundaries in session data (live-capable).
- **Complication-type distribution**: classify each failed-roll consequence and antagonist move as procedural / physical / interpersonal / resource — a Haiku classification pass over the turn log (offline). Subsumes the forbidden-repeat pacing signal as the live cheap proxy; document the mapping.
- **Speaking-roles breadth**: named characters with dialogue per chapter, split by social rank/role breadth (Haiku pass, offline).
- **Time-to-emotional-core**: turns until the scenario's designed emotional payload is on screen. Requires briefs to declare their payload: add an optional GM-private `emotional_core` marker line to the brief format and the six reference briefs; the probe (Haiku, offline) finds the first turn whose prose puts it on screen.
- **Texture-survival score**: at chapter close, sample 5 non-plot texture facts from the transcript (Haiku selection pass: sensory details, relationship microsignals, charged objects), persist them with the chapter artifacts. In chapter 2+, an offline probe replays a contextually inviting prompt against the chapter-2 context and scores whether each texture fact can be paid off unprompted (Haiku judge, rubric in the analyzer). Score = survivals/5.

All analyzers output one JSON report per session compatible with the same-seed A/B harness (issue 16). Free-lunch rate and roll-density band come from issues 03/01 — do not duplicate.

## Acceptance criteria

- [ ] Offline analyzer CLI takes a session export and emits the five sensors above as one JSON report.
- [ ] Scene-end cadence also lands in the live session summary.
- [ ] Brief format and the reference briefs gain a GM-private `emotional_core` marker; the loader exposes it to analyzers only (never to player UI).
- [ ] Texture facts are sampled and persisted at chapter close; the survival probe scores chapter 2+ sessions automatically.
- [ ] Classification/judge passes run on Haiku with bounded inputs; per-analysis cost logged.
- [ ] Analyzer report schema documented in this directory for issue 16 to consume.

## Blocked by

Nothing (texture-survival's chapter-2 probe needs sessions from issue 09 to exist, but the analyzer itself is buildable and testable on fixtures now).
