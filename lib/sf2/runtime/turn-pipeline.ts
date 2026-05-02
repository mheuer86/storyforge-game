import { computeChapterCloseReadiness } from '../chapter-close'
import { recordObservation } from '../firewall/actor'
import { recordTurnTelemetry } from '../instrumentation/working-set-telemetry'
import {
  applyMechanicalEffectLocally,
  makeInvariantEvent,
  offstageRosterSignature,
  type Sf2ReplayInvariantEvent,
} from '../replay/mechanics'
import { evaluateCurrentPrimaryFace, type FaceShift } from './antagonist-face'
import { pruneGraph } from './prune-graph'
import type {
  Sf2Actor,
  Sf2ArchivistPatch,
  Sf2CoherenceFinding,
  Sf2CoherenceFindingType,
  Sf2ObservedWrite,
  Sf2NarratorAnnotation,
  Sf2State,
  Sf2WriteKind,
  Sf2WorkingSet,
} from '../types'
import type { ApplyPatchResult } from '../validation/apply-patch'
import { formatDeferredWrites } from '../validation/format-deferred'

export type Sf2TurnPipelineEvent =
  | Sf2ReplayInvariantEvent
  | { kind: 'display_sentinel'; at: number; data: unknown }

export interface Sf2TurnArchivistReplay {
  patch: unknown
  outcomes: unknown
  deferredWrites: unknown
  drift: unknown
  summary: unknown
  coherenceFindings: unknown
}

export interface Sf2TurnReplayFrame {
  turnIndex: number
  chapter: number
  playerInput: string
  isInitial: boolean
  stateBefore: Sf2State
  narrator: {
    prose: string
    annotation: Record<string, unknown> | null
    bundleBuilt: Sf2State['world']['sceneBundleCache'] | null
  }
  archivist: Sf2TurnArchivistReplay | null
  mechanicalEffects: Array<Record<string, unknown>>
  invariantEvents: Sf2TurnPipelineEvent[]
  stateAfter: Sf2State
}

export interface Sf2TurnArchivistAdapterInput {
  stateWithTurnLogged: Sf2State
  narratorProse: string
  narratorAnnotation: Record<string, unknown> | null
  nextTurnIndex: number
}

export interface Sf2TurnArchivistAdapterResult {
  nextState: Sf2State
  replay: Sf2TurnArchivistReplay | null
  invariantEvents?: Sf2TurnPipelineEvent[]
}

export interface CommitSf2TurnInput {
  stateBefore: Sf2State
  turnIndex: number
  playerInput: string
  isInitial: boolean
  narrator: {
    prose: string
    annotation: Record<string, unknown> | null
    mechanicalEffects?: Array<Record<string, unknown>>
    bundleBuilt?: Sf2State['world']['sceneBundleCache'] | null
    rollRecords?: Sf2State['history']['rollLog']
    sentinelEvents?: Sf2TurnPipelineEvent[]
    workingSet?: Sf2WorkingSet | null
  }
  applyArchivist: (
    input: Sf2TurnArchivistAdapterInput
  ) => Promise<Sf2TurnArchivistAdapterResult> | Sf2TurnArchivistAdapterResult
  now?: () => string
}

export interface CommitSf2TurnResult {
  nextTurnIndex: number
  stateWithTurnLogged: Sf2State
  stateAfter: Sf2State
  replayFrame: Sf2TurnReplayFrame
  invariantEvents: Sf2TurnPipelineEvent[]
  mechanicalEffects: Array<Record<string, unknown>>
  archivistReplay: Sf2TurnArchivistReplay | null
}

export interface FinalizeArchivistTurnInput {
  stateBeforeArchivist: Sf2State
  narratorProse: string
  patch: Sf2ArchivistPatch
  applyResult: ApplyPatchResult
  telemetryLimit?: number
}

export interface FinalizeArchivistTurnResult {
  nextState: Sf2State
  invariantEvents: Sf2TurnPipelineEvent[]
  faceShift: FaceShift | null
  ladderFired: Sf2State['chapter']['setup']['pressureLadder']
  pruneSummary: {
    demotedDecisions: number
    demotedPromises: number
    consumedClues: number
    clearedFloatingClues: number
  }
  coherenceFindings: Sf2CoherenceFinding[]
  workingSetTelemetry?: NonNullable<Sf2State['derived']['workingSetTelemetry']>[number]
}

export async function commitSf2Turn(input: CommitSf2TurnInput): Promise<CommitSf2TurnResult> {
  const now = input.now ?? (() => new Date().toISOString())
  const nextTurnIndex = input.turnIndex + 1
  const preNarratorOffstageRoster = offstageRosterSignature(input.stateBefore)
  const loggedTurn = logNarratedTurn(input, now())
  const stateWithTurnLogged = loggedTurn.state

  const archivist = await input.applyArchivist({
    stateWithTurnLogged,
    narratorProse: input.narrator.prose,
    narratorAnnotation: input.narrator.annotation,
    nextTurnIndex,
  })

  const {
    stateAfter,
    invariantEvents,
    mechanicalEffects,
  } = applyPostArchivistTurnEffects({
    stateAfterArchivist: archivist.nextState,
    annotation: input.narrator.annotation,
    mechanicalEffectsOverride: input.narrator.mechanicalEffects,
    bundleBuilt: input.narrator.bundleBuilt ?? null,
    preNarratorOffstageRoster,
    extraInvariantEvents: [
      ...loggedTurn.invariantEvents,
      ...(input.narrator.sentinelEvents ?? []),
      ...(archivist.invariantEvents ?? []),
    ],
    now,
  })

  const replayFrame: Sf2TurnReplayFrame = {
    turnIndex: input.turnIndex,
    chapter: input.stateBefore.meta.currentChapter,
    playerInput: input.isInitial ? '' : input.playerInput,
    isInitial: input.isInitial,
    stateBefore: structuredClone(input.stateBefore),
    narrator: {
      prose: input.narrator.prose,
      annotation: input.narrator.annotation,
      bundleBuilt: input.narrator.bundleBuilt ?? null,
    },
    archivist: archivist.replay,
    mechanicalEffects,
    invariantEvents,
    stateAfter: structuredClone(stateAfter),
  }

  return {
    nextTurnIndex,
    stateWithTurnLogged,
    stateAfter,
    replayFrame,
    invariantEvents,
    mechanicalEffects,
    archivistReplay: archivist.replay,
  }
}

export function finalizeArchivistTurn(input: FinalizeArchivistTurnInput): FinalizeArchivistTurnResult {
  const nextState = input.applyResult.nextState
  const invariantEvents: Sf2TurnPipelineEvent[] = []
  const observedTurnIndex = Math.max(0, input.patch.turnIndex - 1)

  for (const create of input.patch.creates) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'archivist',
      writeKind: 'create_entity',
      turnIndex: observedTurnIndex,
      entityId: stringValue(create.payload.id),
      payload: create.payload,
    }))
  }

  for (const update of input.patch.updates) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'archivist',
      writeKind: 'update_entity',
      turnIndex: observedTurnIndex,
      entityId: update.entityId,
      payload: {
        entityKind: update.entityKind,
        changes: update.changes,
        confidence: update.confidence,
      },
    }))
  }

  for (const transition of input.patch.transitions) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'archivist',
      writeKind: 'entity_transition',
      turnIndex: observedTurnIndex,
      entityId: transition.entityId,
      payload: {
        entityKind: transition.entityKind,
        toStatus: transition.toStatus,
        confidence: transition.confidence,
      },
    }))
  }

  for (const attachment of input.patch.attachments) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'archivist',
      writeKind: 'anchor_attachment',
      turnIndex: observedTurnIndex,
      entityId: attachment.entityId,
      payload: {
        kind: attachment.kind,
        threadIds: attachment.threadIds,
        arcId: attachment.arcId,
        confidence: attachment.confidence,
      },
    }))
  }

  invariantEvents.push(observeActorFirewallWrite(nextState, {
    actor: 'archivist',
    writeKind: 'pacing_classification',
    turnIndex: observedTurnIndex,
    payload: input.patch.pacingClassification as unknown as Record<string, unknown>,
  }))

  for (const finding of input.patch.coherenceFindings ?? []) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'archivist',
      writeKind: 'drift_flag',
      turnIndex: observedTurnIndex,
      entityId: finding.stateReference,
      payload: finding as unknown as Record<string, unknown>,
    }))
  }

  const turnRecord = nextState.history.turns.find((t) => t.index === input.patch.turnIndex - 1)
    ?? nextState.history.turns.at(-1)
  if (turnRecord) {
    turnRecord.archivistPatchApplied = input.patch
    turnRecord.pacingClassification = input.patch.pacingClassification
  }

  const faceEval = evaluateCurrentPrimaryFace(nextState.chapter, nextState)
  if (faceEval.shift) {
    nextState.chapter.setup.antagonistField.currentPrimaryFace = faceEval.face
    for (const f of nextState.chapter.scaffolding.antagonistFaces) {
      f.active = f.id === faceEval.face.id
    }
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'code',
      writeKind: 'face_shift',
      turnIndex: observedTurnIndex,
      entityId: faceEval.face.id,
      payload: {
        fromFaceId: faceEval.shift.fromId,
        toFaceId: faceEval.shift.toId,
        reason: faceEval.shift.reason,
      },
    }))
  }

  const firedThisTurn = (input.patch.ladderFires ?? [])
    .map((id) => nextState.chapter.setup.pressureLadder.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
  for (const fired of firedThisTurn) {
    invariantEvents.push(observeActorFirewallWrite(nextState, {
      actor: 'code',
      writeKind: 'ladder_fire',
      turnIndex: observedTurnIndex,
      entityId: fired.id,
      payload: {
        pressure: fired.pressure,
        triggerCondition: fired.triggerCondition,
      },
    }))
  }

  const pruneResult = pruneGraph(nextState)
  const prunedState = pruneResult.nextState
  let workingSetTelemetry: FinalizeArchivistTurnResult['workingSetTelemetry']

  if (input.stateBeforeArchivist.derived?.workingSet) {
    workingSetTelemetry = recordTurnTelemetry(
      input.stateBeforeArchivist,
      input.stateBeforeArchivist.derived.workingSet,
      input.narratorProse,
      input.patch,
      input.applyResult.outcomes
    )
    prunedState.derived.workingSetTelemetry = [
      ...(prunedState.derived.workingSetTelemetry ?? []),
      workingSetTelemetry,
    ].slice(-(input.telemetryLimit ?? 10))
    invariantEvents.push(observeActorFirewallWrite(prunedState, {
      actor: 'code',
      writeKind: 'working_set_compute',
      turnIndex: observedTurnIndex,
      payload: {
        fullCount: workingSetTelemetry.fullCount,
        stubCount: workingSetTelemetry.stubCount,
        excludedCount: workingSetTelemetry.excludedCount,
      },
    }))
  }

  const recoveryNotes = formatDeferredWrites(input.applyResult.deferredWrites)
  prunedState.campaign.pendingRecoveryNotes =
    recoveryNotes.length > 0 ? recoveryNotes : undefined

  const anchorMissFindings: Sf2CoherenceFinding[] = input.applyResult.drift
    .filter((d) => d.kind === 'anchor_reference_missing')
    .map((d) => ({
      type: 'anchor_miss' as Sf2CoherenceFindingType,
      severity: 'low' as const,
      evidenceQuote: '',
      stateReference: d.entityId ?? '',
      suggestedNote: d.detail.slice(0, 200),
    }))

  const allFindings = [...(input.patch.coherenceFindings ?? []), ...anchorMissFindings]
  const coherenceNotes = input.patch.coherenceFindings
    ? formatCoherenceNotes(input.patch.coherenceFindings)
    : []
  prunedState.campaign.pendingCoherenceNotes =
    coherenceNotes.length > 0 ? coherenceNotes : undefined

  return {
    nextState: prunedState,
    invariantEvents,
    faceShift: faceEval.shift,
    ladderFired: firedThisTurn,
    pruneSummary: {
      demotedDecisions: pruneResult.demotedDecisions,
      demotedPromises: pruneResult.demotedPromises,
      consumedClues: pruneResult.consumedClues,
      clearedFloatingClues: pruneResult.clearedFloatingClues,
    },
    coherenceFindings: allFindings,
    workingSetTelemetry,
  }
}

export function extractMechanicalEffects(
  annotation: Record<string, unknown> | null
): Array<Record<string, unknown>> {
  if (!annotation) return []
  const snake = annotation.mechanical_effects
  if (Array.isArray(snake)) return snake as Array<Record<string, unknown>>
  const camel = annotation.mechanicalEffects
  if (Array.isArray(camel)) return camel as Array<Record<string, unknown>>
  return []
}

export function normalizeNarratorAnnotationForHistory(
  input: Record<string, unknown>
): Sf2NarratorAnnotation {
  const hinted = (input.hinted_entities ?? input.hintedEntities ?? {}) as Record<string, unknown>
  const authorial = (input.authorial_moves ?? input.authorialMoves ?? {}) as Record<string, unknown>
  const suggested = input.suggested_actions ?? input.suggestedActions
  return {
    // Mechanical effects are executed by code and preserved in
    // narratorAnnotationRaw/replay frames. The compact history annotation keeps
    // only retrieval hints so future roles do not treat mechanics as memory.
    mechanicalEffects: [],
    hintedEntities: {
      npcsMentioned: arrayOfStrings(hinted.npcs_mentioned ?? hinted.npcsMentioned),
      threadsTouched: arrayOfStrings(hinted.threads_touched ?? hinted.threadsTouched),
      decisionsImplied: arrayOfStrings(hinted.decisions_implied ?? hinted.decisionsImplied),
      promisesImplied: arrayOfStrings(hinted.promises_implied ?? hinted.promisesImplied),
      cluesDropped: arrayOfStrings(hinted.clues_dropped ?? hinted.cluesDropped),
    },
    authorialMoves: authorial as Sf2NarratorAnnotation['authorialMoves'],
    suggestedActions: arrayOfStrings(suggested),
  }
}

function logNarratedTurn(
  input: CommitSf2TurnInput,
  timestamp: string
): { state: Sf2State; invariantEvents: Sf2TurnPipelineEvent[] } {
  const next: Sf2State = structuredClone(input.stateBefore)
  const invariantEvents: Sf2TurnPipelineEvent[] = []
  next.history.turns.push({
    index: input.turnIndex,
    chapter: next.meta.currentChapter,
    playerInput: input.isInitial ? '' : input.playerInput,
    narratorProse: input.narrator.prose,
    narratorAnnotation: input.narrator.annotation
      ? normalizeNarratorAnnotationForHistory(input.narrator.annotation)
      : undefined,
    narratorAnnotationRaw: input.narrator.annotation ?? undefined,
    timestamp,
  })
  const inspirationSpentCount = (input.narrator.rollRecords ?? [])
    .filter((r) => r.inspirationSpent)
    .length
  if (inspirationSpentCount > 0) {
    next.player.inspiration = Math.max(0, next.player.inspiration - inspirationSpentCount)
  }
  next.history.rollLog.push(...(input.narrator.rollRecords ?? []))
  next.history.recentTurns = next.history.turns.slice(-6)

  next.campaign.pendingRecoveryNotes = undefined
  next.campaign.pendingCoherenceNotes = undefined

  if (input.narrator.annotation) {
    invariantEvents.push(observeActorFirewallWrite(next, {
      actor: 'narrator',
      writeKind: 'narrator_annotation',
      turnIndex: input.turnIndex,
      payload: input.narrator.annotation,
      timestamp,
    }))

    const pendingCheck = input.narrator.annotation.pending_check
      ?? input.narrator.annotation.pendingCheck
    if (pendingCheck) {
      invariantEvents.push(observeActorFirewallWrite(next, {
        actor: 'narrator',
        writeKind: 'pending_check',
        turnIndex: input.turnIndex,
        payload: recordPayload(pendingCheck),
        timestamp,
      }))
    }

    const suggestedActions = input.narrator.annotation.suggested_actions
      ?? input.narrator.annotation.suggestedActions
    if (Array.isArray(suggestedActions) && suggestedActions.length > 0) {
      invariantEvents.push(observeActorFirewallWrite(next, {
        actor: 'narrator',
        writeKind: 'suggested_actions',
        turnIndex: input.turnIndex,
        payload: { actions: suggestedActions },
        timestamp,
      }))
    }
  }

  if (input.narrator.bundleBuilt) {
    next.world.sceneBundleCache = input.narrator.bundleBuilt
  }
  if (input.narrator.workingSet) {
    next.derived.workingSet = input.narrator.workingSet
    invariantEvents.push(observeActorFirewallWrite(next, {
      actor: 'code',
      writeKind: 'working_set_compute',
      turnIndex: input.turnIndex,
      payload: {
        fullCount: input.narrator.workingSet.fullEntityIds.length,
        stubCount: input.narrator.workingSet.stubEntityIds.length,
        excludedCount: input.narrator.workingSet.excludedEntityIds.length,
      },
      timestamp,
    }))
  }

  next.meta.updatedAt = timestamp
  return { state: next, invariantEvents }
}

function applyPostArchivistTurnEffects(input: {
  stateAfterArchivist: Sf2State
  annotation: Record<string, unknown> | null
  mechanicalEffectsOverride?: Array<Record<string, unknown>>
  bundleBuilt: Sf2State['world']['sceneBundleCache'] | null
  preNarratorOffstageRoster: string
  extraInvariantEvents: Sf2TurnPipelineEvent[]
  now: () => string
}): {
  stateAfter: Sf2State
  invariantEvents: Sf2TurnPipelineEvent[]
  mechanicalEffects: Array<Record<string, unknown>>
} {
  const stateAfter: Sf2State = structuredClone(input.stateAfterArchivist)
  const mechanicalEffects = input.mechanicalEffectsOverride ?? extractMechanicalEffects(input.annotation)
  const invariantEvents: Sf2TurnPipelineEvent[] = []
  const turnIndex = stateAfter.history.turns.at(-1)?.index ?? Math.max(0, stateAfter.history.turns.length - 1)
  const timestamp = input.now()

  for (const effect of mechanicalEffects) {
    const writeKind = writeKindFromRaw(effect.kind)
    if (writeKind) {
      invariantEvents.push(observeActorFirewallWrite(stateAfter, {
        actor: 'narrator',
        writeKind,
        turnIndex,
        payload: effect,
        timestamp,
      }))
    }
    applyMechanicalEffectLocally(stateAfter, effect, invariantEvents)
  }

  if (input.bundleBuilt) {
    const bundleSceneStale = stateAfter.world.sceneBundleCache?.sceneId !== stateAfter.world.sceneSnapshot.sceneId
    const offstageRosterStale = input.preNarratorOffstageRoster !== offstageRosterSignature(stateAfter)
    if (bundleSceneStale || offstageRosterStale) {
      stateAfter.world.sceneBundleCache = undefined
      invariantEvents.push(makeInvariantEvent('scene_bundle_cache_cleared_after_mechanics', {
        bundleSceneStale,
        offstageRosterStale,
      }))
    }
  }

  stateAfter.meta.updatedAt = timestamp

  if (input.extraInvariantEvents.length > 0) {
    invariantEvents.push(...input.extraInvariantEvents)
  }

  const closeRecovery = computeChapterCloseReadiness(stateAfter, false)
  if (closeRecovery.promotedSpineThreadId) {
    const promoted = stateAfter.campaign.threads[closeRecovery.promotedSpineThreadId]
    stateAfter.chapter.setup.spineThreadId = closeRecovery.promotedSpineThreadId
    if (promoted) {
      promoted.spineForChapter = stateAfter.meta.currentChapter
      promoted.loadBearing = true
      promoted.chapterDriverKind = promoted.successorToThreadId
        ? 'successor'
        : promoted.chapterDriverKind ?? 'new_pressure'
    }
    if (!stateAfter.chapter.setup.activeThreadIds.includes(closeRecovery.promotedSpineThreadId)) {
      stateAfter.chapter.setup.activeThreadIds.push(closeRecovery.promotedSpineThreadId)
    }
    if (!stateAfter.chapter.setup.loadBearingThreadIds.includes(closeRecovery.promotedSpineThreadId)) {
      stateAfter.chapter.setup.loadBearingThreadIds.push(closeRecovery.promotedSpineThreadId)
    }
    const promotedPressureRole = promoted?.successorToThreadId ? 'load_bearing' : 'spine'
    if (!stateAfter.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId]) {
      const openingFloor = Math.max(6, Math.min(10, promoted?.tension ?? 6))
      stateAfter.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId] = {
        threadId: closeRecovery.promotedSpineThreadId,
        role: promotedPressureRole,
        openingFloor,
        localEscalation: 0,
        maxThisChapter: openingFloor,
        cooledAtOpen: false,
      }
    } else {
      stateAfter.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId].role = promotedPressureRole
    }
    invariantEvents.push(makeInvariantEvent('early_spine_resolved_promoted_successor', {
      promotedSpineThreadId: closeRecovery.promotedSpineThreadId,
      chapterTurnCount: closeRecovery.chapterTurnCount,
    }))
  }
  if (closeRecovery.successorRequired) {
    const note =
      'The chapter spine resolved before turn 18 and no unresolved load-bearing thread could replace it. This turn must actively establish successor pressure before the chapter can close: surface an existing unresolved thread in visible prose, or manufacture a concrete new complication that follows from the resolved spine. Put the successor question in the prose with an owner, stakes, and an immediate next pressure-bearing choice so the Archivist can create/anchor the successor thread. Do not signal chapter close yet.'
    stateAfter.campaign.pendingRecoveryNotes = Array.from(new Set([
      ...(stateAfter.campaign.pendingRecoveryNotes ?? []),
      note,
    ]))
    invariantEvents.push(makeInvariantEvent('early_spine_resolved_successor_required', {
      chapterTurnCount: closeRecovery.chapterTurnCount,
      spineThreadId: stateAfter.chapter.setup.spineThreadId,
    }))
  }

  return { stateAfter, invariantEvents, mechanicalEffects }
}

function formatCoherenceNotes(findings: Sf2CoherenceFinding[]): string[] {
  return findings.map((f) => `[${f.severity}] ${f.type} (${f.stateReference}): ${f.suggestedNote}`)
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

export function observeActorFirewallWrite(
  state: Sf2State,
  input: {
    actor: Sf2Actor
    writeKind: Sf2WriteKind
    turnIndex: number
    entityId?: string
    payload?: Record<string, unknown>
    timestamp?: string
  }
): Sf2TurnPipelineEvent {
  const write: Sf2ObservedWrite = {
    actor: input.actor,
    kind: input.writeKind,
    turnIndex: input.turnIndex,
    chapter: state.meta.currentChapter,
    entityId: input.entityId,
    payload: input.payload,
    timestamp: input.timestamp ?? state.meta.updatedAt,
  }
  const decision = recordObservation(write)
  const permitted = decision.reason === undefined
  return makeInvariantEvent('actor_firewall_observation', {
    mode: decision.mode,
    actor: input.actor,
    writeKind: input.writeKind,
    turnIndex: input.turnIndex,
    chapter: state.meta.currentChapter,
    entityId: input.entityId,
    permitted,
    allowed: decision.allowed,
    reason: decision.reason,
    detail: decision.reason
      ? `${input.actor}:${input.writeKind} observed outside ownership contract: ${decision.reason}`
      : `${input.actor}:${input.writeKind} observed within ownership contract`,
  })
}

const OBSERVABLE_WRITE_KINDS = new Set<Sf2WriteKind>([
  'hp_delta',
  'credits_delta',
  'inventory_use',
  'combat',
  'set_location',
  'scene_end',
  'set_scene_snapshot',
  'pending_check',
  'suggested_actions',
  'narrator_annotation',
  'create_entity',
  'update_entity',
  'entity_transition',
  'anchor_attachment',
  'pacing_classification',
  'drift_flag',
  'chapter_setup',
  'chapter_meaning',
  'face_shift',
  'ladder_fire',
  'working_set_compute',
  'cohesion_recompute',
])

function writeKindFromRaw(value: unknown): Sf2WriteKind | null {
  if (typeof value !== 'string') return null
  return OBSERVABLE_WRITE_KINDS.has(value as Sf2WriteKind)
    ? (value as Sf2WriteKind)
    : null
}

function recordPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : { value }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
