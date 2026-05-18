# Narrator Turn Context Orchestrator Cleanup

Status: implemented-by-08
Type: AFK

## Implementation status

Implemented as extra scope during the Ticket 08 landing. `buildNarratorTurnContext(...)` remains the route-facing coordinator in `lib/sf2/narrator/turn-context.ts`, while internal responsibilities now live in named helpers:

- `lib/sf2/narrator/system-blocks.ts`
- `lib/sf2/narrator/roll-resume.ts`
- `lib/sf2/narrator/roll-result.ts`
- `lib/sf2/narrator/diagnostics.ts`
- `lib/sf2/narrator/sentinel-context.ts`
- `lib/sf2/narrator/replay-metadata.ts`

This ticket should not be assigned as open. Any further work should be written as a residual ticket against the current files.

## What to build

Refactor `lib/sf2/narrator/turn-context.ts` into clearer orchestration helpers after the Narrator Prompt Surface Module exists.

This ticket should preserve the public route-facing Interface:

```ts
buildNarratorTurnContext({
  state,
  playerInput,
  isInitial,
  turnIndex,
  rollResolution,
})
```

The goal is Locality and testability. The route should still ask for one turn context, but the internals should no longer require one file to own every part of system assembly, normal messages, roll resume, diagnostics, cached tools, sentinel context, and replay metadata.

## Blocked by

- `08-narrator-prompt-surface-module.md`

This follows Ticket 08 because prompt text ownership should be clear before turn-context orchestration is split.

## Current problem

`turn-context.ts` is a useful route-facing seam, but it currently carries several responsibilities:

- chooses normal vs roll-resume mode
- assembles system blocks
- builds cached tools
- builds normal messages by delegating to `messages.ts`
- builds roll-resume `tool_result` messages
- owns roll-result prose
- owns failed-roll pressure manifestation instruction
- computes diagnostics event payloads
- builds sentinel context
- exposes required roll-gate state
- builds replay metadata

Those are related, but not all the same kind of work. The file can remain the public coordinator while its internal responsibilities move into named helpers/modules.

## Current files to inspect

- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/narrator/messages.ts`
- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/narrator/prompt/*`
- `lib/sf2/narrator/intent-queue.ts`
- `lib/sf2/narrator/roll-gates.ts`
- `lib/sf2/sentinel/display.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `app/api/sf2/narrator/route.ts`
- `scripts/sf2-replay.ts`
- relevant fixtures under `fixtures/sf2/replay/`

## Target shape

The exact files may vary. A reasonable split:

- mode selection / public coordinator remains in `turn-context.ts`
- system block assembly helper
- cached tools helper
- roll-resume message helper
- roll result text helper
- failed-roll pressure instruction helper
- diagnostics payload helper
- sentinel context helper
- replay metadata helper

Do not split just for file count. Split where a name clarifies responsibility and lets focused fixtures target a contract.

## Required behavior to preserve

- Same `buildNarratorTurnContext` public input/output shape.
- Same normal-mode message order.
- Same roll-resume message shape.
- Same roll-result prose.
- Same failed-roll pressure manifestation instruction text.
- Same required roll-gate behavior.
- Same intent queue behavior.
- Same cached tools and cache marker behavior.
- Same working-set, scene-bundle, and pacing diagnostics.
- Same rule that roll resume skips working-set rebuild and scene-bundle diagnostics.
- Same sentinel context.
- Same replay metadata.
- No prompt text changes unless already moved by Ticket 08 and byte-equivalent.

## Fixture / replay requirements

Use the existing SF2 replay harness.

Add focused deterministic coverage for:

- normal mode returns system/messages/cached tools/diagnostics in the same shape
- roll-resume mode preserves prior messages and appends exactly one `tool_result`
- roll-resume mode does not emit normal working-set, scene-bundle, or pacing diagnostics
- required roll-gate behavior remains identical
- failed-roll pressure instruction remains attached only in the roll-resume path
- replay metadata remains stable enough for fixture export/debugging

Prefer exact assertions for small helper strings and structured shape assertions for full Anthropic message arrays.

## Out of scope

- No prompt copy edits.
- No cache-boundary changes.
- No route streaming changes.
- No client orchestrator changes.
- No stream protocol changes.
- No Archivist or Scene Snapshot changes.
- No live model calls.

## Suggested implementation steps

1. Add focused fixtures against the current behavior.
2. Extract one responsibility at a time from `turn-context.ts`.
3. Keep `buildNarratorTurnContext` as the only route-facing entrypoint.
4. Run the focused fixtures after each meaningful move.
5. Run the full replay suite and build before calling done.

## Acceptance criteria

- [ ] `turn-context.ts` remains the route-facing coordinator.
- [ ] Internal responsibilities are named and factored enough that a reader can locate system assembly, roll resume, diagnostics, cached tools, sentinel context, and replay metadata without scanning one large function.
- [ ] Public input/output shape remains compatible with `app/api/sf2/narrator/route.ts`.
- [ ] Focused fixtures cover normal and roll-resume modes.
- [ ] No prompt text or cache-boundary behavior changes are introduced.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.

## Verification

Run focused new/changed fixtures first, then:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```
