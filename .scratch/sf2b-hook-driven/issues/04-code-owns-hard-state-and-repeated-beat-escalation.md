# Code Owns Hard State and Repeated-Beat Escalation

Status: needs-triage
Type: AFK
Area: SF2B / hard state / pacing guardrails

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Move SF2B's hard state and obvious pacing failure detection into code-owned guardrails.

The Narrator should have freedom over prose and dramatic movement, but code should own arithmetic, inventory, HP, roll results, deadlines, durable IDs, and repeated unresolved predicates. If a state such as "the clamps are still waiting to release" repeats without meaningful leverage change, the system should inject an escalation, time cut, forced choice, or close vector instead of allowing a procedural stall.

## Acceptance criteria

- [ ] Credits, debt, inventory, HP, and roll-result application are deterministic and auditable in SF2B.
- [ ] SF2B rejects, repairs, or flags model mutations that contradict code-owned hard state.
- [ ] Repeated unresolved predicates are detected from state and recent transcript, not only from prompt advice.
- [ ] A repeated beat cannot persist for more than a small number of turns without escalation, compression, forced choice, time cut, or chapter-close pressure.
- [ ] A focused fixture covers the "waiting for clamps/release code" style stall from the V2 playthrough.
- [ ] A focused fixture covers V1-style credit/debt netting so hard-state math cannot drift into a contradictory balance.

## Blocked by

- [Narrator Uses a Dramatic Kernel Instead of the Full SF2 Packet](02-narrator-uses-a-dramatic-kernel-instead-of-the-full-sf2-packet.md)

## Out of scope

- Replacing all pacing judgment with deterministic code.
- Expanding the chapter-length target; the metric is turn density, not a fixed low turn count.
- Broad economy or inventory redesign.

## Comments

This ticket encodes the lesson that state machinery should carry mechanical responsibility so the Narrator can spend attention on scene quality.
