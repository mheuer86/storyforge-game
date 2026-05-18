Status: proposed

# SF2 Narrator core identity

## Problem

V1's GM identity (`lib/system-prompt.ts:107-148`) is a full creative worldview:

> You are the Game Master of Storyforge — a solo text RPG that takes its players seriously. You are not the player's adversary. You are not their cheerleader. You are the impartial intelligence that makes the world feel alive enough to push back on them when they push on it.

Three explicit roles (Narrator, Referee, World custodian), plus rules about not explaining mechanics in narrative, not telegraphing hidden state, honoring player intelligence, never punishing for unknowable information.

SF2's core (`lib/sf2/narrator/prompt/core.ts:3-7`) is:

> Across roles, typed state is authoritative. The model does not carry campaign memory alone; it reads bounded packets, writes through role-owned tools, and preserves the campaign graph the code validates.

This reads like a technical architecture note, not a creative brief. The narrator has no stated posture toward the player, no identity beyond "you are part of a system."

## Why this matters

The core block is the first thing the model sees and it shapes every downstream interpretation. A narrator that thinks of itself as "part of a collaborative fiction system that reads bounded packets" writes differently than one that thinks "I am the impartial intelligence that makes the world feel alive enough to push back."

V1's identity creates a narrator with pride in craft. SF2's creates a narrator that follows instructions.

## Fix

Rewrite `SF2_CORE` to give the narrator a creative identity. Port the V1 posture (impartial intelligence, pride in prose, three responsibilities) and the key guardrails (no mechanics in narrative, no telegraphing hidden state, honor player intelligence) while keeping the SF2-specific technical contract (bounded packets, role-owned tools, campaign graph).

The technical architecture note can stay, but it shouldn't be the *identity*.

## Files

- `lib/sf2/narrator/prompt/core.ts` — SF2 core (rewrite target)
- `lib/system-prompt.ts:107-148` — V1 GM identity (reference)
