# Clarify Location source of truth and optional connections

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Location review

## What to build

Clarify `Sf2Location` as a durable place entity and make scene-local state reference it by id. Location identity should not carry transient atmosphere. Scene state should own what is currently true in the room.

Add optional connection modeling only where movement, adjacency, containment, or travel constraints matter. This should support cases like "crew compartment connects to mess" without forcing every location into a complete map.

## Acceptance criteria

- [ ] `Sf2Location` has durable identity fields such as `kind`, optional `parentLocationId`, optional owning/associated faction refs, and lifecycle/access status
- [ ] Transient atmosphere is removed from durable location identity or clearly moved to scene-local state
- [ ] `Sf2SceneSnapshot` references the current location by id or has one documented source of truth for location state
- [ ] Optional `connectsTo` modeling exists, with clear semantics for adjacent/contains/route/blocked connections
- [ ] Location writes and `set_scene_snapshot` / `set_location` avoid creating duplicate location truth
- [ ] Save normalization migrates existing embedded snapshot locations safely
- [ ] A replay fixture covers a location alias/dedup case and a connected-location movement case

## Blocked by

None - can start immediately

## Comments

HITL decision: keep `connectsTo` optional and sparse. Do not require full topology. Recommended shape is a small edge list with relation/type and optional status:

```ts
connectsTo?: Array<{
  locationId: Sf2EntityId
  relation: 'adjacent' | 'contains' | 'inside' | 'route'
  status?: 'open' | 'blocked' | 'locked' | 'unknown'
}>
```

Open question: whether containment should be represented only by `parentLocationId`, with `connectsTo` reserved for traversable routes.

## Agent Brief

**Category:** architecture
**Summary:** Make Location durable, scene snapshot local, and connections optional.

**Current behavior:** Location exists in the campaign registry, current world state, and scene snapshot, with dedupe repairing drift.

**Desired behavior:** Durable locations are canonical entities. Scene snapshots reference locations and carry only scene-local facts. Connections are sparse and used only when they affect play.

**Key interfaces:** `Sf2Location`, `Sf2SceneSnapshot`, `world.currentLocation`, `campaign.locations`, `locations.ts`, `replay/mechanics.ts`, `persistence/normalize.ts`.

**Out of scope:** Building a full map editor or requiring complete geography.

