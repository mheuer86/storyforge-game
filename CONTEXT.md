# CONTEXT.md

High-altitude orientation for Storyforge. Sits alongside two other top-level docs:

- **CLAUDE.md** - technical handbook: commands, file map, architecture, code style. The what.
- **AGENTS.md** - operational rules and hard-won patterns for coding agents in this repo. The how to behave.

This file is the why and where: what Storyforge is trying to be, how the V1/SF2 split works now, the design philosophy underneath decisions, the state of the project, and how code, docs, and design notes fit together.

When this file and the others overlap, this one owns vision and current state; CLAUDE.md owns technical detail; AGENTS.md owns operational behavior. If they drift, fix them.

---

## What Storyforge Is

Storyforge is a solo text RPG where Claude is the Game Master. Players choose a genre, origin/species, playbook/class, and opening hook. The game drives a branching, persistent campaign with d20 mechanics, chapter pressure, and long-lived world state.

The bet that distinguishes Storyforge from a roleplay prompt: **managing game state is the product**.

State is typed, validated, and queryable. The model writes prose against ground truth. It does not carry the campaign in transcript memory, and it does not improvise core mechanics by vibe.

What Storyforge is not trying to be: a tabletop simulator, a parser text adventure, or an open sandbox. Chapters are short and resolution-shaped. Tension is mechanical. Genre is loud: fonts, palettes, nouns, institutions, prose register, and opening hooks all pull in distinct directions. The experience target is the feel of being inside a specific kind of story, not the feel of running a generic RPG.

## Current Engine Split

The repo currently has two engines. Do not conflate them.

### SF2: Current `/play`

SF2 is the primary game at `/play`.

- Entry: `app/play/page.tsx`, `components/sf2/play-app.tsx`
- Alias: `app/play/v2/page.tsx`
- Routes: `app/api/sf2/*`
- Schema: `lib/sf2/types.ts`, current `SF2_SCHEMA_VERSION = '3.2.0'`
- Persistence: IndexedDB via `lib/sf2/persistence/indexeddb.ts`
- Roles: Arc Author, Chapter Author, Narrator, Archivist, Chapter Meaning
- Retrieval: bounded working set plus scene packet
- Validation: flat semantic patches, code-resolved ids/anchors, actor firewall
- Regression: `npm run sf2:replay` against `fixtures/sf2/replay/*.json`

SF2 is the architectural center of the project. Current root docs under `docs/` describe SF2.

### V1: Legacy `/play/v1`

V1 is preserved for old localStorage saves and maintenance.

- Entry: `app/play/v1/page.tsx`
- Route: `app/api/game/route.ts`
- Prompt: `lib/system-prompt.ts`
- Tools: `lib/tools.ts`, applied by `lib/tool-processor.ts`
- State: monolithic `GameState` in localStorage through `lib/game-data.ts`
- Components: `components/game/*`

The old V1-oriented docs are archived under `docs/v1/`.

Shared genre content still lives in `lib/genre-config.ts` and `lib/genres/*`. Runtimes, prompts, schemas, tools, and persistence are separate.

## Design Philosophy

Principles that have earned their keep across more than one decision.

### Move Mechanics Into Code When Prompt Rules Fail

Every reliability win follows the same path: prompt rule, observed drift, state-derived detection, code-level enforcement. Damage resolution, ledger dedupe, ladder cooldowns, roll gates, actor firewalls, and patch validators all follow this pattern.

The cost of code is bounded. The cost of endless prompt calibration is not.

### The Uncertainty Test For Mechanics

A mechanic earns its place only if the AI also does not know the outcome. Real dice, real pressure clocks, real validated patches: keep them. Cosmetic checks and decorative "rolls" that the GM could already narrate: do not add them.

### Pressure Is Computed

Tension, local escalation, ladder fires, close readiness, stagnation, scene-link discipline, and arc dormancy are code-derived. The GM reads pressure off state. It does not invent chapter pressure because the prose feels dramatic.

### State Over History

The campaign graph is authoritative. Transcript history is useful for rendering continuity and replay, but durable memory lives in typed entities: arcs, threads, NPCs, factions, decisions, promises, obligations, clues, beats, documents, procedures, pressure events, and temporal anchors.

### Playstyle Personalization

Playstyle personalization is GM calibration about the human player after observed play: how they reason, choose, read implication, tolerate opacity, and respond to pacing or consequences.

It is distinct from PC stance, setup backstory, and campaign facts. It should tune how future chapters are run, not rewrite what happened in the fiction.

Current decisions:

- Roll it out live by default, with diagnostics/export visibility so it can be turned off or trimmed if playtest evidence shows overfitting or weak guidance.
- Keep it campaign-local only. A campaign may turn toward the player's demonstrated style over time, but future campaigns may deliberately want a different pace, register, or action bias.
- Do not add normal player-facing UI in the first implementation.
- Keep it separate from Chapter Meaning. Chapter Meaning owns literary transition and next-chapter consequence; playstyle personalization owns evidence-backed GM calibration.
- Use six canonical knobs first: information economy, decision architecture, consequence timing, emotional register, NPC legibility, and error tolerance, plus compact worked-pattern and avoid-pattern lists.
- Persist both chapter-close calibration artifacts for audit and a compact rolling campaign-local personalization profile for live Author/Narrator use.

### Campaign Rulebook Interpretation

Campaign rulebook interpretation is the campaign-local reading of generic rules into specific triggers, costs, permissions, taboos, and consequences for this PC, genre, and campaign context.

It is distinct from playstyle personalization: playstyle personalization tunes GM technique for the human player; campaign rulebook interpretation tunes how the rulebook applies inside the fiction. A generic rulebook category should not be treated as the whole answer when a campaign has sharper local moral, social, or genre pressure. For example, a grimdark corruption/Stain-like rule should not rely only on generic categories such as torture, betrayal, or killing surrendered enemies. For an oath-driven or Church-shaped PC, deceiving someone trusted or using a person the way an abuser once used them may be a stronger violation than generic violence. The same principle applies beyond Stain: rolls, costs, advantage/disadvantage, consequences, resource pressure, vows, taboos, factions, and social fallout should be interpreted through the campaign's established context. These interpretations should be explicit, campaign-local, and revisable as play reveals what the campaign is actually about.

### Genre Identity Over Visual Cohesion

Font contrast between narrative, UI, and system text is intentional. Each genre keeps its palette, institutions, vocabulary, and consequence language. Do not sand the edges to make all genres feel uniform.

### Streaming Is Part Of Game Feel

Token cadence, roll pauses, partial text, and responsive continuation are felt by the player. Do not change streaming behavior without naming the tradeoff.

### Validation Before Persistence

Models can suggest. Code decides what persists. Valid sub-writes should land even when one patch section is wrong. Invalid anchors, illegal transitions, weak evidence, and role leakage should be rejected and logged.

## Current State As Of 2026-05-16

Current:

- `/play` runs SF2.
- `/play/v1` is the V1 legacy path.
- `/play/v2` remains an SF2 alias.
- Root docs under `docs/` are being refreshed as current SF2 docs.
- V1 docs are preserved under `docs/v1/`.
- SF2 has replay fixtures and diagnostics export paths.
- The three-column SF2 play shell is the current game UI.
- BYOK and passphrase gates wrap the SF2 play path.

Important current implementation shape:

- Narrator route streams NDJSON and supports roll pause/resume through `request_roll`.
- Archivist extracts durable narrative-state writes after each committed turn.
- Author creates chapter pressure through `author_chapter_setup`; the older spine/surface split remains as local schema pieces, not active tools.
- Current chapter pressure is thread-driven. Legacy `campaign.engines` remains for compatibility but is not the primary pressure runtime.
- Working-set assembly is deterministic, scored, bounded, and instrumented.
- Display sentinels are wired; some findings are repaired and others remain observe-mode diagnostics.

Queued or likely follow-up areas:

- NPC state-bound rendering after more playthrough evidence.
- Further procedure mechanics UI wiring.
- Continued observe-to-enforce calibration for display sentinels and revelation hint counters.
- Per-faction naming culture and cinematic loading screens remain content/UX polish, not core reliability work.

## Where Information Lives

Use these surfaces in order.

| Surface | Holds | Consult when |
|---|---|---|
| Code | The truth | Always start here for current behavior |
| `docs/` | Stable current SF2 references | You need shipped architecture, game systems, rules, prompts, tools, genre config, SRD, or BYOK/security |
| `docs/v1/` | Historical V1 references | You are touching `/play/v1`, `app/api/game`, `components/game`, V1 prompts/tools, or V1 saves |
| `.scratch/` | Work-in-progress audits, issue drafts, temporary artifacts | You need current pass notes, issue tracker material, or local export artifacts |
| Brainforest vault | Design decisions and in-flight thinking | The user references a zettel by ID/title or a recent design decision not yet in docs |

The Brainforest vault path is `/Users/martin.heuer/vaults/brainforest/zettel/YYYY-Wnn/`. Zettel links use `[[YYMMDDHHmm Title]]`; the timestamp prefix is the unique ID.

When the user references a zettel by ID or title, search the vault before continuing. Vault decisions can precede code by days or weeks. A vault decision that has not landed in code is not automatically a contradiction.

## Current Docs

Root SF2 docs:

- `docs/README.md`
- `docs/architecture.md`
- `docs/storyforge-2-design.md`
- `docs/game-systems.md`
- `docs/rules-engine.md`
- `docs/prompt-composition.md`
- `docs/tool-reference.md`
- `docs/genre-config-system.md`
- `docs/genres.md`
- `docs/srd.md`
- `docs/byok-security.md`

Operational agent docs stay under `docs/agents/`.

## How We Ship

```bash
npm run dev
npm run build
npm run lint
npm run sf2:replay
```

For SF2 behavior changes:

1. Search existing fixtures for the affected contract.
2. Add or trim a focused fixture when the bug is distinct.
3. Run the focused fixture first.
4. Run the full replay suite when practical.

For doc-only changes, run practical link/stale-reference checks and `npm run lint` if the touched files could affect linted code.

Deploy with:

```bash
npx vercel --prod --yes
```

Production: `storyforge-flame.vercel.app`.

## Pointers

- **CLAUDE.md** for commands, file map, code style, and high-risk files.
- **AGENTS.md** for working rules, Anthropic patterns, and repo-specific cautions.
- **`docs/storyforge-2-design.md`** for the SF2 thesis and role model.
- **`docs/rules-engine.md`** for roll gates, pressure, validation, sentinels, and replay fixtures.
- **`docs/prompt-composition.md`** for prompt/cache composition.
- **`docs/tool-reference.md`** for active SF2 role tools.
- **`docs/v1/`** for the old V1 documentation snapshot.
