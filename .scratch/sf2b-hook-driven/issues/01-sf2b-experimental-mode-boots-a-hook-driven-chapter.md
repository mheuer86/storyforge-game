# SF2B Experimental Mode Boots a Hook-Driven Chapter

Status: needs-triage
Type: AFK
Area: SF2B / experiment shell

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Create a reversible SF2B experiment mode that can start a Space Opera / Human Driftrunner Chapter 1 using a Forty Thousand-style hook without rewriting current V1 or SF2 in place.

The slice should establish the smallest runnable vertical path for the experiment: entry point, new-game setup, save/session identity, server pipeline selection, and enough diagnostics to prove the SF2B path is active. The exact product surface can be a query param, internal mode, or temporary experiment route, as long as the mode is explicit and easy to remove or promote later.

## Acceptance criteria

- [ ] SF2B can be launched intentionally from local development without changing normal V1 `/play` behavior.
- [ ] Current SF2 `/play/v2` behavior remains available as the baseline unless SF2B is explicitly selected.
- [ ] A new Space Opera / Human Driftrunner campaign boots through the SF2B path with a Forty Thousand-style Chapter 1 hook.
- [ ] SF2B sessions/saves are identifiable as experimental and are not silently migrated into normal SF2 saves.
- [ ] The implementation reuses existing UI, persistence, and SF2 primitives where practical, but keeps the Author/Narrator/Archivist pipeline selection isolated.
- [ ] A smoke check or replay artifact demonstrates that the SF2B pipeline is active and reversible.

## Blocked by

None - can start immediately.

## Out of scope

- Rewriting current SF2 behavior in place.
- Supporting every genre, playbook, or existing save.
- Polishing the UI beyond what is needed to run and evaluate the experiment.

## Comments

This is a spike shell, not a product commitment. Its job is to protect the baseline while making the new architecture playable enough to judge.
