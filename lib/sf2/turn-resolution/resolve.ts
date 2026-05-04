import { resolvePlayerAction } from '../action-resolver/resolve'
import { addLocalEscalation } from '../pressure/reheat'
import type {
  Sf2CoherenceFinding,
  Sf2EntityId,
  Sf2ResolvedActionType,
  Sf2RollRecord,
  Sf2State,
  Sf2TurnResolutionConsequence,
  Sf2TurnResolutionRecord,
} from '../types'

const MATERIAL_ACTION_TYPES = new Set<Sf2ResolvedActionType>([
  'pressure_npc',
  'investigate',
  'use_item',
  'attack',
])

export interface BuildTurnResolutionInput {
  stateBefore: Sf2State
  turnIndex: number
  playerInput: string
  isInitial: boolean
  rollRecords?: Sf2RollRecord[]
}

export interface ApplyTurnResolutionInput {
  stateBefore: Sf2State
  stateAfter: Sf2State
  record: Sf2TurnResolutionRecord | null
}

export interface ApplyTurnResolutionResult {
  record: Sf2TurnResolutionRecord | null
  events: Sf2TurnResolutionConsequence[]
  driftFindings: Sf2CoherenceFinding[]
}

export function buildTurnResolutionRecord(
  input: BuildTurnResolutionInput
): Sf2TurnResolutionRecord | null {
  if (input.isInitial || !input.playerInput.trim()) return null

  const action = resolvePlayerAction(input.stateBefore, input.playerInput)
  const targetThreadIds = resolveTargetThreadIds(input.stateBefore, [
    ...action.targetEntityIds,
    ...action.subjectEntityIds,
  ])
  const rollRecords = (input.rollRecords ?? [])
    .filter((roll) => roll.turn === input.turnIndex)
    .map((roll) => ({ ...roll }))

  return {
    turnIndex: input.turnIndex,
    action,
    targetThreadIds,
    rollRecords,
    consequenceEvents: plannedConsequences({
      actionType: action.actionType,
      targetEntityIds: action.targetEntityIds,
      targetThreadIds,
      rollRecords,
    }),
    driftFindings: [],
  }
}

export function applyTurnResolutionConsequences(
  input: ApplyTurnResolutionInput
): ApplyTurnResolutionResult {
  const record = input.record
  if (!record) return { record: null, events: [], driftFindings: [] }

  const events: Sf2TurnResolutionConsequence[] = []
  const driftFindings: Sf2CoherenceFinding[] = []
  const mutationObservedBeforeResolution = hasDurableTargetMutation({
    stateBefore: input.stateBefore,
    stateAfter: input.stateAfter,
    targetEntityIds: record.action.targetEntityIds,
    targetThreadIds: record.targetThreadIds,
    includePressure: false,
  })

  for (const planned of record.consequenceEvents) {
    const nextEvent: Sf2TurnResolutionConsequence = { ...planned }

    if (planned.kind === 'roll_failure_pressure' && planned.pressureDelta) {
      for (const threadId of planned.targetThreadIds) {
        addLocalEscalation(input.stateAfter.chapter.setup, threadId, planned.pressureDelta)
      }
      nextEvent.stateMutationObserved = true
      nextEvent.note = `Failed ${planned.skill ?? 'roll'} deterministically raised pressure on ${planned.targetThreadIds.join(', ')}.`
    } else {
      nextEvent.stateMutationObserved = mutationObservedBeforeResolution
      if (!mutationObservedBeforeResolution) {
        driftFindings.push({
          type: 'state_drift',
          severity: planned.kind === 'roll_success_requires_state' ? 'medium' : 'low',
          evidenceQuote: '',
          stateReference: planned.targetThreadIds[0] ?? planned.targetEntityIds[0] ?? 'turn_resolution',
          suggestedNote: planned.kind === 'roll_success_requires_state'
            ? 'The successful roll needs a durable state consequence.'
            : 'The targeted action needs durable follow-through if still relevant.',
        })
      }
    }

    events.push(nextEvent)
  }

  record.consequenceEvents = events
  record.driftFindings = driftFindings
  return { record, events, driftFindings }
}

function plannedConsequences(input: {
  actionType: Sf2ResolvedActionType
  targetEntityIds: Sf2EntityId[]
  targetThreadIds: Sf2EntityId[]
  rollRecords: Sf2RollRecord[]
}): Sf2TurnResolutionConsequence[] {
  const events: Sf2TurnResolutionConsequence[] = []
  const hasTargets = input.targetThreadIds.length > 0 || input.targetEntityIds.length > 0

  for (const [index, roll] of input.rollRecords.entries()) {
    if (!hasTargets) continue
    if (roll.outcome === 'failure' || roll.outcome === 'critical_failure') {
      if (input.targetThreadIds.length === 0) continue
      events.push({
        id: `turn_resolution_${index}_failure_pressure`,
        kind: 'roll_failure_pressure',
        rollOutcome: roll.outcome,
        skill: roll.skill,
        targetEntityIds: input.targetEntityIds,
        targetThreadIds: input.targetThreadIds,
        pressureDelta: roll.outcome === 'critical_failure' ? 3 : 2,
        stateMutationObserved: false,
        note: 'Failed roll has not yet applied deterministic pressure.',
      })
    } else if (roll.outcome === 'success' || roll.outcome === 'critical_success') {
      events.push({
        id: `turn_resolution_${index}_success_requires_state`,
        kind: 'roll_success_requires_state',
        rollOutcome: roll.outcome,
        skill: roll.skill,
        targetEntityIds: input.targetEntityIds,
        targetThreadIds: input.targetThreadIds,
        stateMutationObserved: false,
        note: 'Successful roll should leave a durable state trace.',
      })
    }
  }

  if (
    input.rollRecords.length === 0 &&
    MATERIAL_ACTION_TYPES.has(input.actionType) &&
    hasTargets
  ) {
    events.push({
      id: 'turn_resolution_targeted_action_requires_state',
      kind: 'targeted_action_requires_state',
      targetEntityIds: input.targetEntityIds,
      targetThreadIds: input.targetThreadIds,
      stateMutationObserved: false,
      note: 'Material targeted action should leave a durable state trace.',
    })
  }

  return events
}

function resolveTargetThreadIds(state: Sf2State, entityIds: Sf2EntityId[]): Sf2EntityId[] {
  const referenced = new Set(entityIds)
  const threads = new Set<Sf2EntityId>()
  const activeThreadIds = new Set(state.chapter.setup.activeThreadIds)

  for (const entityId of referenced) {
    for (const threadId of state.campaign.npcs[entityId]?.ownedThreadIds ?? []) {
      if (activeThreadIds.has(threadId)) threads.add(threadId)
    }
    for (const threadId of state.campaign.factions[entityId]?.ownedThreadIds ?? []) {
      if (activeThreadIds.has(threadId)) threads.add(threadId)
    }
  }

  for (const threadId of state.chapter.setup.activeThreadIds) {
    const thread = state.campaign.threads[threadId]
    if (!thread) continue
    if (referenced.has(thread.owner.id)) {
      threads.add(threadId)
      continue
    }
    if (thread.stakeholders.some((stakeholder) => referenced.has(stakeholder.id))) {
      threads.add(threadId)
    }
  }
  return [...threads]
}

function hasDurableTargetMutation(input: {
  stateBefore: Sf2State
  stateAfter: Sf2State
  targetEntityIds: Sf2EntityId[]
  targetThreadIds: Sf2EntityId[]
  includePressure: boolean
}): boolean {
  for (const threadId of input.targetThreadIds) {
    const beforeThread = input.stateBefore.campaign.threads[threadId]
    const afterThread = input.stateAfter.campaign.threads[threadId]
    if (stableJson(beforeThread) !== stableJson(afterThread)) return true

    if (input.includePressure) {
      const beforePressure = input.stateBefore.chapter.setup.threadPressure?.[threadId]
      const afterPressure = input.stateAfter.chapter.setup.threadPressure?.[threadId]
      if (stableJson(beforePressure) !== stableJson(afterPressure)) return true
    }
  }

  for (const entityId of input.targetEntityIds) {
    if (stableJson(entityById(input.stateBefore, entityId)) !== stableJson(entityById(input.stateAfter, entityId))) {
      return true
    }
  }

  return anchoredCollectionChanged(input.stateBefore.campaign.decisions, input.stateAfter.campaign.decisions, input.targetThreadIds) ||
    anchoredCollectionChanged(input.stateBefore.campaign.promises, input.stateAfter.campaign.promises, input.targetThreadIds) ||
    anchoredCollectionChanged(input.stateBefore.campaign.clues, input.stateAfter.campaign.clues, input.targetThreadIds)
}

function entityById(state: Sf2State, entityId: Sf2EntityId): unknown {
  return state.campaign.npcs[entityId] ??
    state.campaign.factions[entityId] ??
    state.campaign.locations[entityId] ??
    state.campaign.documents[entityId] ??
    state.campaign.threads[entityId] ??
    null
}

function anchoredCollectionChanged(
  before: Record<Sf2EntityId, { anchoredTo?: Sf2EntityId[] }>,
  after: Record<Sf2EntityId, { anchoredTo?: Sf2EntityId[] }>,
  targetThreadIds: Sf2EntityId[]
): boolean {
  const targetSet = new Set(targetThreadIds)
  const beforeRelevant = Object.values(before).filter((entry) => overlaps(entry.anchoredTo, targetSet))
  const afterRelevant = Object.values(after).filter((entry) => overlaps(entry.anchoredTo, targetSet))
  return stableJson(beforeRelevant) !== stableJson(afterRelevant)
}

function overlaps(ids: Sf2EntityId[] | undefined, targets: Set<Sf2EntityId>): boolean {
  return Boolean(ids?.some((id) => targets.has(id)))
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}
