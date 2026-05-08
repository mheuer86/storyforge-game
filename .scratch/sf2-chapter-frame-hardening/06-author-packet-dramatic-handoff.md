# Author packet dramatic handoff before operational continuity

Status: ready-for-agent
Category: refactor (author payload + prompt)
**Type:** AFK
**Source:** chapter-author packet review 2026-05-08

## What to build

The current Ch2+ Author packet over-weights operational continuity before the Author has a dramatic center.

The failed run did not invent "beacon window countdown and corridor geometry" from nowhere. The packet repeated that surface through transition seed, active threads, pressure engines, closing geometry, last visible prose, and the seed hook. The validator then rejected the Author for restaging the same procedural material the packet made salient.

The fix is not another ban. Add a compact **dramatic handoff** section near the top of the Author situation, before active threads, closing geometry, pressure engines, and the AuthorInputSeed.

This handoff should translate Chapter Meaning plus carried state into the playable consequence of the prior chapter:

```ts
type AuthorDramaticHandoff = {
  prior_meaning: string
  leverage_shift: string
  pressure_owner: string
  who_pays_now: string
  relationship_or_reputation_cost: string
  new_human_move: string
  live_constraint?: string
  forbidden_restages: string[]
}
```

Example:

```text
Prior meaning: The crew bought freedom from Ossuary by accepting Vantabloc's route terms.
Leverage shift: Vantabloc no longer needs the berth hold; it can pressure the crew through Doss and the buyer.
Pressure owner: Vantabloc Freight, currently wearing Sable Orin's face.
Who pays now: Doss, if the PC makes the route politically expensive.
Relationship/reputation cost: Independent crews may start treating the PC as a Vantabloc runner.
New human move: Orin quietly asks Doss to confirm the buyer before the first toll voice comes on comms.
Live constraint: Beacon window remains a background constraint, not the opening choice.
Forbidden restages: berth hold clearing, cargo loading, undocking clearance.
```

## Current failure mode

`lib/sf2/author/payload.ts` derives Ch2 seed fields from the highest-tension spine thread:

- `objective` from `resolutionCriteria`
- `crucible` from `failureMode`
- `firstEpisode` from the transition seed's unresolved question

That is reasonable when the spine thread is dramatic. It fails when the top thread is operational, such as "enter the corridor before the beacon window collapses." The operational criterion becomes the chapter objective, then the opening scene tries to play it.

`lib/sf2/author/prompt.ts` also renders closing geometry, last scene summary, last visible prose, active threads, and pressure engine symptoms in the main situation packet. Those facts are useful, but they should not outrank the human consequence handoff.

## Desired behavior

For Ch2+ Author calls:

1. Render `Dramatic handoff` before active carry-forward threads, pressure engines, closing geometry, and seed hook.
2. Derive it from `priorChapterMeaning.transitionSeed`, chapter meaning, human stakes, active pressure engines, and carried faction/NPC state.
3. Convert operational residue into one of three roles:
   - `discard`: do not render except in forbidden restages.
   - `background_constraint`: render once as a fact, not as a choice.
   - `leverage`: render only through a named owner using it against someone.
4. Stop deriving `AuthorInputSeed.objective` and `AuthorInputSeed.crucible` directly from raw thread `resolution_criteria` / `failure_mode` when those fields are operational. If the candidate contains route/window/clearance/timer/gate/corridor style language, derive a dramatic version from the handoff instead.
5. Remove or sharply compress last visible prose from the Author situation. Prefer state facts over repeated scenic language.
6. Keep closing geometry as continuity support, not as the chapter driver.

## Acceptance criteria

- [ ] Ch2+ Author situation contains a clearly labeled `Dramatic handoff` section before procedural continuity sections.
- [ ] Handoff names a pressure owner, who pays now, and a relationship/reputation/faction cost.
- [ ] Handoff includes at most one live procedural constraint, explicitly marked as background or leverage.
- [ ] `AuthorInputSeed.objective` / `crucible` are no longer raw operational thread criteria when those criteria are procedural.
- [ ] Closing geometry remains available but is rendered after the handoff and framed as continuity support.
- [ ] Last visible prose is removed from the Author packet or trimmed to a short state-fact summary.
- [ ] Fixture: a Ch2 packet with beacon window / corridor geometry produces a handoff where the beacon is background constraint and Vantabloc/Doss carry the pressure.
- [ ] Replay fixtures pass.

## Blocked by

None. Coordinates with #01 and #02, because the handoff should feed the restored `crucible`, `active_pressure`, `central_tension`, and `objective` fields.

## Comments

> Chapter Meaning already captures much of the raw material. This ticket is not asking for a new model role. It asks the Author packet to privilege the dramatic interpretation of Chapter Meaning over operational continuity when constructing the next Author call.

> The goal is to stop making Author choose between obeying the packet and satisfying the validator. The packet should make the desired chapter frame obvious before validation ever fires.

## Agent Brief

**Category:** refactor (author payload + prompt)
**Summary:** Add a Ch2+ dramatic handoff section to the Author packet and demote operational continuity to constraints/support.
**Current behavior:** Ch2 seed and situation packet repeat operational carry-forward loudly; Author restages procedure, then validators reject it.
**Desired behavior:** Author first sees who now has leverage, who pays, and what relationship/faction cost changed. Operational details survive only as background constraints or owner-used leverage.
**Key interfaces:** `lib/sf2/author/payload.ts`, `lib/sf2/author/prompt.ts`, `lib/sf2/chapter-meaning/*`, SF2 replay fixtures.
**Acceptance criteria:** Issue checklist; focused packet fixture; replay fixtures pass.
**Out of scope:** Changing Chapter Meaning extraction itself unless implementation shows it cannot supply the handoff inputs.
