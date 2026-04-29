# Storyforge V2 — Harness and Context Engineering

System design overview of the V2 reliability substrate. Companion to
`storyforge-2-design.md` (architecture intent) and `prompt-composition.md`
(cache layering details). This doc focuses on the two systems that drive
narrative quality and coherence: the **harness** (code-side guardrails) and
**context engineering** (what state reaches the model and how).

---

## The narrative-quality problem

V1 placed the LLM at the center: a single GM call carried the campaign forward,
the system stored what it produced, and continuity emerged from prompt
discipline plus a recent-turn window. That worked for openings and short
arcs. It broke under sustained play.

Three failure shapes recurred in V1 and the early V2 audits:

1. **Drift.** State held one truth (Aul disposition `trusted`), prose rendered
   another (Aul wary in Ch3). The LLM treated state as context to draw from,
   not as a constraint to satisfy.
2. **Silent invention.** The narrator extended state by writing prose that
   implied facts the registry didn't carry, and the archivist retroactively
   inferred entities that should have been authored.
3. **Late state.** Threads, agendas, dispositions, and revelations entered the
   schema only after prose forced them, so state was always a step behind the
   fiction it was supposed to govern.

V2's premise reverses that: **state is the authoritative continuity layer;
prose is its rendering**. The model writes prose. The code owns canon. The
harness enforces the boundary; context engineering ensures the model sees the
state it's supposed to render.

This doc is the architecture that follows from that premise.

---

## Architectural premise

```
state (authoritative)  →  context packet (curated)  →  LLM (renders/extracts)
                       ↑                              ↓
                       └──── harness validates ───────┘
```

Every turn is a roundtrip through this loop. State drives the context packet
(what the model sees). The model produces prose plus structured writes. The
harness validates the writes against state invariants before applying them.
What survives validation becomes the next turn's state.

Three principles fall out:

- **Single concern per LLM call.** Splitting Author / Narrator / Archivist
  prevents one call from doing creative writing, mechanical evaluation, and
  state extraction simultaneously. Each call is scoped to a decision class
  it can reliably make.
- **Bounded context, not maximum context.** The narrator gets the working
  set for the current scene, not the campaign. Tokens spent on irrelevant
  state crowd out the state that matters.
- **State-derived enforcement, not prompt rules.** When the model drifts on
  judgment calls, the fix is to inject the state as a binding directive or
  to validate output against state in code. Prompt rules ("disposition
  trusted means warm voice") have proven unreliable; state-derived
  injection ("Aul: TRUSTED · WARM, PLAIN, LOW PROCEDURAL DISTANCE") is the
  validated pattern.

---

## Role separation

Four conceptual roles. Three are explicit calls; the fourth (Steward) folds
into Narrator.

### Author (`app/api/sf2/author/route.ts`, `lib/sf2/author/`)

Owns chapter setup. Two sequential calls (`author_chapter_spine` and
`author_pressure_surface`) split a previously single 10-field schema that hit
Haiku's reliability ceiling. Produces:

- Chapter frame (central tension, scope, objective, crucible, outcome
  spectrum)
- Spine and load-bearing thread selection
- Antagonist field with default + candidate pressure faces
- Pressure ladder (3-5 escalation steps with severity and threadIds)
- Editorialized lore subset
- Possible revelations with hint phrases and gate fields
- NPC pressure directives + faction stance

The arc-author module (`lib/sf2/arc-author/`) runs once per arc to define
arc-spanning structure (engines, scenarios, antagonist faces).

### Narrator (`app/api/sf2/narrator/route.ts`, `lib/sf2/narrator/`)

Owns turn-grain prose, mechanical annotations, and quick actions. Receives the
scene packet plus player input. Returns prose, an annotation block (rolls,
mechanical effects, scene snapshot deltas), and 4 suggested actions.

The narrator does NOT own durable state. Its annotation is a hint, not a
write. Anything in the prose that should become state goes through the
archivist next.

### Archivist (`app/api/sf2/archivist/route.ts`, `lib/sf2/archivist/`)

Owns state extraction. Reads the prose, the annotation, and the pre-turn state
slice. Returns a structured patch: creates, updates, transitions, attachments,
plus pacing classification, drift flags, ladder fires, lexicon additions,
emotional beats, and revelation hint events.

The archivist treats prose as ground truth. Its patches are proposals; the
apply-patch layer validates and applies them.

### Chapter-meaning (`app/api/sf2/chapter-meaning/route.ts`)

Runs once at chapter close. Synthesizes the editorial read of what just
happened: scale statement, thread ripeness tags, NPC vulnerability exhaustion,
chapter spine outcome. Feeds the next chapter's Author call.

### Why the split is load-bearing

Probe data showed schema reorder, prompt compression, and `max_tokens` bumps
all failed to fix the original "lazy output" failure mode. Splitting the
single 10-field schema into two ~5-field calls produced reliable structured
output. The pattern (split when the model can't carry both responsibilities)
applies whenever a schema starts dropping required fields.

`disable_parallel_tool_use: true` is set on every model call. Without it,
Haiku reproducibly emits multiple parallel partial tool_uses where
`find()`-based dispatch silently picks one and drops the rest. This was the
actual root cause of failures attributed to other layers.

---

## The harness

Three validation surfaces, each at a different lifecycle stage.

### Pre-call: input validation

Before a model call, code validates that the request is well-formed and that
the actor is permitted to make the kind of write the call enables.

- **Firewall for actor** (`lib/sf2/firewall/actor.ts`) — enforces the role
  contract. The Archivist cannot emit mechanical effects (HP, credits,
  combat); those live on the Narrator. Cross-actor writes are rejected
  before the model sees them as available.
- **System block leak detection** (`lib/sf2/prompt/compose.ts`
  `assertNoDynamicLeak`) — dynamic content that ends up in cache-stable
  blocks would poison the prefix. Asserted at compose time so cache
  layering stays clean.

### Mid-call: output validation

After the model returns prose or structured output, code scans for known
failure patterns before that output reaches the player or the patch layer.

- **Display sentinels** (`lib/sf2/sentinel/display.ts`) — regex-based
  detection of forbidden surfaces in narrator prose:
  - Roll-value leaks ("Twenty-two", "Natural 20")
  - Stage labels ("**THE ESCALATION.**")
  - Disposition predicates ("she is still favorable")
  - State-field leaks (retrievalCue verbatim, NPC title cross-contamination)
  - Narrator-reveal omniscient sidebar phrases
  - Absent-speaker / absent-direct-actor patterns (kernel-projected)
- **Canonical-ID validator** (`lib/sf2/scene-kernel/canonical-ids.ts`) —
  rejects scene-snapshot writes that use display-style ids instead of
  canonical entity ids.

Sentinels run in observe mode today: findings are logged as
`coherenceFindings` for the next turn's context but don't block the prose.
Live wiring on the SSE pipeline (PRD #6) will move sentinels to
`block_and_repair`.

### Post-call: patch validation

The archivist's structured patch is validated by `apply-patch.ts` before any
state mutates. Validation is gate-by-gate: each sub-write succeeds or fails
independently, with explicit drift flags for diagnostics.

- **Schema validity** — required fields, enum membership
- **Reference integrity** — every entity id resolves; orphan anchors drop
- **Identity invariants** (`lib/sf2/invariants.ts`) — NPC pronoun and age
  lock at first establishment; subsequent writes that contradict them
  reject. Faction stance and heat are bounded.
- **Ownership invariants** — threads must have an owner; decisions and
  promises must anchor to threads; clues may be floating
- **Document lifecycle** — original_summary locks at create; valid
  transitions enforced (`DOCUMENT_VALID_TRANSITIONS`)
- **Pressure engine consistency** — engine values recompute from anchored
  thread contributions; resolved threads removed from the active pressure
  surface; ladder cooldown rejects consecutive-turn fires
- **Beat validation** — 1 per turn cap, 0.5 salience floor, non-empty
  emotional_tags. Drops drift-flag with specific reason.
- **Revelation gate** — hint-counter dedupes per phrase; reveals that fire
  below threshold or in invalid context produce
  `revelation_premature_reveal` drift (observe mode).

The validator's design rule: **accept valid sub-writes, reject invalid
sub-writes, log drift explicitly**. Partial acceptance keeps state moving
even when the archivist gets parts wrong.

### Recovery paths

Validation failures don't drop the signal; they reroute it.

- **Deferred writes** — low-confidence patches log to
  `pendingRecoveryNotes`. Surface in the NEXT narrator prompt as
  "LAST TURN: re-establish if still relevant" cues. The narrator's natural
  next move re-anchors the missed reference.
- **Coherence findings** — drift signals (pronoun_drift, age_drift,
  anchor_miss, narrator_reveal, etc.) feed the next turn as corrective
  notes. Most don't enforce; they bias the next generation.
- **Stalled revelations** (planned) — when hint counters don't reach
  threshold by chapter target turn count, a stalled flag lets the next
  eligible context fire the reveal without further hint requirement.
  Player-experience safety net for authored twists that would otherwise
  become dead weight.

### State-event-driven enforcement

A class of bugs the harness blocks structurally rather than by validating
output:

- **Pressure ladder cooldown** — apply-patch rejects ladder fires when a
  prior step fired on the immediately preceding turn. Prevents the
  experiential ramp problem where consecutive fires collapse the chapter's
  tension graph into a stair.
- **Per-thread ladder reheat** — ladder fires escalate only the threads the
  step is anchored to (with spine fallback for back-compat), not the whole
  chapter.
- **Identity anchor lock** — pronoun and age lock at first establishment;
  subsequent contradicting writes reject with `protected_field_write`.
- **Background-role classification at chapter open** — threads not in last
  chapter's actives cool harder than active-but-quiet threads (D4 in the
  pressure-engines design).
- **Player-engagement reheat** — runs through the action-resolver path, so
  engagement-without-mechanical-tension still reheats. The earlier delta-
  gated path missed the cohort the floor was meant to capture.

---

## Context engineering

The narrator's prompt is built from canonical state. Code curates; the
narrator never sees more than the working set.

### Working-set assembler (`lib/sf2/retrieval/working-set.ts`)

Pure function: given state + player input + turn index, returns
`{ fullEntityIds, stubEntityIds, excludedEntityIds, emotionalBeatIds,
reasonsByEntityId, computedAtTurn }`.

Selection is rule-based scoring with explicit weights:

- `+5` present in scene
- `+4` named in player input / owner of live scene thread
- `+3` chapter spine / current pressure face / mentioned last turn
- `+2` advanced recently / anchored to scene
- `+6` GM surface override (escape hatch from `chapter.setup.surfaceThreads`)
- `−2 / −3 / −4` decay for off-scene / dormant / resolved

Bucketing: top 6 by score → full; next 8 → stub; remainder → excluded.
Threads are hard-capped at 5 in full to prevent thread-heavy chapters from
crowding out NPCs.

`reasonsByEntityId` records the score breakdown per entity. This is the
diagnostic surface the working-set telemetry consumes.

### Scene packet rendering (`lib/sf2/retrieval/scene-packet.ts`)

The packet is rendered into two layers:

- **Stable scene bundle** — chapter frame, cast identity, threads in scope,
  timeline anchors, prior scene summary, campaign lexicon, off-stage
  chapter cast. Cached at scene open; reused for every turn in the scene.
- **Per-turn delta** — mutable cast read (disposition, agenda, pressure),
  mutable thread tensions (chapter pressure runway), mechanics state,
  pacing advisories, recent beats, revelation progress, player input.
  Built fresh per turn, sent uncached.

The split lets ~70-80% of the prompt sit in cache-stable layers while the
mutable surface stays fresh. `prompt-composition.md` covers the cache
layering specifics.

### Retrievable memory layers

Five typed memory units, each retrievable via different signals:

| Type | Granularity | Retrieval | Purpose |
|---|---|---|---|
| `Sf2Decision` | per-decision | thread anchor | "the PC committed to X" |
| `Sf2Promise` | per-promise | thread anchor + owner | "owed to whom, for what" |
| `Sf2Clue` | per-clue | thread anchor / floating | discoverable evidence |
| `Sf2EmotionalBeat` | per-moment | participants + thread anchor + recency | "remember when X" |
| `LexiconEntry` | per-phrase | recency window | canon vocabulary reuse |

Beats are the newest layer. They live in `state.campaign.beats`, capped at
1 emit per turn with salience floor 0.5. Working-set surfaces top-3 by
`salience × graph relevance × recency`. The narrator sees them in the
per-turn block as "Recent beats" and can reach for them when state otherwise
suggests doing so.

### Cast partition (`lib/sf2/scene-kernel/build.ts`)

Scene kernel partitions the cast into `presentEntityIds`,
`currentInterlocutorIds`, `nearbyEntityIds`, `absentEntityIds`. The narrator's
prompt reads from this partition; the display sentinel uses the same partition
to detect absent-speaker violations. Speaking-allowed is derived from
`presentEntityIds + 'pc'`.

This is the structural fix for "absent NPCs speak" and "interlocutor
disappears" failure modes that prompt rules couldn't reliably catch.

### State-derived directives

Beyond data, the narrator gets *binding directives* derived from state:

- **Disposition tier** rendered with behavioral imperatives (planned in NPC
  state-bound rendering shaping; current implementation uses general rule
  block in system prompt)
- **Pressure ladder progress** — which steps fired, which remain, severity
- **Revelation progress** — for active revelations,
  `hintsDelivered/hintsRequired`, valid contexts, hint phrases the narrator
  can plant
- **Pacing advisories** (`lib/sf2/pacing/signals.ts`) —
  reactivity-ratio, scene-link discipline, thread-tension stagnation. Live
  hints, not enforcement.
- **Closing geometry** — at chapter open, the prior chapter's close
  location and cliffhanger are injected as "open inside the consequences
  of that — do NOT reopen the prior chapter's frame."

The pattern: extract the constraint from state in code, render it as a
directive in the prompt. The narrator doesn't decide the constraint; it
applies it.

### Working-set telemetry (`lib/sf2/instrumentation/`)

Per-turn diagnostic record capturing:

- `referencedInProse` (alias-match + role-noun pass)
- `mutatedByArchivist` (accepted writes)
- `excludedButReferenced` — entity referenced in prose but not in working
  set (covers both explicit exclusion and off-radar)
- `fullButUnreferenced` — entity provided at full detail but not referenced
- `stubButMutated` — stubbed entity that the archivist mutated

Capped at 10 records (~one chapter). Replay-only consumer for now;
production logging would use a side-channel. The data informs whether the
rule-based assembler needs scoring upgrades or just rule sharpening; the
decision waits for measurement, not intuition.

---

## Turn lifecycle

Concrete walkthrough of a single turn under the harness:

```
1. Player submits input.

2. buildScenePacket(state, playerInput, turnIndex):
   - Working-set assembler scores entities, buckets full/stub/excluded
   - Scene-kernel partitions cast (present/interlocutor/nearby/absent)
   - Action-resolver resolves player references (pronouns, named entities,
     forbidden substitutions for absent/non-targeted entities)
   - Pacing advisory computed from recent turns
   - Revelation progress packets built for active revelations

3. Compose system blocks (cached prefix):
   - CORE (rules, role discipline) — stable
   - BIBLE (genre voice, world canon) — stable
   - ROLE (narrator-specific instructions) — stable
   - SITUATION (chapter-scoped context) — chapter-stable

4. Compose per-turn message (uncached):
   - Mutable cast read, thread tensions, recent beats, pacing,
     revelation progress, player input

5. assertNoDynamicLeak runs on each system block — no dynamic content
   poisons the cache prefix.

6. Narrator call → prose + annotation + suggestedActions.

7. Display sentinel scans prose:
   - Roll-value, stage-label, disposition-predicate detection
   - Per-NPC retrievalCue + title leak check
   - Absent-speaker scan against scene-kernel projection
   - Findings → coherence_findings on the turn record

8. Player-engagement reheat:
   - Action-resolver maps player input → referenced entities
   - pressureThreadIdsForEntity expands to threads
   - Per-thread chapter pressure escalates by REHEAT.PLAYER_ENGAGEMENT_FLOOR

9. Archivist call → patch.

10. apply-patch validation:
    - Resolve references, check identity invariants, validate ownership
    - Apply creates/updates/transitions/attachments per outcome
    - Emotional beats: 1-cap + salience floor + tag check, drift on drops
    - Revelation hints: dedupe per phrase, increment counter
    - Revelations revealed: gate on hint count + context (observe mode
      drifts; enforce mode would block)
    - Ladder fires: cooldown + cap, per-thread reheat
    - Lexicon dedup
    - updateRuntimeEngineValues: recompute engine values from anchored
      thread contributions
    - Document lifecycle: original_summary lock, valid transitions

11. recordTurnTelemetry → state.derived.workingSetTelemetry (capped at 10).

12. Antagonist face evaluation, graph pruning, pacing classification stamp
    on turn record, scene-summary append if scene transitioned.

13. State persists to IndexedDB.

14. Next turn starts from step 1.
```

---

## Test substrate

The harness and context engineering are protected by a fixture-based
regression net. As of this writing: 76 replay fixtures plus several Haiku
probe fixtures.

Categories (from `fixtures/sf2/replay/`):

- **Display sentinels** (~13) — every forbidden phrase pattern + clean prose
- **Document lifecycle** (~6) — create / amend / transition / locked
  attribution / synthesized id / illegal transition
- **Pressure engines** (~7) — engine derivation, runway initialization,
  cooling, reheat, ladder cooldown
- **Action resolver** (~5) — pronoun resolution, named alias, ambiguous
  references, off-stage forbidden substitution
- **Scene kernel** (~3) — cast partition, canonical-id violation observed,
  interlocutor narrowing
- **Narrator binding** (~3) — skill-tag binding, playbook preference,
  non-skill bracket skip
- **Quick actions** (~2) — diversification, repeated-failure exclusion
- **Beats** (~3) — cap drops, silent-drop drift, pc-participant resolution
- **Revelation hints** (~5) — dedupe, evidence both phrases, length-floor
  rejection, gate drift, eligible reveal
- **Working-set telemetry** (~2) — divergence buildbuckets, role-noun pass
- **Real-playthrough regressions** (~7) — captured-from-session JSONs that
  test specific bugs from the audit

Replay runs as a pure deterministic check (no model calls):
`npm run sf2:replay -- fixtures/sf2/replay`. Probe fixtures (`sf2:probe`)
exercise the real Haiku archivist for reliability validation.

The fixture matrix is the audit trail. Bugs from the playthrough audit
become fixtures before they get fixed, so regressions surface immediately.

---

## What the system does NOT do (yet)

Honest scoping. Several known gaps remain shaped but unbuilt:

- **NPC state-bound rendering.** Disposition tier is currently surfaced as a
  one-word label (`trusted`); the system prompt has a general rule block
  about what each tier means. The narrator does the lookup at generation
  time and drifts ~30% of the time. The fix (code-side tier-to-imperative
  resolution rendered into the per-turn block per NPC) is shaped in
  `2604281713 Storyforge NPC State-Bound Rendering Shaping.md`. Five open
  questions waiting on playthrough data.
- **Spatial pronoun enforcement.** "His desk" in her office (Bug 6) requires
  scene-kernel `location.ownerId` driving a forbidden-pronoun list. Not
  built.
- **Buffered streaming.** Display sentinels run in observe mode. Live
  enforcement on the SSE pipeline (PRD #6) would let `block_and_repair`
  rewrite or quarantine bad prose before it reaches the player.
- **Scoring-based working-set assembler.** Telemetry instruments divergence;
  the decision to invest in scoring (or not) follows the data.
- **Stalled revelation fallback.** Hint-counter zettel proposes the
  mechanism; the substrate is partial. Implementation pending.
- **PEL Stages B+C.** Causal-history retrieval into scene bundle. Wait for
  cross-scene arc-collapse signal in playthroughs.

---

## Architectural rules to keep

When extending the system, the following rules have been load-bearing across
every reliability win:

1. **Code derives constraints; the model applies them.** Whenever the model
   is asked to interpret a rule from prompt text, the system drifts. Move
   the constraint to code; render it as a directive.
2. **One LLM call, one decision class.** Mixing creative writing and
   structured extraction in a single call hits reliability ceilings that
   compression and schema-tuning don't fix. Split.
3. **Validate at boundaries; degrade gracefully.** Patches are proposals;
   apply-patch accepts or rejects sub-writes individually. No silent drops:
   every drop produces a drift flag.
4. **Observe before enforce.** New constraints land in observe mode (drift
   without blocking) for at least one playthrough before flipping to
   enforce. This is how display sentinels, revelation gates, and canonical-
   id checks all came online.
5. **State events trigger; archivist judgment fills.** When a new memory
   layer or write type is needed, derive it from state events where
   possible and let the archivist provide prose-anchored content. Pure-
   archivist-judgment entries (without state-event triggers) are the
   drift-prone shape.
6. **Test before refactor.** The fixture matrix has caught structural
   regressions in pressure engines, ladder enforcement, scene kernel, and
   the working-set assembler. Adding a constraint without a fixture is
   ungrounded.

These aren't aspirational; they're descriptive of what's worked.

---

## Net

The V2 reliability substrate is two systems working against the same
problem from opposite ends:

- The **harness** prevents bad outputs from corrupting state, by validating
  proposals against state invariants and surfacing drift before it
  compounds.
- **Context engineering** prevents bad inputs from producing bad outputs,
  by curating which state reaches the model and rendering constraints as
  binding directives rather than interpretable rules.

Together they shift the system center of gravity from "GM call with
attached state mutation" to "state-guided turn pipeline." Narrative quality
becomes a state-coherence property: when state is right and the model sees
the right slice of it, the prose follows.

The remaining work is to extend this pattern (NPC state-bound rendering,
spatial pronoun enforcement, buffered streaming) and to harvest playtest
data that guides the open calibration decisions (working-set scoring,
revelation gate enforcement timing, beat trigger mechanism).
