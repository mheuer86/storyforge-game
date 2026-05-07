# 05 — Demote export-only state slots to refs

## What to build

Five `useState` slots on `PlayV2Page` are written every turn but read only inside event handlers or inside `DiagnosticsPanel` (which after #04 is dynamically loaded). Each write currently re-renders `Sf2PlayShell`.

Convert these to `useRef` (or fold into the debug store from #02 if it makes sense):

- `replayFrames` — `page.tsx:265`. Written each turn, read only by `onDownloadReplayFixture` / `onCopyReplayFixture`.
- `lastNarratorUsage`, `lastArchivistUsage` — `page.tsx:266-267`. Written each turn, read only by `DiagnosticsPanel`.
- `exportCopyStatus` — `page.tsx:274`. Toast-style flash; if the diagnostics panel still wants to render it, source from the debug store or move to local state on the diagnostics panel itself.
- `generationStartTime` — `page.tsx:272`. Read only by the timer effect at `page.tsx:437`. The effect needs to start/stop on transitions, but the *value* can come from a ref; trigger the effect via `isGeneratingChapter` only.

## Acceptance criteria

- [ ] All five slots are no longer `useState` on `PlayV2Page`.
- [ ] Diagnostics still shows narrator/archivist token usage (post-#04).
- [ ] Replay fixture and session log downloads still produce identical output.
- [ ] `exportCopyStatus` flash still appears when copy buttons are clicked (or is intentionally relocated; document the choice in the PR).
- [ ] Streaming a turn no longer re-renders `Sf2PlayShell` solely because of these writes (verify with profiler).

## Blocked by

None — can start immediately. (Stacks well with #02 / #04 but doesn't depend on them.)
