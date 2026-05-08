import type { Sf2Thread, Sf2ThreadStatus } from './types'

export const SF2_THREAD_STATUSES = [
  'active',
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
  'deferred',
] as const satisfies readonly Sf2ThreadStatus[]

export const SF2_RESOLVED_THREAD_STATUSES = [
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
] as const satisfies readonly Sf2ThreadStatus[]

export const SF2_TERMINAL_THREAD_STATUSES = [
  ...SF2_RESOLVED_THREAD_STATUSES,
  'abandoned',
] as const satisfies readonly Sf2ThreadStatus[]

export const SF2_THREAD_TRANSITIONS = {
  active: [
    'resolved_clean',
    'resolved_costly',
    'resolved_failure',
    'resolved_catastrophic',
    'abandoned',
    'deferred',
  ],
  deferred: [
    'active',
    'resolved_failure',
    'resolved_catastrophic',
    'abandoned',
  ],
  resolved_clean: [],
  resolved_costly: [],
  resolved_failure: [],
  resolved_catastrophic: [],
  abandoned: [],
} as const satisfies Record<Sf2ThreadStatus, readonly Sf2ThreadStatus[]>

const STATUSES = new Set<Sf2ThreadStatus>(SF2_THREAD_STATUSES)
const RESOLVED = new Set<Sf2ThreadStatus>(SF2_RESOLVED_THREAD_STATUSES)
const TERMINAL = new Set<Sf2ThreadStatus>(SF2_TERMINAL_THREAD_STATUSES)
const OWNER_BACKREF = new Set<Sf2ThreadStatus>(['active', 'deferred'])

export function isThreadStatus(value: unknown): value is Sf2ThreadStatus {
  return STATUSES.has(value as Sf2ThreadStatus)
}

export function isThreadResolved(threadOrStatus: Sf2Thread | Sf2ThreadStatus): boolean {
  const status = typeof threadOrStatus === 'string' ? threadOrStatus : threadOrStatus.status
  return RESOLVED.has(status)
}

export function isThreadTerminal(threadOrStatus: Sf2Thread | Sf2ThreadStatus): boolean {
  const status = typeof threadOrStatus === 'string' ? threadOrStatus : threadOrStatus.status
  return TERMINAL.has(status)
}

export function isThreadPressureEligible(threadOrStatus: Sf2Thread | Sf2ThreadStatus): boolean {
  const status = typeof threadOrStatus === 'string' ? threadOrStatus : threadOrStatus.status
  return status === 'active' || status === 'deferred'
}

export function isThreadOwnerBackrefEligible(threadOrStatus: Sf2Thread | Sf2ThreadStatus): boolean {
  const status = typeof threadOrStatus === 'string' ? threadOrStatus : threadOrStatus.status
  return OWNER_BACKREF.has(status)
}

export function isValidThreadTransition(from: Sf2ThreadStatus, to: Sf2ThreadStatus): boolean {
  if (from === to) return true
  return (SF2_THREAD_TRANSITIONS[from] as readonly Sf2ThreadStatus[]).includes(to)
}

export function invalidThreadTransitionReason(from: Sf2ThreadStatus, to: Sf2ThreadStatus): string | null {
  if (isValidThreadTransition(from, to)) return null
  const valid = SF2_THREAD_TRANSITIONS[from]
  return valid.length > 0
    ? `thread.status: cannot transition from ${from} to ${to} (valid: ${valid.join('|')})`
    : `thread.status: cannot transition from terminal status ${from}`
}
