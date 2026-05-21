# Campaign Setup Produces Start Brief

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / setup / GM handover

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Turn the existing setup calibration payload into a first-session GM handover artifact.

After the setup conversation collects player-authored answers, compile the selected genre/origin/playbook/hook plus the answers into a campaign-start artifact with three sections: GM memory, Chapter 1 session brief, and quick reference. This artifact should be stored outside transcript history and should remain usable even when the player skips setup.

The artifact should also include the V3-ready primitives needed for live play: an initial Current Story Surface, question-shaped obligations, embodied pressure, do-not-restage constraints, and lightweight chapter motion targets. Keep the full handover textured enough to be useful as GM prep; the Story Surface is the shorter priority rendering for live Narrator use.

This slice does not need to bypass Author roles yet. It proves the artifact shape and persistence path while preserving the current campaign start flow.

## Acceptance criteria

- [ ] Setup output includes a migration-safe first-session handover artifact separate from transcript turns.
- [ ] The artifact has explicit sections for GM memory, Chapter 1 session brief, and quick reference.
- [ ] The artifact includes an initial Current Story Surface: compact prose that says what this campaign is already about, what the opening must not forget, and what the first scene owes.
- [ ] The full handover remains available as a diagnostics/export/reference artifact; the Story Surface is derived from it rather than replacing it.
- [ ] The artifact includes question-shaped obligations rather than only vibe labels, for example oath/debt/relationship/opening-pressure questions with progress/fake-progress hints.
- [ ] Pressure items name who pays, what hurts, and one visible image, not only abstract clocks or institutions.
- [ ] The artifact includes a do-not-restage list for setup facts and settled premises.
- [ ] The session brief includes lightweight chapter motion targets: first decision promise, candidate major delta, and a rough "chapter job" expressed in prose.
- [ ] GM memory captures campaign-local player/PC guidance derived from setup answers without becoming cross-campaign profiling.
- [ ] GM memory can represent avoid-pattern memory sparsely at first, using only explicit setup evidence, player correction, diagnostics, or review notes.
- [ ] The session brief captures opening conditions, immediate pressure, candidate clocks/tensions, and the first decision promise in player-authored terms.
- [ ] The quick reference captures PC setup, oath/anchor/debt surfaces, key carried facts, and any companion/debt hooks available at start.
- [ ] Skipped setup still produces a minimal deterministic start brief from selected setup and hook.
- [ ] Diagnostics/export can inspect the compiled start brief.
- [ ] A focused replay/helper fixture proves setup answers compile into the artifact and old saves without the artifact normalize safely.

## Blocked by

- `.scratch/sf2-narrative-tempo/issues/08-initial-campaign-setup-narrative-calibration-questions.md`
