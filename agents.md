# agents.md

This file is for coding agents working in the Storyforge repository.

## First read

Read `CLAUDE.md` before making changes. It is the primary project handbook and contains the authoritative overview of architecture, game systems, commands, and code style.

Read `CONTEXT.md` for product vision, current project state, the V1/SF2 distinction, and where project knowledge lives.

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

## Product priorities

- Preserve strong genre identity, tight chapter pacing, coherent long-lived world state, D&D-inspired rolls/consequences, and low-friction browser persistence.
- Do not alter streaming feel, timing, responsiveness, or when text appears to the player without proposing the tradeoff first. The streaming UX is a core part of the game feel.
- Prefer personality and genre texture over sterile visual consistency. Font contrast between narrative, UI, and system/data text is intentional.
- Adopt shadcn primitives opportunistically during real UI work; do not rewrite the UI just to migrate.

## Architecture lessons

- When the model repeatedly fails a mechanical task, move that responsibility to code instead of adding more prompt rules. Examples: damage auto-chain, server-side arithmetic, deterministic validators.
- Claude drifts on subjective "should I do X now?" decisions. Prefer state-derived detection, explicit dynamic injection, and code-level enforcement once prompt escalation flatlines.
- Deduplicate recurring mutations in the tool processor with stable IDs or content hashes; do not rely on the model to remember it already emitted a purchase, item use, ledger entry, or state mutation.
- Keep prompt/tool/schema changes synchronized. If prompt behavior changes, inspect tool definitions and tool-result application together.
- Treat save shape and streaming/tool-call behavior as high-risk integration surfaces.

## Anthropic patterns

- For single-tool flows, set `disable_parallel_tool_use: true`; otherwise Haiku can emit multiple partial tool calls and dispatch may silently drop all but one.
- Split long structured schemas into sequential tool calls of roughly 5-6 top-level fields each. Field reordering and larger `max_tokens` do not fix schema-length reliability ceilings.
- Use deterministic observe-mode sentinels for forbidden output patterns before enforcing repair. Prompt bans alone are weak.
- Pair validation with one corrective retry for flaky structured output.
- With Anthropic prompt caching, keep per-turn dynamic content after cache markers. Dynamic system blocks before a message cache marker invalidate the cached prefix.

## Storyforge 2 / SF2

SF2 is a context-engineering rebuild, not a prompt-tuning pass. Its thesis: managing game state is the product. The model should generate prose against structured, validated ground truth rather than carry campaign memory in a giant transcript.

Durable SF2 principles:
- State over history: typed, queryable state is authoritative; transcript history is compressed into scene summaries, chapter artifacts, pivotal scenes, and a short recent-turn window.
- Bounded scene context: the Narrator gets a scene packet and working set, not the whole campaign.
- Flat writes, structured storage: models emit simple semantic patch proposals; code resolves IDs, anchors, ownership, validation, and persistence.
- Roles with hard ownership: Author shapes chapter pressure, Narrator writes the current scene and mechanical annotations, Archivist extracts durable narrative state. Firewalls should reject role leakage.
- Validation before persistence: accept valid patch parts, reject invalid parts, and log drift explicitly.
- Pacing is computed: pressure engines, ladder cooldowns, reactivity, scene-link discipline, stagnation, and arc dormancy should be code-derived advisories, not vibes in a prompt.

Important SF2 shape:
- Arcs group resolution-dependent threads.
- Threads are the main units of unresolved tension and have owners plus optional stakeholders.
- Decisions and promises require anchors; clues may start floating and anchor later.
- NPCs and factions own threads; disposition, agenda, heat, and identity anchors live on owning entities rather than parallel arrays.
- Retrieval should owner-join relevant threads with current owner state.
- Working-set assembly should be deterministic, scored, bounded, and instrumented before being made clever.

SF2 sequencing cautions:
- Verify current implementation before trusting older memories; several shaped items were later found already implemented in uncommitted code.
- Pressure engines shipped around 2026-04-28 and are the current pattern for code-owned narrative pressure.
- Emotional beats exist as a typed memory unit in recent SF2 work, but free-judgment emission is risky. Prefer state-event triggers if playthrough data shows drift.
- Revelation hint counters were partially implemented; concept anchors and observe-mode calibration matter before enforcement.
- NPC state-bound rendering was shaped as the next reliability slice after more playthrough data.
- Per-faction naming culture and cinematic loading screens are deferred content/UX polish, not core reliability work.

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
