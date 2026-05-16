# Chapter Opening Module

Status: implemented
Type: AFK

## Agent readiness

Ready for an implementation agent.

No human shaping decision is open. The phase decision is pinned: the new Module must accept an explicit `phase: 'chapter_1' | 'continuation'` discriminant rather than inferring the branch from state.

## What to build

Extract SF2 chapter-opening state application into a deeper Module.

Today `app/play/v2/page.tsx` applies Author output in two places: Chapter 1 generation and next-chapter opening. The two paths duplicate or nearly duplicate campaign graph hydration, latent question promotion, pressure runtime preparation, opening scene setup, location/time initialization, scene bundle cache clearing, and telemetry payload construction.

Create one Module that applies Author response data to canonical SF2 state for both Chapter 1 and continuation chapters.

Target shape:

- New Module under `lib/sf2/author/` or `lib/sf2/runtime/`, for example `chapter-opening.ts`.
- Public Interface accepts:
  - current `Sf2State`
  - explicit `phase: 'chapter_1' | 'continuation'`
  - Author response fields: `chapter`, `runtimeState`, `scaffolding`, `openingSeed`, `authored`
  - optional `threadTransitions`
- Public Interface returns:
  - next `Sf2State`
  - telemetry payload for `observeActorFirewallWrite(... writeKind: 'chapter_setup' ...)`
  - optional summary for debug logging: title, active thread count, starting NPC count, pressure ladder count, thread transitions, chapter function, pacing target

Do not move the network calls themselves. The page should still call arc-author, chapter-meaning, and author endpoints. This refactor only centralizes the state transition after Author returns.

## Current files to inspect

- `app/play/v2/page.tsx`
- `lib/sf2/author/hydrate.ts`
- `lib/sf2/arc-questions.ts`
- `lib/sf2/pressure/runtime.ts`
- `lib/sf2/game-data.ts`
- `lib/sf2/persistence/normalize.ts`
- fixtures covering chapter opening, continuation, pressure runtime, and persistence normalization

## Required behavior to preserve

The new Module must preserve these details:

- Chapter 1 starts from the unauthored placeholder produced by `createInitialSf2State`.
- Continuation chapters apply `threadTransitions` before Author hydration.
- `applyAuthoredToCampaign` receives the full Author payload and `runtimeState.loadBearingThreadIds`.
- `applyLatentArcQuestionChapterOpen` runs with `runtimeState.arcLink?.promotedLatentQuestionIds ?? []`.
- `chapterPressureRuntime.prepareChapterOpen` receives `priorActiveThreadIds` captured before replacing `state.chapter`.
- `meta.currentChapter`, `meta.currentSceneId`, `chapter.number`, `chapter.title`, `chapter.setup`, `chapter.scaffolding`, `chapter.artifacts.opening`, `chapter.sceneSummaries`, and `chapter.currentSceneId` are updated consistently.
- New opening location is stored in `world.currentLocation` and `campaign.locations`.
- `world.sceneSnapshot` is reset with:
  - scene id `scene_<chapter>_1`
  - opening location
  - `presentNpcIds` filtered to NPC ids that exist in `campaign.npcs`
  - `firstTurnIndex` equal to current `history.turns.length`
- Continuation chapter opening derives `world.currentTimeLabel` / `meta.currentTimeLabel` from `openingSceneSpec.atmosphericCondition` the same way current code does.
- Continuation chapter opening clears `world.sceneBundleCache`.
- Turn index remains monotonic across chapters; do not reset history or turn counters.
- Existing persistence assumptions remain compatible.

## Implementation notes

Suggested Interface:

```ts
applyAuthorChapterOpening(input: {
  state: Sf2State
  phase: 'chapter_1' | 'continuation'
  authorResult: {
    chapter: number
    runtimeState: Sf2State['chapter']['setup']
    scaffolding: Sf2State['chapter']['scaffolding']
    openingSeed: Sf2State['chapter']['artifacts']['opening']
    authored: AuthorChapterSetupV2
    threadTransitions?: Array<{
      id: string
      toStatus: Sf2State['campaign']['threads'][string]['status']
      reason: string
    }>
  }
}): {
  nextState: Sf2State
  telemetry: {
    chapter: number
    title: string
    activeThreadCount: number
    pressureLadderCount: number
  }
  debugSummary: Record<string, unknown>
}
```

The exact names may vary, but the `phase` discriminant should be explicit. Do not rely on the Module guessing Chapter 1 versus continuation solely from `state.meta.currentChapter`; the caller already knows which endpoint flow it just ran, and making that branch explicit prevents accidental drift when loaded/saved state is unusual.

The client page should become a caller:

- build/fetch Author response
- call `applyAuthorChapterOpening`
- push debug events
- set React state
- persist

## Acceptance criteria

- [ ] Chapter 1 and continuation chapter opening both use the same chapter-opening Module.
- [ ] The Module accepts an explicit Chapter 1 vs continuation phase/discriminant.
- [ ] `app/play/v2/page.tsx` no longer duplicates Author-output application logic.
- [ ] Author network calls, chapter-meaning generation, diagnostics store usage, and persistence calls remain in the page.
- [ ] Existing Chapter 1 opening behavior is unchanged.
- [ ] Existing continuation opening behavior is unchanged.
- [ ] Scene bundle cache is still cleared on continuation chapter transition.
- [ ] Current scene id, current location, current time label, and scene snapshot remain synchronized.
- [ ] Existing SF2 replay fixtures pass.
- [ ] Add or extend one focused fixture/assertion for continuation chapter application covering thread transition, pressure preparation with prior active threads, opening location/time reset, and `sceneSnapshot.firstTurnIndex`.

## Verification

Run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, run the focused changed fixture and state why full replay was skipped.

## Blocked by

None - can start immediately.
