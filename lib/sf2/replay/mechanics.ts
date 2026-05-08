import type { Sf2State } from '../types'
import {
  findMatchingLocation,
  mergeLocationIntoExisting,
  replaceLocationReferences,
} from '../locations'
import {
  formatViolations,
  resolveSceneSnapshotReferences,
} from '../reference-policy'

export interface Sf2ReplayInvariantEvent {
  kind: 'sf2.invariant'
  at: number
  data: { type: string } & Record<string, unknown>
}

type InvariantSink = Array<{ kind: string; at: number; data: unknown }>

export function makeInvariantEvent(
  type: string,
  data: Record<string, unknown>
): Sf2ReplayInvariantEvent {
  return { kind: 'sf2.invariant', at: Date.now(), data: { type, ...data } }
}

export function offstageRosterSignature(state: Sf2State): string {
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

export function applyMechanicalEffectLocally(
  state: Sf2State,
  m: Record<string, unknown>,
  invariantEvents?: InvariantSink
): void {
  const kind = String(m.kind)
  if (kind === 'hp_delta') {
    const v = Number(m.value ?? 0)
    state.player.hp.current = Math.max(0, Math.min(state.player.hp.max, state.player.hp.current + v))
  } else if (kind === 'credits_delta') {
    state.player.credits = Math.max(0, state.player.credits + Number(m.value ?? 0))
  } else if (kind === 'inventory_use') {
    const itemName = String(m.item ?? '')
    const item = state.player.inventory.find((it) => it.name === itemName)
    if (item && item.qty > 0) {
      item.qty -= 1
    } else {
      emitMechanicalNoOp(invariantEvents, {
        kind,
        reason: 'inventory item unavailable',
        item: itemName,
      })
    }
  } else if (kind === 'set_scene_snapshot') {
    const snap = isRecord(m.snapshot)
      ? m.snapshot
      : hasTopLevelSnapshotFields(m)
        ? m
        : undefined
    if (snap) {
      const priorCast = [...state.world.sceneSnapshot.presentNpcIds].sort().join(',')
      const priorOffstageRoster = offstageRosterSignature(state)
      const priorSceneId = state.world.sceneSnapshot.sceneId
      const priorLocationId =
        state.world.currentLocation.id ||
        state.world.sceneSnapshot.location?.id ||
        priorSceneId
      const requestedLocationId = String(snap.location_id ?? m.location_id ?? priorLocationId)
      const matchedLocation = findMatchingLocation(state, {
        id: requestedLocationId,
        name: snapshotString(snap, m, 'name') ?? requestedLocationId.replace(/_/g, ' '),
        description: snapshotString(snap, m, 'description') ?? '',
        atmosphericConditions: snapshotStringArray(snap, m, 'atmospheric_conditions'),
      })
      const nextLocationId = matchedLocation?.id ?? requestedLocationId
      const explicitSceneId = typeof snap.scene_id === 'string'
        ? snap.scene_id
        : typeof m.scene_id === 'string'
          ? m.scene_id
          : undefined
      const locationChanged = nextLocationId !== priorLocationId
      const nextSceneId = explicitSceneId ?? (locationChanged ? nextLocationId : priorSceneId)
      const sceneChanged = nextSceneId !== priorSceneId

      const rawPresentNpcIds = Array.isArray(snap.present_npc_ids)
        ? snap.present_npc_ids
        : Array.isArray(m.present_npc_ids)
          ? m.present_npc_ids
          : undefined

      // Phase A canonical ID enforcement (observe mode). Surface display-style
      // free-text IDs as instrumentation; do not reject — the existing resolve
      // + placeholder path canonicalizes them downstream. Block mode arrives
      // with Phase E's reducer once the rest of the substrate (display
      // sentinel, patch reducer) is in place.
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
        invariantEvents?.push(makeInvariantEvent('canonical_id_violation', {
          mode: 'observe',
          violations: idCheck.violations,
          detail: formatViolations(idCheck.violations),
          priorSceneId,
          nextSceneId,
        }))
      }

      if (sceneChanged && rawPresentNpcIds === undefined) {
        invariantEvents?.push(makeInvariantEvent('scene_snapshot_missing_present_npc_ids', {
          priorSceneId,
          nextSceneId,
          action: 'cleared_cast_for_new_scene',
        }))
        state.campaign.pendingCoherenceNotes = [
          ...(state.campaign.pendingCoherenceNotes ?? []),
          `[medium] cast_wipe (${nextSceneId}): Prior scene cast was cleared because set_scene_snapshot omitted present_npc_ids. Re-establish who is visibly present before using dialogue or direct action.`,
        ].slice(-6)
      }

      const resolvedPresent = rawPresentNpcIds !== undefined
        ? snapshotRefs.presentNpcIds ?? []
        : sceneChanged
          ? []
          : state.world.sceneSnapshot.presentNpcIds
      const nextCast = [...resolvedPresent].sort().join(',')

      for (const creation of snapshotRefs.placeholderCreations) {
        invariantEvents?.push(makeInvariantEvent('snapshot_placeholder_npc_created', creation))
      }

      let nextLocation = state.world.currentLocation
      const nextLocked = typeof snap.locked === 'boolean'
        ? snap.locked
        : typeof m.locked === 'boolean'
          ? m.locked
          : undefined
      if (locationChanged) {
        const proposedLocation = {
          id: requestedLocationId,
          name: snapshotString(snap, m, 'name') ?? requestedLocationId.replace(/_/g, ' '),
          description: snapshotString(snap, m, 'description') ??
            (Array.isArray(snap.established)
              ? (snap.established as string[]).join(' · ')
              : state.world.currentLocation.description),
          atmosphericConditions: snapshotStringArray(snap, m, 'atmospheric_conditions') ??
            state.world.currentLocation.atmosphericConditions,
          locked: nextLocked,
          chapterCreated: state.meta.currentChapter,
        }
        const registered = state.campaign.locations[nextLocationId]
        if (registered) {
          nextLocation = mergeLocationIntoExisting(registered, proposedLocation)
          state.campaign.locations[nextLocation.id] = nextLocation
        } else {
          nextLocation = { ...proposedLocation, id: nextLocationId }
          state.campaign.locations[nextLocation.id] = nextLocation
        }
        if (requestedLocationId !== nextLocation.id && state.campaign.locations[requestedLocationId]) {
          nextLocation = mergeLocationIntoExisting(nextLocation, state.campaign.locations[requestedLocationId])
          state.campaign.locations[nextLocation.id] = nextLocation
          delete state.campaign.locations[requestedLocationId]
          replaceLocationReferences(state, requestedLocationId, nextLocation)
        }
      } else if (nextLocked !== undefined) {
        nextLocation = {
          ...nextLocation,
          locked: nextLocked,
          chapterCreated: nextLocation.chapterCreated ?? state.meta.currentChapter,
        }
        state.campaign.locations[nextLocation.id] = nextLocation
      }

      const timeLabel = String(snap.time_label ?? state.world.sceneSnapshot.timeLabel)
      // Phase A: carry currentInterlocutorIds when explicitly provided.
      // Default behavior (omitted) keeps the SceneKernel falling back to "all
      // present NPCs are interlocutors." Phase E's SceneKernelPatch reducer
      // is the canonical write path for narrowing this; this code accepts it
      // here only for completeness so the field round-trips through snapshot
      // writes when the Narrator (rarely) sets it.
      const resolvedInterlocutors =
        rawInterlocutorIds !== undefined
          ? snapshotRefs.currentInterlocutorIds?.filter((id) => resolvedPresent.includes(id)) ?? []
          : undefined
      state.world.sceneSnapshot = {
        sceneId: nextSceneId,
        location: nextLocation,
        presentNpcIds: resolvedPresent,
        currentInterlocutorIds: resolvedInterlocutors,
        timeLabel,
        established: Array.isArray(snap.established)
          ? (snap.established as string[])
          : state.world.sceneSnapshot.established,
        // firstTurnIndex resets only when the scene actually changes. A
        // same-scene snapshot update (cast/time refinement) preserves the
        // replay-window cutoff so in-scene turn pairs stay addressable.
        firstTurnIndex: sceneChanged
          ? state.history.turns.length
          : state.world.sceneSnapshot.firstTurnIndex,
      }
      state.world.currentLocation = nextLocation
      state.world.currentTimeLabel = timeLabel
      state.meta.currentSceneId = nextSceneId
      state.meta.currentTimeLabel = timeLabel

      if (
        priorCast !== nextCast ||
        priorSceneId !== nextSceneId ||
        priorOffstageRoster !== offstageRosterSignature(state)
      ) {
        state.world.sceneBundleCache = undefined
      }
    } else {
      emitMechanicalNoOp(invariantEvents, {
        kind,
        reason: 'set_scene_snapshot missing snapshot payload',
      })
    }
  } else if (kind === 'set_location') {
    const locId = String(m.location_id ?? '')
    if (!locId) {
      emitMechanicalNoOp(invariantEvents, {
        kind,
        reason: 'set_location missing location_id',
      })
      return
    }
    const proposed = {
      id: locId,
      name: String(m.name ?? locId.replace(/_/g, ' ')),
      description: String(m.description ?? ''),
      atmosphericConditions: Array.isArray(m.atmospheric_conditions)
        ? (m.atmospheric_conditions as string[])
        : undefined,
      locked: typeof m.locked === 'boolean' ? m.locked : undefined,
      chapterCreated: state.meta.currentChapter,
    }
    const matching = findMatchingLocation(state, proposed)
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
  } else if (kind === 'scene_end') {
    const summary = {
      sceneId: state.world.sceneSnapshot.sceneId,
      chapter: state.meta.currentChapter,
      summary: String(m.summary ?? ''),
      leadsTo: (m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise' | 'null') === 'null'
        ? null
        : ((m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise') ?? null),
    }
    const existing = state.chapter.sceneSummaries.find(
      (s) => s.chapter === summary.chapter && s.sceneId === summary.sceneId
    )
    if (existing) {
      if (!existing.summary && summary.summary) existing.summary = summary.summary
      if (!existing.leadsTo && summary.leadsTo) existing.leadsTo = summary.leadsTo
    } else {
      state.chapter.sceneSummaries.push(summary)
    }
    state.world.sceneBundleCache = undefined
  } else {
    emitMechanicalNoOp(invariantEvents, {
      kind,
      reason: 'unknown mechanical effect kind',
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasTopLevelSnapshotFields(value: Record<string, unknown>): boolean {
  return [
    'location_id',
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

function emitMechanicalNoOp(
  invariantEvents: InvariantSink | undefined,
  data: Record<string, unknown>
): void {
  invariantEvents?.push(makeInvariantEvent('mechanical_effect_no_op', {
    detail: String(data.reason ?? 'mechanical effect no-op'),
    ...data,
  }))
}
