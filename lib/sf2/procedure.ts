export const PROCEDURE_NONE = 'none' as const

export const SF2_PROCEDURE_KINDS = [
  'operation',
  'access',
  'exploration',
  'investigation',
  'combat',
  'montage_task',
] as const

export const SF2_PROCEDURE_STATUSES = [
  'active',
  'paused',
  'resolved',
  'failed',
  'abandoned',
] as const

export const SF2_SEMANTIC_PHASES = [
  'orientation',
  'commitment',
  'preparation',
  'engagement',
  'egress',
  'reckoning',
  'aftermath',
] as const

export const SF2_PROCEDURE_LINK_KINDS = [
  'procedure',
  'thread',
  'arc',
  'npc',
  'faction',
  'location',
  'area_node',
  'route',
  'credential_mask',
  'scrutiny_layer',
  'clue',
  'asset',
  'clock',
  'decision',
  'promise',
] as const

export const SF2_PROCEDURE_CHILD_PARENT_KINDS = [
  'procedure',
  'location',
  'area_node',
  'route',
] as const

export const SF2_PROCEDURE_CONSTRAINT_KINDS = [
  'resource',
  'time',
  'access',
  'exposure',
  'social',
  'route',
  'moral',
  'technical',
  'arcane',
  'physical',
] as const

export const SF2_PROCEDURE_CONSTRAINT_STATUSES = [
  'active',
  'consumed',
  'resolved',
  'superseded',
] as const

export const SF2_PROCEDURE_AFFORDANCE_KINDS = [
  'credential',
  'route',
  'ally',
  'asset',
  'evidence',
  'leverage',
  'exploit',
  'ritual',
  'position',
] as const

export const SF2_PROCEDURE_AFFORDANCE_STATUSES = [
  'available',
  'used',
  'expired',
  'lost',
] as const

export const SF2_PROCEDURE_COMPLICATION_STATUSES = [
  'active',
  'cleared',
  'superseded',
] as const

export const SF2_SUPPORT_SOURCE_KINDS = [
  'npc',
  'faction',
  'asset',
  'clue',
  'location',
  'ritual',
  'software',
  'retinue',
  'preparation',
  'decision',
] as const

export const SF2_SUPPORT_CONTRIBUTION_KINDS = [
  'expertise',
  'objection',
  'constraint',
  'signal',
  'resource',
  'cover',
  'route',
  'evidence',
] as const

export const SF2_SUPPORT_CONTRIBUTION_EFFECTS = [
  'advantage',
  'dc_shift',
  'new_fact',
  'new_constraint',
  'new_affordance',
  'roll_required',
] as const

export const SF2_PLANNING_ASSESSMENT_STATUSES = [
  'open',
  'promoted',
  'demoted',
  'superseded',
] as const

export const SF2_OPERATION_SIGNAL_STATUSES = [
  'ready',
  'consumed',
  'expired',
] as const

export type Sf2ProcedureKind = (typeof SF2_PROCEDURE_KINDS)[number]
export type Sf2ProcedureStatus = (typeof SF2_PROCEDURE_STATUSES)[number]
export type Sf2SemanticPhase = (typeof SF2_SEMANTIC_PHASES)[number]
export type Sf2ProcedureLinkKind = (typeof SF2_PROCEDURE_LINK_KINDS)[number]
export type Sf2ProcedureChildParentKind = (typeof SF2_PROCEDURE_CHILD_PARENT_KINDS)[number]
export type Sf2ProcedureConstraintKind = (typeof SF2_PROCEDURE_CONSTRAINT_KINDS)[number]
export type Sf2ProcedureConstraintStatus = (typeof SF2_PROCEDURE_CONSTRAINT_STATUSES)[number]
export type Sf2ProcedureAffordanceKind = (typeof SF2_PROCEDURE_AFFORDANCE_KINDS)[number]
export type Sf2ProcedureAffordanceStatus = (typeof SF2_PROCEDURE_AFFORDANCE_STATUSES)[number]
export type Sf2ProcedureComplicationStatus = (typeof SF2_PROCEDURE_COMPLICATION_STATUSES)[number]
export type Sf2SupportSourceKind = (typeof SF2_SUPPORT_SOURCE_KINDS)[number]
export type Sf2SupportContributionKind = (typeof SF2_SUPPORT_CONTRIBUTION_KINDS)[number]
export type Sf2SupportContributionEffect = (typeof SF2_SUPPORT_CONTRIBUTION_EFFECTS)[number]
export type Sf2PlanningAssessmentStatus = (typeof SF2_PLANNING_ASSESSMENT_STATUSES)[number]
export type Sf2OperationSignalStatus = (typeof SF2_OPERATION_SIGNAL_STATUSES)[number]

export interface Sf2ProcedureLink {
  kind: Sf2ProcedureLinkKind
  id: string
  parentKind?: Sf2ProcedureChildParentKind
  parentId?: string
}

export interface Sf2ProcedureFact {
  id: string
  text: string
  confidence: 'confirmed' | 'contested'
  sourceRefs: Sf2ProcedureLink[]
  invalidatesWhen?: string
  lastUpdatedTurn: number
}

export interface Sf2ProcedureConstraint {
  id: string
  label: string
  kind: Sf2ProcedureConstraintKind
  status: Sf2ProcedureConstraintStatus
  current?: number
  max?: number
  clearsWhen?: string
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ProcedureAffordance {
  id: string
  label: string
  kind: Sf2ProcedureAffordanceKind
  status: Sf2ProcedureAffordanceStatus
  consumesConstraintId?: string
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ProcedureComplication {
  id: string
  label: string
  effectSummary: string
  status: Sf2ProcedureComplicationStatus
  clearsWhen?: string
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2SupportContribution {
  id: string
  source: {
    kind: Sf2SupportSourceKind
    id?: string
    label: string
  }
  lane: string
  kind: Sf2SupportContributionKind
  summary: string
  effect?: Sf2SupportContributionEffect
}

export interface Sf2PlanningAssessment {
  id: string
  claim: string
  status: Sf2PlanningAssessmentStatus
  rolled: boolean
  check?: {
    skill: string
    dc: number
  }
  supportContributionIds: string[]
  promotedTo?: Sf2ProcedureLink[]
  lastUpdatedTurn: number
}

export interface Sf2OperationAbortCondition {
  id: string
  label: string
  trigger: string
  outcomeTier: 'clean' | 'costly' | 'failure' | 'catastrophic'
  status: 'armed' | 'met' | 'cleared'
}

export interface Sf2OperationSignal {
  id: string
  name: string
  meaning: string
  trigger: string
  consumed: boolean
  status: Sf2OperationSignalStatus
}

export type Sf2ProcedureResult =
  | { kind: 'procedure_fact'; fact: Sf2ProcedureFact }
  | { kind: 'constraint_delta'; constraint: Sf2ProcedureConstraint }
  | { kind: 'affordance_delta'; affordance: Sf2ProcedureAffordance }
  | { kind: 'complication_delta'; complication: Sf2ProcedureComplication }
  | { kind: 'clue_delta'; clueId: string }
  | { kind: 'clock_tick'; clockId: string; delta: number; reason: string }
  | { kind: 'disposition_delta'; npcOrFactionId: string; delta: number; reason: string }
  | { kind: 'thread_transition'; threadId: string; toStatus: string; reason: string }

export interface Sf2ProcedureRuntime {
  id: string
  kind: Sf2ProcedureKind
  status: Sf2ProcedureStatus
  label: string
  genreSurface?: {
    phaseLabel?: string
    procedureLabel?: string
  }
  phase?: Sf2SemanticPhase
  objective?: string
  objectives?: string[]
  stakes?: string
  facts: Sf2ProcedureFact[]
  constraints: Sf2ProcedureConstraint[]
  affordances: Sf2ProcedureAffordance[]
  complications: Sf2ProcedureComplication[]
  contributions: Sf2SupportContribution[]
  assessments?: Sf2PlanningAssessment[]
  abortConditions?: Sf2OperationAbortCondition[]
  signals?: Sf2OperationSignal[]
  linkedRefs: Sf2ProcedureLink[]
  createdAtTurn: number
  updatedAtTurn: number
}

export interface Sf2ProcedurePacket {
  id: string
  kind: Sf2ProcedureKind
  label: string
  status: Sf2ProcedureStatus
  phase?: Sf2SemanticPhase
  phaseLabel?: string
  objective?: string
  objectives: string[]
  facts: Sf2ProcedureFact[]
  assessments: Sf2PlanningAssessment[]
  constraints: Sf2ProcedureConstraint[]
  abortConditions: Sf2OperationAbortCondition[]
  signals: Sf2OperationSignal[]
  complications: Sf2ProcedureComplication[]
}

export function isSf2ProcedureKind(value: unknown): value is Sf2ProcedureKind {
  return includesValue(SF2_PROCEDURE_KINDS, value)
}

export function isSf2ProcedureStatus(value: unknown): value is Sf2ProcedureStatus {
  return includesValue(SF2_PROCEDURE_STATUSES, value)
}

export function isSf2SemanticPhase(value: unknown): value is Sf2SemanticPhase {
  return includesValue(SF2_SEMANTIC_PHASES, value)
}

export function coerceSf2ProcedureKind(value: unknown, fallback: Sf2ProcedureKind = 'operation'): Sf2ProcedureKind {
  return isSf2ProcedureKind(value) ? value : fallback
}

export function coerceSf2ProcedureStatus(value: unknown, fallback: Sf2ProcedureStatus = 'active'): Sf2ProcedureStatus {
  return isSf2ProcedureStatus(value) ? value : fallback
}

export function coerceSf2SemanticPhase(value: unknown, fallback?: Sf2SemanticPhase): Sf2SemanticPhase | undefined {
  return isSf2SemanticPhase(value) ? value : fallback
}

export function activeSf2ProcedureStatuses(): Sf2ProcedureStatus[] {
  return ['active', 'paused']
}

export function isActiveSf2Procedure(runtime: Pick<Sf2ProcedureRuntime, 'status'>): boolean {
  return runtime.status === 'active' || runtime.status === 'paused'
}

export function buildProcedureScopedKey(input: {
  entityKind: string
  parentKind?: string
  parentId?: string
  semanticRole?: string
  label?: string
}): string {
  return [
    input.entityKind,
    input.parentKind ?? '',
    input.parentId ?? '',
    input.semanticRole ?? '',
    normalizeProcedureKeyPart(input.label ?? ''),
  ].join('::')
}

export function buildProcedureChildKey(
  procedureId: string,
  entityKind: string,
  label: string,
  semanticRole = entityKind
): string {
  return buildProcedureScopedKey({
    entityKind,
    parentKind: 'procedure',
    parentId: procedureId,
    semanticRole,
    label,
  })
}

export function normalizeProcedureRuntime(runtime: Partial<Sf2ProcedureRuntime>, turnIndex: number): Sf2ProcedureRuntime {
  const kind = coerceSf2ProcedureKind(runtime.kind)
  const status = coerceSf2ProcedureStatus(runtime.status)
  return {
    id: nonEmpty(runtime.id, `${kind}_${turnIndex}`),
    kind,
    status,
    label: nonEmpty(runtime.label, kind),
    genreSurface: runtime.genreSurface,
    phase: coerceSf2SemanticPhase(runtime.phase),
    objective: nonEmpty(runtime.objective, undefined),
    objectives: Array.isArray(runtime.objectives) ? runtime.objectives.map(String).filter(Boolean) : [],
    stakes: nonEmpty(runtime.stakes, undefined),
    facts: Array.isArray(runtime.facts) ? runtime.facts.map((fact, index) => normalizeFact(fact, index, turnIndex)) : [],
    constraints: Array.isArray(runtime.constraints) ? runtime.constraints.map((constraint, index) => normalizeConstraint(constraint, index)) : [],
    affordances: Array.isArray(runtime.affordances) ? runtime.affordances.map((affordance, index) => normalizeAffordance(affordance, index)) : [],
    complications: Array.isArray(runtime.complications) ? runtime.complications.map((complication, index) => normalizeComplication(complication, index)) : [],
    contributions: Array.isArray(runtime.contributions) ? runtime.contributions.map((contribution, index) => normalizeContribution(contribution, index)) : [],
    assessments: Array.isArray(runtime.assessments) ? runtime.assessments.map((assessment, index) => normalizeAssessment(assessment, index, turnIndex)) : [],
    abortConditions: Array.isArray(runtime.abortConditions) ? runtime.abortConditions.map((condition, index) => normalizeAbortCondition(condition, index)) : [],
    signals: Array.isArray(runtime.signals) ? runtime.signals.map((signal, index) => normalizeSignal(signal, index)) : [],
    linkedRefs: Array.isArray(runtime.linkedRefs) ? runtime.linkedRefs.map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[] : [],
    createdAtTurn: finiteNumber(runtime.createdAtTurn, turnIndex),
    updatedAtTurn: finiteNumber(runtime.updatedAtTurn, turnIndex),
  }
}

export function buildProcedurePacket(
  runtime: Sf2ProcedureRuntime,
  options: {
    factLimit?: number
    assessmentLimit?: number
    constraintLimit?: number
    complicationLimit?: number
  } = {}
): Sf2ProcedurePacket {
  const facts = runtime.facts
    .slice()
    .sort((a, b) => b.lastUpdatedTurn - a.lastUpdatedTurn)
    .slice(0, options.factLimit ?? 3)
  const assessments = (runtime.assessments ?? [])
    .filter((assessment) => assessment.status === 'open')
    .slice(0, options.assessmentLimit ?? 3)
  const constraints = runtime.constraints
    .filter((constraint) => constraint.status === 'active' || constraint.status === 'consumed')
    .slice(0, options.constraintLimit ?? 5)
  const complications = runtime.complications
    .filter((complication) => complication.status === 'active')
    .slice(0, options.complicationLimit ?? 3)
  return {
    id: runtime.id,
    kind: runtime.kind,
    label: runtime.label,
    status: runtime.status,
    phase: runtime.phase,
    phaseLabel: runtime.genreSurface?.phaseLabel,
    objective: runtime.objective,
    objectives: runtime.objectives ?? (runtime.objective ? [runtime.objective] : []),
    facts,
    assessments,
    constraints,
    abortConditions: runtime.abortConditions?.filter((condition) => condition.status !== 'cleared') ?? [],
    signals: runtime.signals?.filter((signal) => signal.status === 'ready' && !signal.consumed) ?? [],
    complications,
  }
}

function includesValue<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

function normalizeProcedureKeyPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function nonEmpty(value: unknown, fallback: string): string
function nonEmpty(value: unknown, fallback: undefined): string | undefined
function nonEmpty(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function either(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake]
}

function oneOf<const T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return includesValue(values, value) ? value : fallback
}

function normalizeLink(value: unknown): Sf2ProcedureLink | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<Sf2ProcedureLink>
  if (!includesValue(SF2_PROCEDURE_LINK_KINDS, record.kind) || !record.id) return null
  const parentKind = includesValue(SF2_PROCEDURE_CHILD_PARENT_KINDS, record.parentKind)
    ? record.parentKind
    : undefined
  return {
    kind: record.kind,
    id: String(record.id),
    parentKind,
    parentId: nonEmpty(record.parentId, undefined),
  }
}

function normalizeFact(value: unknown, index: number, turnIndex: number): Sf2ProcedureFact {
  const record = objectRecord(value)
  return {
    id: nonEmpty(record.id, `fact_${index}`),
    text: nonEmpty(record.text, ''),
    confidence: record.confidence === 'contested' ? 'contested' : 'confirmed',
    sourceRefs: Array.isArray(either(record, 'sourceRefs', 'source_refs'))
      ? (either(record, 'sourceRefs', 'source_refs') as unknown[]).map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[]
      : [],
    invalidatesWhen: nonEmpty(either(record, 'invalidatesWhen', 'invalidates_when'), undefined),
    lastUpdatedTurn: finiteNumber(either(record, 'lastUpdatedTurn', 'last_updated_turn'), turnIndex),
  }
}

function normalizeConstraint(value: unknown, index: number): Sf2ProcedureConstraint {
  const record = objectRecord(value)
  return {
    id: nonEmpty(record.id, `constraint_${index}`),
    label: nonEmpty(record.label, ''),
    kind: oneOf(record.kind, SF2_PROCEDURE_CONSTRAINT_KINDS, 'physical'),
    status: oneOf(record.status, SF2_PROCEDURE_CONSTRAINT_STATUSES, 'active'),
    current: typeof record.current === 'number' ? record.current : undefined,
    max: typeof record.max === 'number' ? record.max : undefined,
    clearsWhen: nonEmpty(either(record, 'clearsWhen', 'clears_when'), undefined),
    linkedRefs: Array.isArray(either(record, 'linkedRefs', 'linked_refs'))
      ? (either(record, 'linkedRefs', 'linked_refs') as unknown[]).map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[]
      : [],
  }
}

function normalizeAffordance(value: unknown, index: number): Sf2ProcedureAffordance {
  const record = objectRecord(value)
  return {
    id: nonEmpty(record.id, `affordance_${index}`),
    label: nonEmpty(record.label, ''),
    kind: oneOf(record.kind, SF2_PROCEDURE_AFFORDANCE_KINDS, 'asset'),
    status: oneOf(record.status, SF2_PROCEDURE_AFFORDANCE_STATUSES, 'available'),
    consumesConstraintId: nonEmpty(either(record, 'consumesConstraintId', 'consumes_constraint_id'), undefined),
    linkedRefs: Array.isArray(either(record, 'linkedRefs', 'linked_refs'))
      ? (either(record, 'linkedRefs', 'linked_refs') as unknown[]).map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[]
      : [],
  }
}

function normalizeComplication(value: unknown, index: number): Sf2ProcedureComplication {
  const record = objectRecord(value)
  return {
    id: nonEmpty(record.id, `complication_${index}`),
    label: nonEmpty(record.label, ''),
    effectSummary: nonEmpty(either(record, 'effectSummary', 'effect_summary'), ''),
    status: oneOf(record.status, SF2_PROCEDURE_COMPLICATION_STATUSES, 'active'),
    clearsWhen: nonEmpty(either(record, 'clearsWhen', 'clears_when'), undefined),
    linkedRefs: Array.isArray(either(record, 'linkedRefs', 'linked_refs'))
      ? (either(record, 'linkedRefs', 'linked_refs') as unknown[]).map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[]
      : [],
  }
}

function normalizeContribution(value: unknown, index: number): Sf2SupportContribution {
  const record = objectRecord(value)
  const source = objectRecord(record.source)
  return {
    id: nonEmpty(record.id, `contribution_${index}`),
    source: {
      kind: oneOf(source.kind, SF2_SUPPORT_SOURCE_KINDS, 'preparation'),
      id: nonEmpty(source.id, undefined),
      label: nonEmpty(source.label, ''),
    },
    lane: nonEmpty(record.lane, ''),
    kind: oneOf(record.kind, SF2_SUPPORT_CONTRIBUTION_KINDS, 'expertise'),
    summary: nonEmpty(record.summary, ''),
    effect: includesValue(SF2_SUPPORT_CONTRIBUTION_EFFECTS, record.effect) ? record.effect : undefined,
  }
}

function normalizeAssessment(value: unknown, index: number, turnIndex: number): Sf2PlanningAssessment {
  const record = objectRecord(value)
  const check = objectRecord(record.check)
  return {
    id: nonEmpty(record.id, `assessment_${index}`),
    claim: nonEmpty(record.claim, ''),
    status: oneOf(record.status, SF2_PLANNING_ASSESSMENT_STATUSES, 'open'),
    rolled: Boolean(record.rolled),
    check: check.skill
      ? { skill: String(check.skill), dc: finiteNumber(check.dc, 12) }
      : undefined,
    supportContributionIds: Array.isArray(either(record, 'supportContributionIds', 'support_contribution_ids'))
      ? (either(record, 'supportContributionIds', 'support_contribution_ids') as unknown[]).map(String).filter(Boolean)
      : [],
    promotedTo: Array.isArray(either(record, 'promotedTo', 'promoted_to'))
      ? (either(record, 'promotedTo', 'promoted_to') as unknown[]).map(normalizeLink).filter(Boolean) as Sf2ProcedureLink[]
      : undefined,
    lastUpdatedTurn: finiteNumber(either(record, 'lastUpdatedTurn', 'last_updated_turn'), turnIndex),
  }
}

function normalizeAbortCondition(value: unknown, index: number): Sf2OperationAbortCondition {
  const record = objectRecord(value)
  return {
    id: nonEmpty(record.id, `abort_${index}`),
    label: nonEmpty(record.label, ''),
    trigger: nonEmpty(record.trigger, ''),
    outcomeTier: oneOf(either(record, 'outcomeTier', 'outcome_tier'), ['clean', 'costly', 'failure', 'catastrophic'] as const, 'failure'),
    status: oneOf(record.status, ['armed', 'met', 'cleared'] as const, 'armed'),
  }
}

function normalizeSignal(value: unknown, index: number): Sf2OperationSignal {
  const record = objectRecord(value)
  const status = oneOf(record.status, SF2_OPERATION_SIGNAL_STATUSES, 'ready')
  return {
    id: nonEmpty(record.id, `signal_${index}`),
    name: nonEmpty(record.name, ''),
    meaning: nonEmpty(record.meaning, ''),
    trigger: nonEmpty(record.trigger, ''),
    consumed: Boolean(record.consumed) || status === 'consumed',
    status,
  }
}
