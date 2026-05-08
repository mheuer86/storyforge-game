# Split NPC fiction role from dramatic role and faction refs

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, NPC role/affiliation discussion

## What to build

Clarify NPC modeling by separating the NPC's in-world role from their dramatic function, and by making faction affiliation reference canonical faction ids where possible.

For example, "Settlement Elder" is a fiction role. "Crew", "antagonist", "ally", "rival", "patron", or "witness" are dramatic roles. Current `role: string` can mean either.

## Acceptance criteria

- [ ] `Sf2Npc` distinguishes fiction role from dramatic role without losing existing authored role text
- [ ] NPC affiliation can reference a faction id while preserving a display label for unknown or one-off affiliations
- [ ] NPC origin can record at least a location, faction, or compact label when established
- [ ] Author and Archivist tool schemas explain the difference between fiction role, dramatic role, affiliation, and origin
- [ ] Cast packet rendering uses the clearer fields without making existing NPCs less legible
- [ ] Save normalization migrates old `role` and `affiliation` safely
- [ ] A replay fixture covers carry-forward NPCs retaining identity while refining role/affiliation

## Blocked by

None - can start immediately

## Comments

HITL decision: approve the dramatic role enum. Keep it small; the enum should support retrieval and rendering, not become a taxonomy hobby.

## Agent Brief

**Category:** architecture
**Summary:** Make NPC role and affiliation less overloaded.

**Current behavior:** `role` is a string that mixes fiction job and story function; `affiliation` is plain text.

**Desired behavior:** NPCs have clearer fiction role, dramatic role, origin, and canonical faction affiliation references.

**Key interfaces:** `Sf2Npc`, Author starting NPC schema, Archivist create/update schema, `author/hydrate.ts`, `apply-patch.ts`, cast packet.

**Out of scope:** Large cast retrieval redesign.

