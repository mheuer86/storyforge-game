# Storyforge — Architecture Document

> Last updated: 2026-04-28
> Status: Comprehensive reference. Covers v1 architecture and Stage 2 (SF2) evolution.

---

## 1. Project Overview

Storyforge is a solo text RPG where Claude acts as an adaptive Game Master. Players create a character (genre, species/origin, class), and Claude drives branching storylines with D&D 5e-inspired mechanics. All game state lives client-side in localStorage — there is no backend database.

**Production URL**: storyforge-flame.vercel.app
**License**: AGPL-3.0

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19.2.4, TypeScript 5.7.3 |
| Styling | Tailwind CSS 4.2, OKLch color space |
| Components | shadcn/ui (Radix primitives), Lucide icons |
| Forms | React Hook Form 7.54 + Zod 3.24 |
| AI | @anthropic-ai/sdk 0.87.0 (Claude Sonnet for GM, Haiku for audit) |
| State | localStorage (client-side only) |
| Fonts | 9 families: Geist, Lora, Newsreader, Roboto Mono, Space Grotesk, Cormorant Garamond, Cinzel, GeistPixel (local) |
| Deploy | Vercel (`npx vercel --prod --yes`) |

---

## 3. Directory Structure

```
storyforge/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── auth/route.ts        # Session validation (HMAC-SHA256)
│   │   ├── game/route.ts        # Main streaming API + tool-use loop
│   │   └── sf2/                 # Stage 2 API routes
│   │       ├── narrator/route.ts
│   │       ├── author/route.ts
│   │       ├── archivist/route.ts
│   │       ├── arc-author/route.ts
│   │       └── chapter-meaning/route.ts
│   ├── play/
│   │   ├── page.tsx             # V1 game entry (client component)
│   │   └── v2/page.tsx          # V2 game entry
│   ├── chronicles/              # Story archives
│   ├── content-policy/
│   ├── impressum/
│   ├── layout.tsx               # Root layout + fonts + atmospheric layers
│   ├── page.tsx                 # Landing page
│   └── globals.css
├── components/
│   ├── game/                    # Game UI (see §11)
│   │   ├── game-screen.tsx      # Central orchestrator (~28k tokens)
│   │   ├── action-bar.tsx       # Input + commands + HUDs
│   │   ├── burger-menu.tsx      # Side panel (Character/World/Notebook/Chapters/Tokens/Save)
│   │   ├── chat-message.tsx     # Message rendering + markdown
│   │   ├── dice-roll-modal.tsx  # Interactive dice modal
│   │   ├── roll-badge.tsx       # Inline roll results
│   │   ├── state-diff-bar.tsx   # Stat change badges
│   │   ├── top-bar.tsx          # Fixed header
│   │   └── chapter-close-overlay.tsx  # End-chapter debrief
│   ├── setup/                   # Onboarding (genre/character/campaign)
│   └── ui/                      # 50+ shadcn/ui primitives
├── lib/                         # Core game logic (~27 files)
│   ├── types.ts                 # Complete type definitions (800+ lines)
│   ├── tools.ts                 # Tool definitions (~1200 lines)
│   ├── tool-processor.ts        # State mutation dispatch (~350 lines)
│   ├── system-prompt.ts         # Modular prompt assembly (~4000 lines)
│   ├── game-data.ts             # Persistence + migrations (~2000 lines)
│   ├── rules-engine.ts          # D&D 5e mechanics (~1300 lines)
│   ├── stream-parser.ts         # NDJSON event parsing (~500 lines)
│   ├── genre-config.ts          # Genre interface + registry
│   ├── firewall.ts              # Pre-submission validation
│   ├── instrumentation.ts       # Session diagnostics
│   ├── extraction-merge.ts      # Supplemental state merging
│   ├── shadow-diff.ts           # Extraction diff comparison
│   ├── slash-commands.ts        # Player slash command definitions
│   ├── npc-utils.ts             # NPC helpers
│   ├── chronicles.ts            # Story archive utilities
│   ├── changelog.ts
│   ├── api-key.ts               # BYOK management
│   ├── auth.ts                  # Auth utilities
│   ├── tool-handlers/           # Domain-specific state handlers
│   │   ├── character.ts         # HP, inventory, traits, level up
│   │   ├── world.ts             # NPCs, threads, promises, decisions (~1000 lines)
│   │   ├── combat.ts            # Combat start/update/end
│   │   ├── narrative.ts         # Chapter frame, arcs, scenes, pivotal
│   │   └── setup.ts             # Chapter 1 batch initialization
│   ├── genres/                  # Per-genre config files
│   │   ├── space-opera.ts
│   │   ├── fantasy.ts
│   │   ├── cyberpunk.ts
│   │   ├── grimdark.ts
│   │   ├── noire.ts
│   │   └── epic-scifi.ts
│   ├── migrations/
│   │   └── stage2.ts            # V1→V2 schema migration heuristics
│   └── sf2/                     # Stage 2 architecture (~23 files)
│       ├── author/              # Story authoring engine
│       ├── narrator/            # Narrative generation
│       ├── arc-author/          # Multi-chapter arc system
│       ├── archivist/           # Story summarization
│       └── runtime/             # Pressure ladders, pruning
├── hooks/
│   ├── use-mobile.ts            # Responsive detection
│   └── use-toast.ts             # Toast notifications
├── content/chronicles/          # Published playthrough narratives
├── scripts/                     # Node scripts (SF2 probes, fixtures)
├── fixtures/                    # Test data
├── docs/                        # Documentation
├── styles/
├── public/
├── CLAUDE.md                    # Project conventions for AI agents
└── ARCHITECTURE.md              # This file
```

---

## 4. State Management

### 4.1 GameState — The Single Source of Truth

All game state is a single `GameState` object persisted to localStorage:

```typescript
GameState {
  meta: MetaState              // version, schema, genre, chapter info, session count
  character: CharacterState    // stats, HP, AC, inventory, traits, level, exhaustion
  world: WorldState            // NPCs, threads, promises, decisions, clocks, operations, notebook, heat, ledger
  combat: CombatState          // active flag, round, enemies, spatial state
  history: HistoryState        // messages, chapters[], rollLog
  chapterFrame: ChapterFrame | null
  storySummary: StorySummary | null
  sceneSummaries: SceneSummary[]
  arcs: StoryArc[]
  counters: Record<string, number>   // genre-specific moral pressure (fealty, doubt, exposure, etc.)
  rulesWarnings: string[]
  pivotalScenes: PivotalScene[]
  _instrumentation?: Instrumentation // session diagnostics (non-persistent)
}
```

### 4.2 Persistence Layer (`game-data.ts`)

Storage keys:
- `storyforge_gamestate` — auto-save (updated every turn)
- `storyforge_save_slot_1/2/3` — manual save slots with metadata (characterName, genre, chapter, timestamp)

`SaveSlotData` includes full `GameState` plus display metadata for the save/load UI.

### 4.3 Schema Versioning & Migration

Two-phase migration system:

1. **`ensureSchemaVersionAndMigrate()`** — called on every load. Detects schema version, runs migration if needed.
2. **`runStage2Migration()`** (`lib/migrations/stage2.ts`) — produces an action list using heuristics:
   - Jaccard token similarity for anchoring decisions/promises to threads
   - Name matching for thread owners
   - Clause extraction ("until/before/unless") for resolution criteria
   - Confidence ratings (high/medium/low) — only high+medium auto-applied
   - Pre-migration backup saved to `storyforge_premigration_v1_v2`

Inline backward-compat migrations handle older saves missing: skillPoints, tensionClocks, notebook, chapterFrame, operationState, explorationState, timers, heat, ledger, decisions, cyberpunk tech rigs, notebook connection IDs.

### 4.4 State Creation (`createInitialGameState()`)

Character creation flow:
1. Player selects genre → species/origin → class
2. Opening hook selected with priority: origin-specific (80%) → class-tagged (70%) → universal
3. Character initialized with D&D 5e stats, HP, AC, genre-specific credits, starting inventory, trait
4. World pre-populated: crew from templates, starting contacts per origin, factions, ship systems
5. Initial chapter frame and arc built from hook metadata

---

## 5. Prompt Architecture

### 5.1 Three-Layer Composition with Cache Optimization

The system prompt is assembled from layers, not a monolith. Cache breakpoints are placed so that stable content stays in the prefix cache across turns.

```
┌─────────────────────────────────────────────┐
│  SYSTEM MESSAGE 1 (cached)                  │
│  ┌─────────────────────────────────────┐    │
│  │  Core Layer (~1800 tokens)          │    │
│  │  GM identity, universal rules,      │    │
│  │  hidden systems, narration style    │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  SYSTEM MESSAGE 2 (cached)                  │
│  ┌─────────────────────────────────────┐    │
│  │  Situation Module (~400-600 tokens) │    │
│  │  One of: Tutorial | Planning |      │    │
│  │  Combat | Infiltration | Social     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  Investigation Overlay              │    │
│  │  (always except combat)             │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│  USER MESSAGES (cache breakpoint ↑)         │
│  ┌─────────────────────────────────────┐    │
│  │  Prior chapter scene summaries      │    │
│  │  Pivotal scenes (permanent)         │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  Compressed Game State              │    │
│  │  (~2000-3000 tokens, every turn)    │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  Current chapter messages (raw)     │    │
│  │  + roll reminders                   │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

Compressed state is injected as a **user-role message after the cache marker**, so state changes each turn don't invalidate the system-prompt prefix cache.

### 5.2 Core Layer Sections

Built by `buildCoreLayer()`, organized into five sections:

1. **GM Style** — Role, posture, guardrails. Three concurrent responsibilities: Narrator, Referee, World custodian. Pre-narration checks and post-action checklists.
2. **Game Systems** — D20 mechanics, advantage/disadvantage triggers, fail-forward patterns, consequences, hidden systems (difficulty adaptation, cohesion, disposition, promises, clocks).
3. **Narration** — Limited third person locked to PC. No omniscient asides. Intent interpretation. Scene pacing. NPC voice (rhythm not accent).
4. **Dramatic** — Chapter opening rules, deep lore injection, sliced trait rules per class.
5. **Character** — Genre-specific setting flavor, vocabulary, NPC voice guide.

### 5.3 Situation Modules

Selected by `detectContext()` based on game state:

| Module | Trigger | Focus |
|---|---|---|
| Tutorial | Chapter 1 | Onboarding through story; shorter chapter (10-15 turns), fewer entities |
| Planning | Operation in planning phase | Assessment rolls, NPC reactions to plans, 10-turn pacing limit |
| Combat | Active combat state | Turn order, threat tiers T1-T5, environmental combat, death saves |
| Infiltration | Operation active + hostile exploration | Detection layers as checks, cover identity DCs, extraction scenes |
| Social | Default / downtime | NPC texture, risky question gates, skip-ahead offers |

Investigation overlay appends to all modules except combat (clue/connection mechanics, tier derivation, tainted clue handling).

### 5.4 Compressed Game State (`compressGameState()`)

Generates a dynamic state block injected every turn. Sections in output order:

PRESSURE → ORIGIN → PC (stats/HP/AC/equipment) → LOC → SCENE → TIME → PARTY → COHESION → FACTIONS → NPCS (scene-present full detail, background one-line) → THREADS → PROMISES → DECISIONS → ANTAG → CLOCKS → COMBAT → HISTORY (prior chapters) → FRAME (objective/crucible/outcome spectrum + turn count + warnings) → ARCS

**Pacing detection** is embedded in the compressed state:
- Act detection (hook/development/crucible/resolution) from turn count and combat/op state
- Roll drought warnings (soft/hard/mandatory thresholds, context-aware)
- Turn budget escalation ladder (turn 12, 15, 16, 20, 25)
- **HARD CAP at turn 25** — `signal_close` mandatory within 3 turns

### 5.5 Specialized Prompts (Separate API Calls)

- **Audit prompt** (Haiku) — 14 quality checks, fires every ~8 player turns. Silent quality control. Non-blocking.
- **Close prompt** (Sonnet) — 6-step atomic sequence at chapter end.
- **Shadow extraction** — Parallel state enrichment, merges supplemental data if player submits during extraction.

---

## 6. Tool System

### 6.1 Tool Definitions (`tools.ts`)

Three top-level tools exposed to Claude:

#### `commit_turn` — The Batched State Mutation Tool

Single tool for ALL game state mutations. Claude calls this once per turn with optional nested fields:

```
commit_turn {
  character?: {
    hp_delta, hp_set, credits_delta,
    inventory_add[], inventory_remove[], inventory_use[],
    temp_modifier_add[], temp_modifier_remove[],
    trait_update, level_up, stat_increase,
    exhaustion_delta, proficiencies[], inspiration,
    roll_breakdown
  }
  world?: {
    add_npcs[], update_npcs[],
    set_location, set_current_time, set_scene_snapshot,
    add_threads[], update_threads[],
    add_factions[], add_promises[], update_promises[],
    add_decisions[], update_decisions[],
    set_operation, set_exploration,
    add_timers[], update_timers[],
    update_heat[], add_ledger_entry,
    cohesion, disposition_changes[],
    antagonist, ship_upgrades[],
    tension_clocks[],
    clues[], connections[]
  }
  combat?: { start, update_enemies[], end }
  suggested_actions: string[]     // REQUIRED — 3-4 player options
  pending_check?: { ... }         // Skill check proposal
  chapter_frame?: { objective, crucible, outcome_spectrum }
  arc_updates?: { create_arc, advance_episode, resolve_arc, abandon_arc, add_episode }
  reframe?: { ... }
  signal_close?: boolean
  close_chapter?: { summary, key_events, next_title, resolution_met, forward_hook, outcome_tier }
  debrief?: { tactical, strategic, lucky_breaks, costs_paid, promises_kept, promises_broken }
  scene_end?: boolean
  scene_summary?: { ... }
  tone_signature?: string
  objective_status?: string
  origin_event?: { counter, delta, reason }
  spend_witness?: { decision_id, spent_on }
  pivotal_scenes?: PivotalScene[]
}
```

#### `meta_response` — Out-of-Character Answers

Prefixed with [META]. Direct factual answers from game state. Does not advance the story.

#### `chapter_setup` — Chapter 1 Batch Init

Called once at game start to batch-initialize NPCs, location, factions, and threads before the GM narrates.

### 6.2 Tool Processor (`tool-processor.ts`)

Entry point: `applyToolResults(results, currentState, statChanges, trackEvent) → GameState`

**Dispatch pattern:**
1. Route to domain handlers: `applyCharacterChanges()`, `applyWorldChanges()`, `applyCombatChanges()`, `applyNarrativeChanges()`
2. Post-turn validations: NPC drift detection, duplicate name collisions, phantom damage rejection, credit dedup, inventory use dedup
3. Special handling: origin event auto-ticking, witness mark spending, internal tools (`_roll_record`, `_story_summary`, `chapter_setup`)
4. Output: updated GameState + optional `_sceneBreaks` array

### 6.3 Tool Handlers (`lib/tool-handlers/`)

| Handler | Responsibilities |
|---|---|
| `character.ts` | HP delta/set, credits (3-layer dedup), inventory CRUD + charges, temp modifiers, traits, level up, exhaustion, proficiencies, inspiration, roll breakdown |
| `world.ts` (~1000 lines) | NPCs (relations, key facts, temp load, signature lines), threads, factions, promises, decisions, operations, exploration, timers, heat, ledger, cohesion, disposition, antagonist, ship upgrades, tension clocks, clues, connections |
| `combat.ts` | Start combat, update enemy HP (auto-remove at 0, auto-end if all defeated), end with loot |
| `narrative.ts` | Chapter frame, reframe, signal close, close chapter, debrief, scene end/summary, objective status, pivotal scenes, arc CRUD |
| `setup.ts` | Chapter 1 batch initialization |

### 6.4 Validation & Firewall (`firewall.ts`, `rules-engine.ts`)

**Firewall** (pre-submission): type checks, field validation (disposition tiers, status enums), structure checks (promise anchoring, decision categories), rejection recording with severity levels.

**Rules Engine**: D&D 5e ability scores, proficiency bonuses, skill checks, advantage/disadvantage, contested rolls, critical/fumble detection, exhaustion tracking.

---

## 7. Operation System

### 7.1 OperationState

Multi-phase tactical plans with structured tracking:

```typescript
OperationState {
  name: string
  phase: 'planning' | 'pre-insertion' | 'active' | 'extraction' | 'complete'
  objectives: Objective[]        // priority stack (active/completed/failed)
  tactical_facts: string[]       // known environmental constraints
  asset_constraints: string[]    // resource limitations
  abort_conditions: string[]     // when to pull out
  signals: string[]              // communication protocol
  assessments: Assessment[]      // claims with skill checks + confidence
}
```

### 7.2 Phase Transitions

Operations progress linearly through phases. The situation module switches automatically:
- `planning` → Planning module (assessment rolls, NPC reactions)
- `active` + hostile exploration → Infiltration module (detection layers, cover identities)
- `extraction` → Infiltration module (extraction is always a scene)
- `complete` → returns to Social module

### 7.3 Prompt Integration

When an operation is active, the compressed state includes the full operation block. The situation module selector (`detectContext()`) reads the operation phase and exploration hostility flag to choose the appropriate module.

---

## 8. Clue / Evidence / Connection System

### 8.1 Notebook Structure

```typescript
Notebook {
  clues: Clue[]
  connections: ClueConnection[]
}
```

### 8.2 Clues (Evidence)

```typescript
Clue {
  id: string
  title?: string                 // "Betting Slip", "Pawn Receipt"
  content: string
  source: string
  tags: string[]
  discoveredChapter: number
  connectionIds: string[]        // links to connections using this clue
  isRedHerring: boolean
  status?: 'active' | 'solved' | 'archived'
  anchored_to?: string[]         // thread/arc IDs (v2)
  retrieval_cue?: string         // when to surface (v2)
}
```

### 8.3 Connections (Leads / Enriched / Breakthroughs)

```typescript
ClueConnection {
  id: string
  sourceIds: string[]            // clue or connection IDs
  title: string
  revelation: string             // what this connection means
  tier: 'lead' | 'enriched' | 'breakthrough'
  tainted: boolean               // true if any source is a red herring
  status?: 'active' | 'solved' | 'archived' | 'disproven'
}
```

### 8.4 Tier Derivation

Connections build on each other:
- clue + clue = **lead**
- lead + clue = **enriched**
- lead + lead = **enriched**
- enriched + anything = **breakthrough**

Tainted flag propagates: if any source clue is a red herring, the connection is tainted (plausible-but-wrong revelation).

### 8.5 Player Interaction

Players use `/connect` slash command in the ActionBar. The evidence picker is a two-stage selection UI with keyboard navigation (↑↓ arrows, Enter, Backspace, Esc). Available clues and connections are displayed with tier icons (◆ connection, ◇ clue).

---

## 9. Chapter Lifecycle

### 9.1 Frame → Close → Debrief

```
Chapter Start
  │
  ├── Frame Assignment (turns 1-3)
  │   └── objective + crucible + outcome_spectrum
  │       (clean / costly / failure / catastrophic)
  │
  ├── Play (turns 3-25)
  │   ├── Mid-chapter reframe (optional, when objective resolves but pressure type changes)
  │   ├── Scene summaries (2-4 sentences + tone signature)
  │   ├── Pacing escalation (turn 12 → 15 → 16 → 20 → 25 hard cap)
  │   └── signal_close when narrative reaches resolution point
  │
  ├── Close Sequence (dedicated Sonnet call, 6 steps)
  │   ├── Phase 1: audit + close_chapter + level_up + next frame
  │   ├── Phase 2: skill points + debrief (references actual rolls)
  │   └── Phase 3: pivotal scenes + signature lines
  │
  └── Chapter Close Overlay (UI)
      ├── Level up card (HP increase, proficiency bonus)
      ├── New proficiencies
      ├── Key events
      ├── Next chapter preview
      └── "Start Chapter N" button
```

### 9.2 close_chapter Fields

```typescript
{
  summary: string          // 2-3 sentences (long-term memory)
  key_events: string[]     // 3-5 narrative events (player-visible)
  next_title: string       // title for next chapter
  resolution_met: string   // how objective resolved
  forward_hook: string     // momentum generator
  outcome_tier: string     // GM assessment
}
```

### 9.3 Debrief

```typescript
ChapterDebrief {
  tactical: string         // tactical assessment
  strategic: string        // strategic assessment
  lucky_breaks: string[]   // things that went well
  costs_paid: string[]     // prices paid
  promises_kept: string[]
  promises_broken: string[]
}
```

### 9.4 Arc Integration

Each chapter corresponds to one episode in a story arc. The arc's first episode milestone becomes the chapter's frame objective. If an episode fails, the next chapter reframes accordingly.

---

## 10. Compressed State & Token Management

### 10.1 Token Budget

The system operates within Claude's context window with careful budget allocation:

| Component | Approximate Tokens |
|---|---|
| Core layer (cached) | ~1800 |
| Situation module (cached) | ~400-600 |
| Investigation overlay | ~100-200 |
| Compressed game state | ~2000-3000 (varies with world complexity) |
| Prior chapter summaries | ~200-500 per chapter |
| Pivotal scenes (permanent) | ~300 per scene |
| Current chapter messages | ~4000 (adaptive) |
| Tool definitions | ~1200 |

### 10.2 Cache Optimization Strategy

The `buildMessagesForClaude()` function constructs the message array with cache breakpoints:
1. System messages (core + situation) are stable across turns → cached
2. Prior chapter scene summaries injected as acknowledgment blocks
3. Pivotal scenes (permanent, never rotated)
4. **Cache breakpoint** placed at last "old" message: `cache_control: { type: 'ephemeral' }`
5. Compressed state injected AFTER cache marker as user message → state changes don't invalidate prefix

### 10.3 Memory Compression Strategies

- **Scene summaries**: 2-4 sentences per scene with tone signature. Chapter-scoped.
- **Pivotal scenes**: ~300 tokens each, permanent, never rotated. Max 2-3 per chapter.
- **Chapter summaries**: 2-3 sentences in `close_chapter.summary`. Stored in history.
- **NPC compression**: Scene-present NPCs get full detail; background NPCs get one-line summaries.
- **Thread compression**: Only active threads with worsening flags shown; resolved threads omitted.

### 10.4 Instrumentation

Session diagnostics tracked in `_instrumentation`:
- Turn counter, write outcomes, firewall results
- Latency samples, entity counts, field population tracking
- Rejection buffer (failed writes with rule violations)
- Continuity tracking (thread/arc/entity references across chapters)

---

## 11. Genre System Architecture

### 11.1 GenreConfig Interface

Each genre provides a complete configuration bundle:

```typescript
GenreConfig {
  id: Genre                            // 'space-opera' | 'fantasy' | 'cyberpunk' | 'grimdark' | 'noire' | 'epic-scifi'
  name, tagline, available: boolean

  // Character creation
  species[]: Species                   // origins with lore, mechanical advantages, starting contacts
  speciesLabel: string                 // "Species", "Origin", etc.
  classes[]: CharacterClass
  playbooks?: Record<originId, classes[]>

  // Visual theming
  theme: GenreTheme                    // OKLch colors, fonts, background effects, glow styles

  // Economy
  currencyName, currencyAbbrev, partyBaseName, settingNoun

  // Prompt content
  systemPromptFlavor: { role, setting, vocabulary, tutorialContext }
  promptSections: {
    role, setting, vocabulary, toneOverride, assetMechanic,
    traitRules, consumableLabel, tutorialContext, npcVoiceGuide,
    narrativeCraft, buildAssetState, investigationGuide
  }
  deepLore?, guideNpcDirective?, loreFacets?, cohesionGuide?

  // Labels
  companionLabel, notebookLabel, intelTabLabel, explorationLabel, heatLabel?

  // Content
  openingHooks[]: OpeningHook          // 107 total across genres (3/class + 4 universal per genre)
  initialChapterTitle: string
  locationNames[], npcNames?
  assetFlavors?                        // ship/base system names per genre
}
```

### 11.2 Available Genres

| Genre | Species/Origins | Key Mechanics |
|---|---|---|
| Space Opera | 5 species | Ship systems (engines/weapons/shields/sensors/crew_quarters) |
| Fantasy | 5 species | Traditional D&D flavor |
| Cyberpunk | 5 origins | Tech rig (neurofence/spectra/redline/panoptik/skinweave) |
| Grimdark | 5 species | Base systems (strength/morale/reputation/intelligence/provisions) |
| Noire | 5 backgrounds | Investigation-focused |
| Epic Sci-Fi | 6 origins | Species-keyed ship systems, origin shifting (hidden transformations) |

Stubbed (not yet available): western, zombie, wasteland, cold-war.

### 11.3 Origin Lore — Three Mechanical Layers

Each species/origin provides:
1. **Starting contact** at an explicit disposition tier (e.g., trusted informant, wary handler)
2. **Advantage** on specific check types (e.g., INT checks for Synod, protocol for Imperial Service)
3. **Vulnerability** — disadvantage or social cost (e.g., hunted by faction, disposition capped)

Lore is injected every turn as an `ORIGIN:` line in compressed state with a behavioral directive.

### 11.4 Origin Shifting (Epic Sci-Fi)

Post-transformation origins (hidden from player at creation):
- Stricken → Invisible to Power
- Entrenched → System's Voice
- Heretic → True Believer
- Hunted → Cornered Animal
- Dissident → Double Agent
- Rekindled → The Drift Returns

Each shifted origin modifies advantages, dispositions, and adds special once-per-chapter abilities.

### 11.5 Genre Theming

CSS variables switch via `[data-genre="..."]` attribute on the root element. Each genre defines a full OKLch color palette (primary, secondary, tertiary, accent, destructive), fonts, background effects (starfield, grid-overlay, mist, drift, grain), and glow styles.

---

## 12. UI Component Architecture

### 12.1 Component Hierarchy

```
RootLayout (layout.tsx)
  └── atmospheric background layers (starfield, grid, mist, drift, grain, orbs)
      └── GameScreen (game-screen.tsx) — central orchestrator
          ├── TopBar — fixed header: wordmark + chapter title + menu button
          ├── ScrollArea — message list
          │   ├── Chapter Headers
          │   ├── Scene Breaks (dividers)
          │   ├── ChatMessage[] — GM / player / meta / error messages
          │   ├── RollBadge[] — inline dice results
          │   └── Loading indicator
          ├── ActionBar — input + commands + HUDs
          │   ├── Quick Action Buttons (narrator suggestions)
          │   ├── Evidence Picker (two-stage /connect flow)
          │   ├── Slash Command Autocomplete
          │   ├── Meta Question Toggle
          │   ├── Text Input
          │   ├── Send Button
          │   ├── Close Chapter Button (conditional)
          │   ├── Operation HUD (active op name + objectives + phase)
          │   ├── Combat HUD (enemy health bars, animated)
          │   └── Syncing Indicator
          ├── DiceRollModal — overlay for active roll
          ├── BurgerMenu — side sheet with tabs
          │   ├── Character tab (stats, skills, traits, inventory)
          │   ├── World tab (NPCs, factions, location, threads, promises, antagonist, clocks)
          │   ├── Notebook tab (clues, connections, solved/archived)
          │   ├── Chapters tab (history + debrief)
          │   ├── Tokens/Debug tab (token log, debug entries)
          │   └── Save/Load tab (3 slots, BYOK, new game)
          └── ChapterCloseOverlay — end-chapter debrief + level up + next chapter
```

### 12.2 GameScreen — Central Orchestrator

The largest component (~28k tokens). Manages:
- `gameState` (GameState | null) — loaded from localStorage on mount
- `messages` (DisplayMessage[]) — display layer keyed by UUID
- `quickActions` (string[]) — suggested actions from narrator
- `rollPrompt` (RollPrompt | null) — active dice roll context
- `retryContext` — error recovery state
- Extraction refs — background extraction merging state

Key callbacks: `sendToGM()`, `handleCustomAction()`, `handleSlashCommand()`, `runAudit()`, `runShadowExtraction()`

### 12.3 DisplayMessage Types

```typescript
DisplayMessage {
  id: string                     // UUID for stable rendering
  type: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll' | 'scene-break' | 'chapter-header'
  content: string
  isError?: boolean
  statChanges?: StatChange[]
  rollData?: RollDisplayData     // for roll type
  rollBreakdown?: RollBreakdown  // enemy rolls
  originShift?: { from, to, mechanic, cost }
  sceneBreak?: string
}
```

### 12.4 ChatMessage Rendering

Type-specific styling:
- **GM**: left-aligned, accent border, custom markdown parser (headings, lists, bold/italic, horizontal rules). Stat change badges below. Flag button on hover for inconsistency reporting.
- **Player**: right-aligned (max 70% width), primary accent. Slash commands in mono + tertiary accent.
- **Meta Question**: right-aligned, italic, info color (blue).
- **Meta Response**: left-aligned with dot prefix, info color, markdown-rendered.
- **Error**: destructive border with retry button.

### 12.5 DiceRollModal

Full-screen modal for active skill checks:
- Supports d6/d8/d10/d12/d20 with rollType-aware headlines
- 800ms rolling animation (random numbers at 50ms intervals)
- Color-coded results: tertiary (critical), emerald (success), orange (failure), red (fumble)
- Shows "Rolled X + Y = Z" with advantage/disadvantage dual dice display

### 12.6 ActionBar — Evidence Picker

Two-stage clue connection flow triggered by `/connect`:
1. Select first clue (keyboard nav: ↑↓ Enter)
2. Select second clue (filtered to exclude already-paired)
3. Submits connection to GM
- Shows clue tier icons: ◆ (connection) / ◇ (clue)
- Tags show breakthrough count or discovery chapter

---

## 13. Data Flow — Full Turn Cycle

```
1. Player submits action (ActionBar)
   └── sendToGM(message, gameState)

2. Client → POST /api/game
   ├── Request: { message, gameState, isMetaQuestion, isInitial, rollResolution?, ... }
   └── Server builds:
       ├── System prompt: buildSystemPrompt(gameState, genre)
       ├── Messages: buildMessagesForClaude(history, sceneSummaries, pivotalScenes, state)
       └── Tools: [commit_turn, meta_response, chapter_setup]

3. Server → Anthropic SDK (streaming)
   └── Claude responds with text + tool calls

4. Server streams NDJSON events:
   ├── { type: 'text', content }     → accumulate into GM message
   ├── { type: 'roll_prompt', ... }  → pause stream, return to client
   ├── { type: 'tools', results }    → apply via applyToolResults()
   ├── { type: 'token_usage', ... }  → log for analytics
   ├── { type: 'debug_context', ... }→ debug panel
   └── { type: 'done' }             → stream complete

5. Client processes events:
   ├── text → append to GM message, auto-scroll
   ├── roll_prompt → show DiceRollModal, wait for roll
   ├── tools → extract stat changes, apply to gameState, show StateDiffBar
   └── done → save gameState to localStorage

6. Background processes (non-blocking):
   ├── Audit (every ~8 turns) — Haiku quality check
   └── Shadow extraction — parallel state enrichment
```

---

## 14. Stage 2 Architecture (SF2)

### 14.1 Overview

SF2 is a next-generation architecture being developed in parallel within `lib/sf2/` (~23 files). It decomposes the monolithic game route into specialized agents:

| Agent | Role |
|---|---|
| **Author** | Story authoring with payload generation and hydration |
| **Narrator** | Narrative generation from scene packets |
| **Arc-Author** | Multi-chapter arc structure design |
| **Archivist** | Story summarization and memory management |
| **Runtime** | Pressure ladders, graph pruning, antagonist facing |

### 14.2 SF2 API Routes

- `/api/sf2/narrator/route.ts` — Scene packet construction, pacing advisory, narrator-specific tools
- `/api/sf2/author/route.ts` — World state authoring
- `/api/sf2/archivist/route.ts` — Memory management
- `/api/sf2/arc-author/route.ts` — Arc/chapter structure
- `/api/sf2/chapter-meaning/route.ts` — Chapter summarization

### 14.3 SF2 Key Concepts

- **Working set retrieval**: scene packets assembled from entity relevance cues
- **Pacing advisory**: stagnation detection (not just turn counting)
- **Pressure ladders**: graduated narrative tension mechanics
- **Graph pruning**: entity lifecycle management (dormant → archived)
- **Display sentinel**: quality checks emitted as non-blocking observations
- **Malformed input salvage**: recovery layer for Claude tool-use errors

---

## 15. World State Systems — Complete Reference

### NPCs
- Disposition tiers (hidden): hostile → wary → neutral → favorable → trusted
- Combat tiers 1-5 (stat derivation for enemies)
- Temp load: stress/trauma entries with severity
- Signature lines: preserved pivotal quotes (permanent)
- Relations: structured social graph between NPCs
- Key facts: identity anchors (max 3)
- Retrieval cues: one-line relevance pointers for working set retrieval

### Threads
- Owner (faction or NPC driving the thread)
- Resolution criteria, failure mode
- Relevant NPCs (entities that trigger surface when mentioned)
- Deterioration tracking (worsening flag)
- Retrieval cues

### Promises
- To (NPC name) + what (commitment)
- Status lifecycle: open → strained → fulfilled/broken
- Anchored to threads/arcs

### Decisions
- Categories: moral / tactical / strategic / relational
- Witnessed flag (PC saw human cost → earns witness mark)
- Status: active → superseded/abandoned/spent
- Witness mark spending: decision_id → spent_on (consumed for drastic actions)
- Anchored to threads/arcs

### Tension Clocks
- 4 or 6 segments with fill tracking
- Status: active → triggered → resolved
- Trigger effect: narrative consequence when filled
- Visible to system prompt (CLOCKS section)

### Heat Tracker
- Per-faction exposure: none → low → medium → high → critical
- Reasons list (accumulated exposure events)

### Crew Cohesion
- Score 1-5 affecting crew roll advantages
- Log: chapter, companion, delta (+1/0/-1), reason, timestamp

### Antagonist
- Agenda, moves (timestamped), status (active/defeated/dead/fled)
- Moves are narrative actions taken off-screen

### Ledger
- Financial transactions with 3-layer dedup (batch + turn + ledger)
- Amount (negative = spending, positive = earning), description, day

### Origin Counters
- Genre-specific moral pressure: fealty, doubt, exposure, mandate, embers, etc.
- Auto-tick on origin events; moral decisions avoid auto-tick to prevent double-counting

---

## 16. Decision Persistence & Witness Marks

### 16.1 Current System (v1)

Decisions are recorded with category, context, and witness status. The 8-cap with auto-archive keeps the active decision list manageable. Witness marks (from decisions where the PC directly saw human cost) are spendable currency for drastic narrative actions.

### 16.2 v2 Decision Persistence Shaping (Planned)

> Note: Full design in `Storyforge - Decision Persistence Shaping v2.md`. Architecture integration points:

**Key integration surfaces for v2 decision persistence:**

1. **types.ts** — Decision type would need new fields for persistence scoring, decay tracking, and cross-chapter relevance signals.

2. **tool-handlers/world.ts** — Decision add/update logic would need persistence evaluation (which decisions matter long-term vs. are ephemeral).

3. **system-prompt.ts / compressGameState()** — The DECISIONS section of compressed state would need a persistence-aware selection algorithm (surface high-persistence decisions, rotate low-persistence ones).

4. **narrative.ts** — Chapter close would need to evaluate decision persistence for archival vs. active retention decisions.

5. **migrations/stage2.ts** — Existing decisions would need persistence scores backfilled via heuristics (witnessed decisions score higher, moral/strategic categories score higher than tactical).

6. **Anchoring system** — Decisions anchored to active arcs/threads have natural persistence; decisions whose anchors resolve could decay.

7. **Witness mark evolution** — Witness marks as a persistence amplifier (witnessed decisions are never auto-archived, remain loadable even across chapter boundaries).

The v2 system would build on the existing anchoring infrastructure (`anchored_to`, `retrieval_cue`) added by the Stage 2 migration, extending it with quantitative persistence scoring rather than binary active/archived status.

---

## 17. Key Architectural Patterns

### Single Batched Tool
All mutations flow through `commit_turn`. This ensures atomic state updates and simplifies the tool-processor dispatch. Claude sees one tool with many optional fields rather than dozens of individual tools.

### Immutable State Updates
All state handlers use the `{ ...state, field: newValue }` spread pattern. The tool processor returns a new GameState object; the original is never mutated.

### Multi-Layer Deduplication
Credits, inventory use, and ledger entries each have dedup guards at batch, turn, and history levels to prevent Claude from double-charging the player.

### Genre-Driven Everything
Genre config drives: character creation options, prompt flavor, CSS theming, currency names, ship/base systems, NPC name pools, location names, opening hooks, and origin mechanics. Adding a genre means writing one config file.

### Retrieval Cues (v2)
One-line pointers on NPCs, threads, promises, decisions, and clues that tell the working-set retrieval system when to surface each entity. This is the bridge between v1 (everything in context) and SF2 (selective retrieval).

### Prompt Cache Optimization
Stable content (core layer, situation module) cached in system messages. Dynamic content (compressed state, messages) placed after cache breakpoint. This maximizes Anthropic API cache hit rate and reduces costs.

### Background Processing
Audit and shadow extraction run as non-blocking background processes that don't interrupt the player's flow. Results merge into state on the next turn.

---

## Appendix A: File Inventory

### Core (lib/)
| File | Lines (approx) | Purpose |
|---|---|---|
| types.ts | 800+ | All TypeScript interfaces |
| tools.ts | 1200 | Tool definitions for Claude |
| tool-processor.ts | 350 | State mutation dispatch |
| system-prompt.ts | 4000 | Prompt assembly + compressed state |
| game-data.ts | 2000 | Persistence, migrations, character creation |
| rules-engine.ts | 1300 | D&D 5e mechanics |
| stream-parser.ts | 500 | NDJSON event parsing |
| genre-config.ts | 200 | Genre interface + registry |
| firewall.ts | 300 | Pre-submission validation |
| instrumentation.ts | 200 | Session diagnostics |

### Tool Handlers (lib/tool-handlers/)
| File | Purpose |
|---|---|
| character.ts | Character stat mutations |
| world.ts | World state mutations (~1000 lines) |
| combat.ts | Combat lifecycle |
| narrative.ts | Chapter, arc, scene management |
| setup.ts | Chapter 1 initialization |

### UI Components (components/game/)
| File | Tokens (approx) | Purpose |
|---|---|---|
| game-screen.tsx | 28,000 | Central orchestrator |
| action-bar.tsx | 8,000 | Input + HUDs + evidence picker |
| burger-menu.tsx | 12,000 | Side panel (6 tabs) |
| chat-message.tsx | 4,000 | Message rendering + markdown |
| dice-roll-modal.tsx | 3,000 | Interactive dice |
| roll-badge.tsx | 2,000 | Inline roll results |
| state-diff-bar.tsx | 1,500 | Stat change badges |
| top-bar.tsx | 500 | Fixed header |
| chapter-close-overlay.tsx | 4,000 | End-chapter debrief |
