# Genre Config System

Developer reference for the Storyforge genre configuration layer.

## Overview

Storyforge runs 6 active genres on a single game engine. Each genre is a complete game: unique species, character classes, opening hooks, visual themes, and prompt sections that shape the AI game master's voice and world. The engine is genre-agnostic; all genre-specific behavior flows through `GenreConfig`.

Active genres: Space Opera, Fantasy, Grimdark, Cyberpunk, Noir, Epic Sci-Fi.
Stubbed (not yet playable): Western, Zombie Apocalypse, Post-Atomic Wasteland, Cold War.

All genre configs live in `lib/genres/`. The registry and shared types are in `lib/genres/index.ts`.

## GenreConfig Interface

Defined in `lib/genres/index.ts`. Every genre must satisfy this interface.

### Identity

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Genre` | Unique slug, e.g. `'space-opera'`. Union type of all genre IDs. |
| `name` | `string` | Display name, e.g. `'Space Opera'`. |
| `tagline` | `string` | One-line pitch shown on genre selection screen. |
| `available` | `boolean` | Whether the genre is playable. Stubs set this to `false`. |

### Species and Classes

| Field | Type | Description |
|-------|------|-------------|
| `species` | `Species[]` | Playable species/origins for the genre. See [Species Type](#species-type). |
| `speciesLabel` | `string` | UI label for the species picker, e.g. `'Origin'`, `'Species'`, `'Background'`. |
| `classes` | `CharacterClass[]` | Playable classes. See [CharacterClass Type](#characterclass-type). |

### Theme

| Field | Type | Description |
|-------|------|-------------|
| `theme` | `GenreTheme` | Full visual identity: colors, fonts, background effect. See [GenreTheme](#genretheme). |

### World Labels

These strings let the engine speak in the genre's vocabulary without conditional logic.

| Field | Type | Description |
|-------|------|-------------|
| `currencyName` | `string` | Full name of currency, e.g. `'credits'`, `'gold'`, `'caps'`. |
| `currencyAbbrev` | `string` | Short form, e.g. `'cr'`, `'gp'`, `'$'`. |
| `partyBaseName` | `string` | What the party's base/home is called: `'Ship'`, `'Camp'`, `'Office'`. |
| `settingNoun` | `string` | Generic world reference: `'galaxy'`, `'realm'`, `'city'`. |
| `companionLabel` | `string` | UI label for companions panel: `'Crew'`, `'Retainers'`, `'Companions'`. |
| `notebookLabel` | `string` | Label for the player notebook tab. |
| `intelTabLabel` | `string` | Label for the intel/investigation tab. |
| `intelNotebookLabel` | `string` | Label for intel entries, e.g. `'Evidence'`, `'Dossier'`. |
| `intelOperationLabel` | `string` | Label for intel operations, e.g. `'Operation'`, `'Case'`. |
| `explorationLabel` | `string` | Label for exploration/location entries. |
| `heatLabel` | `string?` | Genre-specific name for the heat system. Defaults to `'Heat'` if omitted. |
| `initialChapterTitle` | `string` | Title for Chapter 1 when a new game starts. |

### Prompt Sections

The `promptSections` object contains strings injected into specific positions in the system prompt. This is how the genre shapes AI behavior without touching engine code.

| Field | Type | Injected Into |
|-------|------|---------------|
| `role` | `string` | Core system prompt. Defines who the GM is in this genre. |
| `setting` | `string` | Core system prompt. World description, factions, tone. |
| `vocabulary` | `string` | Core system prompt. Genre-specific terms the GM should use. |
| `toneOverride` | `string` | Core system prompt. Narrative voice and style constraints. |
| `assetMechanic` | `string` | Situation modules. Rules for the party's primary asset (ship, base, office). |
| `traitRules` | `string` | Situation modules. How class traits work mechanically. |
| `consumableLabel` | `string` | Situation modules. What consumables are called in this genre. |
| `tutorialContext` | `string` | Tutorial/onboarding module. Genre-specific guidance for new players. |
| `npcVoiceGuide` | `string` | NPC generation. How NPCs should speak, dialect, register. |
| `buildAssetState` | `((ship: ShipState, shipName: string) => string) \| null` | Dynamic asset state builder. Returns a prompt string describing current asset condition. `null` if the genre has no trackable asset. |
| `investigationGuide` | `string` | Investigation overlay. Rules for clue discovery, evidence mechanics. |

There is also a legacy `systemPromptFlavor` object (`role`, `setting`, `vocabulary`, `tutorialContext`) that duplicates a subset of `promptSections`. New genres should populate `promptSections` only.

### Cohesion and Lore

| Field | Type | Description |
|-------|------|-------------|
| `cohesionGuide` | `string?` | Genre-specific cohesion triggers that override the generic +1/-1 rules. |
| `loreAnchors` | `string[]?` | Compact world facts shipped every turn for complex genres (e.g. Epic Sci-Fi). Keeps the GM grounded when the world is dense. |

### Opening Hooks

| Field | Type | Description |
|-------|------|-------------|
| `openingHooks` | `(string \| HookObject)[]` | Scenario starters shown at game creation. All 133 hooks across 6 genres now include frame + arc. |
| `locationNames` | `string[]` | Default location names available in the genre world. |

Hooks can be plain strings or objects with:
- `hook` -- the scenario text.
- `title` -- optional display title for the hook selector.
- `classes` -- optional array of class IDs. When present, the hook only appears if the player chose one of these classes. This enables class-tailored scenarios (e.g. an Envoy-only political dilemma in Epic Sci-Fi).
- `frame` -- optional `{ objective: string; crucible: string }`. Pre-seeds the chapter frame so Claude starts with a tight chapter-1 goal instead of improvising. Objective scoped for ~20-25 turns.
- `arc` -- optional `{ name: string; episode: string }`. Pre-seeds the first story arc with episode 1 marked active. Gives Claude a broader narrative thread from turn 1.

Universal hooks (no `classes` filter) are available to all classes.

## Species Type

```typescript
interface Species {
  id: string            // unique slug, e.g. 'vrynn'
  name: string          // display name
  description: string   // one-line summary shown in picker
  lore: string          // full lore paragraph, injected into GM context
  startingContacts?: StartingContact[]
}
```

### Starting Contacts

Each species can define contacts that are auto-created as NPCs when a game initializes. This gives species mechanical weight beyond flavor: a Vrynn starts with a diaspora information broker, a Korath starts with a dock boss.

```typescript
interface StartingContact {
  role: string              // descriptive role, e.g. 'trade agent', 'mentor'
  disposition: 'hostile' | 'wary' | 'neutral' | 'favorable' | 'trusted'
  description: string       // who they are, narrative context
  affiliation?: string      // faction name, e.g. 'The Synod'
  npcRole?: 'crew' | 'contact' | 'npc'  // defaults to 'contact'
}
```

The GM names these contacts during game initialization. The player sees them as pre-existing relationships in their NPC panel.

## CharacterClass Type

```typescript
interface CharacterClass {
  id: string
  name: string
  concept: string           // one-line class fantasy
  description?: string      // longer explanation
  primaryStat: string       // e.g. 'CHA', 'STR'
  proficiencies: string[]   // skill proficiencies
  stats: {
    STR: number; DEX: number; CON: number
    INT: number; WIS: number; CHA: number
  }
  startingInventory: InventoryItem[]
  startingCredits: number
  startingHp: number
  startingAc: number
  hitDieAvg: number         // avg HP per level (before CON mod)
  trait: Trait
}
```

### Stat Allocation

Each class defines a fixed stat array. The six stats follow D&D conventions (STR/DEX/CON/INT/WIS/CHA). These drive skill checks and combat modifiers in the engine.

### Hit Die Average

Determines HP scaling. Convention:
- Tanks: 6
- Mixed/hybrid: 5
- Faces/casters: 4

### Trait

```typescript
interface Trait {
  name: string
  description: string
  usesPerDay: number
  usesRemaining: number
}
```

Each class gets exactly one trait: a signature ability with limited daily uses. Traits are the primary mechanical differentiator between classes of the same stat archetype.

## GenreTheme

Controls the full visual identity. Applied at runtime via CSS custom properties.

Key fields:
- `logo` -- genre logo asset path.
- `fontNarrative`, `fontHeading`, `fontSystem` -- font families for narrative text, headings, and UI.
- `fontScale?` -- multiplier for base font sizes (1.0 default, 0.9 = 90%).
- `backgroundEffect` -- one of `'starfield'`, `'mist'`, `'static'`, `'drift'`. Handled by CSS via `[data-genre]` selectors. Mist is color-differentiated per genre: Fantasy = warm amber, Grimdark = ashen red, Noir = cold grey-blue. Space Opera gets starfield + grid overlay. Epic Sci-Fi gets drift aurora (purple/gold). Cyberpunk gets static scanlines (green/amber).
- Color tokens: `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `narrative`, `meta`, `success`, `warning`, `tertiary`, plus foreground variants.
- Glow tokens: `titleGlow`, `actionGlow`, `actionGlowHover`.
- Scrollbar: `scrollbarThumb`, `scrollbarThumbHover`.

`applyGenreTheme()` in `index.ts` maps every theme field to a CSS custom property on the document root. Font properties go on `document.body`. The genre ID is set as `data-genre` on the root element.

## How Prompt Sections Work

The engine builds a system prompt from multiple layers. Genre prompt sections slot into specific positions:

**Core layer** (every turn):
- `promptSections.role` -- defines the GM persona.
- `promptSections.setting` -- world context and factions.
- `promptSections.vocabulary` -- genre-specific terminology.
- `promptSections.toneOverride` -- narrative voice constraints.

**Situation modules** (context-dependent, assembled per turn):
- `promptSections.traitRules` -- how class traits resolve mechanically.
- `promptSections.assetMechanic` -- ship/base/office management rules.
- `promptSections.consumableLabel` -- what to call consumable items.
- `promptSections.tutorialContext` -- extra guidance for early-game turns.
- `promptSections.npcVoiceGuide` -- dialect and register for NPC dialogue.

**Investigation overlay** (when investigation mode is active):
- `promptSections.investigationGuide` -- clue discovery rules, evidence mechanics.

**Dynamic asset state** (when the genre has a trackable asset):
- `promptSections.buildAssetState(ship, shipName)` -- returns a prompt string describing the current asset condition (hull integrity, fuel, etc.). Returns `null`-function for genres without asset tracking.

The engine never checks genre IDs to decide behavior. All genre-specific prompt content flows through these strings.

## Adding a New Genre

### 1. Create the config file

Create `lib/genres/{genre-id}.ts`. Import the shared types:

```typescript
import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'
```

### 2. Define species

Create a `Species[]` array. Each species needs:
- Unique `id` slug.
- `lore` that gives the GM enough context to roleplay species-specific interactions.
- `startingContacts` that give species mechanical differentiation (different species = different starting network).

### 3. Define classes

Create a `CharacterClass[]` array. Each class needs:
- Balanced `stats` (follow existing genres as benchmarks).
- A unique `trait` with `usesPerDay` tuned to the genre's pacing.
- `startingInventory` with `InventoryItem[]` objects.
- `hitDieAvg` following the tank/hybrid/face convention.
- `proficiencies` that make sense for the class fantasy.

### 4. Define opening hooks

Mix universal hooks (available to all classes) with class-specific hooks:

```typescript
openingHooks: [
  { hook: 'A universal scenario...', title: 'The Hook Title' },
  { hook: 'A class-specific scenario...', title: 'Class Hook', classes: ['warrior'] },
]
```

Aim for 3-4 universal hooks plus 2-3 per class.

### 5. Define the theme

Fill out a complete `GenreTheme` object. Pick a `backgroundEffect` from the four options. Set three font families. Define all color tokens. Test contrast between `foreground`/`background` and `card`/`cardForeground` pairs.

### 6. Fill prompt sections

Write all `promptSections` strings. These are the most important part of the genre. The `role` and `setting` sections define the entire feel of the game. `toneOverride` controls narrative voice. `traitRules` and `assetMechanic` drive gameplay mechanics.

If the genre has a trackable asset (ship, base, etc.), implement `buildAssetState` as a function. Otherwise set it to `null`.

### 7. Set world labels

Fill in `currencyName`, `currencyAbbrev`, `partyBaseName`, `settingNoun`, `companionLabel`, and all tab/panel labels. These propagate throughout the UI automatically.

### 8. Add location names

Populate `locationNames` with default locations for the genre world.

### 9. Register in index.ts

1. Import the config: `import myGenreConfig from './my-genre'`
2. Add to the `genreConfigs` record.
3. Add to the `genres` array with `available: true`.
4. Add the genre ID to the `Genre` union type.
5. Remove any existing stub for this ID.

### 10. Create character portraits

Add portrait assets for each species/class combination. These are loaded by the character creation UI.
