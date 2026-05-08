# Harden Working Set as the retrieval selection contract

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Working Set/retrieval review

## What to build

Clarify and harden `Sf2WorkingSet` as the deterministic retrieval selection contract for each Narrator turn.

The current `buildWorkingSet()` module is the right shape: pure scoring, explicit weights, bounded full/stub/excluded buckets, and reasons per entity. It matches the SF2 thesis that the Narrator should receive a bounded world instead of choosing what matters from a giant transcript.

The weak spots are contract completeness:

- `stubEntityIds` are computed and logged, but they do not currently render meaningful stub packets into the Narrator scene packet.
- Candidate kinds cover NPCs, factions, threads, decisions, promises, clues, and emotional beats, but documents, locations, temporal anchors, arcs, and operation runtime mostly sit outside the selector.
- The selector and packet builders are coupled implicitly: full ids drive thread packets, present cast bypasses most scoring, emotional beats ride a side channel, and other packet types have their own inclusion rules.
- Telemetry can detect divergence (`excludedButReferenced`, `fullButUnreferenced`, `stubButMutated`), but there is no explicit calibration workflow for changing weights, caps, or entity-specific selectors based on it.

## Acceptance criteria

- [ ] Document `Sf2WorkingSet` as derived per-turn retrieval selection, not durable campaign state and not a model-written object
- [ ] Classify the buckets: `fullEntityIds`, `stubEntityIds`, `excludedEntityIds`, `emotionalBeatIds`, `reasonsByEntityId`, and `computedAtTurn`
- [ ] Define what "full" means per entity kind: NPC, faction, thread, decision, promise, clue, document, location, temporal anchor, arc, emotional beat, and operation/runtime state
- [ ] Define what "stub" means per entity kind and render stubs into Narrator context, or remove `stubEntityIds` until they have a real prompt role
- [ ] Decide which entity kinds are selected by Working Set and which are always handled by dedicated packets (`SceneSnapshot`, `SceneKernel`, `temporalAnchors`, `operationPlan`, revelation progress, pressure)
- [ ] Ensure documents with active relevance can surface through retrieval, especially documents anchored to selected threads or named in player input
- [ ] Ensure location retrieval aligns with the Location and SceneSnapshot contracts: current location is always present, nearby/connected locations only surface when navigation or constraints matter
- [ ] Keep owner-join behavior explicit: selected threads should pull current owner/stakeholder state, and selected owner NPCs/factions should pull their live threads when load-bearing
- [ ] Make emotional beats a deliberate side channel or first-class working-set kind; avoid hidden special cases
- [ ] Expose weight constants and caps through a named policy object so tuning is visible and testable
- [ ] Add fixture coverage for: full selection, stub rendering, document surfacing, owner-join, present-cast priority, excluded-but-referenced telemetry, and full-but-unreferenced telemetry
- [ ] Define a calibration workflow: when telemetry flags repeated `excludedButReferenced` or `stubButMutated`, the next action is weight/cap/policy adjustment, not prompt escalation
- [ ] Keep prompt budget guardrails explicit: scene packet + dynamic block target and failure threshold should be visible in tests or telemetry

## Blocked by

- 01-harden-clues-into-investigation-evidence.md helps decide clue selection semantics
- 12-document-contract-gaps.md helps decide document packet/stub shape
- 14-emotional-beat-trigger-retention-policy.md helps decide whether beats stay side-channel or become first-class
- 18-scene-snapshot-kernel-contracts.md helps decide location/current-scene always-include rules

## Related / overlap

- `.scratch/sf2-narrative-quality-pass/10-diagnostic-finding-envelope.md`
- Working-set tuning should consume telemetry through the diagnostic/telemetry layer instead of adding prompt instructions when retrieval misses occur.

## Comments

Current working-set shape:

```ts
Sf2WorkingSet {
  fullEntityIds
  stubEntityIds
  excludedEntityIds
  emotionalBeatIds
  reasonsByEntityId
  computedAtTurn
}
```

Current scoring is a good start:

- present in scene
- named in player input
- owner/stakeholder of a live scene thread
- chapter spine / load-bearing
- current pressure face
- mentioned last turn / advanced recently
- anchored decisions, promises, and clues
- floating clue relevance
- Author/GM surface overrides
- off-scene, dormant, and resolved decay

Working classification:

| Concept | Classification | Notes |
|---|---|---|
| Working Set | Derived retrieval selection | Recomputed per turn; may be persisted in `derived` for diagnostics |
| Scene Packet | Prompt-facing projection | Built from working set plus dedicated always-include packets |
| Full entity | Prompt-detail inclusion | Rich enough for Narrator to use directly this turn |
| Stub entity | Prompt-awareness inclusion | Enough to avoid invention or support recall, but not enough for full use unless expanded |
| Excluded entity | Not surfaced this turn | Still queryable/persisted; telemetry watches accidental prose reference |
| Reasons | Debug/calibration evidence | Should explain why an entity was included or excluded |
| Telemetry | Feedback signal | Should tune retrieval policy, not become narrative memory |

Open design questions:

- Should `stubEntityIds` produce compact rendered lines in the scene packet, or should the bucket be removed until Tier 2/Tier 3 retrieval exists?
- Should documents be selected directly, or only through anchored clues and threads?
- Should current location and temporal anchors bypass the working set permanently, or should the selector own all retrieval relevance?
- Should emotional beats remain side-channel because they are sparse memory, or join the same full/stub/excluded contract?
- Should SF2B's `buildSf2bNarratorKernel()` use the same working-set policy or stay a separate experimental prompt compressor?

## Agent Brief

**Category:** architecture
**Summary:** Make Working Set the explicit retrieval selection contract, including real stub semantics, entity-kind coverage, owner-join rules, and telemetry-driven calibration.

**Current behavior:** `buildWorkingSet()` scores entities and returns full/stub/excluded ids with reasons. Full ids drive thread packets; present cast is included separately; emotional beats use a side channel; stubs are mostly diagnostic; documents and several other entity kinds are not meaningfully selected.

**Desired behavior:** The Working Set interface clearly defines which entity kinds can be selected, what full and stub inclusion mean, how dedicated packets relate to selection, and how telemetry findings drive tuning. The Narrator receives bounded, deterministic context with enough awareness to avoid invention without bloating the prompt.

**Key interfaces:** `Sf2WorkingSet`, `Sf2WorkingSetTelemetry`, `buildWorkingSet`, `buildScenePacket`, `buildPresentCastPackets`, `buildThreadPackets`, `buildEmotionalBeatPackets`, `recordTurnTelemetry`, `buildNarratorTurnContext`, `Sf2bNarratorKernel`, replay fixtures.

**Out of scope:** Adding live vector search or mid-turn recall tools unless the retrieval budget telemetry proves the bounded packet cannot carry the needed context.
