Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# play-app skip arc-author call

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Change `/play` startup orchestration so a new SF2 campaign can skip the Arc Author call and go directly from setup selection to Chapter Author.

This is the Phase 1 product switch. The old Arc Author path must remain available as a fallback until no-arc playthroughs validate.

## Required Behavior

- New campaigns can start without calling `/api/sf2/arc-author`.
- Chapter 1 generation calls `/api/sf2/author` with no `campaign.arcPlan`.
- Diagnostics record whether startup used `arc-author` or `hook-direct`.
- Existing saves with an already-authored arc plan continue to load and play.
- A temporary fallback flag can re-enable Arc Author for comparison.

## Feature Flag Decision

Use an explicit public client flag so AFK runs and browser smoke can choose the path without editing code:

```text
NEXT_PUBLIC_SF2_USE_ARC_AUTHOR=1
```

Recommended Phase 1 behavior:

- default: skip Arc Author
- if `NEXT_PUBLIC_SF2_USE_ARC_AUTHOR=1`: use the old Arc Author path

This makes the kill-track behavior visible by default while preserving an opt-in comparison path.

## Surfaces

- `components/sf2/play-app.tsx`
- `lib/sf2/game-data.ts` if `isArcAuthored` assumptions need a helper wrapper
- `app/api/sf2/author/route.ts` only if integration reveals an Author route gap missed by tickets 01/03
- diagnostics/session export surfaces if they currently assume an arc-author role call
- browser smoke/export docs under `.scratch/` as needed

## Implementation Notes

- Do not delete `generateArcIfNeeded` in Phase 1; make it conditional.
- Keep loading old saves intact.
- Do not alter streaming timing or roll pause behavior.
- Avoid calling `setIsGeneratingChapter` twice in a way that changes perceived loading state.
- If a no-arc startup fails, diagnostics should name the no-arc mode and the failing role.

## Acceptance Criteria

- [ ] With default env, a fresh `/play` campaign does not call `/api/sf2/arc-author`.
- [ ] With `NEXT_PUBLIC_SF2_USE_ARC_AUTHOR=1`, the old Arc Author startup path still works.
- [ ] Fresh no-arc campaign reaches Chapter Author and Narrator opening.
- [ ] Diagnostics/session export identify `hook-direct` startup.
- [ ] Existing saved campaigns with `campaign.arcPlan` still load without reauthoring or deleting the arc plan.
- [ ] No streaming UX or roll pause behavior changes.

## Fixture And Smoke Expectations

Add a focused helper or integration fixture if possible, but this ticket likely also needs browser smoke because the behavior lives in `components/sf2/play-app.tsx`.

Suggested checks:

```bash
npm run sf2:replay -- fixtures/sf2/replay/author-hook-direct-ch1-no-arc.json
npm run sf2:replay -- fixtures/sf2/replay/author-continuation-no-arc-transition-seed.json
npm run build
```

Browser smoke:

- start fresh `/play`
- confirm diagnostics contain no `arc-author` token usage in default mode
- confirm diagnostics contain `hook-direct` startup marker
- set `NEXT_PUBLIC_SF2_USE_ARC_AUTHOR=1`, rebuild/restart, confirm old path still emits `arc-author`

## Blocked By

- `01-author-hook-direct-ch1.md`
- `03-author-continuation-without-arc.md`
- `04-narrator-situation-without-arc.md`

## Out Of Scope

- Removing Arc Author endpoint or lib.
- Cleaning `Sf2ArcPlan` types.
- Changing setup UI.
