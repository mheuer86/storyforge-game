# 04 — Lazy-load DiagnosticsPanel

## What to build

`DiagnosticsPanel` lives at `play-shell.tsx:2000-2125` — ~150 lines of JSX, JSON pretty-printers, and copy/download buttons. It only renders when `activePanel === 'diagnostics'`, so it should not be in the initial bundle.

1. Extract `DiagnosticsPanel` to its own file: `components/sf2/diagnostics-panel.tsx`. Take its helpers (`MiniStat`, `UtilityButton`, `StatusLine` if only used here, `KeyValue`, `EmptyLine`, `UsageLine`) along with it.
2. Replace the direct import in `play-shell.tsx` with `next/dynamic(() => import('./diagnostics-panel'), { ssr: false })`.
3. After #02 lands, `DiagnosticsPanel` reads from the debug ring-buffer store directly instead of receiving `debug` as a prop — fewer cross-cutting props, smaller dynamic boundary.

## Acceptance criteria

- [ ] `DiagnosticsPanel` and its helpers live in `components/sf2/diagnostics-panel.tsx`.
- [ ] `play-shell.tsx` imports it lazily via `next/dynamic`.
- [ ] Initial JS bundle for `/play/v2` shrinks by the diagnostics panel's weight (verify with `next build` output diff).
- [ ] Diagnostics panel still opens and renders identically (visual regression check).
- [ ] No SSR — `ssr: false` set.
- [ ] Loading fallback is acceptable (a brief blank or a small spinner inside the dialog/drawer body).

## Blocked by

#02 — the panel's data source changes shape there. Doing #04 first would mean rewriting the prop wiring twice.
