# Passive Perception Equivalent

Status: implemented
Type: AFK

## What to build

Add a modest SF2 passive perception equivalent: code-owned passive awareness cues that can surface small observable details without requiring an active roll.

This is not a mystery-solving system and not a failed-investigation system. It should only let the game say, "this PC would naturally notice this surface detail," when the state contains an explicit passive awareness cue and the PC's passive Perception meets the cue's DC.

The output should feed the Narrator as dynamic current-scene/current-turn context, not as cached prompt prose. The Narrator then incorporates the noticed detail naturally in prose. If the passive score is too low, the cue is not mentioned at all; never write "you don't notice..."

## Decisions already made

Use this contract for the first implementation slice:

- Score formula: `passivePerception = 10 + WIS modifier + proficiency bonus if the PC is proficient in Perception`.
- Scope: passive Perception only. Do not add passive Investigation, passive Insight, or genre-specific passive lanes in this ticket.
- Cue ownership: only explicit `passiveAwarenessCue` records are eligible. Do not scan arbitrary hidden facts or clues and decide they should be noticed.
- Reveal granularity: surface detail only. The cue may reveal an observable oddity, tell, hazard sign, tail, surveillance trace, or obvious affordance. It must not reveal the hidden explanation, culprit, motive, or solved conclusion.
- Delivery path: dynamic Narrator advisory/context, optionally with replay/invariant metadata. Do not create a clue or durable fact until the Narrator prose actually establishes something and the Archivist extracts it.
- Below-threshold behavior: complete silence. No failure prose, no "missed detail" aside, no red herring.

## Examples

Good passive cue:

- cue: "The Synod clerk's sleeve is damp with disinfectant, but there is no clinic smell in the office."
- passive DC: 13
- effect: if met, Narrator can include the sleeve detail. The player may follow up.

Bad passive cue:

- cue: "The clerk secretly moved the child through the quarantine wing."
- why bad: this is the hidden answer, not a surface detail.

Good surveillance cue:

- cue: "The same station maintenance drone has crossed the corridor three times without servicing anything."
- passive DC: 14
- effect: if met, Narrator can show a possible tail/surveillance surface.

Bad below-threshold prose:

- "You do not notice the drone following you."
- why bad: this leaks hidden cognition.

## Current files to inspect

- `lib/sf2/types.ts`
- `lib/sf2/game-data.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/retrieval/packets/player.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/narrator/messages.ts`
- `lib/sf2/narrator/prompt/role.ts`
- `lib/sf2/author/tools.ts`
- `lib/sf2/author/contract.ts`
- `lib/sf2/author/transform.ts`
- `lib/sf2/author/chapter-opening.ts`
- `lib/sf2/archivist/prompt.ts`
- `lib/sf2/archivist/tools.ts`
- `fixtures/sf2/replay/*clue*`
- `fixtures/sf2/replay/*roll*`

## Suggested module shape

Add a small code-owned module, for example:

- `lib/sf2/passive-awareness/evaluate.ts`
- optional `lib/sf2/passive-awareness/types.ts`

Suggested public helper:

```ts
evaluatePassiveAwareness({
  state,
  sceneId,
  turnIndex,
}): {
  passivePerception: number
  met: Sf2PassiveAwarenessCue[]
  unmet: Array<{ cueId: string; passiveDc: number }>
  advisoryText: string
}
```

The exact names can vary. The important boundary is that passive cue evaluation is deterministic code, not a Narrator judgment.

## Suggested data shape

Add an additive type such as:

```ts
export interface Sf2PassiveAwarenessCue {
  id: Sf2EntityId
  kind:
    | 'environmental_detail'
    | 'hazard_sign'
    | 'surveillance_trace'
    | 'tail_sign'
    | 'npc_tell'
    | 'procedure_affordance'
  passiveDc: number
  surfaceText: string
  followupQuestion?: string
  sceneId?: Sf2EntityId
  locationId?: Sf2EntityId
  npcId?: Sf2EntityId
  threadId?: Sf2EntityId
  source: 'author' | 'runtime' | 'fixture'
}
```

Likely storage:

- Author-created opening/chapter cues belong in `chapter.scaffolding` or a similarly system-only state surface.
- Runtime-created scene cues may live near scene/chapter runtime state if needed.
- Narrator-facing packets should receive only cues that meet passive DC, and only as surface text/follow-up pressure. Do not pass hidden answers.

Use additive optional fields so old saves normalize safely.

## Author integration

Add optional Author output support for passive awareness cues only if it can be done narrowly.

If adding Author schema support:

- cap cues tightly, e.g. 0-3 per chapter/opening
- require `surface_text`, `passive_dc`, and `kind`
- explicitly forbid hidden answers in field descriptions
- transform into system-only state
- validate that `passive_dc` is in a sensible range, e.g. 10-20

Do not make passive cues mandatory. The system must work when no cues exist.

## Narrator integration

Add the met passive cues to dynamic current-turn or scene-bundle context. Suggested wording should be concise and private, e.g.:

```md
### Passive awareness met (surface naturally, never explain the mechanic)
- The same station maintenance drone has crossed the corridor three times without servicing anything.
```

Rules:

- This block is dynamic, not cached role/core text.
- Do not include unmet cues in Narrator context.
- Do not include passive DC or score in player-facing prose.
- Do not instruct the Narrator to create a clue. Let prose + Archivist decide whether it becomes durable state.
- Prevent repeated nagging. Either emit at scene opening/first eligible turn only, or store a small delivered-cue log. The implementation should choose the smallest robust option and document it.

## Refinement notes from code inspection

Current concrete surfaces:

- Player packet creation already computes proficiency bonus in `lib/sf2/retrieval/packets/player.ts`; passive awareness can share the same formula locally or export a tiny shared helper later.
- Narrator dynamic context is the uncached per-turn message built by `lib/sf2/narrator/messages.ts`. Add a passive awareness private block next to `roleAliasBlock`, `rollGateBlock`, `playbookPrefBlock`, and `locationContinuityGuardBlock`.
- `renderPerTurnDelta(...)` in `lib/sf2/retrieval/scene-packet.ts` is already covered by `expected.perTurnDeltaIncludes` / `expected.perTurnDeltaExcludes` in the replay harness.
- `Sf2ChapterRuntime.scaffolding` is the best first storage surface for Author-created passive cues because it is system-only chapter setup state. Add an optional array there rather than creating durable clues.
- `Sf2World` can carry a tiny optional delivered log if needed, but the smaller first choice is `chapter.scaffolding.passiveAwarenessDelivered?: Record<cueId, { sceneId; turnIndex }>` or a similar chapter-scoped map. Keep it optional and normalize-safe.
- `lib/sf2/persistence/normalize.ts` must tolerate missing cue and delivered fields. If no normalize support is added for the nested fields, make the evaluator defensive enough that old saves are still safe.

Recommended implementation details:

- Add `lib/sf2/passive-awareness/evaluate.ts`.
- Export:
  - `computePassivePerception(player)`
  - `evaluatePassiveAwareness({ state, sceneId, turnIndex })`
  - `renderPassiveAwarenessBlock(result)`
- Evaluate only explicit cue records. Do not inspect `campaign.clues`, hidden pressures, revelations, or documents to infer passive details.
- Filter cues to current scene/location when `sceneId` or `locationId` is present; global chapter cues may be eligible if unscoped.
- To prevent spam, suppress cue ids that already exist in the delivered log for the current chapter. The replay path can assert rendering behavior; live marking can happen when building/saving scene bundle state only if this can be done without changing the turn pipeline. If mutation during context build is awkward, start with deterministic per-scene first-turn gating and document that as the anti-spam strategy.
- Keep below-threshold cues entirely out of Narrator context. Never render DCs or passive scores in the player-facing prose path.
- Author schema integration is optional for this slice. A fixture-created cue pipeline is acceptable if it proves type/storage/evaluator/Narrator-context behavior.

Replay harness surfaces:

- Use `expected.perTurnDeltaIncludes` to prove an over-threshold cue is present in dynamic context.
- Use `expected.perTurnDeltaExcludes` to prove under-threshold cue text is absent.
- Use existing clue expectations (`expected.cluesInclude`) and absence checks where available, or extend the runner with a small `cluesAbsent` expectation if needed, to prove passive cues do not become durable clues automatically.
- Fixtures should set `input.narrator.prose` and `input.archivist.patch` to minimal no-op values so the deterministic pre/post packet assertions can run without a model call.

## Required behavior to preserve

- Active investigation/search actions still use the existing roll-gate path.
- NPC information gating remains disposition/social-roll owned; passive perception does not make NPCs volunteer critical information.
- Existing hidden-cognition prompt defenses stay in place.
- No failed-investigation red herring behavior is added.
- No witness marks.
- No roll-drought or pacing-pressure restoration.
- Existing replay fixtures keep passing.
- No live model calls in tests.

## Non-goals

- No passive Investigation.
- No passive Insight as motive-reading.
- No genre-specific passive lanes yet.
- No automatic clue creation without Narrator prose.
- No hidden answer reveal.
- No below-threshold failure narration.
- No prompt-only implementation.

## Acceptance criteria

- [x] A passive awareness evaluator exists and computes passive Perception deterministically from player stats/proficiencies.
- [x] Passive awareness cues have an explicit additive state/type shape.
- [x] Persistence normalization tolerates missing passive cue fields.
- [x] Met cues are added to dynamic Narrator context as surface detail advisories.
- [x] Unmet cues are not shown to the Narrator.
- [x] The implementation prevents repeated cue spam within the same scene.
- [x] Author integration is either implemented narrowly or explicitly deferred with fixture-created/runtime-created cues still proving the pipeline.
- [x] At least one focused fixture proves an over-threshold cue appears in Narrator context/advisory.
- [x] At least one focused fixture proves an under-threshold cue does not appear.
- [x] At least one focused fixture proves the cue does not create a durable clue unless prose/Archivist establishes it.
- [x] Existing SF2 replay fixtures pass.
- [x] `npm run build` passes.

## Verification

Run focused fixtures first. Suggested names:

```bash
npm run sf2:replay -- fixtures/sf2/replay/passive-awareness-over-threshold.json
npm run sf2:replay -- fixtures/sf2/replay/passive-awareness-under-threshold.json
npm run sf2:replay -- fixtures/sf2/replay/passive-awareness-no-auto-clue.json
```

Then run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, state which focused fixtures ran and why the full suite was skipped.

## Blocked by

None - can start immediately.

## Notes for agent

Keep this intentionally boring. The first successful version is a small deterministic notice channel for surface details. It should make scenes feel more character-aware without solving investigations for the player.

## Implementation note

Implemented on 2026-05-16 with `lib/sf2/passive-awareness/evaluate.ts`, additive passive awareness state, dynamic Narrator surface-detail advisories, delivered-cue tracking, and focused replay fixtures:

- `fixtures/sf2/replay/passive-awareness-over-threshold.json`
- `fixtures/sf2/replay/passive-awareness-under-threshold.json`
- `fixtures/sf2/replay/passive-awareness-no-auto-clue.json`
