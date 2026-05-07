# Objective-Resolved Close and Reframe Gate

Status: needs-triage
Type: AFK
Area: SF2B / pacing / chapter close

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Replace reliance on a chapter upper bound with a code-derived close/reframe gate when the chapter foreground objective has been resolved, failed, or displaced by a new dominant tension.

The motivating failure is the strong SF2 Chapter 2: the checkpoint objective resolved around the middle of the chapter, but play continued into arrival, receiver negotiation, trolley transfer, and a late critical-failure complication. That later situation may be interesting, but it belonged to a reframed chapter or the next chapter, not to the checkpoint objective after it was already answered.

## Acceptance criteria

- [ ] SF2B computes whether the current chapter foreground objective has been resolved, failed, or transformed using thread gates, pressure ladder state, chapter setup, and the tension score.
- [ ] When objective resolution is detected, the Narrator receives a strong close-or-reframe directive within the next turn.
- [ ] If an undertow tension becomes the new dominant dramatic question after objective resolution, the system records it as a reframe candidate instead of silently extending the old chapter.
- [ ] Close/reframe guidance names which tension was answered and which tension, if any, now deserves foreground status.
- [ ] The upper-bound turn target remains advisory; it does not force play to continue after the objective is done.
- [ ] A fixture covers the checkpoint-style case: once `Clear the checkpoint` is satisfied, handoff logistics must be close/reframe material rather than extra runway.
- [ ] A fixture covers the opposite case: unresolved objective pressure is not prematurely closed just because the target turn range has been reached.

## Blocked by

- [Chapter Author Uses a Canon Continuity Lock](02-chapter-author-uses-a-canon-continuity-lock.md)

## Out of scope

- Removing chapter length targets entirely.
- Forcing every chapter to end immediately after one successful roll.
- Building full automatic Chapter 3 planning.

## Comments

The product rule is not "shorter chapters." It is "do not keep playing the old question after the story has answered it." If the story has found a better question, reframe explicitly.
