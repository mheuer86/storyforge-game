# Roll Consequences Separate Observed Facts from Failed Interpretations

Status: needs-triage
Type: AFK
Area: SF2B / rolls / consequence contract

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Make SF2B roll continuations distinguish between observed facts, player or character interpretations, and the actual consequence of success or failure.

The motivating failure came from the V1 Forty Thousand playthrough: failed reads about the station later appeared to be simply confirmed as true. A failed roll can reveal a real fact, but the failed part must land somewhere legible: an incomplete inference, wrong certainty, missed cost, delayed danger, false confidence, or an interpretation that is later reframed.

## Acceptance criteria

- [ ] Roll continuation context or prompt instructions explicitly separates observed facts from interpretations and consequences.
- [ ] Failed information-gathering rolls may reveal partial real facts, but they do not later become cleanly confirmed conclusions without a reframing or cost.
- [ ] Success, partial success, and failure prose all preserve player-facing causality: the player can tell what the roll changed.
- [ ] Mechanical roll values stay in roll UI/log surfaces, not in player-facing narrative prose.
- [ ] A focused replay or narrator fixture covers a Calyx-style failed destination read that later becomes meaningful without making the failed roll feel fake.
- [ ] Existing SF2 roll sentinel behavior remains compatible with the SF2B roll contract.

## Blocked by

- [Narrator Uses a Dramatic Kernel Instead of the Full SF2 Packet](02-narrator-uses-a-dramatic-kernel-instead-of-the-full-sf2-packet.md)

## Out of scope

- Changing the dice math.
- Hiding mechanical roll outcomes from the mechanical UI.
- Banning all factual reveals on failed rolls.

## Comments

The product goal is not "failure means no information." The goal is that failure has a consequence the fiction can honor later.
