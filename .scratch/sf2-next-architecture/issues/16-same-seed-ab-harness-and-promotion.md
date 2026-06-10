# Same-Seed A/B Harness and the Promotion Gate

Status: blocked-by-09
Labels: blocked
Type: AFK
Area: SF2 / evaluation / promotion

## Parent

`.scratch/sf2-next-architecture/PRD.md`
Folds in: `.scratch/sf2-prose-first-narrator/issues/07-retire-multi-role-pipeline.md` (cleanup half) and `.scratch/sf2-kill-arc-author/` phase 2 (executes here)

## What to build

The promotion test is same-seed A/B (prompt: Validation and Evaluation Requirements; Exhibit B is the precedent). Build the harness, run it, and gate promotion of SF3 to `/play` on the results.

**Harness:**

- Scripted runner (extend the prose-first terminal runner from `.scratch/sf2-prose-first-narrator/issues/06`) that plays a seed to chapter 3 minimum on both candidate (SF3 prototype path) and incumbent (current SF2 `/play`), with a scripted-or-model player at fixed temperature for reproducibility.
- Seeds: ≥ 3 across ≥ 3 genres, preferring cross-architecture history: "The Tithe" (grimdark), "Forty Thousand" (space-opera), one prototype brief (Covenant/fantasy or Cardinal). Each seed needs both an SF2 hook config and an SF3 brief expressing the same scenario — document the pairing.
- Scoring: reliability sensors (existing session summary) + narrative sensors (issue 15 analyzer reports) + blind side-by-side prose preference (export paired chapter excerpts with architecture labels stripped, for human judgment).
- One report per seed-pair; one rollup with the PRD kill criteria evaluated: free-lunch rate > 15%, parking > 6 turns past unblocked candidacy, recovery ≥ 10%, texture-survival median < 3/5, cost > $4/chapter.

**Promotion gate (only after the rollup passes and the user signs off):**

- Route `/play` to SF3 behind a reversible flag; SF2 becomes `/play/sf2` (pattern precedent: `/play/v1`).
- Cleanup slice, separately revertable: execute `.scratch/sf2-kill-arc-author/` phase 2 (delete the arc-author endpoint/lib from the now-legacy path per that plan's tickets 06–07) and retire the multi-role pipeline per prose-first ticket 07.
- All named regression fixtures from the PRD's Testing section must be green before the flag flips.

## Acceptance criteria

- [ ] Runner plays both architectures to chapter 3 on a given seed without manual intervention; exports sessions + sensor reports.
- [ ] Three seed pairings documented and runnable; blind prose-preference bundles generated with labels stripped.
- [ ] Rollup report evaluates every PRD kill criterion with pass/fail.
- [ ] Promotion flag is reversible; `/play/sf2` preserves incumbent access; no IndexedDB cross-engine migration is attempted (engine-versioned campaigns per the PRD).
- [ ] Arc Author phase 2 deletion and pipeline retirement land as separate commits after the flag, not before.
- [ ] A/B results recorded in this ticket's Comments before any promotion decision is requested from the user.

## Blocked by

Issues 09 (chapter 2+ must work), 15 (sensor reports), and green fixtures from 02–12. Promotion itself additionally requires explicit user sign-off.
