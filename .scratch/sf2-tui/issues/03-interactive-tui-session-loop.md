# Interactive TUI Session Loop

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / terminal runner / interactive play

## What to build

Add an interactive terminal session loop for live SF2 debugging. The loop should accept free-text player turns, stream Narrator prose, handle roll prompts, commit each turn, keep current state in memory, and expose a small command set for inspecting and saving the run.

Keep the first implementation plain and log-friendly. A pane-based terminal UI is not required for this slice.

## Acceptance criteria

- [ ] A developer can start an interactive terminal session from an existing state or fresh campaign.
- [ ] Free-text input runs a normal SF2 turn and updates the session state.
- [ ] The session displays suggested actions after each completed turn.
- [ ] The session supports commands for state, actions, debug, save, help, and quit.
- [ ] The session writes state on explicit save and on clean quit.
- [ ] Roll prompts are visible in the terminal and can be resolved without the browser.
- [ ] Errors leave the session in a clear recoverable state when possible.

## Blocked by

- [One-Turn SF2 Terminal Runner](01-one-turn-sf2-terminal-runner.md)
- [New Campaign Bootstrap From CLI Flags](02-new-campaign-bootstrap-from-cli-flags.md)

## User Stories Covered

- PRD stories 1, 4, 6, 13, 16, 17, 20, 28, 30.

## Agent Brief

This ticket turns the one-turn runner into a usable live debug shell. Keep it simple: a readline loop is enough. The value is low-friction iteration and command access, not terminal layout polish.

## Current Surfaces To Inspect

- The terminal runner module and script created by tickets 01 and 02.
- `components/sf2/play-app.tsx` for how browser state is updated after each turn.
- `lib/sf2/runtime/client-turn-orchestrator.ts` for pending roll behavior.
- `lib/sf2/pressure/runtime.ts` for chapter close/readiness summaries if a state command wants to show them.
- `lib/sf2/instrumentation/session-summary.ts` for possible debug/session summaries.

## Suggested Command Shape

```bash
npm run sf2:tui -- --state .scratch/sf2-tui/runs/example/state.final.json --interactive
npm run sf2:tui -- --new --genre fantasy --playbook seeker --interactive
```

Initial command set:

- `/help`
- `/state`
- `/actions`
- `/debug`
- `/save`
- `/quit`

## Implementation Notes

- Use Node readline or readline/promises. Do not add Ink, blessed, or other pane UI dependencies in this slice.
- Keep current state in memory and update it only after a turn commits.
- Show a concise prompt that includes chapter and turn number.
- Treat non-slash input as player input.
- Display suggested actions from the latest Narrator annotation after each committed turn.
- `/state` should show high-signal information: campaign id, genre, chapter, current scene/location, HP, inspiration, credits, objective, active threads, and present NPCs if available.
- `/debug` should show recent diagnostic counts and the last few source-labeled errors or invariant events.
- `/save` should write state through the terminal persistence path.
- `/quit` should offer a clean save-or-exit path, or save by default if the prior ticket established auto-save.
- Preserve recoverability: if Narrator fails before commit, keep the previous state and return to the prompt with the failed input visible.

## Verification

- Interactive mode starts from an existing state and accepts at least one free-text turn.
- `/help`, `/state`, `/actions`, `/debug`, `/save`, and `/quit` work.
- A Narrator or Archivist error does not corrupt the in-memory state.
- The saved state after interactive play can be loaded by the one-turn runner.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- Rich terminal panes.
- Keyboard shortcuts beyond slash commands.
- Chapter close automation.
- AI-generated player actions.
