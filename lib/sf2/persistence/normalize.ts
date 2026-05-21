import { createInitialSf2State } from '../game-data'
import {
  ensureReferencedFallbackOwners,
  repairOwnerRef,
} from '../reference-policy'
import {
  locationSemanticKey,
  locationsSemanticallyEquivalent,
  mergeLocationIntoExisting,
  parseFlattenedLocationAlias,
  replaceLocationReferences,
} from '../locations'
import {
  SF2_SCHEMA_VERSION,
  type Sf2CampaignRulebookInterpretation,
  type Sf2ChapterPlaystyleArtifact,
  type Sf2CampaignMeta,
  type Sf2ChapterNumber,
  type Sf2DispositionTier,
  type Sf2Faction,
  type Sf2HeatLevel,
  type Sf2Location,
  type Sf2Npc,
  type Sf2NpcStatus,
  type Sf2PressureEvent,
  type Sf2RevealContext,
  type Sf2RevelationCashConditions,
  type Sf2State,
  type Sf2Thread,
  type Sf2Clue,
  type Sf2ClueEvidenceKind,
  type Sf2PassiveAwarenessCue,
  type Sf2PassiveAwarenessKind,
  type Sf2PatchConfidence,
  type Sf2PlaystyleEvidenceRef,
  type Sf2PlaystylePersonalizationState,
  type Sf2ThreadResolutionMode,
  type Sf2ThreadStatus,
} from '../types'
import {
  rebuildOwnerThreadBackrefs,
  syncArcPlanStatusFromArcEntity,
} from '../state-indexes'
import {
  normalizeThreadProgressEvents,
  normalizeThreadResolutionGates,
} from '../thread-resolution'
import { compactRetrievalCue } from '../retrieval-cues'
import { isActiveSf2Procedure, normalizeProcedureRuntime } from '../procedure'
import type { Sf2SetupSelection } from '../setup/types'
import { clampSf2SetupCalibrationAnswers } from '../setup/calibration'
import { getGenreConfig, type CharacterClass, type Genre } from '../../genre-config'

const RECENT_TURNS_LIMIT = 6
const PRESSURE_EVENT_LIMIT = 50
const PRESSURE_EVENT_SOURCES: Sf2PressureEvent['source'][] = [
  'failed_roll',
  'npc_agenda',
  'faction_move',
  'deadline',
  'decision',
  'promise_neglected',
  'clue_revealed',
  'ladder_fire',
]
const PRESSURE_EVENT_SCOPES: Sf2PressureEvent['scope'][] = [
  'canonical_thread',
  'chapter_local',
]
const PRESSURE_EVENT_SEVERITIES: NonNullable<Sf2PressureEvent['severity']>[] = [
  'standard',
  'hard',
]
const PASSIVE_AWARENESS_KINDS: Sf2PassiveAwarenessKind[] = [
  'environmental_detail',
  'hazard_sign',
  'surveillance_trace',
  'tail_sign',
  'npc_tell',
  'procedure_affordance',
]
const PATCH_CONFIDENCES: Sf2PatchConfidence[] = ['high', 'medium', 'low']

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
  const setupSelection = setupSelectionOr(rawMeta?.setupSelection)
  let base: Sf2State
  try {
    base = createInitialSf2State({ campaignId, playerName, seedId, setupSelection })
  } catch {
    return null
  }
  const state = deepMerge(base, raw) as Sf2State
  const repairs: string[] = []

  normalizeMeta(state, base.meta, repairs)
  normalizeCampaign(state, repairs)
  normalizeChapter(state, repairs)
  normalizeWorld(state, repairs)
  normalizePlayer(state, repairs)
  normalizeHistory(state, repairs)
  normalizeDerived(state, repairs)

  return { state, repairs }
}

function normalizePlayer(state: Sf2State, repairs: string[]): void {
  const playbook = findPlaybookForState(state)
  const startingItems = playbook?.startingInventory ?? []
  state.player.inventory = Array.isArray(state.player.inventory) ? state.player.inventory : []
  state.player.traits = Array.isArray(state.player.traits) ? state.player.traits : []

  state.player.inventory = state.player.inventory.map((item) => {
    const raw = asRecord(item) ?? {}
    const name = stringOr(raw.name, '')
    const match = startingItems.find((candidate) =>
      (typeof raw.id === 'string' && raw.id === candidate.id)
      || normalizeLookup(candidate.name) === normalizeLookup(name)
    )
    const next = {
      ...item,
      id: stringOr(raw.id, match?.id),
      name: name || match?.name || 'Unknown Item',
      description: stringOr(raw.description, match?.description),
      qty: positiveInt(raw.qty, match?.quantity ?? 1),
      tags: Array.isArray(raw.tags) ? stringArray(raw.tags) : item.tags,
      damage: stringOr(raw.damage, match?.damage),
      effect: stringOr(raw.effect, match?.effect),
      charges: raw.charges === undefined && match?.charges !== undefined
        ? match.charges
        : typeof raw.charges === 'number'
          ? raw.charges
          : undefined,
      maxCharges: raw.maxCharges === undefined && match?.maxCharges !== undefined
        ? match.maxCharges
        : typeof raw.maxCharges === 'number'
          ? raw.maxCharges
          : undefined,
    }
    if (match) {
      if (!raw.id) repairs.push(`player.inventory.${match.name}.id:hydrated`)
      if (!raw.description) repairs.push(`player.inventory.${match.name}.description:hydrated`)
      if (raw.charges === undefined && match.charges !== undefined) repairs.push(`player.inventory.${match.name}.charges:hydrated`)
    }
    return next
  })

  const playbookTrait = playbook?.trait
  state.player.traits = state.player.traits.map((trait) => {
    const raw = asRecord(trait) ?? {}
    const name = stringOr(raw.name, playbookTrait?.name ?? 'Trait')
    const isPlaybookTrait = playbookTrait && normalizeLookup(name) === normalizeLookup(playbookTrait.name)
    const uses = asRecord(raw.uses)
    const maxUses = isPlaybookTrait ? playbookTrait.usesPerDay : positiveInt(uses?.max, 0)
    const currentUses = isPlaybookTrait
      ? positiveInt(uses?.current, playbookTrait.usesRemaining ?? maxUses)
      : positiveInt(uses?.current, maxUses)
    const next = {
      ...trait,
      id: stringOr(raw.id, isPlaybookTrait ? slug(playbookTrait.name) : undefined),
      name,
      description: stringOr(raw.description, isPlaybookTrait ? playbookTrait.description : undefined),
      uses: uses || maxUses > 0
        ? { current: Math.min(currentUses, Math.max(maxUses, currentUses)), max: Math.max(maxUses, currentUses) }
        : undefined,
    }
    if (isPlaybookTrait) {
      if (!raw.id) repairs.push(`player.traits.${playbookTrait.name}.id:hydrated`)
      if (!raw.description) repairs.push(`player.traits.${playbookTrait.name}.description:hydrated`)
    }
    return next
  })
}

function findPlaybookForState(state: Sf2State): CharacterClass | null {
  const genreId = state.meta.genreId || state.meta.setupSelection?.genreId
  if (!genreId) return null
  try {
    const config = getGenreConfig(genreId as Genre)
    const candidates = [
      ...(state.player.origin.id ? (config.playbooks?.[state.player.origin.id] ?? []) : []),
      ...(state.meta.setupSelection?.originId ? (config.playbooks?.[state.meta.setupSelection.originId] ?? []) : []),
      ...Object.values(config.playbooks ?? {}).flat(),
      ...config.classes,
    ]
    return candidates.find((candidate) =>
      candidate.id === state.player.class.id
      || candidate.name === state.player.class.name
      || candidate.id === state.meta.playbookId
    ) ?? null
  } catch {
    return null
  }
}

function normalizeLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
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
  meta.setupSelection = setupSelectionOr(meta.setupSelection) ?? fallback.setupSelection
  meta.hookId = stringOr(meta.hookId, fallback.hookId)
  meta.hookTitle = stringOr(meta.hookTitle, fallback.hookTitle)
  meta.genreId = stringOr(meta.genreId, fallback.genreId)
  meta.playbookId = stringOr(meta.playbookId, fallback.playbookId)
  meta.originId = stringOr(meta.originId, fallback.originId)
  meta.currentChapter = positiveInt(meta.currentChapter, fallback.currentChapter) as Sf2ChapterNumber
  meta.currentSceneId = stringOr(meta.currentSceneId, fallback.currentSceneId)
  meta.currentTimeLabel = stringOr(meta.currentTimeLabel, fallback.currentTimeLabel)
}

function setupSelectionOr(value: unknown): Sf2SetupSelection | undefined {
  const record = asRecord(value)
  if (!record) return undefined
  const genreId = stringOr(record.genreId, '')
  const originId = stringOr(record.originId, '')
  const playbookId = stringOr(record.playbookId, '')
  const hookId = stringOr(record.hookId, '')
  if (!genreId || !originId || !playbookId || !hookId) return undefined
  const characterName = stringOr(record.characterName, undefined)
  const calibrationAnswers = clampSf2SetupCalibrationAnswers(Array.isArray(record.calibrationAnswers)
    ? record.calibrationAnswers
        .map((entry) => {
          const answer = asRecord(entry)
          if (!answer) return null
          const question = stringOr(answer.question, '').trim()
          const response = stringOr(answer.answer, '').trim()
          const theme = stringOr(answer.theme, undefined)
          if (!question || !response) return null
          return {
            question,
            answer: response,
            ...(theme ? { theme } : {}),
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [])
  return {
    genreId,
    originId,
    playbookId,
    hookId,
    ...(characterName ? { characterName } : {}),
    ...(calibrationAnswers.length > 0 ? { calibrationAnswers } : {}),
  }
}

function normalizeCampaign(state: Sf2State, repairs: string[]): void {
  const campaign = state.campaign
  campaign.arcs = objectMap(campaign.arcs, 'campaign.arcs', repairs) as Sf2State['campaign']['arcs']
  campaign.procedures = objectMap(campaign.procedures, 'campaign.procedures', repairs) as NonNullable<Sf2State['campaign']['procedures']>
  campaign.threads = objectMap(campaign.threads, 'campaign.threads', repairs) as Sf2State['campaign']['threads']
  campaign.engines = objectMap(campaign.engines, 'campaign.engines', repairs) as Sf2State['campaign']['engines']
  campaign.decisions = objectMap(campaign.decisions, 'campaign.decisions', repairs) as Sf2State['campaign']['decisions']
  campaign.promises = objectMap(campaign.promises, 'campaign.promises', repairs) as Sf2State['campaign']['promises']
  campaign.obligations = objectMap(campaign.obligations, 'campaign.obligations', repairs) as Sf2State['campaign']['obligations']
  campaign.clues = objectMap(campaign.clues, 'campaign.clues', repairs) as Sf2State['campaign']['clues']
  campaign.beats = objectMap(campaign.beats, 'campaign.beats', repairs) as Sf2State['campaign']['beats']
  campaign.temporalAnchors = objectMap(campaign.temporalAnchors, 'campaign.temporalAnchors', repairs) as Sf2State['campaign']['temporalAnchors']
  campaign.npcs = objectMap(campaign.npcs, 'campaign.npcs', repairs) as Sf2State['campaign']['npcs']
  campaign.factions = objectMap(campaign.factions, 'campaign.factions', repairs) as Sf2State['campaign']['factions']
  campaign.locations = objectMap(campaign.locations, 'campaign.locations', repairs) as Sf2State['campaign']['locations']
  campaign.documents = objectMap(campaign.documents, 'campaign.documents', repairs) as Sf2State['campaign']['documents']
  campaign.pressureEvents = normalizePressureEvents(campaign.pressureEvents, state, repairs)
  campaign.floatingClueIds = stringArray(campaign.floatingClueIds)
  campaign.pivotalSceneIds = stringArray(campaign.pivotalSceneIds)
  campaign.lexicon = Array.isArray(campaign.lexicon) ? campaign.lexicon : []
  campaign.playstylePersonalization = normalizePlaystylePersonalization(
    campaign.playstylePersonalization,
    repairs
  )
  campaign.rulebookInterpretations = normalizeRulebookInterpretations(
    campaign.rulebookInterpretations,
    repairs
  )
  if (campaign.pendingRecoveryNotes !== undefined) campaign.pendingRecoveryNotes = stringArray(campaign.pendingRecoveryNotes)
  if (campaign.pendingCoherenceNotes !== undefined) campaign.pendingCoherenceNotes = stringArray(campaign.pendingCoherenceNotes)
  normalizeArcPlanShape(campaign.arcPlan, repairs)

  for (const [id, faction] of Object.entries(campaign.factions)) {
    campaign.factions[id] = normalizeFaction(id, faction, repairs)
  }

  for (const [id, npc] of Object.entries(campaign.npcs)) {
    campaign.npcs[id] = normalizeNpc(id, npc, state.meta.currentChapter, repairs)
  }

  for (const [id, thread] of Object.entries(campaign.threads)) {
    campaign.threads[id] = normalizeThread(id, thread, state.meta.currentChapter, repairs)
  }

  const procedures = campaign.procedures
  for (const [id, procedure] of Object.entries(procedures)) {
    procedures[id] = normalizeProcedureRuntime(
      { ...procedure, id },
      state.history.turns.length
    )
  }

  for (const [id, clue] of Object.entries(campaign.clues)) {
    campaign.clues[id] = normalizeClue(id, clue, state.meta.currentChapter, repairs)
  }

  compactRetrievalCueBucket(campaign.arcs, 'campaign.arcs', repairs)
  compactRetrievalCueBucket(campaign.decisions, 'campaign.decisions', repairs)
  compactRetrievalCueBucket(campaign.promises, 'campaign.promises', repairs)
  compactRetrievalCueBucket(campaign.obligations, 'campaign.obligations', repairs)
  compactRetrievalCueBucket(campaign.beats, 'campaign.beats', repairs)
  compactRetrievalCueBucket(campaign.temporalAnchors, 'campaign.temporalAnchors', repairs)
  compactRetrievalCueBucket(campaign.documents, 'campaign.documents', repairs)

  if (syncArcPlanStatusFromArcEntity(state)) {
    repairs.push('campaign.arcPlan.status:synced-from-arc')
  }

  for (const [id, location] of Object.entries(campaign.locations)) {
    campaign.locations[id] = normalizeLocation(location, {
      id,
      name: '',
      description: '',
    })
  }

  ensureReferencedFallbackOwners(state)
  rebuildOwnerThreadBackrefs(state)
}

function normalizeArcPlanShape(arcPlan: unknown, repairs: string[]): void {
  if (!isRecord(arcPlan)) return
  const legacyPressureEngines = Array.isArray(arcPlan.pressureEngines) && arcPlan.pressureEngines.length > 0
  if (!Array.isArray(arcPlan.arcThreadIds)) arcPlan.arcThreadIds = []
  if (!Array.isArray(arcPlan.latentArcQuestions)) arcPlan.latentArcQuestions = []
  const arcThreadIds = Array.isArray(arcPlan.arcThreadIds) ? arcPlan.arcThreadIds : []
  if (Array.isArray(arcPlan.durableForces)) {
    arcPlan.durableForces = arcPlan.durableForces.map((force) => {
      if (!isRecord(force)) return force
      if (typeof force.factionId !== 'string' || !force.factionId.trim()) {
        force.factionId = `faction_${slug(String(force.name ?? force.id ?? 'force'))}`
      }
      return force
    })
  }
  if (legacyPressureEngines && arcThreadIds.length === 0) {
    arcPlan.needsReauthor = true
    arcPlan.reauthorReason = 'legacy pressureEngines were dropped; arc pressure must be re-authored as anchored threads'
    delete arcPlan.pressureEngines
    repairs.push('campaign.arcPlan.pressureEngines:dropped-requires-arc-reauthor')
  }
}

function normalizeChapter(state: Sf2State, repairs: string[]): void {
  state.chapter.number = positiveInt(state.chapter.number, state.meta.currentChapter) as Sf2ChapterNumber
  state.chapter.title = stringOr(state.chapter.title, state.chapter.setup.title)
  state.chapter.currentSceneId = stringOr(state.chapter.currentSceneId, state.meta.currentSceneId)
  normalizeChapterSetupShape(state, repairs)
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
        playerTopicKeys: stringArray(r.playerTopicKeys),
        cashConditions: normalizeRevelationCashConditions(r.cashConditions),
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
  state.chapter.scaffolding.passiveAwarenessCues = normalizePassiveAwarenessCues(
    state.chapter.scaffolding.passiveAwarenessCues,
    repairs
  )
  state.chapter.scaffolding.passiveAwarenessDelivered = normalizePassiveAwarenessDelivered(
    state.chapter.scaffolding.passiveAwarenessDelivered
  )
  state.chapter.artifacts.opening.visibleNpcIds = stringArray(state.chapter.artifacts.opening.visibleNpcIds)
  state.chapter.artifacts.opening.visibleThreadIds = stringArray(state.chapter.artifacts.opening.visibleThreadIds)
  state.chapter.artifacts.opening.loreForOpening = Array.isArray(state.chapter.artifacts.opening.loreForOpening)
    ? state.chapter.artifacts.opening.loreForOpening
    : []
  state.chapter.artifacts.opening.sceneWarnings = stringArray(state.chapter.artifacts.opening.sceneWarnings)
  if (state.chapter.artifacts.playstyle !== undefined) {
    state.chapter.artifacts.playstyle = normalizeChapterPlaystyleArtifact(
      state.chapter.artifacts.playstyle,
      repairs
    )
  }
}

function normalizeChapterSetupShape(state: Sf2State, repairs: string[]): void {
  const frame = state.chapter.setup.frame as Sf2State['chapter']['setup']['frame'] & { chapterScope?: unknown }
  if (frame.chapterScope !== undefined) {
    delete frame.chapterScope
    repairs.push('chapter.setup.frame.chapterScope:removed')
  }

  const opening = state.chapter.setup.openingSceneSpec as Sf2State['chapter']['setup']['openingSceneSpec'] & { immediateChoice?: unknown }
  if (opening.immediateChoice !== undefined) {
    delete opening.immediateChoice
    repairs.push('chapter.setup.openingSceneSpec.immediateChoice:removed')
  }

  const antag = state.chapter.setup.antagonistField as Sf2State['chapter']['setup']['antagonistField'] & {
    sourceSystem?: unknown
  }
  const legacySourceSystem = stringOr(antag.sourceSystem, undefined)
  if (!antag.sourceFactionId && !antag.sourceFactionLabel && legacySourceSystem) {
    antag.sourceFactionLabel = legacySourceSystem
    repairs.push('chapter.setup.antagonistField.sourceSystem→sourceFactionLabel')
  }
  if (antag.sourceSystem !== undefined) {
    delete antag.sourceSystem
  }

  normalizeChapterArcLink(state, repairs)
}

function normalizeChapterArcLink(state: Sf2State, repairs: string[]): void {
  const arcLink = state.chapter.setup.arcLink as
    | (NonNullable<Sf2State['chapter']['setup']['arcLink']> & { threadLinks?: unknown; arcThreadIds?: unknown })
    | undefined
  if (!arcLink) return

  const activeThreadIds = state.chapter.setup.activeThreadIds
  const activeSet = new Set(activeThreadIds)
  const arcPlan = state.campaign.arcPlan
  const arcThreadIds = arcPlan?.id === arcLink.arcId ? arcPlan.arcThreadIds : []
  const arcSet = new Set(arcThreadIds)
  const legacyArcThreadIds = stringArray(arcLink.arcThreadIds)
  const rawLinks = Array.isArray(arcLink.threadLinks) ? arcLink.threadLinks : []
  const normalizedLinks = rawLinks
    .map((raw) => asRecord(raw))
    .filter((raw): raw is Record<string, unknown> => Boolean(raw))
    .map((raw) => ({
      activeThreadId: stringOr(raw.activeThreadId ?? raw.active_thread_id, ''),
      arcThreadId: stringOr(raw.arcThreadId ?? raw.arc_thread_id, ''),
      relation: normalizeArcThreadLinkRelation(raw.relation),
    }))
    .filter((link) => link.activeThreadId && link.arcThreadId)

  const links = [...normalizedLinks]
  const linkedActiveIds = new Set(
    links
      .filter((link) => activeSet.has(link.activeThreadId))
      .map((link) => link.activeThreadId)
  )
  const usedArcIds = new Set(
    links
      .filter((link) => arcSet.has(link.arcThreadId))
      .map((link) => link.arcThreadId)
  )

  if (arcThreadIds.length === 0) {
    arcLink.threadLinks = normalizedLinks
    arcLink.arcThreadIds = legacyArcThreadIds.length > 0
      ? legacyArcThreadIds
      : [...new Set(normalizedLinks.map((link) => link.arcThreadId))]
    return
  }

  if (links.length === 0 && arcThreadIds.length > 0) {
    for (const id of legacyArcThreadIds) {
      if (activeSet.has(id) && arcSet.has(id) && !linkedActiveIds.has(id)) {
        links.push({ activeThreadId: id, arcThreadId: id, relation: 'instantiates' })
        linkedActiveIds.add(id)
        usedArcIds.add(id)
      }
    }
    for (const id of legacyArcThreadIds) {
      if (activeSet.has(id) && !arcSet.has(id) && !linkedActiveIds.has(id)) {
        const arcThreadId = arcThreadIds.find((candidate) => !usedArcIds.has(candidate)) ?? arcThreadIds[0]
        if (arcThreadId) {
          links.push({ activeThreadId: id, arcThreadId, relation: 'instantiates' })
          linkedActiveIds.add(id)
          usedArcIds.add(arcThreadId)
        }
      }
    }
  }

  if (arcThreadIds.length > 0) {
    for (const id of activeThreadIds) {
      if (linkedActiveIds.has(id)) continue
      const arcThreadId = arcThreadIds.find((candidate) => !usedArcIds.has(candidate)) ?? arcThreadIds[0]
      if (!arcThreadId) continue
      links.push({ activeThreadId: id, arcThreadId, relation: 'instantiates' })
      linkedActiveIds.add(id)
      usedArcIds.add(arcThreadId)
    }
  }

  arcLink.threadLinks = links
  arcLink.arcThreadIds = [...new Set(links.map((link) => link.arcThreadId).filter((id) => arcSet.has(id)))]
  if (normalizedLinks.length === 0 && links.length > 0) {
    repairs.push('chapter.setup.arcLink.threadLinks:derived')
  }
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

  const procedures = state.campaign.procedures ?? {}
  state.campaign.procedures = procedures
  world.activeProcedureIds = stringArray(world.activeProcedureIds)
    .filter((id) => Boolean(procedures[id]))
  world.operationRuntimeId = stringOr(world.operationRuntimeId, undefined)
  if (world.operationRuntimeId && !procedures[world.operationRuntimeId]) {
    repairs.push(`world.operationRuntimeId:${world.operationRuntimeId}:cleared-missing`)
    world.operationRuntimeId = undefined
  }
  migrateLegacyWorldOperation(state, repairs)
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

function migrateLegacyWorldOperation(state: Sf2State, repairs: string[]): void {
  const worldOperation = state.world.operation
  const hasLegacyRuntime = Boolean(worldOperation?.phase || worldOperation?.status)
  if (!hasLegacyRuntime || state.world.operationRuntimeId) return

  const procedures = state.campaign.procedures ?? {}
  state.campaign.procedures = procedures
  const id = 'procedure_operation_current'
  const existing = procedures[id]
  if (existing) {
    state.world.operationRuntimeId = id
    if (!state.world.activeProcedureIds?.includes(id) && isActiveSf2Procedure(existing)) {
      state.world.activeProcedureIds = [...(state.world.activeProcedureIds ?? []), id]
    }
    return
  }

  const plan = state.campaign.operationPlan
  const runtime = normalizeProcedureRuntime({
    id,
    kind: 'operation',
    label: plan?.name ?? (plan?.target ? `Operation: ${plan.target}` : 'Operation'),
    status: worldOperation?.status === 'resolved' || plan?.status === 'resolved'
      ? 'resolved'
      : worldOperation?.status === 'abandoned' || plan?.status === 'abandoned'
        ? 'abandoned'
        : worldOperation?.status === 'paused' || plan?.status === 'paused'
          ? 'paused'
          : 'active',
    phase: worldOperation?.phase as Parameters<typeof normalizeProcedureRuntime>[0]['phase'],
    objective: plan?.target,
    facts: [],
    constraints: [],
    affordances: [],
    complications: [],
    contributions: [],
    linkedRefs: [],
    createdAtTurn: plan?.lastUpdatedTurn ?? state.history.turns.length,
    updatedAtTurn: state.history.turns.length,
  }, state.history.turns.length)
  procedures[id] = runtime
  state.world.operationRuntimeId = id
  if (isActiveSf2Procedure(runtime)) {
    state.world.activeProcedureIds = [...new Set([...(state.world.activeProcedureIds ?? []), id])]
  }
  repairs.push('world.operation→campaign.procedures.procedure_operation_current')
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
  currentChapter: Sf2ChapterNumber,
  repairs: string[]
): Sf2Npc {
  const npc = raw
  npc.id = stringOr(npc.id, id)
  npc.name = stringOr(npc.name, npc.id)
  npc.affiliation = stringOr(npc.affiliation, '')
  npc.role = stringOr(npc.role, 'npc')
  npc.status = oneOf<Sf2NpcStatus>(npc.status, ['alive', 'dead', 'gone', 'unknown'], 'unknown')
  npc.disposition = oneOf<Sf2DispositionTier>(
    npc.disposition,
    ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
    'neutral'
  )
  npc.identity = {
    keyFacts: stringArray(npc.identity?.keyFacts).slice(0, 3),
    profileFacts: stringArray(npc.identity?.profileFacts).slice(0, 3),
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
  npc.retrievalCue = normalizeRetrievalCue(npc.retrievalCue, npc.name, `campaign.npcs.${id}.retrievalCue`, repairs)
  npc.chapterCreated = positiveInt(npc.chapterCreated, currentChapter) as Sf2ChapterNumber
  npc.signatureLines = stringArray(npc.signatureLines)
  return npc
}

function normalizeFaction(id: string, raw: Sf2Faction, repairs: string[]): Sf2Faction {
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
  faction.retrievalCue = normalizeRetrievalCue(faction.retrievalCue, faction.name, `campaign.factions.${id}.retrievalCue`, repairs)
  return faction
}

function normalizeThread(
  id: string,
  raw: Sf2Thread,
  currentChapter: Sf2ChapterNumber,
  repairs: string[]
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
  thread.retrievalCue = normalizeRetrievalCue(thread.retrievalCue, thread.title, `campaign.threads.${id}.retrievalCue`, repairs)
  thread.chapterCreated = positiveInt(thread.chapterCreated, currentChapter) as Sf2ChapterNumber
  thread.loadBearing = Boolean(thread.loadBearing)
  thread.resolutionMode = oneOf<Sf2ThreadResolutionMode>(thread.resolutionMode, ['investigation', 'pressure'], 'pressure')
  thread.resolutionGates = normalizeThreadResolutionGates(thread.resolutionGates)
  thread.progressEvents = normalizeThreadProgressEvents(thread.progressEvents)
  thread.tensionHistory = Array.isArray(thread.tensionHistory) ? thread.tensionHistory : []
  return thread
}

function normalizeClue(
  id: string,
  raw: Sf2Clue,
  currentChapter: Sf2ChapterNumber,
  repairs: string[]
): Sf2Clue {
  const clue = raw
  clue.id = stringOr(clue.id, id)
  clue.title = stringOr(clue.title, clue.id)
  clue.category = 'clue'
  clue.status = oneOf(clue.status, ['floating', 'attached', 'consumed'], 'floating')
  clue.anchoredTo = stringArray(clue.anchoredTo)
  clue.evidenceKind = oneOf<Sf2ClueEvidenceKind>(
    clue.evidenceKind,
    ['document', 'testimony', 'trace', 'contradiction', 'diagnostic', 'circumstantial'],
    'circumstantial'
  )
  clue.content = stringOr(clue.content, clue.title)
  clue.evidenceQuestion = stringOr(clue.evidenceQuestion, clue.retrievalCue || clue.content)
  clue.retrievalCue = normalizeRetrievalCue(clue.retrievalCue, clue.content, `campaign.clues.${id}.retrievalCue`, repairs)
  clue.chapterCreated = positiveInt(clue.chapterCreated, currentChapter) as Sf2ChapterNumber
  clue.turn = numberOr(clue.turn, 0)
  return clue
}

function normalizePlaystylePersonalization(
  raw: unknown,
  repairs: string[]
): Sf2PlaystylePersonalizationState {
  const record = asRecord(raw)
  if (!record) {
    repairs.push('campaign.playstylePersonalization:defaulted')
    return { liveEnabled: true, artifacts: [], lastStatus: { status: 'enabled' } }
  }
  const artifacts = Array.isArray(record.artifacts)
    ? record.artifacts.map((artifact) => normalizeChapterPlaystyleArtifact(artifact, repairs))
    : []
  const rollingProfile = normalizePlaystyleRollingProfile(
    record.rollingProfile ?? record.rolling_profile ?? record.profile
  )
  const statusRecord = asRecord(record.lastStatus ?? record.last_status)
  const liveEnabled = record.liveEnabled === false || record.enabled === false ? false : true
  const status = oneOf(
    statusRecord?.status,
    ['enabled', 'disabled', 'skipped', 'failed_open'] as const,
    liveEnabled ? 'enabled' : 'disabled'
  )
  return {
    liveEnabled,
    artifacts,
    ...(rollingProfile ? { rollingProfile } : {}),
    lastStatus: {
      status,
      chapter: statusRecord?.chapter === undefined
        ? undefined
        : positiveInt(statusRecord.chapter, 0) as Sf2ChapterNumber,
      turn: statusRecord?.turn === undefined ? undefined : positiveInt(statusRecord.turn, 0),
      reason: stringOr(statusRecord?.reason, undefined),
    },
  }
}

function normalizeChapterPlaystyleArtifact(
  raw: unknown,
  repairs: string[]
): Sf2ChapterPlaystyleArtifact {
  const record = asRecord(raw)
  if (!record) {
    repairs.push('playstyleArtifact:defaulted-invalid')
  }
  const source = record ?? {}
  const rawKnobs = asRecord(source.knobs) ?? source
  const artifactEvidence = source.evidence
  const chapter = positiveInt(source.chapter, 0) as Sf2ChapterNumber
  return {
    chapter,
    synthesizedAtTurn: positiveInt(source.synthesizedAtTurn ?? source.synthesized_at_turn, 0),
    summary: stringOr(source.summary, ''),
    informationEconomy: normalizePlaystyleKnob(rawKnobs.informationEconomy ?? rawKnobs.information_economy, chapter, artifactEvidence),
    decisionArchitecture: normalizePlaystyleKnob(rawKnobs.decisionArchitecture ?? rawKnobs.decision_architecture, chapter, artifactEvidence),
    consequenceTiming: normalizePlaystyleKnob(rawKnobs.consequenceTiming ?? rawKnobs.consequence_timing, chapter, artifactEvidence),
    emotionalRegister: normalizePlaystyleKnob(rawKnobs.emotionalRegister ?? rawKnobs.emotional_register, chapter, artifactEvidence),
    npcLegibility: normalizePlaystyleKnob(rawKnobs.npcLegibility ?? rawKnobs.npc_legibility, chapter, artifactEvidence),
    errorTolerance: normalizePlaystyleKnob(rawKnobs.errorTolerance ?? rawKnobs.error_tolerance, chapter, artifactEvidence),
    workedPatterns: normalizePlaystylePatterns(source.workedPatterns ?? source.worked_patterns, chapter),
    avoidPatterns: normalizePlaystylePatterns(source.avoidPatterns ?? source.avoid_patterns, chapter),
  }
}

function normalizePlaystyleKnob(
  raw: unknown,
  chapter: Sf2ChapterNumber,
  fallbackEvidence?: unknown
): Sf2ChapterPlaystyleArtifact['informationEconomy'] {
  if (typeof raw === 'string') {
    return {
      value: raw,
      guidance: raw,
      confidence: 'low',
      evidence: normalizePlaystyleEvidence(fallbackEvidence, chapter),
    }
  }
  const record = asRecord(raw)
  if (!record) {
    return { value: '', guidance: '', confidence: 'low', evidence: [] }
  }
  return {
    value: stringOr(record.value ?? record.summary, ''),
    guidance: stringOr(record.guidance ?? record.summary, ''),
    confidence: oneOf(record.confidence, PATCH_CONFIDENCES, 'low'),
    evidence: normalizePlaystyleEvidence(record.evidence ?? fallbackEvidence, chapter),
  }
}

function normalizePlaystylePatterns(raw: unknown, chapter: Sf2ChapterNumber): Sf2ChapterPlaystyleArtifact['workedPatterns'] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const record = asRecord(entry)
      if (!record) return null
      const pattern = stringOr(record.pattern, '').trim()
      const guidance = stringOr(record.guidance, '').trim()
      if (!pattern || !guidance) return null
      return {
        pattern,
        guidance,
        evidence: normalizePlaystyleEvidence(record.evidence, chapter),
      }
    })
    .filter((entry): entry is Sf2ChapterPlaystyleArtifact['workedPatterns'][number] => Boolean(entry))
    .slice(0, 6)
}

function normalizePlaystyleEvidence(raw: unknown, fallbackChapter: Sf2ChapterNumber): Sf2PlaystyleEvidenceRef[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const record = asRecord(entry)
      if (!record) return null
      const excerpt = stringOr(record.excerpt ?? record.quote, '').trim()
      if (!excerpt) return null
      const evidence: Sf2PlaystyleEvidenceRef = {
        kind: oneOf(
          record.kind,
          ['turn', 'scene_summary', 'chapter_artifact', 'setup_rationale'] as const,
          'turn'
        ),
        chapter: positiveInt(record.chapter, fallbackChapter) as Sf2ChapterNumber,
        excerpt: excerpt.slice(0, 240),
      }
      if (record.turnIndex !== undefined || record.turn_index !== undefined) {
        evidence.turnIndex = positiveInt(record.turnIndex ?? record.turn_index, 0)
      }
      const sceneId = stringOr(record.sceneId ?? record.scene_id, undefined)
      if (sceneId) evidence.sceneId = sceneId
      if (record.summaryIndex !== undefined || record.summary_index !== undefined) {
        evidence.summaryIndex = positiveInt(record.summaryIndex ?? record.summary_index, 0)
      }
      const note = stringOr(record.note, undefined)
      if (note) evidence.note = note
      return evidence
    })
    .filter((entry): entry is Sf2PlaystyleEvidenceRef => Boolean(entry))
    .slice(0, 12)
}

function normalizePlaystyleRollingProfile(raw: unknown): Sf2PlaystylePersonalizationState['rollingProfile'] {
  const record = asRecord(raw)
  if (!record) return undefined
  return {
    updatedAtChapter: positiveInt(record.updatedAtChapter ?? record.updated_at_chapter, 0) as Sf2ChapterNumber,
    updatedAtTurn: positiveInt(record.updatedAtTurn ?? record.updated_at_turn, 0),
    evidenceChapters: stringArray(record.evidenceChapters ?? record.evidence_chapters)
      .map((value) => positiveInt(value, 0) as Sf2ChapterNumber)
      .filter((chapter) => chapter > 0),
    informationEconomy: stringOr(record.informationEconomy ?? record.information_economy, ''),
    decisionArchitecture: stringOr(record.decisionArchitecture ?? record.decision_architecture, ''),
    consequenceTiming: stringOr(record.consequenceTiming ?? record.consequence_timing, ''),
    emotionalRegister: stringOr(record.emotionalRegister ?? record.emotional_register, ''),
    npcLegibility: stringOr(record.npcLegibility ?? record.npc_legibility, ''),
    errorTolerance: stringOr(record.errorTolerance ?? record.error_tolerance, ''),
    workedPatterns: stringArray(record.workedPatterns ?? record.worked_patterns).slice(0, 8),
    avoidPatterns: stringArray(record.avoidPatterns ?? record.avoid_patterns).slice(0, 8),
    revisionNotes: stringArray(record.revisionNotes ?? record.revision_notes).slice(0, 8),
  }
}

function normalizeRulebookInterpretations(
  raw: unknown,
  repairs: string[]
): Sf2CampaignRulebookInterpretation[] {
  if (raw === undefined) return []
  const rawRecord = asRecord(raw)
  const rawEntries = Array.isArray(raw)
    ? raw
    : Array.isArray(rawRecord?.entries)
      ? rawRecord.entries as unknown[]
      : null
  if (!rawEntries) {
    repairs.push('campaign.rulebookInterpretations:[]')
    return []
  }
  return rawEntries
    .map((entry, index) => {
      const record = asRecord(entry)
      if (!record) return null
      const ruleId = stringOr(record.ruleId ?? record.rule_id, '').trim()
      const ruleName = stringOr(record.ruleName ?? record.rule_name, ruleId).trim()
      const reading = stringOr(
        record.campaignSpecificReading ?? record.campaign_specific_reading ?? record.campaignReading,
        ''
      ).trim()
      if (!ruleId || !ruleName || !reading) {
        repairs.push(`campaign.rulebookInterpretations.${index}:dropped-missing-contract`)
        return null
      }
      const setupRationale = stringOr(record.setupRationale ?? record.setup_rationale, undefined)
      const playEvidence = normalizePlaystyleEvidence(record.playEvidence ?? record.play_evidence ?? record.evidence, 0)
      const hasRationale = Boolean(setupRationale?.trim()) || playEvidence.length > 0
      return {
        id: stringOr(record.id, `rule_interp_${slug(ruleId || ruleName)}`),
        ruleId,
        ruleName,
        genericRuleCategory: stringOr(record.genericRuleCategory ?? record.generic_rule_category ?? record.genericCategory, ''),
        campaignSpecificReading: reading,
        triggers: stringArray(record.triggers).slice(0, 8),
        costs: stringArray(record.costs).slice(0, 8),
        permissions: stringArray(record.permissions).slice(0, 8),
        taboos: stringArray(record.taboos).slice(0, 8),
        excludedExamples: stringArray(record.excludedExamples ?? record.excluded_examples).slice(0, 8),
        ...(setupRationale ? { setupRationale } : {}),
        playEvidence,
        revisionNotes: stringArray(record.revisionNotes ?? record.revision_notes).slice(0, 8),
        promptGuidanceEnabled: (record.promptGuidanceEnabled ?? record.prompt_guidance_enabled) === false
          ? false
          : hasRationale,
        enforcementEnabled: Boolean(record.enforcementEnabled ?? record.enforcement_enabled) && hasRationale,
      }
    })
    .filter((entry): entry is Sf2CampaignRulebookInterpretation => Boolean(entry))
}

function normalizePassiveAwarenessCues(
  raw: unknown,
  repairs: string[]
): Sf2PassiveAwarenessCue[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    repairs.push('chapter.scaffolding.passiveAwarenessCues:[]')
    return []
  }

  const seen = new Set<string>()
  const cues: Sf2PassiveAwarenessCue[] = []
  for (const item of raw) {
    const record = asRecord(item)
    if (!record) {
      repairs.push('chapter.scaffolding.passiveAwarenessCues:dropped-invalid')
      continue
    }

    const id = stringOr(record.id, '')
    const surfaceText = stringOr(record.surfaceText ?? record.surface_text, '')
    const passiveDc = clamp(positiveInt(record.passiveDc ?? record.passive_dc, 12), 10, 20)
    if (!id || seen.has(id) || !surfaceText) {
      repairs.push('chapter.scaffolding.passiveAwarenessCues:dropped-keyless-or-empty')
      continue
    }

    seen.add(id)
    cues.push({
      id,
      kind: oneOf<Sf2PassiveAwarenessKind>(
        record.kind,
        PASSIVE_AWARENESS_KINDS,
        'environmental_detail'
      ),
      passiveDc,
      surfaceText,
      followupQuestion: stringOr(record.followupQuestion ?? record.followup_question, undefined) || undefined,
      sceneId: stringOr(record.sceneId ?? record.scene_id, undefined) || undefined,
      locationId: stringOr(record.locationId ?? record.location_id, undefined) || undefined,
      npcId: stringOr(record.npcId ?? record.npc_id, undefined) || undefined,
      threadId: stringOr(record.threadId ?? record.thread_id, undefined) || undefined,
      source: oneOf(record.source, ['author', 'runtime', 'fixture'], 'runtime'),
    })
  }

  if (cues.length !== raw.length) {
    repairs.push(`chapter.scaffolding.passiveAwarenessCues:kept-${cues.length}-of-${raw.length}`)
  }
  return cues
}

function normalizePassiveAwarenessDelivered(
  raw: unknown
): Record<string, { sceneId: string; turnIndex: number }> {
  if (!isRecord(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .map(([cueId, value]) => {
        const record = asRecord(value)
        if (!record) return null
        const sceneId = stringOr(record.sceneId ?? record.scene_id, '')
        if (!cueId || !sceneId) return null
        return [cueId, { sceneId, turnIndex: positiveInt(record.turnIndex ?? record.turn_index, 0) }] as const
      })
      .filter((entry): entry is readonly [string, { sceneId: string; turnIndex: number }] => Boolean(entry))
  )
}

function compactRetrievalCueBucket(
  bucket: Record<string, unknown>,
  bucketPath: string,
  repairs: string[]
): void {
  for (const [id, value] of Object.entries(bucket)) {
    if (!isRecord(value) || !('retrievalCue' in value)) continue
    const fallback = value.title ?? value.name ?? value.summary ?? value.text ?? value.content
    value.retrievalCue = normalizeRetrievalCue(
      value.retrievalCue,
      fallback,
      `${bucketPath}.${id}.retrievalCue`,
      repairs
    )
  }
}

function normalizeRetrievalCue(
  value: unknown,
  fallback: unknown,
  repairPath: string,
  repairs: string[]
): string {
  const raw = stringOr(value, typeof fallback === 'string' ? fallback : '')
  const compact = compactRetrievalCue(raw, fallback)
  if (raw !== compact) repairs.push(`${repairPath}:compacted`)
  return compact
}

function normalizePressureEvents(
  raw: unknown,
  state: Sf2State,
  repairs: string[]
): Sf2PressureEvent[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    repairs.push('campaign.pressureEvents:[]')
    return []
  }

  const seen = new Set<string>()
  const normalized: Sf2PressureEvent[] = []
  for (const item of raw) {
    const record = asRecord(item)
    if (!record) {
      repairs.push('campaign.pressureEvents:dropped-invalid')
      continue
    }
    const idempotencyKey = stringOr(record.idempotencyKey ?? record.idempotency_key, '')
    if (!idempotencyKey || seen.has(idempotencyKey)) {
      repairs.push('campaign.pressureEvents:dropped-duplicate-or-keyless')
      continue
    }
    const targetThreadIds = stringArray(record.targetThreadIds ?? record.target_thread_ids)
      .filter((id) => Boolean(state.campaign.threads[id]))
    if (targetThreadIds.length === 0) {
      repairs.push(`campaign.pressureEvents:${idempotencyKey}:dropped-missing-thread`)
      continue
    }
    const humanRaw = asRecord(record.humanConsequence ?? record.human_consequence)
    if (!humanRaw) {
      repairs.push(`campaign.pressureEvents:${idempotencyKey}:dropped-missing-human-consequence`)
      continue
    }
    const whoPays = stringOr(humanRaw.whoPays ?? humanRaw.who_pays, '')
    const whoGainsLeverage = stringOr(humanRaw.whoGainsLeverage ?? humanRaw.who_gains_leverage, '')
    if (!isKnownPressureActor(state, whoPays)) {
      repairs.push(`campaign.pressureEvents:${idempotencyKey}:dropped-unknown-who-pays`)
      continue
    }
    const amountRaw = Number(record.amount)
    const severityRaw = record.severity
    const severity = PRESSURE_EVENT_SEVERITIES.includes(severityRaw as NonNullable<Sf2PressureEvent['severity']>)
      ? severityRaw as NonNullable<Sf2PressureEvent['severity']>
      : undefined
    const event: Sf2PressureEvent = {
      id: stringOr(record.id, `pressure_event_${normalized.length + 1}`),
      turn: positiveInt(record.turn, 0),
      source: oneOf<Sf2PressureEvent['source']>(
        record.source,
        PRESSURE_EVENT_SOURCES,
        'decision'
      ),
      targetThreadIds,
      scope: oneOf<Sf2PressureEvent['scope']>(
        record.scope,
        PRESSURE_EVENT_SCOPES,
        'chapter_local'
      ),
      evidenceQuote: stringOr(record.evidenceQuote ?? record.evidence_quote, ''),
      humanConsequence: {
        whoPays: whoPays as Sf2PressureEvent['humanConsequence']['whoPays'],
        whoGainsLeverage: isKnownPressureActor(state, whoGainsLeverage)
          ? whoGainsLeverage
          : undefined,
        whatGetsHarder: stringOr(humanRaw.whatGetsHarder ?? humanRaw.what_gets_harder, ''),
        whatIsAtRisk: stringOr(humanRaw.whatIsAtRisk ?? humanRaw.what_is_at_risk, ''),
        visiblePressure: stringOr(humanRaw.visiblePressure ?? humanRaw.visible_pressure, ''),
      },
      idempotencyKey,
    }
    if (Number.isFinite(amountRaw)) event.amount = amountRaw
    if (severity) event.severity = severity
    if (
      !event.evidenceQuote ||
      !event.humanConsequence.whatGetsHarder ||
      !event.humanConsequence.whatIsAtRisk ||
      !event.humanConsequence.visiblePressure
    ) {
      repairs.push(`campaign.pressureEvents:${idempotencyKey}:dropped-incomplete`)
      continue
    }
    seen.add(idempotencyKey)
    normalized.push(event)
  }

  if (normalized.length > PRESSURE_EVENT_LIMIT) {
    repairs.push(`campaign.pressureEvents:capped-${normalized.length}->${PRESSURE_EVENT_LIMIT}`)
  }
  return normalized.slice(-PRESSURE_EVENT_LIMIT)
}

function isKnownPressureActor(state: Sf2State, id: string): boolean {
  if (id === 'the PC') return true
  if (!id) return false
  return Boolean(
    state.campaign.npcs[id] ||
      state.campaign.factions[id] ||
      state.campaign.threads[id] ||
      state.campaign.arcs[id] ||
      state.campaign.documents?.[id] ||
      state.campaign.clues[id] ||
      state.campaign.decisions[id] ||
      state.campaign.promises[id] ||
      state.campaign.obligations?.[id]
  )
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
    aliases: Array.isArray(record.aliases) ? stringArray(record.aliases) : fallback.aliases,
    areaNodes: Array.isArray(record.areaNodes)
      ? record.areaNodes.map((node, index) => normalizeAreaNode(node, `${stringOr(record.id, fallback.id)}_area_${index + 1}`))
      : fallback.areaNodes,
  }
}

function normalizeAreaNode(raw: unknown, fallbackId: string) {
  const record = asRecord(raw)
  if (!record) return { id: fallbackId, name: fallbackId.replace(/_/g, ' ') }
  return {
    id: stringOr(record.id, fallbackId),
    name: stringOr(record.name, fallbackId.replace(/_/g, ' ')),
    description: stringOr(record.description, undefined),
    aliases: Array.isArray(record.aliases) ? stringArray(record.aliases) : undefined,
    atmosphericConditions: Array.isArray(record.atmosphericConditions)
      ? stringArray(record.atmosphericConditions)
      : undefined,
    locked: typeof record.locked === 'boolean' ? record.locked : undefined,
    exitIds: Array.isArray(record.exitIds) ? stringArray(record.exitIds) : undefined,
    routeConstraints: Array.isArray(record.routeConstraints) ? stringArray(record.routeConstraints) : undefined,
    hazards: Array.isArray(record.hazards) ? stringArray(record.hazards) : undefined,
    ambientAlertness: stringOr(record.ambientAlertness, undefined),
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

  for (const location of Object.values(locations)) {
    const flattened = parseFlattenedLocationAlias(state, location)
    if (!flattened || flattened.location.id === location.id) continue
    const merged = mergeLocationIntoExisting(flattened.location, {
      aliases: [flattened.alias],
      areaNodes: [flattened.areaNode],
    })
    locations[merged.id] = merged
    delete locations[location.id]
    replaceLocationReferences(state, location.id, merged)
    state.world.currentPosition = {
      locationId: merged.id,
      areaNodeId: flattened.areaNode.id,
    }
    repairs.push(`campaign.locations:${location.id}→${merged.id}/${flattened.areaNode.id}`)
  }

  const groups: Sf2Location[][] = []
  for (const location of Object.values(locations)) {
    if (!locationSemanticKey(location)) continue
    const group = groups.find((candidate) =>
      candidate.some((existing) => locationsSemanticallyEquivalent(existing, location))
    )
    if (group) {
      group.push(location)
    } else {
      groups.push([location])
    }
  }

  for (const group of groups) {
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
  if (!state.world.currentPosition || !locations[state.world.currentPosition.locationId]) {
    state.world.currentPosition = { locationId: state.world.currentLocation.id }
  }
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

function normalizeArcThreadLinkRelation(value: unknown): 'instantiates' | 'pressures' | 'complicates' | 'resolves' {
  return value === 'pressures' || value === 'complicates' || value === 'resolves'
    ? value
    : 'instantiates'
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'force'
}

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function positiveInt(value: unknown, fallback: number): number {
  return Math.max(0, Math.round(numberOr(value, fallback)))
}

function normalizeRevelationCashConditions(value: unknown): Sf2RevelationCashConditions | undefined {
  const raw = asRecord(value)
  if (!raw) return undefined
  const minTension = asRecord(raw.minTension) ?? asRecord(raw.min_tension)
  const normalized: Sf2RevelationCashConditions = {}
  if (typeof raw.playerPressesTopic === 'boolean') normalized.playerPressesTopic = raw.playerPressesTopic
  if (typeof raw.player_presses_topic === 'boolean') normalized.playerPressesTopic = raw.player_presses_topic
  if (raw.minTurn !== undefined || raw.min_turn !== undefined) {
    normalized.minTurn = positiveInt(raw.minTurn ?? raw.min_turn, 0)
  }
  const threadId = stringOr(minTension?.threadId ?? minTension?.thread_id, '')
  if (threadId) {
    normalized.minTension = {
      threadId,
      value: clamp(numberOr(minTension?.value, 0), 0, 10),
    }
  }
  const contexts = stringArray(raw.requiresContext ?? raw.requires_context)
    .filter((context): context is Sf2RevealContext => REVEAL_CONTEXTS.includes(context as Sf2RevealContext))
  if (contexts.length > 0) normalized.requiresContext = contexts
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

const REVEAL_CONTEXTS: Sf2RevealContext[] = [
  'crisis_of_trust',
  'private_pressure',
  'documentary_surface',
  'confession',
  'accusation',
  'forced_disclosure',
  'inadvertent',
]

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
