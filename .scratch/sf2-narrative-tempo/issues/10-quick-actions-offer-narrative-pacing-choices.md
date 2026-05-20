# Quick Actions Offer Narrative Pacing Choices

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / Narrator / suggested actions

## What to build

Teach quick actions to sometimes offer different narrative pacing choices, not just different fictional tactics.

When the fiction permits more than one useful scale of play, the suggested actions should let the player steer whether the next turn stays close, compresses routine steps, jumps to consequence, enters montage, or metabolizes aftermath/downtime.

This turns quick actions into a tempo tool the player can use. The UI should say, in natural action language: "play this now," "move the plan forward," "wait for the consequence," or "take a quieter relationship beat" without exposing internal mode labels.

Quick actions should carry hidden pacing metadata when possible. The metadata helps diagnostics, repair, and downstream roll/tempo handling understand that the player selected a close-up, compression, jump, montage, aftermath, or downtime intent. The metadata must not appear in the player-facing label or submitted prose.

This metadata is for narrative pacing only. Do not add skill tags or named skill hints to quick actions.

## Product behavior

Good pacing-choice sets might include:

- a close-up option: "Press Sova on the altered count before Prenn can interrupt."
- a compression option: "Spend the next hour tracing the count through the registry, accepting that every query leaves your name behind."
- a time-jump option: "Let the filing proceed and wait to see who moves before the transport window closes."
- a montage option: "Work the docks, registry desk, and infirmary until one story fails to match the others."
- an aftermath/downtime option: "Step outside with Senna and ask what keeping the box cost her."

Do this only when it makes sense. In combat, immediate danger, active betrayal, surgery, or other live embodied pressure, quick actions should usually stay close and tactical. The goal is not to force one action per tempo every turn; the goal is to expose meaningful pacing agency when the scene has room for it.

## Acceptance criteria

- [ ] Narrator quick-action guidance explains that suggested actions can offer pacing choices when multiple narrative scales are valid.
- [ ] Quick actions never expose internal labels like `micro_scene`, `compression_turn`, `time_jump`, `montage`, `aftermath`, `downtime`, or `chapter_turn` to the player.
- [ ] When scene exhaustion, broad intent, aftermath, downtime, travel, prep, or investigation is active, the suggested action set includes at least two meaningfully different pacing scales when grounded options exist.
- [ ] Close-up scenes with immediate embodied pressure are allowed to offer only close/tactical actions.
- [ ] Pacing-choice actions still obey grounding: no unseen NPCs, unrevealed facts, hidden motives, invented exits, or unearned consequences.
- [ ] Pacing-choice actions still obey stance coherence: they should represent ways this player might plausibly continue the character, not a morality menu that overrides prior play.
- [ ] Broad pacing actions are written as playable player intents, not narrator commands or summaries.
- [ ] Suggested actions can carry hidden tempo metadata for diagnostics and downstream handling.
- [ ] Tempo metadata is not rendered as text and is not submitted as part of the player's action.
- [ ] Tempo metadata does not include skill tags or named roll-skill hints.
- [ ] Deterministic quick-action repair preserves valid pacing-choice actions and does not collapse them back into only "ask / inspect / press / check" micro-actions.
- [ ] If repair must synthesize an action during a non-micro recommendation, it can create a safe grounded pacing option such as "spend time following the known lead" or "wait for the named consequence to arrive."
- [ ] Replay fixtures cover a scene-exhaustion or broad-investigation state where quick actions offer close-up and compression/time-jump choices.
- [ ] Replay fixtures cover an immediate-danger state where quick actions stay close and do not invent macro skips.

## Blocked by

- [Narrator Tempo Prompt Contract](01-narrator-tempo-prompt-contract.md)
- [Tempo-Aware Suggested Actions](03-tempo-aware-suggested-actions.md)

## Implementation notes

Built 2026-05-20:

- Added hidden suggested-action tempo hints to SF2 types and Narrator tool schema.
- Updated prompt guidance so valid quick-action sets can include close-up and broader pacing choices.
- Preserved valid macro choices in deterministic repair and synthesize safe grounded macro fallbacks when needed.
- Verified with the full SF2 replay suite and production build.

Likely surfaces:

- `lib/sf2/narrator/prompt/role.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/narrator/suggested-actions.ts`
- route repair/salvage path in `app/api/sf2/narrator/route.ts`
- replay fixtures under `fixtures/sf2/replay/`

The important design distinction:

- Ticket 03 makes suggested actions obey the current or recommended tempo.
- This ticket lets suggested actions offer multiple valid tempos when the fiction supports player pacing agency.

Keep the text player-natural. Prefer:

```text
Spend the next hour tracing the registry discrepancy, accepting that Aulric will see your name on every query.
```

over:

```text
Choose COMPRESSION_TURN to advance the investigation.
```

Coordinate with the roll-gate relaxation work if it has landed. Broad pacing actions should not require bracketed skill tags to be accepted as valid player input.

Suggested metadata shape, adjusted to local conventions:

```ts
type Sf2SuggestedActionTempoHint =
  | 'close'
  | 'compression'
  | 'time_jump'
  | 'montage'
  | 'aftermath'
  | 'downtime'
  | 'chapter_turn'

interface Sf2SuggestedActionOption {
  id: string
  label: string
  tempoHint?: Sf2SuggestedActionTempoHint
}
```

If the first implementation keeps `suggested_actions` as `string[]` for compatibility, add a sidecar metadata structure keyed by stable action id or index. Do not append metadata to the label. This coordinates with ticket 09: skill tags should be gone from quick actions entirely, visible or hidden.

## Out of scope

- Adding visible tempo badges to the UI.
- Forcing every suggested-action set to include every tempo.
- Letting quick actions resolve hidden facts before the player chooses them.
- Replacing freeform input with menu play.
- Changing dice math or roll resolution.
