import { createInitialSf2State } from '../game-data'
import {
  ensureReferencedFallbackOwners,
  repairOwnerRef,
} from '../reference-policy'
import {
  locationSemanticKey,
  mergeLocationIntoExisting,
  replaceLocationReferences,
} from '../locations'
import {
  SF2_SCHEMA_VERSION,
  type Sf2CampaignMeta,
  type Sf2ChapterNumber,
  type Sf2DispositionTier,
  type Sf2Faction,
  type Sf2HeatLevel,
  type Sf2Location,
  type Sf2Npc,
  type Sf2NpcRole,
  type Sf2NpcStatus,
  type Sf2State,
  type Sf2Thread,
  type Sf2ThreadStatus,
} from '../types'

const RECENT_TURNS_LIMIT = 6

export interface Sf2PersistenceNormalizeReport {
  state: Sf2State
  repairs: string[]
}

export function normalizePersistedSf2State(
  raw: unknown
): Sf2PersistenceNormalizeReport | null {
  if (!isRecord(raw)) return null

  const rawMeta = asRecord(raw.meta)
  const campaignId = stringOr(rawMeta?.campaignId, '')
  if (!campaignId) return null

  const rawPlayer = asRecord(raw.player)
  const playerName = stringOr(rawPlayer?.name, 'Ren')
  const seedId = stringOr(rawMeta?.seedId, undefined)
  const base = createInitialSf2State({ campaignId, playerName, seedId })
  const state = deepMerge(base, raw) as Sf2State
  const repairs: string[] = []

  normalizeMeta(state, base.meta, repairs)
  normalizeCampaign(state, repairs)
  normalizeChapter(state, repairs)
  normalizeWorld(state, repairs)
  normalizeHistory(state, repairs)
  normalizeDerived(state, repairs)

  return { state, repairs }
}

export function normalizeSf2StateForPersistence(state: Sf2State): Sf2State {
  const normalized = normalizePersistedSf2State(state)
  if (!normalized) {
    throw new Error('Cannot persist invalid SF2 state: missing meta.campaignId')
  }
  return normalized.state
}

function normalizeMeta(
  state: Sf2State,
  fallback: Sf2CampaignMeta,
  repairs: string[]
): void {
  const meta = state.meta
  meta.campaignId = stringOr(meta.campaignId, fallback.campaignId)
  meta.createdAt = stringOr(meta.createdAt, fallback.createdAt)
  meta.updatedAt = stringOr(meta.updatedAt, meta.createdAt)
  if (meta.schemaVersion !== SF2_SCHEMA_VERSION) repairs.push(`meta.schemaVersion:${String(meta.schemaVersion)}→${SF2_SCHEMA_VERSION}`)
  meta.schemaVersion = SF2_SCHEMA_VERSION
  meta.seedId = stringOr(meta.seedId, fallback.seedId)
  meta.genreId = stringOr(meta.genreId, fallback.genreId)
  meta.playbookId = stringOr(meta.playbookId, fallback.playbookId)
  meta.originId = stringOr(meta.originId, fallback.originId)
  meta.currentChapter = positiveInt(meta.currentChapter, fallback.currentChapter) as Sf2ChapterNumber
  meta.currentSceneId = stringOr(meta.currentSceneId, fallback.currentSceneId)
  meta.currentTimeLabel = stringOr(meta.currentTimeLabel, fallback.currentTimeLabel)
}

function normalizeCampaign(state: Sf2State, repairs: string[]): void {
  const campaign = state.campaign
  campaign.arcs = objectMap(campaign.arcs, 'campaign.arcs', repairs) as Sf2State['campaign']['arcs']
  campaign.threads = objectMap(campaign.threads, 'campaign.threads', repairs) as Sf2State['campaign']['threads']
  campaign.engines = objectMap(campaign.engines, 'campaign.engines', repairs) as Sf2State['campaign']['engines']
  campaign.decisions = objectMap(campaign.decisions, 'campaign.decisions', repairs) as Sf2State['campaign']['decisions']
  campaign.promises = objectMap(campaign.promises, 'campaign.promises', repairs) as Sf2State['campaign']['promises']
  campaign.clues = objectMap(campaign.clues, 'campaign.clues', repairs) as Sf2State['campaign']['clues']
  campaign.beats = objectMap(campaign.beats, 'campaign.beats', repairs) as Sf2State['campaign']['beats']
  campaign.temporalAnchors = objectMap(campaign.temporalAnchors, 'campaign.temporalAnchors', repairs) as Sf2State['campaign']['temporalAnchors']
  campaign.npcs = objectMap(campaign.npcs, 'campaign.npcs', repairs) as Sf2State['campaign']['npcs']
  campaign.factions = objectMap(campaign.factions, 'campaign.factions', repairs) as Sf2State['campaign']['factions']
  campaign.locations = objectMap(campaign.locations, 'campaign.locations', repairs) as Sf2State['campaign']['locations']
  campaign.documents = objectMap(campaign.documents, 'campaign.documents', repairs) as Sf2State['campaign']['documents']
  campaign.floatingClueIds = stringArray(campaign.floatingClueIds)
  campaign.pivotalSceneIds = stringArray(campaign.pivotalSceneIds)
  campaign.lexicon = Array.isArray(campaign.lexicon) ? campaign.lexicon : []
  if (campaign.pendingRecoveryNotes !== undefined) campaign.pendingRecoveryNotes = stringArray(campaign.pendingRecoveryNotes)
  if (campaign.pendingCoherenceNotes !== undefined) campaign.pendingCoherenceNotes = stringArray(campaign.pendingCoherenceNotes)

  for (const [id, faction] of Object.entries(campaign.factions)) {
    campaign.factions[id] = normalizeFaction(id, faction)
  }

  for (const [id, npc] of Object.entries(campaign.npcs)) {
    campaign.npcs[id] = normalizeNpc(id, npc, state.meta.currentChapter)
  }

  for (const [id, thread] of Object.entries(campaign.threads)) {
    campaign.threads[id] = normalizeThread(id, thread, state.meta.currentChapter)
  }

  for (const [id, location] of Object.entries(campaign.locations)) {
    campaign.locations[id] = normalizeLocation(location, {
      id,
      name: '',
      description: '',
    })
  }

  ensureReferencedFallbackOwners(state)
}

function normalizeChapter(state: Sf2State, repairs: string[]): void {
  state.chapter.number = positiveInt(state.chapter.number, state.meta.currentChapter) as Sf2ChapterNumber
  state.chapter.title = stringOr(state.chapter.title, state.chapter.setup.title)
  state.chapter.currentSceneId = stringOr(state.chapter.currentSceneId, state.meta.currentSceneId)
  state.chapter.sceneSummaries = Array.isArray(state.chapter.sceneSummaries)
    ? state.chapter.sceneSummaries
    : []
  state.chapter.setup.startingNpcIds = stringArray(state.chapter.setup.startingNpcIds)
  state.chapter.setup.activeThreadIds = stringArray(state.chapter.setup.activeThreadIds)
  state.chapter.setup.loadBearingThreadIds = stringArray(state.chapter.setup.loadBearingThreadIds)
  state.chapter.setup.carriedThreadIds = stringArray(state.chapter.setup.carriedThreadIds)
  if (state.chapter.setup.successorThreadIds !== undefined) {
    state.chapter.setup.successorThreadIds = stringArray(state.chapter.setup.successorThreadIds)
  }
  if (state.chapter.setup.newPressureThreadIds !== undefined) {
    state.chapter.setup.newPressureThreadIds = stringArray(state.chapter.setup.newPressureThreadIds)
  }
  state.chapter.setup.editorializedLore = Array.isArray(state.chapter.setup.editorializedLore)
    ? state.chapter.setup.editorializedLore
    : []
  state.chapter.setup.pressureLadder = Array.isArray(state.chapter.setup.pressureLadder)
    ? state.chapter.setup.pressureLadder.map((step) => ({
        ...step,
        severity: step.severity === 'hard' ? 'hard' : 'standard',
        threadIds: step.threadIds === undefined ? undefined : stringArray(step.threadIds),
        fired: Boolean(step.fired),
      }))
    : []
  state.chapter.setup.threadPressure = objectMap(
    state.chapter.setup.threadPressure,
    'chapter.setup.threadPressure',
    repairs
  ) as Sf2State['chapter']['setup']['threadPressure']
  state.chapter.setup.threadInitialTensions = state.chapter.setup.threadInitialTensions === undefined
    ? undefined
    : objectMap(
        state.chapter.setup.threadInitialTensions,
        'chapter.setup.threadInitialTensions',
        repairs
      ) as Sf2State['chapter']['setup']['threadInitialTensions']
  state.chapter.setup.surfaceThreads = stringArray(state.chapter.setup.surfaceThreads)
  state.chapter.setup.surfaceNpcIds = stringArray(state.chapter.setup.surfaceNpcIds)
  state.chapter.scaffolding.possibleRevelations = Array.isArray(state.chapter.scaffolding.possibleRevelations)
    ? state.chapter.scaffolding.possibleRevelations.map((r) => ({
        ...r,
        hintPhrases: stringArray(r.hintPhrases),
        hintsRequired: positiveInt(r.hintsRequired, 0),
        hintsDelivered: positiveInt(r.hintsDelivered, 0),
        hintEvidence: Array.isArray(r.hintEvidence) ? r.hintEvidence : [],
        validRevealContexts: stringArray(r.validRevealContexts) as typeof r.validRevealContexts,
        revealed: Boolean(r.revealed),
      }))
    : []
  state.chapter.scaffolding.moralFaultLines = Array.isArray(state.chapter.scaffolding.moralFaultLines)
    ? state.chapter.scaffolding.moralFaultLines
    : []
  state.chapter.scaffolding.escalationOptions = Array.isArray(state.chapter.scaffolding.escalationOptions)
    ? state.chapter.scaffolding.escalationOptions.map((e) => ({ ...e, used: Boolean(e.used) }))
    : []
  state.chapter.artifacts.opening.visibleNpcIds = stringArray(state.chapter.artifacts.opening.visibleNpcIds)
  state.chapter.artifacts.opening.visibleThreadIds = stringArray(state.chapter.artifacts.opening.visibleThreadIds)
  state.chapter.artifacts.opening.loreForOpening = Array.isArray(state.chapter.artifacts.opening.loreForOpening)
    ? state.chapter.artifacts.opening.loreForOpening
    : []
  state.chapter.artifacts.opening.sceneWarnings = stringArray(state.chapter.artifacts.opening.sceneWarnings)
}

function normalizeWorld(state: Sf2State, repairs: string[]): void {
  const world = state.world
  world.currentLocation = normalizeLocation(world.currentLocation, {
    id: 'loc_pending',
    name: '',
    description: '',
  })
  world.sceneSnapshot.location = normalizeLocation(
    world.sceneSnapshot.location,
    world.currentLocation
  )

  const snapshotLocation = world.sceneSnapshot.location
  if (snapshotLocation.id && snapshotLocation.id !== world.currentLocation.id) {
    repairs.push(`world.currentLocation:${world.currentLocation.id}→${snapshotLocation.id}`)
    world.currentLocation = snapshotLocation
  }

  dedupeCampaignLocations(state, repairs)

  world.sceneSnapshot.sceneId = stringOr(world.sceneSnapshot.sceneId, state.meta.currentSceneId)
  world.sceneSnapshot.presentNpcIds = stringArray(world.sceneSnapshot.presentNpcIds)
  world.sceneSnapshot.currentInterlocutorIds = world.sceneSnapshot.currentInterlocutorIds === undefined
    ? [...world.sceneSnapshot.presentNpcIds]
    : stringArray(world.sceneSnapshot.currentInterlocutorIds).filter((id) =>
        world.sceneSnapshot.presentNpcIds.includes(id)
      )
  world.sceneSnapshot.timeLabel = stringOr(
    world.sceneSnapshot.timeLabel,
    world.currentTimeLabel || state.meta.currentTimeLabel
  )
  world.sceneSnapshot.established = stringArray(world.sceneSnapshot.established)

  const cache = asRecord(world.sceneBundleCache)
  const legacyFirstTurnIndex = cache?.sceneId === world.sceneSnapshot.sceneId
    ? positiveInt(cache.firstTurnIndex, 0)
    : 0
  world.sceneSnapshot.firstTurnIndex = clamp(
    positiveInt(world.sceneSnapshot.firstTurnIndex, legacyFirstTurnIndex),
    0,
    state.history.turns.length
  )

  world.currentTimeLabel = stringOr(world.currentTimeLabel, world.sceneSnapshot.timeLabel)
  if (world.sceneSnapshot.timeLabel && world.sceneSnapshot.timeLabel !== world.currentTimeLabel) {
    world.currentTimeLabel = world.sceneSnapshot.timeLabel
  }
  state.meta.currentSceneId = world.sceneSnapshot.sceneId
  state.meta.currentTimeLabel = world.currentTimeLabel
  state.chapter.currentSceneId = world.sceneSnapshot.sceneId

  if (
    cache &&
    (cache.sceneId !== world.sceneSnapshot.sceneId ||
      positiveInt(cache.builtAtTurn, 0) < world.sceneSnapshot.firstTurnIndex)
  ) {
    repairs.push('world.sceneBundleCache:cleared')
    world.sceneBundleCache = undefined
  }
}

function normalizeHistory(state: Sf2State, repairs: string[]): void {
  state.history.turns = Array.isArray(state.history.turns) ? state.history.turns : []
  state.history.rollLog = Array.isArray(state.history.rollLog) ? state.history.rollLog : []
  const recentTurns = state.history.turns.slice(-RECENT_TURNS_LIMIT)
  if (!Array.isArray(state.history.recentTurns) || state.history.recentTurns.length !== recentTurns.length) {
    repairs.push('history.recentTurns:recomputed')
  }
  state.history.recentTurns = recentTurns
}

function normalizeDerived(state: Sf2State, repairs: string[]): void {
  if (!isRecord(state.derived)) {
    state.derived = {}
    repairs.push('derived:{}')
    return
  }
  if (state.derived.workingSetTelemetry !== undefined && !Array.isArray(state.derived.workingSetTelemetry)) {
    state.derived.workingSetTelemetry = []
    repairs.push('derived.workingSetTelemetry:[]')
  }
}

function normalizeNpc(
  id: string,
  raw: Sf2Npc,
  currentChapter: Sf2ChapterNumber
): Sf2Npc {
  const npc = raw
  npc.id = stringOr(npc.id, id)
  npc.name = stringOr(npc.name, npc.id)
  npc.affiliation = stringOr(npc.affiliation, '')
  npc.role = oneOf<Sf2NpcRole>(npc.role, ['crew', 'contact', 'npc'], 'npc')
  npc.status = oneOf<Sf2NpcStatus>(npc.status, ['alive', 'dead', 'gone', 'unknown'], 'unknown')
  npc.disposition = oneOf<Sf2DispositionTier>(
    npc.disposition,
    ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
    'neutral'
  )
  npc.identity = {
    keyFacts: stringArray(npc.identity?.keyFacts).slice(0, 3),
    pronoun: npc.identity?.pronoun,
    age: npc.identity?.age,
    voice: {
      note: stringOr(npc.identity?.voice?.note, ''),
      register: stringOr(npc.identity?.voice?.register, ''),
    },
    relations: Array.isArray(npc.identity?.relations) ? npc.identity.relations : [],
    vulnerability: npc.identity?.vulnerability,
  }
  npc.ownedThreadIds = stringArray(npc.ownedThreadIds)
  npc.retrievalCue = stringOr(npc.retrievalCue, npc.name)
  npc.chapterCreated = positiveInt(npc.chapterCreated, currentChapter) as Sf2ChapterNumber
  npc.signatureLines = stringArray(npc.signatureLines)
  return npc
}

function normalizeFaction(id: string, raw: Sf2Faction): Sf2Faction {
  const faction = raw
  faction.id = stringOr(faction.id, id)
  faction.name = stringOr(faction.name, faction.id)
  faction.stance = oneOf<Sf2DispositionTier>(
    faction.stance,
    ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
    'neutral'
  )
  faction.heat = oneOf<Sf2HeatLevel>(
    faction.heat,
    ['none', 'low', 'medium', 'high', 'boiling'],
    'none'
  )
  faction.heatReasons = stringArray(faction.heatReasons)
  faction.ownedThreadIds = stringArray(faction.ownedThreadIds)
  faction.retrievalCue = stringOr(faction.retrievalCue, faction.name)
  return faction
}

function normalizeThread(
  id: string,
  raw: Sf2Thread,
  currentChapter: Sf2ChapterNumber
): Sf2Thread {
  const thread = raw
  thread.id = stringOr(thread.id, id)
  thread.title = stringOr(thread.title, thread.id)
  thread.category = 'thread'
  thread.status = oneOf<Sf2ThreadStatus>(
    thread.status,
    ['active', 'resolved_clean', 'resolved_costly', 'resolved_failure', 'resolved_catastrophic', 'abandoned', 'deferred'],
    'active'
  )
  thread.owner = repairOwnerRef(thread.owner)
  thread.stakeholders = Array.isArray(thread.stakeholders)
    ? thread.stakeholders.map(repairOwnerRef)
    : []
  thread.tension = clamp(numberOr(thread.tension, 5), 0, 10)
  thread.peakTension = Math.max(clamp(numberOr(thread.peakTension, thread.tension), 0, 10), thread.tension)
  thread.resolutionCriteria = stringOr(thread.resolutionCriteria, '')
  thread.failureMode = stringOr(thread.failureMode, '')
  thread.retrievalCue = stringOr(thread.retrievalCue, thread.title)
  thread.chapterCreated = positiveInt(thread.chapterCreated, currentChapter) as Sf2ChapterNumber
  thread.loadBearing = Boolean(thread.loadBearing)
  thread.tensionHistory = Array.isArray(thread.tensionHistory) ? thread.tensionHistory : []
  return thread
}

function normalizeLocation(raw: unknown, fallback: Sf2State['world']['currentLocation']) {
  const record = asRecord(raw)
  if (!record) return fallback
  return {
    id: stringOr(record.id, fallback.id),
    name: stringOr(record.name, fallback.name),
    description: stringOr(record.description, fallback.description),
    atmosphericConditions: Array.isArray(record.atmosphericConditions)
      ? stringArray(record.atmosphericConditions)
      : fallback.atmosphericConditions,
    locked: typeof record.locked === 'boolean' ? record.locked : fallback.locked,
    chapterCreated: record.chapterCreated === undefined
      ? fallback.chapterCreated
      : positiveInt(record.chapterCreated, fallback.chapterCreated ?? 0) as Sf2ChapterNumber,
  }
}

function dedupeCampaignLocations(state: Sf2State, repairs: string[]): void {
  const locations = state.campaign.locations
  if (state.world.currentLocation.id) {
    const current = locations[state.world.currentLocation.id]
    locations[state.world.currentLocation.id] = current
      ? mergeLocationIntoExisting(current, state.world.currentLocation)
      : state.world.currentLocation
  }
  if (state.world.sceneSnapshot.location.id) {
    const snapshot = locations[state.world.sceneSnapshot.location.id]
    locations[state.world.sceneSnapshot.location.id] = snapshot
      ? mergeLocationIntoExisting(snapshot, state.world.sceneSnapshot.location)
      : state.world.sceneSnapshot.location
  }

  const groups = new Map<string, Sf2Location[]>()
  for (const location of Object.values(locations)) {
    const key = locationSemanticKey(location)
    if (!key) continue
    const group = groups.get(key) ?? []
    group.push(location)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    const canonical = chooseCanonicalLocation(state, group)
    let merged = canonical
    for (const location of group) {
      if (location.id === canonical.id) continue
      merged = mergeLocationIntoExisting(merged, location)
    }
    locations[canonical.id] = merged
    for (const location of group) {
      if (location.id === canonical.id) continue
      delete locations[location.id]
      replaceLocationReferences(state, location.id, merged)
      repairs.push(`campaign.locations:${location.id}→${canonical.id}`)
    }
  }

  const current = locations[state.world.currentLocation.id]
  if (current) state.world.currentLocation = current
  const snapshot = locations[state.world.sceneSnapshot.location.id]
  if (snapshot) state.world.sceneSnapshot.location = snapshot
}

function chooseCanonicalLocation(state: Sf2State, locations: Sf2Location[]): Sf2Location {
  const currentId = state.world.currentLocation.id
  const snapshotId = state.world.sceneSnapshot.location.id
  return locations.find((location) => location.id === currentId)
    ?? locations.find((location) => location.id === snapshotId)
    ?? locations.find((location) => /^loc_ch\d+_opening$/.test(location.id) || location.id === 'loc_opening')
    ?? [...locations].sort((a, b) => {
      const chapterDelta = (a.chapterCreated ?? 0) - (b.chapterCreated ?? 0)
      return chapterDelta !== 0 ? chapterDelta : a.id.localeCompare(b.id)
    })[0]
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(patch) ? clone(patch) : clone(base)
  if (isRecord(base)) {
    const out = clone(base) as Record<string, unknown>
    if (!isRecord(patch)) return out
    for (const [key, value] of Object.entries(patch)) {
      out[key] = key in out ? deepMerge(out[key], value) : clone(value)
    }
    return out
  }
  return patch === undefined || patch === null ? base : clone(patch)
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function objectMap(
  value: unknown,
  field: string,
  repairs: string[]
): Record<string, unknown> {
  if (isRecord(value)) return value
  repairs.push(`${field}:{}`)
  return {}
}

function stringOr(value: unknown, fallback: string | undefined): string {
  return typeof value === 'string' && value.length > 0 ? value : (fallback ?? '')
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter((s) => s.length > 0) : []
}

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function positiveInt(value: unknown, fallback: number): number {
  return Math.max(0, Math.round(numberOr(value, fallback)))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}
