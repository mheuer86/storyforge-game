# Archivist Extracts Durable Meaning Without Bloated Scene Packets

Status: needs-triage
Type: AFK
Area: SF2B / Archivist / durable state

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Create or adapt the SF2B Archivist path so it extracts durable meaning after the turn without feeding bloated state back into the next Narrator packet.

The Archivist should preserve what matters across chapters: decisions, promises, entity changes, faction heat, relationship movement, important clues, hard commitments, and resolved or reframed threads. It should consolidate duplicate entities and stale facts rather than accumulating parallel fragments that later confuse the Narrator.

## Acceptance criteria

- [ ] SF2B Archivist writes durable semantic state, not a growing scene-packet mirror.
- [ ] Duplicate NPCs, locations, factions, and threads are consolidated or flagged before they can become separate live truths.
- [ ] Promises, decisions, clues, and thread movements require enough anchor information to be useful later.
- [ ] Stale facts can be superseded or retired when later state makes them false.
- [ ] Rejected or repaired writes are logged as drift evidence for evaluation.
- [ ] A focused fixture covers the V2 duplicate-bartender/pronoun-drift class of issue.
- [ ] A focused fixture covers contradictory clamp-status state after release.
- [ ] Narrator packets remain compact even as durable state grows.

## Blocked by

- [Narrator Uses a Dramatic Kernel Instead of the Full SF2 Packet](02-narrator-uses-a-dramatic-kernel-instead-of-the-full-sf2-packet.md)
- [Code Owns Hard State and Repeated-Beat Escalation](04-code-owns-hard-state-and-repeated-beat-escalation.md)

## Out of scope

- Perfect long-campaign memory.
- Replacing all Archivist judgment with deterministic extraction.
- Using raw transcript length as the primary continuity strategy.

## Comments

The state layer should be strict enough to make Chapter 2 coherent, but not so noisy that Chapter 1 starts reading like a database render.
