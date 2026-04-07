import type { GameState } from './types'
import type { Genre } from './genres/index'

/**
 * Client-side rules engine. Runs after each commit_turn is applied.
 * Evaluates genre-specific rules, increments persistent counters,
 * and injects threshold warnings into rulesWarnings.
 *
 * Detection methods:
 * A) trait_update in commit_turn (uses_remaining decremented)
 * B) Roll skill name matching a trait name (from roll context)
 */

// ============================================================
// Types
// ============================================================

interface CommitInput {
  character?: {
    trait_update?: { name: string; uses_remaining: number }
  }
}

interface RollContext {
  check: string    // skill/trait name used in the roll
  result: string   // 'success' | 'failure' | 'critical' | 'fumble'
}

interface GenreRules {
  /** Evaluate after each turn. Mutate counters, populate warnings. */
  evaluate: (state: GameState, commit: CommitInput | null, roll: RollContext | null) => GameState
  /** Per-chapter counters to reset on chapter close. */
  chapterResetCounters?: string[]
}

// ============================================================
// Trait detection helpers
// ============================================================

function traitUsedInCommit(commit: CommitInput | null, traitName: string): boolean {
  if (!commit?.character?.trait_update) return false
  return commit.character.trait_update.name.toLowerCase() === traitName.toLowerCase()
}

function traitUsedInRoll(roll: RollContext | null, traitName: string): boolean {
  if (!roll) return false
  return roll.check.toLowerCase() === traitName.toLowerCase()
}

function traitFired(commit: CommitInput | null, roll: RollContext | null, traitName: string): boolean {
  return traitUsedInCommit(commit, traitName) || traitUsedInRoll(roll, traitName)
}

function incrementCounter(state: GameState, key: string, amount: number = 1): GameState {
  const counters = { ...(state.counters ?? {}) }
  counters[key] = (counters[key] ?? 0) + amount
  return { ...state, counters }
}

function getCounter(state: GameState, key: string): number {
  return (state.counters ?? {})[key] ?? 0
}

function addWarning(state: GameState, warning: string): GameState {
  return { ...state, rulesWarnings: [...(state.rulesWarnings ?? []), warning] }
}

// ============================================================
// State mutation helpers
// ============================================================

/** Set a faction's stance (creates faction if it doesn't exist). */
function setFactionStance(state: GameState, factionName: string, stance: string): GameState {
  const world = { ...state.world }
  const exists = world.factions.some(f => f.name === factionName)
  if (exists) {
    world.factions = world.factions.map(f =>
      f.name === factionName ? { ...f, stance } : f
    )
  } else {
    world.factions = [...world.factions, { name: factionName, stance }]
  }
  return { ...state, world }
}

/** Set disposition on NPCs matching a filter. Only downgrades (never improves). */
function capNpcDisposition(
  state: GameState,
  filter: (n: { name: string; role?: string; affiliation?: string; disposition?: string; combatTier?: number }) => boolean,
  maxDisposition: 'hostile' | 'wary' | 'neutral' | 'favorable' | 'trusted',
): GameState {
  const tiers = ['hostile', 'wary', 'neutral', 'favorable', 'trusted']
  const maxIdx = tiers.indexOf(maxDisposition)
  const world = { ...state.world }
  world.npcs = world.npcs.map(n => {
    if (!filter(n)) return n
    const currentIdx = tiers.indexOf(n.disposition ?? 'neutral')
    if (currentIdx > maxIdx) {
      return { ...n, disposition: maxDisposition as GameState['world']['npcs'][0]['disposition'] }
    }
    return n
  })
  return { ...state, world }
}

// ============================================================
// Epic Sci-Fi: Drift Exposure
// ============================================================

const epicSciFiRules: GenreRules = {
  evaluate(state, commit, roll) {
    // Detect Drift Touch usage
    if (traitFired(commit, roll, 'Drift Touch')) {
      state = incrementCounter(state, 'drift_exposure')
    }

    // Threshold warnings + state mutations
    const exposure = getCounter(state, 'drift_exposure')
    if (exposure >= 10) {
      state = addWarning(state, '⚠ DRIFT EXPOSURE CRITICAL (10+): Synod bounty active. Synod agents are hunting the Conduit. Every public use of Drift abilities risks immediate capture.')
      state = setFactionStance(state, 'The Synod', 'Hostile — active bounty on Conduit')
    } else if (exposure >= 6) {
      state = addWarning(state, '⚠ DRIFT EXPOSURE HIGH (6+): Active Synod search in progress. Synod operatives are asking questions. Drift use in populated areas will be reported.')
      state = setFactionStance(state, 'The Synod', 'Hostile — active search')
    } else if (exposure >= 3) {
      state = addWarning(state, '📌 DRIFT EXPOSURE RISING (3+): Synod notice event imminent. The next Drift Touch use in a monitored area triggers a Synod response.')
      state = setFactionStance(state, 'The Synod', 'Suspicious — monitoring Drift activity')
    }

    return state
  },
}

// ============================================================
// Grimdark: Corruption
// ============================================================

const grimdarkRules: GenreRules = {
  evaluate(state, commit, roll) {
    // Detect Corruption Tap usage
    if (traitFired(commit, roll, 'Corruption Tap')) {
      state = incrementCounter(state, 'corruption')
    }

    // Threshold warnings + state mutations
    const corruption = getCounter(state, 'corruption')
    if (corruption >= 10) {
      state = addWarning(state, '⚠ CORRUPTION EXTREME (10+): Physical manifestation visible. The Hexblade\'s corruption is physically apparent. NPCs react with fear or revulsion on sight.')
      // Cap ALL non-crew NPCs at Wary
      state = capNpcDisposition(state, n => n.role !== 'crew', 'wary')
    } else if (corruption >= 8) {
      state = addWarning(state, '⚠ CORRUPTION SEVERE (8+): Church actively hunting. Church agents are pursuing the Hexblade. Entering settlements with a church presence is dangerous.')
      state = setFactionStance(state, 'The Church', 'Hostile — hunting the Hexblade')
      state = capNpcDisposition(state, n => n.role !== 'crew' && !n.combatTier, 'wary')
    } else if (corruption >= 5) {
      state = addWarning(state, '⚠ CORRUPTION HIGH (5+): Common folk disposition capped at Wary. Ordinary people sense something wrong.')
      // Cap non-combat, non-crew NPCs at Wary
      state = capNpcDisposition(state, n => n.role !== 'crew' && !n.combatTier, 'wary')
    } else if (corruption >= 3) {
      state = addWarning(state, '📌 CORRUPTION RISING (3+): Church NPCs now start at Hostile. Religious figures refuse to cooperate and may report the Hexblade\'s presence.')
      // Church-affiliated NPCs → Hostile
      state = capNpcDisposition(state, n => n.affiliation === 'The Church', 'hostile')
    }

    return state
  },
}

// ============================================================
// Cyberpunk: Chrome Stress + Deep Dive
// ============================================================

const cyberpunkRules: GenreRules = {
  evaluate(state, commit, roll) {
    // Chrome-linked traits: Zero Trace, Adrenaline Overclocked
    if (traitFired(commit, roll, 'Zero Trace')) {
      state = incrementCounter(state, 'chrome_stress')
    }
    if (traitFired(commit, roll, 'Adrenaline Overclocked')) {
      state = incrementCounter(state, 'chrome_stress')
    }

    // Deep Dive (per-chapter counter)
    if (traitFired(commit, roll, 'Deep Dive')) {
      state = incrementCounter(state, 'deep_dive_uses')
    }

    // Chrome stress thresholds
    const chrome = getCounter(state, 'chrome_stress')
    if (chrome >= 10) {
      state = addWarning(state, '⚠ CHROME STRESS CRITICAL (10+): Cyberpsychosis risk. The character experiences involuntary episodes. WIS save DC 16 in stressful social situations to resist violent impulses.')
    } else if (chrome >= 6) {
      state = addWarning(state, '⚠ CHROME STRESS HIGH (6+): Empathy degradation. Disadvantage on Insight checks reading human emotion. The character optimizes for efficiency, not connection.')
    } else if (chrome >= 3) {
      state = addWarning(state, '📌 CHROME STRESS RISING (3+): NPCs notice. Comments about being "more machine than person." First impressions with civilians are harder.')
    }

    // Deep Dive per-chapter threshold
    const deepDive = getCounter(state, 'deep_dive_uses')
    if (deepDive >= 3) {
      state = addWarning(state, '⚠ DEEP DIVE OVERLOAD (3 this chapter): Cyberpsychosis episode imminent. The Netrunner must rest or risk an involuntary disconnection event with lasting consequences.')
    }

    return state
  },
  chapterResetCounters: ['deep_dive_uses'],
}

// ============================================================
// Noir: Favor Balance
// ============================================================

const noirRules: GenreRules = {
  evaluate(state, commit, roll) {
    // Detect Favor Owed usage
    if (traitFired(commit, roll, 'Favor Owed')) {
      state = incrementCounter(state, 'favor_balance')
    }

    // Threshold warning
    const balance = getCounter(state, 'favor_balance')
    if (balance >= 3) {
      state = addWarning(state, '⚠ FAVOR BALANCE OVERDRAWN (3+): Contacts demand reciprocity before helping. The next contact the Fixer reaches out to will require a returned favor before providing assistance.')
    }

    return state
  },
}

// ============================================================
// Genre dispatch
// ============================================================

const genreRulesMap: Partial<Record<Genre, GenreRules>> = {
  'epic-scifi': epicSciFiRules,
  'grimdark': grimdarkRules,
  'cyberpunk': cyberpunkRules,
  'noire': noirRules,
}

// ============================================================
// Main entry point
// ============================================================

/**
 * Run genre-specific rules after a turn. Called from game-screen.tsx
 * after applyToolResults.
 *
 * @param state - Current game state (after tool results applied)
 * @param commitInput - The raw commit_turn input (for trait detection)
 * @param rollContext - Roll context if this turn resolved a roll
 * @returns Updated state with counters incremented and warnings populated
 */
export function runRulesEngine(
  state: GameState,
  commitInput: Record<string, unknown> | null,
  rollContext: RollContext | null = null,
): GameState {
  const genre = (state.meta.genre || 'space-opera') as Genre
  const rules = genreRulesMap[genre]

  // Clear previous turn's warnings
  let updated: GameState = { ...state, rulesWarnings: [] as string[] }

  // Run genre-specific rules (if any)
  if (rules) {
    updated = rules.evaluate(updated, commitInput as CommitInput | null, rollContext)
  }

  // Cross-genre: derive cohesion from crew dispositions
  updated = deriveCohesionFromCrew(updated)

  // Cross-genre: crew tempLoad breaking-point detection
  updated = checkCrewBreakingPoints(updated)

  return updated
}

/**
 * Derive cohesion score from crew NPC dispositions.
 * Hostile=1, Wary=2, Neutral=3, Favorable=4, Trusted=5.
 * Average rounded to nearest integer, clamped 1-5.
 */
function deriveCohesionFromCrew(state: GameState): GameState {
  const crewNpcs = state.world.npcs.filter(n => n.role === 'crew')
  if (crewNpcs.length === 0) return state

  const dispositionToScore: Record<string, number> = {
    hostile: 1, wary: 2, neutral: 3, favorable: 4, trusted: 5,
  }

  const scores = crewNpcs.map(n => dispositionToScore[n.disposition ?? 'neutral'] ?? 3)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const derived = Math.max(1, Math.min(5, Math.round(avg)))

  const cohesion = state.world.crewCohesion ?? { score: 3, log: [] }
  if (cohesion.score === derived) return state

  return {
    ...state,
    world: {
      ...state.world,
      crewCohesion: { ...cohesion, score: derived },
    },
  }
}

/**
 * Check crew NPCs for breaking-point proximity based on tempLoad.
 * Breaking point: 3+ severe, OR 1 severe + 3 moderate, OR 5+ moderate.
 */
function checkCrewBreakingPoints(state: GameState): GameState {
  const crewNpcs = state.world.npcs.filter(n => n.role === 'crew' && n.tempLoad && n.tempLoad.length > 0)
  for (const npc of crewNpcs) {
    const load = npc.tempLoad!
    const severe = load.filter(e => e.severity === 'severe').length
    const moderate = load.filter(e => e.severity === 'moderate').length

    const atBreakingPoint = severe >= 3 || (severe >= 1 && moderate >= 3) || moderate >= 5
    const approaching = !atBreakingPoint && (severe >= 2 || (severe >= 1 && moderate >= 2) || moderate >= 4)

    if (atBreakingPoint) {
      const vuln = npc.vulnerability ? ` Their vulnerability (${npc.vulnerability}) is load-bearing.` : ''
      state = addWarning(state, `⚠ ${npc.name} HAS REACHED BREAKING POINT. ${severe} severe + ${moderate} moderate load entries.${vuln} They will manifest break behaviors according to their vulnerability. Recovery requires dedicated personal scenes.`)
    } else if (approaching) {
      const vuln = npc.vulnerability ? ` Vulnerability: ${npc.vulnerability}.` : ''
      state = addWarning(state, `📌 ${npc.name} is approaching breaking point (${severe} severe, ${moderate} moderate load).${vuln} Consider a recovery scene before the next high-pressure operation.`)
    }
  }
  return state
}

/**
 * Reset per-chapter counters and apply chapter decay. Called during chapter close.
 */
export function resetChapterCounters(state: GameState): GameState {
  const genre = (state.meta.genre || 'space-opera') as Genre
  const rules = genreRulesMap[genre]

  // Reset per-chapter counters
  if (rules?.chapterResetCounters) {
    const counters = { ...(state.counters ?? {}) }
    for (const key of rules.chapterResetCounters) {
      delete counters[key]
    }
    state = { ...state, counters }
  }

  // Grimdark Company entropy: degrade Morale and Provisions by 1 level each chapter
  // (the GM can restore them through contracts and victories during the chapter)
  if (genre === 'grimdark' && state.world.ship) {
    const ship = { ...state.world.ship }
    ship.systems = ship.systems.map(s => {
      if (s.id === 'morale' && s.level > 1) {
        return { ...s, level: s.level - 1, description: s.description + ' [degraded]' }
      }
      if (s.id === 'provisions' && s.level > 1) {
        return { ...s, level: s.level - 1, description: s.description + ' [depleted]' }
      }
      return s
    })
    state = { ...state, world: { ...state.world, ship } }
  }

  return state
}
