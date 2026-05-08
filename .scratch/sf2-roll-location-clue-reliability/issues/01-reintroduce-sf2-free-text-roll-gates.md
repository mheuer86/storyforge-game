Status: needs-triage
Type: AFK

# Reintroduce SF2 Free-Text Roll Gates

## What to build

Restore the V1-style free-text roll gate behavior for SF2 Narrator turns. Untagged player inputs that push against meaningful uncertainty should inject a private, mandatory roll-gate advisory into the Narrator context so the Narrator calls `request_roll` before resolving the action.

The gate should cover at least social pressure, wary-or-neutral NPC information extraction, technical/system actions, investigation/search/scan actions, risky stealth or movement, and physical contests. It should skip pure decisions, trivial observation, arrival/setup beats, downtime, and already-earned routes.

## Acceptance criteria

- [ ] Free-form player input that pressures an NPC, extracts non-trivial information, performs a technical/scan action, searches, sneaks, escapes, or physically contests an obstacle produces a mandatory private roll-gate advisory in SF2.
- [ ] Pure choices and low-uncertainty narration do not produce a roll-gate advisory.
- [ ] Skill-tag binding continues to work and remains stricter than the heuristic free-text gate.
- [ ] Focused SF2 replay fixtures cover at least one positive social/NPC-info gate, one positive technical/search gate, and one negative no-roll pure-choice case.
- [ ] The Narrator still pauses with `request_roll` before outcome narration when a gate applies.

## Blocked by

None - can start immediately.

