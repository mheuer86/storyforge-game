# SF2 Setup Compiler For V1 Hooks And Playbooks

Status: implemented
Type: AFK

## What to build

Replace the small hand-authored SF2 seed dropdown with a deterministic setup path that lets SF2 start from the existing V1 genre/origin/playbook/opening-hook data.

The implementation should not bypass SF2's Arc Author. The desired startup path is:

1. player chooses genre, origin, playbook, and eligible hook
2. code compiles that selection into an `AuthorInputSeed`
3. SF2 creates the initial state and player from the selected playbook
4. Arc Author receives the compiled seed and authors the campaign arc pressure field
5. Chapter Author receives state with the arc plan and authors Chapter 1
6. Narrator opens the authored Chapter 1 as it does today

This lets all existing hooks/playbooks become available in SF2 while preserving the current SF2 architecture: hook -> Arc Author pressure field -> Chapter Author Ch1 setup -> Narrator opening.

## Current problem

`/play/v2` currently selects from `SF2_BOOTSTRAP_SEED_OPTIONS`, which is a small registry of hand-written `AuthorInputSeed` entries in `lib/sf2/game-data.ts`.

V1 already has a richer setup system:

- `components/setup/character-setup.tsx`
- `lib/opening-hooks.ts`
- `lib/game-data.ts`
- `lib/genres/*`

Those V1 hooks often carry structured metadata that SF2 should preserve:

- `title`
- hook body
- `origins`
- `classes`
- `frame.objective`
- `frame.crucible`
- `arc.name`
- `arc.episode`
- `startingCounters`
- `startingCrew`

Do not reduce this to raw hook prose. Arc Author needs the hook pressure and the optional objective/first-episode hints to build a useful multi-chapter arc.

## Current files to inspect

- `app/play/v2/page.tsx`
- `components/setup/character-setup.tsx`
- `lib/opening-hooks.ts`
- `lib/game-data.ts`
- `lib/genres/index.ts`
- `lib/genres/*`
- `lib/sf2/game-data.ts`
- `lib/sf2/author/payload.ts`
- `app/api/sf2/arc-author/route.ts`
- `app/api/sf2/author/route.ts`
- `lib/sf2/arc-author/prompt.ts`
- `lib/sf2/arc-author/transform.ts`
- `lib/sf2/author/chapter-opening.ts`
- `lib/sf2/types.ts`
- `lib/sf2/persistence/normalize.ts`
- `components/sf2/play-shell.tsx`

## Suggested module shape

Add a compiler module such as:

- `lib/sf2/setup/compile-seed.ts`
- `lib/sf2/setup/options.ts`
- optional `lib/sf2/setup/types.ts`

The compiler should expose functions like:

- list selectable SF2 genres from `getGenreConfig`
- list visible origins for a genre
- list playbooks for an origin, using `config.playbooks?.[originId] ?? config.classes`
- list eligible opening hooks with `getEligibleOpeningHooks(config, originId, playbook)`
- compile a selected combination into an `AuthorInputSeed`
- build `Sf2Player` from the selected playbook
- create a stable selection id or store enough metadata to reconstruct the seed on reload

Exact names can vary, but ownership should be clear. Avoid adding more one-off seeds to `lib/sf2/game-data.ts` for every hook/playbook combination.

## Seed compilation rules

For a selected genre/origin/playbook/hook:

- `genreId` / `genreName` come from the genre config.
- `originId` / `originName` come from the selected origin.
- `playbookId` / `playbookName` come from the selected playbook.
- `hook.title` should be the hook title if present, otherwise the genre's initial chapter title or a stable derived title.
- `hook.premise` should be the hook body.
- `hook.crucible` should prefer `hook.frame.crucible`; if absent, derive a compact crucible from the hook body without inventing a fixed outcome.
- `hook.objective` should come from `hook.frame.objective` when present.
- `hook.arcName` should come from `hook.arc.name` when present.
- `hook.firstEpisode` should come from `hook.arc.episode` when present.
- `pcCapabilities` should use the same shape as `compileAuthorInputSeed(...)` currently derives from the selected playbook.
- `worldRules`, `toneRules`, `npcRules`, and `onboardingRules` must be generated from genre config data, not copied from the old seven hand-written seeds for every combination.

The compiler may still use a small per-genre adapter table for SF2-specific world/tone/onboarding wording where raw V1 genre fields are too broad. If it does, keep the adapter data centralized and reusable by all hooks in that genre.

## Initial state requirements

Update `createInitialSf2State(...)` so it can accept a full setup selection, not only `seedId`.

Preserve compatibility with existing saved games and existing seed ids:

- current hand-authored `SF2_BOOTSTRAP_SEED_OPTIONS` should continue to load
- existing `state.meta.seedId` should remain valid
- add any new meta fields additively, e.g. selected hook id/title, origin/playbook/genre ids, or serialized setup selection
- persistence normalization should tolerate missing new fields

Do not change the Ch1 Author/Narrator flow. `generateArcIfNeeded(...)` should still run before `generateChapter1IfNeeded(...)` calls the Chapter Author.

## UI requirements

Replace or extend the `/play/v2` pre-campaign screen so a player can choose:

- genre
- origin/species
- playbook/class
- eligible opening hook
- character name

Use the existing V1 setup data, but keep the UI visually consistent with the current SF2 start screen. This ticket does not need a full design overhaul. A functional setup flow is enough if it is clean and responsive.

When origin or playbook changes, the hook list must update to only eligible hooks. If no hook is eligible, show a clear disabled state rather than crashing.

## Refinement notes from code inspection

Current concrete surfaces:

- `/play/v2` is a large client page in `app/play/v2/page.tsx`. It currently owns setup state (`selectedSeedId`, `selectedSeed`), campaign creation, Arc Author generation, Chapter Author generation, Narrator streaming, persistence, and export actions.
- The current seed registry and player factory live in `lib/sf2/game-data.ts`. `createInitialSf2State(...)` only accepts `seedId` today.
- `compileAuthorInputSeed(...)` in `lib/sf2/author/payload.ts` calls `getSf2SeedForState(state).seed`; this is the key path that must return the compiled selected seed for fresh Ch1 campaigns.
- Existing save normalization in `lib/sf2/persistence/normalize.ts` calls `createInitialSf2State({ campaignId, playerName, seedId })` and then deep-merges the persisted state. New meta/setup-selection fields must be optional and additive.
- V1 hook eligibility is already pure in `lib/opening-hooks.ts`: use `getEligibleOpeningHooks(config, originId, playbook)`.
- Genre data comes from `lib/genres/index.ts` / `getGenreConfig(...)`; some genres use `config.playbooks?.[originId]`, otherwise `config.classes`.
- `OpeningHookObject` metadata in genre files includes `title`, `frame.objective`, `frame.crucible`, `arc.name`, `arc.episode`, and sometimes `startingCounters` / `startingCrew`.

Recommended implementation details:

- Add `lib/sf2/setup/options.ts` and `lib/sf2/setup/compile-seed.ts`.
- Define a serializable `Sf2SetupSelection` type with `genreId`, `originId`, `playbookId`, `hookId` or stable hook key, and optional `characterName`.
- Use a stable hook key derived from hook title plus a compact hash/slug of hook text; do not rely on array index alone because hook arrays can grow.
- Keep `SF2_BOOTSTRAP_SEED_OPTIONS` and seed ids intact. Add a path where `createInitialSf2State(...)` accepts either `{ seedId }` or `{ setupSelection }`; old saves and old fixtures should still behave exactly as before.
- Store selected setup metadata additively on `state.meta`, for example `setupSelection`, `hookId`, `hookTitle`, or similar. `getSf2SeedForState(...)` should prefer a compiled setup seed when those fields exist, otherwise fall back to the seed registry.
- Compile `pcCapabilities` from the selected playbook using the same effective shape as `derivePcCapabilities(...)`; avoid duplicating drift-prone special cases.
- Build `Sf2Player` directly from the selected playbook using the existing `buildPlayerFromSeed(...)` behavior: stats, HP, AC, credits, proficiencies, inventory tags, trait uses, inspiration, exhaustion.
- For `worldRules`, `toneRules`, `npcRules`, and `onboardingRules`, use a small per-genre adapter only where needed. Put adapter data in the setup compiler module, not in the UI page.
- Add diagnostics on campaign creation that include selected genre/origin/playbook/hook ids and title. The browser smoke can then confirm the selected seed metadata without inspecting IndexedDB manually.

UI implementation notes:

- Keep the current SF2 start screen shape but replace the single seed `<select>` with four dependent selects: genre, origin, playbook, hook, plus character name.
- When genre changes, default to the first visible origin, then the first playbook for that origin, then the first eligible hook.
- When origin changes, recompute playbooks and hooks.
- When playbook changes, recompute eligible hooks.
- Disable `Create campaign` when there are no eligible hooks.

Replay/compiler fixture surfaces:

- `scripts/sf2-replay.ts` already has `expected.authorInputSeed` assertions against `compileAuthorInputSeed(...)`; extend that assertion if needed to verify selected hook title/objective/arc metadata.
- Prefer adding pure compiler expectations to `scripts/sf2-replay.ts` for:
  - option listing and hook filtering
  - selected hook metadata preservation
  - selected playbook player initialization
- Avoid live model calls in compiler fixtures. They should instantiate state with `createInitialSf2State(...)`, call pure compiler helpers, and assert JSON fragments/fields.

## Required behavior to preserve

- Arc Author still authors the arc plan before Chapter Author runs.
- Chapter Author still derives Chapter 1 from `state.campaign.arcPlan`.
- Existing seven SF2 bootstrap seeds continue to work for fixtures and manual validation.
- Existing save compatibility is preserved.
- Existing player stats, HP, AC, credits, proficiencies, inventory, traits, inspiration, and exhaustion initialization remain equivalent to selected playbook data.
- Existing genre bibles and genre-profile behavior remain unchanged.
- No prompt text edits are required.
- No live model calls in automated tests.

## Non-goals

- Do not restore V1 witness marks.
- Do not implement passive perception.
- Do not add failed-investigation/red-herring machinery.
- Do not add roll drought or pacing-pressure restoration.
- Do not manually write one SF2 seed per hook.
- Do not bypass Arc Author by feeding `frame.objective` directly into Chapter Author as a fixed scene.

## Acceptance criteria

- [x] SF2 has a deterministic setup compiler from V1 genre/origin/playbook/hook data to `AuthorInputSeed`.
- [x] `/play/v2` lets a player choose genre, origin, playbook, and eligible hook before campaign creation.
- [x] The selected hook's `frame` and `arc` metadata are preserved in the compiled seed where available.
- [x] The selected playbook's stats, proficiencies, inventory, trait, credits, HP, AC, and playbook profile initialize the SF2 player correctly.
- [x] `compileAuthorInputSeed(state, null)` returns the compiled selected seed for fresh Ch1 campaigns.
- [x] Arc Author still receives the compiled seed and emits an arc plan before Chapter Author runs.
- [x] Existing hand-authored seed ids still resolve for old saves and existing fixtures.
- [x] Add pure fixtures or assertions covering at least:
  - Hegemony / Synod / Seeker / an eligible hook
  - Space Opera / Human / Driftrunner / an eligible hook
  - Fantasy / Human / Seeker / an eligible hook
  - a hook with `frame` and `arc` metadata
  - a hook filtered out by incompatible origin/playbook
- [x] `npm run build` passes.

## Verification

Recommended checks:

```bash
npm run build
npm run sf2:replay -- fixtures/sf2/replay
```

Also do a browser smoke on `/play/v2`:

- choose a non-default genre/origin/playbook/hook
- create campaign
- run Arc Author + Chapter Author
- confirm opening prose streams
- confirm diagnostics show the selected seed/hook metadata

If browser smoke cannot be run, state that explicitly and provide the focused compiler/build checks that did run.

## Blocked by

None - can start immediately.

## Notes for agent

This ticket is broader than a pure refactor because it changes the creation surface, but it should keep the runtime architecture stable. The main trap is losing V1 hook metadata by treating hooks as plain strings. Preserve the structured fields and let Arc Author decide the playable scenario shape.

## Implementation note

Implemented on 2026-05-16 with `lib/sf2/setup/` compiler modules, additive setup metadata in SF2 state, `/play/v2` setup UI replacement, and focused compiler replay coverage in `fixtures/sf2/replay/setup-compiler-v1-hooks.json`.
