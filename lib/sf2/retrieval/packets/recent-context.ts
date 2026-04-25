import type { Sf2RecentContextPacket, Sf2State } from '../../types'

const MAX_RECENT = 3
const PROSE_SNIPPET_CHARS = 500

export function buildRecentContextPacket(state: Sf2State): Sf2RecentContextPacket {
  const lastThreeTurns = state.history.turns.slice(-MAX_RECENT).map((t) => ({
    index: t.index,
    playerInput: truncate(t.playerInput, 200),
    narratorProse: truncate(t.narratorProse, PROSE_SNIPPET_CHARS),
  }))
  const lastSceneSummary = state.chapter.sceneSummaries.at(-1)
  return { lastThreeTurns, lastSceneSummary }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
