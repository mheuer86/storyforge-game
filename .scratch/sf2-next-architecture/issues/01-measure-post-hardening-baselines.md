# Measure Post-Hardening Baselines (Recovery Rate, Roll Density, Gate Compliance)

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / instrumentation / prose-first prototype

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

Every scarcity decision in the PRD is conditioned on numbers measured *before* the hardening commits (`935675d`, `efe81a6`, `6677243`). Re-measure them so phase 1+ work targets real gaps, and make the measurements first-class sensors so they never go stale again.

Add to the session summary (`lib/sf2/instrumentation/session-summary.ts`) and diagnostics store (`lib/sf2/diagnostics-store.ts`), computed for prototype-path sessions:

- **Roll density**: rolls per player turn over the session and over a rolling 10-player-turn window; report against the band (floor 1/5, ceiling 1/2).
- **Gate compliance**: share of `expected` and `hard` gates that produced a `request_roll` (the 22% → 67% experiment figure, now continuously measured). Gate emissions are already logged as `roll_gate_diagnostic` entries.
- **Recovery rate**: `narrator_output_recovered` per narrator turn (the counter exists; surface it with a ≤ 10% band and per-repair-strategy breakdown).
- **Close-loop dwell**: consecutive turns spent in `close_candidate_or_plan` with no active blockers and no `close_intent` (from `prose_first_close_loop` diagnostics).

Also add a small script or replay-harness mode that computes these retroactively from an exported prototype session JSON, and run it against any session exports available in the repo, recording the results in this ticket's Comments.

## Acceptance criteria

- [ ] Session summary reports roll density (session + rolling window) with band pass/fail.
- [ ] Session summary reports gate compliance split by binding tier (advisory/expected/hard).
- [ ] Session summary reports recovery rate with per-strategy breakdown and a ≤ 10% band.
- [ ] Session summary reports max close-loop dwell (unblocked candidacy turns without close intent).
- [ ] A script (or `sf2:replay` mode) computes all four from an exported session JSON.
- [ ] No behavior changes to the narrator, gates, or close loop — measurement only.
- [ ] Sensors run for the prototype path; SF2 main path is unaffected.

## Blocked by

Nothing.
