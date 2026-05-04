import type {
  Sf2EntityId,
  Sf2Thread,
  Sf2ThreadProgressEvent,
  Sf2ThreadResolutionGate,
  Sf2ThreadResolutionGateStatus,
} from './types'

type UnknownRecord = Record<string, unknown>

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
      gates.push(gate)
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
  for (const gate of normalizeThreadResolutionGates(raw)) {
    const current = gates.find((g) => g.id === gate.id)
    if (current) mergeGate(current, gate)
    else gates.push(gate)
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
    (gate) => gate.required !== false && gate.status === 'open'
  )
}

export function successfulThreadResolutionBlocked(
  thread: Sf2Thread,
  toStatus: string
): string | null {
  if (toStatus !== 'resolved_clean' && toStatus !== 'resolved_costly') return null
  const blockers = unresolvedRequiredResolutionGates(thread)
  if (blockers.length === 0) return null
  return `required resolution gates still open: ${blockers.map((gate) => `${gate.id} (${gate.label})`).join(', ')}`
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

function normalizeGate(raw: unknown, index: number): Sf2ThreadResolutionGate | null {
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
  return {
    id,
    label: label || condition || id,
    condition: condition || label || id,
    required: record?.required === undefined ? true : Boolean(record.required),
    status,
    satisfiedTurn: numberValue(record, undefined, 'satisfied_turn', 'satisfiedTurn'),
    evidenceQuote: stringValue(record, 'evidence_quote', 'evidenceQuote') || undefined,
  }
}

function mergeGate(target: Sf2ThreadResolutionGate, incoming: Sf2ThreadResolutionGate): void {
  target.label = incoming.label || target.label
  target.condition = incoming.condition || target.condition
  target.required = incoming.required
  if (incoming.status !== 'open' || target.status === 'open') target.status = incoming.status
  target.satisfiedTurn = incoming.satisfiedTurn ?? target.satisfiedTurn
  target.evidenceQuote = incoming.evidenceQuote ?? target.evidenceQuote
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

function slugify(value: string): Sf2EntityId {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'resolution_gate'
}
