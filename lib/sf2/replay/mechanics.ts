import type { Sf2State } from '../types'

export interface Sf2ReplayInvariantEvent {
  kind: 'sf2.invariant'
  at: number
  data: { type: string } & Record<string, unknown>
}

type InvariantSink = Array<{ kind: string; at: number; data: unknown }>

// Resolve a Narrator-emitted npc reference (id, shortened id, or bare name)
// to a canonical npc_<id> in the registry. Returns null if no match.
export function resolveNpcReference(state: Sf2State, raw: string): string | null {
  if (!raw) return null
  const r = raw.trim()
  if (!r) return null

  if (state.campaign.npcs[r]) return r

  const withPrefix = r.startsWith('npc_') ? r : `npc_${r}`
  if (state.campaign.npcs[withPrefix]) return withPrefix

  const withoutPrefix = r.startsWith('npc_') ? r.slice(4) : r
  if (state.campaign.npcs[withoutPrefix]) return withoutPrefix

  const normCandidates = [r, withoutPrefix]
    .map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter((value, index, values) => value && values.indexOf(value) === index)
  for (const npc of Object.values(state.campaign.npcs)) {
    const nameSlug = npc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    const idTail = npc.id.replace(/^npc_/, '')
    for (const norm of normCandidates) {
      if (nameSlug === norm || idTail === norm) return npc.id
      const lastToken = nameSlug.split('_').pop() ?? ''
      if (lastToken && lastToken === norm) return npc.id
    }
  }
  return null
}

export function createPlaceholderNpcFromReference(state: Sf2State, raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const slug = trimmed
    .replace(/^npc_/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!slug) return null
  const id = `npc_${slug}`
  if (state.campaign.npcs[id]) return id

  state.campaign.npcs[id] = {
    id,
    name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    affiliation: 'Unknown',
    role: 'npc',
    status: 'alive',
    disposition: 'neutral',
    identity: {
      keyFacts: ['Created from Narrator scene snapshot; Archivist did not canonicalize details yet.'],
      voice: { note: 'Not yet established.', register: 'Not yet established.' },
      relations: [],
    },
    ownedThreadIds: [],
    retrievalCue: `${slug.replace(/_/g, ' ')} — placeholder from scene snapshot`,
    chapterCreated: state.meta.currentChapter,
    lastSeenTurn: state.history.turns.length,
    signatureLines: [],
  }
  return id
}

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
      const nextSceneId = String(snap.location_id ?? m.location_id ?? priorSceneId)
      const sceneChanged = nextSceneId !== priorSceneId

      const rawPresentNpcIds = Array.isArray(snap.present_npc_ids)
        ? snap.present_npc_ids
        : Array.isArray(m.present_npc_ids)
          ? m.present_npc_ids
          : undefined

      if (sceneChanged && rawPresentNpcIds === undefined) {
        invariantEvents?.push(makeInvariantEvent('scene_snapshot_missing_present_npc_ids', {
          priorSceneId,
          nextSceneId,
          action: 'cleared_cast_for_new_scene',
        }))
      }

      const resolvedPresent = rawPresentNpcIds !== undefined
        ? (rawPresentNpcIds as string[])
            .map((raw) => {
              const resolved = resolveNpcReference(state, raw)
              if (resolved) return resolved
              const placeholder = createPlaceholderNpcFromReference(state, raw)
              if (placeholder) {
                invariantEvents?.push(makeInvariantEvent('snapshot_placeholder_npc_created', {
                  raw,
                  placeholderId: placeholder,
                }))
              }
              return placeholder
            })
            .filter((id): id is string => Boolean(id))
        : sceneChanged
          ? []
          : state.world.sceneSnapshot.presentNpcIds
      const nextCast = [...resolvedPresent].sort().join(',')

      let nextLocation = state.world.currentLocation
      if (nextSceneId !== priorSceneId) {
        const registered = state.campaign.locations[nextSceneId]
        if (registered) {
          nextLocation = registered
        } else {
          nextLocation = {
            id: nextSceneId,
            name: nextSceneId.replace(/_/g, ' '),
            description: Array.isArray(snap.established)
              ? (snap.established as string[]).join(' · ')
              : state.world.currentLocation.description,
            atmosphericConditions: state.world.currentLocation.atmosphericConditions,
          }
          state.campaign.locations[nextSceneId] = nextLocation
        }
      }

      const timeLabel = String(snap.time_label ?? state.world.sceneSnapshot.timeLabel)
      state.world.sceneSnapshot = {
        sceneId: nextSceneId,
        location: nextLocation,
        presentNpcIds: resolvedPresent,
        timeLabel,
        established: Array.isArray(snap.established)
          ? (snap.established as string[])
          : state.world.sceneSnapshot.established,
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
    let loc = state.campaign.locations[locId]
    if (!loc) {
      loc = {
        id: locId,
        name: String(m.name ?? locId.replace(/_/g, ' ')),
        description: String(m.description ?? ''),
        atmosphericConditions: Array.isArray(m.atmospheric_conditions)
          ? (m.atmospheric_conditions as string[])
          : undefined,
      }
      state.campaign.locations[locId] = loc
    }
    state.world.currentLocation = loc
    state.world.sceneSnapshot = {
      ...state.world.sceneSnapshot,
      sceneId: loc.id,
      location: loc,
      presentNpcIds: [],
      established: loc.description ? [loc.description] : [],
    }
    state.meta.currentSceneId = loc.id
    state.world.sceneBundleCache = undefined
  } else if (kind === 'scene_end') {
    state.chapter.sceneSummaries.push({
      sceneId: state.world.sceneSnapshot.sceneId,
      chapter: state.meta.currentChapter,
      summary: String(m.summary ?? ''),
      leadsTo: (m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise' | 'null') === 'null'
        ? null
        : ((m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise') ?? null),
    })
    state.world.sceneBundleCache = undefined
  }
}
