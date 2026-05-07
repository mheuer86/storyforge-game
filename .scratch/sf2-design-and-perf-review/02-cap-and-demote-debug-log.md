# 02 — Cap and demote debug log

## What to build

`page.tsx` calls `setDebug((d) => [...d, entry])` 30+ times across the streaming loop (search the file for `setDebug`). Two problems:

1. The log grows unbounded — long sessions accumulate thousands of entries.
2. Every push re-renders `Sf2PlayShell`, even though the only consumer (`DiagnosticsPanel`) is conditionally mounted.

Replace the `useState` with a ref-backed store: a bounded ring buffer (last ~200 entries) that exposes `useSyncExternalStore` for the diagnostics panel to subscribe to. Streaming-time pushes no longer trigger parent renders.

The debug entries currently flow through `Sf2PlayShellProps.debug`. Replace that prop with a store handle (or remove the prop entirely if the panel imports the store directly).

## Acceptance criteria

- [ ] Debug log is capped — never exceeds the configured limit (suggest 200).
- [ ] Pushing a debug entry does not re-render `Sf2PlayShell` or any panel other than `DiagnosticsPanel` (verify with React DevTools profiler or a `console.count` in the shell).
- [ ] `DiagnosticsPanel` shows the same entries it does today, in the same order.
- [ ] Session log download (`onDownloadSessionLog`) and copy (`onCopySessionLog`) still emit the bounded log.
- [ ] No new dependencies.

## Blocked by

None — can start immediately.
