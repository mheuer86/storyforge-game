Status: proposed

# "The world moves without the player"

## Problem

V1 had explicit minimums for offscreen agency (`lib/system-prompt.ts:310-312`):

> Things happen offscreen. NPCs pursue their own agendas. Clocks advance. Threats develop. The player is the center of the story, not the center of the world. Each chapter, at minimum: one thread worsens (even if the player isn't engaging with it), the antagonist makes one move (preferably through absence — a clock ticking, a contact going dark, a third party warning), and one deferred promise gets mentioned by an NPC.

This created living-world texture — the feeling that the universe doesn't pause when the player stops pushing.

SF2 has thread pressure mechanics (code-driven escalation from failed rolls), but no equivalent narrator instruction for *unprompted* world motion. The pressure system only fires when a roll fails. If the player succeeds at everything, or avoids certain threads, those threads sit inert.

## Why this matters

The best moments in V1 playthroughs came from offscreen motion — an NPC the player hadn't talked to in three turns suddenly showing up with consequences. The antagonist making a move through absence (a contact going dark) is more threatening than a direct confrontation. Deferred promises getting mentioned by NPCs creates accountability texture.

Without this, SF2 worlds feel reactive — they only move when the player pushes. That's a theme park, not a world.

## Fix

Add a "World motion" section to the SF2 narrator craft or role prompt. Port the V1 minimums adapted for SF2's architecture:

- Per chapter: at least one thread worsens without player engagement (the pressure system handles roll-driven escalation; this covers the gap when rolls don't fire on a thread)
- Antagonist presence through absence — observable traces, not direct confrontation
- Deferred promises/obligations surface through NPC dialogue
- The player should never feel the universe is waiting for them

This intersects with the pressure system but doesn't replace it. Code-driven pressure handles roll consequences. Narrator-driven world motion handles the space between rolls.

## Files

- `lib/sf2/narrator/prompt/role.ts` — narrator role (edit target)
- `lib/system-prompt.ts:310-312` — V1 world-moves section (reference)
- `lib/sf2/pressure/runtime.ts` — existing pressure system (context)
