import type {
  Sf2NarrativeTempoMode,
  Sf2NarrativeTempoRecommendation,
  Sf2PacingAdvisory,
  Sf2State,
  Sf2TurnRecord,
} from './types'
import { SF2_NARRATIVE_TEMPO_MODES } from './types'
import type { Sf2BeatMode } from './beat-mode'

interface DeriveNarrativeTempoInput {
  state: Sf2State
  playerInput: string
  beatMode: Sf2BeatMode
  pacing?: Sf2PacingAdvisory
}

export interface Sf2NarrativeTempoMetrics {
  consecutiveMicroTurns: number
  turnsSinceMaterialDelta: number
  turnsSinceTimeAdvanced: number
  turnsSinceLocationChanged: number
  turnsSinceNewFact: number
  turnsSinceRelationshipDelta: number
  turnsSinceFactionOrPressureMoved: number
  turnsSinceSceneEnded: number
  repeatedProceduralSurface?: string
  guards: {
    excessiveMicroNoDelta: boolean
    repeatedProceduralSurface: boolean
  }
}

const TEMPO_SET = new Set<string>(SF2_NARRATIVE_TEMPO_MODES)

export function isSf2NarrativeTempoMode(value: unknown): value is Sf2NarrativeTempoMode {
  return typeof value === 'string' && TEMPO_SET.has(value)
}

export function deriveNarrativeTempoRecommendation(
  input: DeriveNarrativeTempoInput
): Sf2NarrativeTempoRecommendation {
  const { state, playerInput, beatMode, pacing } = input
  const normalized = normalize(playerInput)
  const repeatedSurface = deriveRepeatedProceduralSurface(state)
  const sceneExhausted = Boolean(repeatedSurface)
  const liveMicro = hasLiveEmbodiedPressure(state, beatMode, normalized)
  const chapterTurn = turnsThisChapter(state)
  const target = state.chapter.setup.pacingContract?.targetTurns

  if (beatMode === 'meta') {
    return {
      mode: 'micro_scene',
      reason: 'Rules/meta negotiation is outside fiction tempo.',
      remedy: 'Answer out-of-band without moving the scene camera.',
    }
  }

  if (liveMicro) {
    return {
      mode: 'micro_scene',
      reason: 'Immediate embodied pressure is active.',
      remedy: 'Stay close, resolve one concrete exchange, and keep the next action tactical.',
    }
  }

  if (matchesAny(normalized, DOWNTIME_PATTERNS)) {
    return {
      mode: 'downtime',
      reason: 'The player asked for rest, recovery, training, shopping, or quieter upkeep.',
      remedy: 'Compress the quiet interval and land on the next charged choice or cost.',
      broadGoal: true,
    }
  }

  if (matchesAny(normalized, TIME_JUMP_PATTERNS)) {
    return {
      mode: 'time_jump',
      reason: 'The player explicitly asked to wait, skip ahead, or let time pass.',
      remedy: 'Advance time to the next changed situation; do not replay routine waiting beat-by-beat.',
      requiredDelta: 'time advances or the awaited consequence arrives',
      broadGoal: true,
    }
  }

  if (matchesAny(normalized, MONTAGE_PATTERNS) || beatMode === 'montage') {
    return {
      mode: 'montage',
      reason: 'The player intent spans preparation, travel, recovery, or several routine steps.',
      remedy: 'Use compressed beats with one meaningful roll only when uncertainty matters.',
      requiredDelta: 'preparation, travel, or procedure position changes visibly',
      broadGoal: true,
    }
  }

  if (matchesAny(normalized, TRAVEL_PATTERNS)) {
    return {
      mode: 'time_jump',
      reason: 'The player is moving the camera to another place or following a known lead.',
      remedy: 'Travel cleanly and arrive at the next live pressure rather than treating transit as a room-by-room crawl.',
      requiredDelta: 'location changes or the route produces a concrete new obstacle',
      broadGoal: true,
    }
  }

  if (matchesAny(normalized, BROAD_INVESTIGATION_PATTERNS)) {
    return {
      mode: 'compression_turn',
      reason: 'The player stated a broad investigative goal, not a single close-up search beat.',
      remedy: 'Compress repeated checks and land a new fact, contradiction, cost, or named blocker.',
      requiredDelta: 'new named fact, contradiction, or obstacle owner',
      forbiddenRepeat: repeatedSurface,
      broadGoal: true,
    }
  }

  if (recentAftermath(state, normalized) || beatMode === 'aftermath' || beatMode === 'debrief') {
    return {
      mode: 'aftermath',
      reason: 'Recent play resolved or closed a pressure surface.',
      remedy: 'Let consequences land, then close, reframe, or hand the player the next live hook.',
      requiredDelta: 'consequence, relationship read, or scene reframe',
    }
  }

  if (
    target &&
    chapterTurn >= Math.max(target.min, target.max - 2) &&
    (pacing?.arcDormantIds.length || pacing?.stagnantThreadIds.length)
  ) {
    return {
      mode: 'chapter_turn',
      reason: 'The chapter is near its pacing ceiling while core pressure is still dormant or stagnant.',
      remedy: 'Move the chapter phase: force an arc-bearing consequence, reframe, or decisive pressure turn.',
      requiredDelta: 'arc-bearing thread advances or the chapter reframes toward closure',
    }
  }

  if (pacing?.arcDormantIds.length) {
    return {
      mode: 'chapter_turn',
      reason: 'An active arc has not advanced this chapter.',
      remedy: 'Re-engage a constituent thread through a chapter-scale pressure turn.',
      requiredDelta: 'arc constituent thread changes state or gains a new named pressure',
    }
  }

  if (sceneExhausted) {
    return {
      mode: 'compression_turn',
      reason: 'The same procedural surface has repeated without material change.',
      remedy: 'Stop replaying the same small obstacle; compress to the next changed situation.',
      requiredDelta: 'new fact, cost, actor move, scene end, or changed position',
      forbiddenRepeat: repeatedSurface,
      sceneExhausted: true,
    }
  }

  if (pacing?.reactivityTripped) {
    return {
      mode: 'compression_turn',
      reason: 'Recent turns have been too player-reactive.',
      remedy: 'Let the world initiate a visible move and carry play to its consequence.',
      requiredDelta: 'NPC, faction, clock, or off-stage pressure moves first',
    }
  }

  if (beatMode === 'planning') {
    return {
      mode: 'compression_turn',
      reason: 'Planning can cover several linked decisions before the next risky execution beat.',
      remedy: 'Resolve the plan at decision scale and land at the first committed risk.',
      broadGoal: true,
    }
  }

  return {
    mode: 'micro_scene',
    reason: 'The player action is a close, current-scene move.',
    remedy: 'Keep the camera tight and change one concrete thing before handing play back.',
  }
}

export function renderNarrativeTempoRecommendation(
  recommendation: Sf2NarrativeTempoRecommendation
): string {
  const lines = [
    '## Narrative tempo (private)',
    `- Recommended mode: ${recommendation.mode}`,
    `- Reason: ${recommendation.reason}`,
    `- Remedy: ${recommendation.remedy}`,
  ]
  if (recommendation.requiredDelta) lines.push(`- Required delta: ${recommendation.requiredDelta}`)
  if (recommendation.forbiddenRepeat) lines.push(`- Forbidden repeat: ${recommendation.forbiddenRepeat}`)
  if (recommendation.sceneExhausted) {
    lines.push('- Scene exhaustion: detected from repeated predicate with no material change.')
  }
  if (recommendation.broadGoal) {
    lines.push('- Broad-goal handling: resolve at goal scale after one meaningful roll if a roll is needed.')
  }
  return lines.join('\n')
}

export function deriveRepeatedProceduralSurface(state: Sf2State): string | undefined {
  const recent = state.history.turns.slice(-3)
  if (recent.length < 3) return undefined
  if (recent.some(hasMaterialDelta)) return undefined
  const keys = recent.map((turn) => predicateKey(turn.playerInput || turn.narratorProse))
  const first = keys[0]
  if (!first || keys.some((key) => key !== first)) return undefined
  return readablePredicate(first)
}

export function inferTurnNarrativeTempo(turn: Sf2TurnRecord): Sf2NarrativeTempoMode {
  const annotated = turn.narratorAnnotation?.tempoMode
  if (isSf2NarrativeTempoMode(annotated)) return annotated
  const raw = turn.narratorAnnotationRaw?.tempo_mode ?? turn.narratorAnnotationRaw?.tempoMode
  if (isSf2NarrativeTempoMode(raw)) return raw
  const normalized = normalize(turn.playerInput)
  if (matchesAny(normalized, DOWNTIME_PATTERNS)) return 'downtime'
  if (matchesAny(normalized, TIME_JUMP_PATTERNS)) return 'time_jump'
  if (matchesAny(normalized, MONTAGE_PATTERNS)) return 'montage'
  if (matchesAny(normalized, TRAVEL_PATTERNS)) return 'time_jump'
  if (matchesAny(normalized, BROAD_INVESTIGATION_PATTERNS)) return 'compression_turn'
  return 'micro_scene'
}

export function computeNarrativeTempoMetrics(state: Sf2State): Sf2NarrativeTempoMetrics {
  const turns = state.history.turns
  let consecutiveMicroTurns = 0
  for (let i = turns.length - 1; i >= 0; i--) {
    if (inferTurnNarrativeTempo(turns[i]) !== 'micro_scene') break
    consecutiveMicroTurns += 1
  }

  const repeatedProceduralSurface = deriveRepeatedProceduralSurface(state)
  return {
    consecutiveMicroTurns,
    turnsSinceMaterialDelta: turnsSince(turns, hasMaterialDelta),
    turnsSinceTimeAdvanced: turnsSince(turns, hasTimeAdvance),
    turnsSinceLocationChanged: turnsSince(turns, hasLocationChange),
    turnsSinceNewFact: turnsSince(turns, hasNewFact),
    turnsSinceRelationshipDelta: turnsSince(turns, hasRelationshipDelta),
    turnsSinceFactionOrPressureMoved: turnsSince(turns, hasFactionOrPressureMove),
    turnsSinceSceneEnded: turnsSince(turns, hasSceneEnd),
    repeatedProceduralSurface,
    guards: {
      excessiveMicroNoDelta:
        consecutiveMicroTurns > 8 && turnsSince(turns, hasMaterialDelta) > 8,
      repeatedProceduralSurface: Boolean(repeatedProceduralSurface),
    },
  }
}

function hasLiveEmbodiedPressure(
  state: Sf2State,
  beatMode: Sf2BeatMode,
  input: string
): boolean {
  if (state.world.combat?.active || beatMode === 'combat') return true
  if (matchesAny(input, IMMEDIATE_PRESSURE_PATTERNS)) return true
  const presentNpcIds = state.world.sceneSnapshot.presentNpcIds ?? []
  return presentNpcIds.some((id) => {
    const npc = state.campaign.npcs[id]
    return npc?.disposition === 'hostile'
  })
}

function recentAftermath(state: Sf2State, input: string): boolean {
  if (matchesAny(input, AFTERMATH_PATTERNS)) return true
  return state.history.turns.slice(-2).some((turn) => {
    if (turn.archivistPatchApplied?.sceneResult) return true
    return (turn.archivistPatchApplied?.transitions ?? []).some(
      (transition) =>
        transition.entityKind === 'thread' &&
        (transition.toStatus.startsWith('resolved_') || transition.toStatus === 'abandoned')
    )
  })
}

function turnsThisChapter(state: Sf2State): number {
  return state.history.turns.filter((turn) => turn.chapter === state.meta.currentChapter).length
}

function hasMaterialDelta(turn: Sf2TurnRecord): boolean {
  return (
    hasTimeAdvance(turn) ||
    hasLocationChange(turn) ||
    hasNewFact(turn) ||
    hasRelationshipDelta(turn) ||
    hasFactionOrPressureMove(turn) ||
    hasSceneEnd(turn)
  )
}

function hasTimeAdvance(turn: Sf2TurnRecord): boolean {
  return rawEffects(turn).some((effect) => {
    if (effect.kind === 'set_scene_snapshot') {
      const snapshot = asRecord(effect.snapshot)
      return typeof snapshot.time_label === 'string' && snapshot.time_label.trim().length > 0
    }
    return false
  })
}

function hasLocationChange(turn: Sf2TurnRecord): boolean {
  return rawEffects(turn).some((effect) =>
    effect.kind === 'set_location' ||
    (effect.kind === 'set_scene_snapshot' && typeof asRecord(effect.snapshot).location_id === 'string')
  )
}

function hasSceneEnd(turn: Sf2TurnRecord): boolean {
  if (turn.archivistPatchApplied?.sceneResult) return true
  return rawEffects(turn).some((effect) => effect.kind === 'scene_end')
}

function hasNewFact(turn: Sf2TurnRecord): boolean {
  const patch = turn.archivistPatchApplied
  if (!patch) return false
  if ((patch.creates ?? []).some((create) => create.kind === 'clue' || create.kind === 'document')) {
    return true
  }
  if ((patch.revelationHintsDelivered ?? []).length > 0 || (patch.revelationsRevealed ?? []).length > 0) {
    return true
  }
  return (patch.updates ?? []).some((update) =>
    update.entityKind === 'thread' &&
    Object.keys(update.changes ?? {}).some((key) =>
      ['resolutionCriteria', 'failureMode', 'retrievalCue', 'deterioration'].includes(key)
    )
  )
}

function hasRelationshipDelta(turn: Sf2TurnRecord): boolean {
  return (turn.archivistPatchApplied?.updates ?? []).some((update) =>
    update.entityKind === 'npc' &&
    Object.keys(update.changes ?? {}).some((key) =>
      ['disposition', 'agenda', 'identity', 'voice'].includes(key)
    )
  )
}

function hasFactionOrPressureMove(turn: Sf2TurnRecord): boolean {
  const patch = turn.archivistPatchApplied
  if (!patch) return false
  if ((patch.pressureEvents ?? []).length > 0 || (patch.ladderFires ?? []).length > 0) return true
  return (patch.updates ?? []).some((update) =>
    (update.entityKind === 'faction' && Object.keys(update.changes ?? {}).length > 0) ||
    (update.entityKind === 'thread' && typeof update.changes?.tension === 'number')
  )
}

function rawEffects(turn: Sf2TurnRecord): Array<Record<string, unknown>> {
  const raw = turn.narratorAnnotationRaw?.mechanical_effects
    ?? turn.narratorAnnotationRaw?.mechanicalEffects
  return Array.isArray(raw) ? raw as Array<Record<string, unknown>> : []
}

function turnsSince(turns: Sf2TurnRecord[], predicate: (turn: Sf2TurnRecord) => boolean): number {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (predicate(turns[i])) return turns.length - 1 - i
  }
  return turns.length
}

function predicateKey(text: string): string {
  const lower = normalize(text)
  if (matchesAny(lower, [/\b(file|filing|registry|record|ledger|manifest|document)\b/])) return 'document surface'
  if (matchesAny(lower, [/\b(terminal|console|system|network|lock|hatch|door|gate)\b/])) return 'access surface'
  if (matchesAny(lower, [/\b(search|inspect|investigate|scan|look for|examine)\b/])) return 'search predicate'
  if (matchesAny(lower, [/\b(ask|press|question|interrogate|demand)\b/])) return 'ask predicate'
  if (matchesAny(lower, [/\b(wait|pause|listen|watch)\b/])) return 'waiting predicate'
  return ''
}

function readablePredicate(key: string): string | undefined {
  if (!key) return undefined
  if (key === 'document surface') return 'do not ask for another filing, registry, ledger, manifest, or document beat'
  if (key === 'access surface') return 'do not restate the same terminal, lock, hatch, door, gate, or access blocker'
  if (key === 'search predicate') return 'do not repeat another search/scan/inspect beat without a new fact'
  if (key === 'ask predicate') return 'do not repeat the same ask/press/question beat without a changed answer or cost'
  if (key === 'waiting predicate') return 'do not spend another turn merely waiting without time or pressure moving'
  return key
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function matchesAny(input: string, patterns: RegExp[]): boolean {
  if (!input) return false
  return patterns.some((pattern) => pattern.test(input))
}

const TIME_JUMP_PATTERNS = [
  /\b(wait until|wait for|until morning|until night|tomorrow|next morning|skip ahead|fast[- ]forward|time passes|later)\b/,
]

const TRAVEL_PATTERNS = [
  /\b(travel to|journey to|go to|head to|return to|follow the lead|follow that lead|move on to|depart for|set out for)\b/,
]

const MONTAGE_PATTERNS = [
  /\b(montage|over the next|for the next|spend (?:the )?(?:day|night|hours?|week)|work the|prepare|prep|make arrangements|case the)\b/,
]

const DOWNTIME_PATTERNS = [
  /\b(rest|recover|sleep|train|shop|resupply|craft|repair|downtime|take a quiet|take the evening)\b/,
]

const BROAD_INVESTIGATION_PATTERNS = [
  /\b(investigate|search for|look for|track down|trace the|get to the bottom|figure out|piece together|follow the evidence|follow the trail)\b/,
]

const AFTERMATH_PATTERNS = [
  /\b(aftermath|fallout|debrief|report back|process what happened|now that it'?s over|reckon with)\b/,
]

const IMMEDIATE_PRESSURE_PATTERNS = [
  /\b(attack|shoot|strike|stab|slash|dodge|parry|grapple|wrestle|tackle|run from|escape from|under fire)\b/,
  /\b(surgery|bleeding|collapsing|choking|poison|compulsion|panic|betrayal happens|draws a weapon)\b/,
]
