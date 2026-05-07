# 03 — Memoize per-panel derived state

## What to build

Several panels build maps, sets, and chained filter/sort pipelines inside the component body. They re-run on every parent render — including every prose token during streaming.

Add `useMemo` with the narrowest viable dependency at each site:

- `play-shell.tsx:870-905` `LocationsPanel` — `locationMap` build + two `.filter` + `.sort`. Depend on `state.campaign.locations`, `state.world.currentLocation`, `state.world.sceneSnapshot.location`, `state.meta.currentChapter`.
- `play-shell.tsx:1100-1123` `IntelPanel` — `surfacedThreadIds` set + thread filter chain + floating-clue filter. Combine the four chained `.filter` calls into a single pass while you're there.
- `play-shell.tsx:1131-1134` per-thread clue filter inside `threads.map` — extract to a precomputed `Map<threadId, Clue[]>` derived once per `state.campaign.clues` + `currentChapter`.
- `play-shell.tsx:1354` `NarrativeWithRolls` — the `[...rollCards].sort(...)` runs on every render; memoize against `rollCards`.
- `play-shell.tsx:1257` `TurnStream` — lift `state.history.turns.filter(t => t.chapter === currentChapter)` into a `useMemo` in the parent (`Sf2PlayShell`) and pass already-filtered turns down.

## Acceptance criteria

- [ ] All five sites use `useMemo`.
- [ ] Dependencies are scoped to the slices actually read (no `state` in dep arrays).
- [ ] `IntelPanel` does a single pass over threads instead of four chained filters.
- [ ] Per-thread clue lookup in `IntelPanel` is O(1) via the precomputed map, not O(clues × threads).
- [ ] Streaming a long prose chunk no longer triggers re-computation of these panels (verify with React DevTools profiler).

## Blocked by

None — can start immediately.
