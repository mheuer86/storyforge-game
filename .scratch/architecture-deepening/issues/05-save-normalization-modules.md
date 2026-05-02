# Save Normalization Modules

Status: needs-triage
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: deferred persistence-foundation slice. Pull forward when active work touches persistence, migrations, import/export, old-save repair, or SF2 seed/save interactions.

## What to build

Separate raw-save normalization from browser storage Adapters and new-campaign creation for both V1 and SF2.

V1 currently mixes localStorage, save slots, initial campaign creation, old-save repairs, Stage 2 migration, notebook migration, malformed decision cleanup, NPC dedupe, and immediate persistence in `lib/game-data.ts`. SF2 has a stronger persistence Seam, but its normalizer imports current campaign creation and deep-merges loaded saves over today's seed-driven defaults.

Relevant files:

- `lib/game-data.ts`
- `lib/migrations/stage2.ts`
- `lib/types.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/persistence/indexeddb.ts`
- `lib/sf2/persistence/types.ts`
- `lib/sf2/game-data.ts`

## Acceptance criteria

- [ ] V1 has a pure save-normalization Module that accepts raw save data and returns canonical `GameState` plus repair notes.
- [ ] V1 browser storage concerns stay in a storage Adapter: localStorage, save slots, snapshots, quick actions, and immediate persistence.
- [ ] SF2 persisted schema defaults and repair rules no longer depend on current seed content except through explicit, versioned migration.
- [ ] New SF2 campaign creation can still reuse normalization after constructing initial content.
- [ ] Fixture tests cover V1 old-save repair, Stage 2 migration, notebook migration, malformed decision cleanup, duplicate NPC cleanup, and SF2 persisted-state repair.
- [ ] Save compatibility is preserved for existing browser saves.

## Blocked by

None - can start immediately. Deferred by selected-shape sequencing.

## Comments

Architecture review note: this ticket is about long-lived state safety. It should be pulled forward when touching persistence, migrations, or import/export flows.
