import type { Sf2State } from '../types'
import {
  findMatchingLocation,
  mergeLocationIntoExisting,
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
    if (item && item.qty > 0) item.qty -= 1
  } else if (kind === 'set_scene_snapshot') {
    const snap = m.snapshot as Record<string, unknown> | undefined
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
        name: typeof snap.name === 'string' ? snap.name : requestedLocationId.replace(/_/g, ' '),
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
        const registered = state.campaign.locations[nextLocationId]
        if (registered) {
          nextLocation = mergeLocationIntoExisting(registered, {
            locked: nextLocked,
            chapterCreated: state.meta.currentChapter,
          })
          state.campaign.locations[nextLocation.id] = nextLocation
        } else {
          nextLocation = {
            id: nextLocationId,
            name: nextLocationId.replace(/_/g, ' '),
            description: Array.isArray(snap.established)
              ? (snap.established as string[]).join(' · ')
              : state.world.currentLocation.description,
            atmosphericConditions: state.world.currentLocation.atmosphericConditions,
            locked: nextLocked,
            chapterCreated: state.meta.currentChapter,
          }
          state.campaign.locations[nextLocationId] = nextLocation
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
    }
  } else if (kind === 'set_location') {
    const locId = String(m.location_id ?? '')
    if (!locId) return
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
  }
}
