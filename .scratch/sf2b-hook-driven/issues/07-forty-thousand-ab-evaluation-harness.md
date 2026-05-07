# Forty Thousand A/B Evaluation Harness

Status: needs-triage
Type: AFK
Area: SF2B / evaluation

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Create a lightweight evaluation harness for comparing V1, current SF2, and SF2B on the same Forty Thousand-style Chapter 1 shape.

The harness should make it easy to collect transcripts, state artifacts, roll outcomes, token/cost telemetry where available, and a human-readable rubric. It does not need to make subjective taste fully automatic; it should make the evidence easy to inspect and hard to hand-wave.

## Acceptance criteria

- [ ] The harness can collect or reference V1, current SF2, and SF2B playthrough artifacts for the same hook family.
- [ ] The evaluation rubric scores prose quality, pacing/turn density, hook uptake, roll consequence, state coherence, Chapter 2 consequence, and structure visibility.
- [ ] The output includes enough state evidence to compare V1 drift, current SF2 drift, and SF2B drift.
- [ ] The output includes a blind-reader-friendly transcript packet with diagnostics removed.
- [ ] The output calls out hard failures such as repeated gate waiting, duplicate entities, stale resolved objectives, impossible roll consequence, and contradictory hard state.
- [ ] The harness can produce one report artifact under `.scratch/` for the SF2B decision ticket.

## Blocked by

- [Chapter Close Produces a Meaning Digest and Chapter 2 Hook](06-chapter-close-produces-a-meaning-digest-and-chapter-2-hook.md)

## Out of scope

- Fully automated literary judgment.
- Benchmarking every genre.
- Replacing SF2 replay fixtures as the reliability harness.

## Comments

The point is evidence. SF2B only matters if it beats V1 where V1 is strong and beats current SF2 where current SF2 is supposed to be strong.
