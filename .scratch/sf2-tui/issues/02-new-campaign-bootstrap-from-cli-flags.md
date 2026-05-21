# New Campaign Bootstrap From CLI Flags

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK
Area: SF2 / terminal runner / campaign setup

## What to build

Extend the terminal runner so it can create a fresh SF2 campaign from command-line setup flags instead of requiring an existing state file. The command should accept genre, origin, playbook, and opening hook choices, reuse the existing SF2 setup seed path, run the same Author-owned opening flow as the browser app, and leave behind a playable state for subsequent terminal turns.

The goal is not to recreate the setup wizard in terminal form. The goal is to make fresh debug runs easy and faithful to SF2 campaign bootstrap behavior.

## Acceptance criteria

- [ ] A developer can start a new campaign from terminal flags.
- [ ] The command validates setup options against existing SF2 setup data.
- [ ] Missing optional setup choices receive the same kind of safe defaults used by current setup code.
- [ ] The flow creates initial SF2 state through existing setup seed behavior.
- [ ] The flow runs the required Author-owned setup calls before the first Narrator turn.
- [ ] The resulting state can be used by the one-turn terminal runner.
- [ ] Setup failures are reported with role/source context.

## Blocked by

- [One-Turn SF2 Terminal Runner](01-one-turn-sf2-terminal-runner.md)

## User Stories Covered

- PRD stories 18, 19, 20, 21, 22, 27, 29.

## Agent Brief

This ticket should make fresh terminal playtests possible without the browser setup wizard. Reuse the current SF2 setup and Author flow. Do not design a new campaign-generation model path and do not bypass Author-owned chapter setup.

## Current Surfaces To Inspect

- `components/sf2/play-app.tsx` for `startNewCampaignSetup`, setup completion, `generateArcIfNeeded`, and `generateChapter1IfNeeded`.
- `lib/sf2/game-data.ts` for `createInitialSf2State`, `isArcAuthored`, and `isChapterAuthored`.
- `lib/sf2/setup/options.ts` for available setup choices.
- `lib/sf2/setup/compile-seed.ts` and `lib/sf2/setup/types.ts` for setup selection shape.
- `lib/sf2/author/chapter-opening.ts` for applying Author output.
- `app/api/sf2/arc-author/route.ts` and `app/api/sf2/author/route.ts` for local API request/response contracts.

## Suggested Command Shape

```bash
npm run sf2:tui -- --new --genre space-opera --origin frontier --playbook envoy --hook first-contact --api http://localhost:3000
```

Also consider:

```bash
npm run sf2:tui -- --list-setup-options
```

## Implementation Notes

- Validate CLI setup ids against the existing setup option lists.
- Provide conservative defaults when optional choices are omitted, matching current browser defaults where possible.
- Create initial state through existing SF2 state/setup helpers.
- If the current first-turn flow still requires Arc Author before Chapter Author, preserve that order.
- Apply Author output through the existing chapter-opening helper rather than mutating chapter fields manually.
- Persist the bootstrapped state to the same JSON persistence path used by the terminal runner.
- Make bootstrap usable both as a standalone command and as a prelude to `--once` if the one-turn runner already supports combined modes.
- Keep all setup failures source-labeled: setup validation, arc-author, author, local API, persistence.

## Verification

- `npm run sf2:tui -- --list-setup-options` prints valid setup ids.
- A fresh campaign can be created and saved without entering the browser.
- The saved state can be passed to the one-turn runner.
- Invalid setup ids fail with actionable messages.
- `npm run lint` passes or any lint limitation is documented in the issue comments.

## Out of Scope

- A full terminal setup wizard.
- New genres, origins, playbooks, or hooks.
- Changing Author prompt behavior.
- Supporting V1 campaign creation.
