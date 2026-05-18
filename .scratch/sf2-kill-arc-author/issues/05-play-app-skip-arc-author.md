Status: proposed

# play-app skip arc-author call

## Problem

`components/sf2/play-app.tsx` orchestrates the Arc Author call at campaign start (lines 689-756). The flow:

1. `ensureArcAuthored` checks `isArcAuthored(currentState)` — if arc plan exists, skip
2. If not, fetch `/api/sf2/arc-author` with the AuthorInputSeed
3. Wait for response, transform via `transformArcAuthorResponse`
4. Persist arc plan to state
5. Then proceed to Author for Ch1

## Change

Add a feature flag or mode that skips the arc-author call entirely. The Author for Ch1 then runs in hookDirect mode (#01).

### Option A: Feature flag (recommended for Phase 1)

```typescript
const SKIP_ARC_AUTHOR = true // Phase 1 experiment

async function ensureArcAuthored(currentState: Sf2State): Promise<Sf2State> {
  if (SKIP_ARC_AUTHOR) return currentState
  if (isArcAuthored(currentState)) return currentState
  // ... existing arc-author call
}
```

The Author's `buildAuthorSituation` already has a null check for `state?.campaign?.arcPlan`. When null, it currently says "missing arc plan — this is invalid." Change that message to trigger hookDirect mode (#01).

### Option B: Remove the call (Phase 2)

Delete `ensureArcAuthored` and the arc-author fetch entirely. Remove the `/api/sf2/arc-author` route. This is cleaner but harder to revert.

## Orchestration flow after change

Current: Setup → Arc Author → Author Ch1 → Narrator
New:     Setup → Author Ch1 (hookDirect) → Narrator

The Author for Ch1 receives the AuthorInputSeed (which `compileSf2SetupSeed` already builds from the setup selection) directly, without an intermediate arc plan.

## Files

- `components/sf2/play-app.tsx:689-756` — `ensureArcAuthored` (skip or delete)
- `components/sf2/play-app.tsx:16` — `isArcAuthored` import (unused in Phase 1)
- `lib/sf2/author/prompt.ts:184-193` — Ch1 branch null check (hookDirect trigger)

## Test approach

1. Start a new campaign with SKIP_ARC_AUTHOR = true
2. Verify Author Ch1 produces valid output without arc plan
3. Play through Ch1, verify narrator quality
4. Transition to Ch2, verify chapter-meaning fires and Author Ch2 works without arc plan
5. Compare narrative quality against a run with arc plan on the same hook

## Rollback

Set SKIP_ARC_AUTHOR = false. The existing arc-author code path remains intact during Phase 1.
