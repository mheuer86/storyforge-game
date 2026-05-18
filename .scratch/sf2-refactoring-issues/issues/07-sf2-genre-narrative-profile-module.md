# SF2 Genre Narrative Profile Module

Status: implemented
Type: AFK

## Implementation status

Implemented. The SF2 genre narrative profile module now lives under:

- `lib/sf2/genre-profile/`

`lib/sf2/genre-examples.ts` remains as a compatibility shim, and `lib/sf2/narrator/prompt.ts` keeps compatibility re-exports for current prompt callers.

## What to build

Create a deeper SF2 Genre Narrative Profile Module that consolidates existing genre bibles and cross-role genre examples behind one small Interface.

Today, SF2 genre identity is split:

- genre bibles live inside `lib/sf2/narrator/prompt.ts`
- cross-role examples live in `lib/sf2/genre-examples.ts`
- Author, Narrator, retry nudges, and Arc Author each import or embed only part of the genre surface

The V1-quality pass already improved per-genre examples. This ticket should not add more genre writing. It should make the existing genre identity easier to find, test, and reuse.

## Current files to inspect

- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/genre-examples.ts`
- `lib/sf2/author/prompt.ts`
- `lib/sf2/author/retry.ts`
- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/arc-author/prompt.ts`
- `scripts/sf2-check-prompt-genre-leaks.cjs`
- `.scratch/sf2-narrative-quality-pass/STATUS-RECONCILIATION.md`

## Target Module

Add a Module under `lib/sf2/genre-profile/`. Suggested files:

- `lib/sf2/genre-profile/types.ts`
- `lib/sf2/genre-profile/profiles.ts`
- `lib/sf2/genre-profile/index.ts`

Suggested Interface:

```ts
export interface Sf2GenreNarrativeProfile {
  id: string
  bible: string
  examples: Sf2GenreExamples
}

export interface Sf2GenreExamples {
  entityBoundTriggers: [string, string, string]
  sceneCoupledTriggers: [string, string]
  pcMisfitChapterRule: string
  npcWorkedExample: { name: string; role: string; body: string }
  quickActionExamples: string[]
  continuationEscalationExample: string
}

export function getSf2GenreNarrativeProfile(genreId?: string): Sf2GenreNarrativeProfile
export function getSf2BibleForGenre(genreId?: string): string
export function getSf2GenreExamples(genreId?: string): Sf2GenreExamples
```

The exact file names may vary. The key is that callers can ask for one profile and get the genre bible plus all genre examples.

## Required behavior to preserve

- `getSf2BibleForGenre('hegemony')` returns the same Hegemony bible text as today.
- `getSf2BibleForGenre('space-opera')` returns the same Space Opera bible text as today.
- `getSf2BibleForGenre('fantasy')` returns the same Fantasy bible text as today.
- `getSf2BibleForGenre('cyberpunk')` returns the same Cyberpunk bible text as today.
- `getSf2BibleForGenre('grimdark')` returns the same Grimdark bible text as today.
- `getSf2BibleForGenre('noire')` returns the same Noir bible text as today.
- Unknown or missing genre id keeps the current fallback behavior: Hegemony for bibles/examples unless code already intentionally requests `generic`.
- `getSf2GenreExamples(genreId)` returns the same example object values as today for all current genres.
- Author prompt output should only change by import location, not by text.
- Narrator prompt output should only change by import location, not by text.
- Author retry nudges should keep the same good/bad trigger examples.
- `npm run sf2:check-prompt-genre-leaks` should still pass.

## Compatibility requirements

Reduce blast radius with compatibility exports.

Acceptable implementation approaches:

- Move `getSf2BibleForGenre` and `getSf2GenreExamples` into the new Module, then update imports.
- Or move implementation into the new Module and leave `lib/sf2/genre-examples.ts` as a re-export shim.
- If `lib/sf2/narrator/prompt.ts` currently exports `getSf2BibleForGenre`, either keep a re-export there temporarily or update all imports in one narrow pass.

Do not make unrelated prompt copy edits while moving the text.

## Suggested implementation steps

1. Create the `genre-profile` Module and type definitions.
2. Move the existing `Sf2GenreExamples` type and all `EXAMPLES_BY_GENRE` values into the new Module without wording changes.
3. Move the existing SF2 bible constants out of `lib/sf2/narrator/prompt.ts` into the new Module without wording changes.
4. Export `getSf2GenreNarrativeProfile`, `getSf2BibleForGenre`, and `getSf2GenreExamples`.
5. Update Author, Narrator, and retry imports.
6. Keep compatibility re-exports where they reduce churn.
7. Run genre leak check, replay, and build.

## Non-goals

- Do not add new genre bible content.
- Do not rewrite existing genre examples.
- Do not attempt full V1 prompt parity.
- Do not change Author/Narrator role instructions.
- Do not change cache marker placement.
- Do not change player-facing genre UI, theme tokens, or `lib/genre-config.ts`.
- Do not merge V1 genre config into SF2 in this ticket.

## Acceptance criteria

- [ ] There is a `lib/sf2/genre-profile/` Module with a small public Interface.
- [ ] Existing SF2 genre bibles are no longer defined inside `lib/sf2/narrator/prompt.ts`.
- [ ] Existing SF2 genre examples are available through the genre profile Module.
- [ ] Author and Narrator prompt builders consume the profile Module or its compatibility re-exports.
- [ ] Existing text output for current bibles and examples is preserved.
- [ ] Missing/unknown genre fallback remains compatible.
- [ ] `npm run sf2:check-prompt-genre-leaks` passes.
- [ ] `npm run sf2:replay -- fixtures/sf2/replay` passes.
- [ ] `npm run build` passes.

## Verification

Run:

```bash
npm run sf2:check-prompt-genre-leaks
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, state why and at least run the genre leak check plus build.

## Blocked by

None - can start immediately.

## Comments

This ticket deliberately preserves current prompt content. It improves Locality: one Module owns SF2 genre narrative identity, while role prompts decide how to use that identity.
