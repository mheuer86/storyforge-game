Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# Author continuation mode without arc plan

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Allow Chapter Author to open Ch2+ when `campaign.arcPlan` is absent by deriving continuity from Chapter Meaning, campaign state, structural beat guidance, active threads, NPCs, factions, and chapter opening continuity.

The no-arc continuation path should make `priorChapterMeaning.transitionSeed` the primary arc-forward mechanism.

## Required Behavior

- If `state.history.turns.length > 0`, no `campaign.arcPlan` exists, and `priorChapterMeaning` exists, Author route proceeds.
- Ch2+ situation does not render a "Stable ArcPlan" section when no arc plan exists.
- Ch2+ situation promotes transition seed and dramatic handoff above active carry-forward threads.
- Continuation instructions say to derive the new chapter from prior chapter meaning and carried state, not ArcPlan.
- `arc_promoted` is not required or suggested when there is no arc plan.
- `arc_link` validation skips real arc-thread checks when `state.campaign.arcPlan` is absent.
- The Author still audits active threads and emits thread transitions/successors when prior chapter meaning resolved a thread.

## Surfaces

- `app/api/sf2/author/route.ts`
- `lib/sf2/author/prompt.ts`
- `lib/sf2/author/payload.ts`
- `lib/sf2/author/contract.ts`
- `lib/sf2/author/retry.ts`
- `lib/sf2/chapter-meaning/*`
- `fixtures/sf2/replay/`

## Implementation Notes

- Keep ArcPlan support for old saves. This is an alternate no-arc path, not a deletion.
- If `priorChapterMeaning` is absent on no-arc continuation, fail clearly or fall back to a state-derived continuation only if an existing helper already provides enough context. Do not silently produce a weak continuation.
- Do not remove continuation moves. They are still needed.
- Replace references like "Derive from the ArcPlan..." with conditional wording that uses ArcPlan only when present.
- In no-arc mode, forbid `driver_kind: "arc_promoted"` unless there is a real arc thread to promote.

## Acceptance Criteria

- [ ] Ch2+ Author requests without `campaign.arcPlan` and with `priorChapterMeaning` can validate.
- [ ] No-arc Ch2+ situation has no "missing arc plan" text.
- [ ] No-arc Ch2+ situation places prior meaning, transition seed, and dramatic handoff before operational continuity.
- [ ] No-arc Ch2+ output does not need real arc thread links.
- [ ] ArcPlan-backed continuation still works for old saves.
- [ ] If no-arc continuation is attempted without Chapter Meaning, diagnostics explain the missing prerequisite.

## Fixture Expectations

Add a focused fixture for a Ch2 transition without arc plan.

Suggested fixture name:

```bash
fixtures/sf2/replay/author-continuation-no-arc-transition-seed.json
```

It should assert:

- input state has no `campaign.arcPlan`
- prior chapter meaning has a transition seed
- Author situation/payload honors `doNotRestage`
- procedure residue marked background/discard does not become the opening choice
- successor/new-pressure thread works without arc thread links

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/author-continuation-no-arc-transition-seed.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

- `01-author-hook-direct-ch1.md`
- `02-structural-beats-in-author-role.md`

## Out Of Scope

- Client orchestration skip.
- Removing Arc Author endpoint.
- Changing Chapter Meaning schema.
- Replacing campaign thread model.
