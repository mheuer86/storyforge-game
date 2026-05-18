Status: implemented
Labels: enhancement, implemented
Type: AFK

# Narrator tone proportions

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Give the SF2 Narrator access to each genre's tone mix/proportions. V1 gave the GM per-genre tone guidance such as epic/gritty/witty ratios. SF2 currently compiles tone rules for Author seed, but the Narrator role that writes prose does not receive an explicit tone mix.

## Required Behavior

- Narrator prompt surface includes genre tone proportions or equivalent tone mix.
- The tone guidance is genre-specific.
- Tone guidance complements the genre bible rather than replacing it.
- Author seed tone rules remain intact.
- No per-turn dynamic content is added to cached role/core blocks.

## Surfaces

- `lib/genres/*.ts` for V1/genre config tone source
- `lib/sf2/setup/compile-seed.ts` for existing Author `toneRules`
- `lib/sf2/genre-profile/profiles.ts`
- `lib/sf2/genre-profile/index.ts`
- `lib/sf2/narrator/prompt/role.ts`
- prompt-surface fixtures under `fixtures/sf2/replay/`

## Implementation Notes

- Prefer a single genre-profile helper that can render tone guidance for the Narrator role.
- Avoid duplicating the same tone data in two unrelated places if it can be derived from existing genre config.
- If importing genre config into genre-profile creates circular dependency risk, use a small mapping local to genre-profile and document why.
- Keep the rendered text compact: tone mix should guide prose, not dominate the prompt.

## Acceptance Criteria

- [x] Rendered Narrator role/prompt includes tone guidance for Space Opera.
- [x] At least one other genre fixture proves the guidance changes by genre.
- [x] Tone guidance includes proportions or clear relative weights, not just adjectives.
- [x] Author seed tone rules still compile.
- [x] No prompt cache/dynamic leak assertion fails.

## Completion Evidence

Completed on 2026-05-18.

- Added genre-profile tone guidance derived from each genre bible's `## Tone` section.
- Rendered compact tone mix guidance in the Narrator role prompt.
- Covered by `fixtures/sf2/replay/narrator-tone-space-opera.json` and `fixtures/sf2/replay/narrator-tone-grimdark.json`.

## Fixture Expectations

Add or update prompt-surface fixtures.

Suggested fixture names:

```bash
fixtures/sf2/replay/narrator-tone-space-opera.json
fixtures/sf2/replay/narrator-tone-grimdark.json
```

They should assert that the rendered Narrator prompt contains the correct tone proportions for the selected genre.

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/narrator-tone-space-opera.json
npm run sf2:replay -- fixtures/sf2/replay/narrator-tone-grimdark.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Rebalancing the actual tone ratios.
- Rewriting genre bibles.
- Changing setup data model unless necessary to expose existing tone data.
