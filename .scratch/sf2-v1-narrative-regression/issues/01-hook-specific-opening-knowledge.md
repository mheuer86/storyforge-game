Status: ready-for-agent, low priority
Labels: enhancement, ready-for-agent, low-priority
Type: AFK

# Hook-specific opening knowledge

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Pass existing V1 playbook `openingKnowledge` into SF2 setup seed context so Chapter Author can use the PC's lived expertise when authoring the opening chapter.

This ticket is intentionally narrow. Do not design new hook-specific opening lore here. Existing `openingKnowledge` is per-playbook, not per-hook, but it is still useful for Ch1 role confidence and genre texture.

## Required Behavior

- `compileSf2SetupSeed` carries selected playbook `openingKnowledge` into `AuthorInputSeed.pcCapabilities` or an adjacent typed field.
- Ch1 Author seed JSON includes that knowledge.
- Author prompt can use it to orient the PC's role and natural moves.
- No Narrator-only prompt text is added unless a rendered prompt/packet already has a natural home for PC capability context.

## Surfaces

- `lib/genres/*.ts`
- `lib/sf2/setup/compile-seed.ts`
- `lib/sf2/types.ts`
- `lib/sf2/author/payload.ts`
- `lib/sf2/author/prompt.ts` only if the seed field needs explicit mention
- `fixtures/sf2/replay/`

## Implementation Notes

- Preserve the difference between general playbook knowledge and hook-specific knowledge.
- Do not invent per-hook knowledge strings.
- Keep the field optional for old playbooks/saves.
- If `AuthorInputSeed.pcCapabilities` is extended, update every downstream type consumer.

## Acceptance Criteria

- [ ] Existing playbook `openingKnowledge` is available in the compiled SF2 seed.
- [ ] The field is optional and does not break genres/playbooks that omit it.
- [ ] Ch1 Author seed fixtures show the knowledge for at least one Space Opera playbook.
- [ ] No existing seed compilation behavior regresses.

## Fixture Expectations

Add or update a compile-seed/author seed fixture.

Suggested fixture name:

```bash
fixtures/sf2/replay/setup-seed-opening-knowledge.json
```

It should assert that a selected playbook's opening knowledge reaches the Author seed without changing unrelated hook fields.

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/setup-seed-opening-knowledge.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Designing hook-specific opening knowledge.
- Changing setup UI.
- Changing Narrator scene packet shape unless needed by an existing helper.
