import type { Sf2EntityId, Sf2Location, Sf2State } from '../types'
import {
  findMatchingLocation,
  mergeLocationIntoExisting,
  parseFlattenedLocationAlias,
  replaceLocationReferences,
} from '../locations'
import {
  formatViolations,
  resolveSceneSnapshotReferences,
} from '../reference-policy'

type InvariantSink = Array<{ kind: string; at: number; data: unknown }>

export interface Sf2SceneSnapshotReductionSource {
  sourceActor?: 'narrator' | 'system' | 'replay'
  sourceKind?: string
  turnIndex?: number
}

export interface Sf2SceneSnapshotReductionSummary {
  kind: 'set_scene_snapshot' | 'set_location'
  priorSceneId: Sf2EntityId
  nextSceneId: Sf2EntityId
  sceneChanged: boolean
  locationId: Sf2EntityId
  presentNpcCount: number
  bundleCacheCleared: boolean
}

export interface Sf2SceneSnapshotReductionResult {
  summary: Sf2SceneSnapshotReductionSummary | null
  invariantEvents: InvariantSink
}

interface SceneSnapshotReducerOptions {
  invariantEvents?: InvariantSink
  source?: Sf2SceneSnapshotReductionSource
}

interface SceneSnapshotCompatibilityPayload {
  snapshot: Record<string, unknown>
  raw: Record<string, unknown>
}

interface SceneTransitionIntent {
  priorSceneId: Sf2EntityId
  priorLocationId: Sf2EntityId
  requestedLocationId: Sf2EntityId
  nextLocationId: Sf2EntityId
  nextSceneId: Sf2EntityId
  locationChanged: boolean
  sceneChanged: boolean
}

interface SceneCastIntent {
  rawPresentNpcIds: unknown[] | undefined
  rawInterlocutorIds: unknown[] | undefined
  resolvedPresentNpcIds: Sf2EntityId[]
  resolvedInterlocutorIds: Sf2EntityId[] | undefined
}

interface LocationProjectionInput {
  state: Sf2State
  snap: Record<string, unknown>
  raw: Record<string, unknown>
  intent: SceneTransitionIntent
}

export function applySceneSnapshotMechanicalEffect(
  state: Sf2State,
  effect: Record<string, unknown>,
  options: SceneSnapshotReducerOptions = {}
): Sf2SceneSnapshotReductionResult {
  const emitter = createInvariantEmitter(options.invariantEvents)
  const payload = parseSceneSnapshotCompatibilityPayload(effect)
  if (!payload) {
    emitMechanicalNoOp(emitter, {
      kind: 'set_scene_snapshot',
      reason: 'set_scene_snapshot missing snapshot payload',
      source: options.source,
    })
    return { summary: null, invariantEvents: emitter.events }
  }

  const { snapshot, raw } = payload
  const priorCast = [...state.world.sceneSnapshot.presentNpcIds].sort().join(',')
  const priorOffstageRoster = offstageRosterSignature(state)
  const transition = deriveSceneTransitionIntent(state, snapshot, raw)
  const cast = reduceCastIntent(state, snapshot, raw, transition, emitter)
  const nextLocation = reduceLocationProjection({
    state,
    snap: snapshot,
    raw,
    intent: transition,
  })
  const timeLabel = String(snapshot.time_label ?? state.world.sceneSnapshot.timeLabel)
  const nextCast = [...cast.resolvedPresentNpcIds].sort().join(',')

  state.world.sceneSnapshot = {
    sceneId: transition.nextSceneId,
    location: nextLocation,
    presentNpcIds: cast.resolvedPresentNpcIds,
    currentInterlocutorIds: cast.resolvedInterlocutorIds,
    timeLabel,
    established: Array.isArray(snapshot.established)
      ? (snapshot.established as string[])
      : state.world.sceneSnapshot.established,
    firstTurnIndex: transition.sceneChanged
      ? state.history.turns.length
      : state.world.sceneSnapshot.firstTurnIndex,
  }
  syncRuntimeSceneProjection(state, transition.nextSceneId, nextLocation, timeLabel)

  const bundleCacheCleared =
    priorCast !== nextCast ||
    transition.priorSceneId !== transition.nextSceneId ||
    priorOffstageRoster !== offstageRosterSignature(state)
  if (bundleCacheCleared) {
    state.world.sceneBundleCache = undefined
  }

  return {
    summary: {
      kind: 'set_scene_snapshot',
      priorSceneId: transition.priorSceneId,
      nextSceneId: transition.nextSceneId,
      sceneChanged: transition.sceneChanged,
      locationId: nextLocation.id,
      presentNpcCount: cast.resolvedPresentNpcIds.length,
      bundleCacheCleared,
    },
    invariantEvents: emitter.events,
  }
}

export function applySetLocationMechanicalEffect(
  state: Sf2State,
  effect: Record<string, unknown>,
  options: SceneSnapshotReducerOptions = {}
): Sf2SceneSnapshotReductionResult {
  const emitter = createInvariantEmitter(options.invariantEvents)
  const priorSceneId = state.world.sceneSnapshot.sceneId
  const locId = String(effect.location_id ?? '')
  if (!locId) {
    emitMechanicalNoOp(emitter, {
      kind: 'set_location',
      reason: 'set_location missing location_id',
      source: options.source,
    })
    return { summary: null, invariantEvents: emitter.events }
  }

  const proposed = {
    id: locId,
    name: String(effect.name ?? locId.replace(/_/g, ' ')),
    description: String(effect.description ?? ''),
    atmosphericConditions: Array.isArray(effect.atmospheric_conditions)
      ? (effect.atmospheric_conditions as string[])
      : undefined,
    locked: typeof effect.locked === 'boolean' ? effect.locked : undefined,
    chapterCreated: state.meta.currentChapter,
  }
  const flattened = parseFlattenedLocationAlias(state, proposed)
  const matching = flattened?.location ?? findMatchingLocation(state, proposed)
  let loc = matching ?? state.campaign.locations[locId]
  if (!loc) {
    loc = proposed
    state.campaign.locations[locId] = loc
  } else {
    loc = mergeLocationIntoExisting(loc, proposed)
    state.campaign.locations[loc.id] = loc
    if (loc.id !== locId && state.campaign.locations[locId]) {
      loc = mergeLocationIntoExisting(loc, state.campaign.locations[locId])
      state.campaign.locations[loc.id] = loc
      delete state.campaign.locations[locId]
      replaceLocationReferences(state, locId, loc)
    }
  }

  state.world.currentLocation = loc
  state.world.currentPosition = flattened
    ? { locationId: loc.id, areaNodeId: flattened.areaNode.id }
    : { locationId: loc.id }
  state.world.sceneSnapshot = {
    ...state.world.sceneSnapshot,
    sceneId: loc.id,
    location: loc,
    presentNpcIds: [],
    established: loc.description ? [loc.description] : [],
    firstTurnIndex: state.history.turns.length,
  }
  state.meta.currentSceneId = loc.id
  state.world.sceneBundleCache = undefined

  return {
    summary: {
      kind: 'set_location',
      priorSceneId,
      nextSceneId: loc.id,
      sceneChanged: priorSceneId !== loc.id,
      locationId: loc.id,
      presentNpcCount: 0,
      bundleCacheCleared: true,
    },
    invariantEvents: emitter.events,
  }
}

function parseSceneSnapshotCompatibilityPayload(
  effect: Record<string, unknown>
): SceneSnapshotCompatibilityPayload | null {
  const snapshot = isRecord(effect.snapshot)
    ? effect.snapshot
    : hasTopLevelSnapshotFields(effect)
      ? effect
      : undefined
  return snapshot ? { snapshot, raw: effect } : null
}

function deriveSceneTransitionIntent(
  state: Sf2State,
  snap: Record<string, unknown>,
  raw: Record<string, unknown>
): SceneTransitionIntent {
  const priorSceneId = state.world.sceneSnapshot.sceneId
  const priorLocationId =
    state.world.currentLocation.id ||
    state.world.sceneSnapshot.location?.id ||
    priorSceneId
  const requestedLocationId = String(snap.location_id ?? raw.location_id ?? priorLocationId)
  const matchedLocation = findMatchingLocation(state, {
    id: requestedLocationId,
    name: snapshotString(snap, raw, 'name') ?? requestedLocationId.replace(/_/g, ' '),
    description: snapshotString(snap, raw, 'description') ?? '',
    atmosphericConditions: snapshotStringArray(snap, raw, 'atmospheric_conditions'),
  })
  const nextLocationId = matchedLocation?.id ?? requestedLocationId
  const explicitSceneId = typeof snap.scene_id === 'string'
    ? snap.scene_id
    : typeof raw.scene_id === 'string'
      ? raw.scene_id
      : undefined
  const locationChanged = nextLocationId !== priorLocationId
  const nextSceneId = explicitSceneId ?? (locationChanged ? nextLocationId : priorSceneId)

  return {
    priorSceneId,
    priorLocationId,
    requestedLocationId,
    nextLocationId,
    nextSceneId,
    locationChanged,
    sceneChanged: nextSceneId !== priorSceneId,
  }
}

function reduceCastIntent(
  state: Sf2State,
  snap: Record<string, unknown>,
  raw: Record<string, unknown>,
  intent: SceneTransitionIntent,
  emitter: InvariantEmitter
): SceneCastIntent {
  const rawPresentNpcIds = Array.isArray(snap.present_npc_ids)
    ? snap.present_npc_ids
    : Array.isArray(raw.present_npc_ids)
      ? raw.present_npc_ids
      : undefined
  const rawInterlocutorIds = Array.isArray(snap.current_interlocutor_ids)
    ? snap.current_interlocutor_ids
    : undefined
  const snapshotRefs = resolveSceneSnapshotReferences(
    state,
    {
      presentNpcIds: rawPresentNpcIds,
      currentInterlocutorIds: rawInterlocutorIds,
      mode: 'observe',
    }
  )
  const idCheck = snapshotRefs.idCheck
  if (!idCheck.ok) {
    emitInvariant(emitter, 'canonical_id_violation', {
      mode: 'observe',
      violations: idCheck.violations,
      detail: formatViolations(idCheck.violations),
      priorSceneId: intent.priorSceneId,
      nextSceneId: intent.nextSceneId,
    })
  }

  if (intent.sceneChanged && rawPresentNpcIds === undefined) {
    emitInvariant(emitter, 'scene_snapshot_missing_present_npc_ids', {
      priorSceneId: intent.priorSceneId,
      nextSceneId: intent.nextSceneId,
      action: 'cleared_cast_for_new_scene',
    })
    state.campaign.pendingCoherenceNotes = [
      ...(state.campaign.pendingCoherenceNotes ?? []),
      `[medium] cast_wipe (${intent.nextSceneId}): Prior scene cast was cleared because set_scene_snapshot omitted present_npc_ids. Re-establish who is visibly present before using dialogue or direct action.`,
    ].slice(-6)
  }

  const resolvedPresentNpcIds = rawPresentNpcIds !== undefined
    ? snapshotRefs.presentNpcIds ?? []
    : intent.sceneChanged
      ? []
      : state.world.sceneSnapshot.presentNpcIds

  for (const creation of snapshotRefs.placeholderCreations) {
    emitInvariant(emitter, 'snapshot_placeholder_npc_created', creation)
  }

  const resolvedInterlocutorIds =
    rawInterlocutorIds !== undefined
      ? snapshotRefs.currentInterlocutorIds?.filter((id) => resolvedPresentNpcIds.includes(id)) ?? []
      : undefined

  return {
    rawPresentNpcIds,
    rawInterlocutorIds,
    resolvedPresentNpcIds,
    resolvedInterlocutorIds,
  }
}

function reduceLocationProjection({
  state,
  snap,
  raw,
  intent,
}: LocationProjectionInput): Sf2Location {
  const nextLocked = typeof snap.locked === 'boolean'
    ? snap.locked
    : typeof raw.locked === 'boolean'
      ? raw.locked
      : undefined

  const proposedLocation = {
    id: intent.requestedLocationId,
    name: snapshotString(snap, raw, 'name') ?? intent.requestedLocationId.replace(/_/g, ' '),
    description: snapshotString(snap, raw, 'description') ??
      (intent.locationChanged && Array.isArray(snap.established)
        ? (snap.established as string[]).join(' · ')
        : undefined),
    atmosphericConditions: snapshotStringArray(snap, raw, 'atmospheric_conditions'),
    locked: nextLocked,
    chapterCreated: state.meta.currentChapter,
  }
  const hasExplicitLocationRefinement =
    snapshotString(snap, raw, 'name') !== undefined ||
    snapshotString(snap, raw, 'description') !== undefined ||
    snapshotStringArray(snap, raw, 'atmospheric_conditions') !== undefined ||
    nextLocked !== undefined
  const flattened = parseFlattenedLocationAlias(state, proposedLocation)
  const registered =
    flattened?.location ??
    state.campaign.locations[intent.nextLocationId] ??
    (state.world.currentLocation.id === intent.nextLocationId ? state.world.currentLocation : undefined) ??
    (state.world.sceneSnapshot.location.id === intent.nextLocationId ? state.world.sceneSnapshot.location : undefined)
  let nextLocation = registered ?? state.world.currentLocation

  if (intent.locationChanged || flattened || hasExplicitLocationRefinement) {
    if (registered) {
      nextLocation = mergeLocationIntoExisting(registered, flattened
        ? {
            aliases: [flattened.alias],
            areaNodes: [flattened.areaNode],
          }
        : proposedLocation)
    } else {
      nextLocation = {
        id: intent.nextLocationId,
        name: proposedLocation.name,
        description: proposedLocation.description ?? state.world.currentLocation.description,
        atmosphericConditions: proposedLocation.atmosphericConditions ??
          state.world.currentLocation.atmosphericConditions,
        locked: proposedLocation.locked,
        chapterCreated: proposedLocation.chapterCreated,
      }
    }
    state.campaign.locations[nextLocation.id] = nextLocation
    if (
      intent.requestedLocationId !== nextLocation.id &&
      state.campaign.locations[intent.requestedLocationId]
    ) {
      nextLocation = mergeLocationIntoExisting(
        nextLocation,
        state.campaign.locations[intent.requestedLocationId]
      )
      state.campaign.locations[nextLocation.id] = nextLocation
      delete state.campaign.locations[intent.requestedLocationId]
      replaceLocationReferences(state, intent.requestedLocationId, nextLocation)
    }
  }

  if (flattened) {
    state.world.currentPosition = {
      locationId: nextLocation.id,
      areaNodeId: flattened.areaNode.id,
    }
  } else if (intent.locationChanged || state.world.currentPosition?.locationId !== nextLocation.id) {
    state.world.currentPosition = { locationId: nextLocation.id }
  }

  state.campaign.locations[nextLocation.id] = nextLocation
  return nextLocation
}

function syncRuntimeSceneProjection(
  state: Sf2State,
  sceneId: Sf2EntityId,
  location: Sf2Location,
  timeLabel: string
): void {
  state.world.currentLocation = location
  state.world.currentTimeLabel = timeLabel
  state.meta.currentSceneId = sceneId
  state.meta.currentTimeLabel = timeLabel
}

function offstageRosterSignature(state: Sf2State): string {
  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  return Object.values(state.campaign.npcs)
    .filter((npc) => !present.has(npc.id))
    .filter((npc) => npc.status === 'alive' || npc.status === 'unknown')
    .map((npc) => [
      npc.id,
      npc.status,
      npc.affiliation,
      npc.role,
      npc.retrievalCue,
      state.chapter.setup.startingNpcIds.includes(npc.id) ? 'starting' : '',
    ].join(':'))
    .sort()
    .join('|')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasTopLevelSnapshotFields(value: Record<string, unknown>): boolean {
  return [
    'location_id',
    'scene_id',
    'present_npc_ids',
    'current_interlocutor_ids',
    'time_label',
    'established',
    'locked',
    'name',
    'description',
  ].some((key) => key in value)
}

function snapshotString(
  snap: Record<string, unknown>,
  raw: Record<string, unknown>,
  key: string
): string | undefined {
  const value = typeof snap[key] === 'string'
    ? snap[key]
    : typeof raw[key] === 'string'
      ? raw[key]
      : undefined
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function snapshotStringArray(
  snap: Record<string, unknown>,
  raw: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = Array.isArray(snap[key])
    ? snap[key]
    : Array.isArray(raw[key])
      ? raw[key]
      : undefined
  return value?.map(String).filter((entry) => entry.trim().length > 0)
}

interface InvariantEmitter {
  events: InvariantSink
  external?: InvariantSink
}

function createInvariantEmitter(external?: InvariantSink): InvariantEmitter {
  return { events: [], external }
}

function emitInvariant(
  emitter: InvariantEmitter,
  type: string,
  data: Record<string, unknown>
): void {
  const event = { kind: 'sf2.invariant', at: Date.now(), data: { type, ...data } }
  emitter.events.push(event)
  emitter.external?.push(event)
}

function emitMechanicalNoOp(
  emitter: InvariantEmitter,
  data: Record<string, unknown>
): void {
  emitInvariant(emitter, 'mechanical_effect_no_op', {
    detail: String(data.reason ?? 'mechanical effect no-op'),
    ...data,
  })
}
