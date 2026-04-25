# agents.md

This file is for coding agents working in the Storyforge repository.

## First read

Read `CLAUDE.md` before making changes. It is the primary project handbook and contains the authoritative overview of architecture, game systems, commands, and code style.

This file is intentionally shorter and operational. When `agents.md` and `CLAUDE.md` overlap, follow `CLAUDE.md`.

## Mission

Maintain Storyforge as a solo text RPG with Claude as the GM. Preserve:

- strong genre identity
- tight chapter pacing
- coherent long-lived world state
- D&D-inspired roll and consequence loops
- low-friction local play with browser persistence

## Working rules

- Do not edit `CLAUDE.md` unless explicitly asked.
- Prefer minimal, targeted changes over broad refactors.
- Preserve existing player-facing tone and mechanical consistency.
- Keep streaming and tool-call behavior stable in `app/api/game/route.ts`.
- Treat `components/game/game-screen.tsx` as a high-risk integration surface; trace event flow before editing.
- Keep type changes synchronized with `lib/types.ts` and downstream consumers.
- If prompt behavior changes, inspect both `lib/system-prompt.ts` and `lib/tools.ts` so tool definitions and prompt expectations stay aligned.
- Respect local persistence assumptions in `lib/game-data.ts`; avoid save-shape regressions.

## Repo workflow

- Main dev commands:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
- There is no formal test suite right now. If you change behavior, validate with the most relevant command plus focused manual reasoning.
- The worktree may already contain user changes. Do not revert unrelated edits.

## High-value areas

- `app/api/game/route.ts`: streaming API, retries, roll pauses, chapter close flow
- `components/game/game-screen.tsx`: client game loop and state orchestration
- `lib/system-prompt.ts`: prompt assembly, compressed state, setup logic
- `lib/tool-processor.ts`: authoritative application of tool results
- `lib/genre-config.ts` and `lib/genres/*`: content-heavy genre definitions; avoid accidental lore drift
- `lib/game-data.ts`: save/load/migrations

## Change heuristics

- For UI bugs, inspect both the relevant component and the backing game state shape.
- For narrative/mechanics bugs, verify whether the issue belongs in prompt instructions, tool schemas, or tool-result application before editing.
- For schema additions, prefer additive changes and migration-safe defaults.
- For genre content edits, keep each genre's voice distinct rather than normalizing them.
- For chapter pacing issues, preserve the project's short-chapter bias instead of expanding scope.

## Done criteria

A change is in good shape when:

- the fix is scoped and consistent with existing patterns
- lint/build impact is understood
- save compatibility and streaming behavior are not accidentally broken
- any prompt/tool coupling affected by the change has been checked
