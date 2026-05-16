# Storyforge v2 — System Design (Draft 3)

Draft 3 · 2026-04-22 · merge of Draft 2 (eagle) and the v2 Codex
Supersedes Draft 1 (same filename, 2026-04-22 earlier today)

---

## Context

**Why now.** v1 works through Ch1 and then decays. The 4-chapter Epic Sci-Fi baseline (2026-04-22) gave the first hard numbers behind a symptom that had been showing for weeks:

- Thread continuity cliff **25% at Ch2→3** — aligned exactly with rating drop 3→2
- Anchor reference miss rate **~11%** (13 `anchor_reference_missing` fires / 115 writes)
- **Ch4 arc advancement = 0** — narrative kept moving, arc didn't
- **55% of session spend is cache writes** — dynamic state sitting in `system[2]` invalidated the BP4 prefix cache every turn
- **12 `scene_npc_teleport` firewall fires** — NPC identity drift

These aren't prompt-tuning problems. They're harness problems: state is emitted inconsistently, loses structure at chapter boundaries, and by Ch3+ the narrative improvises on unreliable ground truth.

**Why Draft 3.** Two prior drafts converged on the same ~80% of the architecture: state over history, constrained narrative graph, three explicit roles, owner-join retrieval, computed pacing. They diverged on the remaining ~20%. Draft 2 ("eagle") was stronger on engineering discipline (baselines, gates, cost envelope, cache specifics, kill criteria). Draft 2's co-design partner ("codex") was stronger on architectural primitives (Author output transform, dynamic antagonist face, scored working set, typed scene packet). Draft 3 merges them: **codex's architecture on eagle's engineering rails**.

---

## The v2 thesis (compressed)

> **Managing game state is the product.** v1 assumed the model could hold narrative state. v2 moves state management into the harness and asks the model to generate prose against a structured, validated ground truth. Context engineering is the architecture. Everything else follows.

Six load-bearing moves:

1. **Entities as a graph, not parallel arrays.** Arcs group threads; threads own decisions/promises/clues; NPCs and factions own threads. Heat, disposition, agenda live on owning entities, not as parallel top-level arrays. Retrieval owner-joins to pull live state *with* the thread.
2. **Role split: Narrator / Archivist / Author (Steward folded).** The single "GM" collapses into three explicit roles, each with a different cognitive mode, cadence, and model option.
3. **Author emits rich structure; a code-level transform splits authored content into three outputs**: persisted runtime state, system-only scaffolding, and a Narrator-facing opening seed. Hidden authored futures stay hidden.
4. **Dynamic antagonist face.** The active face of opposition is evaluated per turn from player alignment signals. Not chapter-constant; not authored destiny.
5. **Scored working-set selection.** A pure function ranks entities per turn against explicit weights, bounds full-detail inclusion, demotes dormants. The Narrator does not decide what matters.
6. **Context > history. State > prose.** Dynamic content lives in messages, never in the cached system prefix. Scene entry pre-fetches the next 3-5 turns' needs into the assistant history where cache reads are ~10% cost.

Two supporting moves:

7. **Pressure ladder as runtime state.** Each ladder step carries `triggerCondition + fired`. Code fires steps; Narrator doesn't try to remember to escalate.
8. **Pacing signals as deterministic advisories.** Reactivity ratio, scene-link discipline, thread tension stagnation, arc-dormant — computed by code each turn, injected into Narrator DYNAMIC as nudges.

---

## System design

### 1. Three-role model

| Role | Cadence | Model | Owns | Writes |
|------|---------|-------|------|--------|
| **Narrator** | Every turn, sync, streaming | Sonnet 4.6 | Prose in limited-third PC POV, roll discipline (DC + skill), mechanical tool calls, scene direction, quick actions | Mechanical sub-writes only: `hp_delta`, `credits_delta`, `inventory_use`, `combat`, `set_location`, `scene_end`, `set_scene_snapshot`, `pending_check`, `suggested_actions`, + a compact `narrator_annotation` (hint to Archivist) |
| **Archivist** | Every turn, async after Narrator | Sonnet 4.6 (MVP) → Haiku 4.5 (once reliable) | All narrative-memory state: entity identity, disposition, anchoring, clocks, heat, cohesion derivation. Pacing classifications. Drift flags | `extract_turn`: `creates`, `updates`, `transitions`, `attachments`, `sceneResult`, `pacingClassifications`, `flags` |
| **Author** | Chapter boundaries only | Sonnet 4.6 | Chapter-level synthesis: frame, spine thread, antagonist field, pressure ladder, pressure directives, possible revelations, moral fault lines, escalation options, editorialized lore | `AuthorChapterSetupV2` (JSON) |

**Steward** (mechanical rules: d20 discipline, difficulty calibration, advantage logic) stays folded into Narrator. Named as a concern for later extraction if d20 discipline degrades at v2 scale.

**Schema enforcement.** Each role has its own tool schema. A firewall rule rejects narrative-state writes from Narrator and mechanical writes from Archivist. This is the behavioral load-bearing contract — a tool-access rule enforced at the API boundary, not a style guideline.

**Archivist failure is non-fatal.** On parse failure or firewall-block cascade, the turn commits mechanical-only. Next turn Narrator is told "LAST TURN: anchoring failed, re-establish scene state if needed." Avoids hard errors during play; reduces pressure to get Archivist perfect on day one.

### 2. Entity hierarchy & state graph

```
Campaign
├── Arc                         // ≥2 threads, resolution-dependent
│   └── Thread                  // owner (required) + stakeholders[]
│       ├── Decision            // anchored_to: [thread_id, ...]  (required)
│       ├── Promise             // anchored_to: [thread_id, ...]  (required)
│       ├── Clue                // anchored_to may be []         (may float)
│       └── Clock | Timer       // unified failure_mode + trigger_effect
├── Floating Clues              // unattached, awaiting connection
├── Faction                     // stance, heat, agenda?, owned_threads[]
└── NPC                         // disposition, identity, temp_load, agenda?, owned_threads[]
```

**Shared anchor-entity interface:**
```typescript
interface NarrativeEntity {
  id: string
  title: string
  chapter_created: number
  category: 'arc' | 'thread' | 'decision' | 'promise' | 'clue'
  retrieval_cue: string          // one-line relevance pointer
  anchored_to?: string[]         // required on decisions/promises; optional on clues
}
```

**Integrity rules (enforced at write time; reject with named field):**
- `owner` required non-empty on threads and promises
- `anchored_to` required non-empty on decisions and promises; may be empty on clues
- Arc creation requires **≥2 threads sharing resolution dependency** (resolving one partially determines the other) AND `spansChapters ≥ 3` AND `no_single_resolving_action: true` AND `stakes_definition` present. All four gates; v1 had 6 failed arc creations in 4 chapters because the gate was loose.
- One deterioration per thread (unified clock/timer/failure_mode — no parallel statements of what goes wrong)
- NPC identity anchors (`name`, `keyFacts`, `status`) protected; dead/gone transitions guarded

**Flat writes, structured storage.** Models emit flat semantic statements (`create NPC Yara`, `update Yara disposition wary`, `attach clue factory-neural-port to thread T_loadout`). Code resolves references, assigns IDs, validates anchors, applies ownership rules, persists the graph.

**Derived, not stored.** Cohesion = `average(crew.disposition)` clamped 1-5. Heat summaries, faction stances visible in scene = computed each turn. No parallel trackers.

**Persistence.** IndexedDB over localStorage. Rich artifacts (chapter setup, scaffolding, scene memory, retrieval indexes) don't fit cleanly in one localStorage blob. Persistence interface is an adapter so later server-backed storage is a drop-in.

```typescript
interface StoryforgePersistence2 {
  loadCampaign(id: string): Promise<Sf2State | null>
  saveCampaign(state: Sf2State): Promise<void>
  listCampaigns(): Promise<CampaignListItem2[]>
  deleteCampaign(id: string): Promise<void>
  saveChapterArtifact(campaignId: string, artifact: ChapterSetupArtifact | ChapterMeaningArtifact): Promise<void>
  loadChapterArtifacts(campaignId: string): Promise<Array<ChapterSetupArtifact | ChapterMeaningArtifact>>
}
```

Canonical state persisted. Derived runtime state (working set, pacing advisories) recomputed on load.

### 3. Author output + three-way transform

**This is the architectural center of Draft 3** — the move that makes authored richness safe.

**Author emits `AuthorChapterSetupV2`** (JSON, not prose):
```typescript
interface AuthorChapterSetupV2 {
  chapterFrame: {
    title: string
    premise: string
    activePressure: string
    centralTension: string
    objective: string
    crucible: string
    outcomeSpectrum: { clean: string; costly: string; failure: string; catastrophic: string }
  }
  antagonistField: {
    sourceSystem: string
    corePressure: string
    defaultFace: { name: string; role: string; pressureStyle: string }
    possibleFaces: Array<{
      id: string
      name: string
      role: string
      pressureStyle: string
      becomesPrimaryWhen: string
    }>
    escalationLogic: string
  }
  startingNPCs: Array<{
    id: string
    name: string
    affiliation: string
    role: string
    voice: string
    dramaticFunction: string
    hiddenPressure: string
    retrievalCue: string
  }>
  activeThreads: Array<{
    id: string
    question: string
    ownerHint: string
    tension: number
    resolutionCriteria: string
    failureMode: string
    retrievalCue: string
  }>
  pressureLadder: Array<{
    id: string
    pressure: string
    triggerCondition: string
    narrativeEffect: string
  }>
  possibleRevelations: Array<{
    id: string
    statement: string
    heldBy: string
    emergenceCondition: string
    recontextualizes: string
  }>
  moralFaultLines: Array<{
    id: string
    tension: string
    sideA: string
    sideB: string
    whyItHurts: string
  }>
  escalationOptions: Array<{
    id: string
    type: 'bureaucratic' | 'social' | 'institutional' | 'physical'
    condition: string
    consequence: string
  }>
  editorializedLore: Array<{ item: string; relevanceNow: string; deliveryMethod: string }>
  openingSceneSpec: {
    location: string
    atmosphericCondition: string
    initialState: string
    firstPlayerFacing: string
    immediateChoice: string
  }
}
```

**Pure-code transform** (`transformAuthorSetup(authored) → { runtimeState, scaffolding, openingSeed }`) splits that into three outputs, each with different visibility:

**Output 1 — `ChapterSetupRuntimeState` (persisted, retrieval-facing):**
- Chapter frame (objective, crucible, outcome spectrum)
- Antagonist field (sourceSystem, corePressure, defaultFace, **currentPrimaryFace** — mutable)
- `startingNpcIds`, `activeThreadIds`
- `editorializedLore`
- `openingSceneSpec`
- `pressureLadder` with `fired: boolean` initialized to false

**Output 2 — `ChapterSetupScaffolding` (system-only, never reaches Narrator raw):**
- `npcHiddenPressures` (map NPC id → hidden pressure text)
- `antagonistFaces` (all possible faces with `becomesPrimaryWhen` conditions)
- `possibleRevelations` (full statements + emergence conditions + `revealed: boolean`)
- `moralFaultLines` (authored wording)
- `escalationOptions` (menu, with `used: boolean`)

**Output 3 — `OpeningScenePacketSeed` (Narrator-facing for first scene only):**
- `sceneIntent`, `openingPressure`, `chapterObjective`, `chapterCrucible`
- `visibleNpcIds`, `visibleThreadIds`
- `loreForOpening` (2 items max, rendered hints not raw paragraphs)
- `sceneWarnings` (e.g., "do not open with exposition", "keep current face live without implying permanence")

**Visibility matrix:**

| Author field | Runtime state | Scaffolding | Narrator |
|---|---|---|---|
| chapterFrame | yes | — | compacted |
| antagonistField | yes (current face) | yes (all faces) | compacted when relevant |
| startingNPCs | yes | hidden pressure only | compacted per scene |
| activeThreads | yes | — | compacted per scene |
| pressureLadder | yes | — | current step as advisory only |
| possibleRevelations | — | yes | almost never raw |
| moralFaultLines | — | yes | transformed only |
| escalationOptions | — | yes | only chosen escalation |
| editorializedLore | yes | — | selected per scene |
| openingSceneSpec | yes | — | yes, opening only |

**The load-bearing principle:** the Narrator gets usable pressure, never latent authored future.

### 4. Dynamic antagonist face

The antagonist is not a chapter constant. `currentPrimaryFace` is evaluated per turn from player alignment signals:

```typescript
function evaluateCurrentPrimaryFace(
  runtime: ChapterSetupRuntimeState,
  scaffolding: ChapterSetupScaffolding,
  state: Sf2State
): AntagonistFace | null {
  const scores = new Map<string, number>()
  for (const face of scaffolding.antagonistFaces) scores.set(face.id, 0)

  // Player input alignment (per recent turn)
  for (const turn of state.history.recentTurns) {
    const text = turn.playerInput.toLowerCase()
    for (const face of scaffolding.antagonistFaces) {
      if (matchesCondition(text, face.becomesPrimaryWhen)) {
        increment(scores, face.id, 2)
      }
    }
  }

  // Decision alignment
  for (const decision of activeDecisions(state)) {
    for (const face of scaffolding.antagonistFaces) {
      if (decisionAligns(decision, face)) increment(scores, face.id, 1)
    }
  }

  const top = pickHighest(scores)
  return top ? toAntagonistFace(top, scaffolding) : runtime.antagonistField.currentPrimaryFace
}
```

The exact weights are initial guesses; tune with data. The point isn't these specific heuristics, it's that face selection is evaluated, revisable, and grounded in play signals — so the same chapter can harden from Synod-enforcement → settlement-concealment → fugitive-protection depending on what the player leans toward.

### 5. Pressure ladder execution

```typescript
function updatePressureLadder(
  runtime: ChapterSetupRuntimeState,
  state: Sf2State
): ChapterSetupRuntimeState {
  const updated = structuredClone(runtime)
  for (const step of updated.pressureLadder) {
    if (step.fired) continue
    if (triggerSatisfied(step.triggerCondition, state)) step.fired = true
  }
  return updated
}
```

Fired steps become high-priority candidates for scene-packet inclusion. The current live step (or the next one about to fire) surfaces as a scene advisory. The full ladder stays system-facing.

### 6. Scored working-set selection

The working-set assembler is a pure function. One of the most important parts of v2.

**Inputs:** current state, scene location, present cast, active modules, recent turns, player message.

**Scoring (initial weights — tune with data):**
- +5 present in scene
- +4 named in current player input
- +4 owner of a live scene-relevant thread
- +3 chapter spine thread
- +3 current primary pressure face
- +2 advanced in last 2 turns
- +2 directly tied to unresolved promise/decision/clue in scene
- +1 load-bearing thread
- -3 resolved and inactive
- -2 off-scene and untouched 5+ turns

**Bounds:** ~6 entities full-detail, ~8 stub, rest excluded. Hard cap on full threads at 5.

**Output:**
```typescript
interface Sf2WorkingSet {
  fullEntityIds: string[]
  stubEntityIds: string[]
  excludedEntityIds: string[]
  reasonsByEntityId: Record<string, string[]>   // debuggable
}
```

**Escape hatch:** `surfaceThreads: string[]` and `surfaceNpcIds: string[]` in chapter runtime for controlled forced surfacing; one `recall_*` tool for rare mid-turn miss recovery. Normal narration should not depend on mid-turn recall — repeated recall is a bug in the assembler, not a feature.

### 7. Typed scene packet

The Narrator does not receive a compressed state dump. It receives a `Sf2NarratorScenePacket`:

```typescript
interface Sf2NarratorScenePacket {
  scene: {
    sceneId: string
    chapterNumber: number
    chapterTitle: string
    location: ScenLocationPacket
    timeLabel: string
    sceneIntent: string
  }
  player: PlayerPacket                        // PC stats, HP, inspiration, temp modifiers
  cast: PresentCastPacket[]                   // per NPC: identity, voice, local read, local pressure
  tensions: ThreadPacket[]                    // bundled threads with owner-join
  chapter: {
    objective: string
    crucible: string
    spineThreadId: string
    loadBearingThreadIds: string[]
    currentPressureFace: string | null
  }
  mechanics: MechanicsPacket                  // only active modules (combat/operation/etc.)
  recentContext: RecentContextPacket          // bounded recent-turn continuity
  pacing: PacingPacket                        // reactivity / scene-link / stagnation / arc-dormant advisories
  playerInput: { text: string; inferredIntent: string }
}
```

Each sub-packet is built by its own pure function (`buildPresentCastPackets`, `buildThreadPackets`, `buildChapterPacket`, etc.) from the working set. The scene packet is the Narrator's **bounded world** — enough to write the turn, not enough to improvise authored futures.

### 8. Prompt layering & cache strategy

Four cache breakpoints, per-role composition:

```
[BP1] Tools          (role-specific tool schemas)
[BP2] CORE + BIBLE   (shared across roles; world + craft + identity; ~6-8k tokens)
      ROLE           (per-role responsibility block; ~1-2k tokens)
      SITUATION      (chapter-scoped: frame, opening, outcome_spectrum, active module)
[BP3] Message history (pre-fetched scene bundle enters here)
[BP4] Current turn   (DYNAMIC content; differs per role; uncached)
```

**CORE + BIBLE discipline is non-negotiable.** No per-turn content in BP2 ever. The 55% cache-write cost on v1 came from `compressedState` leaking into `system[2]`. v2's commitment: dynamic content lives in messages (after BP3), never in system (before BP2). If a field changes per turn, it goes in the scene packet at BP4, not in SITUATION.

**Per-role DYNAMIC composition** (`buildSystemBlocks(state, forCaller)` is a pure function):
- **Narrator DYNAMIC:** scene packet (§7), pacing advisories, spine-thread reminder, current pressure step, active pressure directives, antagonist leakage channel
- **Archivist DYNAMIC:** pre-turn state slice (compact), Narrator prose, Narrator annotation, recent event-log tail
- **Author DYNAMIC:** full chapter-close artifact, active arcs, resolved/open threads, agenda moves, trigger reason (chapter_end / pivot / scheduled)

**Cost implication.** SITUATION changes per chapter (cached per chapter). ROLE + BIBLE + CORE cached per session. Per-turn cache writes drop from 55% share to ~15-20% share purely from this discipline.

### 9. Pacing signals

Three per-turn computations + one chapter-level signal, injected as Narrator DYNAMIC advisories:

| Signal | Compute | Fires when |
|---|---|---|
| Reactivity ratio | `world_initiated_beats / total_beats` over trailing 8 turns | Sustained <0.2 |
| Scene-link discipline | Did last scene end with forward hook or clean closure? | 2 consecutive clean closures without new hook |
| Thread tension stagnation | Per-thread `|tension_delta|` over 5 turns, `touched_count ≥ 3` | `|delta| ≤ 1` |
| Arc dormant | Active arc advanced 0 times in current chapter | Chapter close approaching (warning signal) |

Classifications (`world_initiated | player_initiated`, `scene_end.leads_to ∈ {unanswered_question | kinetic_carry | relational_tension | unpaid_promise | null}`) are emitted by Archivist and feed the pure functions.

**Advisory, not rails.** Signals tell Narrator what's slipping; Narrator decides how to respond. Same discipline as v1's momentum-trap rule.

### 10. Runtime phases (per turn)

```
1. update chapter runtime          // pure code
2. evaluate current primary face   // evaluateCurrentPrimaryFace(state)
3. fire pressure ladder            // updatePressureLadder(runtime, state)
4. build working set               // buildWorkingSet(state, playerInput)
5. assemble scene packet           // buildScenePacket(state, playerInput)
6. narrate turn                    // Narrator call, streaming
7. archive turn                    // Archivist call, async
8. validate + apply patch          // partial-accept recovery
9. recompute pacing                // reactivity / scene-link / stagnation / arc-dormant
10. persist canonical state        // IndexedDB
```

Phases 1-5 are pure code running before the Narrator call. Phases 7-9 are pure code plus one async Archivist call.

### 11. Cost envelope

v1 costs **$11** per 4-chapter Epic Sci-Fi run. Breakdown: cache-write 55% / output 26% / cache-read 10% / fresh input 8%. Martin's ambition is **$4**.

**Honest framing:**
- **Sonnet 4.6 output floor ≈ $5** regardless of architecture (1000 tokens × $15/M × ~150 narrative turns + overhead)
- **Architecture-only path (Path A):** $6-7 target for v2 MVP. Scene packet + BP2 discipline + Haiku-capable Archivist + no Narrator follow-up calls
- **Hybrid routing (Path C, V2.1):** Narrator defaults to Haiku for routine turns, escalates to Sonnet for hero moments. Only path that touches $4.

**v2 MVP commitment: ≤$7.** Soft kill at $8. Design must be Path-C-ready (CORE prompt works at both Sonnet and Haiku tiers, role interfaces stable across model swaps) but MVP doesn't ship hybrid routing.

**$4 requires Path C.** Flag it; don't design against it in MVP.

---

## Scope lock — V2a MVP

Everything below is the ship envelope. Anything not listed is out.

### In scope

| # | Move | Files | Complexity |
|---|------|-------|-----------|
| 1 | `Sf2State` schema + entity graph (hierarchy, invariants, anchoring rules, protected NPC identity) | `lib/sf2/types.ts` (new), `lib/sf2/invariants.ts` (new) | Medium |
| 2 | IndexedDB persistence adapter via `StoryforgePersistence2` interface | `lib/sf2/persistence/indexeddb.ts` (new), `lib/sf2/persistence/types.ts` (new) | Low-Medium |
| 3 | Firewall actor × write-type rule (Narrator can't write narrative state; Archivist can't write mechanical) | `lib/sf2/firewall/actor.ts` (new) | Low |
| 4 | Narrator endpoint: mechanical tools only + `narrator_annotation` hint | `app/api/sf2/narrator/route.ts` (new), `lib/sf2/narrator/prompt.ts` (new), `lib/sf2/narrator/tools.ts` (new) | High |
| 5 | Archivist endpoint: async after Narrator, reads prose as truth, annotation as hint | `app/api/sf2/archivist/route.ts` (new), `lib/sf2/archivist/prompt.ts` (new), `lib/sf2/archivist/patch.ts` (new) | High |
| 6 | Author endpoint: chapter-boundary only, emits `AuthorChapterSetupV2` | `app/api/sf2/author/route.ts` (new), `lib/sf2/author/prompt.ts` (new), `lib/sf2/author/schema.ts` (new), `lib/sf2/author/payload.ts` (new) | Medium |
| 7 | Author transform: three-way split `{ runtimeState, scaffolding, openingSeed }` | `lib/sf2/author/transform.ts` (new) | Medium |
| 8 | Dynamic antagonist face evaluator | `lib/sf2/runtime/antagonist-face.ts` (new) | Low |
| 9 | Pressure ladder execution | `lib/sf2/runtime/pressure-ladder.ts` (new) | Low |
| 10 | Scored working-set assembler with explicit weights + `reasonsByEntityId` | `lib/sf2/retrieval/working-set.ts` (new) | Medium |
| 11 | Scene packet builder (all sub-packet functions) | `lib/sf2/retrieval/scene-packet.ts` (new), `lib/sf2/retrieval/packets/*.ts` (new) | Medium |
| 12 | `scene_enter` pre-fetch into message history | `lib/sf2/retrieval/prefetch.ts` (new) | Low-Medium |
| 13 | Pacing signals (reactivity / scene-link / stagnation / arc-dormant) | `lib/sf2/pacing/signals.ts` (new) | Low |
| 14 | Validation + partial-accept recovery (applies Archivist patch, rejects invalid sub-writes, logs drift) | `lib/sf2/validation/apply-patch.ts` (new) | Medium |
| 15 | Post-turn recompute pipeline (phases 1-10) | `lib/sf2/runtime/turn-pipeline.ts` (new) | Medium |
| 16 | Feature flag `/play/v2` with isolated schema + isolated save slots | `app/play/v2/page.tsx` (new), `components/sf2/game-screen.tsx` (new) | Low-Medium |
| 17 | Instrumentation extensions: `ACTOR_WRITE`, `PACING_SIGNAL`, `AUTHOR_TURN`, `WORKING_SET`, `FACE_SHIFT` | `lib/sf2/instrumentation/*.ts` (new) | Low |

### Scope discipline

- **Genre:** Epic Sci-Fi. Same as v1 baseline — direct A/B. Noir queued as a second validation run (post-MVP) for architectural stress.
- **One origin / class pair:** pick the one Martin has played most. No playbook variation.
- **One authored arc skeleton:** reuse v1's Ch1 setup shape. Author runs at chapter boundaries only (no mid-chapter, no scheduled checkpoint).
- **New-game-only.** No v1-save migration. v1 continues from existing saves on `/play`. v2 plays only new games from `/play/v2`.

### Explicitly OUT

- Tiered retrieval Tier 2 dynamic modules beyond scene_packet / Tier 3 `recall_*` tools — ship as stubs; exercise only when budget is over
- Steward extraction — Narrator keeps d20 discipline
- Genre-specific pacing thresholds — one set of thresholds, tune later
- NPC agendas and faction agendas — schema allows the field, content unauthored in MVP
- Schema-level anti-invention rewrite — targeted fixes only; systemic pass if fabrications persist
- Mid-chapter Author runs
- Save migration from v1
- Any genre other than Epic Sci-Fi
- Trajectory confidence decay (R2 from roles doc) — planted revelations use simple `revealed: boolean`
- Server-backed persistence — IndexedDB only
- Cross-device sync / auth

---

## Build sequence (gated)

Each stage gates the next. No stage proceeds until its measurement passes.

**Stage 0 — Instrumentation (already shipped).** Batch 1: `TURN_TIMING`, `WRITE`, `FIREWALL_OBSERVATION`, `REJECTION_RECORD`, `ENTITY_CREATION`, `CHAPTER_STATS`, `CONTINUITY_STATS`. Analyze scripts for reconstructing metrics from raw logs: `scripts/analyze-continuity.mjs`, `scripts/analyze-costs.mjs`.

**Stage 1 — `Sf2State` schema + IndexedDB + firewall actor rule** (items 1, 2, 3)
- Entity graph in `lib/sf2/types.ts`. Invariants enforced at write time.
- IndexedDB persistence adapter behind `StoryforgePersistence2` interface.
- Firewall actor rule in observe mode first; enforce after one Ch1 playthrough of clean logs.
- **Gate:** zero legitimate writes rejected by actor rule across a Ch1 playthrough on v1 (dogfood observe).

**Stage 2 — Narrator / Archivist split** (items 4, 5, 14)
- Narrator: mechanical tools only + `narrator_annotation`.
- Archivist: async after Narrator, reads prose as truth, annotation as hint, emits `Sf2ArchivistPatch`.
- Validation + partial-accept recovery.
- **Gate:** anchor reference miss rate ≤5% over a 2-chapter run. v1 baseline: 11%. If plateau at 7-9%, ship with degrading-confidence fallback (high/medium/low tiers; low logged-not-applied).

**Stage 3 — Scored working set + typed scene packet + pre-fetch** (items 10, 11, 12)
- Replace any compressed-state-style transmission in DYNAMIC with working-set → scene packet.
- `scene_enter` pre-fetch into message history.
- **Gate:** Narrator DYNAMIC block + scene packet together < 1800 tokens at Ch4. v1 baseline: ~5-6k. Mid-turn `recall_*` frequency < once per 3 scenes.

**Stage 4 — Pacing signals** (item 13)
- Pure functions compute reactivity / scene-link / stagnation / arc-dormant.
- Inject as Narrator DYNAMIC advisories.
- **Gate:** advisories don't fire spuriously on Ch1 playthrough (hand-audit; initial thresholds are guesses).

**Stage 5 — Author + transform + antagonist face + pressure ladder** (items 6, 7, 8, 9)
- Author emits `AuthorChapterSetupV2` at chapter boundaries.
- Transform splits into runtimeState / scaffolding / openingSeed.
- Antagonist face evaluator runs post-turn.
- Pressure ladder fires triggered steps.
- **Gate:** a reader of only `OpeningScenePacketSeed` + transform-generated narrator context can understand the chapter's stakes. Hand-audit first 2 chapter openings. Zero instances of scaffolding content appearing in Narrator prompt (log `ACTOR_WRITE` source).

**Stage 6 — Turn pipeline + `/play/v2` + A/B run** (items 15, 16, 17)
- Wire all runtime phases into a single pipeline per turn.
- Feature flag `/play/v2` entry point.
- Instrumentation extensions emit per-stage.
- Play v1 Ch1-4 Epic Sci-Fi with chosen origin/hook. Play v2 Ch1-4 with same.
- Run `scripts/analyze-continuity.mjs` against both.

Rough sizing: Stages 1-5 = 3-4 weeks. Stage 6 = 1 evening playthrough + analysis.

---

## Measurement & kill criteria

v2 MVP does not ship as a replacement unless it beats v1 on all three primary metrics in a like-for-like 4-chapter Epic Sci-Fi run:

| Metric | v1 baseline | v2 target | Source |
|--------|-------------|-----------|--------|
| **Thread continuity rate** | Ch2→3 cliff 25%; avg Ch2→3 + Ch3→4 = 42% | ≥50% every chapter transition, no cliff below 40% | `CONTINUITY_STATS` |
| **Anchor reference miss rate** | ~11% (13/115) | ≤5% | `FIREWALL_OBSERVATION` `anchor_reference_missing` / `WRITE` |
| **Arc spine advancement** | Ch4 = 0 advances | ≥1 advance per chapter per active arc until resolved | `ENTITY_CREATION` + `CHAPTER_STATS` |

**Secondary (guardrails):**
- Session cost ≤$7 (soft kill at $8 — not primary; v2 at $9 with continuity fixed still wins the primary bet)
- Cache-write share ≤25% (v1 = 55%). Structural test for whether BP2/BP3 discipline landed.
- DYNAMIC block + scene packet <1800 tokens at Ch4. Tests scored working-set effectiveness.
- Zero scaffolding-content-in-Narrator-prompt incidents across a 4-chapter run. Tests transform layer integrity.

**Kill decisions:**
- Thread continuity <40% at any transition → Author's responsibilities expand (mid-chapter runs, trajectory confidence) in V2.1
- Anchor miss >8% on 3 consecutive chapters → Archivist stays on Sonnet, Haiku path deferred
- DYNAMIC + scene packet >3k tokens at Ch4 → working-set weights or cap need tightening before proceeding
- Any scaffolding leak → transform layer has a correctness bug that must be fixed before ship

---

## Critical files

### Existing — must understand before modifying

- `/Users/martin.heuer/storyforge/lib/types.ts` — v1 GameState interface; `Sf2State` lives alongside, discriminated by schema version
- `/Users/martin.heuer/storyforge/lib/system-prompt.ts:44` — `buildSystemPrompt()` v1 three-layer composer; pattern to replace in v2
- `/Users/martin.heuer/storyforge/lib/system-prompt.ts:1600` — `compressGameState()` v1 fuzzy-match selection; replaced wholesale by scored working set
- `/Users/martin.heuer/storyforge/app/api/game/route.ts:380` — v1 POST handler and stream loop; Narrator endpoint mirrors structure
- `/Users/martin.heuer/storyforge/lib/tool-processor.ts:107` — `applyToolResults()` v1 domain dispatch; firewall actor rule pattern plugs in
- `/Users/martin.heuer/storyforge/lib/migrations/stage2.ts` — pattern for schema discriminant migration (v2 uses it to mark `Sf2State`)
- `/Users/martin.heuer/storyforge/lib/instrumentation.ts:47` — `TurnTimer`, `emitLine`; extend with v2 counters
- `/Users/martin.heuer/storyforge/lib/game-data.ts:43` — `createInitialGameState()` v1 localStorage IO; v2 IndexedDB adapter lives in `lib/sf2/persistence/`
- `/Users/martin.heuer/storyforge/scripts/analyze-continuity.mjs` — baseline reconstructor; rerun on v2 output
- `/Users/martin.heuer/storyforge/scripts/analyze-costs.mjs` — cost reconstructor
- `/Users/martin.heuer/vaults/brainforest/storyforge/_temp - dont commit/` — 12 shaping zettels; consult for rationale but don't reimplement
- `/Users/martin.heuer/vaults/brainforest/storyforge/Storyforge v2 System Design Codex/` — 11 codex docs; load-bearing for items 6-14 of §Scope

### New files to create (MVP)

```
app/play/v2/page.tsx
app/api/sf2/narrator/route.ts
app/api/sf2/archivist/route.ts
app/api/sf2/author/route.ts

components/sf2/game-screen.tsx

lib/sf2/types.ts
lib/sf2/invariants.ts
lib/sf2/persistence/types.ts
lib/sf2/persistence/indexeddb.ts

lib/sf2/firewall/actor.ts

lib/sf2/narrator/prompt.ts
lib/sf2/narrator/tools.ts

lib/sf2/archivist/prompt.ts
lib/sf2/archivist/patch.ts

lib/sf2/author/prompt.ts
lib/sf2/author/schema.ts
lib/sf2/author/payload.ts
lib/sf2/author/transform.ts

lib/sf2/runtime/turn-pipeline.ts
lib/sf2/runtime/antagonist-face.ts
lib/sf2/runtime/pressure-ladder.ts

lib/sf2/retrieval/working-set.ts
lib/sf2/retrieval/scene-packet.ts
lib/sf2/retrieval/prefetch.ts
lib/sf2/retrieval/packets/cast.ts
lib/sf2/retrieval/packets/tensions.ts
lib/sf2/retrieval/packets/chapter.ts
lib/sf2/retrieval/packets/mechanics.ts
lib/sf2/retrieval/packets/recent-context.ts

lib/sf2/pacing/signals.ts
lib/sf2/pacing/classifications.ts

lib/sf2/validation/apply-patch.ts

lib/sf2/instrumentation/counters.ts
lib/sf2/instrumentation/pacing.ts
```

All v2 code lives under `lib/sf2/` and `app/api/sf2/` — zero imports from v1 `lib/*`. Parallel track discipline.

---

## Verification plan

1. **Schema freeze (Stage 1):** `tsc --noEmit` passes with `Sf2State` as discriminated union alongside v1 GameState. No cross-imports. IndexedDB adapter round-trips canonical state losslessly on save/load.

2. **Actor firewall observe (Stage 1):** Play Ch1 on v1 with firewall rule logging but not blocking. Review `FIREWALL_OBSERVATION` output. Zero legitimate writes flagged → enforce.

3. **Archivist anchor accuracy (Stage 2):** Manually annotate first 40 narrative writes in a v2 Ch1 playthrough. Compare to Archivist output. Miss rate ≤5% on rolling window → proceed. Plateau at 7-9% → ship with degrading-confidence fallback.

4. **Working-set token budget (Stage 3):** Instrument DYNAMIC + scene packet token count per turn via `PACING_SIGNAL`. Plot across 4 chapters; Ch4 peak <1800 → proceed.

5. **Working-set reason inspection (Stage 3):** Spot-check 10 turns' `reasonsByEntityId`. Do the top 6 full entities make intuitive sense given scene + player input? Tune weights if obvious misses.

6. **Pacing calibration (Stage 4):** Hand-audit 20 turns. Does "reactivity <0.2" fire when the scene is clearly player-driven? Tune thresholds if false-positive rate >20%.

7. **Transform integrity (Stage 5):** Assert in code that `ChapterSetupScaffolding` content (npcHiddenPressures, possibleRevelations, moralFaultLines, escalationOptions) never appears in Narrator prompt. Runtime check with `ACTOR_WRITE` logging; fail loud.

8. **Opening packet quality (Stage 5):** Hand-read first 2 chapter_openings from a v2 playthrough. Can a fresh reader understand the chapter's stakes without access to scaffolding? If not, Author prompt needs work.

9. **Antagonist face responsiveness (Stage 5):** Play a chapter where the player leans one way for 3 turns, then pivots. Does `currentPrimaryFace` update by the 5th turn? If not, scoring function needs work or signals are too coarse.

10. **A/B run (Stage 6):** Play v1 Ch1-4 Epic Sci-Fi with same origin/hook. Play v2 Ch1-4 with same. Compare `CONTINUITY_STATS`, `WRITE` attribution, `FIREWALL_OBSERVATION anchor_reference_missing` rate, session cost totals. Use `scripts/analyze-continuity.mjs` on both runs.

---

## Decisions locked (2026-04-23)

1. **Origin / class for MVP:** Epic Sci-Fi · origin `synod` · class `seeker` ("Synod's investigative arm. Sanctioned interrogator."). The pairing puts the PC inside the institution the chapter tests — natural investigative density, pre-existing institutional contacts (Synod favorable, Undrift hostile), matches the Codex validation example's tone and vocabulary.

2. **Schema freeze:** `Sf2State` locks at end of Stage 1. Re-opens only on Stage 2+ kill-criterion signals (anchor miss plateau >8%, transform leak, working-set >3k tokens at Ch4). Bias toward stability; iterate only when data demands it.

3. **Archivist model:** **Haiku 4.5 from day one.** Heavy prompt investment is the strategy — if anchor miss can't hit ≤5% on Haiku after prompt iteration, escalate to Sonnet (fallback path preserved). Cost saving: ~$1.50/session captured immediately. The degrading-confidence fallback (high/medium/low tiers; low logged-not-applied) is a hard requirement for Stage 2 ship.

4. **v1 continuation:** `/play` continues indefinitely for existing v1 campaigns. v2 lives at `/play/v2`. No sunset.

5. **Author prompt:** Use the paste-ready prompt in `/Users/martin.heuer/vaults/brainforest/storyforge/Storyforge v2 System Design Codex/storyforge-2-author-validation-example.md` §4 as the canonical v2 Author prompt. `AuthorInputSeed` (§1 of that doc) is the authoritative seed shape. The example's 18 authorial rules, output length caps (3-5 NPCs, 3-5 threads, 3-5 pressure ladder items, 2-4 revelations, 2-4 fault lines, 3-5 escalations, 2-3 lore items), and quality-test criteria (§6) are binding for MVP. Adapt the Hegemony/Warden example payload to Synod/Seeker content for the Stage 5 validation run.

---

## Memory taxonomy

Storyforge v2 is an agent-memory system. Framing our architecture against the cognitive-science taxonomy (from Weng 2023, echoed in current agent-memory writing like Pachaar's "Build Agents that never forget") clarifies what we have, what we share across industry patterns, and where the known gaps are.

### Episodic memory — "what happened"

Specific events in chronological order. In v2:
- `state.history.turns[]` — full turn records (player input, narrator prose, annotation, archivist patch, pacing classification)
- `state.chapter.sceneSummaries[]` — per-scene compression with `leads_to` forward signal
- `state.history.rollLog[]` — per-roll record with outcome
- `state.campaign.pivotalSceneIds[]` — hand-curated (or future-Author-curated) moments worth preserving

**Bounded replay, not embeddings.** Retrieval is chronological tail + keyword match. We chose this over vector embeddings because within a single campaign (~100 entities, ~150 turns) structural traversal via the entity graph answers every multi-hop query we care about without the cost of indexing.

### Semantic memory — "what is true"

Facts and concepts that persist. In v2:
- The **entity graph** itself (arcs, threads, decisions, promises, clues, NPCs, factions) is semantic memory — typed, relational, queryable
- `state.campaign.lexicon[]` — emergent canon phrases the Narrator coins that become campaign voice
- `state.campaign.locations[]` — world facts
- Chapter runtime state + scaffolding — authored canon for the current chapter

**Structured over semantic search.** The article's canonical example ("Was Alice's project affected by Tuesday's outage?") is a 3-entity relational traversal. Our owner-join retrieval + anchored decisions/promises/clues solve that at scene-packet time without embeddings.

### Episodic → semantic consolidation

The bridge where repeated specific events distill into general knowledge. In v2:
- **Lexicon capture** — Archivist catches register-perfect phrases from narration, they become reusable canon (implemented)
- **`chapter_meaning` retrospective** — the Author at chapter close distills a chapter's worth of turns into a 5-element summary that seeds the next chapter's opening (designed but deferred; see §5)
- **Pruning** — threads transitioning out of `active` demote their anchored decisions/promises/clues; aged floating clues consume out (implemented)
- **Tension history on threads** — `tensionHistory[]` records per-turn movement, enabling trend recognition (implemented; not yet read)

### Procedural memory — "how this campaign plays"

Skills, workflows, and preferences learned from repeated interaction. **Currently absent.** Explicitly acknowledged as a future direction.

Candidate procedural signals to track per campaign:
- **Player engagement pattern** — was the last quick-action selected verbatim, edited, ignored? Over time, learns which action archetypes this player actually uses.
- **Check preference** — ratio of social / investigative / physical rolls; surface more of what the player leans into.
- **Prose length fit** — track narrator output token count vs. player response latency as a proxy for "is this length right for this player."
- **Thread archetype engagement** — does the player re-engage faction threads vs. character threads vs. mystery threads? Author can privilege the shapes that stick.
- **Roll cadence** — one check per N turns, tuned to the specific player.

**How procedural memory would land**: a new `state.campaign.procedural` field with rolling observations, used to adjust working-set weights (per-campaign tuning), seed Narrator DYNAMIC advisories ("player leans into social; surface Insight here if possible"), and inform Author's Ch2+ setup (carry the thread archetypes that worked forward).

**Why deferred**: requires sustained play data before it's worth building (fitting a model to one chapter would overfit). Revisit after ≥3 full campaigns played on v2. Pure optimization; v2 MVP is validated without it.

---

## Out of scope for this doc (named so they aren't forgotten)

- Static prompt block trimming (v1 CORE is ~10,895 tokens — a separate pass)
- Migration of existing v1 saves into v2 shape
- Genre-specific tuning of working-set weights and pacing thresholds
- Authored content for NPC / faction agendas across all six genres
- Quick action quality rewrite (action + emotional framing / physical detail / intent) — separate slot, post-MVP
- Post-v2.0 Steward extraction trigger criteria
- Author mid-chapter runs / pivot-triggered runs / scheduled checkpoints
- Trajectory confidence decay mechanism for planted revelations and thread trajectories
- Cross-device sync / server-backed persistence / auth
- Full anti-invention schema pass (typed durations, bounded ranges, enum where free-text)

---

## What Draft 3 merges from which source

**From Draft 2 (eagle):**
- Kill criteria with numbers (§Measurement)
- Cost envelope with Sonnet floor + Path C commitment (§11)
- Build sequence with proceed-gates (§Build sequence)
- Cache-breakpoint discipline (BP1-BP4, dynamic-content-never-in-system rule) (§8)
- Per-role DYNAMIC composition via `buildSystemBlocks(state, forCaller)` (§8)
- New-game-only migration commitment (§Scope)
- A/B methodology via `analyze-continuity.mjs` (§Verification)
- Archivist failure non-fatal + "LAST TURN: anchoring failed" fallback (§1)
- Firewall actor × write-type rule as behavioral contract (§1)

**From Codex:**
- `AuthorChapterSetupV2` schema as authoritative Author output (§3)
- Three-way transform: `runtimeState / scaffolding / openingSeed` (§3)
- Visibility matrix (§3)
- Dynamic antagonist face with evaluator function (§4)
- Pressure ladder with trigger + `fired` (§5)
- Scored working-set assembler with explicit weights + `reasonsByEntityId` (§6)
- `Sf2NarratorScenePacket` as typed structure (§7)
- Moral fault lines and escalation options as scaffolding primitives (§3)
- IndexedDB over localStorage with persistence interface (§2)
- Runtime phases 1-10 per turn (§10)
- `lib/sf2/` parallel path discipline (§Critical files)

**New to Draft 3:**
- The merge itself (codex architecture + eagle engineering rails)
- Verification checks that the transform layer actually prevents scaffolding leakage (§Verification #7)
- Antagonist face responsiveness check (§Verification #9)
- `working-set reasons inspection` as a debugging workflow (§Verification #5)
- Explicit zero scaffolding-in-Narrator-prompt as a kill guardrail (§Measurement)
