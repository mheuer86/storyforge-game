# 20 - Add Chapter Close Player Reflection
Status: draft Type: HITL Area: SF2 prose-first prototype / co-creation / chapter close

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

After a chapter closes and before the next chapter fully begins, offer the player a small reflection moment that gives them directorial influence without turning the game into a survey.

The reflection should ask what worked, what did not, and what the player wants more or less of in the next chapter. The response should be treated as player preference / co-direction input for the next handover or continuation prompt, not as canonical world state.

This should be a separate iteration after the core controller close flow, because it affects player agency and pacing but is not required for reliable chapter close.

## Possible Shape

After the final chapter-close prose and handover compilation:

- "What felt strongest this chapter?"
- "What should the next chapter lean into or avoid?"
- "Any directorial note for tone, pace, NPC focus, or unresolved pressure?"

The UI should keep this lightweight. The player can skip it.

## Acceptance criteria

- [ ] A player reflection affordance appears after chapter close but before or during Chapter 2 setup.
- [ ] The player can skip reflection without blocking continuation.
- [ ] Reflection answers are stored separately from canonical narrative/mechanical state.
- [ ] Reflection can be passed into the handover compiler or next chapter narrator context as player preference / directorial guidance.
- [ ] Reflection text is included in prototype export diagnostics or artifacts.
- [ ] Reflection does not overwrite facts, NPC state, thread state, or mechanical state.
- [ ] The next chapter can reference the preference implicitly through pacing/focus, but the narrator must not quote it as in-fiction truth.

## Blocked by

- `18-prose-first-chapter-close-handover-flow.md`

## Open product decision

Decide whether reflection happens:

- before handover compilation, so it can shape the handover directly
- after handover compilation, so it shapes only the next narrator prompt
- both, with a compact preference summary carried forward
