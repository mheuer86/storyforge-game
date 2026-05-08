# Clarify revelations as human hidden truths, not procedural twists

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, revelations review

## What to build

Tighten the Revelation contract so authored revelations are hidden truths that recontextualize human stakes, not generic procedural facts.

Clarify the model boundary at the same time: the durable authored object should represent the hidden truth and reveal conditions, while turn events should represent things that happened in prose, such as a hint landing or the truth being revealed.

The current implementation usefully tracks latent truths, hint phrases, hint counts, and reveal contexts. The weak spot is semantic: fixtures and examples often teach the model that a revelation is "a filing/log/audit detail was different than expected." That can be valid only when the procedural surface exposes a person, faction, betrayal, coercive plan, hidden agency, or irreversible risk.

## Acceptance criteria

- [ ] The Author prompt defines revelations as hidden truths that reframe agency, betrayal, coercion, danger, power, obligation, identity, or relationship
- [ ] The durable model is renamed or documented away from generic `PossibleRevelation`; candidate names are `AuthoredReveal` or `HiddenTruth`
- [ ] The contract distinguishes the authored hidden-truth object from turn events such as `hintDelivered` and `truthRevealed`
- [ ] Existing `revelationHintsDelivered` and `revelationsRevealed` are either renamed to that clearer event language or explicitly documented as those event roles
- [ ] Revelation guidance explicitly rejects procedural-only hidden facts: filings, audits, logs, forms, queues, releases, route statuses, and document timestamps that do not expose a human/faction consequence
- [ ] Documentary-surface reveals remain allowed only when the document exposes who acted, who is endangered, who lied, who owns the pressure, or what choice is now morally changed
- [ ] `possible_revelations[].recontextualizes` must name what prior pressure, relationship, or decision changes meaning, not just "the audit is not routine" or "the timer is not neutral"
- [ ] Author examples include non-procedural, genre-native revelations across at least space opera/Hegemony and one non-Hegemony genre
- [ ] Regression fixtures replace or supplement procedure-heavy revelation examples with human-stakes examples
- [ ] Validation or observe-mode drift flags detect procedural-only revelation statements, similar in spirit to procedural-only outcome rejection
- [ ] Archivist guidance distinguishes `revelation_hints_delivered` and `revelations_revealed` from clue/document updates and generic PC realizations
- [ ] Retrieval wording presents active revelations as authored hidden truths, not merely "hint counters"
- [ ] Failed-roll revelation seeds are considered explicitly: a failed or partial read may create a durable "PC believes X / hidden truth is Y" setup only when later reveal will recontextualize a meaningful pressure, relationship, decision, or danger
- [ ] Failed-roll reveal guidance preserves the Narrator display sentinel rule: do not tell the player "what you missed"; commit to the PC-facing false read until the truth lands through earned evidence, confession, consequence, or pressure

## Blocked by

- 15-pressure-events-with-human-consequences.md is recommended, because revelation quality should use the same human-consequence vocabulary

## Comments

Current type shape is useful:

```ts
Sf2PossibleRevelation {
  statement
  heldBy
  emergenceCondition
  recontextualizes
  hintPhrases
  hintsRequired
  hintsDelivered
  validRevealContexts
  invalidRevealContexts
}
```

The model problem is not the existence of `documentary_surface`. A document can absolutely carry a revelation. The issue is whether the revealed truth is about a procedural state or about a human truth.

Example classification:

| Surface | Durable classification |
|---|---|
| "The ledger shows a 40k debt." | Document fact or clue |
| "The debt contract names the weapon shipment as collateral." | Document update or clue |
| "The creditor engineered the 40k debt to force the PC to smuggle the illegal weapon." | Revelation |
| "The release log was paused manually." | Maybe clue/document fact |
| "Mira saw Hale pause the log to force the PC to betray the broker." | Revelation |

Naming cleanup:

- `PossibleRevelation` -> `AuthoredReveal` or `HiddenTruth`
- `revelationHintsDelivered` -> `hintDelivered` semantics
- `revelationsRevealed` -> `truthRevealed` semantics

The physical field names can change later or remain backward-compatible aliases. The important boundary is semantic: the authored object is the latent truth; the events are evidence that prose advanced or resolved it.

Failed-roll extension:

```ts
FailedReadRevealSeed {
  sourceTurnId
  sourceRollId
  pcFacingBelief // what the PC reasonably took to be true
  hiddenTruth // what is actually true
  revealCondition
  recontextualizes
}
```

This should be used sparingly. It is strongest when the failed read creates a believable wrong model of another person's agency: the PC thinks someone is afraid when they are stalling, thinks a threat came from the buyer when it came from the crew, or thinks a debt is ordinary pressure when it was engineered as coercion.

## Agent Brief

**Category:** architecture
**Summary:** Tighten Revelation semantics so they represent authored hidden truths with human consequences, not procedural twists, and split the durable hidden-truth object from hint/reveal events.

**Current behavior:** Revelation shape tracks hints and reveal contexts, but examples and validation allow procedure-shaped statements such as filings, logs, audits, timers, and verdicts to count as revelations even when no person, faction, or relationship consequence is named.

**Desired behavior:** A revelation recontextualizes prior play by exposing hidden agency, coercion, betrayal, identity, power, danger, or obligation. Procedural evidence can surface it, but the procedure is the carrier, not the truth. The authored hidden truth is modeled separately from turn events that deliver hints or reveal the truth.

**Key interfaces:** `Sf2PossibleRevelation`, `Sf2RevelationHintDelivered`, `Sf2RevelationRevealed`, `possibleRevelationsSchema`, Author prompt, Archivist prompt, `buildRevelationProgressPackets`, `applyArchivistPatch`, replay fixtures.

**Out of scope:** Removing revelation hint counters or banning document-based reveals.
