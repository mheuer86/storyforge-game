# Player Skill Tags Bind Roll Requests Deterministically

Status: needs-triage
Type: AFK
Area: SF2B / rolls / player intent

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Enforce player-selected skill tags at the code boundary so the Narrator cannot silently request a different skill.

The motivating failure is the SF2B Chapter 1 turn where the player selected `[Persuasion]` but the Narrator requested an `Insight` roll. This is not a prose calibration issue; it is a contract violation between player intent, suggested actions, and roll mechanics.

## Acceptance criteria

- [ ] Player input skill tags are parsed into an explicit intended skill before the Narrator roll request is accepted.
- [ ] If the Narrator requests a different skill, code either overrides to the tagged skill, retries with a repair instruction, or rejects the roll request with a logged invariant.
- [ ] Suggested actions with tags preserve the same binding path as manually typed tags.
- [ ] The roll log records both the intended skill and any repair/override decision.
- [ ] A fixture covers `[Persuasion]` input producing a Persuasion roll even when the model attempts Insight.
- [ ] Untagged player actions still allow normal Narrator skill selection.

## Blocked by

None - can start immediately.

## Out of scope

- Changing dice math.
- Removing Narrator discretion for untagged actions.
- Redesigning suggested actions.

## Comments

This is a small but important agency contract. The player should never feel that the UI offered a move and the GM quietly changed the move.
