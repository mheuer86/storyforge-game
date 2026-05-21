# Exercise Brief Flow Through Terminal Runner

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / terminal runner / GM handover validation

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Use the SF2 terminal-runner plan as the first practical test harness for brief-driven openings and chapter-close handover generation.

The browser remains the real player surface, but the handover path needs fast iteration: generate a campaign or load a fixture state, compile a start or next-session handover, run the Narrator opening from that handover, and write artifacts that can be inspected or converted into replay fixtures. This slice connects the GM handover work to `.scratch/sf2-tui/` instead of requiring every experiment to go through the browser UI.

## Acceptance criteria

- [ ] Terminal runner docs or command help describe how to run a handover-driven campaign start or chapter transition once the relevant gates exist.
- [ ] A terminal/debug path can generate or load a first-session handover and show the rendered Current Story Surface before the Narrator call.
- [ ] A terminal/debug path can generate or load a chapter-close handover from a state/replay fixture and write the handover artifact to the run bundle.
- [ ] Terminal artifacts include the handover, Current Story Surface, owed questions, embodied pressure, do-not-restage list, shadow scope telemetry, and final Narrator output where available.
- [ ] The path can be used without changing browser `/play` behavior.
- [ ] The path produces enough artifact data to compare brief-driven opening against the current Author path.
- [ ] Documentation links this workflow to `.scratch/sf2-tui/` and explains when to use terminal runs versus browser play or replay fixtures.

## Blocked by

- `.scratch/sf2-tui/issues/01-one-turn-sf2-terminal-runner.md`
- `.scratch/sf2-tui/issues/05-run-artifact-export-bundle.md`
- 01-campaign-setup-produces-start-brief.md
- 03-compile-chapter-close-gm-handover.md
