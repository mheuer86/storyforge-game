import type { Sf2Clue, Sf2EntityId, Sf2State } from './types'
import type { Sf2ProcedureFact, Sf2ProcedureRuntime } from './procedure'

export const SF2_HYPOTHESIS_STATUSES = ['live', 'superseded', 'disproved'] as const

export type Sf2HypothesisStatus = (typeof SF2_HYPOTHESIS_STATUSES)[number]

export interface Sf2InvestigationHypothesis {
  id: Sf2EntityId
  claim: string
  status: Sf2HypothesisStatus
  supportingClueIds: Sf2EntityId[]
}

export interface Sf2InvestigationContradiction {
  id: Sf2EntityId
  description: string
  clueIds: Sf2EntityId[]
  status: 'open' | 'resolved'
}

export interface Sf2InvestigationLead {
  id: Sf2EntityId
  text: string
  linkedClueIds: Sf2EntityId[]
}

export interface Sf2InvestigationSynthesisPacket {
  procedureId: Sf2EntityId
  active: boolean
  knownFacts: Array<Pick<Sf2ProcedureFact, 'id' | 'text' | 'confidence'>>
  hypotheses: Sf2InvestigationHypothesis[]
  contradictions: Sf2InvestigationContradiction[]
  openQuestions: string[]
  nextLeads: Sf2InvestigationLead[]
}

export type Sf2InvestigationDatumLane = 'clue' | 'procedure_fact' | 'reject_texture'

export function shouldActivateInvestigationProcedure(state: Sf2State): boolean {
  if (findActiveInvestigationProcedure(state)) return true
  return Object.values(state.campaign.clues).filter((clue) => clue.status !== 'consumed').length >= 2
}

export function buildInvestigationSynthesisPacket(
  state: Sf2State,
  options: {
    factLimit?: number
    hypothesisLimit?: number
    contradictionLimit?: number
    leadLimit?: number
  } = {}
): Sf2InvestigationSynthesisPacket | null {
  if (!shouldActivateInvestigationProcedure(state)) return null

  const procedure = findActiveInvestigationProcedure(state)
  const clues = Object.values(state.campaign.clues)
    .filter((clue) => clue.status !== 'consumed')
    .sort((a, b) => b.turn - a.turn)
  const questions = uniqueStrings(clues.map((clue) => clue.evidenceQuestion).filter(Boolean))
  const knownFacts = (procedure?.facts ?? [])
    .filter((fact) => fact.confidence === 'confirmed')
    .sort((a, b) => b.lastUpdatedTurn - a.lastUpdatedTurn)
    .slice(0, options.factLimit ?? 4)
    .map((fact) => ({ id: fact.id, text: fact.text, confidence: fact.confidence }))
  const hypotheses = buildHypotheses(clues, options.hypothesisLimit ?? 4)
  const contradictions = clues
    .filter((clue) => clue.evidenceKind === 'contradiction')
    .slice(0, options.contradictionLimit ?? 3)
    .map((clue, index) => ({
      id: `contradiction_${index}`,
      description: clue.content,
      clueIds: [clue.id],
      status: 'open' as const,
    }))
  const nextLeads = buildNextLeads(clues, options.leadLimit ?? 4)

  return {
    procedureId: procedure?.id ?? 'procedure_investigation_auto',
    active: true,
    knownFacts,
    hypotheses,
    contradictions,
    openQuestions: questions.slice(0, 4),
    nextLeads,
  }
}

export function classifyInvestigationDatum(input: {
  text?: string
  evidenceQuestion?: string
  supportsHypothesisId?: string
  contradictsHypothesisId?: string
  isProceduralTexture?: boolean
}): Sf2InvestigationDatumLane {
  if (input.isProceduralTexture) return 'procedure_fact'
  if (input.evidenceQuestion && (input.supportsHypothesisId || input.contradictsHypothesisId)) return 'clue'
  if (input.evidenceQuestion && input.text && input.text.trim().length > 0) return 'clue'
  return input.text ? 'procedure_fact' : 'reject_texture'
}

function findActiveInvestigationProcedure(state: Sf2State): Sf2ProcedureRuntime | undefined {
  return Object.values(state.campaign.procedures ?? {}).find((procedure) =>
    procedure.kind === 'investigation' &&
    (procedure.status === 'active' || procedure.status === 'paused')
  )
}

function buildHypotheses(clues: Sf2Clue[], limit: number): Sf2InvestigationHypothesis[] {
  const grouped = new Map<string, Sf2Clue[]>()
  for (const clue of clues) {
    const key = clue.evidenceQuestion || 'Unframed evidence'
    grouped.set(key, [...(grouped.get(key) ?? []), clue])
  }
  return [...grouped.entries()].slice(0, limit).map(([question, clueList], index) => ({
    id: `hypothesis_${index}`,
    claim: question,
    status: 'live',
    supportingClueIds: clueList.map((clue) => clue.id),
  }))
}

function buildNextLeads(clues: Sf2Clue[], limit: number): Sf2InvestigationLead[] {
  return clues
    .slice(0, limit)
    .map((clue, index) => ({
      id: `lead_${index}`,
      text: clue.content,
      linkedClueIds: [clue.id],
    }))
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
