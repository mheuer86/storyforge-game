import type {
  AuthorChapterSetupV2,
  Sf2EntityId,
  Sf2State,
} from '../sf2/types'

export interface Sf2bContinuityLock {
  chapter: number
  canonicalNpcs: Array<{
    id: Sf2EntityId
    name: string
    affiliation: string
    role: string
    disposition: string
  }>
  locations: Array<{ id: Sf2EntityId; name: string; description?: string }>
  routeFacts: string[]
  cargoFacts: string[]
  unresolvedContacts: Array<{ id: Sf2EntityId; name: string; reason: string }>
  openPromises: Array<{ id: Sf2EntityId; ownerId: Sf2EntityId; obligation: string; anchoredTo: Sf2EntityId[] }>
  activeThreads: Array<{
    id: Sf2EntityId
    title: string
    tension: number
    ownerId: Sf2EntityId
    loadBearing: boolean
    retrievalCue: string
  }>
  loadBearingThreadIds: Sf2EntityId[]
  closingGeometry: {
    locationId: Sf2EntityId
    locationName: string
    timeLabel: string
    presentNpcIds: Sf2EntityId[]
    establishedFacts: string[]
    lastSceneSummary?: string
    lastVisibleProse?: string
  }
}

const ROUTE_RE = /\b(route|transit|jump|gate|corridor|port|dock|bay|tail|cutter|notch|carrow|redline)\b/i
const CARGO_RE = /\b(cargo|crate|sealed|seal|manifest|redline|carrow|hold|container|shipment|freight)\b/i

export function deriveSf2bContinuityLock(state: Sf2State): Sf2bContinuityLock {
  const currentTurn = state.history.turns.length
  const activeThreads = Object.values(state.campaign.threads)
    .filter((thread) => thread.status === 'active')
    .sort((a, b) => Number(b.loadBearing) - Number(a.loadBearing) || b.tension - a.tension)

  const activeThreadIds = new Set(activeThreads.map((thread) => thread.id))
  const loadBearingThreadIds = unique([
    ...(state.chapter.setup.loadBearingThreadIds ?? []),
    ...activeThreads.filter((thread) => thread.loadBearing || thread.tension >= 6).map((thread) => thread.id),
  ]).filter((id) => activeThreadIds.has(id))
  const presentNpcIds = new Set(state.world.sceneSnapshot.presentNpcIds ?? [])
  const threadOwnerIds = new Set(
    activeThreads.filter((thread) => thread.owner.kind === 'npc').map((thread) => thread.owner.id)
  )

  const canonicalNpcs = Object.values(state.campaign.npcs)
    .filter((npc) => npc.status === 'alive')
    .sort((a, b) => npcContinuityRank(b, presentNpcIds, threadOwnerIds, currentTurn) - npcContinuityRank(a, presentNpcIds, threadOwnerIds, currentTurn))
    .slice(0, 8)
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      affiliation: npc.affiliation,
      role: npc.role,
      disposition: npc.disposition,
    }))

  const unresolvedContacts = canonicalNpcs
    .filter((npc) => presentNpcIds.has(npc.id) || threadOwnerIds.has(npc.id))
    .slice(0, 5)
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      reason: presentNpcIds.has(npc.id) ? 'present at prior close' : 'owns active pressure',
    }))

  const currentLocation = state.world.sceneSnapshot.location
  const locations = uniqueById([
    currentLocation,
    state.world.currentLocation,
    ...Object.values(state.campaign.locations).filter((loc) => loc.locked || loc.id === currentLocation.id),
  ])
    .filter((loc) => loc.id || loc.name)
    .slice(0, 5)
    .map((loc) => ({ id: loc.id, name: loc.name, description: loc.description }))

  const factSources = collectFactSources(state)
  const routeFacts = unique(factSources.filter((fact) => ROUTE_RE.test(fact))).slice(0, 8)
  const cargoFacts = unique(factSources.filter((fact) => CARGO_RE.test(fact))).slice(0, 8)

  return {
    chapter: state.meta.currentChapter,
    canonicalNpcs,
    locations,
    routeFacts,
    cargoFacts,
    unresolvedContacts,
    openPromises: Object.values(state.campaign.promises)
      .filter((promise) => promise.status === 'active')
      .slice(0, 6)
      .map((promise) => ({
        id: promise.id,
        ownerId: promise.owner.id,
        obligation: promise.obligation,
        anchoredTo: promise.anchoredTo,
      })),
    activeThreads: activeThreads.slice(0, 8).map((thread) => ({
      id: thread.id,
      title: thread.title,
      tension: thread.tension,
      ownerId: thread.owner.id,
      loadBearing: thread.loadBearing || loadBearingThreadIds.includes(thread.id),
      retrievalCue: thread.retrievalCue,
    })),
    loadBearingThreadIds,
    closingGeometry: {
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      timeLabel: state.world.sceneSnapshot.timeLabel || state.world.currentTimeLabel || state.meta.currentTimeLabel,
      presentNpcIds: [...presentNpcIds],
      establishedFacts: state.world.sceneSnapshot.established.slice(-6),
      lastSceneSummary: state.chapter.sceneSummaries.at(-1)?.summary,
      lastVisibleProse: state.history.turns.at(-1)?.narratorProse?.slice(-500),
    },
  }
}

export function renderSf2bContinuityLock(lock: Sf2bContinuityLock): string {
  return `### SF2B canon continuity lock — hard constraints

Treat these as established canon, not inspiration. You may time-jump, relocate, or add new pressure only if the chapter explicitly bridges from these facts.

- Closing geometry: ${lock.closingGeometry.locationName} (${lock.closingGeometry.locationId}); time ${lock.closingGeometry.timeLabel || '(unspecified)'}; present NPC ids ${lock.closingGeometry.presentNpcIds.join(', ') || '(none)'}
- Canonical NPCs: ${lock.canonicalNpcs.map((npc) => `${npc.id}=${npc.name} (${npc.role}, ${npc.affiliation}, ${npc.disposition})`).join('; ') || '(none)'}
- Locked locations: ${lock.locations.map((loc) => `${loc.id}=${loc.name}`).join('; ') || '(none)'}
- Route facts: ${lock.routeFacts.join(' | ') || '(none)'}
- Cargo facts: ${lock.cargoFacts.join(' | ') || '(none)'}
- Unresolved contacts: ${lock.unresolvedContacts.map((contact) => `${contact.id}=${contact.name} (${contact.reason})`).join('; ') || '(none)'}
- Open promises: ${lock.openPromises.map((promise) => `${promise.id} to ${promise.ownerId}: ${promise.obligation}`).join('; ') || '(none)'}
- Active/load-bearing threads: ${lock.activeThreads.map((thread) => `${thread.id}="${thread.title}" t${thread.tension}${thread.loadBearing ? ' load-bearing' : ''}`).join('; ') || '(none)'}
- Recent established facts: ${lock.closingGeometry.establishedFacts.join(' | ') || '(none)'}
${lock.closingGeometry.lastSceneSummary ? `- Last scene summary: ${lock.closingGeometry.lastSceneSummary}` : ''}

Continuity law: do not replace a locked broker/contact, location, route/cargo fact, or unresolved pressure with a parallel equivalent. Reuse existing ids for carried NPCs/threads. If a new face or place enters, name which locked fact it follows from.`
}

export function validateSf2bContinuityLockUsage(
  authored: AuthorChapterSetupV2,
  lock: Sf2bContinuityLock
): string[] {
  const errors: string[] = []
  const haystack = collectAuthoredText(authored).toLowerCase()
  const authoredThreadIds = new Set(authored.activeThreads.map((thread) => thread.id))
  const authoredNpcIds = new Set(authored.startingNPCs.map((npc) => npc.id))

  for (const contact of lock.unresolvedContacts) {
    if (!authoredNpcIds.has(contact.id) && !mentionsAny(haystack, [contact.id, contact.name])) {
      errors.push(`continuity_lock.unresolved_contacts missing ${contact.id} (${contact.name})`)
    }
  }

  for (const thread of lock.activeThreads.filter((t) => t.loadBearing)) {
    if (!authoredThreadIds.has(thread.id) && !mentionsAny(haystack, [thread.id, thread.title])) {
      errors.push(`continuity_lock.active_threads missing load-bearing ${thread.id} (${thread.title})`)
    }
  }

  const currentLocation = lock.closingGeometry.locationName
  if (currentLocation && !mentionsAny(haystack, [lock.closingGeometry.locationId, currentLocation])) {
    errors.push(`continuity_lock.closing_geometry missing ${lock.closingGeometry.locationId} (${currentLocation}) bridge`)
  }

  for (const fact of unique([...lock.routeFacts, ...lock.cargoFacts])) {
    const terms = importantTerms(fact)
    if (terms.length > 0 && !mentionsAny(haystack, terms)) {
      errors.push(`continuity_lock.fact missing bridge for "${fact}"`)
    }
  }

  const carriedIds = new Set([
    ...lock.unresolvedContacts.map((contact) => contact.id),
    ...lock.loadBearingThreadIds,
    ...lock.activeThreads.map((thread) => thread.id),
  ])
  authored.tensionScore?.forEach((line, index) => {
    const sourceId = line.sourceEntityId || line.sourceThreadId
    if (line.carried && (!sourceId || !carriedIds.has(sourceId))) {
      errors.push(`tension_score[${index}] carried pressure must reference a locked existing entity/thread id`)
    }
    if (sourceId && !carriedIds.has(sourceId) && line.carried) {
      errors.push(`tension_score[${index}] source id ${sourceId} is not in the SF2B continuity lock`)
    }
  })

  return errors
}

function npcContinuityRank(
  npc: { id: string; lastSeenTurn?: number },
  presentNpcIds: Set<string>,
  threadOwnerIds: Set<string>,
  currentTurn: number
): number {
  let rank = 0
  if (presentNpcIds.has(npc.id)) rank += 100
  if (threadOwnerIds.has(npc.id)) rank += 50
  if (npc.lastSeenTurn !== undefined) rank += Math.max(0, 20 - (currentTurn - npc.lastSeenTurn))
  return rank
}

function collectFactSources(state: Sf2State): string[] {
  const turns = state.history.turns.slice(-4)
  return [
    ...state.world.sceneSnapshot.established,
    ...state.chapter.sceneSummaries.slice(-3).map((summary) => summary.summary),
    ...turns.flatMap((turn) => [turn.playerInput, turn.narratorProse]),
    state.campaign.operationPlan?.name,
    state.campaign.operationPlan?.target,
    state.campaign.operationPlan?.approach,
    state.campaign.operationPlan?.fallback,
    ...state.player.inventory.map((item) => item.name),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
}

function collectAuthoredText(authored: AuthorChapterSetupV2): string {
  const values: string[] = []
  const visit = (value: unknown): void => {
    if (typeof value === 'string') values.push(value)
    else if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(authored)
  return values.join('\n')
}

function importantTerms(fact: string): string[] {
  const properPhrases = fact.match(/\b[A-Z][A-Za-z0-9'-]*(?:\s+[A-Z][A-Za-z0-9'-]*)*\b/g) ?? []
  return unique(properPhrases.filter((term) => term.length >= 4)).slice(0, 4)
}

function mentionsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => needle.trim().length > 0 && haystack.includes(needle.toLowerCase()))
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (!value.id || seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}
