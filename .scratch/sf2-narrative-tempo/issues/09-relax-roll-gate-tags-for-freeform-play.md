# Relax Roll Gate Tags for Freeform Play

Status: verified-built
Labels: bug, enhancement, verified-built
Type: AFK
Area: SF2 / rolls / player input

## What to build

Make roll gates feel like part of play again instead of a hidden grammar the player has to satisfy.

Observed on May 19, 2026: multiple turns surfaced `required_roll_gate_missing_request_roll:*` failures. The likely cause is that code injects mandatory roll-gate instructions for freeform risky actions and bracketed quick-action skill tags, then `/api/sf2/narrator` blocks the turn if the Narrator commits with `narrate_turn` instead of first calling `request_roll`.

That preserves mechanics, but the product effect is bad: it makes freeform play feel fragile and teaches the player that they may need to include `[ROLL TYPE]` syntax to keep the system happy.

Rolls should remain available. Bracket syntax and user-visible hard failures should not.

## Product behavior

Desired behavior:

- The player can type natural freeform actions without `[Skill]`, `[ROLL TYPE]`, or any other bracket grammar.
- Suggested actions may imply a roll, but the submitted player action should read like natural prose.
- Missing a recommended roll gate should not break the turn in front of the player.
- If the system wants a roll, it should either surface `request_roll` smoothly or continue with a fail-forward / consequence-bearing narration and log the missed gate diagnostically.
- Any remaining hard roll gates should be narrow, documented, and recoverable without showing raw protocol errors to the player.

Preferred direction:

- Treat free-text roll gates as roll advisories, not blocking requirements.
- Remove quick-action skill tags entirely. Do not append skill tags to action labels, and do not carry quick-action skill metadata as a hidden binding.
- If quick actions still need a roll affordance, carry only generic uncertainty/roll-expectation metadata such as "this may call for a roll." Do not pre-bind the action to Insight, Persuasion, Investigation, etc.
- Choose the actual roll skill at roll time from the player's phrasing, state, and normal roll-gate logic.

Hard roll gates should be limited to:

- explicit player mentions such as "roll Insight", "make a check", or "can I roll?"
- combat attacks or consequential combat maneuvers
- save-like moments where the character is resisting immediate harm, compulsion, environmental danger, or a forced consequence

Should-roll advisories should cover anything else that carries meaningful uncertainty: risky investigation, social pressure, technical access, stealth, travel under pressure, broad goals with uncertain cost, and contested physical action. These should strongly encourage `request_roll`, but a missed should-roll must not crash the turn.

## Acceptance criteria

- [ ] Freeform risky actions without bracket tags no longer produce user-visible `required_roll_gate_missing_request_roll:*` errors.
- [ ] Suggested action labels never include visible bracketed skill tags.
- [ ] Suggested actions do not carry hidden skill-tag bindings either; no quick-action path pre-binds an action to a named skill.
- [ ] Suggested action labels submitted as player input do not require visible `[Skill]`, `[ROLL TYPE]`, or any bracket syntax to recommend a roll.
- [ ] The roll-gate model distinguishes soft advisories from truly hard requirements.
- [ ] Hard gates are limited to explicit roll/check mentions, combat actions, and save-like immediate-resistance moments.
- [ ] Free-text heuristic gates such as investigation, technical search, social pressure, risky movement, and broad uncertain goals are should-roll advisories by default.
- [ ] If the Narrator commits a turn without calling `request_roll` after a soft gate, the route emits diagnostics and allows the turn to continue.
- [ ] If any hard gate remains, `/api/sf2/narrator` performs a recovery path before surfacing an error, such as a narrow retry or deterministic roll prompt.
- [ ] Player-facing UI and error handling never tell the player to add `[ROLL TYPE]` or bracketed skill syntax.
- [ ] If roll affordance appears in the UI, it is generic uncertainty metadata/chips/icons and is not part of the submitted player prose.
- [ ] The UI does not display quick-action skill chips such as Insight, Persuasion, Investigation, etc.; named skills appear only in an actual roll prompt.
- [ ] Roll diagnostics still record when code expected a roll, whether the Narrator requested it, and whether the gate was advisory or hard.
- [ ] Existing explicit player requests like "roll Insight" or "make a check" still produce a roll prompt.
- [ ] Combat or other truly mechanical actions still have a reliable roll path, but without raw protocol failure messages.
- [ ] Replay fixtures cover: freeform risky action with no tag, selected quick action with no visible bracket tag, missed soft gate accepted with diagnostic, explicit roll request still rolling, and any remaining hard gate recovery.
- [ ] Docs are updated so `docs/rules-engine.md` and `docs/game-systems.md` no longer describe bracketed quick-action tags as a player-facing hard contract.

## Blocked by

None - can start immediately.

## Implementation notes

Built 2026-05-20:

- Removed code-owned quick-action skill tags and strip any bracket tags from model-provided quick actions.
- Split roll gates into `advisory`, `expected`, and `hard` bindings.
- Allowed missed expected gates to continue with diagnostics while hard gates still pause or recover.
- Narrowed `resistance_save` hard gates to immediate resistance plus harm/compulsion context after review.
- Updated docs and replay fixtures for the new freeform roll contract.
- Verified with the full SF2 replay suite and production build.

Read `CLAUDE.md`, `CONTEXT.md`, `docs/rules-engine.md`, and `docs/game-systems.md` first.

Likely surfaces:

- `lib/sf2/narrator/roll-gates.ts`
- `lib/sf2/narrator/intent-queue.ts`
- `app/api/sf2/narrator/route.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/narrator/suggested-actions.ts`
- `lib/sf2/narrator/stream-protocol/events.ts`
- `lib/sf2/narrator/stream-protocol/parse.ts`
- `components/sf2/play-shell.tsx`
- replay fixtures under `fixtures/sf2/replay/`

Current code to inspect closely:

- `computeRequiredRollGate` currently returns hard-looking gates for both bracketed skill tags and free-text detectors.
- `renderRollGateBlock` uses "mandatory" / "MUST call `request_roll`" language.
- `/api/sf2/narrator/route.ts` currently blocks `narrate_turn` when `turnContext.requiredRollGate` exists and no `request_roll` tool call appears.
- Existing fixtures such as `narrator-skill-tag-binds-roll.json`, `free-text-roll-gate-technical-search.json`, `free-text-roll-gate-social-npc-info.json`, and `quick-actions-code-owned-skill-tags.json` encode the old hard-binding behavior and will need deliberate updates, not blind preservation.

Suggested shape:

```ts
type Sf2RollGateBinding = 'advisory' | 'expected' | 'hard'

interface Sf2RollGateDirective {
  kind: Sf2RollGateKind
  source: Sf2RollGateSource
  skills: string[]
  reason: string
  binding: Sf2RollGateBinding
  sourceId?: string
}
```

Use `advisory` or `expected` for most freeform gates. Reserve `hard` only where the product truly wants interruption. Even then, prefer deterministic recovery over a user-visible error.

Map the product language like this:

- `hard`: explicit roll/check requests, combat, save-like resistance.
- `expected`: anything that carries meaningful uncertainty and would benefit from dice.
- `advisory`: weak or ambiguous uncertainty where a roll may help but narration can reasonably continue without one.

Remove skill tags from quick actions entirely. If suggested actions need roll hints, use generic uncertainty metadata near the action object or a sidecar map keyed by action id. Do not include named skills in that quick-action metadata. The text submitted as the player action should remain natural prose.

## Test notes

Run focused replay fixtures first, then the full SF2 replay suite:

```bash
npm run sf2:replay -- fixtures/sf2/replay/<changed-fixture>.json
npm run sf2:replay -- fixtures/sf2/replay
```

Add or update fixtures so the old failure mode would have failed:

- freeform input trips a soft gate, model emits `narrate_turn`, route accepts it and records a missed-roll diagnostic
- selected quick action has generic uncertainty metadata or an inferred roll lane, but player input, visible label, and quick-action metadata contain no named skill tag
- explicit "roll/check" input still pauses for a roll
- combat and save-like inputs still use a reliable hard-gate recovery path
- hard-gate recovery path does not leak `required_roll_gate_missing_request_roll:*`

## Out of scope

- Removing the `request_roll` tool.
- Removing d20 checks or roll resolution.
- Changing dice math, proficiency math, inspiration, or advantage/disadvantage.
- Reworking combat.
- Letting the Narrator secretly choose roll outcomes when a roll is actually requested.
