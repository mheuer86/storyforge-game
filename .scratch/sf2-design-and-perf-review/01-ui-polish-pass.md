# 01 — UI polish pass: radius, transitions, text wrapping

## What to build

A single PR bundling the small visual fixes surfaced by the design review. All edits live in `components/sf2/play-shell.tsx` and `app/globals.css`. No structural changes.

### Concentric border radius

The outer-vs-inner radius math is wrong on five surfaces. Fix so inner ≈ outer − padding.

- `play-shell.tsx:1751` close-chapter banner — outer `rounded-lg` + inner button at `:1764` also `rounded-lg`. Drop inner button to `rounded-md`.
- `play-shell.tsx:1913` inspiration prompt — outer `rounded-lg`, inner buttons at `:1924` and `:1931` `rounded-lg`. Promote outer to `rounded-xl`, keep inner at `rounded-lg`.
- `play-shell.tsx:506` top header bar (outer `rounded-xl`, `px-3`) → drop the menu button at `:539` to `rounded-md`.
- `play-shell.tsx:1967` command input bar (outer `rounded-xl`, `px-3 py-2.5`) → drop the send button at `:1991` to `rounded-md`.
- `play-shell.tsx:566` `MobilePanelButton` lives inside the same `rounded-xl` header → `rounded-md`.

### `transition: all`

`globals.css:295-296` `.action-glow` uses `transition: all 0.2s ease;`. Only `box-shadow` animates on hover. Replace with `transition: box-shadow 0.2s ease;`.

### Text wrapping

- `play-shell.tsx:1267` opening narrative paragraph — add `[text-wrap:pretty]`.
- `play-shell.tsx:1613` roll-card title block — add `[text-wrap:balance]`.

## Acceptance criteria

- [ ] Five border-radius mismatches fixed; nested elements visibly step down rather than match.
- [ ] `.action-glow` transition is property-specific.
- [ ] Opening narrative paragraph and roll-card titles use `text-wrap: pretty` / `balance`.
- [ ] No regressions to existing genre theming.

## Blocked by

None — can start immediately.
