# 08 — Roll card: restore v1 affordances

## What to build

The sf2 roll card (`RollCardView` + `RollValueBox` in `play-shell.tsx:1583-1681`) flattens too much. It treats DC and the rolled die as visually equal, hides the two-die mechanic of advantage/disadvantage behind a `17/4 +2` detail string, and erases the prior roll when inspiration is spent. v1 (`components/game/roll-badge.tsx`) handled all of these well; this ticket migrates v1's affordances onto sf2's inline + `proseOffset`-anchored card. **Do not bring back the modal** — sf2's inline placement is the right call.

### In scope (mechanics that exist in sf2 today)

1. **Hierarchy: die over DC.** Right now `RollCardView` renders DC and Roll as two equal `h-16 w-16` boxes connected by "vs". Break the symmetry: DC becomes a smaller threshold chip (e.g. small uppercase label `DC 14` with no box, or a thin outlined pill), and the rolled die becomes the focal element — bigger, bolder numeral, weightier outline. The rolled value is the protagonist; DC is the threshold it's measured against.

2. **Two-die display for advantage / disadvantage.** When `pendingCheck?.modifierType` is `'advantage'` or `'disadvantage'`, or when `result.rawRolls?.length === 2`, render both dice side-by-side. Highlight the kept die (the one matching `result.d20`) in the resolved tone. Dim the discarded die and apply `line-through`. Mirror the v1 treatment at `roll-badge.tsx:171-185`. During the rolling animation, both faces should tick (the existing `display` / `display2` already do this — surface them in the layout).

3. **Crit / fumble glow on resolution.** Today `shadow-[0_0_22px_-10px_currentColor]` only fires while `rolling` is true (`rollValueBoxClassName`). On crit and fumble, keep a resolved-state glow so the moment lands. Suggested: `tone === 'critical'` → warning-tinted halo on the value box; `tone === 'fumble'` → severe-tinted halo. Match v1's `dice-crit-card` weight at `globals.css:434-439`.

4. **Inspiration reroll preserves the original.** When the player spends inspiration, render the prior failed roll dimmed (`opacity-50`) with `line-through` on the result label, stacked above the new roll. v1 had this as the `rollData.isOriginal` branch at `roll-badge.tsx:98-110`. The narrative payoff — "I gambled and recovered" — depends on seeing both rolls.

### Out of scope (deferred until features exist)

- **Contested rolls.** Not present in sf2's narrator tool schema or types. File a follow-up ticket if/when contested rolls ship.
- **Damage / healing rolls.** Not present in sf2 — every roll is a d20 check. File a follow-up ticket if/when damage rolls ship.

### Constraints

- Keep `proseOffset` anchoring. The card stays inline in the narrative stream; no modal.
- Keep the `prefers-reduced-motion: reduce` short-circuit at `play-shell.tsx:1881-1885`.
- Drive color via genre tokens (`success`, `warning`, `severe`, `primary`). Do not hardcode `text-emerald-400` / `text-red-500` like v1 — sf2's tone system respects per-genre theming.
- `RollValueBox` is reused by `HistoryRollCard`. New layout must look right both during play and in committed history.

## Acceptance criteria

- [ ] DC and rolled-die are visually unequal in resolved state — die clearly the focal point.
- [ ] Advantage rolls render both dice; the kept die is highlighted in the resolved tone, the discarded die is dimmed and struck-through.
- [ ] Disadvantage rolls render both dice with the same treatment.
- [ ] Crit and fumble resolved states have a glow distinct from neutral success / failure.
- [ ] Spending inspiration preserves the prior roll above the new one, dimmed with strikethrough on the result label.
- [ ] Reduced-motion path still skips the rolling animation.
- [ ] All colors come from semantic tokens (no `emerald-400` / `red-500` literals).
- [ ] `HistoryRollCard` (committed past rolls in the narrative log) uses the same hierarchy.
- [ ] Card remains anchored at `proseOffset`; no modal.

## Blocked by

None — can start immediately. Stacks well after #07 (which isolates dice animation state) but doesn't depend on it.
