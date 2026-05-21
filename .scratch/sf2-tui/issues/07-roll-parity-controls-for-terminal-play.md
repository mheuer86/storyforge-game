# Roll Parity Controls For Terminal Play

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / rolls / terminal runner

## What to build

Improve terminal roll handling so debugging can deliberately exercise roll branches while preserving SF2 roll-record parity. The terminal should support manual roll entry, automatic random rolls, seeded deterministic rolls, and selection of available roll actions where the current state supports them.

This slice makes terminal play better for mechanic-specific debugging, especially success/failure and resource-spend branches.

## Acceptance criteria

- [ ] Manual roll mode lets a developer enter a d20 result when a roll prompt appears.
- [ ] Automatic random roll mode resolves prompts without user input.
- [ ] Seeded roll mode remains deterministic for repeated scripted runs.
- [ ] The terminal displays skill, DC, modifier, total, result, and consequence-on-fail.
- [ ] Available roll actions can be selected when present.
- [ ] Inspiration or roll-resource spends are handled through the same state update path as the browser flow where supported.
- [ ] Persisted roll records match the terminal-displayed roll outcome.

## Blocked by

- [Interactive TUI Session Loop](03-interactive-tui-session-loop.md)

## User Stories Covered

- PRD stories 12, 13, 14, 15, 20, 29.

## Agent Brief

This ticket improves roll fidelity after the basic terminal loop exists. The terminal should expose the same meaningful roll choices as the browser where possible, but it must not fork the rules engine. The source of truth stays in existing SF2 roll code.

## Current Surfaces To Inspect

- `lib/sf2/rolls/resolve.ts` for current roll resolution and resource-spend application.
- `lib/sf2/runtime/client-turn-orchestrator.ts` for `Sf2ClientPendingCheck` and `Sf2ClientRollOutcome`.
- `components/sf2/play-app.tsx` for current browser roll modal handlers and selected roll action behavior.
- `components/sf2/play-shell.tsx` for the browser roll view, only as a reference for visible fields.
- Existing terminal runner roll resolver from tickets 01 and 04.

## Suggested CLI Flags

```bash
--roll-mode auto
--roll-mode seeded --seed 12345
--roll-mode manual
```

If action selection is implemented through flags for scripted mode, prefer an explicit documented shape over hidden prompts.

## Implementation Notes

- Keep a roll resolver interface shared by one-shot, interactive, and scripted modes.
- In manual mode, prompt for d20 value only when a roll prompt arrives.
- In seeded mode, generate d20 values from the run seed and record the generated raw value.
- In auto mode, use random d20 values unless earlier tickets defined `auto` differently.
- Display the same core roll facts in every mode: skill, DC, effective DC if different, modifier, total, result, consequence-on-fail, selected action, and resource spends.
- If current state offers selectable roll actions, list them in interactive/manual mode and pass the chosen action id into existing roll resolution.
- Handle inspiration and roll-resource spends through the same outcome fields already used by `runSf2ClientNarratorTurn`.
- Store roll mode and selected action in diagnostics/artifacts so later fixture extraction can explain the persisted roll record.

## Verification

- Manual mode can force failure and success branches by entering different d20 values.
- Seeded mode produces stable d20 values across repeated scripted runs.
- Selected roll action, inspiration spend, and resource spend behavior matches browser roll records where supported.
- Terminal-displayed roll summaries match the roll records persisted in state/replay artifacts.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- New roll mechanics.
- Changing DC/modifier computation.
- Adding new player resources.
- Making model output deterministic.
