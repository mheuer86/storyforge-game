# CONTEXT.md

High-altitude orientation for Storyforge. Sits alongside two other top-level docs:

- **CLAUDE.md** — technical handbook: commands, file map, architecture, code style. The *what*.
- **agents.md** — operational rules and hard-won patterns for coding agents in this repo. The *how to behave*.

This file is the *why and where*: what Storyforge is trying to be, the two implementation layers it currently runs, the design philosophy underneath decisions, the state of the project, and how the code, the docs, and the design vault fit together. When this file and the others overlap, this one owns vision and current state; the others own technical detail and operational behavior. If they drift, fix them.

---

## What Storyforge is

A solo text RPG where Claude is the Game Master. Players pick a genre, a species/origin, and a class; Claude drives a branching, persistent campaign with d20 mechanics, scene-anchored memory, and code-owned pacing.

The bet that distinguishes Storyforge from "a ChatGPT roleplay prompt": **managing game state is the product**. State is typed, validated, and queryable. The model writes prose against ground truth, it does not carry the campaign in transcript memory, and it does not improvise mechanics.

What Storyforge is *not* trying to be: a tabletop simulator, a text adventure, or an open sandbox. Chapters are short and resolution-shaped. Tension is mechanical. Genre is loud (fonts, palettes, prose register, opening hooks all pull in distinct directions). The experience target is the feel of *being inside a specific kind of story*, not the feel of running a generic RPG.

## Two implementation layers

The repo runs two parallel game engines because we are mid-migration. Don't conflate them.

**V1** is the shipped game.
- Entry: `app/play/`, `app/api/game/route.ts`
- Prompt: `lib/system-prompt.ts` (modular situation overlays + compressed state)
- Tools: `lib/tools.ts`, applied by `lib/tool-processor.ts`
- State: monolithic `GameState` in localStorage; save slots in `lib/game-data.ts`
- Streaming: NDJSON events with roll-pause and chapter-close choreography

**SF2** is the context-engineering rebuild.
- Entry: `app/play/v2/`, `app/api/sf2/*`
- Roles with hard ownership: **Author** shapes chapter pressure, **Narrator** writes the current scene, **Archivist** extracts durable narrative state. Firewalls reject role leakage.
- Schema: `lib/sf2/types.ts` and `lib/sf2/validation/*`. Flat semantic patches, code resolves IDs and anchors.
- Retrieval: `lib/sf2/retrieval/packets/*`. Scene packets plus a deterministic working set, not a giant transcript.
- Validation: `npm run sf2:replay` runs `scripts/sf2-replay.ts` against `fixtures/sf2/replay/*.json`. When you change a contract, add a fixture that fails on the old behavior and passes on the new.

V1 is in maintenance plus selective backports (V1.5 shipped six small additions in early 2026). SF2 is where the architectural learning happens: cost work, coherence experiments, instrumentation, schema discipline. Genre content (`lib/genre-config.ts`, `lib/genres/*`) is shared. Runtimes, prompts, schemas, and tool surfaces are not.

## Design philosophy

Principles that have earned their keep across more than one decision.

**Move mechanics into code when prompt rules fail.** Every reliability win has followed the same arc: prompt rule, drift, state-derived detection, code-level enforcement. Damage auto-chain, ledger dedup, ladder cooldowns, canon-firewall, NPC affect (the next slice) all followed it. The cost of code is bounded; the cost of prompt calibration is not.

**The uncertainty test for mechanics.** A mechanic earns its place only if the AI also doesn't know the outcome. Real dice, real pressure clocks, real validated patches: keep them. Cosmetic rolls and decorative checks: don't add them. If the GM can predict the result, it's progression theatre.

**Pressure is computed.** Tension, deterioration, arc stagnation, scene linkage, ladder triggers all live as code-derived advisories. The GM reads pressure off state, it does not invent it. Triggers must be entity-bound (no scene or location names), and the hard rung must remain evaluable in the last third of `target_turns`.

**Genre identity over visual cohesion.** Font contrast between narrative, UI, and system text is intentional. Each genre keeps its palette, register, and atmosphere. Don't sand the edges to make things look uniform.

**Streaming is part of the game feel.** Timing, token cadence, the pause-for-roll choreography are all felt by the player. Don't change them without proposing the tradeoff first.

**State-derived enforcement, not prompt escalation.** When the model drifts on a judgment call ("should I close the chapter now?"), the fix is to inject a derived signal and let code gate the decision, not to add another instruction line.

## Current state (as of early May 2026)

Recent, last ~30 days:
- **V1.5 complete** — surface progression, clue tier, roll modifiers, ops plan name, retinue system, starting contacts, decomposed genre configs.
- **SF2 instrumentation Batch 1 shipped** — latency budget, WRITE attribution, canon firewall in observe mode, CHAPTER_STATS with genre tags.
- **Cost waterfall + Author trigger discipline shipped** — entity-bound trigger rule confirmed against playthrough data.
- **V2 UI direction** — three-column ambient layout as static preview at `/design/play`. Right rail (Locations / Present / Intel) committed; per-genre token contract pending Epic Sci Fi as the second theme.

Next slice queued, not started:
- **NPC state-bound rendering** — free-judgment NPC affect emission has shown drift; fix is state-event triggers.
- **V2 UI Phase 0** — port state diff + scene markers + mirrored message styling into `app/play/v2`.
- **Schema additions for V2 UI integration** — `Sf2OperationPlan.name`, `Sf2Location.locked` and `firstSeenChapter`, `Sf2Thread.firstChapter`, per-genre stat labels, `theme.severe`, per-genre color tokens.

Deferred (tracked but not active):
- Per-faction naming culture, cinematic chapter loading screens, mobile layout, light-mode palettes for non-priority genres, prompt trimming, server-side enforcement.

## Where information lives

The project's knowledge sits across three surfaces. Use them in this order.

| Surface | Holds | Consult when |
|---|---|---|
| **Code** | The truth | Always start here for current behavior |
| **`storyforge/docs/`** | Stable architectural references: `architecture.md`, `rules-engine.md`, `genre-config-system.md`, `prompt-composition.md`, `commit-turn-reference.md`, `game-systems.md`, `genres.md`, `srd.md`, `byok-security.md`, `storyforge-2-design.md` | You need the *why* behind a system that has already shipped |
| **Brainforest vault** at `/Users/martin.heuer/vaults/brainforest/zettel/YYYY-Wnn/` | Design decisions, scoping docs, post-playthrough analyses, in-flight thinking. Cross-referenced as `[[YYMMDDHHmm Title]]`; the timestamp prefix is the unique ID. | A recent change has motivation that isn't in code or `/docs/` yet, or the user references a zettel by ID or title |

When the user references a zettel by ID or title, search the vault before continuing. Vault decisions often precede code by days or weeks. Decisions in the vault that have not yet landed in code are normal, not a contradiction.

## How we ship

- `npm run dev`, `npm run build`, `npm run lint`
- `npm run sf2:replay` for SF2 fixture validation
- Deploy with `npx vercel --prod --yes` from project root (the GitHub integration doesn't persist)
- Production: `storyforge-flame.vercel.app`

No general test suite. SF2 has the replay fixtures. V1 changes are validated by reasoning plus manual play; preserve save-shape and streaming behavior across edits.

## Pointers

- **CLAUDE.md** for commands, file map, code style, V1 architecture
- **agents.md** for working rules, Anthropic patterns, high-risk integration surfaces, V1/SF2 do-not-break list
- **`storyforge/docs/storyforge-2-design.md`** for SF2 architectural intent
- **`storyforge/docs/rules-engine.md`** for the pressure-engine and validator semantics
- **`storyforge/docs/prompt-composition.md`** for V1 prompt assembly
