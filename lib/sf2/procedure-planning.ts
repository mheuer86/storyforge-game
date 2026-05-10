import {
  SF2_PLANNING_ASSESSMENT_STATUSES,
  SF2_PROCEDURE_AFFORDANCE_KINDS,
  SF2_PROCEDURE_AFFORDANCE_STATUSES,
  SF2_PROCEDURE_COMPLICATION_STATUSES,
  SF2_PROCEDURE_CONSTRAINT_KINDS,
  SF2_PROCEDURE_CONSTRAINT_STATUSES,
  SF2_PROCEDURE_LINK_KINDS,
  SF2_SUPPORT_CONTRIBUTION_EFFECTS,
  SF2_SUPPORT_CONTRIBUTION_KINDS,
  SF2_SUPPORT_SOURCE_KINDS,
  type Sf2PlanningAssessment,
  type Sf2PlanningAssessmentStatus,
  type Sf2ProcedureAffordance,
  type Sf2ProcedureComplication,
  type Sf2ProcedureConstraint,
  type Sf2ProcedureFact,
  type Sf2ProcedureLink,
  type Sf2ProcedureResult,
  type Sf2SupportContribution,
  type Sf2SupportContributionEffect,
} from './procedure'

export const SF2_OFFSCREEN_TASK_STATUSES = [
  'pending',
  'in_progress',
  'partial',
  'complete',
  'failed',
  'abandoned',
] as const

export const SF2_OFFSCREEN_TASK_RISKS = ['low', 'medium', 'high'] as const
export const SF2_OFFSCREEN_TASK_OWNER_KINDS = [
  'npc',
  'faction',
  'retinue',
  'asset',
  'software',
  'ritual',
  'location',
  'player_delegate',
  'system',
] as const

export type Sf2OffscreenTaskStatus = (typeof SF2_OFFSCREEN_TASK_STATUSES)[number]
export type Sf2OffscreenTaskRisk = (typeof SF2_OFFSCREEN_TASK_RISKS)[number]
export type Sf2OffscreenTaskOwnerKind = (typeof SF2_OFFSCREEN_TASK_OWNER_KINDS)[number]

export interface Sf2PlanningSupportInput {
  contribution: Partial<Sf2SupportContribution>
  appliesToAssessmentId?: string
  weight?: number
}

export interface Sf2PlanningRollSupport {
  assessmentId: string
  skill: string
  baseDc: number
  dc: number
  dcShift: number
  advantage: boolean
  disadvantage: boolean
  rationale: string[]
  supportContributionIds: string[]
  adverseContributionIds: string[]
}

export interface Sf2OffscreenTaskRecord {
  id: string
  owner: {
    kind: Sf2OffscreenTaskOwnerKind
    id?: string
    label: string
  }
  goal: string
  workWindow: {
    duration: number
    units: string
  }
  status: Sf2OffscreenTaskStatus
  risk: Sf2OffscreenTaskRisk
  partialResults: Sf2ProcedureResult[]
  finalResult: Sf2ProcedureResult | null
  links: {
    procedure?: string
    thread?: string
    clue?: string
    fact?: string
    asset?: string
  }
  label: string
  procedureId?: string
  objective: string
  visibleTrace: string
  createdAtTurn: number
  updatedAtTurn: number
}

export function normalizePlanningSupportContributions(
  inputs: unknown,
  options: { defaultLane?: string; limit?: number } = {}
): Sf2SupportContribution[] {
  const list = asArray(inputs).slice(0, options.limit ?? 8)
  return list.map((entry, index) => {
    const input = objectRecord(entry)
    const contribution = objectRecord(input.contribution ?? entry)
    const source = objectRecord(contribution.source)
    return {
      id: nonEmpty(contribution.id, `support_${index}`),
      source: {
        kind: oneOf(source.kind, SF2_SUPPORT_SOURCE_KINDS, 'preparation'),
        id: nonEmpty(source.id, undefined),
        label: nonEmpty(source.label, 'Unspecified support'),
      },
      lane: nonEmpty(contribution.lane, options.defaultLane ?? 'planning'),
      kind: oneOf(contribution.kind, SF2_SUPPORT_CONTRIBUTION_KINDS, 'expertise'),
      summary: nonEmpty(contribution.summary, ''),
      effect: oneOfOptional(contribution.effect, SF2_SUPPORT_CONTRIBUTION_EFFECTS),
    }
  }).filter((contribution) => contribution.summary || contribution.source.label)
}

export function normalizePlanningAssessment(
  input: unknown,
  turnIndex: number,
  contributions: Sf2SupportContribution[] = [],
  index = 0
): Sf2PlanningAssessment {
  const record = objectRecord(input)
  const check = objectRecord(record.check)
  const contributionIds = asArray(either(record, 'supportContributionIds', 'support_contribution_ids'))
    .map(String)
    .filter(Boolean)
  return {
    id: nonEmpty(record.id, `assessment_${index}`),
    claim: nonEmpty(record.claim, ''),
    status: oneOf(record.status, SF2_PLANNING_ASSESSMENT_STATUSES, 'open') as Sf2PlanningAssessmentStatus,
    rolled: Boolean(record.rolled),
    check: check.skill
      ? { skill: String(check.skill), dc: finiteNumber(check.dc, 12) }
      : undefined,
    supportContributionIds: uniqueStrings([
      ...contributionIds,
      ...contributions.map((contribution) => contribution.id),
    ]),
    promotedTo: asArray(either(record, 'promotedTo', 'promoted_to')).map(normalizeLink).filter(isPresent),
    lastUpdatedTurn: finiteNumber(either(record, 'lastUpdatedTurn', 'last_updated_turn'), turnIndex),
  }
}

export function derivePlanningRollSupport(
  assessment: Sf2PlanningAssessment,
  contributions: Sf2SupportContribution[],
  options: { dcShiftCap?: number } = {}
): Sf2PlanningRollSupport {
  const baseDc = assessment.check?.dc ?? 12
  const relevantIds = new Set(assessment.supportContributionIds)
  const relevant = contributions.filter((contribution) => relevantIds.has(contribution.id))
  const dcShiftCap = Math.max(0, options.dcShiftCap ?? 4)
  let netDcShift = 0
  let helpScore = 0
  let adverseScore = 0
  const rationale: string[] = []
  const supportContributionIds: string[] = []
  const adverseContributionIds: string[] = []

  for (const contribution of relevant) {
    const adverse = isAdverseContribution(contribution)
    const effect = contribution.effect
    if (adverse) {
      adverseScore += effect === 'roll_required' ? 2 : 1
      adverseContributionIds.push(contribution.id)
    } else {
      helpScore += effect === 'advantage' ? 2 : 1
      supportContributionIds.push(contribution.id)
    }
    if (effect === 'dc_shift') netDcShift += adverse ? 2 : -2
    if (effect === 'advantage') helpScore += adverse ? 0 : 1
    if (effect === 'roll_required') adverseScore += adverse ? 1 : 0
    rationale.push(`${contribution.source.label}: ${contribution.summary}`)
  }

  const dcShift = clamp(netDcShift, -dcShiftCap, dcShiftCap)
  return {
    assessmentId: assessment.id,
    skill: assessment.check?.skill ?? 'relevant skill',
    baseDc,
    dc: Math.max(5, baseDc + dcShift),
    dcShift,
    advantage: helpScore > adverseScore && supportContributionIds.length > 0,
    disadvantage: adverseScore > helpScore && adverseContributionIds.length > 0,
    rationale,
    supportContributionIds,
    adverseContributionIds,
  }
}

export function normalizeOffscreenTaskRecord(
  input: unknown,
  turnIndex: number,
  index = 0
): Sf2OffscreenTaskRecord {
  const record = objectRecord(input)
  const owner = objectRecord(record.owner)
  const workWindow = objectRecord(either(record, 'workWindow', 'work_window'))
  const links = objectRecord(record.links)
  const procedureLink = nonEmpty(links.procedure ?? either(record, 'procedureId', 'procedure_id'), undefined)
  const partialResults = normalizeProcedureResults(either(record, 'partialResults', 'partial_results'))
  const finalResultInput = either(record, 'finalResult', 'final_result')
  const finalResult = finalResultInput ? normalizeProcedureResult(finalResultInput) : null
  const legacyResults = normalizeProcedureResults(record.result ?? record.results)
  return {
    id: nonEmpty(record.id, `offscreen_task_${index}`),
    owner: {
      kind: oneOf(owner.kind, SF2_OFFSCREEN_TASK_OWNER_KINDS, 'system'),
      id: nonEmpty(owner.id, undefined),
      label: nonEmpty(owner.label, 'System'),
    },
    goal: nonEmpty(record.goal ?? record.objective, ''),
    workWindow: {
      duration: finiteNumber(workWindow.duration, 1),
      units: nonEmpty(workWindow.units, 'turn'),
    },
    status: coerceOffscreenTaskStatus(record.status),
    risk: oneOf(record.risk, SF2_OFFSCREEN_TASK_RISKS, 'low'),
    partialResults: partialResults.length > 0 ? partialResults : legacyResults.slice(0, -1),
    finalResult: finalResult ?? legacyResults[legacyResults.length - 1] ?? null,
    links: {
      procedure: procedureLink,
      thread: nonEmpty(links.thread, undefined),
      clue: nonEmpty(links.clue, undefined),
      fact: nonEmpty(links.fact, undefined),
      asset: nonEmpty(links.asset, undefined),
    },
    label: nonEmpty(record.label, 'Off-screen task'),
    procedureId: procedureLink,
    objective: nonEmpty(record.objective ?? record.goal, ''),
    visibleTrace: nonEmpty(either(record, 'visibleTrace', 'visible_trace'), ''),
    createdAtTurn: finiteNumber(either(record, 'createdAtTurn', 'created_at_turn'), turnIndex),
    updatedAtTurn: finiteNumber(either(record, 'updatedAtTurn', 'updated_at_turn'), turnIndex),
  }
}

export function normalizeProcedureResults(input: unknown): Sf2ProcedureResult[] {
  return asArray(input).map(normalizeProcedureResult).filter(isPresent)
}

function coerceOffscreenTaskStatus(value: unknown): Sf2OffscreenTaskStatus {
  if (value === 'queued') return 'pending'
  if (value === 'active') return 'in_progress'
  if (value === 'resolved') return 'complete'
  return oneOf(value, SF2_OFFSCREEN_TASK_STATUSES, 'pending')
}

function normalizeProcedureResult(input: unknown): Sf2ProcedureResult | null {
  const record = objectRecord(input)
  switch (record.kind) {
    case 'procedure_fact':
      return { kind: 'procedure_fact', fact: normalizeFact(record.fact) }
    case 'constraint_delta':
      return { kind: 'constraint_delta', constraint: normalizeConstraint(record.constraint) }
    case 'affordance_delta':
      return { kind: 'affordance_delta', affordance: normalizeAffordance(record.affordance) }
    case 'complication_delta':
      return { kind: 'complication_delta', complication: normalizeComplication(record.complication) }
    case 'clue_delta':
      return { kind: 'clue_delta', clueId: nonEmpty(either(record, 'clueId', 'clue_id'), '') }
    case 'clock_tick':
      return {
        kind: 'clock_tick',
        clockId: nonEmpty(either(record, 'clockId', 'clock_id'), ''),
        delta: finiteNumber(record.delta, 0),
        reason: nonEmpty(record.reason, ''),
      }
    case 'disposition_delta':
      return {
        kind: 'disposition_delta',
        npcOrFactionId: nonEmpty(either(record, 'npcOrFactionId', 'npc_or_faction_id'), ''),
        delta: finiteNumber(record.delta, 0),
        reason: nonEmpty(record.reason, ''),
      }
    case 'thread_transition':
      return {
        kind: 'thread_transition',
        threadId: nonEmpty(either(record, 'threadId', 'thread_id'), ''),
        toStatus: nonEmpty(either(record, 'toStatus', 'to_status'), ''),
        reason: nonEmpty(record.reason, ''),
      }
    default:
      return null
  }
}

function normalizeFact(input: unknown): Sf2ProcedureFact {
  const record = objectRecord(input)
  return {
    id: nonEmpty(record.id, 'fact'),
    text: nonEmpty(record.text, ''),
    confidence: record.confidence === 'contested' ? 'contested' : 'confirmed',
    sourceRefs: asArray(either(record, 'sourceRefs', 'source_refs')).map(normalizeLink).filter(isPresent),
    invalidatesWhen: nonEmpty(either(record, 'invalidatesWhen', 'invalidates_when'), undefined),
    lastUpdatedTurn: finiteNumber(either(record, 'lastUpdatedTurn', 'last_updated_turn'), 0),
  }
}

function normalizeConstraint(input: unknown): Sf2ProcedureConstraint {
  const record = objectRecord(input)
  return {
    id: nonEmpty(record.id, 'constraint'),
    label: nonEmpty(record.label, ''),
    kind: oneOf(record.kind, SF2_PROCEDURE_CONSTRAINT_KINDS, 'physical'),
    status: oneOf(record.status, SF2_PROCEDURE_CONSTRAINT_STATUSES, 'active'),
    current: typeof record.current === 'number' ? record.current : undefined,
    max: typeof record.max === 'number' ? record.max : undefined,
    clearsWhen: nonEmpty(either(record, 'clearsWhen', 'clears_when'), undefined),
    linkedRefs: asArray(either(record, 'linkedRefs', 'linked_refs')).map(normalizeLink).filter(isPresent),
  }
}

function normalizeAffordance(input: unknown): Sf2ProcedureAffordance {
  const record = objectRecord(input)
  return {
    id: nonEmpty(record.id, 'affordance'),
    label: nonEmpty(record.label, ''),
    kind: oneOf(record.kind, SF2_PROCEDURE_AFFORDANCE_KINDS, 'asset'),
    status: oneOf(record.status, SF2_PROCEDURE_AFFORDANCE_STATUSES, 'available'),
    consumesConstraintId: nonEmpty(either(record, 'consumesConstraintId', 'consumes_constraint_id'), undefined),
    linkedRefs: asArray(either(record, 'linkedRefs', 'linked_refs')).map(normalizeLink).filter(isPresent),
  }
}

function normalizeComplication(input: unknown): Sf2ProcedureComplication {
  const record = objectRecord(input)
  return {
    id: nonEmpty(record.id, 'complication'),
    label: nonEmpty(record.label, ''),
    effectSummary: nonEmpty(either(record, 'effectSummary', 'effect_summary'), ''),
    status: oneOf(record.status, SF2_PROCEDURE_COMPLICATION_STATUSES, 'active'),
    clearsWhen: nonEmpty(either(record, 'clearsWhen', 'clears_when'), undefined),
    linkedRefs: asArray(either(record, 'linkedRefs', 'linked_refs')).map(normalizeLink).filter(isPresent),
  }
}

function normalizeLink(input: unknown): Sf2ProcedureLink | null {
  const record = objectRecord(input)
  const kind = oneOfOptional(record.kind, SF2_PROCEDURE_LINK_KINDS)
  const id = nonEmpty(record.id, undefined)
  if (!kind || !id) return null
  return { kind, id }
}

function isAdverseContribution(contribution: Sf2SupportContribution): boolean {
  return contribution.kind === 'objection' ||
    contribution.kind === 'constraint' ||
    contribution.effect === 'new_constraint' ||
    contribution.effect === 'roll_required'
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function either(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake]
}

function nonEmpty(value: unknown, fallback: string): string
function nonEmpty(value: unknown, fallback: undefined): string | undefined
function nonEmpty(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T[number] : fallback
}

function oneOfOptional<const T extends readonly string[]>(value: unknown, values: T): T[number] | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T[number] : undefined
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
