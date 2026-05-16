# Rules Engine

Client-side rules engine that runs after each `commit_turn` is applied. Evaluates genre-specific rules, increments persistent counters, applies threshold-based state mutations, detects roll sequences, derives crew cohesion, and checks crew breaking points.

Source: `lib/rules-engine.ts`

## Overview

`runRulesEngine(state, commitInput, rollContext)` is the main entry point. It:

1. Clears the previous turn's `rulesWarnings` array
2. Dispatches to genre-specific rules based on `state.meta.genre`
3. Runs cross-genre systems: roll sequence detection, cohesion derivation, crew breaking-point checks
4. Returns the mutated state with updated counters, warnings, faction stances, and NPC dispositions

The engine does not just warn. It directly mutates game state (faction stances, NPC disposition caps) when thresholds are crossed.

## Trait Detection

Two complementary detection methods, combined via `traitFired()` for ~90% coverage:

**A) `trait_update` in commit_turn** — When the AI decrements `uses_remaining` on a trait, the commit includes a `character.trait_update` with the trait name. Matched case-insensitively against the target trait name.

**B) Roll skill name matching** — When a roll resolves, the `RollContext.check` field contains the skill/trait name used. Matched case-insensitively. Catches cases where the AI uses a trait in a roll but doesn't emit a `trait_update`.

Either method firing counts as a trait use for counter purposes.

## Genre Rules

### Epic Sci-Fi (`epic-scifi`)

**Counter:** `drift_exposure` (persistent, survives chapter close)
**Trigger trait:** Drift Touch

| Threshold | Warning | State Mutation |
|-----------|---------|----------------|
| 3+ | Synod notice event imminent | `setFactionStance('The Synod', 'Suspicious -- monitoring Drift activity')` |
| 6+ | Active Synod search in progress | `setFactionStance('The Synod', 'Hostile -- active search')` |
| 10+ | Synod bounty active, agents hunting | `setFactionStance('The Synod', 'Hostile -- active bounty on Resonant')` |

Thresholds are evaluated highest-first (if-else chain), so only the highest matching threshold applies per turn.

### Grimdark (`grimdark`)

**Counter:** `corruption` (persistent)
**Trigger trait:** Corruption Tap

| Threshold | Warning | State Mutation |
|-----------|---------|----------------|
| 3+ | Church NPCs now start at Hostile | `capNpcDisposition(affiliation === 'The Church', 'hostile')` |
| 5+ | Common folk capped at Wary | `capNpcDisposition(non-crew + non-combat, 'wary')` |
| 8+ | Church actively hunting | `setFactionStance('The Church', 'Hostile -- hunting the curseworker')` + `capNpcDisposition(non-crew + non-combat, 'wary')` |
| 10+ | Physical manifestation visible | `capNpcDisposition(ALL non-crew, 'wary')` -- combat NPCs now included |

**Chapter decay:** On chapter close, `resetChapterCounters` degrades `ship.systems` entries for `morale` and `provisions` by 1 level each (if above 1). Appends `[degraded]` / `[depleted]` to description. The GM can restore them through in-chapter contracts and victories.

### Cyberpunk (`cyberpunk`)

**Counter:** `chrome_stress` (persistent)
**Trigger traits:** Zero Trace, Adrenaline Overclocked (each increments independently)

| Threshold | Warning | State Mutation |
|-----------|---------|----------------|
| 3+ | NPCs notice machine-like behavior | Warning only |
| 6+ | Empathy degradation, Insight disadvantage | Warning only |
| 10+ | Cyberpsychosis risk, WIS save DC 16 | Warning only |

Chrome stress thresholds are warning-only; no direct state mutations.

**Counter:** `deep_dive_uses` (per-chapter, resets on chapter close)
**Trigger trait:** Deep Dive

| Threshold | Warning |
|-----------|---------|
| 3+ (within chapter) | Cyberpsychosis episode imminent, involuntary disconnection risk |

`deep_dive_uses` is the only counter listed in `chapterResetCounters` for cyberpunk.

### Noir (`noire`)

**Counter:** `favor_balance` (persistent)
**Trigger trait:** Favor Owed

| Threshold | Warning | State Mutation |
|-----------|---------|----------------|
| 3+ | Contacts demand reciprocity before helping | Warning only |

## Cross-Genre Systems

### Derived Cohesion

`deriveCohesionFromCrew()` computes `world.crewCohesion.score` from the average disposition of all NPCs with `role === 'crew'`.

Disposition scale: Hostile=1, Wary=2, Neutral=3, Favorable=4, Trusted=5.

The average is rounded to the nearest integer and clamped to 1-5. Only updates if the derived value differs from the current score. If no crew NPCs exist, cohesion is left unchanged.

### Crew Breaking Points

`checkCrewBreakingPoints()` evaluates each crew NPC's `tempLoad` array. Load entries have a `severity` field (`severe` or `moderate`).

**At breaking point** (triggers warning with break behavior mandate):
- 3+ severe entries
- 1+ severe AND 3+ moderate
- 5+ moderate entries

**Approaching breaking point** (triggers advisory warning):
- 2+ severe entries
- 1+ severe AND 2+ moderate
- 4+ moderate entries

Warnings include the NPC's `vulnerability` field if present, which indicates how their break will manifest. Recovery requires dedicated personal scenes.

### Roll Sequence Detection

`detectRollSequences()` scans `state.history.rollLog` for consecutive failure runs (3+ failures on the same check). Records two pattern types:

1. **Breakthrough pattern** -- failure run followed by a success or critical. Example: "4 consecutive failures on Stealth, released on nat 20 Stealth"
2. **Ongoing run** -- 3+ consecutive failures still active (no resolution yet). Example: "3 consecutive failures on Persuasion (ongoing)"

Sequences are deduplicated by description and stored in `state.rollSequences` with turn range and chapter number. Only `failure` and `fumble` results count as failures; only runs on the same `check` value are consecutive.

## State Mutations vs. Warnings

The engine applies two types of consequences:

**Direct mutations** (immediate, no GM discretion):
- `setFactionStance()` -- creates or updates a faction's stance string. Used by Epic Sci-Fi (Synod) and Grimdark (Church).
- `capNpcDisposition()` -- downgrades NPC dispositions to a maximum tier. Only downgrades, never improves. Filter functions select which NPCs are affected (by role, affiliation, combatTier).
- `deriveCohesionFromCrew()` -- updates `crewCohesion.score` based on crew dispositions.

**Warnings** (injected into `rulesWarnings`, consumed by prompt compression):
- All thresholds emit a warning string regardless of whether they also mutate state.
- Warnings are prefixed with `⚠` (active/critical) or `📌` (rising/advisory).
- Cyberpunk and Noir thresholds are warning-only at all levels.
- Crew breaking-point checks are warning-only.

## Chapter Reset

`resetChapterCounters(state)` is called during chapter close. It does two things:

1. **Deletes per-chapter counters** listed in the genre's `chapterResetCounters` array. Currently only cyberpunk defines this: `['deep_dive_uses']`. The counter key is removed from `state.counters` entirely (not zeroed).

2. **Grimdark Company decay** -- if the genre is `grimdark` and `state.world.ship` exists, degrades `morale` and `provisions` system levels by 1 (minimum level 1). This models the Company's logistical entropy between chapters.

Persistent counters (`drift_exposure`, `corruption`, `chrome_stress`, `favor_balance`) are not affected by chapter reset. They accumulate across the entire campaign.

## Integration

The engine is called from `game-screen.tsx` at two points:

1. **After `applyToolResults`** -- processes the commit_turn input for trait detection via `trait_update`.
2. **After roll resolution** -- called with `RollContext` containing the check name and result for trait-in-roll detection.

The `rulesWarnings` array produced by the engine is injected into `compressGameState`, making warnings available to the AI's next prompt as part of the compressed state context.

## Genre Dispatch

Genre is read from `state.meta.genre`, defaulting to `'space-opera'` if unset. The `genreRulesMap` maps genre slugs to rule implementations:

| Genre slug | Rules object |
|-----------|-------------|
| `epic-scifi` | `epicSciFiRules` |
| `grimdark` | `grimdarkRules` |
| `cyberpunk` | `cyberpunkRules` |
| `noire` | `noirRules` |

Genres not in the map (e.g., `space-opera`, `weird-west`) skip genre-specific evaluation but still run all cross-genre systems.
