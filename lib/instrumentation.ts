// ============================================================
// Instrumentation — Batch 1 (additive, non-behavioral)
//
// Emits structured log lines into the downloadable debug log via
// a new StreamEvent type. All lines carry genre=<value> as the
// first field after the channel so downstream grepping can pivot
// by genre for the framework-vs-extensions question.
// ============================================================

import type { GameState, Instrumentation, InstrumentActor, RejectionRecord, StreamEvent } from './types'

export type InstrumentEmit = (event: StreamEvent) => void

export interface InstrumentContext {
  turn: number
  chapter: number
  genre: string
  sessionId: string
}

export function contextFromState(state: GameState): InstrumentContext {
  const playerTurns = state.history.messages.filter(m => m.role === 'player').length
  return {
    turn: playerTurns,
    chapter: state.meta.chapterNumber,
    genre: (state.meta.genre as string) || 'unknown',
    sessionId: state._instrumentation?.sessionId ?? 'no-session',
  }
}

// ── Emit helpers ─────────────────────────────────────────────
// Line prefix convention: "<CHANNEL> genre=<g> turn=<N> chapter=<N> <rest>"
// JSON payloads land on their own `instrument` event so the log is greppable.

export function emitLine(emit: InstrumentEmit, channel: string, ctx: InstrumentContext, rest: string) {
  const line = `${channel} genre=${ctx.genre} turn=${ctx.turn} chapter=${ctx.chapter} ${rest}`.trimEnd()
  emit({ type: 'instrument', channel, line })
}

export function emitJson(emit: InstrumentEmit, channel: string, ctx: InstrumentContext, payload: unknown) {
  const line = `${channel} ${JSON.stringify({ genre: ctx.genre, turn: ctx.turn, chapter: ctx.chapter, ...(payload as object) })}`
  emit({ type: 'instrument', channel, line, payload })
}

// ── TurnTimer: records phase boundaries for a single player turn ──

export class TurnTimer {
  private marks: Record<string, number> = {}
  private cacheClass: 'hit' | 'miss' | 'write' | 'unknown' = 'unknown'
  private dynamicBlockTokens = 0
  private extractorRan = false
  private failedPhases: string[] = []
  private firstTokenSeen = false

  constructor(public ctx: InstrumentContext) {
    this.marks.start = performance.now()
  }

  mark(name: string) {
    this.marks[name] = performance.now()
  }

  markFirstToken() {
    if (!this.firstTokenSeen) {
      this.marks.firstToken = performance.now()
      this.firstTokenSeen = true
    }
  }

  markGenerationEnd() {
    // Rewritten on every round so the final value is the last round's end.
    this.marks.generationEnd = performance.now()
  }

  markExtractorStart() {
    this.marks.extractorStart = performance.now()
    this.extractorRan = true
  }

  markExtractorEnd() {
    this.marks.extractorEnd = performance.now()
  }

  failPhase(phase: string, reason: string) {
    this.failedPhases.push(`${phase}=FAILED:${reason}`)
  }

  setCacheFromUsage(usage: { cache_read_input_tokens?: number; cache_creation_input_tokens?: number }) {
    const read = usage.cache_read_input_tokens ?? 0
    const write = usage.cache_creation_input_tokens ?? 0
    if (read > 100) this.cacheClass = 'hit'
    else if (write > 500) this.cacheClass = 'miss'
    else this.cacheClass = 'write'
  }

  setDynamicBlockTokens(n: number) {
    this.dynamicBlockTokens = n
  }

  private dur(from: string, to: string): string {
    const f = this.marks[from]
    const t = this.marks[to]
    if (f === undefined || t === undefined) return 'NA'
    return `${Math.max(0, Math.round(t - f))}ms`
  }

  getDurations() {
    const ms = (from: string, to: string): number | null => {
      const f = this.marks[from]
      const t = this.marks[to]
      if (f === undefined || t === undefined) return null
      return Math.max(0, Math.round(t - f))
    }
    return {
      preCall: ms('start', 'apiCallStart'),
      ttft: ms('apiCallStart', 'firstToken'),
      generation: ms('firstToken', 'generationEnd'),
      validation: ms('generationEnd', 'validationEnd'),
      write: ms('validationEnd', 'writeEnd'),
      extractor: this.extractorRan ? ms('extractorStart', 'extractorEnd') : null,
      total: ms('start', 'end'),
      dynamicBlockTokens: this.dynamicBlockTokens,
      cacheClass: this.cacheClass,
    }
  }

  emitTurnTiming(emit: InstrumentEmit) {
    this.marks.end = performance.now()
    const d = this.getDurations()
    const parts: string[] = [
      `pre_call=${this.dur('start', 'apiCallStart')}`,
      `ttft=${this.dur('apiCallStart', 'firstToken')}`,
      `generation=${this.dur('firstToken', 'generationEnd')}`,
      `validation=${this.dur('generationEnd', 'validationEnd')}`,
      `write=${this.dur('validationEnd', 'writeEnd')}`,
      this.extractorRan
        ? `extractor=${this.dur('extractorStart', 'extractorEnd')}`
        : `extractor=NA`,
      `total=${this.dur('start', 'end')}`,
      `cache=${this.cacheClass}`,
      `dyn_block_tokens=${this.dynamicBlockTokens}`,
      ...this.failedPhases,
    ]
    const line = `TURN_TIMING genre=${this.ctx.genre} turn=${this.ctx.turn} chapter=${this.ctx.chapter} ${parts.join(' ')}`
    emit({ type: 'instrument', channel: 'TURN_TIMING', line, payload: d })
  }
}

// ── ChapterTimer: lightweight sibling for close/setup phases ──

export class ChapterTimer {
  private marks: Record<string, number> = {}

  constructor(public ctx: InstrumentContext, public kind: 'CHAPTER_CLOSE_TIMING' | 'CHAPTER_SETUP_TIMING') {
    this.marks.start = performance.now()
  }

  mark(name: string) {
    this.marks[name] = performance.now()
  }

  private dur(from: string, to: string): string {
    const f = this.marks[from]
    const t = this.marks[to]
    if (f === undefined || t === undefined) return 'NA'
    return `${Math.max(0, Math.round(t - f))}ms`
  }

  emit(emit: InstrumentEmit) {
    this.marks.end = performance.now()
    if (this.kind === 'CHAPTER_CLOSE_TIMING') {
      const parts = [
        `close_call=${this.dur('start', 'callEnd')}`,
        `summary_write=${this.dur('callEnd', 'summaryEnd')}`,
        `disposition=${this.dur('summaryEnd', 'end')}`,
        `total=${this.dur('start', 'end')}`,
      ]
      emitLine(emit, 'CHAPTER_CLOSE_TIMING', this.ctx, parts.join(' '))
    } else {
      // Phase A / Phase B: per spec, currently merged — log total as phase_b.
      const parts = [
        `phase_a=0ms`,
        `phase_b=${this.dur('start', 'callEnd')}`,
        `write=${this.dur('callEnd', 'end')}`,
        `total=${this.dur('start', 'end')}`,
      ]
      emitLine(emit, 'CHAPTER_SETUP_TIMING', this.ctx, parts.join(' '))
    }
  }
}

// ── Session initialization ─────────────────────────────────────

function emptyCounters(): Instrumentation['counters'] {
  return {
    writes: { success: 0, partial: 0, malformed: 0 },
    writesByType: {},
    writesByActor: {},
    firewall: { total: 0, block: 0, warn: 0, byRule: {} },
    extractor: { runs: 0, empty: 0, supplements: 0, rescues: 0, conflicts: 0 },
    turns: {
      total: 0,
      commitDropped: 0,
      withCheck: 0,
      combatActive: 0,
      noRollStreakMax: 0,
      currentNoRollStreak: 0,
    },
    latency: {
      ttftSamples: [],
      generationSamples: [],
      extractorSamples: [],
      totalSamples: [],
      dynamicBlockTokenSamples: [],
    },
    entityCreated: {},
    entityUpdated: {},
    fieldPopulatedOnCreate: {},
    fieldEmptyOnCreate: {},
    fieldUpdates: {},
    witnessMarks: { created: 0, spent: 0 },
    tempLoad: { incidents: 0, triggered: 0 },
    assetActivity: { present: false, updates: 0, narrativeMoments: 0 },
  }
}

export function ensureInstrumentation(state: GameState): Instrumentation {
  if (state._instrumentation) {
    // Backfill for saves loaded before continuity tracking existed
    if (!state._instrumentation.continuity) {
      state._instrumentation.continuity = emptyContinuity(state.meta.chapterNumber)
    }
    return state._instrumentation
  }
  const i: Instrumentation = {
    sessionId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `sess_${Date.now()}`,
    sessionStartedAt: new Date().toISOString(),
    turnCounter: 0,
    counters: emptyCounters(),
    countersByGenre: {},
    rejectionBuffer: [],
    lastChapterEmittedAt: null,
    continuity: emptyContinuity(state.meta.chapterNumber),
  }
  state._instrumentation = i
  return i
}

function emptyContinuity(currentChapter: number): Instrumentation['continuity'] {
  return {
    currentChapter,
    threadsTouchedByChapter: {},
    arcsActiveByChapter: {},
    arcAdvancesByChapter: {},
    entityFirstChapter: {},
    currentChapterTouchedThreads: [],
    currentChapterCallbacks: 0,
    currentChapterArcAdvances: {},
  }
}

// Reservoir: capped sample for percentile estimation. N=200.
const RESERVOIR_N = 200
export function pushSample(samples: number[], value: number) {
  if (samples.length < RESERVOIR_N) {
    samples.push(value)
    return
  }
  const idx = Math.floor(Math.random() * RESERVOIR_N)
  samples[idx] = value
}

export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

export function average(samples: number[]): number {
  if (samples.length === 0) return 0
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
}

// ── Rejection buffer accessor (consumed by Batch 2) ──

const REJECTION_BUFFER_CAP = 50
export function pushRejection(state: GameState, rec: RejectionRecord) {
  const i = ensureInstrumentation(state)
  i.rejectionBuffer.push(rec)
  while (i.rejectionBuffer.length > REJECTION_BUFFER_CAP) i.rejectionBuffer.shift()
}

export function getRecentRejections(state: GameState, n?: number): RejectionRecord[] {
  const buf = state._instrumentation?.rejectionBuffer ?? []
  if (n === undefined) return [...buf]
  return buf.slice(-n)
}

// ── Per-genre counter access ──

export function getOrCreateGenreCounters(state: GameState, genre: string) {
  const i = ensureInstrumentation(state)
  if (!i.countersByGenre[genre]) i.countersByGenre[genre] = emptyCounters()
  return i.countersByGenre[genre]
}
