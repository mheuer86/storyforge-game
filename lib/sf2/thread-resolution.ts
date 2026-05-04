import type {
  Sf2EntityId,
  Sf2Thread,
  Sf2ThreadProgressEvent,
  Sf2ThreadResolutionGate,
  Sf2ThreadResolutionGateStatus,
} from './types'

type UnknownRecord = Record<string, unknown>
type NormalizedGate = Sf2ThreadResolutionGate & { requiredSpecified: boolean }

const GATE_STATUSES = new Set<Sf2ThreadResolutionGateStatus>([
  'open',
  'satisfied',
  'failed',
  'waived',
])

export function normalizeThreadResolutionGates(raw: unknown): Sf2ThreadResolutionGate[] {
  if (!Array.isArray(raw)) return []
  const gates: Sf2ThreadResolutionGate[] = []
  for (const [index, item] of raw.entries()) {
    const gate = normalizeGate(item, index)
    if (!gate) continue
    const existing = gates.find((g) => g.id === gate.id)
    if (existing) {
      mergeGate(existing, gate)
    } else {
      gates.push(publicGate(gate))
    }
  }
  return gates
}

export function normalizeThreadProgressEvents(raw: unknown): Sf2ThreadProgressEvent[] {
  if (!Array.isArray(raw)) return []
  const events: Sf2ThreadProgressEvent[] = []
  for (const [index, item] of raw.entries()) {
    const event = normalizeProgressEvent(item, index)
    if (event) events.push(event)
  }
  return events
}

export function mergeThreadResolutionGates(
  existing: Sf2ThreadResolutionGate[],
  raw: unknown
): Sf2ThreadResolutionGate[] {
  const gates = [...existing]
  if (!Array.isArray(raw)) return gates
  for (const [index, item] of raw.entries()) {
    const gate = normalizeGate(item, index)
    if (!gate) continue
    const current = gates.find((g) => g.id === gate.id)
    if (current) mergeGate(current, gate)
    else gates.push(publicGate(gate))
  }
  return gates
}

export function applyThreadProgressChanges(
  thread: Sf2Thread,
  changes: Record<string, unknown>,
  turnIndex: number,
  sourceQuote?: string
): void {
  thread.resolutionGates = mergeThreadResolutionGates(
    thread.resolutionGates ?? [],
    changes.resolution_gates ?? changes.resolutionGates
  )

  const progressRaw =
    changes.progress_events ??
    changes.progressEvents ??
    changes.thread_progress ??
    changes.threadProgress ??
    changes.progress
  for (const event of normalizeProgressInput(progressRaw, turnIndex, sourceQuote)) {
    thread.progressEvents = [...(thread.progressEvents ?? []), event]
    satisfyGateIds(thread, event.gateIds ?? [], turnIndex, event.evidenceQuote)
  }

  satisfyGateIds(
    thread,
    stringArray(
      changes.satisfied_resolution_gates ??
      changes.satisfiedResolutionGates ??
      changes.satisfy_resolution_gates ??
      changes.satisfyResolutionGates ??
      changes.satisfied_gate_ids ??
      changes.satisfiedGateIds
    ),
    turnIndex,
    sourceQuote
  )
  setGateStatuses(
    thread,
    stringArray(changes.failed_resolution_gates ?? changes.failedResolutionGates ?? changes.failed_gate_ids),
    'failed',
    turnIndex,
    sourceQuote
  )
  setGateStatuses(
    thread,
    stringArray(changes.waived_resolution_gates ?? changes.waivedResolutionGates ?? changes.waived_gate_ids),
    'waived',
    turnIndex,
    sourceQuote
  )
}

export function unresolvedRequiredResolutionGates(thread: Sf2Thread): Sf2ThreadResolutionGate[] {
  return (thread.resolutionGates ?? []).filter(
    (gate) =>
      gate.required !== false &&
      gate.status !== 'satisfied' &&
      gate.status !== 'waived'
  )
}

export function successfulThreadResolutionBlocked(
  thread: Sf2Thread,
  toStatus: string,
  evidence?: string
): string | null {
  if (toStatus !== 'resolved_clean' && toStatus !== 'resolved_costly') return null
  const blockers = unresolvedRequiredResolutionGates(thread)
  if (blockers.length > 0) {
    return `required resolution gates still unresolved: ${blockers.map((gate) => `${gate.id} (${gate.label}; ${gate.status})`).join(', ')}`
  }
  const implicitBlock = implicitMeansOnlyResolutionBlocked(thread, evidence)
  if (implicitBlock) return implicitBlock
  return null
}

function normalizeProgressInput(
  raw: unknown,
  turnIndex: number,
  sourceQuote?: string
): Sf2ThreadProgressEvent[] {
  if (raw === undefined || raw === null) return []
  const items = Array.isArray(raw) ? raw : [raw]
  const events: Sf2ThreadProgressEvent[] = []
  for (const [index, item] of items.entries()) {
    const record = asRecord(item)
    const summary = typeof item === 'string'
      ? item.trim()
      : stringValue(record, 'summary', 'label', 'description')
    if (!summary) continue
    const gateIds = [
      ...stringArray(record?.gate_id ?? record?.gateId),
      ...stringArray(record?.gate_ids ?? record?.gateIds),
      ...stringArray(record?.satisfies_gate_ids ?? record?.satisfiesGateIds),
      ...stringArray(record?.satisfied_gate_ids ?? record?.satisfiedGateIds),
    ]
    events.push({
      id: stringValue(record, 'id') || `progress_${turnIndex}_${index + 1}`,
      turn: numberValue(record, turnIndex, 'turn', 'turn_index', 'turnIndex') ?? turnIndex,
      summary,
      evidenceQuote: stringValue(record, 'evidence_quote', 'evidenceQuote') || sourceQuote,
      gateIds: uniqueStrings(gateIds),
    })
  }
  return events
}

function normalizeProgressEvent(raw: unknown, index: number): Sf2ThreadProgressEvent | null {
  const record = asRecord(raw)
  if (!record) return null
  const summary = stringValue(record, 'summary', 'label', 'description')
  if (!summary) return null
  return {
    id: stringValue(record, 'id') || `progress_${index + 1}`,
    turn: numberValue(record, 0, 'turn', 'turn_index', 'turnIndex') ?? 0,
    summary,
    evidenceQuote: stringValue(record, 'evidence_quote', 'evidenceQuote') || undefined,
    gateIds: uniqueStrings([
      ...stringArray(record.gate_id ?? record.gateId),
      ...stringArray(record.gate_ids ?? record.gateIds),
    ]),
  }
}

function normalizeGate(raw: unknown, index: number): NormalizedGate | null {
  const record = asRecord(raw)
  const label = typeof raw === 'string'
    ? raw.trim()
    : stringValue(record, 'label', 'title', 'id', 'condition')
  const condition = typeof raw === 'string'
    ? raw.trim()
    : stringValue(record, 'condition', 'description', 'label', 'title')
  if (!label && !condition) return null
  const id = stringValue(record, 'id') || `gate_${slugify(label || condition || String(index + 1))}`
  const statusRaw = stringValue(record, 'status') as Sf2ThreadResolutionGateStatus
  const status = GATE_STATUSES.has(statusRaw) ? statusRaw : 'open'
  const requiredSpecified = hasOwn(record, 'required')
  return {
    id,
    label: label || condition || id,
    condition: condition || label || id,
    required: requiredSpecified ? Boolean(record?.required) : true,
    status,
    satisfiedTurn: numberValue(record, undefined, 'satisfied_turn', 'satisfiedTurn'),
    evidenceQuote: stringValue(record, 'evidence_quote', 'evidenceQuote') || undefined,
    requiredSpecified,
  }
}

function mergeGate(target: Sf2ThreadResolutionGate, incoming: NormalizedGate): void {
  target.label = incoming.label || target.label
  target.condition = incoming.condition || target.condition
  if (incoming.requiredSpecified) target.required = incoming.required
  if (incoming.status !== 'open' || target.status === 'open') target.status = incoming.status
  target.satisfiedTurn = incoming.satisfiedTurn ?? target.satisfiedTurn
  target.evidenceQuote = incoming.evidenceQuote ?? target.evidenceQuote
}

function publicGate(gate: NormalizedGate): Sf2ThreadResolutionGate {
  return {
    id: gate.id,
    label: gate.label,
    condition: gate.condition,
    required: gate.required,
    status: gate.status,
    satisfiedTurn: gate.satisfiedTurn,
    evidenceQuote: gate.evidenceQuote,
  }
}

function implicitMeansOnlyResolutionBlocked(
  thread: Sf2Thread,
  evidence?: string
): string | null {
  if ((thread.resolutionGates ?? []).length > 0) return null
  const criteria = normalizeForComparison(thread.resolutionCriteria)
  const proof = normalizeForComparison(evidence)
  if (!criteria || !proof) return null

  const criteriaRequiresFinalStep =
    /\b(process|processed|processing|activate|activated|activating|install|installed|use|used|apply|applied|deliver|delivered|present|presented|submit|submitted|unlock|unlocked|decode|decoded)\b/.test(criteria) ||
    /\bclamp (?:visibly )?releases?\b/.test(criteria)
  const proofOnlyObtainsMeans =
    /\b(obtain|obtained|take|took|get|got|receive|received|acquire|acquired|find|found|handover|handed over)\b/.test(proof)
  const proofShowsFinalStep =
    /\b(processed|activated|installed|used|applied|delivered|presented|submitted|unlocked|decoded|cleared|released|resolved|completed)\b/.test(proof)
  const proofNegatesFinalStep =
    /\b(not|never|without|has not|had not|does not|did not|cannot|can't|is not|isn't)\b.{0,48}\b(processed|activated|installed|used|applied|delivered|presented|submitted|unlocked|decoded|cleared|released|resolved|completed)\b/.test(proof)

  if (criteriaRequiresFinalStep && proofOnlyObtainsMeans && (!proofShowsFinalStep || proofNegatesFinalStep)) {
    return 'resolution criteria require the final step, but evidence only shows obtaining the means'
  }
  const criteriaRequiresOriginIntent =
    /\b(identify|identified|confirm|confirmed|name|determine|learn|establish)\b/.test(criteria) &&
    /\b(origin|intent|affiliation|owner|source|who|why)\b/.test(criteria)
  const proofOnlyShowsEvasion =
    /\b(evade|evaded|shake|shook|lose|lost|cannot see|can't see|did not intercept|no active interdiction|sensor|parallel|wake|tail)\b/.test(proof)
  const proofNamesOriginOrIntent =
    /\b(origin|intent|affiliation|identified as|confirmed as|named as|belongs to|works for|source is|hunting|taxing|tracking|waiting for|pursuing)\b/.test(proof)

  if (criteriaRequiresOriginIntent && proofOnlyShowsEvasion && !proofNamesOriginOrIntent) {
    return 'resolution criteria require identifying origin/intent, but evidence only shows temporary evasion or contact geometry'
  }
  return null
}

function satisfyGateIds(
  thread: Sf2Thread,
  gateIds: string[],
  turnIndex: number,
  evidenceQuote?: string
): void {
  setGateStatuses(thread, gateIds, 'satisfied', turnIndex, evidenceQuote)
}

function setGateStatuses(
  thread: Sf2Thread,
  gateIds: string[],
  status: Sf2ThreadResolutionGateStatus,
  turnIndex: number,
  evidenceQuote?: string
): void {
  if (gateIds.length === 0) return
  const wanted = new Set(gateIds)
  for (const gate of thread.resolutionGates ?? []) {
    if (!wanted.has(gate.id) && !wanted.has(gate.label)) continue
    gate.status = status
    gate.satisfiedTurn = status === 'satisfied' ? turnIndex : gate.satisfiedTurn
    gate.evidenceQuote = evidenceQuote || gate.evidenceQuote
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function stringValue(record: UnknownRecord | null, ...keys: string[]): string {
  if (!record) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function numberValue(record: UnknownRecord | null, fallback: number | undefined, ...keys: string[]): number | undefined {
  if (!record) return fallback
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return fallback
}

function stringArray(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function hasOwn(record: UnknownRecord | null, key: string): boolean {
  return Boolean(record && Object.prototype.hasOwnProperty.call(record, key))
}

function normalizeForComparison(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/\s+/g, ' ').trim()
    : ''
}

function slugify(value: string): Sf2EntityId {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'resolution_gate'
}
