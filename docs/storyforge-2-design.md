# Storyforge V2 — Design Doc

Draft 1 · 2026-04-22 · grounded in tonight's 2×4 Epic Sci-Fi playthrough

---

## 1. Thesis, hypothesis, kill criteria

### Thesis

Storyforge's fragility is not a shortage of gameplay mechanics. It's a **context-engineering problem**: state gets emitted inconsistently, loses structure across chapter boundaries, and by chapter 3+ the narrative is improvising on an increasingly unreliable ground truth. V2 is a bet that three architectural moves — a hierarchical entity graph, a Narrator / Archivist role split, and owner-join retrieval — produce a coherent harness that the existing prompt and gameplay loop can ride on without narrative drift.

### Hypothesis

> *Between-chapter continuity is the dominant quality axis. If V2 keeps 50%+ of each chapter's threads live in the next chapter, reduces anchor-reference errors by half, and every active arc advances at least once per chapter, the narrative stays coherent through a 4-chapter arc. Within-chapter pacing is a secondary concern.*

### Kill criteria (concrete, grounded in tonight's V1 baseline)

V2 MVP does not ship unless it beats V1 on these three measures in a like-for-like 4-chapter Epic Sci-Fi run:

| Metric | V1 baseline tonight | V2 target | Rationale |
|---|---|---|---|
| **Thread continuity rate** | Ch2→3 cliff at **25%** (2/8) — Ch2→3 and Ch3→4 averaged 42% | **≥50% at every chapter transition, no cliff below 40%** | The 25% at Ch2→3 aligned exactly with your 3→2 rating drop. Beating this is the primary signal. |
| **Anchor reference miss rate** | ~11% (13 fires / 115 writes) | **≤5%** | Archivist anchor inference is what the hierarchy rests on. Below 95% it carries permanent GM fallback. |
| **Arc spine advancement** | Ch4 dropped to **0** advances — arc abandoned | **≥1 advance per chapter for every active arc until resolved** | Ch4's rating cliff happened with healthy continuity (60%) but the arc stopped moving. Passive-continuity alone isn't enough; the arc has to stay under pressure. |

**Kill decision:** If a 4-chapter V2 run on the same genre produces any chapter transition below 40%, or anchor miss rate above 8%, V2 is not a drop-in replacement for V1 and scope has to change — most likely by un-deferring the Setup Agent.

---

## 2. What V2 keeps, changes, defers from V1

### Keeps (unchanged)

- Six-genre content layer, genre configs, genre mechanics (witness marks, temp_load, asset activity)
- d20 + proficiency + disposition mechanics
- Chapter close flow (3 phases)
- Quick actions UX, scene-end semantics
- Streaming tool-call loop, roll interception
- localStorage persistence
- The player-facing game loop. V2 is invisible to the player as a feature.

### Changes (load-bearing)

- **State graph:** flat parallel arrays (`threads[]`, `promises[]`, `decisions[]`, `clues[]`) become a hierarchy. Arcs group threads by resolution dependency. Decisions, promises, clues anchor to threads. NPCs and factions own threads.
- **Role split:** the single "GM" collapses into **Narrator** (prose, roll discipline, mechanical tool calls) and **Archivist** (state extraction from narration, anchor inference, entity identity, disposition shifts).
- **Retrieval:** threads arriving in the dynamic block pull their owner's current state (disposition, agenda, heat). Retrieval is deterministic, not fuzzy.
- **Pacing signals:** reactivity ratio, scene-link discipline, thread tension stagnation computed deterministically per turn and injected into the Narrator's DYNAMIC block as advisories (not rails).

### Explicitly defers (V2.1 or later)

- **Setup Agent (Author role)** — active composition of chapter handoffs, planted revelations, antagonist-mode orchestration, chapter-meaning synthesis. Risk: tonight's data suggests Ch2→3 weakness is partly compositional, not only structural. Deferral is provisional — see §5 "Un-defer triggers."
- **Tiered retrieval (Tier 1/2/3)** — scope creep. Batch 1 instrumentation will tell us whether the dynamic block is actually bloated before we invest in structured retrieval.
- **Steward** (rules/mechanics sub-agent) — already inlined in the Narrator prompt and not broken. Extract only if d20 discipline degrades at V2 scale.
- **Schema-level anti-invention** — broad tightening across the tool schema. Targeted fixes first; if systemic invention shows up in V2 runs, promote this.
- **Genre-specific tuning** of pacing thresholds. Ship one genre, one set of thresholds. Tune later with data.

---

## 3. Architecture

### 3.1 Entities — the graph

```
Campaign
├── Arc                         // resolution-dependent bundle of ≥2 threads
│   └── Thread                  // autonomous tension, owned by NPC/Faction
│       ├── Decision            // anchored_to [thread_id, ...]
│       ├── Promise             // anchored_to [thread_id, ...]
│       ├── Clue                // anchored_to [thread_id, ...]  (may float)
│       └── Clock | Timer       // the thread's failure mode
├── Floating Clues              // unattached, awaiting connection
├── Faction                     // stance, heat, owned_threads[]
└── NPC                         // disposition, identity, temp_load, owned_threads[]
```

**Key insight:** heat, disposition, cohesion, tempLoad are not parallel state — they are **properties of the entities that threads reference**. When retrieval pulls a thread, it owner-joins onto the owner to get live state. This replaces the current situation where disposition and heat are separate top-level arrays that the GM has to reconcile prose against in its head.

**Arc gate:** arc creation requires ≥2 threads with *resolution dependency* (resolving one partially determines the other's resolution). Tonight's log shows 6 failed arc-creation attempts in 4 chapters — the rule needs to be strict or arcs proliferate.

### 3.2 Roles — Narrator / Archivist

**Narrator (Sonnet 4.6)** — player-facing. Owns:
- Narrative prose
- Roll discipline (DC selection, pending_check)
- Mechanical tool calls: `inventory_use`, `credits_delta`, `combat`, `hp_delta`
- Scene direction: `set_location`, `scene_end`, `set_scene_snapshot`
- Quick actions

Outputs: narrative text + a compact hint block for the Archivist (≤300 tokens).

**Archivist (Sonnet 4.6, can downshift to Haiku once reliable)** — runs after Narrator completes each turn. Owns:
- Narrative-state extraction from Narrator prose
- Entity identity and disposition shifts: `add_npcs`, `update_npcs`, `disposition_changes`
- Graph anchoring: `add_threads`, `add_promise`, `add_decision`, `add_clues` with mandatory `anchored_to`
- NPC presence reconciliation (scene_npc_teleport prevention)

**The split is behavioral, not structural.** Both roles call `commit_turn`. The Narrator's `commit_turn` contains only mechanical fields; the Archivist's `commit_turn` contains only narrative-state fields. Schemas enforce the split. A firewall rule rejects narrative writes from the Narrator actor and mechanical writes from the Archivist actor.

**Why split?** Tonight's log shows 12 `scene_npc_teleport` firewall fires and 13 `anchor_reference_missing` fires. Both come from the Narrator doing the Archivist's job poorly while narrating. Splitting lets the Archivist read the Narrator's prose against current state and produce authoritative state writes, rather than the Narrator guessing while writing.

### 3.3 Retrieval — owner-join

The dynamic block is assembled from scene-relevant threads. For each thread in scope:
- Pull thread itself
- Pull thread's `owner` (NPC or faction) with current `disposition`, `heat`, `agenda`
- Pull anchored decisions/promises/clues that are active
- Do NOT pull any of these for threads whose owner isn't in scene

Scene-scope rule (Batch 1): `owner ∈ scene_npcs OR relevant_npcs ∩ scene_npcs ≠ ∅`. Simple, deterministic. No fuzzy matching. If the filter is under-fitting (too many threads pull, block balloons), we tighten by stakeholder distance in a later batch.

### 3.4 Pacing signals — deterministic, DYNAMIC-block nudges

Three per-turn computed signals emit as Narrator advisories (not rails):

| Signal | Compute | Fires when |
|---|---|---|
| **Reactivity ratio** | `world_initiated_beats / total_beats` over trailing 8 turns | Sustained <0.2 |
| **Scene-link discipline** | Did the last scene end with a forward hook or a clean closure? | 2 consecutive clean closures without new hook |
| **Thread tension stagnation** | Per-thread `|tension_delta|` over 5 turns | `|delta| ≤ 1` AND `touched_count ≥ 3` |

These are **measurement, not authoring**. They tell the Narrator what's slipping; the Narrator decides how to respond. Same discipline as the momentum-trap rule already in V1.

---

## 4. MVP scope

Parallel track, not a replacement. Lives at `/play/v2` behind a feature flag.

### Scope lock

- **One genre:** Epic Sci-Fi (tonight's baseline is here; direct comparison)
- **One origin/playbook:** pick the one you've played most
- **One arc setup:** the pre-authored arc structure from V1's chapter 1 setup — no generative setup yet
- **Same instrumentation:** Batch 1 continuity metrics apply to both V1 and V2; A/B is direct

### Ship list

| # | Move | Files affected | Complexity |
|---|---|---|---|
| 1 | Entity hierarchy + anchored_to graph in GameState | `lib/types.ts`, `lib/tool-handlers/*` | Medium — migration from parallel arrays |
| 2 | Archivist role + split commit_turn schemas | `app/api/game/route.ts`, `lib/tools.ts`, `lib/system-prompt.ts` | High — new agent, new system prompt |
| 3 | Owner-join retrieval in dynamic block | `lib/system-prompt.ts` | Medium — replaces current compress logic for threads |
| 4 | Pacing signals in DYNAMIC block | `lib/instrumentation/pacing.ts` (new), `lib/system-prompt.ts` | Low — pure computation |
| 5 | Firewall rule: actor × write-type compatibility | `lib/firewall/rules/actor.ts` (new) | Low — extends existing firewall |

### Out of scope

- Setup Agent
- Tiered retrieval
- Steward extraction  
- Schema-level anti-invention rewrite
- Any genre other than Epic Sci-Fi
- Migration of existing V1 saves into V2 shape (V2 is new-game-only for MVP)

### Build order

Build in this order because each step unblocks the next:

1. Entity hierarchy — the data shape has to exist before anything can use it
2. Firewall actor rule — catches role leakage during step 2 implementation
3. Archivist role + split — now the Archivist has somewhere to write to
4. Owner-join retrieval — now the hierarchy pays off in the prompt
5. Pacing signals — independent; can slot in anywhere

Rough size: 2-3 weeks for steps 1-4, 2-3 days for step 5.

---

## 5. Un-defer triggers

Explicit conditions under which deferred items become non-negotiable:

- **Setup Agent (Author):** Un-defer if V2 MVP produces thread continuity <40% at any chapter transition despite hierarchy + Archivist working correctly. The deferred assumption is that passive continuity (graph structure) is enough; if the data shows otherwise, active composition has to re-enter scope.
- **Tiered retrieval:** Un-defer if the DYNAMIC block crosses 8k tokens on any turn in a V2 run (it's around 5-6k in V1 today per Ch4 sample). Owner-join has to fit in budget or it becomes part of the problem it was meant to solve.
- **Schema-level anti-invention:** Un-defer if V2 runs produce more than 3 narrative-state fabrications per chapter (today's Ch4 terminal incident is the calibration point). Fabrication rate measurable by post-run review; not automatable in Batch 1.

---

## 6. Known failure modes (designed for, not discovered)

Four failure modes this design has to handle or explicitly accept:

### 6.1 Multi-anchor contradiction
A player decision bridges two threads owned by opposing factions. Owner-join returns contradictory state (one faction trusts the PC, the other is hostile). Narrator sees the contradiction and fence-sits.

**Handling:** Archivist schema allows `anchored_to: [thread1, thread2]` but enforces a "dominant anchor" field — the Archivist picks the owner whose stance is most affected. Owner-join pulls dominant first, secondary second, and the Narrator's prompt explicitly notes when a decision has multiple anchors with divergent owners.

### 6.2 Anchor never hits 95%
If Archivist anchor inference stays at 89-92%, the kill criterion fails narrowly and we're stuck with fallback GM tools indefinitely.

**Handling:** define three Archivist tiers of "anchoring confidence" (high/medium/low). High gets auto-applied; medium gets applied with flag; low gets logged but not applied and the Narrator is asked to name the anchor in the next turn's prompt. Degrades gracefully instead of failing binary.

### 6.3 Retrieval balloon
Scene with 6-8 NPCs pulls 8-10 threads with owner-join. Dynamic block balloons past budget.

**Handling:** hard cap on threads-per-scene at 5 (pick the 5 with highest stakeholder-overlap). Anything dropped surfaces as a single "OTHER THREADS IN SCOPE: …" line so the Narrator knows what's not fully in context. Tightening lever if cap is hit often: stakeholder-distance scoring.

### 6.4 Emergent vs authored collision (partial — Setup Agent deferred)
Without Setup Agent, there is no authored spine to collide with. But the arc graph still encodes intent (arcs are resolution-dependent bundles). Player may go sideways and ignore the arc. The risk is muted but not zero — arcs can sit idle for a chapter, which is the "Ch4 arc advance=0" pattern.

**Handling:** pacing signal "arc_dormant" fires when an active arc has gone one full chapter without advancement. Advisory to the Narrator; doesn't force, but surfaces.

---

## 7. Open questions (block coding)

These must be answered before step 1 of the build:

1. **GameState migration path.** V2 schema is incompatible with V1 saves. Are we new-game-only, or do we ship a backfill migration? MVP recommendation: **new-game-only on `/play/v2`**. V1 continues to work from existing saves. V2.x can add migration once the schema is stable.

2. **Archivist cache strategy.** Narrator and Archivist run back-to-back per turn. Do they share the SITUATION cache block (same situation module + state) or does each have its own? Recommendation: **per-role SITUATION block, no sharing** — the Archivist's view of state is different (needs identity facts; doesn't need antagonist pressure).

3. **Archivist error recovery.** If Archivist's commit_turn fails to parse or hits firewall-block on every anchor, what happens to the turn? Recommendation: **Archivist failure is non-fatal** — the turn commits without narrative-state changes; Narrator is told next turn ("LAST TURN: anchoring failed, re-establish scene state if needed"). Avoids hard errors during play; reduces pressure to get Archivist perfect.

4. **How to feature-flag `/play/v2` without duplicating state-management code.** GameState shape differs between V1 and V2 at the type level. Options: (a) separate GameState type with shared subset, (b) versioned GameState with `schemaVersion` discriminant, (c) runtime branch in tool-processor. Recommendation: **(b) schemaVersion discriminant** — parallels the existing Stage 2 migrator pattern.

---

## 8. What we'd want more data on

Things we can measure in V1 before or during V2 build to tighten the design:

- **Dynamic-block token size distribution** across the 2×4 run — are we already at budget, or is there headroom for owner-join?
- **Per-genre anchor miss rate** — is 11% an Epic Sci-Fi problem or a systemic one? Another genre's run would calibrate.
- **Which threads survived Ch2→3 vs. which died** — was the 25% continuity an arbitrary drop, or did thread-type matter (arc-owned survived, floating died)?
- **Firewall rule hit distribution as the session wore on** — did anchor errors cluster at chapter boundaries or distribute evenly?

None of these block V2 MVP. They would sharpen the kill criterion and suggest where to invest tuning time.

---

## 9. Cost implications

V1 costs $11.00 per 4-chapter Epic Sci-Fi run (196 API calls, $0.056 avg/call). This is premium pricing — an 8-12 chapter campaign lands at $25-40 per player. Martin's ambition is $4 max for a 4-chapter run.

### Where V1's cost lives

| Component | Cost | Share |
|---|---|---|
| Cache write (miss) | $6.11 | **55.5%** |
| Output | $2.85 | 26.0% |
| Cache read (hit) | $1.12 | 10.2% |
| Fresh input | $0.91 | 8.3% |

The dominant bucket is cache-write. Situation block grows as state accumulates, invalidating the prefix every time a new thread / NPC / scene-context substantively changes. V1's flat state arrays compound this — adding a thread changes the whole compressed state block.

Cache-write volume escalates across chapters: Ch1 290k → Ch2 369k → Ch3 449k → Ch4 521k. Late-chapter turns are more expensive to cache than early-chapter turns because the state carried is larger.

### What V2 architecture alone buys (Path A)

Owner-join retrieval + stable SITUATION + DYNAMIC-centric state + hardened Narrator prompt (no follow-up calls) + Haiku Archivist:

- Cache-write share drops from 55% toward ~20% (live state moves out of cached SITUATION)
- Tool-only follow-ups drop from 44 calls ($1.97) to ≤10 ($0.50)
- Archivist on Haiku (~$0.01/call) replaces some Narrator state-extraction overhead

**Realistic target: $6-7 per 4-chapter run.** A 35-45% reduction; the Narrator staying on Sonnet 4.6 with ~1000 output tokens per turn floors the budget around $5.

### The output-token floor

Per-turn narrative output is the binding constraint on Sonnet 4.6 pricing:
- 1000 output tokens × $15/M = $0.015 per narrative turn
- ~150 narrative turns × $0.015 = $2.25 just for output
- Plus cached prefix + Archivist + close phase → **$5 floor on Sonnet regardless of architecture**

**$4 is unreachable on Sonnet 4.6 for narrative turns** without compromising prose length or switching models.

### Cost target — primary, secondary, fallback

| Target | Path | Scope |
|---|---|---|
| **Primary (V2 MVP):** ≤$7 | A — architecture only, Sonnet Narrator, Haiku Archivist | In scope for MVP |
| **Secondary (V2.1):** ≤$4 | C — hybrid routing, Narrator defaults to Haiku, escalates to Sonnet for hero moments | Deferred; post-MVP |
| **Fallback:** $5-6 | B — shorter narration (500 tokens/turn) | Emergency dial if A misses target |

### Soft kill criterion

V2 MVP does not clear the bar if session cost exceeds **$8** (≤27% reduction). At that point the architecture hasn't moved the cost needle enough to justify the rebuild; either the layering work didn't execute (diagnose and fix) or the hypothesis was wrong (reconsider).

**V2 cost is a guardrail, not the primary kill criterion.** The quality metrics in §1 are load-bearing; cost is a secondary success indicator. Shipping V2 at $9 but with Ch3 continuity at 60% would still be a win on the primary bet.

---

## Appendix · Instrumentation

Batch 1 instrumentation (shipped today) covers everything this design doc depends on:

- `TURN_TIMING` — latency baseline
- `WRITE` — per-sub-write attribution by actor / status / type
- `FIREWALL_OBSERVATION` — structural rule violations (observe mode)
- `REJECTION_RECORD` — structured rejection objects (Batch 2 consumer)
- `ENTITY_CREATION` — field population rates per entity type
- `CHAPTER_STATS` / `CONTINUITY_STATS` — chapter close summaries
- `SESSION_STATS` / `SESSION_STATS_BY_GENRE` / `GENRE_UTILIZATION` — on-demand session export

Every line is tagged `genre=<value>` for grep-by-genre pivots.

Tonight's zero-data bug (zod-strip of `_instrumentation`) is fixed and deployed. `scripts/analyze-continuity.mjs` reconstructs metrics from raw log lines for forensic analysis of pre-fix runs.
