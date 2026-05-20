# Narrator Tempo Prompt Contract

Status: verified-built
Labels: enhancement, verified-built
Type: AFK
Area: SF2 / Narrator / prompt

## What to build

Add a Narrative Tempo section to the SF2 Narrator prompt so the model no longer treats every turn as a close-up continuation beat.

The patch should preserve the existing micro-scene rules, but scope them to `micro_scene`. Non-micro tempo modes should explicitly permit compressed time, multiple visible deltas, broader word budgets, scene jumps, aftermath, downtime, and chapter phase movement when those improve pacing.

Use lower-snake-case identifiers in code-facing schema or fixtures:

- `micro_scene`
- `compression_turn`
- `time_jump`
- `montage`
- `aftermath`
- `downtime`
- `chapter_turn`

Prompt-facing prose may use friendlier labels, but player-facing prose must never expose the mode label.

## Acceptance criteria

- [ ] The Narrator role prompt includes narrative tempo guidance with the seven tempo modes above.
- [ ] The existing "each turn should change one thing" rule is rewritten so it applies primarily to `micro_scene`.
- [ ] Non-micro modes explicitly allow multiple visible changes when that moves play to the next live dramatic situation.
- [ ] Word-budget guidance distinguishes `micro_scene` from compression, time jump, montage, aftermath, downtime, and chapter-turn output.
- [ ] Scene concatenation guidance distinguishes aimless "and then" chaining from intentional compression.
- [ ] `chapter_turn` is defined as in-play phase movement only; it does not grant Narrator ownership of Author, Chapter Meaning, or durable arc writes.
- [ ] The prompt explains when to stop playing beat-by-beat because a scene is exhausted.
- [ ] A replay fixture asserts that the assembled Narrator prompt contains the tempo section, mode names, scoped one-change rule, and non-micro word-budget language.

## Blocked by

None - can start immediately.

## Implementation notes

Built 2026-05-20:

- Added the Narrator narrative tempo contract in `lib/sf2/narrator/prompt/role.ts`.
- Covered the prompt surface with `fixtures/sf2/replay/narrative-tempo-prompt-contract.json`.
- Verified with the full SF2 replay suite and production build.

Read `CLAUDE.md`, `CONTEXT.md`, `docs/prompt-composition.md`, and `docs/game-systems.md` first.

Likely surfaces:

- `lib/sf2/narrator/prompt/role.ts`
- existing narrator prompt-surface fixtures under `fixtures/sf2/replay/`

Keep the patch additive and prompt-only. Do not add schema or diagnostics in this slice.

## Out of scope

- Adding a new Conductor role.
- Changing `beatMode`.
- Changing streaming, roll pause, or tool-call behavior.
- Making tempo mode visible to the player.
