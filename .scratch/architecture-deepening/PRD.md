# PRD: Architecture Deepening Backlog

Status: needs-triage

## Context

This backlog captures the deepening opportunities from the architecture review run with `improve-codebase-architecture`.

Storyforge's current architecture has two layers:

- **V1** is the shipped game. It is maintenance-oriented and highly sensitive around streaming, roll pauses, chapter close, save shape, and `components/game/game-screen.tsx`.
- **SF2** is the context-engineering rebuild. Its core thesis is that managing game state is the product: typed state, bounded scene context, computed pressure, and validated writes should carry more responsibility than prompt memory.

The review found several places where real domain concepts exist, but the current Module Interfaces ask callers to remember too much ceremony. The purpose of this backlog is to improve Locality and Leverage without broad refactors or gameplay drift.

## Goals

- Make computed pressure, bounded scene context, turn commits, rolls, save normalization, and canonical references easier to reason about.
- Preserve streaming feel, save compatibility, and V1/SF2 distinction.
- Prefer deep Modules with small Interfaces over more scattered helper functions.
- Turn architectural friction into independently triageable tickets.

## Shaping

PRD-level shaping lives in [shaping.md](shaping.md). Selected shape: **A: SF2 Reliability Spine First**.

The backlog should shape and implement the Chapter Pressure Runtime Module first, then the Narrator Turn Context Module. The remaining tickets stay discoverable with pull-forward triggers.

## Non-goals

- No immediate rewrite of V1 or SF2.
- No UI redesign.
- No prompt behavior change without checking prompt/tool/schema coupling.
- No migration away from local browser persistence as part of this backlog.

## Tickets

1. [Chapter Pressure Runtime Module](issues/01-chapter-pressure-runtime-module.md)
2. [Narrator Turn Context Module](issues/02-narrator-turn-context-module.md)
3. [V1 Turn Commit Pipeline Module](issues/03-v1-turn-commit-pipeline-module.md)
4. [Roll Transaction Module](issues/04-roll-transaction-module.md)
5. [Save Normalization Modules](issues/05-save-normalization-modules.md)
6. [Canonical Reference Policy Module](issues/06-canonical-reference-policy-module.md)

## Suggested order

1. Shape the Chapter Pressure Runtime Module next. It is closest to SF2's current reliability work and the "pressure is computed" principle.
2. Follow with the Narrator Turn Context Module. It supports bounded scene context and deterministic retrieval.
3. Pull V1 Turn Commit Pipeline and Roll Transaction forward only when touching shipped V1 turn behavior or roll behavior.
4. Pull Save Normalization forward when touching persistence, migrations, import/export, or SF2 seed/save interactions.
5. Pull Canonical Reference Policy forward when NPC state-bound rendering, scene-kernel enforcement, or stricter Archivist validation moves from observe mode to enforcement.

## Notes

No ADR conflicts were found because `docs/adr/` does not currently exist. If a ticket is rejected for a durable architectural reason, consider recording that reason as an ADR so future reviews do not re-suggest it.
