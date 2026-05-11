import { NextRequest } from 'next/server'
import { z } from 'zod'
import { isAuthenticated } from '@/lib/auth'
import { applyToolResults } from '@/lib/tool-processor'
import { runRulesEngine } from '@/lib/rules-engine'
import type { GameState, ReplayRequest, ReplayResult, ToolCallResult, TurnFrame } from '@/lib/types'

export const runtime = 'nodejs'

const replaySchema = z.object({
  camp: z.object({
    schema: z.literal('v15-session-camp/v1'),
    turns: z.array(z.any()),
  }).passthrough(),
  mode: z.enum(['full', 'single-turn', 'forward-from']),
  turnDisplayId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const byokKey = req.headers.get('x-anthropic-key')
  if (!byokKey && !(await isAuthenticated())) {
    return Response.json({ error: 'Unauthorized. Provide an API key or enter the access code.' }, { status: 401 })
  }

  const parsed = replaySchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
  }

  const request = parsed.data as unknown as ReplayRequest
  const selected = selectTurns(request)
  if ('error' in selected) {
    return Response.json({ error: selected.error }, { status: 400 })
  }

  const divergences: ReplayResult['divergences'] = []
  let carryState: GameState | null = null

  for (const turn of selected.turns) {
    const startState = request.mode === 'full' || request.mode === 'forward-from'
      ? carryState ?? cloneState(turn.stateBefore)
      : cloneState(turn.stateBefore)

    const actual = replayTurn(startState, turn)
    const expected = turn.stateAfter
    const diff = firstStateDiff(expected, actual)
    if (diff) {
      divergences.push({ turnDisplayId: turn.displayId, ...diff })
    }
    carryState = actual
  }

  const result: ReplayResult = {
    mode: request.mode,
    turnsReplayed: selected.turns.length,
    divergences,
  }
  return Response.json(result)
}

function selectTurns(request: ReplayRequest): { turns: TurnFrame[] } | { error: string } {
  const turns = request.camp.turns
  if (request.mode === 'full') return { turns }
  if (!request.turnDisplayId) return { error: 'turnDisplayId is required for this replay mode.' }
  const index = turns.findIndex(turn => turn.displayId === request.turnDisplayId)
  if (index < 0) return { error: `No turn with displayId ${request.turnDisplayId}.` }
  if (request.mode === 'single-turn') return { turns: [turns[index]] }
  return { turns: turns.slice(index) }
}

function replayTurn(stateBefore: GameState, turn: TurnFrame): GameState {
  const statChanges: Array<{ type: 'gain' | 'loss' | 'new' | 'neutral'; label: string }> = []
  let next = applyToolResults(turn.toolEffects as ToolCallResult[], stateBefore, statChanges)
  delete (next as GameState & { _sceneBreaks?: string[] })._sceneBreaks

  const expectedMessages = turn.stateAfter.history.messages
  if (expectedMessages.length > next.history.messages.length) {
    next = {
      ...next,
      history: {
        ...next.history,
        messages: expectedMessages.slice(0, next.history.messages.length)
          .concat(expectedMessages.slice(next.history.messages.length)),
      },
    }
  }

  return runRulesEngine(next, lastCommitInput(turn))
}

function lastCommitInput(turn: TurnFrame): Record<string, unknown> | null {
  const commit = [...turn.toolEffects].reverse().find(result => result.tool === 'commit_turn')
  return commit?.input ?? null
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState
}

function firstStateDiff(expected: unknown, actual: unknown, path = ''): { pathInState: string; expected: unknown; actual: unknown } | null {
  if (Object.is(expected, actual)) return null
  if (typeof expected !== typeof actual) return { pathInState: path || '$', expected, actual }
  if (expected === null || actual === null || typeof expected !== 'object' || typeof actual !== 'object') {
    return { pathInState: path || '$', expected, actual }
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return { pathInState: path || '$', expected, actual }
    if (expected.length !== actual.length) {
      return { pathInState: `${path}.length`, expected: expected.length, actual: actual.length }
    }
    for (let i = 0; i < expected.length; i++) {
      const diff = firstStateDiff(expected[i], actual[i], `${path}[${i}]`)
      if (diff) return diff
    }
    return null
  }

  const expectedRecord = expected as Record<string, unknown>
  const actualRecord = actual as Record<string, unknown>
  const keys = new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])
  for (const key of keys) {
    const diff = firstStateDiff(expectedRecord[key], actualRecord[key], path ? `${path}.${key}` : key)
    if (diff) return diff
  }
  return null
}
