# Feed Start Brief To Narrator Chapter 1

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / Narrator / chapter start

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Use the first-session handover artifact as the Narrator's Chapter 1 opening context behind a reversible gate.

When the gate is enabled and a valid start brief exists, Chapter 1 should open by sending the brief to the Narrator as private opening context instead of waiting for Arc Author and Chapter Author to invent the opening harness. If the brief path fails, the client should fall back to the existing Arc Author / Chapter Author flow.

Render the start brief into a Current Story Surface plus compact sections for owed questions, embodied pressure, do-not-restage constraints, and opening scope guidance. The full handover may also be available as a cached/reference document; the key is that the live prompt starts with the priority Story Surface instead of forcing the model to infer priorities from a long document every turn.

## Acceptance criteria

- [ ] A single internal gate controls whether Chapter 1 can use brief-driven opening.
- [ ] Narrator initial context includes the first-session brief when the gate is enabled and the artifact is valid.
- [ ] Narrator initial context starts from a Current Story Surface rendered from the brief, not raw JSON alone.
- [ ] The full start brief can remain available as reference context or diagnostics when useful; priority guidance still comes from the Story Surface and compact obligations.
- [ ] Owed questions from setup are included as private obligations with fake-progress warnings.
- [ ] Embodied pressure from the brief reaches Narrator context as who-pays / what-hurts / visible-image guidance.
- [ ] The initial scope guidance tells Narrator whether the opening should be close play, sequence movement, or relationship setup without exposing internal labels to the player.
- [ ] The prompt frames the brief as GM prep and opening context, not as player-facing prose to quote.
- [ ] The Chapter 1 brief path bypasses Arc Author and Chapter Author only when the gate is enabled.
- [ ] Failure or missing brief falls back to the current Author path without blocking campaign start.
- [ ] Diagnostics record which path opened the chapter and how much latency was avoided or incurred.
- [ ] Replay/helper coverage proves the Narrator initial context includes the brief and that Author fallback still works.

## Blocked by

- 01-campaign-setup-produces-start-brief.md
