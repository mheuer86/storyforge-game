# sf2 design + perf review

Issues from a two-pass review of `app/play/v2/page.tsx` and `components/sf2/play-shell.tsx`:

1. UI polish — concentric border radius, `transition: all`, text wrapping
2. Cap and demote the debug log to a ref-backed store
3. Memoize per-panel derived state (filter/sort chains)
4. Lazy-load `DiagnosticsPanel` via `next/dynamic` *(after #2)*
5. Move export-only state slots to refs
6. Long-session render hygiene — `content-visibility` on turn blocks + throttled scroll
7. Isolate dice animation + `startTransition` around post-await setter clusters
8. Roll card — restore v1 affordances (hierarchy, two-die display, crit/fumble glow, inspiration history)

All AFK. Only #4 has a hard blocker (#2 first — its consumer changes shape).
