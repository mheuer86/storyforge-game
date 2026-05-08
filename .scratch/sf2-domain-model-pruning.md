# SF2 Domain Model Pruning Audit

Date: 2026-05-08

Goal: inventory SF2 entities, statuses, patches, and derived projections; classify each concept; find duplicate or overloaded concepts; identify missing lifecycle tables and weak enums; propose merges, deletions, and contract hardening.

This is a read-only architecture audit. No runtime behavior was changed.

## Evidence Read

- Project handbook and context: `CLAUDE.md`, `CONTEXT.md`, `docs/storyforge-2-design.md`, `docs/rules-engine.md`, `docs/agents/domain.md`
- Core domain model: `lib/sf2/types.ts`
- Patch contracts and persistence: `lib/sf2/validation/apply-patch.ts`, `lib/sf2/persistence/normalize.ts`
- Pressure and pacing: `lib/sf2/pressure/runtime.ts`, `lib/sf2/pressure/derive.ts`, `lib/sf2/pressure/constants.ts`, `lib/sf2/pressure/reheat.ts`
- Retrieval and projections: `lib/sf2/retrieval/working-set.ts`, `lib/sf2/retrieval/scene-packet.ts`, `lib/sf2/scene-kernel/build.ts`
- Lifecycle-adjacent helpers: `lib/sf2/thread-resolution.ts`, `lib/sf2/state-indexes.ts`, `lib/sf2/invariants.ts`, `lib/sf2/runtime/prune-graph.ts`
- Actor/firewall and tool contracts: `lib/sf2/firewall/actor.ts`, `lib/sf2/archivist/tools.ts`, `lib/sf2/author/tools.ts`, `lib/sf2/arc-author/tools.ts`, `lib/sf2/chapter-meaning/tools.ts`
- Runtime orchestration: `lib/sf2/runtime/turn-pipeline.ts`, `lib/sf2/runtime/antagonist-face.ts`, `lib/sf2/author/transform.ts`, `lib/sf2/author/hydrate.ts`, `lib/sf2/author/contract.ts`
- SF2B overlays: `lib/sf2b/objective-gate.ts`, `lib/sf2b/repeated-beat.ts`

## Classification

### Entities

These are identity-bearing records that should remain durable, addressable, and migration-safe.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| Campaign | Entity aggregate | `Sf2Campaign` | Owns canonical stores plus indexes and notes. |
| Arc | Entity | `Sf2Arc` | Resolution-dependent thread group. Has status, outcome spectrum, plans, thread ids. |
| Thread | Entity | `Sf2Thread` | Main unit of unresolved tension. Owns clocks, timers, deterioration, resolution gates, progress events. |
| Decision | Entity | `Sf2Decision` | Anchored player/world choice with lifecycle. |
| Promise | Entity | `Sf2Promise` | Anchored commitment with lifecycle. |
| Clue | Entity | `Sf2Clue` | May start floating and anchor later. Has revelation status. |
| EmotionalBeat | Entity | `Sf2EmotionalBeat` | Typed memory unit for affective continuity. |
| TemporalAnchor | Entity | `Sf2TemporalAnchor` | Time-bound narrative anchor with lifecycle. |
| Document | Entity | `Sf2Document` | Strongest lifecycle model today. Has explicit valid transitions and attribution rules. |
| NPC | Entity | `Sf2Npc` | Owns identity, agenda, disposition, status, backrefs to owned threads. |
| Faction | Entity | `Sf2Faction` | Owns agenda, heat, status, backrefs to owned threads. |
| Location | Entity | `Sf2Location` | Durable world place. |
| Player | Entity | `Sf2Player` | Durable player state. |
| OperationPlan | Entity-ish runtime record | `Sf2OperationPlan` | Has id and phase/status, but is currently more weakly typed than other entities. |

### Value Objects

These should usually be immutable-ish nested records, not independently addressable stores.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| OwnerRef | Value object | `Sf2OwnerRef` | Joins threads to owning NPC/faction/entity. |
| OutcomeSpectrum | Value object | `Sf2OutcomeSpectrum` | Arc possible outcomes. |
| Clock, Timer, Deterioration | Value objects | `Sf2Clock`, `Sf2Timer`, `Sf2Deterioration` | Thread timing and decay. |
| ResolutionGate, ProgressEvent | Value objects/events | `Sf2ThreadResolutionGate`, `Sf2ThreadProgressEvent` | Gate is state; progress event is append-only history inside a thread. |
| Engine runtime/status | Value object | `Sf2EngineRuntime`, `Sf2EngineStatus` | Code-owned pressure runtime. |
| NPC identity/agenda | Value objects | `Sf2NpcIdentity`, `Sf2NpcAgenda` | Durable nested state. |
| Document party/revision | Value objects | `Sf2DocumentParty`, `Sf2DocumentRevision` | Nested document contract pieces. |
| Tension score | Value object | `Sf2TensionScore` | Scored planning/retrieval signal. |
| Chapter frame | Value object | `Sf2ChapterFrame` | Chapter target shape. |
| Antagonist face | Value object | `Sf2AntagonistFace` | Chapter pressure expression. |
| Opening scene spec | Value object | `Sf2OpeningSceneSpec` | Author/Narrator handoff. |
| Transition seed | Value object | `Sf2ChapterTransitionSeed` | Meaning-layer handoff. |

### Events

These should be append-only observations or commands with strict discriminants.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| TurnRecord | Event | `Sf2TurnRecord` | Turn history record. |
| RollRecord | Event | `Sf2RollRecord` | Mechanical roll history. |
| TurnDiffEntry | Event | `Sf2TurnDiffEntry` | State diff log. |
| NarratorAnnotation | Event/command | `Sf2NarratorAnnotation` | Model-facing mechanical annotation. |
| ArchivistPatch writes | Event/command | `Sf2ArchivistPatch` | Model-facing semantic patch proposal. Needs stronger internal normalization. |
| Actor observed write | Event | `Sf2ActorObservedWrite` | Firewall telemetry. |
| Replay invariant event | Event | `ReplayInvariantEvent` | Regression observation. |
| Turn resolution consequence | Event | `Sf2TurnResolutionConsequence` | Mechanics outcome. |

### Projections

These should be derived from canonical state and safe to rebuild or drop.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| WorkingSet | Projection | `Sf2WorkingSet` | Deterministic bounded retrieval result. |
| SceneKernel | Projection | `Sf2SceneKernel` | Derived read model for current scene. Comment says it is not source of truth. |
| NarratorScenePacket | Projection | `Sf2NarratorScenePacket` | Role-specific packet assembled from state. |
| Mechanics/Continuity/Pressure/Discovery packets | Projections | Scene packet types | Role-specific views for Narrator. |
| Chapter pressure projection | Projection/advisory | `Sf2ChapterPressureProjection` | Derived pressure summary. |
| Close readiness | Projection/advisory | `Sf2ChapterCloseReadiness` | Derived close gate/readiness. |
| SceneBundleCache | Projection/cache | `Sf2SceneBundleCache` | Rebuildable cache in world state. |
| Derived.pacing/cohesion | Projection/advisory | `Sf2Derived` | Rebuildable runtime guidance. |
| SF2B continuity lock/meaning digest/narrator kernel | Projections | `lib/sf2b/*` | Overlay read models. |

### Advisories

These should guide prompts or code decisions, but should not silently become canonical facts.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| PacingAdvisory | Advisory | `Sf2PacingAdvisory` | Code-derived prompt guidance. |
| CoherenceFinding | Advisory | `Sf2CoherenceFinding` | Quality/control finding. |
| DisplaySentinelFinding | Advisory | `Sf2DisplaySentinelFinding` | Forbidden-output detection. |
| RepeatedBeatAdvisory | Advisory | `sf2b/repeated-beat.ts` | Repeat detection guidance. |
| Pending recovery/coherence notes | Advisory | Runtime `pending*` fields | Prompt/runtime hints. |

### Prompt-only scaffolding

These should be allowed to disappear after they have served the role handoff.

| Concept | Type | Primary home | Notes |
| --- | --- | --- | --- |
| Author input seed | Prompt input | `Sf2AuthorInputSeed` | Setup input, not canonical world state. |
| AuthorChapterSetupV2 | Model output | `Sf2AuthorChapterSetupV2` | Raw Author contract output. |
| ChapterSetupScaffolding | Prompt-only scaffolding | `Sf2ChapterSetupScaffolding` | Comment already labels it hidden prompt scaffolding. |
| OpeningSeed | Prompt-facing artifact | `Sf2OpeningSeed` | Bridges Author output into first scene. |
| Possible revelations/opening seeds | Prompt scaffolding | `Sf2PossibleRevelation`, `Sf2OpeningSeed` | Useful for setup, risky if treated as fact before anchoring. |

## Status And Lifecycle Inventory

### Strongest Existing Model

`Sf2Document` is the clearest lifecycle example. `DOCUMENT_VALID_TRANSITIONS` defines allowed moves, and `applyTransition` enforces them, including terminal guards for signed/superseded/voided documents. This is the pattern to copy.

### Status Concepts Without Lifecycle Tables

| Concept | Current status enum | Missing contract |
| --- | --- | --- |
| Thread | `active`, `deferred`, `resolved_clean`, `resolved_costly`, `failed`, `abandoned` | Valid transitions, terminal set, ownership/backref eligibility, pressure eligibility, close-readiness semantics. |
| Decision | `open`, `committed`, `reversed`, `obsolete` | Valid transitions, terminal set, whether committed is final or still referenceable. |
| Promise | `active`, `fulfilled`, `broken`, `released` | Valid transitions, terminal set, whether released is neutral terminal. |
| Clue | `floating`, `anchored`, `revealed`, `spent` | Valid transitions, anchor requirements, terminal set. |
| Arc | `forming`, `active`, `dormant`, `resolved`, `failed` | Valid transitions, whether dormant can close, relationship to thread terminal states. |
| NPC | `active`, `offscreen`, `missing`, `dead` | Valid transitions, role constraints after death/missing. |
| TemporalAnchor | `pending`, `active`, `fulfilled`, `missed`, `void` | Valid transitions and whether active can return to pending. |
| OperationPlan | `phase: string`, `status: string` | Explicit phase/status enums and transitions. |
| SceneKernelLegalTransition | Optional field bag | Discriminated union for legal scene moves. |

### Repeated Local Status Sets

Thread lifecycle semantics are scattered:

- `apply-patch.ts` has `RESOLVED_THREAD_STATUSES`.
- `pressure/runtime.ts` has `CLOSE_TERMINAL_THREAD_STATUSES`.
- `author/contract.ts` has `TERMINAL_THREAD_STATUSES`.
- `state-indexes.ts` has `THREAD_OWNER_BACKREF_STATUSES`.
- `sf2b/objective-gate.ts` has terminal/success/failure thread status sets.
- `sf2b/meaning-digest.ts` has `RESOLVED_THREAD_STATUSES`.
- `pressure/constants.ts` gives pressure multipliers by thread status.

These are all legitimate policy dimensions, but the definitions should live in one lifecycle/policy module so changes do not fork silently.

## Duplicate Or Overloaded Concepts

| Area | Problem | Why it matters |
| --- | --- | --- |
| Thread status | Terminal, resolved, close-terminal, backref-eligible, pressure-eligible, success/failure are all expressed locally. | One enum is carrying several policies without a single table of meaning. |
| Pressure | `thread.tension`, `threadPressure` runtime, pressure engines, ladder fires, pacing `tensionDeltas`, and `TensionScore` all use related language. | Good domain depth, but naming makes it easy to mix canonical state, runtime pressure, and planning scores. |
| Scene state | `world.currentLocation`, `world.sceneSnapshot`, `SceneKernel`, `set_location`, `set_scene_snapshot`, and `sceneBundleCache` overlap. | The source of truth for "where are we and who is present" needs a sharper boundary. |
| Continuation handoff | `ChapterMeaning.transitionSeed`, `ContinuationMoves`, `ContinuationDramaticTurn`, `OpeningSceneSpec` continuation fields, and Author continuation validation overlap. | Chapter-to-chapter continuity has several shallow interfaces instead of one deep handoff model. |
| Archivist patch | Tool schema has typed-looking variants, but internal patch application accepts loose `Record<string, unknown>` payloads and `toStatus: string`. | Model boundary is too shallow. Invalid lifecycle moves can cross too far before rejection. |
| Diagnostics/advisories | Archivist flags, coherence findings, invariant events, sentinel findings, and pending runtime notes overlap. | Useful observations have no common severity/source/lifecycle shape. |
| Owned thread backrefs | NPC/Faction store `ownedThreadIds`, but comments say these are derived. | Storing derived backrefs can create drift unless always rebuilt. |

## Pruning And Hardening Proposals

### 1. Add a thread lifecycle policy module

Files likely involved:

- `lib/sf2/thread-lifecycle.ts` or `lib/sf2/lifecycle/thread.ts`
- `lib/sf2/validation/apply-patch.ts`
- `lib/sf2/pressure/runtime.ts`
- `lib/sf2/author/contract.ts`
- `lib/sf2/state-indexes.ts`
- `lib/sf2b/objective-gate.ts`
- `lib/sf2b/meaning-digest.ts`

Shape:

```ts
export const SF2_THREAD_STATUSES = [
  "active",
  "deferred",
  "resolved_clean",
  "resolved_costly",
  "failed",
  "abandoned",
] as const;

export const THREAD_STATUS_POLICY = {
  active: {
    terminal: false,
    resolved: false,
    ownerBackref: true,
    closeTerminal: false,
    objectiveOutcome: "in_progress",
    pressureMultiplier: 1,
  },
  // ...
} satisfies Record<Sf2ThreadStatus, ThreadStatusPolicy>;
```

The exact fields can be smaller at first. The important move is making status meaning one deep interface, with local modules importing named predicates like `isThreadTerminal`, `isThreadResolved`, and `isThreadOwnerBackrefEligible`.

Deletion test: after this lands, local `Set<Sf2ThreadStatus>` declarations should disappear from pressure, author contract, indexes, meaning digest, and objective gate.

### 2. Add valid transition tables for all core lifecycles

Copy the document pattern for:

- Thread
- Decision
- Promise
- Clue
- Arc
- NPC
- TemporalAnchor
- OperationPlan

Contract:

```ts
type LifecycleTransition<TStatus extends string> = {
  from: TStatus;
  to: TStatus;
  reasonRequired?: boolean;
  anchorRequired?: boolean;
};
```

For patch application, reject invalid transitions before mutating state. For model-facing tools, keep schemas additive and tolerant, but normalize into strict internal command types before applying.

### 3. Normalize ArchivistPatch into internal discriminated commands

Current model-facing patch writes are intentionally broad, but the internal interface remains too loose:

- `create.payload: Record<string, unknown>`
- `update.changes: Record<string, unknown>`
- `transition.toStatus: string`

Recommended boundary:

1. Keep broad tool schemas if needed for model reliability.
2. Convert each write to an internal command union such as `CreateThreadCommand`, `TransitionThreadCommand`, `UpdateNpcCommand`.
3. Validate fields, lifecycle moves, anchors, and ownership before calling reducers.

This preserves a forgiving adapter at the model boundary and creates a deep internal interface for code-owned state.

### 4. Decide the scene source of truth

Recommended split:

- Canonical: `world.currentLocation`, entities, current thread/operation state.
- Current scene fact object: either `sceneSnapshot` or a renamed `currentSceneState`.
- Derived: `SceneKernel`, `NarratorScenePacket`, `sceneBundleCache`.

The risky part is that `set_location` and `set_scene_snapshot` both mutate scene-related state. A clearer contract would say:

- `set_location` changes place and starts a new scene frame.
- `set_scene_snapshot` updates only scene-local facts.
- `SceneKernel` is always derived and never persisted as source of truth.

Deletion test: no code should need to read both `sceneSnapshot` and `SceneKernel` to answer the same "where/who/what pressure" question.

### 5. Consolidate continuation handoff concepts

Candidates to merge under one contract:

- `Sf2ChapterTransitionSeed`
- `Sf2ChapterContinuationMoves`
- `Sf2ContinuationDramaticTurn`
- continuation parts of `Sf2OpeningSceneSpec`

Possible name: `Sf2ChapterHandoff`.

This can remain a value object that is produced by chapter meaning and consumed by Author/Narrator setup. The goal is not fewer fields for its own sake; the goal is one owner and one lifecycle for cross-chapter continuity.

### 6. Separate pressure vocabulary by layer

Suggested language:

- Canonical thread urgency: `thread.tension`
- Code-owned pressure engines: `threadPressure` / `engineRuntime`
- Planning score: `tensionScore`
- Prompt guidance: `pacingAdvisory`
- Player-visible escalation event: `ladderFire`

The existing concepts are mostly useful. The pruning is about naming and interfaces, not deletion. A glossary plus type aliases may be enough before larger refactors.

### 7. Add a diagnostic finding envelope

Unify advisories that currently have similar jobs:

- Archivist flags
- coherence findings
- display sentinel findings
- replay invariant events
- pending recovery/coherence notes

Suggested shared fields:

- `id`
- `source`
- `kind`
- `severity`
- `entityRefs`
- `turnId`
- `message`
- `status: "open" | "acknowledged" | "resolved" | "ignored"`

Individual findings can keep their specialized payloads. The common envelope would make diagnostics queryable and less ad hoc.

### 8. Treat derived backrefs as rebuildable indexes

`Sf2Npc.ownedThreadIds` and `Sf2Faction.ownedThreadIds` are documented as derived. Make that contract stronger:

- Either rebuild them in one canonical indexing pass and never patch them directly.
- Or remove them from durable persistence and expose them only through indexes/projections.

Given browser persistence constraints, rebuilding on load may be the safer first step.

## Contract Hardening Checklist

High-value hardening candidates:

- Export centralized enum arrays for every status union, not just some tag/mode enums.
- Use `satisfies Record<Status, ...>` tables so enum additions fail compilation until policy is updated.
- Add `reserved` or `deprecated` field registries for persisted entity shapes.
- Add one reducer entry point per entity family instead of allowing broad patch writes to mutate arbitrary fields.
- Make patch alternatives explicit with discriminated unions after model-boundary normalization.
- Require anchors for decisions/promises and for clue transitions from floating to anchored/revealed.
- Add fixture coverage when each lifecycle is hardened. Use `npm run sf2:replay -- fixtures/sf2/replay/<fixture>.json` for focused contracts and the full replay suite before calling behavior changes done.

## Recommended First Manual Slice

Start with Thread lifecycle. It has the highest leverage because it touches Author planning, pressure, retrieval indexes, SF2B objective gating, meaning digest, and patch application.

Slice:

1. Create `lib/sf2/thread-lifecycle.ts` with status array, policy table, valid transition table, and predicates.
2. Replace local thread-status sets in pressure, author contract, state indexes, meaning digest, objective gate, and patch validation.
3. Make `applyTransition` validate thread transitions through the table.
4. Add or extend an SF2 replay fixture that tries an invalid thread transition and expects rejection/logging.
5. Run the focused fixture, then full `npm run sf2:replay -- fixtures/sf2/replay`.

This is a good first slice because it is narrow, deletes duplication, and creates the pattern for the other lifecycles.

## Completion Audit

| Goal item | Status | Evidence |
| --- | --- | --- |
| Inventory SF2 entities | Complete | Entity table covers campaign aggregate, arc, thread, decision, promise, clue, emotional beat, temporal anchor, document, NPC, faction, location, player, operation plan. |
| Inventory statuses | Complete | Lifecycle inventory lists thread, decision, promise, clue, arc, NPC, temporal anchor, operation plan, scene legal transition. |
| Inventory patches | Complete | Event classification covers NarratorAnnotation, ArchivistPatch writes, observed writes, turn diffs, replay invariant events; hardening section targets patch normalization. |
| Inventory derived projections | Complete | Projection table covers working set, scene kernel, narrator packet, pressure projection, close readiness, scene cache, derived pacing/cohesion, SF2B overlays. |
| Classify concepts | Complete | Concepts classified as entity, value object, event, projection, advisory, or prompt-only scaffolding. |
| Find duplicate or overloaded concepts | Complete | Duplicate/overload table identifies thread status, pressure, scene state, continuation handoff, Archivist patch, diagnostics, backrefs. |
| Identify missing lifecycle tables | Complete | Missing contract table identifies lifecycles lacking transition tables and contrasts `Sf2Document` as the existing strong pattern. |
| Identify weak enums | Complete | Weak enums called out for operation phase/status, scene legal transitions, and loose `toStatus: string`; checklist recommends centralized enum arrays. |
| Propose merges, deletions, hardening | Complete | Eight proposals plus first slice describe merges, deletion tests, and contract hardening path. |

