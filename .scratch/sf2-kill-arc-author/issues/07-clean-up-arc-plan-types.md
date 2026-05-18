Status: blocked-by-06
Labels: enhancement, blocked
Type: AFK-after-validation

# Clean up arc plan type references

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

After Arc Author is removed, clean up the remaining ArcPlan type and compatibility surface without breaking old saves.

## Required Preconditions

- Ticket 06 has landed.
- No runtime endpoint or client path creates new `Sf2ArcPlan`.
- Old-save handling strategy is chosen: preserve legacy optional field or migrate it into inert legacy metadata.

## Scope

Review and clean:

- `lib/sf2/types.ts` - `Sf2ArcPlan` and `campaign.arcPlan`
- `lib/sf2/author/prompt.ts` - `renderArcPlan`, `renderArcThreads`, `renderLatentQuestionPacket`
- `lib/sf2/author/contract.ts` - `arc_link` validation and arc promotion checks
- `lib/sf2/narrator/prompt/situation.ts` - arc context block
- `lib/sf2/retrieval/packets/chapter.ts` - chapter packet arc block
- `lib/sf2/state-indexes.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/chapter-meaning/digest.ts`
- `lib/sf2/instrumentation/session-summary.ts`
- `lib/sf2/game-data.ts`
- docs and fixtures that still describe active ArcPlan behavior

## Implementation Notes

- Do not remove old-save compatibility in the same stroke as type cleanup unless replay fixtures cover old saves.
- If keeping `campaign.arcPlan` as a deprecated optional legacy field is simpler and safer, document that choice.
- Remove arc thread linking only after chapter thread continuity has no-arc fixture coverage.

## Acceptance Criteria

- [ ] New campaigns do not create ArcPlan state.
- [ ] Runtime Author/Narrator paths do not require `campaign.arcPlan`.
- [ ] Old saves with `campaign.arcPlan` load without crashing.
- [ ] Type references are either removed or explicitly marked legacy.
- [ ] Arc promotion/latent question code is removed or converted to a non-ArcPlan mechanism with fixtures.

## Verification

```bash
rg "Sf2ArcPlan|arcPlan|arc_link|arc_promoted|latentArcQuestions|chapterFunctionMap" app lib components docs fixtures
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

- `06-remove-arc-author-endpoint.md`

## Out Of Scope

- Changing narrative behavior beyond deleting legacy ArcPlan dependency.
- Adding a replacement campaign-planning role.
