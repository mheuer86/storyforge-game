import type {
  DebugEntry,
  GameState,
  SessionSummary,
  TurnFrame,
  V15RequestKind,
  V15SessionCamp,
} from './types'

const REQUEST_KINDS: V15RequestKind[] = [
  'initial',
  'normal',
  'meta-question',
  'consistency-check',
  'roll-resolution',
  'chapter-setup',
  'chapter-close',
  'audit',
  'summarize',
  'extractor',
]

type TokenTotals = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

type ModelRates = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

// Approximate Anthropic public rates per million tokens. Keep this table local
// to the fixture helper so pricing changes do not mutate saved state.
const DEFAULT_MODEL_RATES: Record<string, ModelRates> = {
  haiku: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  sonnet: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  opus: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  unknown: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
}

export interface BuildV15SessionCampInput {
  finalState: GameState
  turns: readonly TurnFrame[]
  debug?: readonly DebugEntry[]
  debugLines?: readonly string[]
  exportedAt?: string
  sessionId?: string
}

export function buildV15SessionCamp(input: BuildV15SessionCampInput): V15SessionCamp {
  const exportedAt = input.exportedAt ?? new Date().toISOString()
  const sessionId = input.sessionId ?? input.finalState._instrumentation?.sessionId ?? 'unknown-session'

  const debug = [
    ...(input.debug ?? []),
    ...debugEntriesFromLines(input.debugLines ?? []),
  ]

  return {
    schema: 'v15-session-camp/v1',
    exportedAt,
    sessionId,
    campaignSeed: {
      genre: input.finalState.meta.genre,
      character: {
        name: input.finalState.character.name,
        species: input.finalState.character.species,
        class: input.finalState.character.class,
        stats: input.finalState.character.stats,
      },
      selectedHook: input.finalState.meta.selectedHook ?? '',
      createdAt: input.finalState.meta.createdAt,
    },
    finalState: input.finalState,
    turns: [...input.turns],
    debug,
    summary: computeV15SessionSummary(input.turns),
  }
}

export function debugEntriesFromLines(lines: readonly string[], exportedAt?: string): DebugEntry[] {
  return lines.map((line) => {
    const timestampMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/)
    const rest = timestampMatch?.[2] ?? line
    const channelMatch = rest.match(/^([A-Z0-9_.-]+)(?:\s+|:)(.*)$/)
    return {
      at: timestampMatch?.[1] ?? exportedAt ?? new Date().toISOString(),
      kind: 'instrument',
      channel: channelMatch?.[1],
      line,
    }
  })
}

export function computeV15SessionSummary(turns: readonly TurnFrame[]): SessionSummary {
  const totalTokens = emptyTotals()
  const tokensByRequestKind = REQUEST_KINDS.reduce(
    (acc, kind) => {
      acc[kind] = emptyTotals()
      return acc
    },
    {} as Record<V15RequestKind, TokenTotals>,
  )
  const chapters = new Set<number>()
  const ttftSamples: number[] = []
  const rollOutcomes = { success: 0, critical: 0, failure: 0, fumble: 0 }
  let estimatedCostUsd = 0

  for (const turn of turns) {
    chapters.add(turn.chapter)
    addTotals(totalTokens, metricsToTotals(turn))
    addTotals(tokensByRequestKind[turn.requestKind], metricsToTotals(turn))
    if (Number.isFinite(turn.metrics.firstTokenMs) && turn.metrics.firstTokenMs >= 0) {
      ttftSamples.push(turn.metrics.firstTokenMs)
    }
    for (const roll of turn.rolls) {
      rollOutcomes[roll.result] += 1
    }
    estimatedCostUsd += estimateTurnCostUsd(turn)
  }

  return {
    totalTurns: turns.length,
    totalPlayerTurns: turns.filter((turn) => turn.requestKind === 'initial' || turn.requestKind === 'normal').length,
    totalChapters: chapters.size,
    totalRequests: turns.length,
    totalTokens,
    tokensByRequestKind,
    estimatedCostUsd,
    ttftMs: {
      p50: percentile(ttftSamples, 50),
      p95: percentile(ttftSamples, 95),
    },
    rollOutcomes,
  }
}

export function estimateTurnCostUsd(turn: TurnFrame): number {
  if (turn.rounds.length === 0) {
    return tokenCost(metricsToTotals(turn), DEFAULT_MODEL_RATES.unknown)
  }

  return turn.rounds.reduce((sum, round) => {
    const usage = round.usage as {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
    return sum + tokenCost(
      {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheWrite: usage.cache_creation_input_tokens ?? 0,
      },
      ratesForModel(round.model),
    )
  }, 0)
}

export function computeTtftPercentiles(turns: readonly TurnFrame[]): SessionSummary['ttftMs'] {
  const samples = turns
    .map((turn) => turn.metrics.firstTokenMs)
    .filter((ms) => Number.isFinite(ms) && ms >= 0)
  return {
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
  }
}

function emptyTotals(): TokenTotals {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

function metricsToTotals(turn: TurnFrame): TokenTotals {
  return {
    input: turn.metrics.inputTokens,
    output: turn.metrics.outputTokens,
    cacheRead: turn.metrics.cacheReadTokens,
    cacheWrite: turn.metrics.cacheWriteTokens,
  }
}

function addTotals(target: TokenTotals, source: TokenTotals): void {
  target.input += source.input
  target.output += source.output
  target.cacheRead += source.cacheRead
  target.cacheWrite += source.cacheWrite
}

function tokenCost(tokens: TokenTotals, rates: ModelRates): number {
  return (
    tokens.input * rates.input +
    tokens.output * rates.output +
    tokens.cacheRead * rates.cacheRead +
    tokens.cacheWrite * rates.cacheWrite
  ) / 1_000_000
}

function ratesForModel(model: string): ModelRates {
  const normalized = model.toLowerCase()
  if (normalized.includes('haiku')) return DEFAULT_MODEL_RATES.haiku
  if (normalized.includes('opus')) return DEFAULT_MODEL_RATES.opus
  if (normalized.includes('sonnet')) return DEFAULT_MODEL_RATES.sonnet
  return DEFAULT_MODEL_RATES.unknown
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}
