import type { Sf2BeatMode } from './beat-mode'
import { PROCEDURE_NONE, type Sf2ProcedureRuntime } from './procedure'
import type { Sf2ChapterTransitionSeed, Sf2ProcedureResidueMode } from './types'

export const SF2_PROCEDURE_RESIDUE_CLASSES = [
  'live',
  'background_constraint',
  'leverage',
  'discarded_mechanism',
] as const

export const SF2_PROCEDURE_TRANSITION_ACTIONS = [
  'carry_forward',
  'reframe',
  'discard',
] as const

export type Sf2ProcedureResidueClass = (typeof SF2_PROCEDURE_RESIDUE_CLASSES)[number]
export type Sf2ProcedureTransitionAction = (typeof SF2_PROCEDURE_TRANSITION_ACTIONS)[number]

export interface Sf2ProcedureResidueInput {
  mechanism?: string | null
  keepAs?: Sf2ProcedureResidueMode | Sf2ProcedureResidueClass | null
  procedure?: Pick<
    Sf2ProcedureRuntime,
    'id' | 'label' | 'kind' | 'status' | 'constraints' | 'affordances' | 'complications'
  > | null
  ownerCanUse?: boolean
  contradictionRisk?: boolean
}

export interface Sf2ProcedureResidueClassification {
  mechanism: string
  residueClass: Sf2ProcedureResidueClass
  reason: string
  sourceKeepAs?: Sf2ProcedureResidueMode | Sf2ProcedureResidueClass
}

export interface Sf2ProcedureTransitionDecision {
  action: Sf2ProcedureTransitionAction
  residueClass: Sf2ProcedureResidueClass
  carryForwardAs?: Sf2ProcedureResidueMode
  instruction: string
}

export interface Sf2ForwardMotionInput {
  beatMode: Sf2BeatMode
  currentBeatKey?: string | null
  priorBeatKey?: string | null
  turnsSinceMaterialChange?: number | null
  activeProcedureIds?: string[]
  successorThreadIds?: string[]
  unresolvedProcedureIds?: string[]
}

export interface Sf2ForwardMotionAdvisory {
  kind: 'forward_motion'
  severity: 'observe' | 'nudge'
  exempt: false
  reason: string
  instruction: string
}

const FORWARD_MOTION_EXEMPT_BEAT_MODES: ReadonlySet<Sf2BeatMode> = new Set([
  'briefing',
  'planning',
  'montage',
  'debrief',
  'aftermath',
  'meta',
])

export function classifyProcedureResidue(input: Sf2ProcedureResidueInput): Sf2ProcedureResidueClassification {
  const mechanism = normalizeMechanism(input.mechanism ?? input.procedure?.label ?? input.procedure?.id)
  const sourceKeepAs = normalizeKeepAs(input.keepAs)

  if (!mechanism || mechanism === PROCEDURE_NONE) {
    return {
      mechanism: PROCEDURE_NONE,
      residueClass: 'discarded_mechanism',
      reason: 'No procedure mechanism remains available to carry forward.',
      sourceKeepAs,
    }
  }

  if (sourceKeepAs) {
    return {
      mechanism,
      residueClass: residueClassForKeepAs(sourceKeepAs),
      reason: reasonForResidueClass(residueClassForKeepAs(sourceKeepAs), mechanism),
      sourceKeepAs,
    }
  }

  const procedure = input.procedure
  const hasActiveComplication = procedure?.complications.some((item) => item.status === 'active') ?? false
  const hasActiveConstraint = procedure?.constraints.some((item) => item.status === 'active') ?? false
  const hasAvailableAffordance = procedure?.affordances.some((item) => item.status === 'available') ?? false

  if (input.ownerCanUse || hasActiveComplication) {
    return {
      mechanism,
      residueClass: 'leverage',
      reason: `${mechanism} can be used by a person, faction, or institution as pressure.`,
    }
  }

  if (procedure?.status === 'active' || procedure?.status === 'paused') {
    return {
      mechanism,
      residueClass: 'live',
      reason: `${mechanism} is still an unresolved procedure surface.`,
    }
  }

  if (input.contradictionRisk || hasActiveConstraint || hasAvailableAffordance) {
    return {
      mechanism,
      residueClass: 'background_constraint',
      reason: `${mechanism} should constrain continuity without becoming the next opener.`,
    }
  }

  return {
    mechanism,
    residueClass: 'discarded_mechanism',
    reason: `${mechanism} has served its chapter function and should not be restaged.`,
  }
}

export function chooseProcedureTransition(input: Sf2ProcedureResidueInput): Sf2ProcedureTransitionDecision {
  const classified = classifyProcedureResidue(input)
  switch (classified.residueClass) {
    case 'leverage':
      return {
        action: 'carry_forward',
        residueClass: classified.residueClass,
        carryForwardAs: 'leverage',
        instruction: `${classified.mechanism} may carry forward only through the pressure owner actively using it.`,
      }
    case 'live':
      return {
        action: 'carry_forward',
        residueClass: classified.residueClass,
        carryForwardAs: 'constraint',
        instruction: `${classified.mechanism} remains live, but the next chapter must advance it instead of restaging setup.`,
      }
    case 'background_constraint':
      return {
        action: 'reframe',
        residueClass: classified.residueClass,
        carryForwardAs: 'background',
        instruction: `${classified.mechanism} should preserve continuity as a background constraint, not a fresh main choice.`,
      }
    case 'discarded_mechanism':
      return {
        action: 'discard',
        residueClass: classified.residueClass,
        carryForwardAs: 'discard',
        instruction: `${classified.mechanism} should be listed under do-not-restage and left behind.`,
      }
  }
}

export function chooseTransitionSeedProcedureSupport(
  seed: Pick<Sf2ChapterTransitionSeed, 'procedureResidue'>
): Sf2ProcedureTransitionDecision {
  return chooseProcedureTransition({
    mechanism: seed.procedureResidue.mechanism,
    keepAs: seed.procedureResidue.keepAs,
  })
}

export function deriveForwardMotionAdvisory(input: Sf2ForwardMotionInput): Sf2ForwardMotionAdvisory | null {
  if (FORWARD_MOTION_EXEMPT_BEAT_MODES.has(input.beatMode)) return null

  const successorCount = input.successorThreadIds?.length ?? 0
  if (successorCount > 0) return null

  const unresolvedProcedureCount = input.unresolvedProcedureIds?.length ?? input.activeProcedureIds?.length ?? 0
  const repeatedBeat = Boolean(input.currentBeatKey && input.currentBeatKey === input.priorBeatKey)
  const turnsSinceMaterialChange = input.turnsSinceMaterialChange ?? 0

  if (unresolvedProcedureCount > 0 && turnsSinceMaterialChange >= 2) {
    return {
      kind: 'forward_motion',
      severity: 'nudge',
      exempt: false,
      reason: 'An active procedure has not produced material change for multiple non-exempt turns.',
      instruction: 'Resolve, escalate, or hand off the active procedure; do not loop on the same procedural beat.',
    }
  }

  if (repeatedBeat && turnsSinceMaterialChange >= 2) {
    return {
      kind: 'forward_motion',
      severity: 'observe',
      exempt: false,
      reason: 'The same non-exempt beat repeated without a successor thread or material change.',
      instruction: 'Introduce a successor, consequence, location change, or concrete state change on this turn.',
    }
  }

  return null
}

export function isForwardMotionExemptBeatMode(mode: Sf2BeatMode): boolean {
  return FORWARD_MOTION_EXEMPT_BEAT_MODES.has(mode)
}

function normalizeMechanism(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : PROCEDURE_NONE
}

function normalizeKeepAs(value: unknown): Sf2ProcedureResidueMode | Sf2ProcedureResidueClass | undefined {
  if (typeof value !== 'string') return undefined
  if (
    value === 'constraint' ||
    value === 'leverage' ||
    value === 'background' ||
    value === 'discard' ||
    value === 'live' ||
    value === 'background_constraint' ||
    value === 'discarded_mechanism'
  ) {
    return value
  }
  return undefined
}

function residueClassForKeepAs(keepAs: Sf2ProcedureResidueMode | Sf2ProcedureResidueClass): Sf2ProcedureResidueClass {
  switch (keepAs) {
    case 'constraint':
    case 'background':
    case 'background_constraint':
      return 'background_constraint'
    case 'leverage':
      return 'leverage'
    case 'live':
      return 'live'
    case 'discard':
    case 'discarded_mechanism':
      return 'discarded_mechanism'
  }
}

function reasonForResidueClass(residueClass: Sf2ProcedureResidueClass, mechanism: string): string {
  switch (residueClass) {
    case 'live':
      return `${mechanism} remains live across the transition.`
    case 'background_constraint':
      return `${mechanism} should constrain continuity without driving the opener.`
    case 'leverage':
      return `${mechanism} can be used by a pressure owner.`
    case 'discarded_mechanism':
      return `${mechanism} should not carry forward.`
  }
}
