Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# Author hookDirect mode for Ch1

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Make Chapter Author capable of authoring Chapter 1 directly from the selected `AuthorInputSeed` when `state.campaign.arcPlan` is absent.

Current behavior rejects the Author request before the prompt is built:

- `app/api/sf2/author/route.ts` returns `missing_arc_plan`.
- `lib/sf2/author/prompt.ts` tells Author the missing arc plan is invalid.
- The Ch1 situation says the ArcPlan is the stable pressure field and the raw seed is only palette.

The new Ch1 mode should treat the selected hook as the source of playable pressure. The Author remains a structured chapter setup role, not a prose narrator and not a five-chapter planner.

## Required Behavior

- If `state.history.turns.length === 0` and `state.campaign.arcPlan` is absent, Author route proceeds.
- The Ch1 Author situation is labeled as direct hook interpretation, not missing-arc fallback.
- The Ch1 situation includes `renderStructuralBeatForChapter(1, undefined)` or equivalent Ch1 beat guidance.
- The Author receives the existing `AuthorInputSeed` user message from `compileAuthorInputSeed`.
- The prompt tells Author to choose opening camera, visible NPCs, first pressure, and chapter test from the hook.
- The prompt explicitly says the hook fixes pressure facts, not plot.
- `arc_link` remains schema-compatible for Phase 1. If the tool requires it, allow a non-empty compatibility value such as `arc_id: "hook_direct"` and a meaningful `chapter_function`; skip arc-thread validation when no `campaign.arcPlan` exists.
- Do not introduce new campaign state such as `campaignForces` in this slice unless the existing hydration path already supports it. Use existing factions, NPCs, threads, antagonist field, and chapter setup outputs.

## Surfaces

- `app/api/sf2/author/route.ts`
- `lib/sf2/author/prompt.ts`
- `lib/sf2/author/contract.ts`
- `lib/sf2/author/retry.ts` if validation retry text still assumes ArcPlan
- `lib/sf2/author/tools.ts` only if schema descriptions make no-arc output impossible
- `lib/sf2/types.ts` only if a compatibility field is unavoidable
- `fixtures/sf2/replay/`

## Implementation Notes

- Keep the old Arc Author path working. This ticket only makes the Author route valid without an arc plan for Chapter 1.
- Preserve the old ArcPlan path for existing saves and for the Phase 1 fallback flag.
- Do not make `state.campaign.arcPlan` required in any new helper.
- Avoid a broad refactor of Author contract parsing. Make the smallest compatibility change that lets no-arc Ch1 validate.
- Any no-arc compatibility `arc_link` values must not create fake durable arc threads.

## Acceptance Criteria

- [ ] A Chapter 1 Author request with no `campaign.arcPlan` no longer returns `missing_arc_plan`.
- [ ] The built Author situation for no-arc Ch1 does not include "missing arc plan" or "derive from ArcPlan".
- [ ] The Ch1 direct-hook situation includes structural beat guidance.
- [ ] The Author contract accepts no-arc Ch1 output without requiring real arc thread links.
- [ ] The existing ArcPlan-backed Ch1 path still works for old saves or forced fallback.
- [ ] Diagnostics or fixture metadata make the no-arc Author mode visible.

## Fixture Expectations

Add or update a focused fixture that exercises the pure Author contract without a live Anthropic call. Prefer a helper/contract fixture over a live route fixture.

Suggested fixture name:

```bash
fixtures/sf2/replay/author-hook-direct-ch1-no-arc.json
```

It should assert:

- no `campaign.arcPlan` in input state
- Ch1 setup validates
- active thread count remains the Ch1 expected count
- no real arc-thread links are required
- opening scene has a playable human pressure, not a mechanism-only objective

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/author-hook-direct-ch1-no-arc.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Skipping the client Arc Author call. That is ticket 05.
- Removing the Arc Author endpoint. That is Phase 2.
- Adding a new campaign forces state model.
- Changing streaming behavior.
