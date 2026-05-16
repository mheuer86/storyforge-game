# Social Roll Modifier Advisories

Status: implemented
Type: AFK

## What to build

Add a code-owned SF2 social modifier layer so origin, NPC disposition, and party/crew cohesion can affect roll advantage/disadvantage as persistent game-state facts instead of loose prompt taste.

The first slice should make the mechanic visible end-to-end without trying to migrate every V1 social rule in one pass:

- origin should carry persistent social positioning, especially in Hegemony play where institutional identity matters
- NPC disposition should influence social/information rolls when the target is clear
- high or low cohesion should influence checks that rely on crew/contact support
- the Narrator should see the applicable advisory before it calls `request_roll`
- the roll prompt and roll log should preserve the final modifier and reason

Example target behavior: if a Synod-origin / Seeker-like PC pressures an Undrift NPC, the system should surface a disadvantage or wary-positioning advisory with a concrete reason such as "Undrift contact treats Synod-trained PCs as institutional threat." If an Undrift PC works through an Undrift network contact, the system should surface advantage or favorable positioning when the action matches that network leverage.

## Decisions already made

- Bring over origin as a persistent social modifier.
- Bring over disposition/cohesion/origin based advantage/disadvantage triggers.
- Keep this SF2-native and code-owned. Do not paste V1 prompt prose into the Narrator.
- Do not bring back witness marks in this ticket.
- Do not add failed-investigation/red-herring machinery in this ticket.
- Do not add roll-drought or chapter-pacing pressure in this ticket.

## Current files to inspect

- `lib/genres/index.ts`
- `lib/genres/epic-scifi.ts`
- `lib/genres/*`
- `lib/sf2/types.ts`
- `lib/sf2/game-data.ts`
- `lib/sf2/author/payload.ts`
- `lib/sf2/author/disposition-defaults.ts`
- `lib/sf2/retrieval/packets/player.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/narrator/messages.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/narrator/stream-protocol/events.ts`
- `lib/sf2/narrator/stream-protocol/parse.ts`
- `app/api/sf2/narrator/route.ts`
- `app/play/v2/page.tsx`
- `lib/sf2/runtime/client-turn-orchestrator.ts`
- `components/sf2/play-shell.tsx`
- `fixtures/sf2/replay/*roll*`

## Suggested module shape

Add a focused module such as:

- `lib/sf2/social-modifiers/rules.ts`
- `lib/sf2/social-modifiers/evaluate.ts`
- optional `lib/sf2/social-modifiers/types.ts`

The module should expose one small interface that can be called from Narrator context assembly and from roll-prompt reconciliation:

- input: `Sf2State`, current player input, current scene/cast packet if available, and optional requested skill/target
- output: zero or more modifier advisories with:
  - `id`
  - `source`: `origin | disposition | cohesion | trait | inventory | other`
  - `modifierType`: `advantage | disadvantage | challenge`
  - `skills` or skill families it applies to
  - `targetNpcId` / `targetFactionId` when target-specific
  - short player/debug-safe `reason`
  - priority/confidence or deterministic tie-break order

Do not make the Narrator infer these rules by reading origin lore. Add structured rule data or a code mapping for the rules that are implemented in this slice.

## Initial rule coverage

Implement a narrow but real set of rules:

1. **Hegemony origin/institution rules**
   - Synod-origin PCs are treated with suspicion by Undrift-aligned NPCs unless state has earned trust.
   - Undrift-origin PCs are treated with suspicion by Synod, House, and Imperial institutional NPCs by default.
   - Imperial Service PCs have advantage/positioning on protocol, jurisdiction, and official-authority checks, but non-Imperial contacts should not jump to trusted without explicit loyalty evidence.
   - Minor House PCs have advantage/positioning on trade, negotiation, and alliance-building, but Major House NPCs should not start above neutral without evidence.
   - Spent Resonant PCs have institutional knowledge advantage on Synod procedure / Resonant handling, but exposing capacity should carry Synod danger rather than simple advantage.

2. **Generic disposition rules**
   - `trusted` or `favorable` targets can grant advantage on cooperative Persuasion, information-sharing, or aid-seeking checks when the action aligns with what they would share.
   - `wary` targets can grant disadvantage on extracting sensitive information unless the PC has clear leverage.
   - `hostile` targets can grant disadvantage for Persuasion/Deception meant to gain cooperation, but should not automatically disadvantage Intimidation or physical pressure.
   - Rules must not override explicit scene facts saying trust has already been earned or leverage has been established.

3. **Cohesion rules**
   - Use `state.derived.cohesion` when present. If it is absent, do not invent a value.
   - High cohesion can advise advantage on crew-supported checks.
   - Low cohesion can advise disadvantage on checks that depend on crew trust, contact reliability, or coordinated assistance.
   - Do not change how cohesion is computed in this ticket.

## Integration requirements

- Add the advisories to the dynamic Narrator packet/private context, not cached system prompt text.
- Reconcile `request_roll.modifier_type` against code advisories in `app/api/sf2/narrator/route.ts` or a helper it calls.
- Prefer non-destructive reconciliation:
  - if Narrator supplies the same modifier type, keep it and normalize/append the code reason
  - if Narrator omits a deterministic applicable modifier, fill it in
  - if Narrator supplies a conflicting modifier, keep the code-owned modifier only when the rule is deterministic and target-specific; otherwise log a diagnostic and preserve the Narrator choice
- Keep the existing stream protocol shape unless an additive field is truly needed.
- Preserve UI behavior for advantage/disadvantage/challenge roll cards.
- Store the final modifier and reason in `Sf2RollRecord`.
- Add debug/diagnostic output only if useful; do not spam normal play.

## Refinement notes from code inspection

Current concrete surfaces:

- Dynamic Narrator context is built through `lib/sf2/narrator/messages.ts`, which calls `buildScenePacket(...)` and appends uncached helper blocks to `renderPerTurnDelta(...)`.
- The cleanest context hook is a new short block appended next to `roleAliasBlock`, `rollGateBlock`, and `playbookPrefBlock` in `buildMessagesForNarrator(...)`; keep it private and dynamic.
- `buildScenePacket(...)` already computes `resolvedAction` through `resolvePlayerAction(...)`; reuse `packet.playerInput.resolvedAction?.targetEntityIds` for target-specific NPC advisories instead of regexing names again.
- Roll prompt emission is in `app/api/sf2/narrator/route.ts` inside the `if (rollUse)` branch. Reconcile immediately after `bindRequiredRollGateSkill(...)`, before sending the `roll_prompt` event.
- Client roll UI and roll log already pass `modifierType` / `modifierReason` from the `roll_prompt` event through `lib/sf2/runtime/client-turn-orchestrator.ts`, `app/play/v2/page.tsx`, and `components/sf2/play-shell.tsx`. Prefer preserving this event shape.
- Roll records are stored in `Sf2RollRecord` with `modifierType` / `modifierReason`; no new persisted roll fields are needed for this slice unless diagnostics require them.
- Present NPC disposition and mutable social state are already rendered in `lib/sf2/retrieval/packets/cast.ts`. The new module should consume state/packet data and not duplicate that rendering logic.

Recommended implementation details:

- Add `lib/sf2/social-modifiers/evaluate.ts` with pure helpers:
  - `evaluateSocialModifierAdvisories({ state, playerInput, resolvedAction, skill, targetEntityIds })`
  - `renderSocialModifierAdvisories(...)`
  - `reconcileRollModifierWithSocialAdvisories(...)`
- Make the rule output deterministic and small. Use priority order: target-specific origin/disposition, target-specific disposition, cohesion, generic origin positioning.
- Treat deterministic override as only target-specific origin/disposition rules. Generic cohesion and vague origin posture should advise/fill omissions, but should not clobber a Narrator-supplied conflicting modifier.
- Skill matching can stay text-based for the first slice: social/information skills such as Persuasion, Deception, Intimidation, Insight, Investigation, Perception when used to extract information. Avoid affecting combat or physical pressure.
- Hegemony faction matching should normalize `state.meta.genreId === 'epic-scifi'`, player `origin.id`, NPC `affiliation`, and faction ids/names. The data uses labels such as `The Synod`, `The Undrift`, `Imperial Service`, and House names.
- Use `state.derived.cohesion` only when it is a number or clearly supported object in current state. Do not synthesize cohesion.

Replay harness surfaces:

- `scripts/sf2-replay.ts` already supports `expected.perTurnDeltaIncludes` / `expected.perTurnDeltaExcludes` for dynamic Narrator context checks.
- Add one small replay expectation for reconciled roll prompts by extending the runner with a pure `socialModifierAdvisories` or `rollModifierReconciliation` expectation rather than depending on a live model call.
- Focused fixtures can use `stateBeforePatch` with a minimal `campaign.npcs`, `world.sceneSnapshot.presentNpcIds`, and `player.origin`.

## Required behavior to preserve

- Roll pause/resume streaming behavior must not change.
- Existing `request_roll` schema stays compatible.
- Inspiration remains a post-failure reroll path; do not turn inspiration into advantage.
- `challenge` remains effective DC +2.
- Narrator still chooses skill and base DC.
- Existing replay fixtures must keep passing.
- No prompt text changes unless a short dynamic packet label is needed.
- No V1 witness marks.
- No passive perception.
- No failed-investigation red-herring system.
- No roll-drought/pacing-pressure restoration.

## Acceptance criteria

- [x] A social modifier module exists and owns origin/disposition/cohesion modifier evaluation.
- [x] The per-turn Narrator context includes applicable social modifier advisories.
- [x] `request_roll` handling reconciles final modifier type/reason with code-owned advisories.
- [x] Roll UI and roll log show the final advantage/disadvantage/challenge reason.
- [x] At least one focused fixture covers a Synod-origin PC interacting with an Undrift-aligned NPC and receiving disadvantage/wary-positioning on a relevant social roll.
- [x] At least one focused fixture covers a favorable/trusted NPC granting advantage for a cooperative social or information-sharing action.
- [x] At least one focused fixture covers low or high cohesion advisory behavior when `state.derived.cohesion` is present.
- [x] Existing roll fixtures and full SF2 replay suite pass.
- [x] `npm run build` passes.

## Verification

Run focused fixtures first. Suggested names:

```bash
npm run sf2:replay -- fixtures/sf2/replay/social-modifier-origin-undrift-synod.json
npm run sf2:replay -- fixtures/sf2/replay/social-modifier-trusted-contact-advantage.json
npm run sf2:replay -- fixtures/sf2/replay/social-modifier-cohesion-support.json
```

Then run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, state which focused fixtures ran and why the full suite was skipped.

## Blocked by

None - can start immediately.

## Notes for agent

Keep this small. The goal is to create the SF2-native modifier path and prove it with Hegemony/social examples, not to perfectly encode every origin sentence in every genre file. If you discover obvious follow-up data migration work for other genres, write it down as a residual ticket instead of expanding this slice.

## Implementation note

Implemented on 2026-05-16 with `lib/sf2/social-modifiers/evaluate.ts`, dynamic Narrator advisories, `request_roll` reconciliation, and focused replay fixtures:

- `fixtures/sf2/replay/social-modifier-origin-undrift-synod.json`
- `fixtures/sf2/replay/social-modifier-trusted-contact-advantage.json`
- `fixtures/sf2/replay/social-modifier-cohesion-support.json`
