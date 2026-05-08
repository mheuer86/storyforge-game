Status: needs-triage
Type: HITL

# Review Roll Drought Warnings After Gates Land

## What to build

After SF2 free-text roll gates are restored, review whether SF2 still needs V1-style escalating roll drought warnings. This should be a human-in-the-loop decision based on replay/playthrough behavior, not a blind restoration of every V1 warning layer.

The review should compare roll cadence before and after the gate fix, especially in social/investigative chapters where free-form input previously used to produce checks reliably.

## Acceptance criteria

- [ ] At least one replay or fresh playthrough is reviewed after the free-text roll-gate issue lands.
- [ ] The review records whether roll droughts still occur after 4-5 forward-motion turns without dice.
- [ ] If drought warnings are still needed, the follow-up shape is specified: thresholds, high-tension behavior, and where the advisory should be injected.
- [ ] If drought warnings are not needed, the decision is recorded so SF2 does not add redundant prompt pressure.

## Blocked by

- `.scratch/sf2-roll-location-clue-reliability/issues/01-reintroduce-sf2-free-text-roll-gates.md`

