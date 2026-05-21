# Campaign Rulebook Interpretation Contract

Status: complete
Labels: complete
Type: HITL -> AFK
Area: SF2 / rules / campaign interpretation

## What to build

Add a campaign-local rulebook interpretation contract for rules whose generic categories need to be read against the PC, genre, and campaign context.

The motivating example is a grimdark corruption/Stain-like mechanic, but the contract is broader than Stain. Generic categories such as torture, betrayal, or killing surrendered enemies are not enough when the campaign has sharper local moral, social, genre, or character pressure. For an oath-driven or Church-shaped PC, deceiving a trusted person or using someone the way an abuser once used them may be a stronger violation than generic violence.

The same principle applies across the rulebook: rolls, costs, advantage/disadvantage, consequences, resource pressure, vows, taboos, factions, and social fallout should be interpreted through the campaign's established context. The system should have a place to record these campaign-specific interpretations before they become enforcement or prompt guidance.

This is related to playstyle personalization but not the same thing. Playstyle personalization tunes GM technique for the human player. Campaign rulebook interpretation tunes how rules apply inside the fiction.

## Acceptance criteria

- [x] Define a migration-safe campaign-local data shape for rulebook interpretations with rule id/name, generic rule category, campaign-specific reading, triggers/costs/permissions/taboos, excluded examples, and revision notes.
- [x] The shape supports mechanics that are not yet fully implemented, so a future Stain/corruption rule can be interpreted before enforcement.
- [x] Rulebook interpretation is campaign-local only and does not become a cross-campaign player profile.
- [x] Author/Narrator prompt surfaces can receive a compact rulebook-interpretation block separately from playstyle personalization.
- [x] The contract requires explicit setup rationale or play evidence before a campaign-specific interpretation changes enforcement or prompt guidance.
- [x] A focused fixture/helper test proves rulebook interpretation renders separately from playstyle personalization and can be omitted when absent.

## Blocked by

- 02-persist-artifacts-and-rolling-profile.md recommended, because persistence and diagnostics should follow the same campaign-local interpretation pattern.

## Comments

Added campaign-local rulebook interpretation types, normalization, and separate Author/Narrator prompt rendering. Prompt guidance/enforcement requires setup rationale or play evidence, and fixtures cover separate rendering plus omission.
