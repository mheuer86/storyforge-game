# Thread Resolution and Carry-Forward Contracts

Status: needs-triage
Type: AFK
Area: SF2B / state coherence / threads

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Tighten thread resolution and carry-forward contracts so unresolved pressure cannot vanish or resolve cleanly without satisfying its own criteria.

The motivating failures are `Contact in Wake` resolving too generously in SF2B Chapter 1 and the later Chapter 2 handoff dropping the previously scanned tail/cutter pressure entirely. A thread can go background, transform, or become a successor, but it should not disappear because a new chapter hook found a shinier pressure source.

## Acceptance criteria

- [ ] Required resolution criteria/gates are checked before a thread can become `resolved_clean`.
- [ ] Threads with unknown origin/intent cannot resolve cleanly from mere temporary evasion unless their criteria allow that.
- [ ] Active unresolved threads are either carried forward, intentionally backgrounded with a reason, or transformed into an explicit successor thread at chapter handoff.
- [ ] Carry-forward threads appear in the continuity lock when they are load-bearing, high-tension, or recently advanced.
- [ ] A fixture covers the SF2B tail/cutter case: a contact detected after passive sweeps remains unresolved until named, shaken, accepted, or explicitly transformed.
- [ ] A fixture covers legitimate closure so the validator does not trap finished threads forever.

## Blocked by

- [Chapter Author Uses a Canon Continuity Lock](02-chapter-author-uses-a-canon-continuity-lock.md)

## Out of scope

- Requiring every thread to remain visible every turn.
- Preventing the Author from introducing successor pressure.
- Designing a full arc-resolution planner.

## Comments

This is the state side of continuity. The Author cannot honor what the state has already allowed to dissolve.
