# Roll Transaction Module

Status: needs-triage
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: deferred V1 safety slice. Pull forward when active work touches roll pauses, roll-first detection, inspiration rerolls, damage auto-chain, or roll-log/rules-engine coupling.

## What to build

Create a deeper V1 roll transaction Module that owns roll normalization, resolution, display data, roll records, inspiration spending, contested NPC totals, NPC failure tracking, and continuation payload construction.

Today, roll behavior is spread across dice UI state, roll-first detection, server continuation, result text, damage auto-chain, `_roll_record`, rules-engine roll context, and NPC failure tracking. The Interface leaks low-level facts like `toolUseId`, `pendingMessages`, generated damage IDs, and continuation request details.

Relevant files:

- `components/game/use-roll-logic.ts`
- `components/game/game-screen.tsx`
- `app/api/game/route.ts`
- `lib/rules-engine.ts`
- `lib/types.ts`

## Acceptance criteria

- [ ] The roll transaction Module can resolve normal checks, advantage/disadvantage, contested rolls, damage, healing, and inspiration rerolls.
- [ ] The Module produces roll display data and `RollRecord` data from the same source of truth.
- [ ] Roll-first and pending-check continuations share the same roll transaction path where possible.
- [ ] NPC failure tracking for contested failures is localized behind the roll transaction or turn commit seam.
- [ ] Damage auto-chain behavior remains stable for successful combat hits.
- [ ] Focused tests cover advantage/disadvantage, contested checks, inspiration reroll, damage/healing, roll-first, and pending-check flows.

## Blocked by

None - can start immediately. Deferred by selected-shape sequencing.

## Comments

Architecture review note: deleting `use-roll-logic` only removes UI dice state. The mechanical complexity remains scattered, which is why this deserves its own ticket.
