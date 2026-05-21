# Feed Session Brief To Narrator Continuation

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / Narrator / chapter transition

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Use the latest next-session handover brief as the Narrator's opening context for Chapter 2+ behind a reversible gate.

When a chapter closes and a valid handover exists, the next chapter can begin from the brief rather than waiting for Chapter Author to synthesize a new chapter setup. The old Chapter Author path remains fallback until the brief-driven path has enough playtest/replay evidence.

As with Chapter 1, render the handover into live Narrator context: Current Story Surface first, then owed questions, embodied pressure, do-not-restage, current phase/major-delta guidance, and scope hints. The full handover may remain available as cached/reference context, especially for texture-rich cross-chapter continuity.

## Acceptance criteria

- [ ] A single internal gate controls whether continuation chapters can use brief-driven opening.
- [ ] Narrator initial context for Chapter 2+ includes the next-session brief, quick reference, and relevant GM memory when enabled.
- [ ] Narrator initial context includes the Current Story Surface rendered from the handover.
- [ ] The full handover can remain available as reference context or diagnostics; the Current Story Surface owns the immediate priorities.
- [ ] Owed questions and do-not-restage constraints are included and checked in diagnostics for the first turn.
- [ ] Embodied pressure guidance names who pays and what visible cost should shape the opening.
- [ ] Phase/current-major-delta guidance tells the Narrator what chapter-scale movement is owed before the local scene can loop.
- [ ] The brief is treated as private GM prep and must not be quoted as a document in player-facing prose.
- [ ] Missing, invalid, or failed handover falls back to the current Chapter Author transition path.
- [ ] State/prose-memory divergence is handled by trusting structured state for facts and logging a handover/Story Surface repair diagnostic.
- [ ] The chapter close/open flow records diagnostics for brief path vs Author path, including latency and validation findings.
- [ ] Replay/helper coverage proves a next-session brief reaches Narrator context and that fallback still preserves existing transition behavior.

## Blocked by

- 03-compile-chapter-close-gm-handover.md
