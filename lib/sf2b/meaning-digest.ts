import type {
  Sf2ChapterMeaning,
  Sf2Decision,
  Sf2Faction,
  Sf2Npc,
  Sf2Promise,
  Sf2State,
  Sf2Thread,
  Sf2ThreadStatus,
  Sf2TurnRecord,
} from '../sf2/types'

export interface Sf2bDigestItem {
  id: string
  label: string
  detail: string
  turn?: number
  chapter?: number
}

export interface Sf2bMeaningDigestCandidate {
  chapter: number
  situation: string
  tension: string
  ticking: string
  question: string
  closer: string
  closingResolution: Sf2ChapterMeaning['closingResolution']
  synthesizedAtTurn: number
  evidence: {
    activeThreads: Sf2bDigestItem[]
    resolvedThreads: Sf2bDigestItem[]
    promises: Sf2bDigestItem[]
    decisions: Sf2bDigestItem[]
    npcMovements: Sf2bDigestItem[]
    factionMovements: Sf2bDigestItem[]
    hardFacts: Sf2bDigestItem[]
    unresolvedPressures: Sf2bDigestItem[]
    recentTurns: Sf2bDigestItem[]
  }
  compactSummary: string
}

export interface Sf2bMeaningDigestOptions {
  recentTurns?: Sf2TurnRecord[]
  maxItemsPerSection?: number
}

const DEFAULT_MAX_ITEMS = 5

const RESOLVED_THREAD_STATUSES = new Set<Sf2ThreadStatus>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
])

export function buildMeaningDigestCandidate(
  state: Sf2State,
  options: Sf2bMeaningDigestOptions = {}
): Sf2bMeaningDigestCandidate {
  const maxItems = options.maxItemsPerSection ?? DEFAULT_MAX_ITEMS
  const chapter = state.meta.currentChapter
  const recentTurns = (options.recentTurns ?? state.history.recentTurns ?? state.history.turns).filter(
    (turn) => turn.chapter === chapter
  )
  const allThreads = Object.values(state.campaign.threads)
  const activeThreads = allThreads
    .filter((thread) => thread.status === 'active')
    .sort(sortThreadsByPressure)
    .slice(0, maxItems)
  const resolvedThreads = allThreads
    .filter((thread) => RESOLVED_THREAD_STATUSES.has(thread.status))
    .sort((a, b) => (b.lastAdvancedTurn ?? 0) - (a.lastAdvancedTurn ?? 0))
    .slice(0, maxItems)
  const promises = Object.values(state.campaign.promises)
    .filter((promise) => promise.status === 'active' || promise.status === 'broken')
    .sort(sortByTurnDesc)
    .slice(0, maxItems)
  const decisions = Object.values(state.campaign.decisions)
    .filter((decision) => decision.status === 'active' || decision.status === 'paid')
    .sort(sortByTurnDesc)
    .slice(0, maxItems)
  const npcMovements = Object.values(state.campaign.npcs)
    .filter((npc) => Boolean(npc.agenda?.currentMove) || Boolean(npc.tempLoadTag))
    .sort((a, b) => (b.agenda?.lastUpdatedTurn ?? b.lastSeenTurn ?? 0) - (a.agenda?.lastUpdatedTurn ?? a.lastSeenTurn ?? 0))
    .slice(0, maxItems)
  const factionMovements = Object.values(state.campaign.factions)
    .filter((faction) => Boolean(faction.agenda?.currentMove) || faction.heat !== 'none')
    .sort((a, b) => (b.agenda?.lastUpdatedTurn ?? 0) - (a.agenda?.lastUpdatedTurn ?? 0))
    .slice(0, maxItems)
  const factionMovementItems = factionMovements.map(factionToDigestItem)
  const hardFacts = deriveHardFacts(state, maxItems)
  const unresolvedPressures = deriveUnresolvedPressures(state, activeThreads, maxItems)
  const recentTurnItems = recentTurns.slice(-maxItems).map((turn) => ({
    id: `turn_${turn.index}`,
    label: `Turn ${turn.index}`,
    detail: compact(turn.narratorProse || turn.playerInput, 180),
    turn: turn.index,
    chapter: turn.chapter,
  }))

  const situation =
    state.chapter.setup.frame.premise ||
    state.chapter.setup.openingSceneSpec.initialState ||
    `${state.player.name} stood inside ${state.chapter.title}.`
  const tension =
    topThread(activeThreads)?.resolutionCriteria ||
    state.chapter.setup.frame.centralTension ||
    state.chapter.setup.frame.activePressure
  const ticking =
    topEngine(state)?.summary ||
    topFactionMove(factionMovementItems)?.detail ||
    state.chapter.setup.frame.activePressure
  const question =
    state.chapter.setup.pacingContract?.chapterQuestion ||
    topThread(activeThreads)?.resolutionCriteria ||
    state.chapter.setup.frame.objective
  const closer =
    tailProse(recentTurns) ||
    state.world.sceneSnapshot.established.slice(-1)[0] ||
    state.chapter.setup.frame.crucible
  const closingResolution = inferClosingResolution(resolvedThreads, activeThreads)

  const evidence = {
    activeThreads: activeThreads.map(threadToDigestItem),
    resolvedThreads: resolvedThreads.map(threadToDigestItem),
    promises: promises.map(promiseToDigestItem),
    decisions: decisions.map(decisionToDigestItem),
    npcMovements: npcMovements.map(npcToDigestItem),
    factionMovements: factionMovementItems,
    hardFacts,
    unresolvedPressures,
    recentTurns: recentTurnItems,
  }

  return {
    chapter,
    situation: compact(situation, 220),
    tension: compact(tension, 220),
    ticking: compact(ticking, 220),
    question: compact(question, 220),
    closer: compact(closer, 220),
    closingResolution,
    synthesizedAtTurn: state.history.turns.at(-1)?.index ?? 0,
    evidence,
    compactSummary: renderCompactSummary(chapter, {
      situation,
      tension,
      ticking,
      question,
      closer,
      closingResolution,
    }),
  }
}

function deriveHardFacts(state: Sf2State, maxItems: number): Sf2bDigestItem[] {
  const facts: Sf2bDigestItem[] = []
  const plan = state.campaign.arcPlan

  for (const fact of plan?.invariantFacts ?? []) {
    facts.push({ id: `arc_fact_${facts.length + 1}`, label: 'Invariant fact', detail: fact })
  }

  for (const document of Object.values(state.campaign.documents)) {
    facts.push({
      id: document.id,
      label: document.kindLabel,
      detail: document.currentSummary || document.originalSummary || document.authorizes,
      turn: document.turn,
      chapter: document.chapterCreated,
    })
  }

  for (const clue of Object.values(state.campaign.clues)) {
    if (clue.status === 'consumed') continue
    facts.push({
      id: clue.id,
      label: clue.title,
      detail: clue.content,
      turn: clue.turn,
      chapter: clue.chapterCreated,
    })
  }

  return facts.slice(0, maxItems)
}

function deriveUnresolvedPressures(
  state: Sf2State,
  activeThreads: Sf2Thread[],
  maxItems: number
): Sf2bDigestItem[] {
  const pressureItems: Sf2bDigestItem[] = activeThreads.map((thread) => ({
    id: thread.id,
    label: thread.title,
    detail: thread.failureMode,
    chapter: thread.chapterCreated,
    turn: thread.lastAdvancedTurn,
  }))

  for (const engine of Object.values(state.campaign.engines)) {
    if (engine.status !== 'active') continue
    pressureItems.push({
      id: engine.id,
      label: engine.name,
      detail: `${engine.summary} (${engine.value}/10)`,
      chapter: engine.lastUpdatedChapter,
      turn: engine.lastUpdatedTurn,
    })
  }

  return pressureItems.slice(0, maxItems)
}

function renderCompactSummary(
  chapter: number,
  parts: Omit<
    Sf2bMeaningDigestCandidate,
    'chapter' | 'synthesizedAtTurn' | 'evidence' | 'compactSummary'
  >
): string {
  return [
    `Chapter ${chapter} meaning digest candidate:`,
    `Situation: ${compact(parts.situation, 180)}`,
    `Tension: ${compact(parts.tension, 180)}`,
    `Ticking: ${compact(parts.ticking, 180)}`,
    `Question: ${compact(parts.question, 180)}`,
    `Closer: ${compact(parts.closer, 180)}`,
    `Resolution: ${parts.closingResolution}`,
  ].join('\n')
}

function inferClosingResolution(
  resolvedThreads: Sf2Thread[],
  activeThreads: Sf2Thread[]
): Sf2ChapterMeaning['closingResolution'] {
  const latestResolved = resolvedThreads[0]
  if (!latestResolved || activeThreads.length > 0) return 'unresolved'
  if (latestResolved.status === 'resolved_clean') return 'clean'
  if (latestResolved.status === 'resolved_costly') return 'costly'
  if (latestResolved.status === 'resolved_failure') return 'failure'
  if (latestResolved.status === 'resolved_catastrophic') return 'catastrophic'
  return 'unresolved'
}

function threadToDigestItem(thread: Sf2Thread): Sf2bDigestItem {
  return {
    id: thread.id,
    label: thread.title,
    detail: `${thread.status}; tension ${thread.tension}/10; ${thread.resolutionCriteria}`,
    turn: thread.lastAdvancedTurn,
    chapter: thread.chapterCreated,
  }
}

function promiseToDigestItem(promise: Sf2Promise): Sf2bDigestItem {
  return {
    id: promise.id,
    label: promise.title,
    detail: `${promise.status}; ${promise.obligation}`,
    turn: promise.turn,
    chapter: promise.chapterCreated,
  }
}

function decisionToDigestItem(decision: Sf2Decision): Sf2bDigestItem {
  return {
    id: decision.id,
    label: decision.title,
    detail: `${decision.status}; ${decision.summary}`,
    turn: decision.turn,
    chapter: decision.chapterCreated,
  }
}

function npcToDigestItem(npc: Sf2Npc): Sf2bDigestItem {
  const move = npc.agenda?.currentMove ?? npc.tempLoadTag ?? npc.disposition
  return {
    id: npc.id,
    label: npc.name,
    detail: `${npc.role}; ${move}`,
    turn: npc.agenda?.lastUpdatedTurn ?? npc.lastSeenTurn,
    chapter: npc.chapterCreated,
  }
}

function factionToDigestItem(faction: Sf2Faction): Sf2bDigestItem {
  const move = faction.agenda?.currentMove ?? `heat ${faction.heat}`
  return {
    id: faction.id,
    label: faction.name,
    detail: `${faction.stance}; ${move}`,
    turn: faction.agenda?.lastUpdatedTurn,
  }
}

function topThread(threads: Sf2Thread[]): Sf2Thread | undefined {
  return threads[0]
}

function topEngine(state: Sf2State): { summary: string } | undefined {
  return Object.values(state.campaign.engines)
    .filter((engine) => engine.status === 'active')
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))[0]
}

function topFactionMove(items: Sf2bDigestItem[]): Sf2bDigestItem | undefined {
  return items[0]
}

function tailProse(turns: Sf2TurnRecord[]): string | undefined {
  const prose = turns.at(-1)?.narratorProse
  if (!prose) return undefined
  const sentences = prose
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)

  return sentences.slice(-2).join(' ')
}

function sortThreadsByPressure(a: Sf2Thread, b: Sf2Thread): number {
  return b.tension - a.tension || (b.lastAdvancedTurn ?? 0) - (a.lastAdvancedTurn ?? 0)
}

function sortByTurnDesc<T extends { turn: number }>(a: T, b: T): number {
  return b.turn - a.turn
}

function compact(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}…`
}
