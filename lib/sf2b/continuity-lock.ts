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
  continuityFacets: Sf2bContinuityFacet[]
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

export interface Sf2bContinuityFacet {
  id: string
  label: string
  facts: string[]
  milestones: Sf2bContinuityMilestone[]
}

export interface Sf2bContinuityMilestone {
  id: string
  label: string
  state: 'already_crossed'
  source: string
}

interface ContinuityFacetDefinition {
  id: string
  label: string
  factPattern: RegExp
  deriveMilestones?: (facts: string[]) => Sf2bContinuityMilestone[]
}

const SPACE_OPERA_TRANSIT_RE = /\b(route|transit|jump|gate|corridor|port|dock|bay|tail|cutter|notch|carrow|redline)\b/i
const SPACE_OPERA_CARRIED_OBJECT_RE = /\b(cargo|crate|sealed|seal|manifest|redline|carrow|hold|container|shipment|freight)\b/i
const FORK_CROSSED_RE =
  /(?:\b(?:after|past|beyond|through)\b.{0,80}\bfork\b|\bfork\b.{0,80}\b(?:behind|passed|crossed|taken|committed|executed|cleared|past)\b|\b(?:took|taken|crossed|passed|cleared|committed|executed|left|burned(?:\s+past)?)\b.{0,80}\bfork\b)/i
const FORK_PENDING_RE =
  /(?:\b(?:minutes?|seconds?|turns?)\b.{0,80}\b(?:from|to|before)\b.{0,80}\bfork\b|\bfork\b.{0,100}\b(?:coming up|ahead|queued|waiting|ready to execute|about to|approaching|approach|before|pending|commit to|heading change)\b|\b(?:approaching|before|from|to)\b.{0,80}\bfork\b)/i

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
  const continuityFacets = deriveContinuityFacets(state, factSources)

  return {
    chapter: state.meta.currentChapter,
    canonicalNpcs,
    locations,
    continuityFacets,
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
  const allowedCarriedSourceIds = allowedSf2bCarriedSourceIds(lock)
  return `### SF2B canon continuity lock — hard constraints

Treat these as established canon, not inspiration. You may time-jump, relocate, or add new pressure only if the chapter explicitly bridges from these facts.

- Closing geometry: ${lock.closingGeometry.locationName} (${lock.closingGeometry.locationId}); time ${lock.closingGeometry.timeLabel || '(unspecified)'}; present NPC ids ${lock.closingGeometry.presentNpcIds.join(', ') || '(none)'}
- Canonical NPCs: ${lock.canonicalNpcs.map((npc) => `${npc.id}=${npc.name} (${npc.role}, ${npc.affiliation}, ${npc.disposition})`).join('; ') || '(none)'}
- Locked locations: ${lock.locations.map((loc) => `${loc.id}=${loc.name}`).join('; ') || '(none)'}
- Continuity facets: ${renderContinuityFacets(lock.continuityFacets)}
- Unresolved contacts: ${lock.unresolvedContacts.map((contact) => `${contact.id}=${contact.name} (${contact.reason})`).join('; ') || '(none)'}
- Open promises: ${lock.openPromises.map((promise) => `${promise.id} to ${promise.ownerId}: ${promise.obligation}`).join('; ') || '(none)'}
- Active/load-bearing threads: ${lock.activeThreads.map((thread) => `${thread.id}="${thread.title}" t${thread.tension}${thread.loadBearing ? ' load-bearing' : ''}`).join('; ') || '(none)'}
- Allowed carried tension_score source ids: ${allowedCarriedSourceIds.join(', ') || '(none)'}
- Recent established facts: ${lock.closingGeometry.establishedFacts.join(' | ') || '(none)'}
${lock.closingGeometry.lastSceneSummary ? `- Last scene summary: ${lock.closingGeometry.lastSceneSummary}` : ''}

Continuity law: do not replace a locked broker/contact, location, continuity fact, continuity milestone, or unresolved pressure with a parallel equivalent. Reuse existing ids for carried NPCs/threads. If a continuity milestone is already_crossed, do not stage it as upcoming or pending; start after it or identify a different new choice. If \`tension_score.carried\` is true, its source id MUST be one of the allowed carried ids above. New NPCs or new pressures must set carried false. If a new face or place enters, name which locked fact it follows from.`
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

  const lockedFacts = unique(lock.continuityFacets.flatMap((facet) => facet.facts))
  for (const fact of lockedFacts) {
    const terms = importantTerms(fact)
    if (terms.length > 0 && !mentionsAny(haystack, terms)) {
      errors.push(`continuity_lock.fact missing bridge for "${fact}"`)
    }
  }

  for (const facet of lock.continuityFacets) {
    for (const milestone of facet.milestones) {
      if (milestoneRegressed(milestone, haystack)) {
        errors.push(`continuity_lock.milestone regresses ${milestone.id}: ${milestone.label}; source "${milestone.source}" says it is already crossed`)
      }
    }
  }

  const allowedCarriedSourceIds = allowedSf2bCarriedSourceIds(lock)
  const allowedCarriedSourceIdSet = new Set(allowedCarriedSourceIds)
  authored.tensionScore?.forEach((line, index) => {
    const sourceId = line.sourceEntityId || line.sourceThreadId
    if (line.carried && (!sourceId || !allowedCarriedSourceIdSet.has(sourceId))) {
      errors.push(`tension_score[${index}] carried pressure must reference a locked existing entity/thread id; allowed carried source ids: ${allowedCarriedSourceIds.join(', ') || '(none)'}`)
    }
    if (sourceId && !allowedCarriedSourceIdSet.has(sourceId) && line.carried) {
      errors.push(`tension_score[${index}] source id ${sourceId} is not in the SF2B continuity lock; set carried=false for new pressure or use one of: ${allowedCarriedSourceIds.join(', ') || '(none)'}`)
    }
  })

  return errors
}

export function allowedSf2bCarriedSourceIds(lock: Sf2bContinuityLock): Sf2EntityId[] {
  return unique([
    ...lock.unresolvedContacts.map((contact) => contact.id),
    ...lock.loadBearingThreadIds,
    ...lock.activeThreads.map((thread) => thread.id),
  ])
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
  const meaning = state.chapter.artifacts.meaning
  return [
    ...state.world.sceneSnapshot.established,
    meaning?.situation,
    meaning?.tension,
    meaning?.ticking,
    meaning?.question,
    meaning?.closer,
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

function deriveContinuityFacets(state: Sf2State, factSources: string[]): Sf2bContinuityFacet[] {
  return continuityFacetDefinitionsFor(state).map((definition) => {
    const facts = unique(factSources.filter((fact) => definition.factPattern.test(fact))).slice(0, 8)
    const milestones = definition.deriveMilestones?.(factSources) ?? []
    return {
      id: definition.id,
      label: definition.label,
      facts,
      milestones,
    }
  }).filter((facet) => facet.facts.length > 0 || facet.milestones.length > 0)
}

function continuityFacetDefinitionsFor(state: Sf2State): ContinuityFacetDefinition[] {
  if (state.meta.genreId !== 'space-opera') return []
  return [
    {
      id: 'space_opera_transit_chronology',
      label: 'Space-opera transit chronology',
      factPattern: SPACE_OPERA_TRANSIT_RE,
      deriveMilestones: deriveSpaceOperaTransitMilestones,
    },
    {
      id: 'space_opera_carried_object_status',
      label: 'Space-opera carried-object status',
      factPattern: SPACE_OPERA_CARRIED_OBJECT_RE,
    },
  ]
}

function deriveSpaceOperaTransitMilestones(factSources: string[]): Sf2bContinuityMilestone[] {
  const milestones: Sf2bContinuityMilestone[] = []
  for (const fact of factSources) {
    if (FORK_CROSSED_RE.test(fact)) {
      milestones.push({
        id: 'route_fork',
        label: 'route fork already crossed/taken',
        state: 'already_crossed',
        source: compactFact(fact),
      })
    }
  }
  return uniqueByKey(milestones, (milestone) => `${milestone.id}:${milestone.state}`).slice(0, 4)
}

function renderContinuityFacets(facets: Sf2bContinuityFacet[]): string {
  if (facets.length === 0) return '(none)'
  return facets.map((facet) => {
    const facts = facet.facts.join(' | ') || '(none)'
    const milestones = facet.milestones
      .map((milestone) => `${milestone.id}=${milestone.label} (${milestone.state}; source: ${milestone.source})`)
      .join(' | ') || '(none)'
    return `\n  - ${facet.label}: facts ${facts}; milestones ${milestones}`
  }).join('')
}

function milestoneRegressed(milestone: Sf2bContinuityMilestone, haystack: string): boolean {
  return milestone.id === 'route_fork' && milestone.state === 'already_crossed' && FORK_PENDING_RE.test(haystack)
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

function compactFact(value: string, max = 180): string {
  const compacted = value.replace(/\s+/g, ' ').trim()
  return compacted.length <= max ? compacted : `${compacted.slice(0, max - 1)}…`
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (!value.id || seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

function uniqueByKey<T>(values: T[], keyFor: (value: T) => string): T[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = keyFor(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
