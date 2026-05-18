# Narrator Stream Protocol Module

Status: implemented
Type: AFK

## Implementation status

Implemented. The shared protocol now lives under:

- `lib/sf2/narrator/stream-protocol/events.ts`
- `lib/sf2/narrator/stream-protocol/parse.ts`
- `lib/sf2/narrator/stream-protocol/index.ts`

The parser preserves the old browser-side soft defaults for malformed stream payloads. `app/play/v2/page.tsx` now consumes the parser indirectly through `lib/sf2/runtime/client-turn-orchestrator.ts`.

Do not pick this ticket up as open unless a future review finds a new protocol gap.

## What to build

Create a shared SF2 Narrator Stream Protocol Module that owns the typed NDJSON event contract between the Narrator route and the V2 play page.

Today `app/api/sf2/narrator/route.ts` defines a route-local `Sf2NarratorStreamEvent` union, emits plain object literals, and `app/play/v2/page.tsx` consumes the stream as loose `Record<string, unknown>` values. The behavior is working, but the Interface is shallow: both sides must remember payload names, defaulting rules, event meanings, and which diagnostics are safe to ignore.

This ticket should make the contract explicit without changing the turn sequence.

## Current files to inspect

- `app/api/sf2/narrator/route.ts`
- `app/play/v2/page.tsx`
- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/sentinel/display.ts`
- `lib/sf2/instrumentation/latency.ts`
- `lib/sf2/diagnostics-store.ts`
- `lib/sf2/instrumentation/session-summary.ts`

## Target Module

Add a Module under `lib/sf2/narrator/stream-protocol/` or a similarly clear location. Suggested files:

- `lib/sf2/narrator/stream-protocol/events.ts`
- `lib/sf2/narrator/stream-protocol/parse.ts`
- optional `lib/sf2/narrator/stream-protocol/emit.ts`

The Module should expose:

- a shared `Sf2NarratorStreamEvent` union
- specific event types for each current event variant
- a parser / normalizer for one decoded NDJSON object
- optional route-side event builder helpers
- narrow helpers for common guards such as `isRollPromptEvent`, if useful

## Events to cover

The shared event union must cover every current Narrator stream event:

- `text`
- `narrate_turn`
- `roll_prompt`
- `working_set`
- `pacing_advisory`
- `scene_bundle_built`
- `token_usage`
- `latency`
- `truncation_warning`
- `roll_gate_diagnostic`
- `display_sentinel`
- `narrator_meta_observed`
- `narrator_output_recovered`
- `error`
- `done`

Do not remove or rename any event in this ticket.

## Current payload contract

Mirror the current route/client contract. The exact type names may vary, but these fields and meanings must remain stable.

```ts
type Sf2NarratorStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'narrate_turn'; input: Record<string, unknown> }
  | {
      type: 'roll_prompt'
      toolUseId: string
      skill: string
      requestedSkill?: string
      intendedSkills?: string[]
      skillOverrideReason?: string
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
  | {
      type: 'working_set'
      summary: {
        full: string[]
        stub: string[]
        excluded: number
        reasons: Record<string, string[]>
      }
      workingSet: Sf2WorkingSet
    }
  | {
      type: 'pacing_advisory'
      tripped: boolean
      reactivityRatio: number
      reactivityTripped: boolean
      sceneLinkTripped: boolean
      stagnantThreadIds: string[]
      arcDormantIds: string[]
    }
  | { type: 'scene_bundle_built'; sceneId: string; bundleText: string; builtAtTurn: number }
  | {
      type: 'token_usage'
      usage: {
        model: string
        inputTokens: number
        outputTokens: number
        cacheWriteTokens: number
        cacheReadTokens: number
      }
    }
  | { type: 'latency'; role: 'narrator'; latency: Sf2LatencyPayload }
  | { type: 'truncation_warning'; outputTokens: number }
  | {
      type: 'roll_gate_diagnostic'
      required: boolean
      source?: string
      kind?: string
      skills?: string[]
      reason?: string
      sourceId?: string
      action: 'none' | 'request_roll' | 'block_narrate_turn'
      repair?: 'not_needed' | 'narrator_complied' | 'blocked_missing_request_roll'
    }
  | {
      type: 'display_sentinel'
      mode: 'observe' | 'enforce'
      repaired: boolean
      repairedProse?: string
      findings: Array<{
        type: string
        severity: string
        surface?: string
        entityId?: string
        evidence: string
        matchStart: number
        matchEnd?: number
        recommendedAction: string
      }>
    }
  | { type: 'narrator_meta_observed'; pattern: string; snippet: string; turnIndex: number }
  | { type: 'narrator_output_recovered'; recoveryNotes: string[]; turnIndex: number }
  | { type: 'error'; message: string }
  | { type: 'done' }
```

Use existing project types where practical:

- `Sf2WorkingSet` from `lib/sf2/types.ts`
- `Sf2LatencyPayload` from `lib/sf2/instrumentation/latency.ts`

The parser may normalize malformed values to the same defaults the page currently applies, but it must not make missing optional fields fatal.

## Current client defaults to preserve

If defaults move from `app/play/v2/page.tsx` into the protocol parser, pin them explicitly in code comments or a focused deterministic assertion before moving them. Current defaults include:

- Invalid JSON lines: ignore and continue reading the stream.
- Unknown event type: ignore or return `null` to the caller; do not crash.
- `roll_prompt.toolUseId`: `String(value ?? '')`
- `roll_prompt.skill`: `String(value ?? '')`
- `roll_prompt.dc`: `Number(value ?? 15)`
- `roll_prompt.why`: `String(value ?? '')`
- `roll_prompt.consequenceOnFail`: `String(value ?? '')`
- `roll_prompt.modifierType`: accept only `advantage`, `disadvantage`, or `challenge`; otherwise `undefined`.
- `roll_prompt.modifierReason`: keep only if a string.
- `roll_prompt.priorMessages`: use the array value when present, otherwise `[]`.
- `roll_prompt.requestedSkill`: keep only if a string.
- `roll_prompt.intendedSkills`: when array, map items through `String` and drop empty values; otherwise `[]`.
- `roll_prompt.skillOverrideReason`: keep only if a string.
- `roll_prompt.originalInput`, `currentIntent`: keep only if strings.
- `roll_prompt.remainingIntents`: when array, map items through `String`; otherwise `undefined`.
- `scene_bundle_built.sceneId`: `String(value ?? '')`
- `scene_bundle_built.bundleText`: `String(value ?? '')`
- `scene_bundle_built.builtAtTurn`: `Number(value ?? 0)`
- `working_set.workingSet`: use the event value if present, otherwise `null`.
- `display_sentinel.findings`: use array value when present, otherwise `[]`.
- `display_sentinel.mode`: `String(value ?? 'observe')`
- `display_sentinel.repaired`: true only when `event.repaired === true`, or when legacy enforce-mode event has `repaired === undefined`, `mode === 'enforce'`, and string `repairedProse`.
- `narrator_meta_observed.pattern` / `snippet`: `String(value ?? '')`
- `narrator_meta_observed.turnIndex`: `Number(value ?? 0)`
- `narrator_output_recovered.recoveryNotes`: array mapped through `String`, otherwise `[]`.
- `narrator_output_recovered.turnIndex`: `Number(value ?? 0)`
- `latency.role`: defaults to `narrator` at the diagnostics call site.
- `error.message`: `String(value ?? 'Narrator stream failed')`

The parser does not have to centralize all of these defaults in the first slice. It does need to either preserve them at the page call site or move them in a way that makes the defaults auditable.

## Required behavior to preserve

- The Narrator route still streams newline-delimited JSON.
- The route still sends `working_set`, `scene_bundle_built`, `pacing_advisory`, and initial roll-gate diagnostics before the Anthropic stream when those diagnostics exist.
- Text events still stream as soon as text deltas arrive, except when the required-roll gate buffers text.
- `request_roll` still produces a `roll_prompt` event and does not emit `narrate_turn` for that stream iteration.
- `narrate_turn` still carries the recovered / normalized tool input as `input`.
- Missing `narrate_turn` repair still emits `narrator_output_recovered` and then either `narrate_turn` or `error`.
- Display sentinel repair still emits `display_sentinel` with `repaired: true` and `repairedProse`.
- `latency` still emits before `done`.
- `done` remains the terminal stream event.
- Payload field names and meanings remain compatible with the current V2 page.

## Implementation notes

The first slice should be a contract refactor, not a sequencing refactor.

Keep the current `runNarrator` loop in `app/play/v2/page.tsx`. It may switch from hand-parsing `Record<string, unknown>` to calling the protocol parser, but it should still own the same loop, roll modal wait, state setters, and diagnostics writes.

Keep Anthropic streaming, repair logic, roll-gate enforcement, and text buffering in `app/api/sf2/narrator/route.ts`. The route may import event types or event builders, but this ticket should not move the streaming state machine.

The parser should be defensive enough for the browser stream:

- Invalid JSON is still ignored by the page-level stream loop, matching current behavior.
- Unknown event types should not crash the client. Prefer returning an `unknown` / `null` parse result that the caller can ignore, or normalize to a typed `error` only if that does not change current behavior.
- Optional fields should keep current defaults at the page consumption site unless moving the exact same defaults into the protocol parser is clearer.
- If defaults move into the parser, add a focused deterministic assertion/snapshot for representative malformed events, or document the defaults next to the parser in code. Do not leave default behavior implicit.

## Suggested implementation steps

1. Add the shared event types and import any needed SF2 types.
2. Add a parser / normalizer for decoded JSON values. Keep raw JSON parsing in the page stream loop unless moving it keeps invalid-line behavior identical.
3. Replace the route-local `Sf2NarratorStreamEvent` type with the shared type.
4. Optionally add small route-side builders such as `narratorTextEvent(content)` or `narratorLatencyEvent(latency)`. Do not introduce ceremony if direct typed object literals stay clearer.
5. Update `app/play/v2/page.tsx` to switch on the shared event union instead of untyped `Record<string, unknown>`.
6. Keep page-local UI defaults where they are unless the parser can centralize them without behavior drift.

## Non-goals

- Do not extract the `runNarrator` loop in this ticket.
- Do not move roll modal waiting or roll-record construction.
- Do not change NDJSON to browser `EventSource`, SSE, WebSocket, or a different wire format.
- Do not change Anthropic tool choice, roll-gate enforcement, commit repair, or display sentinel behavior.
- Do not change diagnostics aggregation or session summary semantics.

## Acceptance criteria

- [ ] `Sf2NarratorStreamEvent` is no longer duplicated as a route-local-only type.
- [ ] The Narrator route imports the shared event type and/or builder helpers.
- [ ] The V2 play page consumes narrator stream events through the shared parser / normalizer instead of relying only on ad hoc `Record<string, unknown>` parsing.
- [ ] All current event variants are represented in the shared protocol Module.
- [ ] No event names are changed.
- [ ] No payload fields used by `app/play/v2/page.tsx` are removed or renamed.
- [ ] Current client defaults for missing/malformed stream fields are either preserved at the page call site or explicitly documented/tested in the parser.
- [ ] Streaming text timing, roll pause behavior, `narrate_turn` commit behavior, and diagnostics meanings are unchanged.
- [ ] Unknown or malformed stream lines remain non-fatal.
- [ ] Existing SF2 replay fixtures pass.
- [ ] `npm run build` passes.

## Verification

Run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

Manual smoke is useful but not required for this AFK contract slice. If the agent can run it cheaply, check:

- start a new SF2 game
- verify text streams into the narrative panel
- trigger or choose a roll-tagged action
- verify the roll prompt pauses and resumes correctly
- verify the debug panel still receives token usage, latency, working set, scene bundle, and sentinel events

## Blocked by

None - can start immediately.

## Comments

This is the AFK first slice of the SF2 Turn Runtime shaping. It improves the Interface between route and client while intentionally leaving the client narrator loop inline.
