# Storyforge System Architecture

Single-player AI RPG where Claude acts as Game Master. Next.js client app, Anthropic API for narrative generation. No backend database; all state persists in localStorage.

## Data Flow

```
Player Input
    |
game-screen.tsx (build request, detect meta/roll/close context)
    |
POST /api/game (stream to Claude via Anthropic SDK)
    |
Claude: narrative text + commit_turn tool call
    |
tool-processor.ts (apply state changes to GameState)
    |
rules-engine.ts (counters, thresholds, mutations, warnings)
    |
game-screen.tsx (capture scene summaries, scope signals, save)
    |
localStorage (persist GameState)
```

## Request Flow

1. Player types input in `game-screen.tsx`
2. Client POSTs to `/api/game` with: message, full GameState, flags (`isMetaQuestion`, `isInitial`, `isChapterClose`, `isAudit`, `rollResolution`, etc.)
3. API route builds a two-block system prompt (static instructions cached, dynamic state fresh) and conversation history
4. Claude streams narrative text back, then emits a `commit_turn` tool call containing all state mutations for the turn
5. The tool loop extracts the tool call. If `pending_check` is present, it pauses and sends a `roll_prompt` event to the client (see Roll Resolution below). Otherwise, tool results are sent back as a `tools` stream event.
6. Client receives stream events: `text` (narrative), `tools` (state mutations), `roll_prompt` (dice needed), `done`, `error`, `retrying`, `token_usage`
7. `applyToolResults()` in tool-processor.ts maps the snake_case commit_turn input to camelCase GameState mutations
8. `runRulesEngine()` evaluates genre-specific post-turn rules, increments persistent counters, injects threshold warnings
9. Client saves updated GameState to localStorage

## Key Components

### `app/api/game/route.ts`

API route handler. Core responsibilities:
- **Request validation** via Zod schema (message, gameState shape, all context flags)
- **System prompt construction** via `buildSystemBlocks()`, two `TextBlockParam` entries with cache_control on the static layer
- **Tool loop** (`runToolLoop`): streams Claude response, collects tool calls, handles pending_check interception. Typically single-pass (narrative + commit_turn). Multi-round for chapter close (up to 12 rounds).
- **Roll resolution continuation**: when `rollResolution` is present, reconstructs the conversation from `pendingMessages`, appends the roll result as a tool_result, and continues the Claude stream
- **Auto-chain damage**: after a successful combat hit roll, automatically sends a damage roll_prompt to the client without going back to Claude (parses weapon damage from inventory)
- **Overload retry**: catches 529/503/502, sends `retrying` event with delay, retries once
- **Branching paths**: normal turn, roll resolution, chapter close, audit (Haiku), summarize (Haiku), meta question

Model: configurable via `STORYFORGE_MODEL` env var, defaults to `claude-sonnet-4-6`.

### `lib/tools.ts`

Two tool definitions:
- **`commit_turn`**: single tool for all game state mutations. Called once per narrative response. Contains nested objects for `character`, `world`, `combat` changes plus `suggested_actions`, `pending_check`, `signal_close`, `close_chapter`, `debrief`, `chapter_frame`, `scene_end`. Snake_case schema matches what Claude produces; tool-processor converts to camelCase.
- **`meta_response`**: simple text response for meta questions and consistency checks.

Exported tool sets:
- `gameTools` = [commit_turn, meta_response]
- `auditTools` = [commit_turn]
- `metaTools` = [meta_response]

### `lib/tool-processor.ts`

Applies `commit_turn` input to GameState. Domain handlers:

- **Character**: hp_delta/hp_set, credits, inventory add/remove/use (charges), temp modifiers, trait updates, level-up (HP max, proficiency bonus), stat increases, exhaustion, inspiration, roll breakdowns
- **World**: NPCs (add/update with disposition, tempLoad, signature lines, combat tier), location, time, scene snapshot, threads, promises, decisions, factions, antagonist (establish/move/defeat), cohesion (score derivation from log), ship state, tension clocks (establish/advance/trigger/resolve), notebook (clues, connections with tier derivation and taint propagation), operation state, exploration state, timers, heat trackers, ledger
- **Combat**: start (spawn enemies), end (loot, credits)
- **Meta**: suggested_actions, chapter_frame, signal_close, close_chapter (archives messages, resets chapter-scoped state via `resetChapterCounters`), debrief, scene_end

Returns: updated GameState + array of `StatChange` objects for UI display.

### `lib/rules-engine.ts`

Client-side post-turn evaluation. Runs after each `commit_turn` is applied. Responsibilities:

- **Persistent counters** (`state.counters`): genre-specific counters that survive chapter close (e.g. `drift_exposure` in epic-scifi, `corruption` in grimdark)
- **Trait detection**: detects trait usage via commit_turn `trait_update` or roll skill name matching a trait name
- **Threshold mutations**: when counters cross thresholds, applies state changes (faction stance shifts, NPC disposition caps, warnings)
- **TempLoad breaking points**: evaluates NPC stress entries, triggers narrative consequences at severity thresholds
- **Cohesion derivation**: crew cohesion score derived from recent log entries
- **Roll sequence detection**: identifies consecutive failure/success streaks, records them as `RollSequence` entries
- **Chapter-scoped reset**: `resetChapterCounters()` clears chapter-scoped counters while preserving persistent ones
- **Warnings injection**: populates `state.rulesWarnings` each turn (reset before next evaluation)

Genre rules are registered per genre. Each provides an `evaluate()` function and optional `chapterResetCounters` list.

### `lib/system-prompt.ts`

Three-layer prompt composition:

1. **Core** (~1800 tokens): GM identity, tone rules, d20 mechanics, roll discipline, NPC voice guide, combat rules. Always loaded.
2. **Situation module** (~400-600 tokens): one of several modules selected by context detection (combat, social, planning, infiltration, investigation overlay). Only the relevant module ships per turn.
3. **Dynamic state** (variable): compressed GameState serialization, plus meta/consistency instructions if applicable.

Total static budget: ~2200-2500 tokens per turn (down from ~5500 monolithic).

Additional functions:
- `buildClosePrompt()`: dedicated chapter close instructions + state
- `buildAuditPrompt()`: lightweight state hygiene check instructions
- `buildMessagesForClaude()`: assembles conversation history with scene compression (scene summaries replace old messages to stay within context window)
- `buildInitialMessage()`: constructs the opening hook for new games/chapters
- `compressGameState()`: serializes GameState into a compact text block for the system prompt
- `detectContext()`: examines GameState to select the appropriate situation module

### `lib/types.ts`

Full type system. Key top-level interface:

```typescript
interface GameState {
  meta: MetaState           // version, chapter, genre, close signals
  character: CharacterState // stats, HP, AC, inventory, traits, skills
  world: WorldState         // NPCs, threads, promises, antagonist, ship,
                            // clocks, notebook, exploration, timers, heat
  combat: CombatState       // active flag, round, enemies, spatial state
  history: HistoryState     // messages, chapters, rollLog
  chapterFrame: ChapterFrame | null  // current objective + crucible
  sceneSummaries: SceneSummary[]     // compressed scene history
  scopeSignals: number               // chapter-scoped pacing counter
  npcFailures: NpcFailure[]          // per-NPC per-approach failure tracking
  counters: Record<string, number>   // persistent genre counters
  rulesWarnings: string[]            // injected by rules engine each turn
  pivotalScenes: PivotalScene[]      // permanent chapter-defining moments
  rollSequences: RollSequence[]      // detected roll patterns
}
```

### `lib/genres/*.ts`

Genre-specific configurations. Six active genres: space-opera, fantasy, grimdark, cyberpunk, noire, epic-scifi. Four stubs: western, zombie, wasteland, cold-war.

`GenreConfig` provides:
- `species` and `classes` with stat blocks, starting inventory, traits, HP/AC
- `theme`: full color palette, fonts, background effects, font scale
- `promptSections`: role, setting, vocabulary, tone override, asset mechanic, trait rules, NPC voice guide, investigation guide, tutorial context
- `openingHooks`: story starters (some class-filtered)
- `cohesionGuide`: genre-specific companion relationship rules
- `loreAnchors`: compact world facts shipped every turn
- UI labels: currency, companion, notebook, intel, exploration, heat

### `components/game/game-screen.tsx`

Main game UI. Client component. Responsibilities:
- Manages all game state in React state, synced to localStorage
- Builds and sends API requests with appropriate flags
- Parses SSE-style stream: accumulates `text` events, processes `tools` events through `applyToolResults` + `runRulesEngine`, handles `roll_prompt` by showing dice widget
- **Scope signal detection**: counts pacing signals from Claude per chapter
- **Scene summary capture**: extracts scene summaries from tool results for history compression
- **Roll prompt UI**: displays dice widget, captures player roll, sends `rollResolution` back to API
- **Chapter close orchestration**: triggers close sequence, displays overlay with debrief
- **Retry handling**: countdown display on overload, automatic retry
- **Audit trigger**: fires background Haiku audit periodically

## Special Flows

### Roll Resolution

1. Claude includes `pending_check` in `commit_turn` (skill, stat, DC, modifier, reason, optional advantage/disadvantage/contested)
2. API intercepts: applies the rest of commit_turn, sends `roll_prompt` stream event to client with `pendingMessages` (full conversation state) and `toolUseId`
3. Client shows dice widget. Player rolls (or system generates random d20).
4. Client sends new POST with `rollResolution` containing: roll value, raw rolls (for advantage), NPC roll (for contested), plus the `pendingMessages` and `toolUseId`
5. API resolves result (nat 20 = critical, nat 1 = fumble, roll + modifier vs DC), formats result text, appends as `tool_result` to conversation
6. If successful hit in combat: auto-chains damage roll (parses weapon damage dice from inventory, sends another `roll_prompt` without calling Claude)
7. Claude continues with the roll outcome, produces another `commit_turn` with narrative consequences

### Chapter Close

1. Claude sends `signal_close` in commit_turn when chapter feels complete (includes reason and self-assessment)
2. Client shows close button. Player triggers chapter close.
3. Client sends POST with `isChapterClose: true`
4. API uses `buildClosePrompt()` with up to 12 tool loop rounds for the full sequence: summary, key events, debrief (tactical/strategic grades, promises kept/broken, costs paid), level-up, next chapter frame, forward hook
5. `close_chapter` in commit_turn triggers: chapter archived with messages, chapter-scoped state reset (scene summaries, scope signals, chapter counters), persistent state preserved (counters, pivotal scenes, roll sequences)

### Audit

Background state hygiene check using Claude Haiku (`claude-haiku-4-5`). Fires periodically from the client (guarded by `auditInFlightRef`). Uses `buildAuditPrompt()` and `auditTools` (commit_turn only). Checks for inconsistencies in game state and can apply corrections via commit_turn.

### Meta Questions

Player prefixes input to trigger meta mode. Uses `metaTools` (meta_response only). Claude answers out-of-character from game state without advancing the story. Special `forge:dev` prefix enables dev mode for direct state manipulation.

### Summarize

On-demand "story so far" generation using Claude Haiku. Produces a 200-300 word narrative summary of the current chapter's messages.

## State Persistence

All state lives in localStorage. Design principles:

- **No migrations needed**: new optional fields default gracefully (nullish coalescing throughout)
- **Chapter close resets**: scene summaries, scope signals, chapter-scoped counters, NPC `movedThisChapter` flag
- **Chapter close preserves**: persistent counters, pivotal scenes, roll sequences, NPC tempLoad, decisions, roll log
- **Scene compression**: old messages are replaced by scene summaries to keep context window manageable. Completed chapters archive their messages separately.
- **Save slots**: `saveToSlot()` for manual save points alongside auto-save after every turn
