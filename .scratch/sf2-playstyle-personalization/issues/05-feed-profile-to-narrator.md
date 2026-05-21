# Feed Profile To Narrator

Status: complete
Labels: complete
Type: AFK
Area: SF2 / Narrator / playstyle personalization

## What to build

Feed the compact rolling playstyle profile into Narrator context so live turns adapt to the player’s demonstrated information economy, decision architecture, emotional register, NPC legibility tolerance, consequence timing, and error-tolerance rules.

The Narrator must use this as GM technique guidance, not player-facing content. It should affect how scenes are paced and rendered, not what the fiction claims is true.

## Acceptance criteria

- [x] Narrator turn context includes a compact playstyle personalization block when the live gate is enabled.
- [x] The block is omitted when the live gate is disabled.
- [x] The prompt frames personalization as GM technique guidance, not PC psychology or fiction state.
- [x] Display sentinels or replay coverage catch obvious leakage of personalization labels into player-facing prose.
- [x] Prompt/cache boundaries are respected: mutable profile content stays out of cached system blocks.
- [x] Existing streaming, roll pause/resume, and `narrate_turn` behavior remain unchanged.

## Blocked by

- 02-persist-artifacts-and-rolling-profile.md
- 03-reversible-live-gate-and-diagnostics.md

## Comments

Added a private per-turn Narrator guidance block, gated by the live profile switch and kept out of cached system content. Display sentinel coverage now catches obvious private playstyle label leaks.

Refinement from 2026-05-21 handover review: this remains the durable live consumer direction. The GM handover path should feed the Narrator readable prep plus compact private playstyle guidance, while still preventing player-facing leakage.
