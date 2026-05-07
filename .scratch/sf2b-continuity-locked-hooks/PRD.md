# PRD: SF2B Hook + Tension Score Iteration

Status: needs-triage

## Context

This backlog captures the next SF2B iteration after evaluating:

- the first SF2B Chapter 1 playthrough, which improved dramatically over rigid SF2 pacing but still had narrator/state contract gaps
- the follow-up Chapter 2 export, which produced one of the strongest SF2 chapters so far but appears to have opened from a different SF2 campaign substrate rather than the SF2B Chapter 1 continuity

The surprising product lesson is important: SF2 is not inherently a bad narrator. When the chapter frame gives it social pressure, withheld information, faction leverage, and a sharp objective, SF2 can produce strong play. The failure is that SF2/SF2B can still trade away campaign continuity while authoring a locally strong chapter.

The deeper lesson is that the hook is only the opener. SF2's better chapters work because the structure maintains a chapter tension score: multiple pressure lines with different dramatic jobs, advancing in relation to each other instead of collapsing into a single task queue.

## Product Bet

The next iteration should combine:

- SF2B's looser, hook-driven Narrator shape
- SF2's stronger Chapter Author ingredients when they create good local drama: active pressure faces, withheld facts, social leverage, faction alternatives, and a multi-line tension score
- a hard continuity lock that prevents the Author from replacing campaign nouns, unresolved pressures, or closing geometry
- objective-derived close/reframe behavior instead of relying on a chapter upper bound

The result should be a Chapter 2 that is as lively as the strong SF2 checkpoint chapter, but unmistakably continuous with the SF2B Chapter 1 that ended with Calla Voss, Sable Notch, Redline/Carrow, the sealed cargo, and the unresolved tail/cutter pressure.

## Goals

- Preserve exact cross-chapter canon for names, locations, route facts, cargo facts, unresolved contacts, and open obligations.
- Let the Author create a fresh, social, charged Chapter 2 hook and a tension score without replacing those facts.
- Recover the best ingredients from the strong SF2 Chapter 2 frame: pressure face, withheld facts, social leverage, faction alternatives, and meaningful objective.
- Make each chapter carry 3-4 active tension points with distinct roles: foreground objective, relational/social pressure, shadow/faction pressure, and object/cargo/system pressure where appropriate.
- Replace "play until max turns" with code-derived objective resolution and reframe/close pressure.
- Keep the Narrator free enough to produce good prose while code owns roll intent, hard state, repeated-beat detection, and thread-resolution validity.
- Produce a clean playtest gate that tells us whether this hybrid shape is worth promoting.

## Non-Goals

- No rewrite of current SF2 in place.
- No migration of normal SF2 campaigns into SF2B.
- No broad UI redesign.
- No attempt to make subjective prose quality fully automatic.
- No support for every genre before the Forty Thousand continuity path proves the shape.

## Evaluation Gate

The iteration is successful only if a new playthrough demonstrates all of the following:

1. Chapter 2 exports as SF2B, with the same SF2B campaign identity and experiment mode preserved.
2. Chapter 2 opens from the exact Chapter 1 continuity: Calla Voss, Sable Notch, Redline/Carrow, cargo opacity, and the unresolved tail/cutter pressure unless explicitly resolved.
3. The Chapter Author creates a fresh dramatic situation with a live social or faction surface, rather than continuing passive transit procedure.
4. The Author emits a usable tension score, and play visibly draws on at least two pressure lines without exposing the score as a checklist.
5. The chapter closes or reframes when its foreground objective is resolved, failed, or displaced by a new dominant tension; it does not keep running into an avoidable late complication because the upper bound has not been reached.
6. The result is locally dramatic like the strong SF2 Chapter 2 while remaining campaign-coherent like SF2B must be.

## Tickets

1. [SF2B Mode Continuity and Export Identity](issues/01-sf2b-mode-continuity-and-export-identity.md)
2. [Chapter Author Uses a Canon Continuity Lock](issues/02-chapter-author-uses-a-canon-continuity-lock.md)
3. [SF2B Author Emits a Hook + Chapter Tension Score](issues/03-sf2b-author-adopts-the-strong-sf2-v1-hook-ingredients.md)
4. [Objective-Resolved Close and Reframe Gate](issues/04-objective-resolved-close-and-reframe-gate.md)
5. [Thread Resolution and Carry-Forward Contracts](issues/05-thread-resolution-and-carry-forward-contracts.md)
6. [Player Skill Tags Bind Roll Requests Deterministically](issues/06-player-skill-tags-bind-roll-requests-deterministically.md)
7. [Repeated-Beat Advisory Detects Stagnant Predicates Only](issues/07-repeated-beat-advisory-detects-stagnant-predicates-only.md)
8. [Continuity-Locked Chapter 2 Evaluation Gate](issues/08-continuity-locked-chapter-2-evaluation-gate.md)

## Suggested Order

Start with SF2B mode identity, because the Chapter 2 export suggests the experiment path can be lost. Then build the continuity lock and update the Author to emit the hook plus tension score. Close/reframe behavior and thread-resolution contracts can proceed in parallel after the lock exists. Roll binding and repeated-beat calibration are independent reliability slices. Finish with a playtest report that compares the new Chapter 2 against both the disconnected strong SF2 chapter and the original SF2B Chapter 1.

## Notes

The core lesson is not "make SF2B looser." The next shape is stricter about canon, more deliberate about tension structure, and looser about scene writing. The Author may escalate, reinterpret, and relocate, but it must bridge from established truth instead of swapping the campaign underneath the player.
