import { REHEAT } from './constants'
import { resolvePlayerAction } from '../action-resolver/resolve'
import type {
  Sf2ChapterSetupRuntimeState,
  Sf2ChapterThreadPressure,
  Sf2EntityId,
  Sf2State,
} from '../types'

export function reheatPlayerEngagement(
  setup: Sf2ChapterSetupRuntimeState,
  threadId: Sf2EntityId
): void {
  const pressure = setup.threadPressure?.[threadId]
  if (!pressure) return
  pressure.localEscalation = Math.max(
    pressure.localEscalation,
    REHEAT.PLAYER_ENGAGEMENT_FLOOR
  )
  finalizePressure(pressure)
}

export function reheatNpcAgendaAction(
  setup: Sf2ChapterSetupRuntimeState,
  threadIds: Sf2EntityId[],
  severity: 'standard' | 'major' = 'standard'
): void {
  const amount = severity === 'major' ? REHEAT.NPC_AGENDA_MAJOR : REHEAT.NPC_AGENDA_STANDARD
  for (const threadId of threadIds) {
    addLocalEscalation(setup, threadId, amount)
  }
}

export function reheatLadderFire(
  setup: Sf2ChapterSetupRuntimeState,
  threadIds: Sf2EntityId[],
  severity: 'standard' | 'hard' = 'standard'
): void {
  const amount = severity === 'hard' ? REHEAT.LADDER_FIRE_HARD : REHEAT.LADDER_FIRE_STANDARD
  // Dedupe in case the same thread appears multiple times (e.g. spine listed
  // twice, or fallback overlaps with explicit threadIds).
  for (const threadId of new Set(threadIds)) {
    if (!threadId) continue
    addLocalEscalation(setup, threadId, amount)
  }
}

export function addLocalEscalation(
  setup: Sf2ChapterSetupRuntimeState,
  threadId: Sf2EntityId,
  amount: number
): void {
  const pressure = setup.threadPressure?.[threadId]
  if (!pressure) return
  pressure.localEscalation += amount
  finalizePressure(pressure)
}

// Reheats threads referenced by the player's input — owner/stakeholder
// expansion off the resolved entity targets and subjects. Decoupled from the
// archivist's tension-delta judgment so that *engagement without mechanical
// advance* still raises the floor (D7 idempotent floor).
export function applyPlayerEngagementReheat(
  state: Sf2State,
  playerInput: string
): Sf2EntityId[] {
  const trimmed = playerInput.trim()
  if (!trimmed) return []

  const action = resolvePlayerAction(state, trimmed)
  const referencedEntities = new Set<Sf2EntityId>([
    ...action.targetEntityIds,
    ...action.subjectEntityIds,
  ])

  const reheated = new Set<Sf2EntityId>()
  for (const entityId of referencedEntities) {
    for (const threadId of pressureThreadIdsForEntity(state, entityId)) {
      reheatPlayerEngagement(state.chapter.setup, threadId)
      reheated.add(threadId)
    }
  }
  return [...reheated]
}

function pressureThreadIdsForEntity(state: Sf2State, entityId: Sf2EntityId): Sf2EntityId[] {
  return state.chapter.setup.activeThreadIds.filter((threadId) => {
    const thread = state.campaign.threads[threadId]
    if (!thread) return false
    if (thread.owner.id === entityId) return true
    return thread.stakeholders.some((s) => s.id === entityId)
  })
}

function finalizePressure(pressure: Sf2ChapterThreadPressure): void {
  const maxLocal = Math.max(0, 10 - pressure.openingFloor)
  pressure.localEscalation = clamp(pressure.localEscalation, 0, maxLocal)
  const effective = clamp(pressure.openingFloor + pressure.localEscalation, 0, 10)
  pressure.maxThisChapter = Math.max(pressure.maxThisChapter, effective)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
