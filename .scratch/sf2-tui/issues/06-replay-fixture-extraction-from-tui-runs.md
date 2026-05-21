# Replay Fixture Extraction From TUI Runs

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / replay fixtures / terminal runner

## What to build

Add a command that converts a selected terminal run turn into an SF2 replay fixture. It should consume the terminal run artifact bundle, select a turn by index or artifact identifier, and write a focused fixture compatible with the existing SF2 replay runner.

The workflow should make it cheap to turn a terminal-discovered bug into deterministic regression coverage.

## Acceptance criteria

- [ ] A developer can select a turn from a terminal run artifact bundle and create a replay fixture.
- [ ] The generated fixture uses the existing SF2 replay fixture schema.
- [ ] The fixture includes the relevant state before, player input, Narrator output, annotation, roll records, and Archivist patch data when available.
- [ ] The command reports the output fixture path.
- [ ] The generated fixture can be run by the existing SF2 replay command.
- [ ] Documentation explains when to use this path versus the existing browser diagnostics export path.

## Blocked by

- [Run Artifact Export Bundle](05-run-artifact-export-bundle.md)

## User Stories Covered

- PRD stories 7, 24, 25, 26, 29.

## Agent Brief

This ticket connects terminal playtest evidence back into the existing deterministic regression harness. The output should feel like a sibling of the current fixture-transform workflow, not a separate test universe.

## Current Surfaces To Inspect

- `scripts/sf2-transform-fixture.mjs` for existing replay fixture conversion behavior.
- `scripts/sf2-replay.ts` and `scripts/sf2-replay.cjs` for fixture schema and runner expectations.
- `fixtures/sf2/replay/*.json` for current fixture examples.
- `lib/sf2/runtime/turn-pipeline.ts` for replay frame shape.
- The artifact bundle shape created by ticket 05.

## Suggested Command Shape

```bash
npm run sf2:tui:fixture -- --run .scratch/sf2-tui/runs/20260520-example --turn 3 --name npc-anchor-drift
```

Output should default to:

```text
fixtures/sf2/replay/<name>.json
```

Use an overwrite flag if overwriting is supported.

## Implementation Notes

- Add a dedicated command or a subcommand on the TUI script, whichever fits the landed CLI shape.
- Read the selected replay frame from the run artifact bundle.
- Preserve the existing `sf2-replay-fixture/v1` schema.
- Include `stateBefore`, `playerInput`, `isInitial`, Narrator prose, annotation, mechanical effects, roll records, and Archivist patch data when present.
- Start with a faithful fixture; do not over-trim unless the existing transform utility already has a safe trim path to reuse.
- Print the exact command to run the generated fixture.
- Add short docs or help text explaining this path versus browser diagnostics export and `npm run sf2:fixture`.

## Verification

- The command generates a fixture from a known run artifact.
- `npm run sf2:replay -- fixtures/sf2/replay/<generated>.json` runs against the generated fixture.
- Missing run directories, missing turn indexes, and existing output files fail clearly.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- Auto-minimizing fixtures.
- Creating expected assertions automatically for every bug.
- Modifying the replay runner schema.
- Replacing the browser diagnostics fixture export.
