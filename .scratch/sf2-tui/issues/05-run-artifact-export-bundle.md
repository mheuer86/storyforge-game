# Run Artifact Export Bundle

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / diagnostics / terminal runner

## What to build

Make every terminal run produce a durable local artifact bundle. Each run should have a stable run directory containing the final state, replay frames, diagnostics events, transcript, turn log, and a short markdown summary.

The artifact bundle should make terminal runs useful after the command exits and should be easy for agents, humans, and fixture tooling to inspect.

## Acceptance criteria

- [ ] Each terminal run writes artifacts to a unique, predictable run directory.
- [ ] The final SF2 state is written as JSON.
- [ ] Replay frames are written in a machine-readable form.
- [ ] Diagnostics events are written in a machine-readable form.
- [ ] A plain transcript captures player inputs, visible prose, roll prompts, and roll outcomes.
- [ ] A short markdown summary includes campaign id, chapter, turns run, errors, artifact paths, and notable diagnostics counts.
- [ ] Artifact writing works for one-turn, interactive, and scripted runs.

## Blocked by

- [Interactive TUI Session Loop](03-interactive-tui-session-loop.md)
- [Deterministic Scripted Run Mode](04-deterministic-scripted-run-mode.md)

## User Stories Covered

- PRD stories 8, 9, 10, 20, 23, 27, 28, 29.

## Agent Brief

This ticket makes terminal runs useful after they finish. Artifact writing should be boring, explicit, and stable. Favor appendable JSON/NDJSON and readable markdown over clever formats.

## Current Surfaces To Inspect

- The terminal runner state/diagnostic structures created by earlier tickets.
- `lib/sf2/runtime/turn-pipeline.ts` for replay frame shape.
- `lib/sf2/instrumentation/session-summary.ts` for possible summary data.
- Existing `.scratch/sf2-space-opera-*` run artifacts for examples of useful human-readable playtest output.
- Existing browser diagnostics export behavior in `components/sf2/play-app.tsx` and `components/sf2/play-shell.tsx`.

## Suggested Artifact Layout

```text
.scratch/sf2-tui/runs/<timestamp>-<campaign-id>/
  state.initial.json
  state.final.json
  replay-frames.json
  diagnostics.ndjson
  turns.json
  transcript.md
  summary.md
```

Add or rename files only if the implementation has a strong reason; keep paths documented in `summary.md`.

## Implementation Notes

- Create the run directory at session start, not only at the end, so partial runs leave evidence.
- Write the initial state before the first turn.
- Append or rewrite artifacts safely after each committed turn. Prefer not to lose the whole run if a late turn fails.
- Include failed-turn error details in diagnostics and summary even when no commit happens.
- `turns.json` should contain compact per-turn records: input, chapter, turn index, roll summaries, suggested actions, error if any, and artifact references.
- `transcript.md` should be pleasant to skim: player input, visible prose, rolls, and suggested actions.
- `summary.md` should name the command mode, state source/new setup, run duration, turns attempted, turns committed, final chapter, final scene, errors, and notable diagnostic counts.
- Keep raw replay frames machine-readable and do not trim fields needed for fixture extraction.

## Verification

- One-shot mode writes all required artifact files.
- Scripted mode writes all required artifact files for multiple turns.
- A failed run still leaves a summary and diagnostics file.
- Artifact paths are printed at the end of the command.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- Browser download/export changes.
- Uploading artifacts anywhere.
- Compressing or pruning long artifacts.
- Changing replay frame schema.
