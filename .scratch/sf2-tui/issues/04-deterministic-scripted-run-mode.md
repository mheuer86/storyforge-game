# Deterministic Scripted Run Mode

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / terminal runner / scripted playtests

## What to build

Add scripted run mode for unattended SF2 playtest runs. The command should read player inputs from a text file, execute up to a configured turn limit, resolve rolls through deterministic or automatic roll mode, and stop cleanly on end-of-file, turn limit, or unrecoverable role error.

This slice makes the terminal runner useful for repeated debugging and agent-driven evidence gathering.

## Acceptance criteria

- [ ] A developer can run a script file of player turns from the terminal.
- [ ] The command supports a maximum turn limit.
- [ ] The command supports seeded deterministic rolls.
- [ ] Running the same state, script, and seed produces the same local roll outcomes.
- [ ] The command reports which script line or turn failed when a role error occurs.
- [ ] The command can run without waiting for human input.
- [ ] Scripted mode preserves the same state commit behavior as interactive mode.

## Blocked by

- [One-Turn SF2 Terminal Runner](01-one-turn-sf2-terminal-runner.md)

## User Stories Covered

- PRD stories 7, 8, 11, 12, 14, 20, 21, 27, 29.

## Agent Brief

This ticket makes terminal runs repeatable and AFK-friendly. The important behavior is that the runner can consume a file of player inputs, run without waiting for interaction, and record enough metadata to compare runs.

## Current Surfaces To Inspect

- The terminal runner module and script created by ticket 01.
- The interactive input path created by ticket 03, if already landed.
- `lib/sf2/rolls/resolve.ts` for preserving roll math while controlling d20 values.
- Existing SF2 replay/probe scripts for deterministic script argument style.

## Suggested Command Shape

```bash
npm run sf2:tui -- --state .scratch/example-state.json --script .scratch/test-runs/heist.txt --turns 12 --seed 12345 --roll-mode seeded
```

Suggested script file format:

```text
I ask Mara what changed since the last inspection.
I examine the lockbox without touching it.
I offer to trade my favor for the ledger name.
```

Blank lines may be ignored. If comments are supported, document the comment syntax in `--help`.

## Implementation Notes

- Scripted mode should share the same turn-running engine as one-shot and interactive modes.
- Track the source line for each player input so failures can point to line and turn number.
- Add a small deterministic PRNG for seeded d20 values or a stable equivalent. Do not depend on platform-random output when `--seed` is set.
- Store seed, roll mode, script path, and turn limit in run metadata.
- Stop conditions should be explicit: end of file, turn limit, user/configured stop command if supported, unrecoverable role error.
- If a role call fails before commit, do not advance to the next scripted input.
- The command should exit non-zero for unrecoverable failures and zero for clean end-of-file or turn-limit completion.

## Verification

- A small two-line script runs without terminal input.
- The same state, script, seed, and roll mode produce the same local d20 sequence.
- A missing script file fails clearly.
- A role failure reports script line and turn index.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- AI player action selection.
- Branching script language.
- Assertions inside script files.
- Full deterministic model output. Only local roll choices are deterministic.
