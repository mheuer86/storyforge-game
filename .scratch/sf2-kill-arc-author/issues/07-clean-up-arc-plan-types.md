Status: blocked-by-06

# Clean up arc plan type references

Phase 2 — execute after Arc Author endpoint is removed.

## Scope

Make `Sf2ArcPlan` optional or remove it from the type system. Clean up all references:

- `lib/sf2/types.ts:165-238` — `Sf2ArcPlan` interface (delete or mark deprecated)
- `lib/sf2/types.ts:2010` — `arcPlan?: Sf2ArcPlan` on campaign (remove)
- `lib/sf2/author/prompt.ts` — all `renderArcPlan` calls and arc plan references
- `lib/sf2/author/contract.ts` — `arc_link` validation (remove arc thread linking)
- `lib/sf2/narrator/prompt/situation.ts:7-8,42-49` — arc context rendering
- `lib/sf2/retrieval/packets/chapter.ts:16,29-37` — arc block in chapter packet
- `lib/sf2/state-indexes.ts` — arc plan indexing
- `lib/sf2/persistence/normalize.ts` — arc plan normalization
- `lib/sf2/chapter-meaning/digest.ts` — may reference arc plan
- `lib/sf2/instrumentation/session-summary.ts` — arc plan in session summary
- `lib/sf2/game-data.ts` — seed registry arc plan references

## Migration

Existing saved campaigns may have `arcPlan` in their persisted state. The persistence/normalize layer should handle missing arc plans gracefully (it likely already does since `arcPlan` is optional). Verify that loading an old save with an arc plan doesn't break, and that the Author/Narrator work correctly whether or not `arcPlan` exists in state.

Some arc plan concepts may migrate to campaign-level state:
- `durableForces` → `campaign.forces` (created by Ch1 Author, carried forward)
- `stanceAxes` → could emerge as a chapter-meaning output or Author output per chapter
- `arcThreadIds` → unnecessary; threads at campaign level are just threads

## Depends on

- #06 (endpoint removed)
- Validation that no runtime code path requires `arcPlan` to be present
