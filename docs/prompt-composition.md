# Prompt Composition

Technical reference for how Storyforge assembles the system prompt sent to Claude on each turn.

Source: `lib/system-prompt.ts`

---

## Three-Layer Composition

Every turn assembles three layers:

| Layer | Size | Content | Caching |
|-------|------|---------|---------|
| 1. Core | ~1800 tokens | GM identity, universal rules, genre-specific setting/vocabulary/tone | Static, cached with `ephemeral` |
| 2. Situation Module | ~400-600 tokens | One of five context modules, plus optional investigation overlay | Static, cached with core |
| 3. Dynamic State | Variable | Compressed game state, injected per turn | Per-turn, not cached |

Total static: ~2200-2500 tokens per turn. Down from ~5500 in the old monolithic prompt.

## System Prompt Structure

`buildSystemPrompt` returns `[staticPrompt, dynamicPrompt]` -- two separate system blocks:

- **Static block** (Layer 1 + Layer 2): Concatenated core + situation module. Sent as a system message with `cache_control: { type: 'ephemeral' }`. Identical across turns in the same context, so prefix caching hits consistently.
- **Dynamic block** (Layer 3): `## CURRENT GAME STATE` header + compressed state. Changes every turn. Also includes meta-question instructions or consistency-check instructions when applicable.

Message history sits between the system blocks and the current player input. Because the static system block and old history messages don't change, the entire prefix stays cacheable.

## Layer 1: Core (`buildCoreLayer`)

The core layer loads every turn regardless of context. It contains everything the GM needs to narrate any scene correctly. Strip all situation modules and this still produces a functional game.

### Sections in order:

1. **Role** -- genre-specific role preamble (from `config.promptSections.role`), then universal: "narrator and rule-enforcing referee."
2. **Tone** -- genre-configurable tone mix (default: Epic 60%, Gritty 30%, Witty 10%). Formatting rules: present tense, second person, `## [Location] -- [Time]` headings for scene transitions. Response length budget: 100-200 words routine, 200-300 pivotal, 300+ only for crucible/climax.
3. **The World** -- genre setting + vocabulary injected from `promptSections.setting` and `promptSections.vocabulary`.
4. **NPC Voice** -- read the Voice field before writing dialogue. Rhythm over accents. Banned AI-slop names (Aldric, Kael, Voss, Thorne, Ash). Genre-specific voice guide appended.
5. **D20 Mechanics** -- d20 + modifier vs DC. Advantage/disadvantage triggers (gear, disposition, cohesion, environmental). DC scale: Easy 8 through Nearly Impossible 25+.
6. **Roll Discipline** -- roll when uncertain AND failure has consequences. Momentum trap check (three paragraphs without a roll). Plans vs actions distinction. Assessment rolls in planning. Five-turn audit rule. `pending_check` must appear in `commit_turn` BEFORE narrating the outcome.
7. **Passive Perception** -- PP = 10 + WIS mod. Auto-notice at or below threshold.
8. **Fail Forward** -- mandatory. Failure opens doors, creates complications, exposes opportunities.
9. **Consequences** -- violence proportional to tools. Enemies fight to win. Full moral agency. Death saves (d20, 10+/9-). Genre-specific antagonist method (systems, power, resources, corruption, or information depending on genre).
10. **Hidden Systems** (never named to player):
    - Difficulty adaptation (ease after 3+ failures, escalate after 5+ successes)
    - Cohesion (1-5 scale, affects crew roll advantage/disadvantage)
    - Disposition (Hostile through Trusted, modifies social DCs)
    - Origin (species/background as persistent social modifier)
    - Promises (Active -> Strained -> Broken lifecycle, two-chapter rule)
    - Clocks (advance on time/failures/exposure, max once/scene)
    - Decisions (auto-record non-operational choices with consequences, 8-cap auto-archives)
    - Timers, Heat, Economy (ledger tracking), Inspiration
11. **Difficulty Engine** -- six rules: fail forward, failure-as-door, target weaknesses, consumable tracking, antagonist offscreen moves, thread worsening, deferred promise mentions.
12. **Post-Action Checklist** -- 10-item checklist run every response (cohesion, inspiration, disposition, promises, decisions, clocks, scene, consumables, assessment checks, currency).
13. **commit_turn Discipline** -- write narrative first, call commit_turn ONCE with ALL state changes. `pending_check` before outcome. Contested rolls. No double-deductions. No meta-narration. One call per response.
14. **Scene Boundaries** -- `scene_end: true` + `scene_summary` in commit_turn when location changes, time passes, mission phase transitions, or activity shifts. `tone_signature` required with every scene_end.
15. **Crew Load Tracking** -- `temp_load_add` / `temp_load_remove` for psychological weight on crew NPCs. Severity levels: severe, moderate, mild (including positive load).

## Layer 2: Situation Modules (`selectSituationModule`)

Exactly one primary module loads per turn, selected by `detectContext`. The investigation overlay can append to any non-combat module.

### Context Detection (`detectContext`)

Priority order:

1. `combat.active` -> **Combat**
2. Active alert/exposure/detection clock OR `explorationState.hostile` OR operation phase `active`/`extraction` -> **Infiltration**
3. Safe location + recent rest/sleep/downtime messages -> **Downtime** (uses Social module)
4. Safe location -> **Social**
5. Default -> **Exploration** (uses Social module)

### Module Selection Override

- **Chapter 1** (`chapterNumber <= 1`) overrides everything -> **Tutorial** module loads instead of any context-based module.
- **Planning** override: within social context, if `operationState.phase === 'planning'` or last 3 messages mention plan/briefing/prepare -> **Planning** module instead of Social.

### Modules

**Tutorial** (~400 tokens, chapter 1 only)
- Three-beat onboarding sequence: dialogue choice (teaches agency), low-stakes skill check (teaches dice), small skirmish (teaches combat).
- Shorter chapter (10-15 turns), limited lore budget (max 3 world concepts), limited NPCs (3-4) and threads (2-3).
- Includes trait rules and asset mechanic from genre config.

**Combat** (~500 tokens)
- Turn order: player action -> enemy response -> new situation -> suggested_actions.
- Player attacks use `pending_check`; system auto-chains damage rolls. Enemy damage uses `roll_breakdown` (no pending_check).
- Threat tiers T1-T5 (Civilian 8HP through Apex 60+HP).
- Spatial tracking, environmental interactions (must include one environmental suggested_action), special abilities declared at combat start.
- Death and defeat rules.

**Infiltration** (~500 tokens)
- Escalation model: 3 failures to confrontation, tracked via 4-segment tension clock.
- Cover identity DCs scale by NPC awareness (DC 10 bored worker through DC 18+ CI officer).
- Exploration state tracking (zone transitions, resource management).
- Operation state as canonical reference. Extraction is always a scene.

**Planning** (~500 tokens)
- Assessment rolls are the key challenge: assertions about uncertain facts require checks.
- Operation state capture via `set_operation` when player commits. Phase transitions on first execution action.
- NPCs challenge and refine plans. 10-turn pacing limit before crucible pressure.

**Social** (~400 tokens, default for safe locations)
- Downtime pacing (play character scenes, don't compress). NPC texture rules (habit, unprompted line, surprise).
- Risky questions as roll gates (Persuasion/Deception to ask, Insight to trust).
- Scope escalation refocus, strong success rewards (5+ over DC), information asymmetry handling.
- 15-turn social pacing limit before NPC pushes toward action.

**Investigation Overlay** (appends to social/planning/infiltration)
- Loads when `promptSections.investigationGuide` exists AND context is not combat.
- Clue discovery via `pending_check` or passive perception. Connection proposals at DC 10/14/18.
- Tier system: Clue+Clue=Lead, Lead+Clue=Enriched, Lead+Lead=Breakthrough.
- Tainted source handling (plausible-but-wrong revelations, never mentioned in narrative).
- Expert NPCs can add connections directly without rolls.

### Always-appended sections

After the primary module + overlay:

- **Asset mechanic** (ship/rig rules from genre config, if applicable, skipped in downtime)
- **Trait rules** (genre-specific class trait instructions)
- **Progression block** (~150 tokens): chapter frame rules (objective + crucible by turn 3), turn budget (10-18 turns with act breakdown), chapter close signaling via `signal_close`.
- **Fallback summaries**: one-line reminders for omitted modules, so the GM can handle unexpected context shifts (e.g., "Combat: turn order player->enemies->situation, spatial tracking, threat tiers T1-T5").

## Layer 3: Dynamic State (`compressGameState`)

Rebuilt every turn from current `GameState`. Structured as labeled text blocks:

| Block | Contents |
|-------|----------|
| PRESSURE | Consecutive success/failure streak, difficulty adaptation signal |
| LORE | Genre lore anchors (from config) |
| ORIGIN | Species + lore description |
| PC | Name, species, class, level, HP, AC, currency + last ledger entry, proficiency bonus, passive perception, inspiration, exhaustion, pronouns |
| STATS | All six stats with modifiers |
| PROF | Proficiency list |
| GEAR | Inventory with quantities, charges, damage |
| TRAITS | Class traits with uses remaining |
| TEMP | Active temporary modifiers |
| LOC | Current location name + description |
| SCENE | Scene snapshot (if set) |
| TIME | Current in-world time |
| CREW | Crew NPCs with voice notes, vulnerabilities, `tempLoad` entries (severity + description), `signatureLines` |
| COHESION | Score/5 + label + recent changes |
| FACTIONS | Faction stances |
| NPCS | Split into [SCENE] (full detail: role, disposition, voice, vulnerability, combat tier) and [BG] (one-line: name + disposition). Scene-present = at current location or mentioned in last 3 messages. Capped at 15 relevant NPCs. |
| NPC WARNINGS | Approach failure tracking (2 failures = warning, 3 = closed approach) |
| THREADS | Status (WORSENING/STABLE) + title + status text |
| PROMISES | To whom, what, status |
| DECISIONS | Active decisions by category + chapter. Last 2 superseded decisions with reason. |
| ANTAG | Name, description, agenda, moved-this-chapter flag, last move |
| CLOCKS | Active (filled/max) + triggered (with effect) |
| TIMERS | Active timers with deadlines |
| HEAT | Faction heat levels with reasons |
| SHIP/ASSET | Genre-specific asset state (via `config.promptSections.buildAssetState`) |
| OPERATION | Name, phase, objectives (with completion marks), tactical facts, asset constraints, abort conditions, signals, assessed claims |
| EXPLORATION | Facility name, status, explored/current/unexplored zones, resources, alert level |
| NOTEBOOK | Clues (id, source, tags, red herring flag, connection count) + connections (tier, title, source labels, revelation, tainted flag) |
| COMBAT | Active/inactive. When active: round number, enemies (HP, AC, abilities), spatial state (positions, environment, exits) |
| HISTORY | Completed chapters (older = summary only, most recent = summary + key events) |
| CHAPTER/FRAME | Chapter number + title. Frame: objective, crucible, turn count, pacing warnings. |
| PACING | Act detection (hook/development/crucible/resolution), scope signal count, turn budget warnings at 12/15/20 turns and post-crucible scope creep. |
| WEAK STATS | Stats with modifier <= 0, flagged for difficulty engine targeting |
| RULES WARNINGS | Persistent counter threshold warnings from the rules engine |
| ROLL GATE | Per-turn verb scan of player message → `[ROLL GATE]` block naming specific skill and target NPC. Five categories: stealth, physical, technical, social, info extraction. All fire regardless of context. |
| CLOSE TIMING | Escalating directives based on `_objectiveResolvedAtTurn`: `[CLOSE AVAILABLE]` at +1, `[CLOSE OVERDUE]` at +2, `[CLOSE REQUIRED]` at +4 or turn 20. Hard budget at 18/20. |

## Message Assembly (`buildMessagesForClaude`)

Messages are assembled in two phases: cross-chapter memory, then current chapter history.

### Phase 1: Cross-Chapter Memory

**Prior chapter scene summaries** are injected when completed chapters have `sceneSummaries` (preserved from their chapter close, cleaned up when all associated arcs resolve):

1. Inject `[PRIOR CHAPTER SCENES]` block: scene summaries grouped by chapter with scene numbers and tone signatures.
2. Append `[PIVOTAL MOMENTS]` block: curated scenes from prior chapters (permanent, never rotated). Format: `[Ch{N}: {title}] {text}`.
3. GM acknowledges with "Prior chapter context loaded."

If no prior scene summaries exist but pivotal moments do, only the `[PIVOTAL MOMENTS]` block is injected.

### Phase 2: Current Chapter History

Scene summaries are **not** used for within-chapter compression. This preserves ~98% cache hit rate (compressing within-chapter breaks the cache prefix on every scene change). Two paths:

**Legacy Summary path** (backward compat for old saves):
When `storySummary` exists: inject `[STORY SO FAR]` block, then messages after `upToMessageIndex`.

**Windowed History path** (standard):
1. Walk backwards through messages, estimating tokens at 0.3 tokens/char.
2. Budget: 4000 tokens base, +1000 during active operations or exploration.
3. Floor: minimum 6 messages (3 full player-GM turns).
4. Include the resulting window of messages.

### Cache Breakpoint

In all paths, the last message before the current player input gets `cache_control: { type: 'ephemeral' }`. This marks the prefix boundary: system blocks + tools + old history all stay identical between turns, enabling Anthropic prefix cache hits.

### Player Message Injection

The current player message is appended last as a plain `user` message (with `[META]` prefix for meta-questions). System-level reminders may be appended:
- `[SYSTEM: SCENE SUMMARY OWED]` — when `_pendingSceneSummary` flag is active (location changed without scene_end last turn)
- `[SYSTEM: ROLL DROUGHT]` — when 5+ turns have passed without a roll

## Special Prompts

### Close Prompt (`buildClosePrompt`)

Replaces the normal GM prompt when a chapter closes. Uses Claude Haiku (`claude-haiku-4-5`) for phases 1-2 and Sonnet for phase 3 (narrative curation). The close handler is explicitly "NOT the narrative GM" -- it's mechanical.

**Three-phase close sequence:**

Phases 1-2 run sequentially in the foreground (player waits). Phase 3 is deferred to the background (player sees the close overlay immediately after phase 1-2, ~10s instead of ~18-20s). Phase 3 output (pivotal scenes, signature lines) is memory for future chapters, not displayed in the overlay.

**Pre-close gate:** `signal_close` is code-gated in tool-processor: requires `scene_end: true` in the same commit_turn (no mid-scene close) and rejects when `pending_check` is present (no mid-roll close). Deferred closes are logged.

**Phase 1: Close + Level Up** (Haiku, foreground, MUST produce close_chapter + level_up + chapter_frame)
1. **Audit** -- review threads, promises, clocks, antagonist, operation/exploration state. Resolve or update stale entries.
2. **Close Chapter** -- summary (2-3 sentences, long-term memory), key events (3-5, narrative only, NO hidden mechanics like cohesion/heat/disposition), next chapter title, resolution description, forward hook.
3. **Level Up** -- new level, HP increase (hit die avg + CON mod, min 1). Proficiency bonus bumps at levels 5/9/13. ASI at levels 4/8/12.
4. **Next Frame** -- chapter_frame for next chapter. Objective = next active episode milestone.
5. **Arc Advancement** -- advance active episodes with summaries of what was accomplished. Complete, fail, or add episodes. Resolve or abandon arcs as warranted by the chapter's events.

**Phase 2: Debrief** (Haiku, foreground, MUST produce debrief)
6. **Skill Points** -- 0-2 points awarded against criteria (creative non-proficient use, clean objective completion, lasting positive decision payoff).
7. **Debrief** -- tactical (dice analysis, smart decisions, real costs), strategic (thread movement, urgency), lucky breaks, costs paid, promises kept/broken. Incorporates GM self-assessment if available.

**Phase 3: Curation** (Sonnet, background — merges results into state without overwriting closeData)
8. **Curate Narrative Memory** -- `pivotal_scenes` (max 2-3 per chapter, ~200-300 token moment summaries preserving imagery and dialogue). Signature lines on NPCs via `add_signature_line` (1-2 per major NPC, permanent voice anchors).

Rules: analytical voice only, no GM narration, reference actual events and rolls, execute all steps within each phase.

### Audit Prompt (`buildAuditPrompt`)

Fires every ~5 player turns. Uses Haiku for cost/speed. Reads compressed state + last 16 messages (truncated to 150 chars each).

**14-check sequence:**

1. Consumables (charges, pickup/drop)
2. HP and resources (damage/healing accuracy, currency balance vs ledger)
3. Temporary effects (expired modifiers)
4. Location and scene (stale snapshots)
5. NPC status (killed/departed still marked active, disposition drift)
6. Trait uses (decremented correctly)
7. Promises (fulfilled/broken but still open)
8. Decisions (unrecorded commitments, obsolete active decisions)
9. Threads (resolved but still open, deteriorating flags)
10. Clocks (should have advanced)
11. Operation state (phase advancement, objective status)
12. Exploration state (exited facility, wrong zone, consumed resources)
13. Timers (expired deadlines)
14. Heat (untracked faction exposure)

Rules: conservative (only fix clear discrepancies), no narrative output, only `commit_turn` calls. No `suggested_actions` or `pending_check`. If everything is correct, output nothing.
