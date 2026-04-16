import type { GameState, DispositionTier, StatBlock } from './types'
import { DISPOSITION_TIERS } from './types'
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
  maxDisposition: DispositionTier,
): GameState {
  const tiers = DISPOSITION_TIERS
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
// Origin counter evaluation — shared by all genres
// ============================================================

interface OriginCounterDef {
  counter: string
  shiftLabel: string
  shiftWarning: string
  risingWarning: string
  // Two-way shift: optional low-end threshold (counter reaching 0)
  lowShiftLabel?: string
  lowShiftWarning?: string
  lowRisingWarning?: string
  startingValue?: number  // Non-zero starting value for two-way counters
}

function evaluateOriginCounters(
  state: GameState,
  originMap: Record<string, OriginCounterDef>,
): GameState {
  const species = state.character.species
  const def = originMap[species]
  if (!def) return state

  const val = getCounter(state, def.counter)

  // High-end shift (counter >= 10)
  if (val >= 10) {
    if (species !== def.shiftLabel) {
      state = { ...state, character: { ...state.character, species: def.shiftLabel } }
      state = addWarning(state, `⚠ IDENTITY SHIFT: ${species} → ${def.shiftLabel}. ${def.shiftWarning}`)
    }
  } else if (val >= 7) {
    state = addWarning(state, `📌 ${def.counter.toUpperCase()} RISING (${val}): ${def.risingWarning}`)
  }

  // Low-end shift (counter <= 0, only for two-way counters)
  if (def.lowShiftLabel && val <= 0) {
    if (species !== def.lowShiftLabel) {
      state = { ...state, character: { ...state.character, species: def.lowShiftLabel } }
      state = addWarning(state, `⚠ IDENTITY SHIFT: ${species} → ${def.lowShiftLabel}. ${def.lowShiftWarning || ''}`)
    }
  } else if (def.lowRisingWarning && val <= 2 && val > 0) {
    state = addWarning(state, `📌 ${def.counter.toUpperCase()} FALLING (${val}): ${def.lowRisingWarning}`)
  }

  return state
}

// ============================================================
// Epic Sci-Fi: Drift Exposure + Origin Counters
// ============================================================

const epicSciFiOriginMap: Record<string, OriginCounterDef> = {
  'Minor House': {
    counter: 'standing',
    shiftLabel: 'Stricken',
    shiftWarning: 'The system has written the character off. Too much conscience, not enough compliance. The doors are closed. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The standing is eroding. House contacts notice the refusals. The system is losing patience with someone who won\'t play the game.',
    lowShiftLabel: 'Entrenched',
    lowShiftWarning: 'The character has played the game so well they became it. The calculation is automatic, the conscience is a memory. Narrate this as a character moment, not a mechanic.',
    lowRisingWarning: 'The compliance is becoming reflexive. The trades of dignity no longer register as trades. The system is absorbing the person.',
    startingValue: 5,
  },
  'Synod': {
    counter: 'doubt',
    shiftLabel: 'Heretic',
    shiftWarning: 'The character\'s relationship to the Synod has fundamentally changed. Doubt drives action, not erosion. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The pressure is building. Synod contacts sense the erosion. Evidence contradicting doctrine accumulates.',
  },
  'Undrift': {
    counter: 'exposure',
    shiftLabel: 'Hunted',
    shiftWarning: 'Too visible. The network distances itself. Synod bounty upgrades. The exits are closing. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The pressure is building. Too many names used, too many biometric contacts. The network is nervous.',
  },
  'Imperial Service': {
    counter: 'mandate',
    shiftLabel: 'Dissident',
    shiftWarning: 'Personal loyalty has overridden duty. Handler trust erodes. Reports are questioned. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The pressure is building. Personal loyalties are overriding orders. Handlers notice the drift.',
  },
  'Spent Resonant': {
    counter: 'embers',
    shiftLabel: 'Rekindled',
    shiftWarning: 'The Drift is coming back. Classification is provably fraudulent. The body remembers, and the Synod will too. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The pressure is building. Post-discharge Drift use is surfacing. The body remembers what the papers deny.',
  },
}

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

    // Origin counters
    state = evaluateOriginCounters(state, epicSciFiOriginMap)

    return state
  },
}

// ============================================================
// Grimdark: Corruption + Origin Counters
// ============================================================

const grimdarkOriginMap: Record<string, OriginCounterDef> = {
  'House Veldran': {
    counter: 'ledger',
    shiftLabel: 'Climber',
    shiftWarning: 'The house name has become a tool. Every alliance was a step on a ladder. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The ledger is getting heavy. Old debts leave marks. People remember what you traded.',
  },
  'House Sylvara': {
    counter: 'paralysis',
    shiftLabel: 'Watcher',
    shiftWarning: 'Caution has become passivity. The character watches more than they act. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Hesitation is becoming a pattern. The weight of consequence slows every decision.',
  },
  'House Stonemark': {
    counter: 'rigidity',
    shiftLabel: 'Bound',
    shiftWarning: 'The oath has become a cage. Duty supersedes judgment. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The oath is tightening. Situations that require flexibility are met with doctrine.',
  },
  'The Oathless': {
    counter: 'survival_debt',
    shiftLabel: 'Named',
    shiftWarning: 'Too many obligations accepted. The freedom that defined the character is consumed by debts. Effectively sworn without the ceremony. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The obligations are accumulating. Every favor accepted erodes the freedom that defines the unsworn.',
  },
  'House Ashfang': {
    counter: 'wrath',
    shiftLabel: 'Vessel',
    shiftWarning: 'The anger has crystallized into something ancestral. The blood burns with purpose. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The anger is focused now. It has a direction and a weight that others can feel.',
  },
  'Pale Flame': {
    counter: 'zeal',
    shiftLabel: 'The Pious',
    shiftWarning: 'The institution has consumed the person. Every judgment is the Church\'s judgment, delivered without doubt. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Doctrine is answering questions faster than conscience can ask them. The gap between mission and machinery is closing.',
  },
}

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

    // Origin counters
    state = evaluateOriginCounters(state, grimdarkOriginMap)

    return state
  },
}

// ============================================================
// Cyberpunk: Chrome Stress + Deep Dive + Origin Counters
// ============================================================

const cyberpunkOriginMap: Record<string, OriginCounterDef> = {
  'Operative': {
    counter: 'debt',
    shiftLabel: 'Owned',
    shiftWarning: 'Too many debts, too many claims. The operative is owned by everyone and free to no one. Every choice is a payment, and the debts have interest. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Obligations are compounding. Fixers, clients, and crew members all hold markers. The word "freelance" is starting to feel like a joke.',
  },
  'Fixer': {
    counter: 'exposure',
    shiftLabel: 'Burned',
    shiftWarning: 'Too many people know the fixer\'s name. The network that was an asset is now a target. Clients are selling information. Contacts are afraid to be seen together. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The exposure is growing. Too many people know too much. Every connection is a potential leak.',
  },
  'Ripperdoc': {
    counter: 'conscience',
    shiftLabel: 'Hollowed',
    shiftWarning: 'The conscience broke. Patient after patient, implant after implant, the clinical detachment consumed the empathy. The hands still work; the person behind them has retreated. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The weight of what you install is accumulating. More patients with chrome drift, more rejection cases. The detachment that lets you work is growing.',
  },
  'Corporate': {
    counter: 'complicity',
    shiftLabel: 'Apparatus',
    shiftWarning: 'Indistinguishable from the institution. The person and the corp are the same thing. Decisions are policy. Relationships are org chart positions. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The corporate logic is deepening. Every compromise, every efficiency report, every restructuring builds the machine further into the person.',
  },
  'Unplugged': {
    counter: 'compromise',
    shiftLabel: 'Compromised',
    shiftWarning: 'The line between Unplugged and everyone else is rhetorical now. The body is still mostly organic. The principles are not. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Compromises are accumulating. Each use of augmented infrastructure, each exception "just this once," erodes the conviction.',
  },
}

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

    // Origin counters
    state = evaluateOriginCounters(state, cyberpunkOriginMap)

    return state
  },
  chapterResetCounters: ['deep_dive_uses'],
}

// ============================================================
// Noir: Favor Balance + Origin Counters
// ============================================================

const noirOriginMap: Record<string, OriginCounterDef> = {
  'PI': {
    counter: 'compromise',
    shiftLabel: 'Compromised',
    shiftWarning: 'The lines you crossed have erased the distinction between you and the people you investigate. The cases still get solved; the question of whether solving them serves justice has stopped being asked. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The lines are accumulating. Each case takes a little more from you. The objectivity that defined your work is harder to find.',
  },
  'Lawyer': {
    counter: 'complicity',
    shiftLabel: 'Entangled',
    shiftWarning: 'The system you operated has made you part of its machinery. You know too many names, too many arrangements. Walking away means leaving behind information that powerful people need controlled. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The web is getting sticky. Every motion filed pulls you deeper into the machinery. The system you serve is becoming indistinguishable from the system you navigate.',
  },
  'Criminal': {
    counter: 'notoriety',
    shiftLabel: 'Marked',
    shiftWarning: 'Too visible. Too known. The silence you were is now noise. The people who enforce silence officially have decided you are a problem worth solving. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Word is spreading. Too many jobs, too many witnesses. The anonymity that protected you is thinning.',
  },
  'Enforcer': {
    counter: 'numbness',
    shiftLabel: 'Cold',
    shiftWarning: 'The numbness has won. Emotional responses are tactical now, not felt. People notice the absence and recoil. The efficiency is total; the cost is invisible from the inside. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The detachment is showing. Situations that should provoke a reaction get clinical assessment instead. People are becoming variables.',
  },
  'Reporter': {
    counter: 'leverage',
    shiftLabel: 'Exposed',
    shiftWarning: 'The story became bigger than your ability to control who knows your name. Sources are afraid to be seen with you. Powerful people have stopped ignoring you and started planning. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The leverage is mounting. Every source adds a thread. Every story published makes dangerous people remember your name.',
  },
}

const noirRules: GenreRules = {
  evaluate(state, commit, roll) {
    // Detect Favor Owed usage (Criminal/Connected playbook)
    if (traitFired(commit, roll, 'Favor Owed')) {
      state = incrementCounter(state, 'favor_balance')
    }

    // Threshold warning
    const balance = getCounter(state, 'favor_balance')
    if (balance >= 3) {
      state = addWarning(state, '⚠ FAVOR BALANCE OVERDRAWN (3+): Contacts demand reciprocity before helping. The next contact reached out to will require a returned favor before providing assistance.')
    }

    // Origin counters
    state = evaluateOriginCounters(state, noirOriginMap)

    return state
  },
}

// ============================================================
// Space Opera: Origin Counters
// ============================================================

const spaceOperaOriginMap: Record<string, OriginCounterDef> = {
  'Human': {
    counter: 'isolation',
    shiftLabel: 'Untethered',
    shiftWarning: 'The rootlessness became absolute. Every port is temporary, every bond dissolves on departure. The character is no longer unrooted by circumstance but by identity. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The distance is growing. Crew members stop volunteering personal information. Professional respect replaces warmth.',
  },
  'Vrynn': {
    counter: 'signal_debt',
    shiftLabel: 'Severed',
    shiftWarning: 'Too many intercepted signals, too many broken channels. The network is burned. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Signal debts are accumulating. Channels that were secure are becoming compromised. Contacts go quiet.',
  },
  'Korath': {
    counter: 'compromise',
    shiftLabel: 'The Diplomat',
    shiftWarning: 'Every position has been compromised. No ground left to stand on. Agreements are suspect. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Too many compromises. Each agreement weakens the next negotiating position. Allies question sincerity.',
  },
  'Sylphari': {
    counter: 'detachment',
    shiftLabel: 'The Observer',
    shiftWarning: 'Clinical detachment has replaced engagement. Observes but no longer participates. People are data points. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The analytical distance is growing. Emotional situations are met with hypotheses, not responses.',
  },
  'Zerith': {
    counter: 'reputation',
    shiftLabel: 'Marked',
    shiftWarning: 'The reputation has outrun the person. Every port knows the name. Anonymity is gone. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Word travels. Jobs are offered based on reputation, not need. The wrong people are starting to notice.',
  },
}

const spaceOperaRules: GenreRules = {
  evaluate(state, _commit, _roll) {
    state = evaluateOriginCounters(state, spaceOperaOriginMap)
    return state
  },
}

// ============================================================
// Fantasy: Origin Counters
// ============================================================

const fantasyOriginMap: Record<string, OriginCounterDef> = {
  'Human': {
    counter: 'ambition',
    shiftLabel: 'Climber',
    shiftWarning: 'Ambition has consumed the noble bearing. Every relationship is a rung on a ladder. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The ambition is showing. Court allies notice the calculating edge. Loyalty is questioned.',
  },
  'Elf': {
    counter: 'withdrawal',
    shiftLabel: 'Watcher',
    shiftWarning: 'The elf has retreated past the point of return. Observation replaces participation. The world happens to them. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The withdrawal is deepening. Social situations provoke retreat. Companions worry about disengagement.',
  },
  'Dwarf': {
    counter: 'oath_weight',
    shiftLabel: 'Bound',
    shiftWarning: 'The oath has become the person. There is no identity outside the vow. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The oath weighs heavier. Situations that conflict with the vow create visible distress. Flexibility is eroding.',
  },
  'Halfling': {
    counter: 'visibility',
    shiftLabel: 'Named',
    shiftWarning: 'No longer invisible. Recognition brings danger. The anonymity that was armor is gone. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'Too visible. Actions are drawing attention. People who should not know the name are learning it.',
  },
  'Dragonkin': {
    counter: 'inheritance',
    shiftLabel: 'Vessel',
    shiftWarning: 'The bloodline is asserting itself. Becoming what their ancestors were, whether they chose it or not. Narrate this as a character moment, not a mechanic.',
    risingWarning: 'The inheritance stirs. Old powers or old patterns surface in moments of stress. The blood remembers.',
  },
}

const fantasyRules: GenreRules = {
  evaluate(state, _commit, _roll) {
    state = evaluateOriginCounters(state, fantasyOriginMap)
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
  'space-opera': spaceOperaRules,
  'fantasy': fantasyRules,
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

  // Cross-genre: detect roll sequences
  updated = detectRollSequences(updated)

  // Cross-genre: derive cohesion from crew dispositions
  updated = deriveCohesionFromCrew(updated)

  // Cross-genre: crew tempLoad breaking-point detection
  updated = checkCrewBreakingPoints(updated)

  return updated
}

/**
 * Detect notable roll sequences in the roll log and store them.
 * Looks for: 3+ consecutive failures against the same skill/check,
 * especially when followed by a success/critical (breakthrough pattern).
 */
function detectRollSequences(state: GameState): GameState {
  const rollLog = state.history.rollLog
  if (rollLog.length < 3) return state

  const existingDescs = new Set((state.rollSequences ?? []).map(r => r.description))
  const newSequences: GameState['rollSequences'] = []

  // Scan for consecutive failure runs
  let runStart = 0
  let runCheck = ''
  let runCount = 0

  for (let i = 0; i < rollLog.length; i++) {
    const roll = rollLog[i]
    const isFailure = roll.result === 'failure' || roll.result === 'fumble'

    if (isFailure && roll.check === runCheck) {
      runCount++
    } else if (isFailure) {
      // New failure run
      runStart = i
      runCheck = roll.check
      runCount = 1
    } else if (runCount >= 3) {
      // Run broken by success — record the pattern
      const isBreakthrough = roll.result === 'critical' || roll.result === 'success'
      const desc = isBreakthrough
        ? `${runCount} consecutive failures on ${runCheck}, released on ${roll.result === 'critical' ? 'nat 20' : 'success'} ${roll.check}`
        : `${runCount} consecutive failures on ${runCheck}`

      if (!existingDescs.has(desc)) {
        newSequences.push({
          description: desc,
          turns: `Rolls ${runStart + 1}-${i + 1}`,
          chapter: state.meta.chapterNumber,
        })
        existingDescs.add(desc)
      }
      runCount = 0
      runCheck = ''
    } else {
      runCount = 0
      runCheck = ''
    }
  }

  // Check if current run is notable (even without a breakthrough yet)
  if (runCount >= 3) {
    const desc = `${runCount} consecutive failures on ${runCheck} (ongoing)`
    if (!existingDescs.has(desc)) {
      newSequences.push({
        description: desc,
        turns: `Rolls ${runStart + 1}-${rollLog.length}`,
        chapter: state.meta.chapterNumber,
      })
    }
  }

  if (newSequences.length === 0) return state
  return { ...state, rollSequences: [...(state.rollSequences ?? []), ...newSequences] }
}

/**
 * Derive cohesion score from crew NPC dispositions.
 * Hostile=1, Wary=2, Neutral=3, Favorable=4, Trusted=5.
 * Average rounded to nearest integer, clamped 1-5.
 */
function deriveCohesionFromCrew(state: GameState): GameState {
  const crewNpcs = state.world.npcs.filter(n => n.role === 'crew')
  if (crewNpcs.length === 0) return state

  const dispositionToScore: Record<DispositionTier, number> = {
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

// ============================================================
// ROLL-FIRST: Derive check parameters from player input + game state
// ============================================================

export interface RollGateResult {
  category: 'stealth' | 'social' | 'physical' | 'technical' | 'info' | 'search'
  skills: string[]
  targetNpc?: { name: string; disposition: string }
  contested?: boolean
  playerAction: string
}

export interface ApplicableModifier {
  source: string
  bonus: number
  type: 'trait' | 'equipment' | 'temp'
  consumable: boolean
  traitIndex?: number
  itemId?: string
}

export interface DerivedCheck {
  skill: string
  stat: keyof StatBlock
  dc: number
  modifier: number
  reason: string
  contested?: { npcName: string; npcSkill: string; npcModifier: number }
  applicableModifiers: ApplicableModifier[]
}

const SKILL_STAT_MAP: Record<string, keyof StatBlock> = {
  'Athletics': 'STR',
  'Acrobatics': 'DEX', 'Stealth': 'DEX', 'Sleight of Hand': 'DEX',
  'Investigation': 'INT', 'Hacking': 'INT', 'Electronics': 'INT', 'Medicine': 'INT',
  'Insight': 'WIS', 'Perception': 'WIS', 'Survival': 'WIS',
  'Persuasion': 'CHA', 'Deception': 'CHA', 'Intimidation': 'CHA', 'Performance': 'CHA',
}

const DISPOSITION_DC: Record<string, number> = {
  hostile: 16, wary: 14, neutral: 12, favorable: 10, trusted: 8,
}

function abilityMod(stat: number): number {
  return Math.floor((stat - 10) / 2)
}

/** Detect whether the player's input requires a roll (keyword-based).
 *  Returns structured result for DC derivation, or null if no roll detected. */
export function detectRollGateStructured(
  playerMessage: string,
  sceneNpcs: Array<{ name: string; disposition?: string; role?: string; status?: string }>,
  primaryStat?: string,
): RollGateResult | null {
  const msg = playerMessage.toLowerCase()
  if (msg.length === 0) return null

  const stealthVerbs = /\b(quiet|sneak|stealth|careful|avoid|hide|creep|silent|don't.*alert|don't.*awake|unnoticed|undetected|slip past|slip through)\b/i
  const socialVerbs = /\b(convince|persuade|lie|bluff|intimidate|threaten|negotiate|talk.*into|charm|deceive|pretend|cover story)\b/i
  const physicalVerbs = /\b(climb|break|force|sprint|jump|swim|lift|push|pull|pry|smash|run|escape|flee|dodge|grab|throw|catch)\b/i
  const techVerbs = /\b(hack|pick|lockpick|repair|fix|patch|heal|stabilize|decrypt|bypass|override|crack|splice|restore|hotwire|rig)\b/i
  const infoVerbs = /\b(ask|question|find out|what happened|what do you know|tell me|any idea|suspicion|investigate|examine|search|check|inspect|analyze|screen|review|look for|scan|study)\b/i
  const questionWords = /\b(what|why|how|who|where|when|any|tell me|do you know|does .* know)\b/i

  const activeNpcs = sceneNpcs.filter(n => n.status !== 'dead' && n.status !== 'gone')
  const action = msg.slice(0, 80)

  if (stealthVerbs.test(msg)) {
    return { category: 'stealth', skills: ['Stealth'], playerAction: action }
  }
  if (socialVerbs.test(msg) && activeNpcs.length > 0) {
    const target = activeNpcs.find(n => msg.includes(n.name.toLowerCase())) || activeNpcs[0]
    const skills = primaryStat === 'WIS' ? ['Insight', 'Persuasion']
      : primaryStat === 'INT' ? ['Investigation', 'Deception']
      : ['Persuasion', 'Deception', 'Intimidation']
    return {
      category: 'social', skills,
      targetNpc: { name: target.name, disposition: target.disposition || 'neutral' },
      contested: ['hostile', 'wary'].includes(target.disposition || ''),
      playerAction: action,
    }
  }
  if (physicalVerbs.test(msg)) {
    // Suppress false positives: "push the drive", "break the news", "run the operation", etc.
    const nonPhysicalContext = /\b(push.*(drive|throttle|engine|button|limit|luck|agenda|issue|point)|break.*(news|silence|camp|fast|cover|ice|deal)|run.*(operation|errand|scan|diagnostic|numbers|check)|throw.*(party|shade|weight|support)|force.*(habit|hand|issue|nature)|grab.*(attention|drink|seat|food|coffee|bite)|catch.*(breath|drift|eye|meaning|up))\b/i
    if (!nonPhysicalContext.test(msg)) {
      return { category: 'physical', skills: ['Athletics', 'Acrobatics'], playerAction: action }
    }
  }
  if (techVerbs.test(msg)) {
    const skills = primaryStat === 'INT' ? ['Electronics', 'Investigation']
      : primaryStat === 'WIS' ? ['Medicine', 'Perception']
      : ['Electronics', 'Medicine']
    return { category: 'technical', skills, playerAction: action }
  }
  if ((infoVerbs.test(msg) || questionWords.test(msg)) && activeNpcs.length > 0) {
    // Prefer NPC named in the message; fall back to first non-trusted NPC
    const target = activeNpcs.find(n => msg.includes(n.name.toLowerCase()))
      || activeNpcs.find(n => n.disposition && ['hostile', 'wary', 'neutral'].includes(n.disposition))
    if (target && target.disposition !== 'trusted') {
      const skills = primaryStat === 'WIS' ? ['Insight', 'Perception']
        : primaryStat === 'INT' ? ['Investigation', 'Insight']
        : ['Persuasion', 'Insight']
      return {
        category: 'info', skills,
        targetNpc: { name: target.name, disposition: target.disposition || 'neutral' },
        contested: false, // Info extraction is NOT contested — only social manipulation is
        playerAction: action,
      }
    }
  }
  if (infoVerbs.test(msg)) {
    return { category: 'search', skills: ['Investigation', 'Perception'], playerAction: action }
  }
  return null
}

/** Derive full check parameters from a roll gate detection + game state.
 *  Returns everything needed for the dice UI without an API call. */
export function deriveCheckParameters(
  gate: RollGateResult,
  gameState: GameState,
): DerivedCheck {
  const c = gameState.character
  const skill = gate.skills[0]
  const stat = SKILL_STAT_MAP[skill] || 'WIS'
  const statVal = c.stats[stat]
  const isProficient = c.proficiencies.some(p => p.toLowerCase() === skill.toLowerCase())
  const baseMod = abilityMod(statVal) + (isProficient ? c.proficiencyBonus : 0)

  let dc: number
  let reason: string
  let contested: DerivedCheck['contested']

  switch (gate.category) {
    case 'social':
    case 'info': {
      const disp = gate.targetNpc?.disposition || 'neutral'
      dc = DISPOSITION_DC[disp] ?? 12
      reason = `${skill} — ${gate.playerAction}`
      if (gate.contested && gate.targetNpc) {
        const npcSkill = gate.category === 'social' ? 'Composure' : 'Deception'
        contested = { npcName: gate.targetNpc.name, npcSkill, npcModifier: 2 }
      }
      break
    }
    case 'stealth':
      dc = gameState.combat.active ? 14 : 12
      reason = `Stealth — ${gate.playerAction}`
      break
    case 'physical':
      dc = 12
      reason = `${skill} — ${gate.playerAction}`
      break
    case 'technical':
      dc = 13
      reason = `${skill} — ${gate.playerAction}`
      break
    case 'search':
      dc = 12
      reason = `${skill} — ${gate.playerAction}`
      break
    default:
      dc = 12
      reason = `${skill} check`
  }

  // Context modifiers
  const hasActiveClock = (gameState.world.tensionClocks ?? []).some(cl => cl.status === 'active')
  if (hasActiveClock && (gate.category === 'search' || gate.category === 'technical')) {
    dc += 2
  }

  // Surface applicable modifiers from traits, equipment, temp modifiers
  const applicableModifiers: ApplicableModifier[] = []

  c.traits.forEach((trait, idx) => {
    if (trait.usesRemaining <= 0) return
    const desc = trait.description.toLowerCase()
    const skillLower = skill.toLowerCase()
    const categoryTerms: Record<string, string[]> = {
      stealth: ['stealth', 'sneak', 'hide', 'undetected'],
      social: ['persuasion', 'deception', 'intimidation', 'social', 'convince', 'charm'],
      physical: ['athletics', 'acrobatics', 'strength', 'climb', 'jump'],
      technical: ['electronics', 'hack', 'repair', 'medicine', 'technical'],
      info: ['insight', 'perception', 'investigation', 'information', 'read', 'detect'],
      search: ['investigation', 'perception', 'search', 'examine'],
    }
    const terms = categoryTerms[gate.category] || []
    if (desc.includes(skillLower) || terms.some(t => desc.includes(t)) || desc.includes('any check') || desc.includes('next check')) {
      const bonusMatch = desc.match(/\+(\d+)/)
      const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 2
      applicableModifiers.push({ source: trait.name, bonus, type: 'trait', consumable: true, traitIndex: idx })
    }
  })

  c.inventory.forEach(item => {
    if (!item.effect) return
    const eff = item.effect.toLowerCase()
    if (eff.includes('check') || eff.includes('roll') || eff.includes('bonus') || eff.includes('advantage')) {
      const bonusMatch = eff.match(/\+(\d+)/)
      const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 1
      applicableModifiers.push({ source: item.name, bonus, type: 'equipment', consumable: (item.charges ?? 0) > 0 || item.quantity <= 1, itemId: item.id })
    }
  })

  c.tempModifiers.forEach(mod => {
    if (mod.stat === stat || mod.stat === 'all') {
      applicableModifiers.push({ source: mod.name, bonus: mod.value, type: 'temp', consumable: false })
    }
  })

  return { skill, stat, dc, modifier: baseMod, reason, contested, applicableModifiers }
}
