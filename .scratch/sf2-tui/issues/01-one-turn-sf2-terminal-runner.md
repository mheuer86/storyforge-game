# One-Turn SF2 Terminal Runner

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / terminal runner / debug workflow

## What to build

Add the smallest useful SF2 terminal runner: a command that loads an SF2 state file, sends one player input through the same local Narrator endpoint used by `/play`, resolves any roll prompts automatically, commits the turn through the existing SF2 turn pipeline, calls Archivist, and writes the updated state plus one replay frame.

This is the tracer bullet for the whole TUI effort. It should prove the terminal can exercise the same Narrator-stream, roll-resume, Archivist, and commit contracts without touching browser UI behavior.

## Acceptance criteria

- [ ] A developer can run one SF2 turn from the terminal with a state file and player input.
- [ ] The command fails with a clear message when the local API server is unavailable.
- [ ] Narrator prose streams to stdout as text events arrive.
- [ ] Roll prompts are resolved without interactive input using an automatic roll mode.
- [ ] The turn commits through the existing SF2 turn pipeline and produces an updated state.
- [ ] The command writes a replay frame for the completed turn.
- [ ] Browser `/play` behavior and IndexedDB persistence are unchanged.

## Blocked by

None - can start immediately.

## User Stories Covered

- PRD stories 1, 2, 3, 4, 5, 6, 7, 21, 22, 29, 30.

## Agent Brief

This ticket should leave behind the first runnable terminal path. Optimize for a narrow, working tracer bullet over a beautiful CLI. The command can require `npm run dev` to be running and can require an existing state JSON file. It should not create new campaigns, run scripts, or implement an interactive loop.

## Current Surfaces To Inspect

- `package.json` for script naming conventions.
- `scripts/sf2-probe.cjs` and `scripts/sf2-probe.ts` for the current `jiti` wrapper pattern.
- `scripts/sf2-narrator-probe.ts` for local script conventions around SF2 state and model-facing flows.
- `components/sf2/play-app.tsx` for the current browser sequence: `runNarrator`, `runArchivist`, and `sendTurn`.
- `lib/sf2/runtime/client-turn-orchestrator.ts` for Narrator stream and roll-resume orchestration.
- `lib/sf2/runtime/turn-pipeline.ts` for `commitSf2Turn`.
- `lib/sf2/rolls/resolve.ts` for automatic roll resolution.
- `lib/sf2/persistence/normalize.ts` for loading persisted state safely.
- `app/api/sf2/narrator/route.ts` and `app/api/sf2/archivist/route.ts` for request/response contracts.

## Suggested Command Shape

```bash
npm run sf2:tui -- --state .scratch/example-state.json --once "I ask the inspector what she is hiding." --api http://localhost:3000
```

Optional flags can include `--out`, `--roll-mode auto`, and `--anthropic-key-env ANTHROPIC_API_KEY`. Keep required flags minimal.

## Implementation Notes

- Add a script entrypoint using the existing CommonJS wrapper plus TypeScript script pattern.
- Add the `sf2:tui` package script.
- Load the input state JSON and normalize it before use.
- Derive `turnIndex` from state history unless an existing TUI module introduced a stronger convention.
- Determine `isInitial` using the same current-chapter turn count rule used by the browser.
- Call the local Narrator endpoint through a small adapter passed into `runSf2ClientNarratorTurn`.
- Implement the effects callbacks by writing visible prose to stdout and collecting diagnostics in memory.
- Resolve roll prompts automatically with existing SF2 roll resolution code. Do not invent new roll math.
- Call the local Archivist endpoint through an adapter and pass it into `commitSf2Turn`.
- Write at minimum an updated state JSON and a replay frame JSON.
- Use plain Node APIs. Do not add a terminal UI dependency for this first slice.

## Verification

- `npm run sf2:tui -- --help` exits successfully and shows the required flags.
- With the dev server stopped, the command reports that the local API is unavailable.
- With a valid state and dev server, one turn completes, writes updated state, and writes a replay frame.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- Fresh campaign setup.
- Interactive terminal sessions.
- Scripted multi-turn runs.
- Pane-based TUI rendering.
- Direct Anthropic calls from Node.
