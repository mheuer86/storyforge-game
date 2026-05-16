# Narrator Prompt Surface Module

Status: needs-triage
Type: AFK

## What to build

Refactor the SF2 Narrator prompt text surface into a clearer Module while preserving behavior exactly.

This ticket is structure-only. It should make the prompt surface easier to navigate, test, and safely change later. It must not add, delete, shorten, reorder, or rewrite prompt rules.

## Decisions from shaping

These decisions are already made and should be treated as requirements:

- Ticket 08 is strictly structural. No V1 systems are restored here.
- Duplicated defensive prompt rules stay duplicated. They are deep defense against observed failures, not cleanup targets.
- `buildNarratorSituation(state)` is in scope for move-only extraction with byte-equivalent output.
- The current boundary between cached chapter situation, scene-scoped scene bundle, and per-turn mutable delta/private blocks is not in scope to change.
- Deterministic fixtures are required for validation.
- Use the existing SF2 replay harness for equivalence checks.
- Keep `lib/sf2/narrator/prompt.ts` as the formal public facade.
- Add a small README/context file for the new Narrator prompt module.
- Lightly update the prompt inventory artifact after implementation.
- Do not refactor `lib/sf2/narrator/turn-context.ts` in this ticket. That is a follow-up ticket.

## Current files to inspect

- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/narrator/messages.ts`
- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/narrator/roll-gates.ts`
- `lib/sf2/narrator/intent-queue.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/genre-profile/*`
- `scripts/sf2-replay.ts`
- `.scratch/sf2-refactoring-issues/artifacts/prompt-surface-inventory-and-parity-audit.md`

## Current boundary to preserve

There are three prompt/context layers. Do not blur them.

### 1. Narrator situation - chapter-scoped cached system block

Current owner: `buildNarratorSituation(state)` in `lib/sf2/narrator/prompt.ts`.

Contains durable Author chapter setup:

- chapter number/title
- frame objective, crucible, active pressure
- outcome spectrum
- antagonist field
- authored pressure ladder plan
- spine thread anchor
- arc context
- chapter pacing contract

This answers: what is this chapter about, and what dramatic machine did Author build?

### 2. Scene bundle - scene-scoped cached message

Current owner: `renderSceneBundle(...)` in `lib/sf2/retrieval/scene-packet.ts`, assembled by `lib/sf2/narrator/messages.ts`.

Contains relatively stable scene context:

- current location, area/node, atmosphere
- scene intent
- scene-level chapter objective/crucible
- current pressure face/step at scene open
- arc summary and pacing target
- continuation dramatic turn
- human stakes
- on-stage cast identity
- off-stage authored/relevant cast

This answers: what scene are we in, who is here, and what stable context should not be rediscovered every turn?

### 3. Per-turn delta/private blocks - current mutable uncached message content

Current owners: `renderPerTurnDelta(...)` in `lib/sf2/retrieval/scene-packet.ts` plus appended private blocks in `lib/sf2/narrator/messages.ts`.

Contains mutable/current-turn context:

- player mechanical state, proficiencies, traits, temp modifiers
- current time and temporal anchors
- fired pressure ladder steps
- revelation hint progress
- cast mutable reads: disposition, temp load, posture, behavioral contract, will-share/will-not, active pressure
- operation plan
- thread tensions and local pressure
- emotional beats
- beat mode and active mechanics/procedure packets
- advisory text
- establishment vs continuation instruction
- current player input
- deterministic resolved action/pronoun target info
- role alias lookup
- required roll gate
- playbook preference
- location continuity guard
- recovery/coherence notes
- intent queue block

This answers: what changed or matters right now?

## Target Module

Create a small internal Module under:

- `lib/sf2/narrator/prompt/`

Suggested files:

- `lib/sf2/narrator/prompt/core.ts`
- `lib/sf2/narrator/prompt/role.ts`
- `lib/sf2/narrator/prompt/situation.ts`
- `lib/sf2/narrator/prompt/index.ts`
- `lib/sf2/narrator/prompt/README.md`

The exact file names may vary, but the ownership should be obvious.

Keep this public facade:

- `lib/sf2/narrator/prompt.ts`

The facade should continue exporting the existing public surface, including:

- `SF2_CORE`
- `SF2_NARRATOR_ROLE`
- `buildNarratorRole`
- `buildNarratorSituation`
- current genre-profile compatibility re-exports such as `getSf2BibleForGenre` and `SF2_BIBLE_HEGEMONY`

Existing route/script callers should not need broad import churn in this ticket.

## README requirements

Add a tiny README/context file in the new module. It should explain:

- `lib/sf2/narrator/prompt.ts` is the public facade.
- Internal modules own implementation details.
- `core` is world-independent cached core.
- `role` is cached role/craft/output contract.
- `situation` is chapter-scoped cached Author setup projection.
- Per-turn state does not belong in situation.
- Scene/message assembly lives in `lib/sf2/narrator/messages.ts`, `lib/sf2/narrator/turn-context.ts`, and `lib/sf2/retrieval/scene-packet.ts`.
- Any behavior-changing prompt edit belongs in a dedicated ticket with fixture coverage.

## Required behavior to preserve

- Same exported public names from `lib/sf2/narrator/prompt.ts`.
- Same `SF2_CORE` text.
- Same `SF2_NARRATOR_ROLE` text.
- Same `buildNarratorRole(genreId)` output text for existing genres.
- Same `buildNarratorSituation(state)` output text for representative states.
- Same section order in the role and situation output.
- Same genre-profile outputs and compatibility re-exports.
- Same system block order and cache marker behavior through existing callers.
- Same normal-turn message assembly.
- Same roll-resume behavior.
- Same required roll-gate behavior.
- Same scene bundle and per-turn delta boundary.
- Same display sentinel context.

## Out of scope

- No V1 system restorations.
- No prompt copy edits.
- No duplicate-rule cleanup.
- No cache-boundary changes.
- No `turn-context.ts` refactor.
- No role/schema/tool behavior changes.
- No import-cleanup campaign beyond what is needed to keep the facade working.
- No genre content writing.

## Fixture / replay requirements

Use the existing SF2 replay harness rather than adding a separate runner.

Add deterministic fixture assertions that protect output text/order/cache-sensitive assembly. Exact equality is preferred for extracted helper output where practical; substring/order checks are acceptable for large assembled message arrays.

Minimum useful coverage:

- `buildNarratorRole('hegemony')` or system block output includes the same load-bearing sections in the same order.
- `buildNarratorRole('space-opera')` or system block output includes the same genre-specific surface in the same order.
- `buildNarratorSituation(state)` exact-output fixture for a representative authored chapter state.
- one normal message assembly case through `buildNarratorTurnContext(...)` or existing `narratorMessages` fixture surface.
- one roll-resume message case proving prior messages and the `tool_result` content remain stable.

Do not use live model calls.

## Suggested implementation steps

1. Add focused replay-harness assertions for prompt role/situation/system text if the current harness does not expose enough.
2. Add or extend focused fixtures before moving code.
3. Create `lib/sf2/narrator/prompt/` internal modules.
4. Move `SF2_CORE` into the core module without text changes.
5. Move `buildNarratorRole` and `SF2_NARRATOR_ROLE` into the role module without text changes.
6. Move `buildNarratorSituation` and its private render helper into the situation module without text changes.
7. Keep `lib/sf2/narrator/prompt.ts` as the public facade re-exporting the same public names.
8. Add the module README/context file.
9. Lightly update the inventory artifact with a Post-08 reconciliation note and current file ownership.
10. Run focused fixtures first, then full replay/build.

## Acceptance criteria

- [ ] `lib/sf2/narrator/prompt/` exists and owns core/role/situation implementation.
- [ ] `lib/sf2/narrator/prompt.ts` remains the formal public facade.
- [ ] Existing public imports from `lib/sf2/narrator/prompt.ts` continue to work.
- [ ] The new module README documents the cache/dynamic boundary.
- [ ] Prompt text and section order are preserved.
- [ ] No per-turn mutable state is moved into the cached situation block.
- [ ] Deterministic replay-harness coverage protects role/situation/system/message equivalence.
- [ ] The prompt inventory artifact has a short Post-08 reconciliation note.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.

## Verification

Run focused new/changed fixtures first, then:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If build cannot run because of network font fetching, state that explicitly and still run the replay suite.

## Blocked by

None in the current branch: the prompt inventory exists and the genre profile structural move has landed.

If picked up on a branch where ticket 06 or ticket 07 has not landed, complete those first.

## Follow-ups intentionally split out

- `09-narrator-prompt-facade-import-cleanup.md`: standardize imports around the public facade.
- `10-narrator-turn-context-orchestrator-cleanup.md`: refactor turn-context orchestration after this prompt module exists.
