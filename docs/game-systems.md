# Game Systems

How Storyforge's core gameplay systems work under the hood.

---

## 1. Pacing Engine

Every chapter follows a four-act structure detected automatically from game state, not declared by the GM.

**Act detection:**

| Act | Condition |
|-----|-----------|
| Hook | Player turns 1-3 |
| Development | Default state after hook |
| Crucible | Combat active, hostile exploration, or operation in active/extraction phase |
| Resolution | `closeReady` flag is set |

**Scope signals** track how much narrative territory the chapter has covered. The counter increments when the GM introduces: a location change, 3+ NPCs in a scene, an antagonist establishment, a new tension clock, a new timer, or an operation phase transition. These are chapter-scoped and reset on close.

**Escalation ladder** (turn thresholds combined with act and signals):

| Trigger | Warning |
|---------|---------|
| Turn 12+ still in development, 4+ scope signals | Crucible should be imminent |
| Turn 12+ still in development | Crucible should be active or imminent |
| Turn 15+ | Approaching limit, drive toward resolution |
| Crucible resolved + 2+ scope signals post-crucible | Scope creep, close the chapter |
| Turn 16+ | SCENE FREEZE — no new scenes, resolve current scene and close |
| Turn 20+ | Over budget, wrap now |

**Chapter target:** 10-18 turns, with a 25-turn hard cap. Turns 1-3 are the hook. Turns 4-8 are development. Turns 9-14 are the crucible. Turns 15-18 are resolution. The scope test enforces one location, one primary conflict, one crucible per chapter. The frame constraint is milestone-scoped: the chapter objective aligns with the active episode milestone, keeping each chapter focused on a single narrative beat within the larger arc.

**Roll gate enforcement:** A `detectRollGate()` function scans the player's message for action verbs (stealth, physical, technical, social, information extraction) and injects a `[ROLL GATE]` block into the dynamic state naming the specific skill and target NPC. All categories fire regardless of context module. Trusted NPCs are exempt from information extraction gates. Target: 1 roll every 2-3 turns. Roll drought warnings escalate at 2/3/5 turns without a roll, with a `[SYSTEM: ROLL DROUGHT]` message injection at 5+ turns.

**Close timing enforcement:** An `objective_status` field in commit_turn (`in_progress`/`resolved`/`failed`) tracks when the chapter objective is met. When resolved, `_objectiveResolvedAtTurn` records the turn number and escalating close directives are injected:
- +1 turn: `[CLOSE AVAILABLE]`
- +2 turns: `[CLOSE OVERDUE]`
- +4 turns or turn 20: `[CLOSE REQUIRED]`
- Hard budget fallback at turn 18 (available) and 20 (required) regardless of objective status.

**Close gating:** `signal_close` is code-gated: requires `scene_end: true` in the same commit_turn (no mid-scene close) and rejects when `pending_check` is present (no mid-roll close). Deferred closes are logged. Combined with scene freeze at turn 16+, chapters land cleanly within their current scene.

**Context detection (`detectContext`):** Determines which prompt module loads (infiltration, social, exploration, combat, downtime). Checks in priority order: active combat → infiltration clocks → hostile exploration → active operations → hostile NPCs → player threat language in recent messages → active tension clocks → safe location indicators. Note: context modules affect narrative tone only, not roll enforcement.

---

## 2. Scene Summaries as Cross-Chapter Memory

Scene summaries serve as a **cross-chapter memory layer**, not as within-chapter compression. Within a 20-turn chapter, raw messages fit the context window and cache efficiency (~98% hit rate) is more valuable than compaction. Compressing within-chapter breaks the cache prefix on every scene change.

**Scene end triggers** (included in `commit_turn` with `scene_end: true`):
- Player moves to a new location (not arrival at a continuing scene)
- Significant in-world time passes
- A mission phase transitions (planning to active, active to extraction)
- The player shifts to a fundamentally different activity
- Combat and mid-conversation dialogue are never split

**Fallback enforcement:** If Claude sends `set_location` without `scene_end`, a `_pendingSceneSummary` flag is set. Next turn, a `[SYSTEM: SCENE SUMMARY OWED]` reminder is injected into the conversation message, prompting Claude to include the summary retroactively.

**Per-scene summaries** capture what happened, what changed, and the emotional/relational tone in 2-4 sentences. Each summary includes a `toneSignature` (1-2 words like "quiet tension", "earned release", "accumulated dread") that preserves the emotional register across scene boundaries.

**Three lifecycle states:**

| State | Behavior |
|-------|----------|
| **Current chapter** | Summaries are written at every scene boundary but NOT used for context compression. Raw messages are sent to Claude. Full cache efficiency. |
| **Prior chapters with active arcs** | Scene summaries are preserved on the completed chapter record and injected as a `[PRIOR CHAPTER SCENES]` block before current chapter messages. Higher resolution than the 1-line chapter summary. Static content, caches well. |
| **Resolved arcs / old chapters** | Scene summaries are cleared when all arcs with episodes in that chapter are resolved. Only the chapter summary remains. |

**On chapter close:** Current `sceneSummaries` are copied into the completed chapter record (`Chapter.sceneSummaries`), then reset for the new chapter.

**On arc resolution:** Scene summaries are cleared only from chapters where no other active arc has episodes. A chapter that contributed to arcs X and Y keeps its scene summaries until both resolve.

**Backward compatibility:** The legacy `storySummary` field (a single 200-300 token narrative summary) is still checked for old saves.

---

## 3. NPC Failure Escalation

Tracks per-NPC, per-approach failure counts to prevent the player from brute-forcing social encounters.

**How it works:**
- Each entry tracks `{npcName, approach, failures, closed}` where approach is the skill used (Deception, Intimidation, Persuasion, etc.)
- Failures are detected from contested roll failures against named NPCs
- At 2 failures, a warning is injected into the dynamic state: "next failure closes this approach"
- At 3 failures, the approach is marked `closed` and the warning escalates: "this approach no longer works, try a different skill"

The warnings appear in the NPCS section of the compressed game state so the GM sees them every turn. The player never sees failure counts directly; they experience it as the NPC becoming resistant to that particular tactic.

---

## 4. Selective NPC Injection

Not all NPCs get equal space in the prompt. The system distinguishes scene-present NPCs from background NPCs.

**Scene-present** (at the current location OR mentioned in the last 3 messages):
- Full detail blocks including description, voice notes, vulnerability, combat tier/notes, tempLoad entries, and signature lines
- Format: `Name [role|Disposition] -- description | Voice: ... | Vuln: ...`

**Background** (relevant to recent chapters or non-neutral disposition, but not scene-present):
- One-line format: `Name|Disposition`
- No voice, vulnerability, combat, or load details

**Relevance filter:** Only NPCs from the last 2 chapter titles, currently at the player's location, mentioned in recent messages, or with non-neutral disposition are included at all. Capped at 15 relevant NPCs total.

---

## 5. Crew Load (tempLoad)

Tracks the psychological and emotional weight each crew member carries across the campaign.

**Severity levels:**
- **Severe:** unresolved promises that hit their vulnerability, witnessed trauma, betrayal
- **Moderate:** operational stress, compartmentalization, difficult orders, witnessing morally heavy decisions
- **Mild:** minor slights, routine mission fatigue, or positive load (pride, accomplishment)

Each entry records a description, severity, and when/where it was acquired (e.g., "Ch 2, Athex-7").

**Adding and removing:** Load is added via `temp_load_add` in `commit_turn`'s `update_npcs`. It is removed via `temp_load_remove` (substring match) when a recovery scene addresses that specific weight: a personal conversation, a kept promise, a shared quiet moment.

**Breaking-point detection** (evaluated by the rules engine after every turn):
- **At breaking point:** 3+ severe, OR 1 severe + 3 moderate, OR 5+ moderate. The NPC will manifest break behaviors according to their vulnerability. Recovery requires dedicated personal scenes.
- **Approaching breaking point:** 2+ severe, OR 1 severe + 2 moderate, OR 4+ moderate. A warning recommends a recovery scene before the next high-pressure operation.

Load is displayed in the CREW section of the dynamic state, so the GM always sees what each companion is carrying.

---

## 6. Derived Cohesion

Cohesion is not tracked directly. It is computed from the average disposition of all crew NPCs.

**Disposition-to-score mapping:**
- Hostile = 1, Wary = 2, Neutral = 3, Favorable = 4, Trusted = 5
- The average is rounded to the nearest integer, clamped 1-5

**Cohesion effects:**
- 5 (Full trust): Advantage on crew-related rolls
- 4 (High): One advantage per scene on crew rolls
- 3 (Functional): Normal
- 2 (Strained): Disadvantage on crew rolls
- 1 (Fractured): Crew acts in self-interest

**Cohesion log** still records individual reasons for +1/-1 changes with companion name and chapter number. Genre-specific cohesion guides define what triggers changes: crew protection, kept promises, shared credit push cohesion up; using crew as tools, broken promises, and dismissed concerns push it down.

---

## 7. Narrative Fidelity Systems

Multiple systems preserve narrative identity across the compression boundary.

### signatureLines
Preserved exact NPC quotes that capture their voice at pivotal moments. Max 4 per NPC, curated during chapter close (Step 7). These persist forever as voice anchors and are displayed alongside crew NPC details in the dynamic state.

### pivotalScenes
Permanent chapter-defining moments with longer summaries (~200-300 tokens) preserving specific imagery, dialogue beats, and callbacks. Max 8 total, never rotated or compressed. Injected as a `[PIVOTAL MOMENTS]` block alongside prior chapter scene summaries. These are moment summaries, not plot summaries: what the scene felt like, what specific lines were said, what the player saw.

### rollSequences
Auto-detected patterns in the roll log. The rules engine scans for 3+ consecutive failures on the same check, optionally followed by a success or critical (the breakthrough pattern). Recorded with a description like "5 consecutive failures on Deception, released on nat 20 Persuasion" and the turn range. Ongoing streaks are tracked too.

### toneSignature
A 1-2 word emotional register tag attached to every scene summary (e.g., "quiet tension", "earned release", "accumulated dread", "bitter resolve"). Helps maintain continuity of emotional register across scene boundaries when earlier messages have been compressed away.

### Close Prompt Step 7
The chapter close handler has a dedicated curation step that decides what survives compression:
- 2-3 pivotal scenes per chapter
- 1-2 signature lines per major NPC
- These are selected based on what the player is likely to remember and what might be called back in future chapters

---

## 8. Hidden Systems

These systems run entirely behind the scenes. Their names and mechanics are never exposed to the player.

| System | How it works |
|--------|-------------|
| **Cohesion** | Derived from crew dispositions (see above). The score and its effects on rolls are invisible to the player. |
| **Disposition tiers** | Hostile/Wary/Neutral/Favorable/Trusted. Determines advantage/disadvantage on social rolls. Climbing is slow, falling is fast. Fear does not equal trust. |
| **Difficulty adaptation** | 3+ failures eases DC by 1-2. 5+ successes escalates. Two failures in the same scene caps the third at DC 12. |
| **Promises** | Active to Strained after being deferred twice. Strained to Broken on third deferral. Two chapters with no progress triggers auto-Strained. |
| **Clocks** | Tension clocks (4 or 6 segments) advance on time, failures, or exposure. Max one advance per scene. Must advance at least once before resolving. Trigger effect fires when filled. |
| **Decisions** | Non-operational player choices with downstream consequences. Auto-recorded by category (moral/tactical/strategic/relational). Cap of 8 active; stale entries are auto-archived. |
| **Counters** | Persistent genre-specific counters (drift_exposure, corruption, chrome_stress, favor_balance) that survive chapter close. Threshold crossings trigger world-state mutations and warnings to the GM. |

All of these are managed through dynamic state injection: the compressed game state block includes their current values so the GM can act on them, but the player only experiences their narrative effects.

---

## 9. Story Arcs & Episodes

Long-running narrative structures that persist across chapters, providing campaign-level continuity.

**Arcs** are campaign-spanning storylines (e.g., "The Syndicate War", "Finding the Lost Colony"). Each arc has a status (`active`, `resolved`, `abandoned`) and contains one or more episodes. Arcs persist across chapter boundaries and are never reset.

**Episodes** are chapter-scoped milestones within an arc. Each episode defines a milestone (a concrete narrative goal) and tracks its status (`pending`, `active`, `completed`, `failed`). Only one episode per arc is active at a time.

**Relationship to chapter frame:** The chapter objective is derived from the active episode's milestone. This keeps each chapter focused on advancing one specific beat in the larger arc, rather than trying to resolve the whole storyline at once.

**Arc decomposition at chapter start:** When a new chapter begins, the GM decomposes the active arc into its next episode milestone. This becomes the chapter frame objective. If no arc exists yet, the opening hook establishes one.

**Close sequence advancement:** During the three-phase Haiku close, Phase 1 advances episodes with summaries of what was accomplished. Episodes can be completed, new episodes added, arcs resolved, or arcs abandoned based on the chapter's events.

**Dynamic state display:** Active arcs and their episode progress are included in the compressed game state so the GM always knows the campaign-level narrative position. The player experiences arcs through narrative, not through exposed mechanics.

---

## 10. Progression

**Level-up** happens automatically at chapter close (Phase 1). Every chapter grants one level. HP increases by hit die average + CON modifier. Proficiency bonus increases at levels 5, 9, 13.

**Stat increases (ASI)** are gated to levels 4, 8, and 12. At these levels, the close prompt includes `stat_increase` in the commit_turn. The GM assigns the increase based on how the player used their abilities during the chapter.

**Skill points** are awarded in Phase 2 (0-2 per chapter). Criteria: a non-proficient skill used creatively, a major objective achieved cleanly, or a key decision with lasting payoff.

**Retinue/ship upgrades** use the asset system (L1-L3 per system). The prompt instructs Claude to offer 2-3 upgrade options at narrative-appropriate moments (refit stops, markets, salvage, downtime). Upgrades are called via `update_ship` in commit_turn.

**Known gap:** Retinue upgrades rely on Claude narrating a refit/upgrade opportunity, which doesn't always happen — especially with tighter chapter pacing (18-21 turns). Under consideration: a "upgrade earned" flag set at chapter close that Claude weaves into the next chapter's narrative when the setting allows. The flag provides enforcement; Claude controls timing to respect the fiction (no upgrades while fleeing, etc.). Player chooses through in-narrative dialogue, not a UI selector.

## 11. Action Bar HUDs

The action bar displays contextual HUD strips above the input based on game state. Multiple HUDs stack when their conditions overlap (e.g. combat during an infiltration).

**Operation HUD** — Appears when `operationState.phase` is `active` or `extraction`. Shows operation name, pulsing status dot (green for active, yellow for extraction), and active objectives. Completed/failed objectives are hidden from the HUD but remain visible in the burger menu intel panel. Clicking opens the intel tab.

**Combat HUD** — Appears when `combat.active` is true and enemies exist. Shows round number, pulsing red dot, and each enemy with a name + health bar + HP fraction. Health bar color shifts by HP percentage: normal > 50%, warning 25-50%, critical < 25%. Dead enemies (HP 0) show as strikethrough with no bar.

Both HUDs are rendered in `components/game/action-bar.tsx`. Data flows from `GameState.world.operationState` and `GameState.combat` via props from `game-screen.tsx`.
