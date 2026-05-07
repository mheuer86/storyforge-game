# Repeated-Beat Advisory Detects Stagnant Predicates Only

Status: needs-triage
Type: AFK
Area: SF2B / pacing guardrails / instrumentation

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Calibrate the SF2B repeated-beat advisory so it fires only on stagnant repeated predicates, not on active threads merely continuing to exist.

The first SF2B playthrough produced many repeated-beat advisories because the same active threads recurred across turns. That creates noisy private pressure and risks pushing the system back toward rigid procedural escalation.

## Acceptance criteria

- [ ] The detector distinguishes "same active thread remains relevant" from "same unresolved predicate repeated without material progress."
- [ ] Thread status alone is insufficient to trigger a repeated-beat advisory.
- [ ] The detector considers recent progress events, tension changes, scene movement, roll consequences, and new information before flagging stagnation.
- [ ] A repeated beat can still fire for clamp/release-code style waiting when no leverage, choice, time cut, or state change has occurred.
- [ ] A fixture covers the false-positive SF2B case where active job/route threads recur while the story is materially advancing.
- [ ] A fixture covers the true-positive v2 clamp-wait case.

## Blocked by

None - can start immediately.

## Out of scope

- Removing repeated-beat detection.
- Making subjective prose repetition fully automatic.
- Treating every recurring noun as a pacing failure.

## Comments

This guardrail should protect narration from stalls, not punish continuity.
