# Decide Promote, Iterate, or Kill SF2B

Status: needs-triage
Type: HITL
Area: SF2B / product decision

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Run the human evaluation gate for SF2B and record the architectural decision.

This ticket should not be completed by implementation alone. It requires reviewing the A/B artifacts and deciding whether SF2B should replace current SF2 direction, be iterated for another spike, or be killed with lessons folded back into SF2/V1.

## Acceptance criteria

- [ ] At least one V1 Chapter 1, one current SF2 Chapter 1, and one SF2B Chapter 1 plus Chapter 2 opener are available for review.
- [ ] The evaluation explicitly answers the four PRD gate questions.
- [ ] The decision is recorded: promote SF2B, iterate SF2B, kill SF2B, or extract specific lessons into current SF2.
- [ ] Follow-up tickets are created only after the decision, not before the spike evidence exists.
- [ ] If SF2B is killed, the experiment remains removable without save-shape or UI fallout.

## Blocked by

- [Forty Thousand A/B Evaluation Harness](07-forty-thousand-ab-evaluation-harness.md)

## Out of scope

- Implementing the follow-up architecture.
- Declaring SF2B successful based on structural elegance without playthrough evidence.

## Comments

This is intentionally HITL because the central question is product taste plus architectural evidence: did the structure actually make the game better?
