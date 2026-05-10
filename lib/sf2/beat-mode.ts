import type { Sf2State } from './types'

export const SF2_BEAT_MODES = [
  'briefing',
  'planning',
  'montage',
  'social',
  'exploration',
  'access_execution',
  'combat',
  'debrief',
  'aftermath',
  'meta',
] as const

export type Sf2BeatMode = typeof SF2_BEAT_MODES[number]

export interface Sf2BeatModeGuidance {
  mode: Sf2BeatMode
  label: string
  wordBudget: string
  rollPressure: string
  suggestedActions: string
  closePressure: string
  rollDroughtExempt: boolean
  scopeTolerance: string
}

export const SF2_BEAT_MODE_GUIDANCE: Record<Sf2BeatMode, Sf2BeatModeGuidance> = {
  briefing: {
    mode: 'briefing',
    label: 'Briefing',
    wordBudget: 'up to 800 words',
    rollPressure: 'none unless information is uncertain or contested',
    suggestedActions: 'scene-internal choices plus fictionally valid scene-jump actions',
    closePressure: 'none',
    rollDroughtExempt: true,
    scopeTolerance: 'Allow exposition, NPC framing, and setup texture to breathe without forcing action.',
  },
  planning: {
    mode: 'planning',
    label: 'Planning',
    wordBudget: 'up to 1500 words',
    rollPressure: 'only on consequential assumptions or risky commitments',
    suggestedActions: 'scene-jump and command-level actions permitted when fictionally valid',
    closePressure: 'none until the plan is committed',
    rollDroughtExempt: true,
    scopeTolerance: 'Relax scope warnings inside an active operation; support coherent plan construction.',
  },
  montage: {
    mode: 'montage',
    label: 'Montage',
    wordBudget: 'up to 1200 words',
    rollPressure: 'task-resolution rolls only',
    suggestedActions: 'scene-jump actions such as depart, arrive, regroup, or advance time',
    closePressure: 'none',
    rollDroughtExempt: true,
    scopeTolerance: 'Permit compressed time and off-screen task advancement.',
  },
  social: {
    mode: 'social',
    label: 'Social',
    wordBudget: '200-500 words',
    rollPressure: 'default cadence for leverage, deception, insight, or contested asks',
    suggestedActions: 'scene-internal choices',
    closePressure: 'normal',
    rollDroughtExempt: false,
    scopeTolerance: 'Keep the turn anchored to the current exchange and stakes.',
  },
  exploration: {
    mode: 'exploration',
    label: 'Exploration',
    wordBudget: '200-600 words',
    rollPressure: 'on movement, observation, hazards, or uncertain navigation',
    suggestedActions: 'scene-internal move/look/use actions',
    closePressure: 'normal',
    rollDroughtExempt: false,
    scopeTolerance: 'Geography is load-bearing; preserve local spatial continuity.',
  },
  access_execution: {
    mode: 'access_execution',
    label: 'Access / execution',
    wordBudget: '200-500 words',
    rollPressure: 'high; every consequential access, stealth, breach, or exposure action',
    suggestedActions: 'scene-internal procedural actions',
    closePressure: 'normal',
    rollDroughtExempt: false,
    scopeTolerance: 'Relax scope warnings inside an active operation while preserving procedural consequences.',
  },
  combat: {
    mode: 'combat',
    label: 'Combat',
    wordBudget: '150-400 words',
    rollPressure: 'per attack, save, defense, or consequential combat maneuver',
    suggestedActions: 'combat actions',
    closePressure: 'normal',
    rollDroughtExempt: false,
    scopeTolerance: 'Keep action economy clear and resolve one concrete exchange at a time.',
  },
  debrief: {
    mode: 'debrief',
    label: 'Debrief',
    wordBudget: 'up to 1200 words',
    rollPressure: 'none unless a consequential decision remains pending',
    suggestedActions: 'scene-jump actions permitted when fictionally valid',
    closePressure: 'active',
    rollDroughtExempt: true,
    scopeTolerance: 'Allow reflection, reckoning, NPC voice, and consequence interpretation.',
  },
  aftermath: {
    mode: 'aftermath',
    label: 'Aftermath',
    wordBudget: '200-800 words',
    rollPressure: 'rare; only for unresolved immediate uncertainty',
    suggestedActions: 'scene-jump actions permitted when fictionally valid',
    closePressure: 'active',
    rollDroughtExempt: true,
    scopeTolerance: 'Let consequences land, then close or reframe once the dramatic question has landed.',
  },
  meta: {
    mode: 'meta',
    label: 'Meta',
    wordBudget: 'n/a',
    rollPressure: 'suspended',
    suggestedActions: 'n/a',
    closePressure: 'suspended',
    rollDroughtExempt: true,
    scopeTolerance: 'Pause pacing, roll-drought, and forward-motion checks for this turn.',
  },
}

const META_PATTERNS = [
  /\b(should|would|do|did)\s+i\s+(?:have\s+)?(?:roll|rolled|make a roll)\b/,
  /\b(?:missed|forgot|skipped)\s+(?:a\s+)?roll\b/,
  /\b(?:rewind|retcon|take back|undo)\b/,
  /\b(?:rules?|mechanics?|dc|difficulty class|advantage|disadvantage)\b/,
  /\b(?:out of character|ooc|above table|meta)\b/,
]

const PLANNING_PATTERNS = [
  /\b(plan|planning|strategy|strategize|approach|prepare|prep|brief the team)\b/,
  /\b(how should we|what's our plan|before we go|set up|coordinate|assign roles)\b/,
  /\b(case the|scope out|recon|reconnaissance|make arrangements)\b/,
]

const MONTAGE_PATTERNS = [
  /\b(montage|downtime|over the next|for the next|spend (?:the )?(?:day|night|hours?|week))\b/,
  /\b(train|research|recover|rest|shop|resupply|craft|repair|travel to|journey to)\b/,
  /\b(fast[- ]forward|skip ahead|time passes|wrap up)\b/,
]

const DEBRIEF_PATTERNS = [
  /\b(debrief|report back|after action|after-action|reckon with|talk it over)\b/,
  /\b(what did we learn|compare notes|process what happened|explain what happened)\b/,
]

const BRIEFING_PATTERNS = [
  /\b(brief me|briefing|mission details|what's the job|give me the details)\b/,
  /\b(tell me about|explain|lay out|fill me in|what do we know)\b/,
]

const ACCESS_EXECUTION_PATTERNS = [
  /\b(hack|slice|decrypt|crack|bypass|override|spoof|jam|disable|disarm|unlock|breach)\b/,
  /\b(sneak|stealth|infiltrate|tail|shadow|evade|slip past|avoid patrol)\b/,
  /\b(access|terminal|console|lock|door|hatch|security|checkpoint|camera|sensor)\b/,
]

const EXPLORATION_PATTERNS = [
  /\b(explore|search|look around|inspect|examine|investigate|sweep|scan|survey)\b/,
  /\b(move|go|head|walk|enter|leave|climb|descend|cross|follow)\b/,
  /\b(room|corridor|hall|area|site|ruins|facility|district|deck|cave|tunnel)\b/,
]

const SOCIAL_PATTERNS = [
  /\b(ask|tell|say|talk|speak|answer|question|argue|persuade|convince|threaten|comfort)\b/,
  /\b(negotiate|bargain|confess|apologize|accuse|confront|pressure)\b/,
]

const AFTERMATH_TEXT_PATTERNS = [
  /\b(aftermath|consequence|fallout|what happens after|now that it's over)\b/,
  /\b(praise|blame|reward|punish|mourn|celebrate|recover from)\b/,
]

export function isSf2BeatMode(value: string): value is Sf2BeatMode {
  return (SF2_BEAT_MODES as readonly string[]).includes(value)
}

export function getSf2BeatModeGuidance(mode: Sf2BeatMode): Sf2BeatModeGuidance {
  return SF2_BEAT_MODE_GUIDANCE[mode]
}

export function deriveSf2BeatMode(state: Sf2State, playerInput = ''): Sf2BeatMode {
  const input = normalize(playerInput)

  if (matchesAny(input, META_PATTERNS)) return 'meta'
  if (state.world.combat?.active) return 'combat'

  const operationMode = deriveOperationBeatMode(state, input)
  if (operationMode) return operationMode

  if (state.world.exploration) return 'exploration'

  const recentResolutionMode = deriveRecentResolutionBeatMode(state, input)
  if (recentResolutionMode) return recentResolutionMode

  const playerIntentMode = derivePlayerIntentBeatMode(input)
  if (playerIntentMode) return playerIntentMode

  if (hasCurrentInterlocutor(state)) return 'social'

  return 'exploration'
}

export function renderBeatModeBlock(mode: Sf2BeatMode): string {
  const guidance = SF2_BEAT_MODE_GUIDANCE[mode]
  const exemptions = guidance.rollDroughtExempt
    ? 'Generic roll-drought pressure is suspended unless this turn contains consequential uncertainty.'
    : 'Generic roll-drought pressure may apply when the recent cadence warrants it.'

  return [
    '## Beat mode',
    '',
    `- Mode: ${mode} (${guidance.label})`,
    `- Word budget: ${guidance.wordBudget}`,
    `- Roll pressure: ${guidance.rollPressure}`,
    `- Suggested actions: ${guidance.suggestedActions}`,
    `- Close/reframe pressure: ${guidance.closePressure}`,
    `- Scope: ${guidance.scopeTolerance}`,
    `- Roll-drought: ${exemptions}`,
  ].join('\n')
}

function deriveOperationBeatMode(state: Sf2State, input: string): Sf2BeatMode | null {
  const operation = state.world.operation
  const operationRuntime = Object.values(state.campaign.procedures ?? {})
    .find((procedure) => procedure.kind === 'operation' && (procedure.status === 'active' || procedure.status === 'paused'))
  const plan = state.campaign.operationPlan
  const phase = normalize(operationRuntime?.phase ?? operation?.phase ?? '')
  const status = normalize(operationRuntime?.status ?? operation?.status ?? plan?.status ?? '')

  if (plan && plan.status === 'resolved') {
    if (matchesAny(input, DEBRIEF_PATTERNS)) return 'debrief'
    return 'aftermath'
  }
  if (plan && (plan.status === 'abandoned' || plan.status === 'paused')) {
    if (matchesAny(input, PLANNING_PATTERNS)) return 'planning'
  }

  if (!operationRuntime && !operation && !plan) return null

  if (matchesAny(input, DEBRIEF_PATTERNS)) return 'debrief'
  if (matchesAny(input, MONTAGE_PATTERNS)) return 'montage'
  if (matchesAny(input, PLANNING_PATTERNS)) return 'planning'

  if (phase.includes('planning') || status.includes('planning')) return 'planning'
  if (phase.includes('brief') || status.includes('brief')) return 'briefing'
  if (phase.includes('debrief') || status.includes('debrief')) return 'debrief'
  if (phase.includes('aftermath') || status.includes('aftermath')) return 'aftermath'
  if (phase.includes('montage') || status.includes('montage')) return 'montage'

  if ((operationRuntime || operation) && isAccessExecutionText(`${phase} ${status} ${input}`)) return 'access_execution'
  if (operationRuntime || operation || plan?.status === 'active') return 'access_execution'

  return null
}

function deriveRecentResolutionBeatMode(state: Sf2State, input: string): Sf2BeatMode | null {
  if (matchesAny(input, AFTERMATH_TEXT_PATTERNS)) return 'aftermath'
  if (matchesAny(input, DEBRIEF_PATTERNS)) return 'debrief'

  const recentTurns = state.history.turns.slice(-3)
  const recentScene = state.chapter.sceneSummaries[state.chapter.sceneSummaries.length - 1]
  const hasRecentSceneClosure = recentScene && recentScene.leadsTo === null
  const hasRecentResolution = recentTurns.some((turn) => {
    const classifications = [
      turn.archivistPatchApplied?.pacingClassification?.sceneEndLeadsTo,
      turn.pacingClassification?.sceneEndLeadsTo,
    ]
    if (classifications.some((value) => value === null)) return true

    const transitions = turn.archivistPatchApplied?.transitions ?? []
    if (
      transitions.some((write) =>
        write.entityKind === 'thread' &&
        (write.toStatus.startsWith('resolved_') || write.toStatus === 'abandoned')
      )
    ) {
      return true
    }

    return (turn.archivistPatchApplied?.updates ?? []).some((write) =>
      write.entityKind === 'thread' &&
      (typeof write.changes.status === 'string') &&
      (write.changes.status.startsWith('resolved_') || write.changes.status === 'abandoned')
    )
  })

  if (hasRecentResolution) return 'aftermath'
  if (hasRecentSceneClosure && isLowFrictionInput(input)) return 'aftermath'
  return null
}

function derivePlayerIntentBeatMode(input: string): Sf2BeatMode | null {
  if (!input) return null
  if (matchesAny(input, MONTAGE_PATTERNS)) return 'montage'
  if (matchesAny(input, PLANNING_PATTERNS)) return 'planning'
  if (matchesAny(input, DEBRIEF_PATTERNS)) return 'debrief'
  if (matchesAny(input, BRIEFING_PATTERNS)) return 'briefing'
  if (isAccessExecutionText(input)) return 'access_execution'
  if (matchesAny(input, SOCIAL_PATTERNS)) return 'social'
  if (matchesAny(input, EXPLORATION_PATTERNS)) return 'exploration'
  return null
}

function isAccessExecutionText(input: string): boolean {
  return matchesAny(input, ACCESS_EXECUTION_PATTERNS)
}

function hasCurrentInterlocutor(state: Sf2State): boolean {
  const snapshot = state.world.sceneSnapshot
  return (
    (snapshot.currentInterlocutorIds?.length ?? 0) > 0 ||
    (snapshot.presentNpcIds?.length ?? 0) > 0
  )
}

function isLowFrictionInput(input: string): boolean {
  if (!input) return true
  return /^(continue|go on|next|okay|ok|yes|no|i wait|wait|listen|say nothing|nod)\.?$/.test(input)
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function matchesAny(input: string, patterns: RegExp[]): boolean {
  if (!input) return false
  return patterns.some((pattern) => pattern.test(input))
}
