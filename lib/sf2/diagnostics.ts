import type { DebugEntry } from './diagnostics-store'
import type {
  Sf2CoherenceFinding,
  Sf2DiagnosticFinding,
  Sf2DisplaySentinelFinding,
  Sf2EntityRef,
} from './types'

type DiagnosticSeverity = Sf2DiagnosticFinding['severity']

export function debugEntryToDiagnosticFinding(entry: DebugEntry, index = 0): Sf2DiagnosticFinding | null {
  if (entry.kind === 'display_sentinel') {
    return sentinelToDiagnostic(entry.data as Partial<Sf2DisplaySentinelFinding>, entry.at, index)
  }
  if (entry.kind === 'sf2.coherence.finding') {
    return coherenceToDiagnostic(entry.data as Partial<Sf2CoherenceFinding>, entry.at, index)
  }
  if (entry.kind === 'sf2.invariant') {
    const data = asRecord(entry.data)
    return {
      id: `replay:${entry.at}:${index}:${String(data.type ?? 'invariant')}`,
      source: 'replay',
      kind: String(data.type ?? 'invariant'),
      severity: 'warn',
      entityRefs: refsFromPayload(data),
      turnId: turnIdFromPayload(data),
      message: String(data.message ?? data.reason ?? data.type ?? 'Replay invariant event'),
      status: 'open',
      payload: entry.data,
    }
  }
  if (entry.kind === 'archivist') {
    const data = asRecord(entry.data)
    const patch = asRecord(data.patch)
    const topLevelFlags = Array.isArray(data.flags) ? data.flags : []
    const patchFlags = Array.isArray(patch.flags) ? patch.flags : []
    const flags = topLevelFlags.length > 0 ? topLevelFlags : patchFlags
    if (flags.length === 0) return null
    return {
      id: `archivist:${entry.at}:${index}`,
      source: 'archivist',
      kind: 'flags',
      severity: 'warn',
      entityRefs: refsFromPayload(flags),
      turnId: turnIdFromPayload(data),
      message: `${flags.length} archivist flag${flags.length === 1 ? '' : 's'}`,
      status: 'open',
      payload: entry.data,
    }
  }
  if (entry.kind === 'narrator_output_recovered' || entry.kind === 'narrator_meta_observed') {
    const data = asRecord(entry.data)
    return {
      id: `pending:${entry.at}:${index}:${entry.kind}`,
      source: 'pending',
      kind: entry.kind,
      severity: entry.kind === 'narrator_output_recovered' ? 'error' : 'warn',
      entityRefs: refsFromPayload(data),
      turnId: turnIdFromPayload(data),
      message: String(data.message ?? data.reason ?? entry.kind),
      status: 'open',
      payload: entry.data,
    }
  }
  return null
}

export function debugEntriesToDiagnosticFindings(entries: readonly DebugEntry[]): Sf2DiagnosticFinding[] {
  return entries
    .map((entry, index) => debugEntryToDiagnosticFinding(entry, index))
    .filter((finding): finding is Sf2DiagnosticFinding => Boolean(finding))
}

export function queryOpenErrorFindingsForEntity(
  findings: readonly Sf2DiagnosticFinding[],
  entityId: string
): Sf2DiagnosticFinding[] {
  return findings.filter(
    (finding) =>
      finding.status === 'open' &&
      finding.severity === 'error' &&
      finding.entityRefs.some((ref) => ref.id === entityId)
  )
}

function sentinelToDiagnostic(
  finding: Partial<Sf2DisplaySentinelFinding>,
  at: number,
  index: number
): Sf2DiagnosticFinding {
  return {
    id: `sentinel:${at}:${index}:${finding.type ?? 'unknown'}`,
    source: 'sentinel',
    kind: String(finding.type ?? 'unknown'),
    severity: sentinelSeverity(finding.severity),
    entityRefs: finding.entityId ? [inferEntityRef(finding.entityId)] : refsFromPayload(finding),
    message: finding.evidence ?? finding.surface ?? String(finding.type ?? 'Display sentinel finding'),
    status: 'open',
    payload: finding,
  }
}

function coherenceToDiagnostic(
  finding: Partial<Sf2CoherenceFinding>,
  at: number,
  index: number
): Sf2DiagnosticFinding {
  return {
    id: `coherence:${at}:${index}:${finding.type ?? 'unknown'}`,
    source: 'coherence',
    kind: String(finding.type ?? 'unknown'),
    severity: coherenceSeverity(finding.severity),
    entityRefs: finding.stateReference ? [inferEntityRef(finding.stateReference)] : refsFromPayload(finding),
    message: finding.suggestedNote ?? finding.evidenceQuote ?? String(finding.type ?? 'Coherence finding'),
    status: 'open',
    payload: finding,
  }
}

function sentinelSeverity(severity: Sf2DisplaySentinelFinding['severity'] | undefined): DiagnosticSeverity {
  if (severity === 'hard') return 'error'
  if (severity === 'medium') return 'warn'
  return 'info'
}

function coherenceSeverity(severity: Sf2CoherenceFinding['severity'] | undefined): DiagnosticSeverity {
  if (severity === 'high') return 'error'
  if (severity === 'medium') return 'warn'
  return 'info'
}

function refsFromPayload(payload: unknown): Sf2EntityRef[] {
  const refs = new Map<string, Sf2EntityRef>()
  collectRefs(payload, refs)
  return [...refs.values()]
}

function collectRefs(value: unknown, refs: Map<string, Sf2EntityRef>): void {
  if (!value) return
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\b(?:npc|faction|thread|clue|decision|promise|location|doc)_[a-z0-9_]+\b/g)) {
      const ref = inferEntityRef(match[0])
      refs.set(`${ref.kind}:${ref.id}`, ref)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs)
    return
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) collectRefs(nested, refs)
  }
}

function inferEntityRef(id: string): Sf2EntityRef {
  if (id.startsWith('npc_')) return { kind: 'npc', id }
  if (id.startsWith('faction_')) return { kind: 'faction', id }
  if (id.startsWith('thread_')) return { kind: 'thread', id }
  if (id.startsWith('clue_')) return { kind: 'clue', id }
  if (id.startsWith('decision_')) return { kind: 'decision', id }
  if (id.startsWith('promise_')) return { kind: 'promise', id }
  if (id.startsWith('location_')) return { kind: 'location', id }
  if (id.startsWith('doc_')) return { kind: 'document', id }
  return { kind: 'unknown', id }
}

function turnIdFromPayload(payload: unknown): string | undefined {
  const data = asRecord(payload)
  const turn = data.turnId ?? data.turnIndex ?? data.turn ?? data.atTurn
  return turn === undefined ? undefined : String(turn)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}
