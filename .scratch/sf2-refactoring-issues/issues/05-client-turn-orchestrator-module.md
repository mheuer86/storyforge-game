# Client Turn Orchestrator Module

Status: implemented-by-08
Type: HITL

## Implementation status

Implemented as extra scope during the Ticket 08 landing. The browser Narrator stream loop now lives in:

- `lib/sf2/runtime/client-turn-orchestrator.ts`

The page wrapper in `app/play/v2/page.tsx` passes fetch, roll-modal, React state, and diagnostics adapters into `runSf2ClientNarratorTurn(...)`.

This ticket should not be assigned as open. Any future work should be written as a residual ticket against the current implementation, for example focused client-orchestrator unit coverage or a narrower UI-flow cleanup.

## What to build

Create a Client Turn Orchestrator Module for the V2 play page that owns the Narrator stream sequence:

1. start a Narrator stream
2. append visible prose as `text` events arrive
3. pause when a `roll_prompt` arrives
4. wait for the UI roll modal to resolve
5. resume the Narrator with `rollResolution`
6. finish when `narrate_turn` arrives
7. return the prose, annotation, roll records, sentinel events, working set, and scene bundle needed by `commitSf2Turn`

This ticket depends on the shared Narrator Stream Protocol Module. It should extract sequencing knowledge from `app/play/v2/page.tsx` while preserving React state ownership and the current streaming feel.

## Current files to inspect

- `app/play/v2/page.tsx`
- `app/api/sf2/narrator/route.ts`
- `lib/sf2/narrator/stream-protocol/*` from the preceding ticket
- `lib/sf2/runtime/turn-pipeline.ts`
- `lib/sf2/diagnostics-store.ts`
- `lib/sf2/types.ts`

## Target Module

Add a Module under `lib/sf2/runtime/` or `lib/sf2/client/`. Suggested location:

- `lib/sf2/runtime/client-turn-orchestrator.ts`

The Module should expose a function with a small Interface, for example:

```ts
runSf2ClientNarratorTurn({
  state,
  playerInput,
  isInitial,
  turnIndex,
  fetchNarrator,
  requestRoll,
  onProse,
  onSuggestedActions,
  onPendingCheck,
  onRollResult,
  onLiveRoll,
  onDiagnostic,
})
```

The exact names may vary. The important shape is that the Module owns protocol sequencing, while adapters passed in from the page own UI state updates, fetch headers, persistence, and diagnostics storage.

If the callback list gets noisy, group callbacks under a single `effects` object rather than adding positional arguments. The readability goal is one explicit adapter surface, not a long argument list that recreates page coupling in a different shape.

## Suggested Interface shape

Use explicit adapter types so the orchestrator is testable without React.

```ts
interface RunSf2ClientNarratorTurnInput {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  fetchNarrator: (body: unknown) => Promise<Response>
  requestRoll: (prompt: Sf2ClientPendingCheck) => Promise<Sf2ClientRollOutcome>
  effects: {
    onProse: (prose: string) => void
    onSuggestedActions: (actions: string[]) => void
    onPendingCheck: (prompt: Sf2ClientPendingCheck | null) => void
    onRollResult: (outcome: Sf2ClientRollOutcome | null) => void
    onLiveRollAdded: (roll: Sf2LiveRollView) => void
    onDiagnostic: (entry: DebugEntry) => void
    onStreamingChange?: (streaming: boolean) => void
  }
}

interface RunSf2ClientNarratorTurnResult {
  completed: boolean
  prose: string
  annotation: Record<string, unknown> | null
  errorMessage?: string
  bundleBuilt: Sf2State['world']['sceneBundleCache'] | null
  rollRecords: Sf2State['history']['rollLog']
  sentinelEvents: Sf2TurnPipelineEvent[]
  workingSet: Sf2WorkingSet | null
}
```

The exact type names can differ. The key is that React state setters and diagnostics are adapters, not imports hidden inside the orchestrator.

## Boundaries

The orchestrator should own:

- building the Narrator request body for initial and roll-resume calls
- reading the NDJSON response
- dispatching typed Narrator Stream Protocol events
- accumulating visible prose
- tracking whether a stream iteration saw `roll_prompt`, `narrate_turn`, or `error`
- constructing `rollResolution` after the roll modal returns
- building per-turn roll records
- collecting per-turn display sentinel invariant events
- returning the final result consumed by `sendTurn`

The page should keep owning:

- React state declarations
- `setIsStreaming`, `setProse`, `setSuggestedActions`, `setPendingCheck`, `setLiveRolls`, `setRollResult`, and similar state setters
- the actual roll modal UI and player interaction
- `apiHeaders()`
- `diagnosticsStore`
- `commitSf2Turn`
- Archivist calls
- persistence
- chapter generation and chapter close

Do not move `commitSf2Turn` or `runArchivist` into this orchestrator.

## Current page logic to preserve

The implementation should move the stream-loop logic currently inside `runNarrator` in `app/play/v2/page.tsx` and keep these details intact. The thin page wrapper may still perform the first reset before calling the orchestrator, or it may pass callbacks that let the orchestrator do it; either shape is fine as long as React state ownership remains in the page.

- At turn start:
  - set `isStreaming` to true
  - clear visible `prose`
  - clear suggested actions
  - clear pending check
  - clear roll result
  - clear live roll cards
  - clear inspiration offer
  - reset pending inspiration spend ref
- On every exit path, set `isStreaming` back to false.
- For each stream iteration, request body is:
  - normal: `{ state, playerInput: isInitial ? '' : playerInput, isInitial }`
  - roll resume: `{ state, playerInput: isInitial ? '' : playerInput, isInitial: false, rollResolution }`
- Accumulate `text` events into one `proseAccum` string and publish the full accumulated string to the page.
- Store only one `sawRollPrompt` for a stream iteration; if present, wait for the roll and loop again.
- Store `annotation` from `narrate_turn.input`, set suggested actions from `annotation.suggested_actions`, and mark completion only after `narrate_turn`.
- If `error` appears, return `completed: false` with the accumulated prose and error message.
- If the stream ends with neither `roll_prompt` nor `narrate_turn`, return `completed: false` with `stream ended before narrate_turn; turn was not committed`.
- Preserve `display_sentinel` entries even when `findings.length === 0`, because clean-turn sentinel entries are useful telemetry.
- If the roll outcome spends inspiration, clone the local `currentState` used for the next roll-resume request and decrement `currentState.player.inspiration` by 1, matching current behavior. Do not persist that temporary decrement separately; final persistence still happens after `commitSf2Turn`.

## Shared client-side types

If extracting the orchestrator requires moving page-local types, keep the shapes stable:

```ts
interface Sf2ClientPendingCheck {
  toolUseId: string
  skill: string
  dc: number
  why: string
  consequenceOnFail: string
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
  priorMessages: unknown[]
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

interface Sf2ClientRollOutcome {
  d20: number
  rawRolls?: number[]
  modifier: number
  total: number
  dc: number
  effectiveDc?: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  skill?: string
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  inspirationSpent?: boolean
  originalRoll?: Sf2ClientRollOutcome
}
```

These can live near the orchestrator if they become shared by the page and the orchestrator. Avoid exporting broad UI-only state types.

## Required behavior to preserve

- Starting a turn still clears visible prose, suggested actions, pending check, roll result, live rolls, and inspiration offer exactly as the page currently does.
- The Narrator loop can still run multiple stream iterations for a single player input when a roll pauses the turn.
- A `roll_prompt` still adds a live roll card at the current prose offset.
- The roll modal still blocks continuation until the player resolves it.
- Inspiration spending still applies the same temporary local decrement before roll resume.
- Roll records keep current fields and outcome mapping.
- `rollResolution` sent back to the Narrator keeps current fields:
  - `toolUseId`
  - `skill`
  - `dc`
  - `effectiveDc`
  - `d20`
  - `modifier`
  - `total`
  - `result`
  - `modifierType`
  - `modifierReason`
  - `priorMessages`
  - `originalInput`
  - `currentIntent`
  - `remainingIntents`
- Stream errors still return an uncommitted result and restore player input through the page's existing error path.
- If the stream ends before `narrate_turn`, the turn is still not committed.
- Display sentinel repaired prose still replaces accumulated visible prose.
- `bundleBuilt`, `workingSet`, `rollRecords`, and `sentinelEvents` still feed into `commitSf2Turn`.
- No change to Archivist-before-mechanical-effects ordering.

## Roll record details

Roll records appended to `rollRecords` must preserve current fields:

- `turn`
- `proseOffset`
- `skill`
- `intendedSkill`
- `intendedSkills`
- `requestedSkill`
- `skillOverrideReason`
- `dc`
- `effectiveDc`
- `rollResult`
- `rawRolls`
- `modifier`
- `outcome`
- `consequenceSummary`
- `modifierType`
- `modifierReason`
- `inspirationSpent`
- `originalRoll`

Outcome mapping must remain:

- `critical` -> `critical_success`
- `fumble` -> `critical_failure`
- `success` -> `success`
- `failure` -> `failure`

The helper currently named `rollFailureSummary` may stay in the page or move with the orchestrator, as long as failures and fumbles still copy the trimmed `consequenceOnFail` when present.

## Suggested implementation steps

1. Land `04-narrator-stream-protocol-module.md` first.
2. Add the orchestrator Module with adapters and result types.
3. Move the internals of `runNarrator` into the orchestrator with the smallest possible edits.
4. Keep `runNarrator` in the page as a thin adapter that wires React setters, `apiHeaders()`, `diagnosticsStore`, and `rollResolverRef`.
5. Compile before doing any larger cleanup.
6. Only after behavior is preserved, remove dead page-local helper types or move them to the new Module if they are now shared.

## Non-goals

- Do not move chapter generation, chapter close, Archivist calls, or persistence.
- Do not change the route protocol or event names.
- Do not change the roll modal UI.
- Do not change streaming buffering, text cadence, or when visible prose appears.
- Do not introduce a new global store for turn execution.
- Do not combine this with Scene Snapshot, Archivist, Author, or prompt-surface refactors.

## HITL reason

This is behavior-preserving refactoring, but it touches the roll-pause loop and streaming UX in `app/play/v2/page.tsx`, which is a high-risk integration surface. It should be implemented with human oversight or at least a manual browser smoke test before merging.

## Acceptance criteria

- [ ] `app/play/v2/page.tsx` no longer contains the full low-level Narrator stream loop inline.
- [ ] A named Client Turn Orchestrator Module owns stream iteration, roll pause/resume sequencing, and final `narrate_turn` completion detection.
- [ ] React state ownership remains in the page through explicit callbacks/adapters.
- [ ] The orchestrator consumes the shared Narrator Stream Protocol Module from `04-narrator-stream-protocol-module.md`.
- [ ] `sendTurn` still calls `commitSf2Turn` after successful Narrator completion.
- [ ] Failed Narrator streams still do not commit a turn.
- [ ] Roll records and roll-resolution request payloads are byte-for-byte compatible where practical, or intentionally equivalent with tests explaining any harmless ordering differences.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.
- [ ] Manual V2 browser smoke test confirms streaming text, roll pause, roll resume, suggested actions, diagnostics, and final turn persistence.

## Verification

Run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

Manual browser checks are part of done:

- Start or load a V2 game.
- Send a normal free-text action and confirm the turn commits.
- Trigger a roll-tagged action or a private roll gate and confirm the roll modal pauses the stream.
- Resolve the roll and confirm the Narrator resumes from the same player input.
- Confirm the final turn persists and the debug panel still shows narrator usage, latency, roll, sentinel, and commit diagnostics.

## Blocked by

- `04-narrator-stream-protocol-module.md`

## Comments

This is the second slice of the SF2 Turn Runtime shaping. It should not be bundled with the protocol ticket. The goal is Locality around client-side turn sequencing, not a server-side turn rewrite.
