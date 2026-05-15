# Narrator Prompt Surface Module

Status: draft-blocked
Type: HITL

## What to build

Draft a deeper Narrator Prompt Surface Module that owns the structure of the Narrator prompt surface: cached system blocks, dynamic scene bundle, in-scene replay, current-turn delta, roll-resume tool-result content, dynamic advisory blocks, and diagnostics describing what was included.

This ticket is intentionally blocked. Do not implement it until the decisions listed below are made.

## Current problem

`buildNarratorTurnContext` is already a useful route-facing Module, but the prompt surface underneath it still has scattered knowledge:

- `lib/sf2/narrator/prompt.ts` owns core, bible, role, and chapter situation text.
- `lib/sf2/narrator/messages.ts` owns scene bundle placement, in-scene replay, current-turn delta, role lookup, roll gates, playbook preference, location continuity guard, recovery notes, coherence notes, and message cache markers.
- `lib/sf2/narrator/turn-context.ts` owns system composition, cached tools, roll-resume messages, roll-result prose, failed-roll pressure manifestation, pacing diagnostics, and sentinel context.
- `lib/sf2/retrieval/scene-packet.ts` renders major dynamic packet sections.
- `lib/sf2/narrator/roll-gates.ts` and `lib/sf2/narrator/intent-queue.ts` inject mandatory dynamic instructions.

The behavior is valuable, but the Interface is still implicit. A maintainer must remember cache boundaries, dynamic placement, roll-resume differences, and prompt/tool coupling across several files.

This ticket intentionally covers the `buildNarratorTurnContext` orchestration concern. Do not create a separate turn-context refactor ticket unless, after this ticket is implemented, `turn-context.ts` still owns substantial prompt-surface implementation details instead of acting as a thin route-facing coordinator.

## Target Module - draft shape

Potential location:

- `lib/sf2/narrator/prompt-surface/`

Potential files:

- `lib/sf2/narrator/prompt-surface/build.ts`
- `lib/sf2/narrator/prompt-surface/types.ts`
- `lib/sf2/narrator/prompt-surface/roll-resume.ts`
- `lib/sf2/narrator/prompt-surface/diagnostics.ts`

Potential Interface:

```ts
interface BuildNarratorPromptSurfaceInput {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  rollResolution?: Sf2NarratorRollResolution
}

interface NarratorPromptSurface {
  mode: 'normal' | 'roll_resume'
  system: Anthropic.TextBlockParam[]
  messages: Anthropic.MessageParam[]
  cachedTools: Anthropic.Tool[]
  diagnostics: {
    workingSet: Sf2NarratorWorkingSetEventPayload | null
    sceneBundleBuilt: Sf2NarratorSceneBundleEventPayload | null
    pacingAdvisory: Sf2NarratorPacingEventPayload | null
    promptBlocks: Array<{
      label: string
      placement: 'cached_system' | 'dynamic_message' | 'roll_resume_tool_result'
      approximateChars: number
    }>
  }
  sentinelContext: ScanDisplayOutputOptions
  failedRollSkill?: string
  requiredRollGate: Sf2RequiredRollGate | null
  intentQueue: Sf2NarratorIntentQueue
}
```

The exact shape should be informed by tickets 06 and 07. The important goal is Locality: prompt-surface assembly rules sit behind one Module Interface, while `buildNarratorTurnContext` remains the route-facing caller.

## Decisions required before implementation

### Decision 1: Which prompt edits are approved?

Source: `06-prompt-surface-inventory-and-parity-audit.md`

Before implementation, decide:

- Which duplicated instructions can be merged or deleted?
- Which bug-scar instructions are still load-bearing?
- Which V1 rules should be restored in SF2 prompt text?
- Which V1 rules are intentionally replaced by SF2 code/schema/validators?
- Which rules should move to replay fixtures, validators, sentinels, or derived advisories instead of prompt prose?

Default before this decision: do not change prompt wording. Extract structure only.

### Decision 2: What does the Genre Narrative Profile own?

Source: `07-sf2-genre-narrative-profile-module.md`

Before implementation, decide:

- Does the Narrator prompt surface consume `getSf2GenreNarrativeProfile` directly?
- Do Author, Narrator, Arc Author, and retry prompts all use the same profile Interface?
- Are genre bible and examples the whole first profile, or should the profile also own tone ratios, banned names, vocabulary guards, quick-action examples, continuation examples, or role-specific examples?

Default before this decision: consume whatever compatibility helpers ticket 07 leaves in place; do not expand profile scope.

### Decision 3: What is the cache-boundary contract?

Current behavior:

- `SF2_CORE`, genre bible, role, and chapter situation are system blocks.
- `composeSystemBlocks` owns cache markers.
- Per-turn scene packet and current turn delta live in messages.
- Roll-resume uses preserved prior messages plus a `tool_result`.

Before implementation, decide:

- Should `buildNarratorSituation(state)` remain a cached chapter-scoped system block?
- Should dynamic chapter-state fragments ever move out of the situation block?
- Should the prompt surface Module expose a diagnostic map of cached vs dynamic blocks?

Default before this decision: preserve current cache placement exactly.

### Decision 4: Where does roll-resume prose live?

Current behavior:

- `rollResultMessage` and failed-roll pressure manifestation live in `lib/sf2/narrator/turn-context.ts`.
- Roll resume skips working-set rebuild and appends a `tool_result` to prior messages.

Before implementation, decide:

- Should roll-resume text construction move into the prompt-surface Module?
- Should pressure manifestation on failed rolls be treated as prompt surface, turn-resolution behavior, or a separate runtime advisory?

Default before this decision: moving roll-resume construction is allowed only if output text and message shape stay identical.

### Decision 5: What test surface proves safety?

Before implementation, decide:

- Do we need deterministic prompt-surface fixtures/snapshots?
- Is full `sf2:replay` enough when prompt structure changes but model calls are not live?
- Should tests assert that dynamic content does not enter cached system blocks?
- Should tests assert roll-resume does not rebuild the normal-turn working set?

Default before this decision: add focused deterministic tests or replay fixtures for cache/dynamic placement if a pure helper can expose the contract.

### Decision 6: What remains in `buildNarratorTurnContext`?

Before implementation, decide the intended residual responsibility of `lib/sf2/narrator/turn-context.ts`.

Recommended default:

- Keep `buildNarratorTurnContext` as the route-facing coordinator because routes already depend on that Interface.
- Move prompt-surface assembly details behind the new Module.
- Let `turn-context.ts` still coordinate non-prompt concerns only when they are naturally part of the route-facing turn context: required roll gate exposure, replay metadata shape, and any compatibility shims.

If the implementation leaves `turn-context.ts` owning system composition, message cache placement, roll-resume text construction, failed-roll pressure instruction construction, and prompt-surface diagnostics, then this ticket has not actually deepened the Module. In that case, open a follow-up rather than calling the prompt-surface work complete.

## Draft boundaries

The eventual Module should own:

- system block assembly
- cached-vs-dynamic placement labels
- normal-turn message assembly coordination
- roll-resume message assembly coordination
- dynamic advisory block ordering
- prompt-surface diagnostics useful in replay/debugging

The Module should not own:

- Anthropic streaming
- route error handling
- tool dispatch
- actual prompt copy decisions not approved by the audit
- Archivist patching
- Scene Snapshot reducer behavior
- Genre content writing beyond consuming the Genre Narrative Profile

## Required behavior to preserve if implemented

- Same system block order unless a decision explicitly changes it.
- Same cache marker placement unless a decision explicitly changes it.
- Same normal-turn message order.
- Same roll-resume message shape.
- Same required roll-gate behavior.
- Same intent-queue behavior.
- Same scene bundle cache semantics.
- Same pacing advisory diagnostics.
- Same display sentinel context.
- Same `buildNarratorTurnContext` route-facing output shape unless callers are updated in one narrow pass.

## Acceptance criteria - draft

These are provisional and should be revised after decisions 1-5.

- [ ] A `lib/sf2/narrator/prompt-surface/` Module exists.
- [ ] `buildNarratorTurnContext` delegates prompt-surface assembly to the new Module.
- [ ] `buildNarratorTurnContext` is left as a thin route-facing coordinator, or a follow-up ticket is created explaining what still needs extraction.
- [ ] Prompt copy is unchanged unless approved by the audit decision queue.
- [ ] The Module returns or exposes diagnostics showing cached vs dynamic prompt blocks.
- [ ] Normal-turn and roll-resume paths are explicit in the Module Interface.
- [ ] Dynamic player input/current-turn state never enters cached system blocks.
- [ ] Roll-resume does not recompute or misrepresent the pre-roll working set.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.

## Verification - draft

After decisions and implementation, run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

Add focused deterministic tests/fixtures if the implementation creates a pure prompt-surface helper whose contracts can be asserted without live model calls.

## Blocked by

- `06-prompt-surface-inventory-and-parity-audit.md`
- `07-sf2-genre-narrative-profile-module.md`
- Human decisions listed in "Decisions required before implementation"

## Comments

This draft exists so the shape is discoverable, but it should not be picked up as an AFK implementation ticket yet. The safe path is: inventory first, genre profile consolidation in parallel, then decide which prompt-surface changes are structural only versus behavior-changing.
