# Initial Campaign Setup Narrative Calibration Questions

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / setup / campaign seed

## What to build

Note: this ticket describes the completed 2026-05-20 setup-calibration persistence slice. The 2026-05-21 refinement keeps that work but changes the next product target from "feed hidden Author roles" to "compile a first GM handover artifact"; see the comments and `.scratch/sf2-gm-handover/`.

Add an optional narrative calibration step to the initial SF2 campaign setup flow.

After the player selects world, origin, playbook, name, and the system chooses an opening hook, but before `createInitialSf2State` builds the campaign, allow the setup model to ask up to 5 concise narrative calibration questions. The answers should tune the opening seed, first arc pressure, owed relationships, and first-scene emotional stakes.

This should recreate the useful shape from the referenced "Oaths tested in burning worlds" session: the model asked a small number of identity-and-obligation questions before play, then used those answers to make the opening destination, NPC ties, and pressure feel authored for that player.

Use `/Users/martin/Library/Mobile Documents/com~apple~CloudDocs/Oaths tested in burning worlds.md` as the reference shape. The key pattern is not a survey; it is an adaptive GM calibration conversation. The source session's "Three Questions" asked:

- What did you swear, and to whom?
- What do you still believe in, even now?
- Who do you owe, and who owes you?

For SF2, the exact questions should adapt to the selected genre, origin, playbook, and hook, but they should preserve that function: oath/commitment, anchor/belief, debt/relationship, and opening pressure.

## Product behavior

The setup flow should support:

- 0 to 5 calibration questions.
- Questions asked one at a time, not as a batch survey.
- Each next question may adapt to prior answers.
- Player skip at any point.
- Freeform player answers.
- Questions generated from the selected genre, origin, playbook, and opening hook.
- A deterministic fallback path that starts the campaign without calibration if the setup call fails.

Good question themes:

- what the character swore, believes, fears, or refuses to become
- who the character owes, who owes them, or who can still wound them
- what kind of trouble followed them into the opening hook
- what safety, victory, justice, duty, survival, or belonging means to this character
- which tonal edge should be present in the first chapter

Bad question themes:

- asking the player to restate already-selected mechanics
- asking for long lore essays
- overriding the selected genre, origin, playbook, or hook
- hiding essential campaign facts in the question text
- making all five questions mandatory

## Acceptance criteria

- [ ] SF2 setup has a calibration step after identity selection and before campaign creation.
- [ ] The system can generate up to 5 narrative calibration questions from the selected setup context, one at a time.
- [ ] Later questions can incorporate earlier calibration answers without restating them mechanically.
- [ ] The player can answer each question in free text and can skip/finish early.
- [ ] The calibration UX supports starting the campaign after any answered question; answering all 5 is never required.
- [ ] Calibration answers are stored on `Sf2SetupSelection` or an equivalent migration-safe setup payload.
- [ ] `Sf2CampaignMeta.setupSelection` and persistence normalization preserve calibration answers without breaking old saves.
- [ ] `compileSf2SetupSeed` incorporates calibration answers into the `AuthorInputSeed` as player-authored setup context.
- [ ] Arc Author / Chapter Author receive the calibration context through the normal seed path before the first scene is authored.
- [ ] The generated first campaign still works when there are no calibration answers.
- [ ] Calibration answers do not appear as live transcript turns and do not count as player actions.
- [ ] Setup diagnostics/debug data include whether calibration was skipped, completed, or failed open.
- [ ] Unit or fixture coverage proves that calibration answers survive setup normalization and appear in the compiled seed.
- [ ] A setup helper test proves that more than 5 questions are rejected or clamped.

## Blocked by

None - can start immediately.

## Implementation notes

Built 2026-05-20:

- Added optional one-at-a-time setup calibration in `components/setup/character-setup.tsx`.
- Preserved calibration answers through setup selection, persistence normalization, and seed compilation.
- Rendered player-authored calibration into Arc Author input.
- Covered clamp/preservation/seed behavior through SF2 replay fixture expectations.
- Verified with the full SF2 replay suite and production build.

Refined 2026-05-21 after handover-doc review:

- The built persistence/seed slice remains useful, but the product target changed. Setup should not only feed Arc Author / Chapter Author; it should become the one-time interactive campaign setup that produces the first GM handover artifact.
- The reference shape is now broader than "calibration questions": use the adaptive setup conversation to compile GM memory, a Chapter 1 session brief, and a quick reference, following the Pale Flame handover pattern.
- The V3 PRD adds the live-use layer: the first handover should also compile an initial Current Story Surface, Owed Questions, embodied pressure, do-not-restage constraints, and lightweight chapter motion targets.
- Setup order decision: keep hook selection before the interactive questions, so answers tailor a concrete campaign opening.
- Keep `playerCalibration` as Author fallback input, but future slices should make the first-session brief available to Narrator directly behind a reversible gate.
- Follow-up issue set: `.scratch/sf2-gm-handover/`.

Read `CLAUDE.md`, `CONTEXT.md`, `docs/prompt-composition.md`, and the SF2 setup files first.

Likely surfaces:

- `components/sf2/play-app.tsx`
- `components/setup/character-setup.tsx`
- new or existing setup calibration component under `components/setup/`
- `lib/sf2/setup/types.ts`
- `lib/sf2/setup/options.ts`
- `lib/sf2/setup/compile-seed.ts`
- `lib/sf2/game-data.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/types.ts`
- a new setup calibration API/helper if live model generation is used

Suggested data shape:

```ts
interface Sf2SetupCalibrationAnswer {
  question: string
  answer: string
  theme?: 'oath' | 'belief' | 'debt' | 'fear' | 'relationship' | 'tone' | 'opening_pressure'
}

interface Sf2SetupSelection {
  genreId: string
  originId: string
  playbookId: string
  hookId: string
  characterName?: string
  calibrationAnswers?: Sf2SetupCalibrationAnswer[]
}
```

Keep the setup context compact when adding it to the seed. The Author does not need the whole chatty exchange; it needs the durable player-authored facts and tensions. A compact block such as "Player calibration" is enough if it preserves the question/answer pairs.

The setup model must ask questions one at a time. Do not generate a batch questionnaire. The desired interaction is closer to the provided "Oaths tested in burning worlds" doc: ask one loaded question, let the player answer freely, briefly reflect the durable implication, then ask the next question shaped by what changed.

The default first-question family should be oath/commitment/defining wound:

```text
What did you swear, and to whom?
```

The default second-question family should be anchor/belief/value:

```text
What do you still believe in, even now?
```

The default third-question family should be debt/owed relationship:

```text
Who do you owe, and who owes you?
```

Questions 4-5, when useful, should sharpen opening pressure, tonal edge, or a relationship that the hook can immediately test. Stop early when the answers already provide enough fuel.

## Test notes

Prefer pure helper tests over live model tests:

- calibration payload clamps to 5 answers
- old `setupSelection` values without calibration still normalize
- calibration answers survive persistence normalization
- compiled seed includes the calibration context
- campaign creation succeeds with and without calibration answers

## Out of scope

- Changing live Narrator turn behavior.
- Adding the full Conductor architecture.
- Making calibration mandatory.
- Creating durable NPCs, factions, or threads directly from calibration answers outside the existing Author / Arc Author path.
- Changing V1 setup unless unavoidable for shared components.
