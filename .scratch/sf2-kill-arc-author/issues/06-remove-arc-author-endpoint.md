Status: blocked-by-05
Labels: enhancement, blocked
Type: AFK-after-validation

# Remove Arc Author endpoint and lib

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Delete the live Arc Author endpoint and library after Phase 1 proves that no-arc startup and continuation work in replay and browser smoke.

## Required Preconditions

- Ticket 05 has landed.
- At least one no-arc multi-chapter playthrough confirms Chapter Meaning carries continuity.
- Full SF2 replay suite passes with no-arc support.
- Maintainer explicitly accepts removing the fallback.

## Scope

Delete:

- `app/api/sf2/arc-author/route.ts`
- `lib/sf2/arc-author/prompt.ts`
- `lib/sf2/arc-author/transform.ts`
- `lib/sf2/arc-author/procedure-eval.ts` if no remaining fixture uses it

Review for removal or refactor:

- `lib/sf2/arc-questions.ts`
- Arc Author docs in `docs/*`
- Arc Author fixtures that no longer apply
- diagnostics/session summary references to role `arc-author`

## Acceptance Criteria

- [ ] No runtime path calls `/api/sf2/arc-author`.
- [ ] No build import references `lib/sf2/arc-author/*`.
- [ ] Old saves with `campaign.arcPlan` still load as legacy state or are normalized safely.
- [ ] Docs no longer describe Arc Author as active.
- [ ] Full SF2 replay suite passes.

## Verification

```bash
rg "arc-author|author_arc_setup|generateArcIfNeeded|SF2_ARC_AUTHOR|arcPlanToArcEntity" app lib components docs fixtures
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

- `05-play-app-skip-arc-author.md`
- Maintainer validation of Phase 1 no-arc playthroughs

## Out Of Scope

- Large type cleanup beyond removing dead imports. Use ticket 07 for full type cleanup.
