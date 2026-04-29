# Storyforge — Architecture v2

> Implementation reference for the Storyforge solo RPG engine.
> Documents the actual codebase as of April 2026.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prompt Composition](#2-prompt-composition)
3. [State Management](#3-state-management)
4. [Context Engineering](#4-context-engineering)
5. [Entity Model](#5-entity-model)
6. [Tool System](#6-tool-system)
7. [Harness & API Layer](#7-harness--api-layer)
8. [Archivist & Chapter Close](#8-archivist--chapter-close)
9. [Genre System](#9-genre-system)
10. [Operation System](#10-operation-system)
11. [Investigation System](#11-investigation-system)
12. [Shadow Extraction](#12-shadow-extraction)
13. [Rules Engine & Firewall](#13-rules-engine--firewall)
14. [Instrumentation](#14-instrumentation)
15. [UI Architecture](#15-ui-architecture)

---

## 1. System Overview

Storyforge is a Next.js application that runs a solo tabletop RPG through the Anthropic Claude API. The player interacts through a chat-style UI; Claude acts as Game Master, narrating the story and proposing dice rolls. All game state lives client-side in `localStorage` and is sent to the server on every turn.

The core loop is:

```
Player message → API route → buildSystemPrompt() + buildMessagesForClaude()
  → Claude streaming (narrative + commit_turn tool call)
    → pending_check? → pause for dice roll → resume with roll result
  → applyToolResults() → state mutation → save → render
```

Key files:

| File | Role |
|------|------|
| `lib/types.ts` | All entity types, GameState, WorldState |
| `lib/system-prompt.ts` | Prompt composition, compressed state, history window |
| `lib/tools.ts` | Tool schemas (commit_turn, meta_response, chapter_setup) |
| `lib/tool-processor.ts` | Dispatches tool results to domain handlers |
| `lib/tool-handlers/*.ts` | Domain-specific state mutation (character, world, combat, narrative) |
| `lib/game-data.ts` | Persistence, migration, save/load, initial state creation |
| `lib/stream-parser.ts` | Client-side SSE stream consumer, wires events to React state |
| `app/api/game/route.ts` | API route: Claude calls, tool loop, roll interception |
| `lib/genre-config.ts` → `lib/genres/*.ts` | Genre definitions (species, classes, hooks, lore) |
| `lib/rules-engine.ts` | Client-side post-turn rule evaluation |
| `lib/firewall.ts` | Canon validation (observe mode) |
| `lib/extraction-merge.ts` | Shadow extraction merge logic |
| `lib/shadow-diff.ts` | Diff engine for GM vs. extractor output |

---

## 2. Prompt Composition

**File:** `lib/system-prompt.ts` — `buildSystemPrompt()`

The system prompt is assembled from three independent layers, each occupying a separate position in the API request to maximize Anthropic's prompt cache hit rate.

### 2.1 Four-Component Return Shape

```typescript
function buildSystemPrompt(gameState, isMetaQuestion, flaggedMessage?, currentMessage?):
  { core: string; situation: string; stateContext: string; sysInstructions: string }
```

| Component | Position | Caching Behavior |
|-----------|----------|-----------------|
| `core` | system block 1 | Cached (stable across turns) |
| `situation` | system block 2 | Cached (changes only on context flip) |
| `stateContext` | user-role message (NOT system) | Never cached (changes every turn) |
| `sysInstructions` | system block 3 (optional) | Only present for meta/consistency |

The critical insight is that `stateContext` (compressed game state) was moved OUT of the system blocks into a user-role message injected before the player's turn. This prevents it from invalidating the BP4 cache prefix — the stable system prefix caches cleanly and BP4 only writes the incremental GM message per turn.

### 2.2 Layer 1: Core (~2200 tokens)

Built by `buildCoreLayer()`. Ships every turn, caches across turns. Five sections:

1. **GM Style** — Role definition ("Narrator / Referee / World Custodian"), guardrails (never break character, never narrate player emotions, never explain mechanics in prose), pre-narration check against scene snapshot, post-action checklist.

2. **Game Systems** — D20 mechanics (d20 + modifier vs DC), advantage/disadvantage triggers, skill selection rules (match the CHARACTER'S approach, not the situation), roll discipline ("roll when uncertain AND story advances"), passive perception, fail-forward patterns (The Compromise, The Cost, The Gap), forbidden constructions ("the miss reveal").

3. **Narration** — Limited third person locked to the PC, intent-over-action, tone balance (epic 60% / gritty 30% / witty 10% from genre config), response length guidance (100-200 words normal, 300-500 pivotal), NPC voice rules (rhythm not accents, never surface disposition labels), naming principles (short, specific, avoid AI defaults).

4. **Dramatic** — Chapter opening rules, antagonist method (genre-specific), difficulty engine (target weaknesses once/chapter, threads worsen, deferred promises resurface), world-moves-without-player mandate.

5. **Character** — Genre setting block, vocabulary, deep lore, and *sliced* trait rules. The function `sliceTraitRulesForClass()` extracts only the active class's trait rules from the full genre config, matching on significant words from the class name. This prevents loading every playbook's rules on every turn.

### 2.3 Layer 2: Situation Module (~400-600 tokens)

Built by `selectSituationModule()`. One primary module per turn, selected by `detectContext()`:

```typescript
type PromptContext = 'exploration' | 'combat' | 'infiltration' | 'social' | 'downtime'
```

Context detection priority:
1. `combat.active` → combat
2. Active infiltration clock (name includes "alert"/"exposure"/"detection") → infiltration
3. Hostile exploration state → infiltration
4. Operation in active/extraction phase → infiltration
5. Hostile NPCs or recent stealth language → infiltration
6. Active tension clocks → exploration
7. Safe location indicators (tavern, port, camp) + recent rest → downtime
8. Safe location → social
9. Default → exploration

**Modules:**

| Module | When | Key Content |
|--------|------|-------------|
| Tutorial | Chapter 1 | Three-beat onboarding sequence (dialogue → skill check → combat), lore budget cap, guide NPC directive |
| Combat | `combat.active` | Turn order, damage/healing rolls, spatial tracking, threat tiers T1-T5, environmental combat, death saves |
| Infiltration | Hostile/stealth | Escalation model (3 failures), cover identity DCs, exploration state tracking, operation state compliance |
| Planning | Social + planning signals | Assessment rolls as key challenge, operation state capture, NPC pushback, pacing limit (10 turns) |
| Social | Safe locations | Downtime pacing, NPC texture requirements, risky question roll gates, scope escalation refocus |

**Overlays and supplements:**
- **Investigation overlay** — Always appends to social/planning/infiltration (not combat). Clue discovery, connection tier system, tainted handling.
- **Asset mechanic** — Appends ship/rig rules when relevant (genre-dependent).
- **Lore facets** — Scene-keyed behavioral texture from `config.loreFacets`. Fires when scene content matches (e.g., 2+ NPCs with House affiliation → political facet, Synod NPC or keywords → synod facet).
- **Progression block** — Always loads (~150 tokens). Chapter frame rules, arc creation gates, turn budget ladder, reframe rules, close rules.
- **Fallback summaries** — One-line reminders of omitted modules so Claude knows they exist if context shifts.

### 2.4 Layer 3: Compressed Game State

Built by `compressGameState()`. This is the `stateContext` component — a dense, structured text block injected as a user-role message. It contains:

**Character block:**
```
PC: Kael | Veldran Envoy L3 | HP 18/22 | AC 13 | 340 cr | Prof +2 | PP 12 | Insp: no | he/him
STATS: STR 8 (-1) · DEX 14 (+2) · CON 12 (+1) · INT 10 (+0) · WIS 16 (+3) · CHA 14 (+2)
PROF: Insight, Persuasion, Perception, Deception
GEAR: Phase Pistol (1d6 energy), Medpatch ×2 [2/2 charges]
TRAITS: Diplomatic Immunity (1/1 per day)
TEMP: None
```

**World block:**
```
LOC: Pinnacle Station — Orbital corporate hub, restricted access
SCENE: Briefing room. Kael seated across from Dray. Renn at the console.
TIME: Day 14, late afternoon
CREW: Renn | Voice: Short sentences. Mechanical metaphors. | Vuln: silence after violence
COHESION: 4/5 — High | Recent: +1 (protected Renn during extraction)
FACTIONS: Helix — Suspicious; Synod — Hostile
NPCS: [SCENE] Dray [crew|FAVORABLE — shares if asked well...] — Engineer...
       [BG] Carren|Wary
THREADS: [WORSENING] The Hunt: Voss closing in; [STABLE] Pinnacle Data: Retrieved
PROMISES: To Renn: "Get Oshi's kid out" [strained]
```

**NPC rendering is context-sensitive:**
- Scene-present NPCs (at current location or mentioned in last 3 messages) get full detail blocks with voice notes, vulnerability, combat tier, relations, key facts, and disposition consequences.
- Background NPCs get one-line summaries.
- Cap of 20 non-crew NPCs, with scene-present bypassing the cap.
- Dense scene roster (6+ scene-present) triggers an authoritative identity + relationship graph header.

**Pacing engine (embedded in state):**
- Act detection: hook (turns 1-3) → development → crucible (combat/active ops/3+ clues) → resolution
- Roll drought warnings: context-aware thresholds (crucible: 2/3/5 turns; development: 4/5/7 turns)
- Turn budget warnings: escalating from turn 12 through hard cap at turn 25
- Close timing enforcement: resolved-objective ladder (1→2→4→6 turns) and turn-budget ladder (18→20→25)
- Roll gate detection: `detectRollGate()` scans the player's message for stealth/social/physical/tech/info verbs and injects a `[ROLL GATE]` directive into the state context

### 2.5 Cache Layout

The API route (`app/api/game/route.ts`) arranges cache breakpoints:

```
BP1: tools (stable per call-type — last tool gets cache_control: ephemeral)
BP2: tools + CORE (system block 1, cache_control: ephemeral)
BP3: tools + CORE + SITUATION (system block 2, cache_control: ephemeral)
BP4: tools + CORE + SITUATION + messages[0..-2] (last old message gets ephemeral)
     └─ stateContext injected AFTER BP4 marker (uncached, fresh every turn)
     └─ current player message (uncached)
```

On stable turns (same context module), BP3 hits. The message prefix (prior chapter scenes, pivotal moments, conversation history) caches at BP4 with only the new GM message as cache-write.

---

## 3. State Management

### 3.1 GameState Root

```typescript
interface GameState {
  meta: MetaState                    // version, chapter info, genre, close flags
  character: CharacterState          // stats, HP, inventory, traits, proficiencies
  world: WorldState                  // location, NPCs, threads, promises, operations, notebook
  combat: CombatState                // active flag, enemies, round, spatial state
  history: HistoryState              // messages, chapters, roll log
  chapterFrame: ChapterFrame | null  // objective, crucible, outcome spectrum
  storySummary: StorySummary | null   // legacy, kept for backward compat
  sceneSummaries: SceneSummary[]     // current chapter's scene compressions
  scopeSignals: number               // chapter-scoped scope creep counter
  npcFailures: NpcFailure[]          // per-NPC per-approach failure tracking
  counters: Record<string, number>   // persistent genre counters (drift_exposure, etc.)
  rulesWarnings: string[]            // injected by rules engine, reset before next turn
  pivotalScenes: PivotalScene[]      // permanent, never rotated
  rollSequences: RollSequence[]      // detected roll patterns
  arcs: StoryArc[]                   // multi-chapter narrative arcs
  _pendingSceneSummary?: boolean     // flag: location changed without scene_end
  _objectiveResolvedAtTurn?: number  // drives close timing enforcement
  _instrumentation?: Instrumentation // diagnostic counters
}
```

### 3.2 Persistence

**File:** `lib/game-data.ts`

All state lives in `localStorage` under `storyforge_gamestate`. Three manual save slots (`storyforge_save_1/2/3`) hold full `GameState` snapshots. Auto-save mirrors to the matching slot on every `saveGameState()` call (matched by character name + genre).

`loadGameState()` runs a migration cascade for backward compatibility:
- Backfills missing fields (skillPoints, tensionClocks, notebook, chapterFrame, operationState, explorationState, timers, heat, ledger, decisions)
- Genre-specific migrations (cyberpunk tech rig creation)
- Notebook migration (adds IDs to connections, renames clueIds→sourceIds, connected→connectionIds, backfills titles)
- Strips malformed decisions (missing summary/category)
- Runs `ensureSchemaVersionAndMigrate()` for Stage 2 migration (structured entity fields)
- Deduplicates NPCs by name (case-insensitive merge)

### 3.3 What's Persisted vs. Computed

**Persisted (in localStorage):** Everything in `GameState`. The full state is serialized on every turn.

**Computed per-turn (in compressed state / prompt):**
- Disposition consequences (hostile→"refuses help, attacks if provoked")
- Pressure gauge (consecutive success/failure streaks from roll log)
- Pacing act (hook/development/crucible/resolution)
- Roll drought count (turns since last roll)
- Turn budget warnings
- Close timing enforcement
- Roll gate detection (from player message verb scanning)
- NPC scene-presence classification
- Weak stats identification

**Transient flags (cleared after one turn):**
- `_pendingSceneSummary` — set when `set_location` fires without `scene_end`
- `_noCommitLastTurn` — set when Claude fails to call `commit_turn`
- `_signalCloseDeferred` — set when `signal_close` is blocked (pending check or missing scene_end)
- `_depletedItemUseAttempt` — set when a 0-charge item use is rejected

---

## 4. Context Engineering

### 4.1 Adaptive History Window

**File:** `lib/system-prompt.ts` — `buildMessagesForClaude()`

```typescript
const TARGET_HISTORY_TOKENS = 4000
const AVG_TOKENS_PER_CHAR = 0.3
const MIN_MESSAGE_FLOOR = 6        // At least 3 full player-GM turns
const OPERATION_TOKEN_BOOST = 1000  // Extra budget during active ops
```

The history window works backward from the most recent message, accumulating token estimates until the budget is hit. Active operations or exploration state add 1000 tokens to the budget to preserve tactical context.

Messages are mapped: `player`/`meta-question` → `user` role, `gm`/`meta-response` → `assistant` role. Scene-break and roll messages are not included in the conversation history.

### 4.2 Cross-Chapter Memory

Three mechanisms preserve context across chapters:

1. **Chapter summaries** — Each completed chapter stores a 2-3 sentence `summary` and `keyEvents`. Recent chapters show summary + key events; older chapters show summary only. These are rendered in the compressed state's HISTORY section.

2. **Scene summaries on completed chapters** — When a chapter completes, its `sceneSummaries` array is stored on the chapter record. These are injected as a `[PRIOR CHAPTER SCENES]` user-role message at the start of the conversation, with tone signatures. Scene summaries are cleaned up when their associated arc resolves.

3. **Pivotal scenes** — Permanent, never-rotated `PivotalScene` records (title + ~300-token summary) are injected as `[PIVOTAL MOMENTS]`. Created during the Phase 3 close sequence by the narrative curator.

### 4.3 Cache Breakpoint Strategy

The last message before the current player input gets `cache_control: { type: 'ephemeral' }`, creating BP4. Everything before it (system blocks + old conversation) stays in the cached prefix. The per-turn state context is injected AFTER this marker so it doesn't poison the cache.

### 4.4 Token Budget Analysis

Approximate per-turn budget:

| Section | Tokens |
|---------|--------|
| Core layer | ~2200 |
| Situation module | ~400-600 |
| Compressed state | ~800-2000 (varies with entity count) |
| History window | ~4000 (5000 during ops) |
| Player message | ~50-200 |
| **Total input** | **~7500-10000** |

---

## 5. Entity Model

### 5.1 Characters

```typescript
interface CharacterState {
  name: string; species: string; class: string; gender: 'he' | 'she' | 'they'
  level: number; hp: { current: number; max: number }; ac: number; credits: number
  stats: StatBlock                    // STR, DEX, CON, INT, WIS, CHA
  proficiencies: string[]             // skill proficiency names
  proficiencyBonus: number
  inventory: InventoryItem[]          // id, name, description, quantity, damage?, effect?, charges?
  tempModifiers: TempModifier[]       // temporary stat bonuses with duration
  traits: Trait[]                     // class abilities with uses per day
  skillPoints: SkillPoints            // available points + allocation log
  inspiration: boolean; exhaustion: number  // 0-6
}
```

Created by `createInitialGameState()` from genre config. Stats, inventory, traits, HP, AC, and credits come from the selected class definition. Level-up happens during the chapter close sequence (Phase 1).

### 5.2 NPCs

```typescript
interface NPC {
  name: string; description: string; lastSeen: string
  role?: 'crew' | 'contact' | 'npc'
  subtype?: 'person' | 'vessel' | 'installation'
  disposition?: DispositionTier       // hostile | wary | neutral | favorable | trusted
  affiliation?: string                // faction grouping
  voiceNote?: string                  // speech rhythm guidance
  keyFacts?: string[]                 // immutable identity anchors, max 3
  relations?: { name: string; type: string }[]
  vulnerability?: string              // what hits this companion harder
  combatTier?: 1 | 2 | 3 | 4 | 5
  combatNotes?: string
  tempLoad?: TempLoadEntry[]          // psychological/emotional load (crew only)
  signatureLines?: string[]           // 2-4 preserved exact quotes
  status?: 'active' | 'dead' | 'defeated' | 'gone'
}
```

NPCs are created via `world.add_npcs` in commit_turn and updated via `world.update_npcs`. Pre-populated at game creation from `startingCrew` and `startingContacts` in the genre config, with random names from the genre's NPC name pool.

**Drift detection:** `detectNpcDrift()` runs post-turn, checking for: relations referencing non-existent NPCs, NPCs added without relations or keyFacts (identity-thin), and duplicate names.

### 5.3 Threads

```typescript
interface Thread {
  id: string; title: string; status: string; deteriorating: boolean
}
```

Stage 1 measurement fields (on tool schema, not type): `owner`, `resolution_criteria`, `failure_mode`, `relevant_npcs`. Stage 2: `retrieval_cue`. These are present in the tool schema as optional fields with measurement logging — the system tracks how often Claude populates them.

### 5.4 Promises

```typescript
interface Promise {
  id: string; to: string; what: string
  status: 'open' | 'strained' | 'fulfilled' | 'broken'
}
```

Lifecycle: open → strained (deferred twice) → broken (third deferral). Two-chapter rule: no progress → auto-strained.

### 5.5 Decisions

```typescript
interface Decision {
  id: string; summary: string; context: string
  category: 'moral' | 'tactical' | 'strategic' | 'relational'
  status: 'active' | 'superseded' | 'abandoned' | 'spent'
  chapter: number; witnessed?: boolean; spentOn?: string
}
```

Decisions with `witnessed: true` are **witness marks** — narrative currency the player can spend for advantage on morally drastic actions. When spent, status flips to `'spent'` and `spentOn` records what the mark purchased.

### 5.6 Story Arcs

```typescript
interface StoryArc {
  id: string; title: string
  status: 'active' | 'resolved' | 'abandoned'
  episodes: Episode[]
  outcomeSpectrum?: OutcomeSpectrum
  stakesDefinition?: string          // what this arc defines about the character's stance
  spansChapters?: number             // declared span (>=3)
  introducedInChapter?: number
}

interface Episode {
  chapter: number; milestone: string
  status: 'pending' | 'active' | 'complete'
  summary?: string; outcomeTier?: 'clean' | 'costly' | 'failure' | 'catastrophic'
}
```

Arcs are campaign-level stakes spanning 3+ chapters. Creation is validated: episodes must be 2-4, `spansChapters` >= 3, `stakesDefinition` must exist and not duplicate the title, active arcs capped at 5. The prompt includes explicit tests ("Does this span 3+ chapters? Is there a single resolving action?") to prevent thread-scale items from being created as arcs.

### 5.7 Other Entities

**Antagonist** — Single `Antagonist | null` with name, description, agenda, moves log, and `movedThisChapter` flag. Actions: establish, move, defeat.

**Tension Clocks** — `TensionClock` with 4 or 6 max segments. Actions: establish, advance, trigger, resolve. Must advance once before resolving.

**Assessments** — Part of `OperationState`. Claims with skill, result, confidence, and `rolled: boolean`. Unrolled assessments show "NO ROLL" in compressed state.

**Notebook (Clues & Connections)** — See section 11.

**Exploration State** — `ExplorationState` with facility name, hostile flag, explored/current/unexplored zones, resources, and alert level.

**Timers, Heat, Ledger** — Hard deadlines, per-faction exposure levels, and transaction history respectively.

**Crew Cohesion** — Score 1-5 with log of changes. Mechanical effects: 5=advantage on crew rolls, 2=disadvantage, 1=self-interest.

---

## 6. Tool System

### 6.1 Tool Definitions

**File:** `lib/tools.ts`

Three tools are defined:

**`commit_turn`** — The single tool for all game state mutations. Called ONCE at the end of every narrative response. Required field: `suggested_actions` (3-4 contextual options). All other fields are optional delta-based mutations:

- `character.*` — HP delta, credits delta, inventory add/remove/use, temp modifiers, trait updates, level-up, stat increase, exhaustion, proficiency, inspiration, roll breakdown
- `world.*` — NPCs (add/update), location, time, scene snapshot, threads, factions, promises, decisions, operation, exploration, timers, heat, ledger, cohesion, disposition changes, antagonist, clocks, clues, connections, ship
- `combat.*` — Start (enemies), update enemies (HP delta), end (outcome + loot)
- `pending_check` — Proposes a skill check; client pauses for dice roll
- `chapter_frame`, `reframe`, `signal_close`, `close_chapter`, `debrief` — Chapter lifecycle
- `scene_end`, `scene_summary`, `tone_signature` — Scene boundary tracking
- `objective_status` — Chapter frame objective evaluation
- `origin_event` — Origin-specific moral counter tick
- `spend_witness` — Witness mark spending
- `arc_updates` — Create/advance/resolve/abandon arcs, add episodes
- `pivotal_scenes` — Permanent scene memories (close prompt only)

**`meta_response`** — Answers out-of-character `[META]` questions. Returns direct factual content without advancing the story.

**`chapter_setup`** — Batch initialization for Chapter 1. Creates NPCs, sets location, establishes factions and threads in a single call before the GM narrates.

### 6.2 Tool Dispatch

**File:** `lib/tool-processor.ts` — `applyToolResults()`

The main entry point dispatches to four domain handlers:

```typescript
if (input.character) updated = applyCharacterChanges(...)
if (input.world)     updated = applyWorldChanges(...)
if (input.combat)    updated = applyCombatChanges(...)
// origin_event + spend_witness handled inline
updated = applyNarrativeChanges(...)  // always runs (chapter frame, reframe, signal_close, close, debrief, scene summaries)
```

Domain handlers live in `lib/tool-handlers/`:
- `character.ts` — HP math, inventory management, charge tracking, level-up
- `world.ts` — NPC creation/update, location changes, thread management, clock lifecycle, notebook operations (clue creation, connection tier derivation), operation/exploration state, timers, heat, ledger, disposition changes, antagonist actions
- `combat.ts` — Enemy HP tracking, auto-removal at 0 HP, combat end with loot
- `narrative.ts` — Chapter frame (with cooldown-gated mid-chapter refinement), reframe (archives prior frame, resets close state), signal_close (blocked during pending_check), close_chapter (archives messages, resets chapter-scoped state), debrief, scene summaries
- `setup.ts` — Chapter 1 batch initialization

### 6.3 Tool Processing Pipeline

After `applyToolResults()`, the stream parser (`lib/stream-parser.ts`) runs additional post-processing:

1. **Scene summary creation** — If `scene_end` was signaled, creates a `SceneSummary` with text, scene number, message index range, and tone signature.
2. **Scope signal counting** — Tracks scope-expanding actions (new location, 3+ new NPCs, antagonist established, new clock, new timer, new operation).
3. **Rules engine** — `runRulesEngine()` evaluates genre-specific rules, increments persistent counters, and injects threshold warnings.

---

## 7. Harness & API Layer

### 7.1 API Route

**File:** `app/api/game/route.ts`

Single POST endpoint handling all request types via discriminating flags:

| Flag | Purpose | Model |
|------|---------|-------|
| (none) | Normal player turn | Sonnet (configurable via `STORYFORGE_MODEL`) |
| `isMetaQuestion` | Out-of-character question | Sonnet |
| `rollResolution` | Phase 2: continue after dice roll | Sonnet |
| `rollFirstResult` | Roll-first: client-derived check, player already rolled | Sonnet |
| `isChapterClose` + `closePhase` | Chapter close (1, 2, or 3) | Sonnet |
| `isChapter1Setup` | Pre-narration Chapter 1 initialization | Sonnet |
| `isAudit` | State hygiene check | Haiku |
| `isSummarize` | Story-so-far summary generation | Haiku |
| `isShadowExtraction` | Background state extraction | Sonnet |
| `isConsistencyCheck` | Player-flagged inconsistency review | Sonnet |

### 7.2 The Tool Loop

`runToolLoop()` handles Claude streaming + tool calls:

```typescript
async function runToolLoop(
  systemPrompt, initialMessages, send, interceptRolls,
  options?: { model?, tools?, maxRounds?, maxTokens?, thinkingBudget? }
): Promise<{ toolResults, messages, hitRoll }>
```

The loop streams text events, accumulates tool calls, and handles:

1. **pending_check interception** — When `commit_turn` contains `pending_check`, the loop applies all other state changes, emits the accumulated tools, sends a `roll_prompt` event to the client, and returns `hitRoll: true`. The client shows the dice widget; the player rolls; the result comes back as a new request with `rollResolution`.

2. **Roll result continuation** — The roll result text includes detailed instructions for success vs. failure narration, plus an "already applied" note listing state changes from the pre-roll commit_turn to prevent double-application.

3. **Auto-chained damage rolls** — After a successful combat hit, the system checks the character's weapon for a damage dice pattern and automatically sends a damage `roll_prompt` without waiting for Claude.

4. **Truncation recovery** — If `stop_reason === 'max_tokens'`, the system retries at 16K max_tokens.

5. **Missing suggested_actions recovery** — `ensureActions()` sends a follow-up if the GM's commit_turn lacked `suggested_actions`.

### 7.3 Streaming Protocol

The server sends newline-delimited JSON events (`StreamEvent` type):

```typescript
type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'roll_prompt'; check, stat, dc, modifier, reason, toolUseId, pendingMessages, ... }
  | { type: 'tools'; results: ToolCallResult[] }
  | { type: 'chapter_title'; title: string }
  | { type: 'done' }
  | { type: 'retrying'; delayMs, reason }
  | { type: 'error'; message }
  | { type: 'token_usage'; usage: TokenUsage }
  | { type: 'debug_context'; label, content, tokenEstimate }
  | { type: 'truncation_warning'; outputTokens, toolUseBlocks, round, hasTools, model }
  | { type: 'instrument'; channel, line, payload? }
```

### 7.4 Error Handling

Overload detection (`status 529/503/502`) triggers exponential backoff retries (5s → 10s → 20s, max 3 attempts). The client receives `retrying` events during the wait. BYOK (bring-your-own-key) is supported via `x-anthropic-key` header.

---

## 8. Archivist & Chapter Close

### 8.1 Three-Phase Close Sequence

**File:** `lib/system-prompt.ts` — `buildClosePhasePrompt()`

The chapter close is a three-phase process, each phase being a separate API call:

**Phase 1: Audit + Close + Level-Up + Next Frame**
- Model: Sonnet
- Audits threads, promises, clocks, antagonist, operation state
- Emits `close_chapter` with summary, key_events, next_title, resolution_met, forward_hook, outcome_tier
- Emits `character.level_up` with calculated HP increase (hit die avg + CON mod, min 1)
- Emits `chapter_frame` for the next chapter
- Advances arc episodes if applicable

The handler pre-calculates level-up values:
```typescript
const hitDie = classConfig?.hitDieAvg ?? 5
const conMod = getStatModifier(gameState.character.stats.CON)
const hpIncrease = Math.max(1, hitDie + conMod)
```

**Phase 2: Skill Points + Debrief**
- Model: Sonnet
- Awards 0-2 skill proficiencies based on creative use of non-proficient skills
- Emits `debrief` with tactical analysis, strategic assessment, lucky breaks, costs paid, promises kept/broken
- Receives the FULL ROLL LOG from the completed chapter for data-driven analysis

**Phase 3: Narrative Curation**
- Model: Sonnet
- Receives the full chapter transcript
- Emits `pivotal_scenes` (2-3 moments with ~200-token summaries preserving imagery and dialogue)
- Emits `world.update_npcs` with `add_signature_line` for 1-2 major NPCs

### 8.2 State Reset on Close

When `close_chapter` fires in `applyNarrativeChanges()`:

- Archives current messages onto the completed chapter record
- Creates next chapter record (in-progress, empty)
- Resets: `sceneSummaries`, `_pendingSceneSummary`, `_objectiveResolvedAtTurn`, `scopeSignals`, `npcFailures`
- Resets per-chapter counters via `resetChapterCounters()`
- Preserves: `pivotalScenes`, `arcs`, persistent counters, roll log (cleared on next chapter start after Phase 2 uses it)
- Resets antagonist's `movedThisChapter` flag

### 8.3 Outcome Spectrum

Each chapter frame includes a four-tier `OutcomeSpectrum`:
```typescript
interface OutcomeSpectrum {
  clean: string        // objective met, costs manageable
  costly: string       // objective met, something significant lost
  failure: string      // objective not met, story pivots through a worse door
  catastrophic: string // everything changes, arc compromised
}
```

The close Phase 1 GM decides which tier was reached (`outcomeTier`). This influences arc episode advancement: clean/costly → advance to next planned episode; failure → pivot next milestone; catastrophic → restructure remaining episodes.

---

## 9. Genre System

### 9.1 Genre Config Structure

**Files:** `lib/genres/index.ts`, `lib/genres/*.ts` (space-opera, fantasy, cyberpunk, grimdark, noire, epic-scifi)

Each genre provides a `GenreConfig`:

```typescript
interface GenreConfig {
  id: Genre; name: string; tagline: string
  species: Species[]                  // origin/background options
  classes: CharacterClass[]           // playbook options
  playbooks?: Record<string, CharacterClass[]>  // origin-specific playbooks
  theme: GenreTheme                   // colors, fonts, visual effects
  currencyName: string; currencyAbbrev: string
  partyBaseName: string               // "Crew", "Company", "Network"
  locationNames: string[]             // random pool for ship/base names
  npcNames: string[]                  // random pool for NPC names
  openingHooks: (string | HookObject)[]  // tagged by class/origin
  initialChapterTitle: string
  startingCrew?: StartingCrewTemplate[]
  promptSections: PromptSections      // all genre-specific prompt text
  loreFacets?: Record<string, string> // scene-keyed lore overlays
  loreAnchors?: string[]              // persistent lore reminders
  deepLore?: string                   // extended worldbuilding text
  cohesionGuide?: string              // genre-specific cohesion rules
  heatLabel?: string                  // "HEAT" / "EXPOSURE" / etc.
  assetFlavors?: Record<string, AssetFlavor>  // origin-specific ship/asset variants
}
```

### 9.2 How Genres Customize

Genres customize three layers:

1. **Prompt content** — Each genre's `promptSections` provides: `role` (GM identity), `setting` (world description), `vocabulary` (terminology), `toneOverride`, `tutorialContext`, `investigationGuide`, `npcVoiceGuide`, `narrativeCraft`, `assetMechanic`, `traitRules`, `consumableLabel`, `buildAssetState` (function that renders ship/asset state).

2. **Entity configuration** — Species/classes define stat blocks, starting inventory, traits, HP/AC, and opening hooks. Hooks can be tagged to specific origins or classes. The `openingKnowledge` field on classes seeds character interiority for Chapter 1 worldbuilding.

3. **Visual theming** — `GenreTheme` controls all visual aspects including fonts, colors, background effects (starfield, mist, static, drift), and logo.

### 9.3 Active Genres

| Genre | Setting | Currency | Asset |
|-------|---------|----------|-------|
| space-opera | Far-future space | Credits (cr) | Ship (hull + 5 systems) |
| fantasy | High fantasy | Gold (gp) | None |
| cyberpunk | Near-future dystopia | Credits (¥) | Tech Rig (neurofence, spectra, etc.) |
| grimdark | Dark mercenary fantasy | Marks (mk) | Company (strength, morale, etc.) |
| noire | 1940s-style noir | Dollars ($) | None |
| epic-scifi | Political sci-fi with drift magic | Influence (inf) | Retinue/Network (origin-specific) |

---

## 10. Operation System

### 10.1 Five-Phase Lifecycle

```typescript
interface OperationState {
  name: string
  phase: 'planning' | 'pre-insertion' | 'active' | 'extraction' | 'complete'
  objectives: OperationObjective[]    // ordered priority stack
  tacticalFacts: string[]             // confirmed intel
  assetConstraints: string[]          // what each unit can/cannot do
  abortConditions: string[]
  signals: string[]                   // who signals what and how
  assessments: Assessment[]           // claims with confidence + rolled flag
}
```

**Phase transitions:**
- `planning` → Player commits to a plan; captured via `world.set_operation`
- `pre-insertion` → Optional staging phase
- `active` → Execution begins; the moment the player acts on the plan
- `extraction` → Objectives met or abandoned; getting out
- `complete` → Clear via `set_operation: null`

### 10.2 Prompt Integration

During active operations, the compressed state renders the full operation block (objectives with status marks, tactical facts, assessments with rolled/unrolled flags). The planning module and infiltration module both read operation state. Context detection routes to infiltration during active/extraction phases.

The operation token boost (+1000 tokens to history window) ensures tactical context survives across the longer message sequences typical of operations.

### 10.3 Assessment Tracking

Assessments are facts asserted during planning. Each has a `rolled` flag — unrolled assessments appear as "NO ROLL" in state, prompting Claude to address them. Confidence levels (low/moderate/high) calibrate how much the GM trusts the assessment.

---

## 11. Investigation System

### 11.1 Notebook Structure

```typescript
interface Notebook {
  activeThreadTitle: string
  clues: Clue[]
  connections: ClueConnection[]
}
```

### 11.2 Clues

```typescript
interface Clue {
  id: string; title?: string; content: string; source: string
  tags: string[]; discoveredChapter: number
  connectionIds: string[]              // connections this clue participates in
  isRedHerring: boolean
  status?: 'active' | 'solved' | 'archived'
}
```

Clues are created via `world.add_clues` in commit_turn. If a `clue_id` is provided, the existing clue is updated instead of creating a duplicate. The `isRedHerring` flag is GM-internal — never surfaced to the player. Failed Investigation checks produce red herring clues with plausible-but-wrong content, treated as true in narrative.

### 11.3 Connections & Tier Derivation

```typescript
interface ClueConnection {
  id: string; sourceIds: string[]      // clue IDs or connection IDs (exactly 2)
  title: string; revelation: string
  tier: ConnectionTier                 // 'lead' | 'enriched' | 'breakthrough'
  tainted: boolean                     // true if any source is a red herring
  status?: 'active' | 'solved' | 'archived' | 'disproven'
}
```

**Tier derivation logic** (in `world.ts` handler):
- Clue + Clue → **Lead**
- Lead + Clue → **Enriched** lead
- Lead + Lead → **Breakthrough**
- Breakthrough + anything → **Breakthrough** (deeper)

The handler computes tier automatically from the source types. `tainted` is computed from whether any source clue has `isRedHerring: true` — a tainted connection generates plausible-but-wrong revelations. The `[TAINTED]` tag is visible in compressed state for Claude but never appears in player-facing narrative.

### 11.4 Investigation Overlay

The investigation module appends to social/planning/infiltration contexts (not combat). It defines:
- Clue discovery: active investigation → pending_check; passive perception auto-notice
- Connection proposals: strong reasoning → INT Investigation at DC 10/14/18 by tier
- NPC experts can add connections directly without rolls

---

## 12. Shadow Extraction

### 12.1 Architecture

The shadow extraction system runs a second Claude call after the GM's narrative turn to extract state mutations the GM may have missed. It uses the SAME system prompt and conversation history (hitting prompt cache from the GM call), with the GM's narrative appended as an assistant turn and a detailed extraction instruction as the final user turn.

### 12.2 Extraction → Merge

**File:** `lib/extraction-merge.ts`

`buildSupplementalCommit()` compares the extraction's commit_turn against the GM's commit_turn using `diffCommitTurns()` from `lib/shadow-diff.ts`. It produces a synthetic `ToolCallResult[]` containing ONLY fields the GM missed (extraction-only), which feeds through `applyToolResults()` for normal state mutation.

**Skip fields** — Fields the extraction should never override (GM-only judgment calls): `suggested_actions`, `pending_check`, `signal_close`, `close_chapter`, `debrief`, `chapter_frame`, `objective_status`, `pivotal_scenes`, `arc_updates`.

**Diff categories:** match, gm-only, extraction-only, disagree. For array fields (NPCs, threads, clocks), per-item union: only items the GM didn't include are supplemented.

### 12.3 Anti-Invention Rules

The extraction prompt includes strict anti-invention rules with concrete examples. The test: "Can you quote the phrase from the narrative that states or clearly implies this fact? If no, do not emit it." This prevents the extractor from inferring concrete specifics (names, numbers, connections) that the narrative didn't introduce.

---

## 13. Rules Engine & Firewall

### 13.1 Rules Engine

**File:** `lib/rules-engine.ts`

Client-side, runs after every `commit_turn` via `runRulesEngine()`. Evaluates genre-specific rules using trait detection (from commit_turn fields or roll skill names), increments persistent counters, and injects threshold warnings into `rulesWarnings`. Warnings appear in the next turn's compressed state.

Genre rules handle things like: drift exposure for Conduit class, chrome stress for cyberpunk, favor balance, deep dive cooldowns. Per-chapter counters reset on chapter close; persistent counters survive.

### 13.2 Canon Firewall

**File:** `lib/firewall.ts`

Validation rules organized in four groups:
- **Group A (Required):** `lib/firewall/rules/required.ts` — Required field validation
- **Group B (Identity):** `lib/firewall/rules/identity.ts` — Identity consistency
- **Group C (Reference):** `lib/firewall/rules/reference.ts` — Referential integrity
- **Group D (Scene):** `lib/firewall/rules/scene.ts` — Scene consistency

Currently in **observe mode** (`FIREWALL_MODE = 'observe'`). Rules fire, emit structured `RejectionRecord` observations, but never block writes. Designed for a Batch 2 flip to `'enforce'` mode.

Each rule implements:
```typescript
interface FirewallRule {
  id: string
  appliesTo: (write: FirewallWrite) => boolean
  check: (write: FirewallWrite, state: GameState) => FirewallResult | null
}
```

---

## 14. Instrumentation

### 14.1 Session Instrumentation

**File:** `lib/instrumentation.ts`, `lib/instrumentation/*.ts`

The `_instrumentation` field on GameState tracks diagnostic counters per session:

- **Write outcomes** — success/partial/malformed, broken out by write type and actor
- **Firewall** — total/block/warn counts, by rule
- **Extractor** — runs, empty, supplements, rescues, conflicts
- **Turns** — total, commitDropped, withCheck, combatActive, roll streak tracking
- **Latency** — TTFT, generation, extractor, total, dynamic block token samples
- **Entity tracking** — created/updated counts by type, field population rates on create
- **Witness marks** — created/spent counts
- **Temp load** — incidents/triggered counts
- **Continuity tracking** — cross-chapter thread/arc persistence data

### 14.2 Write Attribution

**File:** `lib/instrumentation/write-attribution.ts`

Every sub-write in a commit_turn is tagged with an actor (`gm`, `extractor`, `audit`, `setup`, `close_phase`, `client`, `user_action`) and emitted as an `instrument` stream event. This enables measuring which actor contributes what state mutations.

---

## 15. UI Architecture

### 15.1 Application Structure

Next.js App Router with these pages:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/play` | `app/play/page.tsx` | Main game screen (V1) |
| `/play/v2` | `app/play/v2/page.tsx` | V2 game screen |
| `/chronicles` | `app/chronicles/page.tsx` | Published campaign browser |
| `/chronicles/[slug]` | `app/chronicles/[slug]/page.tsx` | Individual chronicle |

### 15.2 Stream Parser

**File:** `lib/stream-parser.ts`

The `StreamParserState` accumulates across stream events:

```typescript
interface StreamParserState {
  gmText: string                      // accumulated narrative text
  gameState: GameState                // evolving state
  statChanges: StatChange[]           // visual change indicators
  lastRollBreakdown?: RollBreakdown   // enemy attack display
  finalActions: string[]              // suggested action buttons
  sceneEndSummary?: string            // scene boundary text
  sceneToneSignature?: string         // emotional register label
  lastCommitInput?: Record<string, unknown>  // raw commit_turn for debugging
}
```

`processStreamEvent()` handles each event type and calls into `StreamParserCallbacks` for React/UI side effects (text updates, roll prompts, token usage, quick actions, error handling, etc.).

The parser includes debug context deduplication — the static system block is ~2200 tokens and only emits the full content on first sight or change, using a fingerprint hash to detect stability.

### 15.3 Game Loop (Client Perspective)

1. Player types message or clicks a suggested action
2. Client sends POST to `/api/game` with full `GameState` + message + flags
3. Client creates `StreamParserState` and processes SSE events
4. On `text` events: progressive narrative rendering
5. On `roll_prompt`: pause, show dice widget, player rolls
6. On roll: send new request with `rollResolution` + pending messages
7. On `tools`: apply state changes via `applyToolResults()`
8. On `done`: finalize state, run rules engine, save to localStorage, update UI
9. Periodically (every ~5 turns): fire audit request (Haiku)
10. After GM narrative: fire shadow extraction request
11. On chapter close: three sequential phase requests

---

*This document reflects the Storyforge codebase as of April 2026. The `lib/sf2/` directory contains work-in-progress V2 architecture components (multi-agent narrator/author/archivist split, scene kernel, retrieval packets, pressure system) that are not yet integrated into the main game loop.*
