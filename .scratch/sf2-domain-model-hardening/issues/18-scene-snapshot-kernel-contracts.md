# Clarify SceneSnapshot and SceneKernel contracts

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, SceneKernel/SceneSnapshot review

## What to build

Clarify the contracts for `Sf2SceneSnapshot` and `Sf2SceneKernel` so scene-local truth, durable world state, model-written mechanical effects, and code-derived enforcement views stay distinct.

The current conceptual split is good:

- `SceneSnapshot` is the mutable current-scene truth.
- `SceneKernel` is a code-derived read/enforcement projection built from state.
- The Narrator may emit `set_scene_snapshot`; it must never write `SceneKernel` directly.

The weak spot is that `set_scene_snapshot` is still a broad direct write surface. It can change location, scene id, cast, interlocutors, time label, lock state, established facts, and replay-window behavior through one loose payload. Several comments point to a future `SceneKernelPatch` / reducer path, but the actual reducer boundary is not yet explicit.

## Acceptance criteria

- [ ] Document `SceneSnapshot` as current-scene runtime state, not a durable entity and not a derived projection
- [ ] Document `SceneKernel` as a derived read/enforcement view, never persisted and never model-written
- [ ] Classify each `Sf2SceneSnapshot` field as one of: scene identity, location reference, on-stage cast, focus/interlocutor state, time label, visible scene fact, or replay/runtime cursor
- [ ] Decide whether `SceneSnapshot.location` embeds a full `Sf2Location` or should become a `locationId` plus derived lookup; align with the Location source-of-truth ticket
- [ ] Tighten `established` so it means visible, scene-local facts only; it must not become a generic fact store, clue bucket, or durable memory substitute
- [ ] Replace or wrap broad `set_scene_snapshot` writes with an explicit reducer/patch contract that distinguishes scene transition, cast update, focus update, time update, location update, and visible-fact update
- [ ] Preserve partial compatibility for existing `set_scene_snapshot` mechanical effects while routing them through the stricter reducer
- [ ] Make missing `present_npc_ids` semantics explicit: preserving cast, clearing cast on scene transition, or emitting cast-wipe diagnostics should be deterministic and documented
- [ ] Clarify `currentInterlocutorIds` semantics: omitted means default focus, explicit empty means no current direct interlocutor only if that state is allowed
- [ ] Keep `nearbyEntityIds` derived in `SceneKernel`; do not add it as a model-written snapshot field unless a real second write source appears
- [ ] Populate or remove/defer stub-like `SceneKernel` fields (`activeObjectIds`, `unresolvedImmediateQuestions`, `legalTransitions`) so callers know whether they are load-bearing
- [ ] Resolve naming overlap between `SceneKernel` and `Sf2bNarratorKernel`: one is scene enforcement, the other is a compact narrator brief
- [ ] Replay fixtures cover at least one scene transition, same-scene cast/focus update, missing cast payload, and location/time sync case through the final reducer interface

## Blocked by

- 08-location-source-of-truth-and-connections.md is recommended, because `SceneSnapshot.location` currently overlaps `world.currentLocation` and `campaign.locations`

## Related / overlap

- `.scratch/sf2-narrative-quality-pass/09-scene-source-of-truth.md`
- Merge these before implementation. Use this ticket as the fuller model/spec and Narrative 09 as the implementation-ready scene-source slice.

## Comments

Current useful split:

```ts
Sf2SceneSnapshot {
  sceneId
  location
  presentNpcIds
  currentInterlocutorIds?
  timeLabel
  established
  firstTurnIndex
}
```

```ts
Sf2SceneKernel {
  sceneId
  location
  time.activeCountdowns
  presentEntityIds
  currentInterlocutorIds
  nearbyEntityIds
  absentEntityIds
  speakingAllowedEntityIds
  activeProcedureIds
  currentPhysicalSituation
  currentDramaticSituation
  forbiddenWithoutTransition
  legalTransitions
  aliasMap
}
```

Working classification:

| Concept | Classification | Notes |
|---|---|---|
| `SceneSnapshot` | Runtime scene state | Mutable current-scene truth, persisted with save state |
| `SceneKernel` | Derived projection / enforcement view | Built fresh from state; should not be persisted |
| `set_scene_snapshot` | Narrator mechanical effect | Currently overloaded; should route through a stricter reducer |
| `firstTurnIndex` | Runtime cursor | Good placement for replay-window stability, but not a scene fact |
| `established` | Visible scene-local facts | Must stay small and present-tense; not a generic fact log |
| `currentInterlocutorIds` | Focus state | Subset of present cast; default should be explicit |
| `nearbyEntityIds` | Derived focus remainder | Present but not currently addressed |

Potential reducer shape:

```ts
SceneSnapshotPatch {
  transition?: { sceneId?: string; locationId?: string; visibleMovementEvidence?: string }
  cast?: { presentNpcIds: string[]; missingPayloadPolicy?: 'preserve' | 'clear_on_new_scene' }
  focus?: { currentInterlocutorIds?: string[] }
  time?: { timeLabel: string }
  visibleFacts?: { replace?: string[]; append?: string[] }
  location?: { locked?: boolean }
}
```

Open design questions:

- Should `SceneSnapshot.location` be a full value object for easy prompt/UI rendering, or should it only store `locationId` and force lookup from `campaign.locations`?
- Is `set_location` still needed once `set_scene_snapshot` can express a location transition, or should `set_location` become a compatibility alias?
- Should `established` be append-only inside a scene, replaced per snapshot, or bounded by visible-fact categories?
- Should `currentInterlocutorIds` have an explicit empty state, or should empty/omitted always mean "all present NPCs are possible interlocutors"?
- Are `legalTransitions` meant to become structured authorizations, or should visible evidence alone drive sentinel repair?

## Agent Brief

**Category:** architecture
**Summary:** Make the SceneSnapshot/SceneKernel split explicit and route broad scene snapshot writes through a stricter scene-state reducer.

**Current behavior:** `SceneSnapshot` is mutable scene runtime state and `SceneKernel` is derived from it, but `set_scene_snapshot` directly changes location, cast, focus, time, scene id, lock state, visible facts, and replay-window state. Some `SceneKernel` fields are future-facing stubs, and location data is duplicated across snapshot/current/campaign locations.

**Desired behavior:** `SceneSnapshot` has a clear runtime-state contract; `SceneKernel` remains a derived enforcement/read view. Narrator scene updates pass through an explicit reducer that validates IDs, transition semantics, cast/focus behavior, time/location sync, and visible-fact retention.

**Key interfaces:** `Sf2SceneSnapshot`, `Sf2SceneKernel`, `narrate_turn` mechanical effects, `applyMechanicalEffectLocally`, `resolveSceneSnapshotReferences`, `buildSceneKernel`, `buildMessagesForNarrator`, `renderPerTurnDelta`, persistence normalizer, scene-kernel replay fixtures.

**Out of scope:** Rewriting working-set retrieval or changing Narrator prose behavior beyond scene-state validation.
