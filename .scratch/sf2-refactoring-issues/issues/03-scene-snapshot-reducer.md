# Scene Snapshot Reducer

Status: needs-triage
Type: AFK

## What to build

Create a deeper SF2 Scene Snapshot reducer Module that becomes the single write path for current-scene runtime state.

Today `set_scene_snapshot` is applied directly inside the mechanical effect processor. One broad model-written payload can change scene identity, location, cast, focus, time, visible scene facts, lock state, and replay-window behavior. The current code already has useful repair logic, but the Interface is still too loose: callers and maintainers must remember when cast is preserved, when it is cleared, when location is merged, how `currentLocation` syncs, and when scene bundle cache must be invalidated.

The reducer should concentrate that knowledge in one Module.

## Decision already made

Keep `SceneSnapshot.location` embedded for this slice.

However, treat the embedded `location` as a synchronized runtime projection, not an independent source of truth:

- Durable location data lives in `campaign.locations`.
- The reducer writes or merges `campaign.locations` first.
- The reducer then syncs `world.currentLocation` and `world.sceneSnapshot.location` from the canonical merged location.
- Do not migrate `SceneSnapshot` to `locationId` in this ticket.
- Do not remove `world.currentLocation` in this ticket.

This keeps save compatibility and reduces blast radius while making a future `locationId` migration easier.

No further human design decision is required for this ticket. The prior design-sensitive choice was location storage, and that choice is now settled for this slice.

## Current files to inspect

- `lib/sf2/replay/mechanics.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/reference-policy/index.ts`
- `lib/sf2/locations.ts`
- `lib/sf2/scene-kernel/build.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/types.ts`
- `fixtures/sf2/replay/*scene*`
- `fixtures/sf2/replay/*location*`
- `fixtures/sf2/replay/*present-npc*`

## Target Module

Add a Module under `lib/sf2/scene-snapshot/` or similar. Suggested files:

- `lib/sf2/scene-snapshot/reducer.ts`
- optional `lib/sf2/scene-snapshot/types.ts`

The reducer Interface should accept:

- current `Sf2State`
- a scene snapshot patch or compatibility payload
- source metadata such as turn index and source actor
- optional invariant event sink or returned invariant events

The reducer should return:

- next state or mutate the passed state consistently with current mechanical-effect style
- invariant events emitted during reduction
- a compact summary useful for debugging

The exact function names may vary, but the reducer must become the only place that knows scene transition, cast, focus, time, visible-fact, location-sync, and scene-bundle invalidation semantics.

## Patch semantics to implement

The reducer should internally distinguish these intents, even if the first caller is still the existing loose `set_scene_snapshot` mechanical effect:

- `transition`: scene id and/or location changes; resets replay cursor via `firstTurnIndex`.
- `cast`: present NPC ids for the current scene.
- `focus`: current interlocutor ids.
- `time`: current visible scene time label.
- `visibleFacts`: scene-local established facts.
- `locationState`: lock state, location description/atmosphere refinement, and area-node/location merge effects.

Do not require the Narrator tool schema to emit this patch shape yet. The reducer can expose a compatibility Adapter that translates the existing `set_scene_snapshot` payload into these intents.

## Required behavior to preserve

Scene transition:

- A scene changes when the incoming scene id differs from the prior scene id, or when a location change implies a new scene id under current rules.
- On scene change, `sceneSnapshot.firstTurnIndex` becomes `state.history.turns.length`.
- On same-scene updates, preserve `sceneSnapshot.firstTurnIndex`.
- On scene change, clear `world.sceneBundleCache`.

Cast:

- If `present_npc_ids` is provided, resolve it through the existing reference policy.
- If `present_npc_ids` is omitted on a same-scene update, preserve current cast.
- If `present_npc_ids` is omitted on a new scene, clear cast and emit the existing cast-wipe diagnostic / pending coherence note.
- Placeholder creation from free-text scene snapshot references remains allowed in observe mode, matching current behavior.

Focus:

- If `current_interlocutor_ids` is omitted, leave focus undefined so SceneKernel can derive/default from present cast.
- If `current_interlocutor_ids` is provided, filter it to resolved ids that are present in the scene.
- Explicit empty focus is allowed only as a real state: no focused interlocutor. It must not imply clearing present cast.

Location:

- Merge or create the canonical location in `campaign.locations` before syncing runtime fields.
- Preserve current flattened location alias behavior for area nodes.
- Preserve location dedupe/merge behavior using existing `locations` helpers.
- Sync `world.currentLocation` and `world.sceneSnapshot.location` to the canonical merged location.
- Sync `world.currentPosition` when flattened aliases produce area nodes.

Time:

- Update both `world.currentTimeLabel` and `meta.currentTimeLabel` from the reduced time label.
- Preserve current fallback to existing scene time when no new time is supplied.

Visible scene facts:

- `established` remains scene-local visible facts only.
- For this ticket, preserve existing replacement behavior when `established` is supplied.
- Do not turn `established` into a durable clue/fact store.

## Compatibility requirements

- Keep `set_scene_snapshot` in the Narrator tool schema.
- Keep `set_location` working as a compatibility path.
- Route both `set_scene_snapshot` and `set_location` mechanical effects through the reducer or through a thin Adapter that calls the reducer.
- Preserve same-turn mechanical effect ordering. Today mechanical effects are processed in array order. If `set_scene_snapshot` and `set_location` both arrive in one turn, route each effect through the reducer in that same order; after each effect, keep `campaign.locations`, `world.currentLocation`, and `world.sceneSnapshot.location` synchronized. Do not coalesce them into an unordered merge unless the implementation explicitly preserves the same "later effect wins" behavior for overlapping location fields.
- Preserve current invariant event kinds where practical:
  - `canonical_id_violation`
  - `scene_snapshot_missing_present_npc_ids`
  - `snapshot_placeholder_npc_created`
  - `scene_snapshot_cast_changed`
  - `scene_snapshot_missing_payload`
  - location merge / alias diagnostics already emitted by existing helpers
- Do not change Narrator prompt wording in this ticket unless a comment must be updated to match the new reducer contract.

## Acceptance criteria

- [ ] There is one Scene Snapshot reducer Module that owns scene snapshot writes.
- [ ] `applyMechanicalEffectLocally` no longer contains the full scene snapshot write implementation inline.
- [ ] Existing `set_scene_snapshot` mechanical effects are translated through the reducer.
- [ ] Existing `set_location` behavior is preserved or translated through the same reducer path.
- [ ] Same-turn `set_scene_snapshot` + `set_location` effects preserve current array-order semantics.
- [ ] Scene transition, same-scene update, cast omission, focus, time, location merge, and `firstTurnIndex` semantics are explicit in code.
- [ ] `campaign.locations` is treated as durable source of truth while embedded `sceneSnapshot.location` remains as synchronized runtime projection.
- [ ] Scene bundle cache invalidation happens in the reducer for scene changes.
- [ ] Existing SF2 replay fixtures pass.
- [ ] Add or extend focused fixtures for:
  - same-scene snapshot update preserving cast and `firstTurnIndex`
  - new-scene snapshot without `present_npc_ids` clearing cast and emitting cast-wipe diagnostic
  - location alias / area-node merge syncing `campaign.locations`, `world.currentLocation`, and `sceneSnapshot.location`
  - explicit `current_interlocutor_ids` narrowing focus without changing present cast

## Verification

Run focused fixtures first:

```bash
npm run sf2:replay -- fixtures/sf2/replay/scene-snapshot-location-id-does-not-reset-scene.json
npm run sf2:replay -- fixtures/sf2/replay/scene-snapshot-cache-sync.json
npm run sf2:replay -- fixtures/sf2/replay/location-hierarchy-shallowden-area-nodes.json
```

Then run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, run the focused changed fixtures and state why full replay was skipped.

## Blocked by

None - can start immediately.

## Comments

This ticket intentionally avoids migrating `SceneSnapshot.location` to `locationId`. That can be a later location-source-of-truth slice after the reducer stabilizes the write path.
