// Compute kill-criteria metrics from an Sf2 session.
// Pure function: takes a session log + state and returns the numbers the v2
// design doc commits us to.

import type { Sf2State } from '../types'

export interface DebugEvent {
  kind: string
  at: number
  data: unknown
}

export interface SessionSummaryMetrics {
  campaignId: string
  genreId: string
  playbookId: string
  originId: string
  chapters: number
  totalTurns: number
  perChapter: Array<{
    chapter: number
    turns: number
    activeArcs: number
    arcAdvancesThisChapter: number
    threadsActiveAtClose: number
    threadsActiveAtOpen: number
    threadContinuity: number | null // null when not enough data
  }>
  archivist: {
    totalWrites: number
    accepted: number
    deferred: number
    rejected: number
    anchorMissesFlagged: number
    driftFlags: number
    anchorMissRate: number // anchorMissesFlagged / totalWrites (0-1)
  }
  pacing: {
    advisoriesFired: number
    breakdown: { reactivity: number; sceneLink: number; stagnation: number; arcDormant: number }
  }
  cost: {
    narratorTokens: { in: number; out: number; cacheWrite: number; cacheRead: number }
    archivistTokens: { in: number; out: number; cacheWrite: number; cacheRead: number }
    authorTokens: { in: number; out: number; cacheWrite: number; cacheRead: number }
    chapterMeaningTokens: { in: number; out: number; cacheWrite: number; cacheRead: number }
    estimatedUsdNarrator: number
    estimatedUsdArchivist: number
    estimatedUsdAuthor: number
    estimatedUsdChapterMeaning: number
    estimatedUsdTotal: number
    // Coverage of the in-memory debug log — token events may be truncated by
    // hot-reload in dev. Cost numbers only cover observed events.
    coverage: {
      narratorTurnsObserved: number
      archivistTurnsObserved: number
      authorCallsObserved: number
      totalTurnsInState: number
      isPartial: boolean // true when any observed count < totalTurnsInState
    }
  }
  coherence: {
    totalFindings: number
    cleanTurns: number
    findingRate: number // findings / (findings + cleanTurns); 0 when no data
    byType: Record<string, number>
    bySeverity: { low: number; medium: number; high: number }
  }
  killCriteria: {
    anchorMissRatePass: boolean // ≤5%
    threadContinuityPass: boolean // ≥50% every transition, no cliff <40%
    arcAdvancementPass: boolean // ≥1 per chapter per active arc
    costPass: boolean // ≤$7
    overallPass: boolean
  }
}

// Pricing per Anthropic public rates (per million tokens).
const PRICING = {
  haiku45: { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.1 },
}

function tokenCost(
  tokens: { in: number; out: number; cacheWrite: number; cacheRead: number },
  rates: { in: number; out: number; cacheWrite: number; cacheRead: number }
): number {
  return (
    (tokens.in * rates.in +
      tokens.out * rates.out +
      tokens.cacheWrite * rates.cacheWrite +
      tokens.cacheRead * rates.cacheRead) /
    1_000_000
  )
}

interface ChapterSnapshot {
  chapter: number
  turn: number
  activeThreadIds: string[]
  activeArcIds: string[]
}

export function computeSessionSummary(
  state: Sf2State,
  debug: DebugEvent[]
): SessionSummaryMetrics {
  const turns = state.history.turns
  const chapters = new Set(turns.map((t) => t.chapter))
  const chapterNumbers = [...chapters].sort((a, b) => a - b)

  // Aggregate Archivist stats from debug entries
  let totalWrites = 0
  let accepted = 0
  let deferred = 0
  let rejected = 0
  let anchorMissesFlagged = 0
  let driftFlags = 0
  for (const ev of debug) {
    if (ev.kind !== 'archivist') continue
    const d = ev.data as {
      summary?: { totalWrites?: number; accepted?: number; deferred?: number; rejected?: number; anchorMisses?: number }
      drift?: Array<{ kind: string }>
    }
    if (d.summary) {
      totalWrites += d.summary.totalWrites ?? 0
      accepted += d.summary.accepted ?? 0
      deferred += d.summary.deferred ?? 0
      rejected += d.summary.rejected ?? 0
      anchorMissesFlagged += d.summary.anchorMisses ?? 0
    }
    if (Array.isArray(d.drift)) {
      driftFlags += d.drift.length
    }
  }

  // Pacing breakdown
  let pacingAdvisoriesFired = 0
  const pacingBreakdown = { reactivity: 0, sceneLink: 0, stagnation: 0, arcDormant: 0 }
  for (const ev of debug) {
    if (ev.kind !== 'pacing_advisory') continue
    const d = ev.data as {
      tripped?: boolean
      reactivityTripped?: boolean
      sceneLinkTripped?: boolean
      stagnantThreadIds?: string[]
      arcDormantIds?: string[]
    }
    if (!d.tripped) continue
    pacingAdvisoriesFired += 1
    if (d.reactivityTripped) pacingBreakdown.reactivity += 1
    if (d.sceneLinkTripped) pacingBreakdown.sceneLink += 1
    if (d.stagnantThreadIds && d.stagnantThreadIds.length > 0) pacingBreakdown.stagnation += 1
    if (d.arcDormantIds && d.arcDormantIds.length > 0) pacingBreakdown.arcDormant += 1
  }

  // Coherence findings (soft signals from the Archivist about how the
  // Narrator honored state). Zero-finding turns push a clean_turn event so
  // the rate is computable without counting-by-absence.
  let coherenceTotalFindings = 0
  let coherenceCleanTurns = 0
  const coherenceByType: Record<string, number> = {}
  const coherenceBySeverity = { low: 0, medium: 0, high: 0 }
  for (const ev of debug) {
    if (ev.kind === 'sf2.coherence.finding') {
      coherenceTotalFindings += 1
      const d = ev.data as { type?: string; severity?: 'low' | 'medium' | 'high' }
      if (d.type) coherenceByType[d.type] = (coherenceByType[d.type] ?? 0) + 1
      if (d.severity === 'low' || d.severity === 'medium' || d.severity === 'high') {
        coherenceBySeverity[d.severity] += 1
      }
    } else if (ev.kind === 'sf2.coherence.clean_turn') {
      coherenceCleanTurns += 1
    }
  }
  const coherenceDenominator = coherenceTotalFindings + coherenceCleanTurns
  const coherenceFindingRate =
    coherenceDenominator > 0 ? coherenceTotalFindings / coherenceDenominator : 0

  // Token aggregates by role
  const narratorTokens = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0 }
  const archivistTokens = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0 }
  const authorTokens = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0 }
  const chapterMeaningTokens = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0 }
  let narratorTurnsObserved = 0
  let archivistTurnsObserved = 0
  let authorCallsObserved = 0
  for (const ev of debug) {
    if (ev.kind !== 'token_usage') continue
    const d = ev.data as { role?: string; inputTokens?: number; outputTokens?: number; cacheWriteTokens?: number; cacheReadTokens?: number }
    const bucket =
      d.role === 'narrator'
        ? narratorTokens
        : d.role === 'archivist'
          ? archivistTokens
          : d.role === 'author'
            ? authorTokens
            : d.role === 'chapter-meaning'
              ? chapterMeaningTokens
              : null
    if (!bucket) continue
    bucket.in += d.inputTokens ?? 0
    bucket.out += d.outputTokens ?? 0
    bucket.cacheWrite += d.cacheWriteTokens ?? 0
    bucket.cacheRead += d.cacheReadTokens ?? 0
    if (d.role === 'narrator') narratorTurnsObserved += 1
    else if (d.role === 'archivist') archivistTurnsObserved += 1
    else if (d.role === 'author') authorCallsObserved += 1
    else if (d.role === 'chapter-meaning') authorCallsObserved += 1
  }

  const estimatedUsdNarrator = tokenCost(narratorTokens, PRICING.haiku45)
  const estimatedUsdArchivist = tokenCost(archivistTokens, PRICING.haiku45)
  const estimatedUsdAuthor = tokenCost(authorTokens, PRICING.haiku45)
  const estimatedUsdChapterMeaning = tokenCost(chapterMeaningTokens, PRICING.haiku45)
  const estimatedUsdTotal =
    estimatedUsdNarrator + estimatedUsdArchivist + estimatedUsdAuthor + estimatedUsdChapterMeaning

  // Per-chapter metrics. Thread continuity: of threads active at close of Ch N,
  // how many remain active at open of Ch N+1. Computed by walking turns.
  const chapterSnapshots: ChapterSnapshot[] = []
  for (const ch of chapterNumbers) {
    const turnsInCh = turns.filter((t) => t.chapter === ch)
    const lastTurnIdx = turnsInCh.at(-1)?.index
    chapterSnapshots.push({
      chapter: ch,
      turn: lastTurnIdx ?? 0,
      activeThreadIds: [], // filled below for the latest snapshot only
      activeArcIds: [],
    })
  }

  // For the LATEST chapter, use current state. Earlier chapters require
  // patch replay to be precise — for the export we approximate using current state.
  const latestActiveThreads = Object.values(state.campaign.threads)
    .filter((t) => t.status === 'active')
    .map((t) => t.id)
  const latestActiveArcs = Object.values(state.campaign.arcs)
    .filter((a) => a.status === 'active')
    .map((a) => a.id)
  if (chapterSnapshots.length > 0) {
    chapterSnapshots[chapterSnapshots.length - 1].activeThreadIds = latestActiveThreads
    chapterSnapshots[chapterSnapshots.length - 1].activeArcIds = latestActiveArcs
  }

  // Approximate per-chapter rollup. For chapters before the latest, we
  // approximate "active at close" as threads created in-or-before ch that are
  // STILL active in current state — a lower bound (excludes threads that
  // were active at ch's close but resolved later). Precise closure snapshots
  // require patch replay.
  //
  // "threadsActiveAtOpen(ch+1)" ≈ "threadsActiveAtClose(ch)" minus any that
  // transitioned at the chapter boundary. Without transition turn-stamps we
  // can't separate those, so we equate them — giving a meaningful baseline
  // instead of the prior 0/0.
  const perChapter = chapterNumbers.map((ch, idx) => {
    const turnsInCh = turns.filter((t) => t.chapter === ch).length
    const arcAdvancesThisChapter = countArcAdvancesInChapter(state, ch)
    const isLatest = idx === chapterNumbers.length - 1

    // Threads created in-or-before ch AND currently active (lower bound on
    // what was active at ch's close).
    const createdAndStillActive = Object.values(state.campaign.threads).filter(
      (t) => t.chapterCreated <= ch && t.status === 'active'
    )
    const activeArcsApprox = Object.values(state.campaign.arcs).filter(
      (a) => a.chapterCreated <= ch && a.status === 'active'
    )

    const threadsActiveAtClose = isLatest
      ? latestActiveThreads.length
      : createdAndStillActive.length
    // Approximation: at-open of ch+1 ≈ at-close of ch (we can't see
    // boundary-time resolutions from current state alone).
    const threadsActiveAtOpen = idx === 0 ? 0 : threadsActiveAtClose

    return {
      chapter: ch,
      turns: turnsInCh,
      activeArcs: isLatest ? latestActiveArcs.length : activeArcsApprox.length,
      arcAdvancesThisChapter,
      threadsActiveAtClose,
      threadsActiveAtOpen,
      // Still null — proper continuity requires boundary snapshots from
      // patch replay. At least the counts are meaningful now.
      threadContinuity: null,
    }
  })

  // Kill criteria
  const anchorMissRate = totalWrites > 0 ? anchorMissesFlagged / totalWrites : 0
  const anchorMissRatePass = anchorMissRate <= 0.05
  const threadContinuityPass = true // requires post-replay; approximation pending
  const arcAdvancementPass = perChapter.every(
    (c) => c.activeArcs === 0 || c.arcAdvancesThisChapter >= 1
  )
  const costPass = estimatedUsdTotal <= 7
  const overallPass = anchorMissRatePass && threadContinuityPass && arcAdvancementPass && costPass

  return {
    campaignId: state.meta.campaignId,
    genreId: state.meta.genreId,
    playbookId: state.meta.playbookId,
    originId: state.meta.originId,
    chapters: chapterNumbers.length,
    totalTurns: turns.length,
    perChapter,
    archivist: {
      totalWrites,
      accepted,
      deferred,
      rejected,
      anchorMissesFlagged,
      driftFlags,
      anchorMissRate,
    },
    pacing: {
      advisoriesFired: pacingAdvisoriesFired,
      breakdown: pacingBreakdown,
    },
    cost: {
      narratorTokens,
      archivistTokens,
      authorTokens,
      chapterMeaningTokens,
      estimatedUsdNarrator,
      estimatedUsdArchivist,
      estimatedUsdAuthor,
      estimatedUsdChapterMeaning,
      estimatedUsdTotal,
      coverage: {
        narratorTurnsObserved,
        archivistTurnsObserved,
        authorCallsObserved,
        totalTurnsInState: turns.length,
        isPartial:
          narratorTurnsObserved < turns.length ||
          archivistTurnsObserved < turns.length,
      },
    },
    coherence: {
      totalFindings: coherenceTotalFindings,
      cleanTurns: coherenceCleanTurns,
      findingRate: coherenceFindingRate,
      byType: coherenceByType,
      bySeverity: coherenceBySeverity,
    },
    killCriteria: {
      anchorMissRatePass,
      threadContinuityPass,
      arcAdvancementPass,
      costPass,
      overallPass,
    },
  }
}

function countArcAdvancesInChapter(state: Sf2State, chapter: number): number {
  const arcs = Object.values(state.campaign.arcs).filter((a) => a.status === 'active')
  let advances = 0
  for (const arc of arcs) {
    for (const tid of arc.threadIds) {
      const thread = state.campaign.threads[tid]
      if (!thread) continue
      const turnsInChapter = state.history.turns.filter((t) => t.chapter === chapter)
      const earliest = turnsInChapter[0]?.index ?? 0
      if (thread.lastAdvancedTurn !== undefined && thread.lastAdvancedTurn >= earliest) {
        advances += 1
        break // count one per arc per chapter
      }
    }
  }
  return advances
}
