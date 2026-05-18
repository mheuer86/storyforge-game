# Narrator Prompt Facade Import Cleanup

Status: satisfied-by-08
Type: AFK

## Implementation status

Satisfied by the Ticket 08 landing. `lib/sf2/narrator/prompt.ts` is the public facade and current route/script/application callers use it rather than deep-importing prompt internals.

Review command:

```bash
rg "narrator/prompt/" app lib scripts fixtures
```

No accidental public deep imports were found. Do not assign this ticket as open unless future work introduces import drift.

## What to build

After Ticket 08 lands, make the Narrator prompt module boundary intentional across imports.

The decision from shaping is that `lib/sf2/narrator/prompt.ts` should be the formal public facade for Narrator prompt exports. Internal implementation may live under `lib/sf2/narrator/prompt/`, but normal callers should not need to know that.

This ticket is a cleanup pass, not a behavior change.

## Blocked by

- `08-narrator-prompt-surface-module.md`

## Current problem

Ticket 08 may keep compatibility re-exports while moving implementation into smaller prompt modules. That is good for low-risk extraction, but after the move the repo should not drift into a random mix of:

- public facade imports
- deep internal prompt-module imports
- legacy compatibility paths
- route/script-specific exceptions

Without a cleanup pass, the new module boundary becomes blurry again.

## Intended public boundary

Public import path:

- `lib/sf2/narrator/prompt.ts`

Normal route/script/application callers should import public prompt API from that facade, including:

- `SF2_CORE`
- `SF2_NARRATOR_ROLE`
- `buildNarratorRole`
- `buildNarratorSituation`
- genre compatibility exports preserved there

Internal prompt implementation files may import from each other with relative paths.

Focused tests/fixtures may deep-import internal helpers only when the test is intentionally asserting that helper's exact output.

## Current files to inspect

- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/narrator/prompt/*`
- `lib/sf2/narrator/turn-context.ts`
- `app/api/sf2/*/route.ts`
- `scripts/sf2-*.ts`
- `scripts/sf2-*.cjs`
- `fixtures/sf2/replay/*.json`
- any new fixtures added by Ticket 08

## Required behavior to preserve

- No prompt text changes.
- No cache-boundary changes.
- No model-call behavior changes.
- No route behavior changes.
- Existing probes/scripts should still run or fail for the same external reasons they did before.
- Compatibility facade remains. Do not remove it in this ticket.

## Suggested implementation steps

1. Search for imports from `lib/sf2/narrator/prompt` and any deep imports from `lib/sf2/narrator/prompt/`.
2. Classify each deep import:
   - internal prompt module implementation: allowed
   - focused helper fixture/test: allowed if intentional
   - route/script/application caller: should use the facade
3. Update accidental route/script/application deep imports to the facade.
4. Keep or add a short comment/README note that `prompt.ts` is the public import path.
5. Avoid drive-by changes to unrelated prompt, route, or script code.

## Acceptance criteria

- [ ] Public callers use `lib/sf2/narrator/prompt.ts` as the prompt API facade.
- [ ] Deep imports from `lib/sf2/narrator/prompt/` are limited to internal implementation or intentional focused tests.
- [ ] The facade remains in place and exports the public API.
- [ ] No prompt text changes are made.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.

## Verification

Run:

```bash
rg "narrator/prompt/" app lib scripts fixtures
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

The `rg` command should only show internal implementation imports or intentional focused tests/fixtures.
