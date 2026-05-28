import type { Sf2State } from '../types'

export const PROSE_FIRST_CLOSE_LOOP_PHASES = [
  'early_no_close',
  'compress_no_future',
  'close_candidate_or_plan',
  'active_revelation_defer',
  'hard_boundary_strict',
] as const

export type ProseFirstCloseLoopPhase = typeof PROSE_FIRST_CLOSE_LOOP_PHASES[number]

export interface ProseFirstCloseLoopFact {
  id: string
  text: string
  aliases?: string[]
}

export interface ProseFirstCloseLoopInput {
  turnIndex?: number
  playerInput?: string
  recentProse?: string
  doneFacts?: ProseFirstCloseLoopFact[]
  inFlightFacts?: ProseFirstCloseLoopFact[]
  notDoneFacts?: ProseFirstCloseLoopFact[]
  activeBlockers?: string[]
  hardBoundary?: string | null
  objectiveAccepted?: boolean
  decisionCommitted?: boolean
  closePressure?: boolean
}

export interface ProseFirstCloseLoopStateInput {
  state: Sf2State
  playerInput: string
  transcript?: Array<{ role: 'user' | 'assistant'; content: string }>
  turnIndex?: number
}

export interface ProseFirstCloseLoopAdvisory {
  phase: ProseFirstCloseLoopPhase
  requiredNextDelta: string
  forbiddenRepeat: string
  hardBoundaryInstruction: string | null
  activeBlockers: string[]
  facts: {
    done: ProseFirstCloseLoopFact[]
    inFlight: ProseFirstCloseLoopFact[]
    notDone: ProseFirstCloseLoopFact[]
  }
  text: string
}

export interface ProseFirstChapterStatus {
  phase?: string
  foreground_question?: string
  answered?: boolean
  close_candidate?: boolean
  close_intent?: string
  handover_ready?: boolean
  signals_true: string[]
  never_close_mid_active: string[]
  active_blockers: string[]
  next_required_delta?: string
  should_not_do_next?: string
  reason?: string
}

export interface ProseFirstChapterStatusValidation {
  status: ProseFirstChapterStatus | null
  malformedNestedStatus: boolean
  errors: string[]
}

export interface ProseFirstFactLockViolation {
  factId: string
  factText: string
  matchedAlias: string
  surface: 'status_field' | 'done_clause'
}

export interface ProseFirstFactLockValidation {
  violations: ProseFirstFactLockViolation[]
  closeClaimed: boolean
}

const CLOSE_INTENTS = new Set(['close_after_current_exchange', 'close_this_turn', 'reframe_this_turn'])

export function buildProseFirstCloseLoopAdvisory(input: ProseFirstCloseLoopInput): ProseFirstCloseLoopAdvisory {
  const done = input.doneFacts ?? []
  const inFlight = input.inFlightFacts ?? []
  const notDone = input.notDoneFacts ?? []
  const activeBlockers = deriveActiveBlockers(input)
  const hardBoundary = compact(input.hardBoundary)
  const phase = deriveCloseLoopPhase(input, activeBlockers, hardBoundary)
  const requiredNextDelta = deriveRequiredNextDelta(phase, input)
  const forbiddenRepeat = deriveForbiddenRepeat(phase, notDone)
  const hardBoundaryInstruction = hardBoundary
    ? `Hard boundary: ${hardBoundary}. Close this chapter now or explicitly reframe around the new chapter question; do not extend the old Chapter 1 loop.`
    : null

  const advisory: ProseFirstCloseLoopAdvisory = {
    phase,
    requiredNextDelta,
    forbiddenRepeat,
    hardBoundaryInstruction,
    activeBlockers,
    facts: { done, inFlight, notDone },
    text: '',
  }
  advisory.text = renderProseFirstCloseLoopAdvisory(advisory)
  return advisory
}

export function buildProseFirstCloseLoopInputFromState(
  input: ProseFirstCloseLoopStateInput
): ProseFirstCloseLoopInput {
  const { state, playerInput, transcript = [] } = input
  const currentChapter = state.meta.currentChapter
  const chapterTurns = state.history.turns.filter((turn) => turn.chapter === currentChapter)
  const turnIndex = input.turnIndex ?? chapterTurns.length
  const chapterHistoryText = [
    ...transcript.slice(-8).map((turn) => turn.content),
    ...chapterTurns.slice(-4).flatMap((turn) => [turn.playerInput, turn.narratorProse]),
  ].filter(Boolean).join('\n')
  const sceneEstablished = chapterTurns.length > 0
    ? state.world.sceneSnapshot?.established ?? []
    : []
  const recentProse = [
    chapterHistoryText,
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...sceneEstablished,
    ...(state.chapter.sceneSummaries ?? [])
      .filter((summary) => summary.chapter === currentChapter)
      .slice(-3)
      .map((summary) => summary.summary),
  ].filter(Boolean).join('\n')
  const currentChapterText = normalizeText(chapterHistoryText)
  const combined = normalizeText(`${playerInput}\n${recentProse}`)
  const threadFacts = deriveChapterThreadFacts(state, currentChapter)
  const doneFacts = [...threadFacts.done, ...deriveEstablishedFacts(combined)]
  const inFlightFacts = [...threadFacts.inFlight, ...deriveInFlightFacts(combined, playerInput)]
  const notDoneFacts = [...threadFacts.notDone, ...deriveRunSpecificNotDoneFacts(state, combined, playerInput)]
  const hardBoundary = deriveRunSpecificHardBoundary(state, currentChapterText, playerInput)
  const targetTurns = state.chapter.setup.pacingContract?.targetTurns

  return {
    turnIndex,
    playerInput,
    recentProse,
    doneFacts,
    inFlightFacts,
    notDoneFacts,
    activeBlockers: deriveStateActiveBlockers(state),
    hardBoundary,
    objectiveAccepted: hasObjectiveAcceptedIntent(playerInput) || Boolean(hardBoundary),
    decisionCommitted: hasDecisionCommittedIntent(playerInput) || Boolean(hardBoundary),
    closePressure:
      turnIndex >= (targetTurns?.min ?? 12) ||
      (doneFacts.length > 0 && (inFlightFacts.length > 0 || notDoneFacts.length > 0)) ||
      Boolean(hardBoundary),
  }
}

export function renderProseFirstCloseLoopAdvisory(advisory: Omit<ProseFirstCloseLoopAdvisory, 'text'>): string {
  return [
    '## Private chapter close-loop advisory',
    `Phase recommendation: ${advisory.phase}`,
    `Required next delta: ${advisory.requiredNextDelta}`,
    `Forbidden repeat: ${advisory.forbiddenRepeat}`,
    `Hard-boundary instruction: ${advisory.hardBoundaryInstruction ?? 'none'}`,
    `Active blockers: ${formatList(advisory.activeBlockers)}`,
    `Done: ${formatFacts(advisory.facts.done)}`,
    `In flight: ${formatFacts(advisory.facts.inFlight)}`,
    `Not done: ${formatFacts(advisory.facts.notDone)}`,
  ].join('\n')
}

export function normalizeProseFirstChapterStatus(raw: unknown): ProseFirstChapterStatusValidation {
  const errors: string[] = []
  const base = asRecord(raw)
  if (!base) return { status: null, malformedNestedStatus: false, errors: ['chapter_status must be an object'] }

  let source = base
  let malformedNestedStatus = false
  const reason = typeof base.reason === 'string' ? base.reason.trim() : ''
  const nested = parseJsonObject(reason)
  if (nested && looksLikeChapterStatus(nested)) {
    source = { ...nested, reason: typeof nested.reason === 'string' ? nested.reason : base.reason }
    malformedNestedStatus = true
  }

  const status: ProseFirstChapterStatus = {
    phase: stringOrUndefined(source.phase),
    foreground_question: stringOrUndefined(source.foreground_question),
    answered: booleanOrUndefined(source.answered),
    close_candidate: booleanOrUndefined(source.close_candidate),
    close_intent: stringOrUndefined(source.close_intent),
    handover_ready: booleanOrUndefined(source.handover_ready),
    signals_true: stringArray(source.signals_true),
    never_close_mid_active: stringArray(source.never_close_mid_active),
    active_blockers: stringArray(source.active_blockers),
    next_required_delta: stringOrUndefined(source.next_required_delta),
    should_not_do_next: stringOrUndefined(source.should_not_do_next),
    reason: stringOrUndefined(source.reason),
  }

  if (!status.phase) errors.push('chapter_status.phase missing or non-string')
  if (status.answered === undefined) errors.push('chapter_status.answered missing or non-boolean')
  if (status.close_candidate === undefined) errors.push('chapter_status.close_candidate missing or non-boolean')
  if (!status.close_intent) errors.push('chapter_status.close_intent missing or non-string')
  if (status.handover_ready === undefined) errors.push('chapter_status.handover_ready missing or non-boolean')
  if (!Array.isArray(source.signals_true)) errors.push('chapter_status.signals_true missing or non-array')

  return { status, malformedNestedStatus, errors }
}

export function detectProseFirstFactLockViolations(input: {
  status: ProseFirstChapterStatus | null
  notDoneFacts: ProseFirstCloseLoopFact[]
}): ProseFirstFactLockValidation {
  const status = input.status
  if (!status) return { violations: [], closeClaimed: false }

  const closeClaimed =
    Boolean(status.close_candidate) ||
    Boolean(status.handover_ready) ||
    Boolean(status.close_intent && CLOSE_INTENTS.has(status.close_intent))

  if (!closeClaimed) return { violations: [], closeClaimed }

  const fieldClaims = [
    status.phase,
    status.foreground_question,
    status.close_intent,
    status.next_required_delta,
    status.should_not_do_next,
    ...status.signals_true,
  ].filter((value): value is string => Boolean(value))
  const doneClaims = extractDoneClause(status.reason ?? '')
  const violations: ProseFirstFactLockViolation[] = []

  for (const fact of input.notDoneFacts) {
    const aliases = factAliases(fact)
    for (const alias of aliases) {
      if (fieldClaims.some((claim) => containsNormalizedPhrase(claim, alias))) {
        violations.push({ factId: fact.id, factText: fact.text, matchedAlias: alias, surface: 'status_field' })
        break
      }
      if (doneClaims && containsNormalizedPhrase(doneClaims, alias)) {
        violations.push({ factId: fact.id, factText: fact.text, matchedAlias: alias, surface: 'done_clause' })
        break
      }
    }
  }

  return { violations: dedupeViolations(violations), closeClaimed }
}

function deriveCloseLoopPhase(
  input: ProseFirstCloseLoopInput,
  activeBlockers: string[],
  hardBoundary: string | null
): ProseFirstCloseLoopPhase {
  if (hardBoundary) return 'hard_boundary_strict'
  if (activeBlockers.length > 0) return 'active_revelation_defer'
  if (input.decisionCommitted || input.objectiveAccepted) return 'close_candidate_or_plan'
  if (
    input.closePressure &&
    (input.doneFacts?.length ?? 0) > 0 &&
    (input.inFlightFacts?.length ?? 0) === 0 &&
    (input.notDoneFacts?.length ?? 0) === 0
  ) {
    return 'close_candidate_or_plan'
  }
  if (input.closePressure) return 'compress_no_future'
  return 'early_no_close'
}

function deriveActiveBlockers(input: ProseFirstCloseLoopInput): string[] {
  const blockers = [...(input.activeBlockers ?? [])]
  const text = normalizeText(input.playerInput ?? '')
  if (
    /\b(ask|question|tell me|explain|answer|answers?|says?|said|replies|responds)\b/.test(text) &&
    /\b(slink|npc|crew|broker|handler|contact|witness)\b/.test(text)
  ) {
    blockers.push('active revelation/NPC response is live; finish the answer before close')
  }
  return [...new Set(blockers.map((blocker) => blocker.trim()).filter(Boolean))]
}

function deriveRequiredNextDelta(phase: ProseFirstCloseLoopPhase, input: ProseFirstCloseLoopInput): string {
  switch (phase) {
    case 'early_no_close':
      return 'Make one concrete visible delta toward the chapter-defining decision; do not signal close.'
    case 'compress_no_future':
      return 'Compress only to the next established decision point or negotiation beat; keep future execution facts Not done.'
    case 'close_candidate_or_plan':
      return 'Either close on established facts or spend one consolidation beat that names the immediate departure/plan handoff.'
    case 'active_revelation_defer':
      return 'Complete the live response/revelation, then steer to the nearest clean boundary.'
    case 'hard_boundary_strict':
      return input.hardBoundary
        ? `Honor the crossed boundary now: ${input.hardBoundary}.`
        : 'Close or explicitly reframe now.'
  }
}

function deriveForbiddenRepeat(phase: ProseFirstCloseLoopPhase, notDone: ProseFirstCloseLoopFact[]): string {
  if (phase === 'compress_no_future' && notDone.length > 0) {
    return `Do not count these as already completed: ${notDone.map((fact) => fact.text).join('; ')}.`
  }
  if (phase === 'hard_boundary_strict') return 'Do not add another old-objective runway beat after the boundary.'
  if (phase === 'active_revelation_defer') return 'Do not close mid-answer or convert live evidence delivery into retrospective summary.'
  return 'Do not repeat the same offer/setup beat without a new visible delta.'
}

function deriveChapterThreadFacts(
  state: Sf2State,
  currentChapter: number
): {
  done: ProseFirstCloseLoopFact[]
  inFlight: ProseFirstCloseLoopFact[]
  notDone: ProseFirstCloseLoopFact[]
} {
  const chapterThreadIds = new Set([
    ...(state.chapter.setup.activeThreadIds ?? []),
    ...(state.chapter.setup.loadBearingThreadIds ?? []),
    state.chapter.setup.spineThreadId,
  ].filter((id): id is string => Boolean(id)))
  const chapterThreads = Object.values(state.campaign.threads)
    .filter((thread) => (
      thread.chapterCreated === currentChapter ||
      thread.spineForChapter === currentChapter ||
      chapterThreadIds.has(thread.id)
    ))

  const resolvedThreads = chapterThreads.filter((thread) =>
    isClosedThreadStatus(thread.status) || hasStrongThreadResolutionEvidence(thread)
  )
  const unresolvedActiveThreads = chapterThreads.filter((thread) =>
    thread.status === 'active' && !hasStrongThreadResolutionEvidence(thread)
  )

  return {
    done: resolvedThreads
      .map((thread) => ({
        id: `thread_${thread.id}_resolved`,
        text: `thread resolved: ${thread.title}`,
        aliases: [thread.title, thread.retrievalCue],
      })),
    inFlight: unresolvedActiveThreads
      .map((thread) => ({
        id: `thread_${thread.id}_in_flight`,
        text: `thread in flight: ${thread.title}`,
        aliases: [thread.title, thread.retrievalCue],
      })),
    notDone: unresolvedActiveThreads
      .filter((thread) => thread.status === 'active' && (thread.loadBearing || thread.spineForChapter === currentChapter))
      .map((thread) => ({
        id: `thread_${thread.id}_unresolved`,
        text: `thread unresolved: ${thread.title}`,
        aliases: [thread.title, thread.resolutionCriteria, thread.retrievalCue],
      })),
  }
}

function deriveStateActiveBlockers(state: Sf2State): string[] {
  const blockers: string[] = []
  if (state.world.combat?.active) blockers.push('active combat or physical confrontation is live')
  if (state.world.operation?.status === 'active') blockers.push('active operation/infiltration is live')
  return blockers
}

function isClosedThreadStatus(status: string): boolean {
  return status.startsWith('resolved_') || status === 'abandoned'
}

function hasStrongThreadResolutionEvidence(thread: Sf2State['campaign']['threads'][string]): boolean {
  if (thread.status !== 'active') return false
  const latestProgress = thread.progressEvents
    .slice(-4)
    .map((event) => `${event.summary} ${event.evidenceQuote ?? ''}`)
    .join('\n')
  const text = normalizeText(latestProgress)
  if (!text) return false
  return [
    /\bnow resolved\b/,
    /\bdefinitively established\b/,
    /\bconfirmed as\b/,
    /\bis now confirmed\b/,
    /\bnow understood as\b/,
    /\bmeeting complete\b/,
    /\boperation complete\b/,
    /\brelationship stabilized\b/,
    /\bdecision is locked\b/,
    /\bnext decision is\b/,
  ].some((pattern) => pattern.test(text))
}

function deriveRunSpecificNotDoneFacts(
  state: Sf2State,
  combinedText: string,
  playerInput: string
): ProseFirstCloseLoopFact[] {
  if (!isFortyThousandTransportRun(state, combinedText)) return []
  return deriveTransportJobNotDoneFacts(combinedText, playerInput)
    .filter((fact) => !isTransportFactResolvedByState(state, fact.id))
}

function deriveRunSpecificHardBoundary(
  state: Sf2State,
  recentText: string,
  playerInput: string
): string | null {
  if (!isFortyThousandTransportRun(state, normalizeText(`${recentText}\n${playerInput}`))) return null
  return deriveHardBoundary(recentText, playerInput)
}

function isFortyThousandTransportRun(state: Sf2State, combinedText: string): boolean {
  const seed = normalizeText(`${state.meta.seedId} ${state.chapter.setup.title} ${state.chapter.setup.frame.title}`)
  if (seed.includes('forty thousand')) return true

  const specificSignals = [
    /\bgannett\b/,
    /\bverada\b/,
    /\bmeridian\b/,
    /\bsable corridor\b/,
    /\bforty thousand\b/,
    /\b40k\b/,
  ]
  return specificSignals.filter((pattern) => pattern.test(combinedText)).length >= 2
}

function isTransportFactResolvedByState(state: Sf2State, factId: string): boolean {
  const stateText = normalizeText([
    ...Object.values(state.campaign.threads).flatMap((thread) => [
      thread.title,
      thread.status,
      thread.resolutionCriteria,
      thread.retrievalCue,
      ...thread.progressEvents.flatMap((event) => [event.summary, event.evidenceQuote ?? '']),
    ]),
    ...(state.chapter.sceneSummaries ?? []).map((summary) => summary.summary),
    ...(state.world.sceneSnapshot?.established ?? []),
  ].join('\n'))

  switch (factId) {
    case 'broker_deal':
      return /\b(job accepted|accepted broker s job|broker job accepted|accepted broker job|accepted job offer|rotten job defines you resolved)\b/.test(stateText)
    case 'lien_cleared':
      return /\b(lien cleared|marker cleared|lien paid|marker paid|forty thousand credit lien cleared)\b/.test(stateText)
    case 'cargo_loaded':
      return /\b(cargo loaded|containers loaded|containers aboard|cargo aboard)\b/.test(stateText)
    case 'ship_unclamped':
      return /\b(unclamps?|unclamped|undocked|clamps? .{0,40} released|clamps let go|burned clear|clears berth)\b/.test(stateText)
    case 'departure':
      return /\b(departure complete|departed|undocked|burned clear|clears berth|departure corridor)\b/.test(stateText)
    default:
      return false
  }
}

function deriveEstablishedFacts(combinedText: string): ProseFirstCloseLoopFact[] {
  const facts: ProseFirstCloseLoopFact[] = []
  if (/\b(passenger|passengers|davan|kes)\b/.test(combinedText) && /\b(arranged|agreement|arrangement|aboard|taken on)\b/.test(combinedText)) {
    facts.push({
      id: 'passenger_arrangement',
      text: 'passenger arrangement established',
      aliases: ['passenger arrangement'],
    })
  }
  if (/\b(clamps? (?:let go|released|clear)|unclamped|undocked|burned clear)\b/.test(combinedText)) {
    facts.push({
      id: 'ship_unclamped',
      text: 'ship unclamped',
      aliases: ['unclamped', 'clamps released'],
    })
  }
  return facts
}

function deriveInFlightFacts(combinedText: string, playerInput: string): ProseFirstCloseLoopFact[] {
  const facts: ProseFirstCloseLoopFact[] = []
  const player = normalizeText(playerInput)
  if (
    /\b(broker|job|cargo|lien|marker)\b/.test(combinedText) &&
    /\b(go|going|head|heading|ask|talk|negotiate|before|consider|take|accept)\b/.test(player)
  ) {
    facts.push({
      id: 'broker_negotiation',
      text: 'broker negotiation/job decision is in flight',
      aliases: ['broker negotiation', 'job decision'],
    })
  }
  return facts
}

function deriveTransportJobNotDoneFacts(combinedText: string, playerInput: string): ProseFirstCloseLoopFact[] {
  const player = normalizeText(playerInput)
  const jobRunway =
    /\b(broker|cargo|lien|marker|load|unclamp|depart|undock|berth|corridor|delivery|verada|gannett)\b/.test(`${combinedText} ${player}`) &&
    !/\b(deal signed|contract signed|job accepted and filed|broker deal accepted)\b/.test(combinedText)
  if (!jobRunway) return []

  const candidates: ProseFirstCloseLoopFact[] = [
    {
      id: 'broker_deal',
      text: 'broker deal accepted',
      aliases: ['broker deal', 'job accepted', 'deal signed'],
    },
    {
      id: 'lien_cleared',
      text: 'lien cleared',
      aliases: ['lien clearance', 'marker cleared', 'lien paid'],
    },
    {
      id: 'cargo_loaded',
      text: 'cargo loaded',
      aliases: ['cargo loading', 'loaded cargo', 'loading'],
    },
    {
      id: 'ship_unclamped',
      text: 'ship unclamped',
      aliases: ['unclamping', 'clamps released', 'undocked'],
    },
    {
      id: 'departure',
      text: 'departure complete',
      aliases: ['departed', 'departure', 'burned clear'],
    },
  ]

  return candidates.filter((fact) => !factAliases(fact).some((alias) => containsNormalizedPhrase(combinedText, alias)))
}

function deriveHardBoundary(recentText: string, playerInput: string): string | null {
  const player = normalizeText(playerInput)
  const asksAboutDeparture = /\b(should|can|could|would|do we|are we|ask|question|whether)\b/.test(player)
  const defersDeparture =
    /\b(before|don t|do not|not|without|hold|wait|delay|avoid|plan|prepare)\b.{0,80}\b(undock|unclamp|depart|departure|corridor|burn)\b/.test(player) ||
    /\b(undock|unclamp|depart|departure|corridor|burn)\b.{0,80}\b(later|yet|first|after)\b/.test(player)
  const commitsToDeparture = /\b(undock|unclamp|burn for|burn toward|burn to|depart|leave port|clear the berth|take off)\b/.test(player)
  if (commitsToDeparture && !asksAboutDeparture && !defersDeparture) {
    return 'undock/departure boundary crossed or explicitly chosen'
  }
  if (/\b(clamps? (?:let go|released|clear)|unclamped|undocked|burned clear|departure corridor)\b/.test(recentText)) {
    return 'undock/departure boundary crossed'
  }
  return null
}

function hasObjectiveAcceptedIntent(playerInput: string): boolean {
  return /\b(accept|take the job|sign|agree|we do it|yes)\b/i.test(playerInput)
}

function hasDecisionCommittedIntent(playerInput: string): boolean {
  return /\b(decide|choose|commit|accept|sign|agree|lock it in)\b/i.test(playerInput)
}

function extractDoneClause(reason: string): string {
  const match = /(?:^|\b)done\s*:\s*([\s\S]*?)(?:\b(?:in flight|not done)\s*:|$)/i.exec(reason)
  return match?.[1] ?? ''
}

function looksLikeChapterStatus(value: Record<string, unknown>): boolean {
  return ['phase', 'close_intent', 'signals_true', 'handover_ready', 'close_candidate'].some((key) => key in value)
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  if (!text.startsWith('{') || !text.endsWith('}')) return null
  try {
    return asRecord(JSON.parse(text))
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function formatFacts(facts: ProseFirstCloseLoopFact[]): string {
  return facts.length > 0 ? facts.map((fact) => fact.text).join('; ') : '(none)'
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join('; ') : '(none)'
}

function factAliases(fact: ProseFirstCloseLoopFact): string[] {
  return [fact.text, fact.id.replace(/[_-]+/g, ' '), ...(fact.aliases ?? [])]
    .map((alias) => normalizeText(alias))
    .filter(Boolean)
}

function containsNormalizedPhrase(text: string, phrase: string): boolean {
  return normalizeText(text).includes(normalizeText(phrase))
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function compact(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function dedupeViolations(violations: ProseFirstFactLockViolation[]): ProseFirstFactLockViolation[] {
  const seen = new Set<string>()
  return violations.filter((violation) => {
    const key = `${violation.factId}:${violation.surface}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
