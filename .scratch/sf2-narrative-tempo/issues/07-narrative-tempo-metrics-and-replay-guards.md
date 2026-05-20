# Narrative Tempo Metrics and Replay Guards

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / diagnostics / replay

## What to build

Add lightweight diagnostics that make tempo monoculture visible in replay exports and fixture runs.

The system should be able to spot long runs of micro-scene play with no material delta, repeated arc-dormancy advisories without a non-micro response, and procedural surfaces repeated across several turns.

## Acceptance criteria

- [ ] Diagnostics can compute consecutive micro-scene turns from chosen or inferred tempo.
- [ ] Diagnostics track turns since time advanced, location changed, named fact/clue surfaced, relationship disposition changed, faction/pressure moved, or scene ended.
- [ ] Replay metadata or diagnostics export includes enough tempo counters to evaluate a playthrough without reading every prose turn manually.
- [ ] A guard flags when more than 8 consecutive micro-scene turns occur without a new fact, relationship delta, faction move, location change, scene end, or time advance.
- [ ] A guard flags when arc-dormancy fires twice without a non-micro chosen tempo in the next 2 turns.
- [ ] A guard flags when the same procedural surface appears in 3 consecutive turns without material change.
- [ ] Replay fixtures cover at least one safe micro sequence, one excessive micro sequence, and one advisory-to-non-micro recovery sequence.

## Blocked by

- [Hidden Tempo Annotation and Diagnostics](04-hidden-tempo-annotation-and-diagnostics.md)
- [Pacing Advisories Recommend Tempo and Required Delta](05-pacing-advisories-recommend-tempo-and-required-delta.md)

## Implementation notes

Built 2026-05-20:

- Added narrative tempo metrics in `lib/sf2/narrative-tempo.ts`.
- Included tempo counters and diagnostic match/mismatch counts in session summaries.
- Extended the replay runner with tempo, pacing, and roll-gate binding assertions.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/narrator/diagnostics.ts`
- `lib/sf2/narrator/replay-metadata.ts`
- `lib/sf2/runtime/turn-pipeline.ts`
- diagnostics export paths in `components/sf2/play-app.tsx`
- replay runner fixture expectations

Keep this observe-mode. Do not block live play.

## Out of scope

- A dashboard UI.
- Hard enforcement.
- Solving Chapter Meaning or Conductor architecture.
