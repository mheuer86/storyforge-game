# Give factions lifecycle, leadership, and membership refs

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, faction leader and associated NPC note

## What to build

Deepen `Sf2Faction` from a pressure-owner record into a durable collective actor with lifecycle, leader references, and associated NPC references. Leadership should be canonical when it matters in play. Membership can be derived from NPC affiliation unless the design needs direct faction-owned membership.

## Acceptance criteria

- [ ] `Sf2Faction` has a lifecycle status vocabulary and valid transition table
- [ ] Faction can reference leader NPC ids and validate they exist
- [ ] Associated NPC ids are either derived from NPC affiliations or explicitly modeled with a documented source of truth
- [ ] Faction updates can change stance, heat, agenda, lifecycle, and leadership through validated writes
- [ ] Scene packet or working set can surface faction leaders when the faction is relevant
- [ ] Save normalization migrates existing factions to a default lifecycle and empty leadership refs
- [ ] Replay fixture covers a faction leader being used instead of inventing a parallel NPC

## Blocked by

- 04-split-npc-fiction-role-from-dramatic-role-and-faction-refs.md

## Comments

HITL decision: whether `associatedNpcIds` is canonical or derived. Default recommendation: leaders are canonical, associated NPCs are derived from NPC affiliation.

## Agent Brief

**Category:** architecture
**Summary:** Give factions enough structure to act like durable political entities.

**Current behavior:** Factions track stance, heat, heat reasons, agenda, and derived owned thread ids, but no lifecycle or leadership.

**Desired behavior:** Factions have lifecycle, validated leaders, and a clear relationship to associated NPCs.

**Key interfaces:** `Sf2Faction`, `Sf2Npc` affiliation, invariants, patch validation, working-set/scene-packet faction rendering.

**Out of scope:** Full organization charts.

