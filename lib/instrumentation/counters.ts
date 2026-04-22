// Counter accumulator + CHAPTER_STATS / SESSION_STATS / GENRE_UTILIZATION
// emitters. Counters live on state._instrumentation and its per-genre
// counterparts. The accumulator is invoked client-side from stream-parser.ts
// when `instrument` events arrive, so state survives round-trips via
// localStorage.

import type { GameState, StreamEvent, Instrumentation, InstrumentActor, WriteOutcome } from '../types'
import {
  ensureInstrumentation,
  getOrCreateGenreCounters,
  pushSample,
  percentile,
  average,
} from '../instrumentation'
import { CREATE_WRITE_TYPES, UPDATE_WRITE_TYPES, WRITE_TYPE_TO_ENTITY } from './entity-schemas'

// ── Accumulator ─────────────────────────────────────────────────

function bumpWriteOutcome(w: WriteOutcome, status: 'success' | 'partial' | 'malformed') {
  w[status] = (w[status] ?? 0) + 1
}

function ensureBucket(map: Record<string, WriteOutcome>, key: string): WriteOutcome {
  if (!map[key]) map[key] = { success: 0, partial: 0, malformed: 0 }
  return map[key]
}

function ensureActorBucket(map: Partial<Record<InstrumentActor, WriteOutcome>>, actor: InstrumentActor): WriteOutcome {
  if (!map[actor]) map[actor] = { success: 0, partial: 0, malformed: 0 }
  return map[actor]!
}

function mutateCounters(
  buckets: Instrumentation['counters'],
  channel: string,
  payload: unknown,
) {
  switch (channel) {
    case 'WRITE': {
      const p = payload as { write_type: string; actor: InstrumentActor; status: 'success' | 'partial' | 'malformed' }
      bumpWriteOutcome(buckets.writes, p.status)
      bumpWriteOutcome(ensureBucket(buckets.writesByType, p.write_type), p.status)
      bumpWriteOutcome(ensureActorBucket(buckets.writesByActor, p.actor), p.status)
      if (UPDATE_WRITE_TYPES.has(p.write_type)) {
        const bucket = WRITE_TYPE_TO_ENTITY[p.write_type]
        if (bucket) buckets.entityUpdated[bucket] = (buckets.entityUpdated[bucket] ?? 0) + 1
      }
      // Genre-mechanic side-effects
      if (p.write_type === 'witness_spend') {
        buckets.witnessMarks.spent += 1
      }
      break
    }
    case 'ENTITY_CREATION': {
      const p = payload as { entity_type: string; populated: string[]; empty: string[]; write_type: string }
      buckets.entityCreated[p.entity_type] = (buckets.entityCreated[p.entity_type] ?? 0) + 1
      if (!buckets.fieldPopulatedOnCreate[p.entity_type]) buckets.fieldPopulatedOnCreate[p.entity_type] = {}
      if (!buckets.fieldEmptyOnCreate[p.entity_type]) buckets.fieldEmptyOnCreate[p.entity_type] = {}
      const pMap = buckets.fieldPopulatedOnCreate[p.entity_type]
      const eMap = buckets.fieldEmptyOnCreate[p.entity_type]
      for (const f of p.populated) pMap[f] = (pMap[f] ?? 0) + 1
      for (const f of p.empty) eMap[f] = (eMap[f] ?? 0) + 1
      break
    }
    case 'FIREWALL_OBSERVATION': {
      const p = payload as { rule: string; severity: 'block' | 'warn' }
      buckets.firewall.total += 1
      if (p.severity === 'block') buckets.firewall.block += 1
      else buckets.firewall.warn += 1
      buckets.firewall.byRule[p.rule] = (buckets.firewall.byRule[p.rule] ?? 0) + 1
      break
    }
    case 'TURN_TIMING': {
      const p = payload as { ttft: number | null; generation: number | null; extractor: number | null; total: number | null; dynamicBlockTokens: number }
      if (p.ttft !== null) pushSample(buckets.latency.ttftSamples, p.ttft)
      if (p.generation !== null) pushSample(buckets.latency.generationSamples, p.generation)
      if (p.extractor !== null) pushSample(buckets.latency.extractorSamples, p.extractor)
      if (p.total !== null) pushSample(buckets.latency.totalSamples, p.total)
      if (p.dynamicBlockTokens > 0) pushSample(buckets.latency.dynamicBlockTokenSamples, p.dynamicBlockTokens)
      buckets.turns.total += 1
      break
    }
    case 'SHADOW_EXTRACTOR_TIMING': {
      buckets.extractor.runs += 1
      break
    }
    default:
      break
  }
}

// Mutate both global and per-genre counters
export function applyInstrumentEvent(state: GameState, event: Extract<StreamEvent, { type: 'instrument' }>) {
  if (!event.payload) return
  const i = ensureInstrumentation(state)
  const genre = (state.meta.genre as string) || 'unknown'
  mutateCounters(i.counters, event.channel, event.payload)
  mutateCounters(getOrCreateGenreCounters(state, genre), event.channel, event.payload)
  accumulateContinuity(state, event.channel, event.payload)
}

// ── Continuity tracking ─────────────────────────────────────────

function rolloverIfChapterChanged(state: GameState) {
  const i = ensureInstrumentation(state)
  const cont = i.continuity
  const nowChapter = state.meta.chapterNumber
  if (nowChapter === cont.currentChapter) return
  // Chapter rolled over — freeze prior-chapter state, reset ephemeral.
  cont.threadsTouchedByChapter[cont.currentChapter] = Array.from(new Set(cont.currentChapterTouchedThreads))
  cont.arcAdvancesByChapter[cont.currentChapter] = { ...cont.currentChapterArcAdvances }
  // Arc snapshot: arcs currently in state.arcs that are active belong to the closing chapter
  cont.arcsActiveByChapter[cont.currentChapter] = (state.arcs ?? [])
    .filter(a => a.status === 'active')
    .map(a => a.id)
  cont.currentChapterTouchedThreads = []
  cont.currentChapterArcAdvances = {}
  cont.currentChapterCallbacks = 0
  cont.currentChapter = nowChapter
}

type WritePayload = {
  write_type: string
  actor: string
  entity: string | null
  status: string
  fields_provided?: string[]
  fields_missing?: string[]
  input?: unknown
}

const THREAD_TOUCH_TYPES = new Set(['thread_create', 'thread_update'])
const ARC_ADVANCE_TYPES = new Set(['arc_update'])

function accumulateContinuity(state: GameState, channel: string, payload: unknown) {
  rolloverIfChapterChanged(state)
  const i = ensureInstrumentation(state)
  const cont = i.continuity
  const chapter = cont.currentChapter

  if (channel === 'ENTITY_CREATION') {
    const p = payload as { entity: string | null; entity_type: string; write_type: string }
    const key = p.entity ? `${p.entity_type}:${p.entity}` : null
    if (key && cont.entityFirstChapter[key] === undefined) {
      cont.entityFirstChapter[key] = chapter
    }
    return
  }

  if (channel !== 'WRITE') return
  const p = payload as WritePayload

  // Thread-continuity: which threads did this chapter touch?
  if (THREAD_TOUCH_TYPES.has(p.write_type) && p.entity) {
    cont.currentChapterTouchedThreads.push(p.entity)
  }
  // Anchored_to → thread references (decisions/promises/clues that point at threads)
  const input = (p.input && typeof p.input === 'object') ? (p.input as Record<string, unknown>) : null
  if (input && Array.isArray(input.anchored_to)) {
    for (const id of input.anchored_to as unknown[]) {
      if (typeof id !== 'string') continue
      cont.currentChapterTouchedThreads.push(id)
      // Thread referenced for the first time in this chapter counts as callback if thread first appeared earlier
      const firstCh = cont.entityFirstChapter[`thread:${id}`]
      if (firstCh !== undefined && firstCh < chapter) {
        cont.currentChapterCallbacks += 1
      }
    }
  }
  // Update against an entity first seen in a prior chapter = callback
  if (p.entity && !p.write_type.endsWith('_create')) {
    const entityKey = guessEntityKey(p.write_type, p.entity)
    if (entityKey) {
      const firstCh = cont.entityFirstChapter[entityKey]
      if (firstCh !== undefined && firstCh < chapter) {
        cont.currentChapterCallbacks += 1
      }
    }
  }
  // Arc advance tracking
  if (ARC_ADVANCE_TYPES.has(p.write_type) && p.entity) {
    cont.currentChapterArcAdvances[p.entity] = (cont.currentChapterArcAdvances[p.entity] ?? 0) + 1
  }
}

function guessEntityKey(writeType: string, entity: string): string | null {
  // Map e.g. thread_update → thread:entity
  const map: Record<string, string> = {
    npc_update: 'npc', thread_update: 'thread', promise_update: 'promise',
    decision_update: 'decision', arc_update: 'arc', clock_advance: 'clock', timer_update: 'timer',
  }
  const bucket = map[writeType]
  return bucket ? `${bucket}:${entity}` : null
}

// ── CHAPTER_STATS / SESSION_STATS / GENRE_UTILIZATION ──────────

function renderBlock(title: string, lines: string[]): string {
  return [`=== ${title} ===`, ...lines, `=== END ${title} ===`].join('\n')
}

function chapterStatsLines(c: Instrumentation['counters'], chapter: number, genre: string): string[] {
  const byType = Object.entries(c.writesByType)
    .flatMap(([t, o]) => [
      `${t}_success=${o.success} ${t}_partial=${o.partial} ${t}_malformed=${o.malformed}`,
    ]).join(' ')
  const byRule = Object.entries(c.firewall.byRule).map(([r, n]) => `${r}=${n}`).join(' ')

  const write_failures = c.writes.malformed + c.turns.commitDropped + c.extractor.rescues
  const select_failures = 0 // no recall tools in current architecture
  const ttftP75 = percentile(c.latency.dynamicBlockTokenSamples, 0.75)
  const compressOutliers = c.latency.dynamicBlockTokenSamples.filter(v => v > ttftP75 * 1.5).length

  return [
    `CHAPTER_STATS genre=${genre} chapter=${chapter} writes success=${c.writes.success} partial=${c.writes.partial} malformed=${c.writes.malformed}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} writes_by_type ${byType || '(none)'}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} firewall total=${c.firewall.total} block=${c.firewall.block} warn=${c.firewall.warn}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} firewall_by_rule ${byRule || '(none)'}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} extractor runs=${c.extractor.runs} empty=${c.extractor.empty} supplements=${c.extractor.supplements} rescues=${c.extractor.rescues} conflicts=${c.extractor.conflicts}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} latency ttft_avg=${average(c.latency.ttftSamples)}ms ttft_p95=${percentile(c.latency.ttftSamples, 0.95)}ms generation_avg=${average(c.latency.generationSamples)}ms total_avg=${average(c.latency.totalSamples)}ms total_p95=${percentile(c.latency.totalSamples, 0.95)}ms`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} turns total=${c.turns.total} commit_dropped=${c.turns.commitDropped} with_check=${c.turns.withCheck} no_roll_streak_max=${c.turns.noRollStreakMax}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} context_taxonomy write_failures=${write_failures} select_failures=${select_failures} /* no recall tools in current architecture */ compress_outliers=${compressOutliers} isolate_proxy=0`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} dynamic_block_size avg=${average(c.latency.dynamicBlockTokenSamples)} p95=${percentile(c.latency.dynamicBlockTokenSamples, 0.95)} max=${Math.max(0, ...c.latency.dynamicBlockTokenSamples)}`,
    `CHAPTER_STATS genre=${genre} chapter=${chapter} genre_mechanics witness_created=${c.witnessMarks.created} witness_spent=${c.witnessMarks.spent} temp_load_incidents=${c.tempLoad.incidents} temp_load_triggered=${c.tempLoad.triggered} asset_present=${c.assetActivity.present} asset_updates=${c.assetActivity.updates} asset_moments=${c.assetActivity.narrativeMoments}`,
  ]
}

export function emitChapterStats(send: (event: StreamEvent) => void, state: GameState, chapter: number) {
  const i = ensureInstrumentation(state)
  const genre = (state.meta.genre as string) || 'unknown'
  const lines = chapterStatsLines(i.countersByGenre[genre] ?? i.counters, chapter, genre)
  const block = renderBlock(`CHAPTER_STATS chapter=${chapter} genre=${genre}`, lines)
  send({ type: 'instrument', channel: 'CHAPTER_STATS', line: block })
  emitContinuityStats(send, state, chapter)
}

// ── CONTINUITY_STATS ────────────────────────────────────────────
// Three metrics for V2's between-chapter kill criterion:
//   1. thread_continuity_rate — % of prior chapter's touched threads that
//      were touched again this chapter
//   2. cross_chapter_callbacks — count of writes this chapter that referenced
//      entities first seen in a prior chapter
//   3. arc_spine_adherence — for each active arc, how many chapters it
//      advanced in before resolution/abandonment

export function emitContinuityStats(send: (event: StreamEvent) => void, state: GameState, closingChapter: number) {
  const i = ensureInstrumentation(state)
  const cont = i.continuity
  const genre = (state.meta.genre as string) || 'unknown'

  // Pre-freeze: close phase emission fires before chapter rollover. Use
  // live-buffer values for the closing chapter, committed values for priors.
  const closingThreads = Array.from(new Set(cont.currentChapterTouchedThreads))
  const closingArcAdvances = { ...cont.currentChapterArcAdvances }
  const closingCallbacks = cont.currentChapterCallbacks

  const priorChapter = closingChapter - 1
  const priorThreads = cont.threadsTouchedByChapter[priorChapter] ?? []
  const priorSet = new Set(priorThreads)
  const carryOver = closingThreads.filter(t => priorSet.has(t)).length
  const continuityRate = priorThreads.length === 0 ? null : Math.round((carryOver / priorThreads.length) * 100)

  const lines: string[] = [
    `CONTINUITY_STATS genre=${genre} chapter=${closingChapter} thread_continuity carried_over=${carryOver} prior_chapter_threads=${priorThreads.length} rate=${continuityRate === null ? 'NA' : continuityRate + '%'}`,
    `CONTINUITY_STATS genre=${genre} chapter=${closingChapter} cross_chapter_callbacks=${closingCallbacks}`,
  ]

  // Arc spine: for each active arc, count chapters in which it advanced.
  const arcAdvanceHistory: Record<string, number> = {}
  for (const [ch, advances] of Object.entries(cont.arcAdvancesByChapter)) {
    void ch
    for (const arcId of Object.keys(advances)) {
      arcAdvanceHistory[arcId] = (arcAdvanceHistory[arcId] ?? 0) + 1
    }
  }
  // Include closing chapter's advances
  for (const arcId of Object.keys(closingArcAdvances)) {
    arcAdvanceHistory[arcId] = (arcAdvanceHistory[arcId] ?? 0) + 1
  }
  const arcLines = Object.entries(arcAdvanceHistory).map(([id, n]) => `${id}=${n}`).join(' ')
  lines.push(`CONTINUITY_STATS genre=${genre} chapter=${closingChapter} arc_spine_chapters_advanced ${arcLines || '(none)'}`)

  // Closing-chapter arc snapshot for narrative context
  const activeArcsNow = (state.arcs ?? []).filter(a => a.status === 'active').map(a => a.id)
  lines.push(`CONTINUITY_STATS genre=${genre} chapter=${closingChapter} active_arcs_at_close ${activeArcsNow.join(' ') || '(none)'}`)

  const block = renderBlock(`CONTINUITY_STATS chapter=${closingChapter} genre=${genre}`, lines)
  send({ type: 'instrument', channel: 'CONTINUITY_STATS', line: block, payload: {
    chapter: closingChapter,
    genre,
    thread_continuity_rate: continuityRate,
    carried_over: carryOver,
    prior_chapter_threads: priorThreads.length,
    current_chapter_threads: closingThreads.length,
    cross_chapter_callbacks: closingCallbacks,
    arc_spine_chapters_advanced: arcAdvanceHistory,
    active_arcs_at_close: activeArcsNow,
  }})
}

function renderGenreUtilization(c: Instrumentation['counters'], genre: string): string {
  const lines: string[] = [`GENRE_UTILIZATION genre=${genre}`]
  const ec = Object.entries(c.entityCreated).map(([k, v]) => `${k}=${v}`).join(' ')
  const eu = Object.entries(c.entityUpdated).map(([k, v]) => `${k}=${v}`).join(' ')
  lines.push(`  entity_creation: ${ec || '(none)'}`)
  lines.push(`  entity_update:   ${eu || '(none)'}`)
  lines.push(`  field_population:`)
  for (const [entityBucket, fields] of Object.entries(c.fieldPopulatedOnCreate)) {
    const emptyMap = c.fieldEmptyOnCreate[entityBucket] ?? {}
    const allFields = new Set([...Object.keys(fields), ...Object.keys(emptyMap)])
    for (const f of allFields) {
      const pop = fields[f] ?? 0
      const emp = emptyMap[f] ?? 0
      const total = pop + emp
      const pct = total === 0 ? 0 : Math.round((pop / total) * 100)
      lines.push(`    ${entityBucket}.${f}: ${pop}/${total} (${pct}%)`)
    }
  }
  lines.push(`  genre_mechanics:`)
  lines.push(`    witness_marks:      created=${c.witnessMarks.created} spent=${c.witnessMarks.spent}`)
  lines.push(`    temp_load:          incidents=${c.tempLoad.incidents} triggered=${c.tempLoad.triggered}`)
  lines.push(`    asset:              present=${c.assetActivity.present} updates=${c.assetActivity.updates} narrative_moments=${c.assetActivity.narrativeMoments}`)
  return lines.join('\n')
}

// Client-side variant: returns the rendered blocks as strings so the UI can
// append them to the downloadable debug log without a stream round-trip.
export function buildSessionStatsLines(state: GameState): string[] {
  const i = ensureInstrumentation(state)
  const genre = (state.meta.genre as string) || 'unknown'
  const out: string[] = []

  const global = chapterStatsLines(i.counters, state.meta.chapterNumber, genre)
    .map(l => l.replace(/^CHAPTER_STATS /, 'SESSION_STATS '))
  out.push(renderBlock('SESSION_STATS', global))

  for (const [g, c] of Object.entries(i.countersByGenre)) {
    const genreBlock = chapterStatsLines(c, state.meta.chapterNumber, g)
      .map(l => l.replace(/^CHAPTER_STATS /, 'SESSION_STATS_BY_GENRE '))
    out.push(renderBlock(`SESSION_STATS_BY_GENRE genre=${g}`, genreBlock))
    out.push(renderGenreUtilization(c, g))
  }
  return out
}

export function emitSessionStats(send: (event: StreamEvent) => void, state: GameState) {
  const i = ensureInstrumentation(state)
  const global = chapterStatsLines(i.counters, state.meta.chapterNumber, (state.meta.genre as string) || 'unknown')
    .map(l => l.replace(/^CHAPTER_STATS /, 'SESSION_STATS '))
  send({ type: 'instrument', channel: 'SESSION_STATS', line: renderBlock('SESSION_STATS', global) })

  for (const [g, c] of Object.entries(i.countersByGenre)) {
    const genreBlock = chapterStatsLines(c, state.meta.chapterNumber, g)
      .map(l => l.replace(/^CHAPTER_STATS /, `SESSION_STATS_BY_GENRE `))
    send({ type: 'instrument', channel: 'SESSION_STATS_BY_GENRE', line: renderBlock(`SESSION_STATS_BY_GENRE genre=${g}`, genreBlock) })
    send({ type: 'instrument', channel: 'GENRE_UTILIZATION', line: renderGenreUtilization(c, g) })
  }
}
