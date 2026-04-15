# StoryForge Code Review

## Codebase Overview

~14,000 lines across lib (~6,400) and components/API (~8,000). The two largest files — `game-screen.tsx` (1,891 lines) and `burger-menu.tsx` (2,041 lines) — account for nearly half of the UI complexity. The lib layer has similar concentration in `tool-processor.ts` (1,477 lines) and `system-prompt.ts` (1,731 lines).

---

## 1. Monolithic Components (HIGH priority)

### `game-screen.tsx` — 26 `useState` hooks, 1,891 lines

This component manages game state, message streaming, dice rolls, inspiration, chapter closing, token tracking, audit logic, quick actions, and error handling — all in one file.

**Key problems:**

- **26 `useState` hooks** (lines 58-88) create cascade updates that are hard to reason about. A single action like a dice roll touches `rollPrompt`, `dicePhase`, `diceDisplay`, `rolledValue`, `rawRolls`, `selectedItemBonus`, and `inspirationOffered`.
- **`streamRequest` callback is 300+ lines** (lines 176-511) — parses streaming JSON, handles 7+ event types, manages state mutations during streaming, and does scene boundary detection. Untestable as-is.
- **State mutation in a closure** — line ~945 mutates `rollPrompt.modifier` directly inside a `useCallback`, which is dangerous.
- **No `React.memo()` on child components** — every state change re-renders the entire tree.

**Recommended refactors:**

- Extract a `useRollLogic` custom hook (encapsulate 7 roll-related states + handlers, ~-300 lines)
- Extract `parseStreamResponse` as a pure utility function for testability
- Replace the 26 `useState` calls with a `useReducer` for centralized state transitions
- Wrap child components (`BurgerMenu`, `ActionBar`, etc.) in `React.memo()`

### `burger-menu.tsx` — 2,041 lines, nested function components

All 5 tabs (Character, World, Intel, Ship, Chapters) are defined as nested functions inside one file. These nested functions are **redefined on every render** of `BurgerMenu`.

**Key problems:**

- **19+ props** passed in, then further drilled into sub-panels
- **Nested function components** (`CharacterSheet`, `WorldPanel`, `IntelPanel`, `ChaptersPanel`) get recreated each render — no memoization possible
- **Inline IIFE computing token stats** (lines 237-301) bloats the component

**Recommended refactors:**

- Split each tab into its own file under `components/game/menu/`
- Extract the token stats IIFE into a `TokenUsageStats` component
- Create a `useMenuTabs` custom hook for tab state management

---

## 2. Duplicated Logic (HIGH priority)

### Snake_case to camelCase mapping — scattered across `tool-processor.ts`

The codebase maps between snake_case (Claude tool input) and camelCase (TypeScript GameState) via 15+ manual field conversions sprinkled through `applyCharacterChanges()`, `applyWorldChanges()`, and `applyCombatChanges()`.

**Fix:** Create a shared field-mapping constant or generate both schemas from one source of truth.

### NPC fuzzy matching — duplicated 3 times

The same "exact name, startsWith, or endsWith lowercase" matching logic appears in:

- `game-data.ts:253` — `deduplicateNpcs()`
- `tool-processor.ts:322-325` — `add_npcs`
- `tool-processor.ts:365-369` — `update_npcs`

**Fix:** Extract a shared `findNpcByName(npcs, name)` utility.

### Notebook clue deduplication — 2 near-identical code paths

`tool-processor.ts:860-884` has two paths (clue_id provided vs. not) with overlapping fuzzy-match logic.

---

## 3. Large Files That Should Be Split (MEDIUM priority)

### `tool-processor.ts` (1,477 lines)

A single file handling all state mutations. The repeated pattern — `if (input.add_X) { ... } if (input.update_X) { ... }` — could be refactored into a generic `upsertEntity<T>()` helper.

**Recommended structure:**

```
tool-processor.ts         → dispatcher (applyToolResults)
├── apply-character.ts
├── apply-world.ts
├── apply-combat.ts
└── apply-narrative.ts
```

### `system-prompt.ts` (1,731 lines)

Contains hardcoded magic numbers for turn warning thresholds (12, 15, 16, 20, 25), disposition consequence text duplicated from other locations, and a complex consecutive-roll pressure gauge loop that should be a utility function.

### `tools.ts` (845 lines)

The `commit_turn` schema is a single massive object nested 7 levels deep. Could be composed from smaller schema fragments.

---

## 4. API Route Issues (MEDIUM priority)

### `app/api/game/route.ts` (541 lines)

- **No retry limit** — if Claude keeps failing with overloaded errors, the code retries indefinitely. Should cap at 3 retries.
- **No exponential backoff** — always waits 12 seconds. Should increase (5s → 10s → 20s).
- **Duplicated retry logic** — the retry block (lines 495-521) copy-pastes the entire initial request flow. Should be extracted to a helper.
- **Loose Zod validation** — `.passthrough()` on every schema object defeats the purpose of request validation.
- **No `StreamEvent` type discrimination** — no shared union type ensures the client and server agree on event shapes.

---

## 5. Type System Issues (MEDIUM priority)

### Redundant types in `types.ts` (637 lines)

- `RollDisplayData` (lines 319-336) and `RollRecord` (lines 348-367) are nearly identical — consolidation candidate.
- Deprecated fields (`connected[]` on `Clue`, `clueIds[]` on `ClueConnection`) kept for migration compatibility create 50+ lines of migration code in `game-data.ts`.

### Missing reusable type aliases

`DispositionTier` (`'hostile' | 'wary' | 'neutral' | 'favorable' | 'trusted'`) is used 15+ times across the codebase as an inline string union instead of a shared type alias.

---

## 6. State Persistence & Migrations (LOW priority)

### `game-data.ts` — manual migrations (lines 269-385)

50+ lines of explicit `if (!state.X) { state.X = default }` checks with no version tracking. A version-based migration system would be cleaner:

```typescript
const migrations = [
  { version: 2, apply: (s) => ({ ...s, world: { ...s.world, tensionClocks: [] } }) },
  // ...
]
```

---

## 7. Genre Config Boilerplate (LOW priority)

5,172 lines across 6 genre files with identical structure. Each defines 30+ CSS custom properties with no shared base theme. Prompt sections (role, setting, vocabulary, traitRules) follow the same shape but are repeated 6 times. Could benefit from a base config with genre-specific overrides.

---

## 8. Performance Concerns (LOW priority but easy wins)

- **No `React.memo()`** on `BurgerMenu`, `ActionBar`, or `DiceRollModal` — all re-render on any parent state change
- **Inline closures in JSX** (`onClick={() => fn(x)}`) create new references every render
- **Origin counter detection** in `tool-processor.ts:505-578` uses hardcoded regex patterns and 5 genre-specific maps with 25+ species mappings — configuration-driven rules would be cleaner and more maintainable

---

## Summary: Priority Matrix

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| **HIGH** | Extract `useRollLogic` hook from game-screen | -300 lines, testable | Medium |
| **HIGH** | Split burger-menu tabs into files | -2000 line file, memoizable | High |
| **HIGH** | Extract streaming parser as pure function | Testable, clearer | Low |
| **HIGH** | Deduplicate NPC matching (3 copies) | Single source of truth | Low |
| **MEDIUM** | Split tool-processor into domain modules | Maintainability | Medium |
| **MEDIUM** | Add retry limit + backoff to API route | Prevent infinite retries | Low |
| **MEDIUM** | Consolidate snake/camelCase mappings | Reduce 15+ manual mappings | Medium |
| **MEDIUM** | Add `StreamEvent` discriminated union type | Type safety | Low |
| **LOW** | Version-based migration system | Cleaner persistence | Medium |
| **LOW** | `React.memo()` on child components | Performance | Low |
| **LOW** | Extract magic numbers as named constants | Readability | Low |
