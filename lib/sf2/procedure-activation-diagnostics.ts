import { isActiveSf2Procedure } from './procedure'
import type { Sf2State } from './types'

export interface Sf2ProcedureOmissionFinding {
  kind: 'procedure_omission_drift'
  severity: 'low' | 'medium' | 'high'
  repeatedTerms: string[]
  turnIndexes: number[]
  recommendation: string
}

const PROCEDURAL_PATTERNS: Array<{ term: string; pattern: RegExp }> = [
  { term: 'clearance', pattern: /\bclearance|clear\b/i },
  { term: 'release', pattern: /\brelease|released|depart|departure|undock|egress\b/i },
  { term: 'access', pattern: /\baccess|gate|checkpoint|credential|authorization|permit|writ|subnet\b/i },
  { term: 'route', pattern: /\broute|corridor|lock|sealed|blocked|clamp|berth\b/i },
  { term: 'procedure', pattern: /\bprocedure|queue|audit|wire|verification|scan\b/i },
]

export function detectProcedureOmissionDrift(state: Sf2State): Sf2ProcedureOmissionFinding | null {
  if (hasActiveProcedureOwner(state) || hasHardStateOwner(state)) return null

  const recent = state.history.turns.slice(-6)
  const termTurns = new Map<string, number[]>()

  for (const turn of recent) {
    const text = [turn.playerInput, turn.narratorProse].filter(Boolean).join('\n')
    for (const entry of PROCEDURAL_PATTERNS) {
      if (!entry.pattern.test(text)) continue
      const turns = termTurns.get(entry.term) ?? []
      turns.push(turn.index)
      termTurns.set(entry.term, turns)
    }
  }

  const repeated = [...termTurns.entries()]
    .filter(([, turns]) => new Set(turns).size >= 2)
    .map(([term]) => term)

  if (repeated.length === 0) return null

  const turnIndexes = [...new Set(repeated.flatMap((term) => termTurns.get(term) ?? []))].sort((a, b) => a - b)
  return {
    kind: 'procedure_omission_drift',
    severity: repeated.length >= 2 || turnIndexes.length >= 3 ? 'high' : 'medium',
    repeatedTerms: repeated,
    turnIndexes,
    recommendation: 'Create or update an access/exploration/investigation/combat/operation procedure, or anchor the blocker to thread gates, promises, or obligation state.',
  }
}

function hasActiveProcedureOwner(state: Sf2State): boolean {
  return Object.values(state.campaign.procedures ?? {}).some(isActiveSf2Procedure)
}

function hasHardStateOwner(state: Sf2State): boolean {
  const activeGates = Object.values(state.campaign.threads ?? {}).some((thread) =>
    thread.status === 'active' && (thread.resolutionGates ?? []).some((gate) => gate.status !== 'satisfied')
  )
  if (activeGates) return true

  return Object.values(state.campaign.promises ?? {}).some((promise) =>
    promise.status === 'active' && /\b(clearance|release|access|gate|credential|authorization|permit|writ|subnet|berth|clamp|debt|lien|departure|undock)\b/i.test(promise.obligation)
  )
}
