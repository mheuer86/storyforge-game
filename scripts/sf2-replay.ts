import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { applyMechanicalEffectLocally } from '../lib/sf2/replay/mechanics'
import { buildScenePacket } from '../lib/sf2/retrieval/scene-packet'
import {
  SF2_SCHEMA_VERSION,
  type Sf2ArchivistPatch,
  type Sf2NarratorAnnotation,
  type Sf2State,
} from '../lib/sf2/types'
import { applyArchivistPatch, type ApplyPatchResult } from '../lib/sf2/validation/apply-patch'

interface ReplayFixture {
  schema: 'sf2-replay-fixture/v1'
  name: string
  source?: Record<string, unknown>
  input: {
    stateBefore?: Sf2State
    stateBeforePreset?: 'minimal'
    stateBeforePatch?: Record<string, unknown>
    turnIndex?: number
    playerInput: string
    isInitial?: boolean
    narrator: {
      prose: string
      annotation?: Record<string, unknown> | null
      mechanicalEffects?: Array<Record<string, unknown>>
    }
    archivist?: {
      patch?: Partial<Sf2ArchivistPatch> | null
    } | null
  }
  expected?: {
    presentNpcIdsIncludes?: string[]
    presentNpcIdsExcludes?: string[]
    scenePacketCastIncludes?: string[]
    scenePacketCastExcludes?: string[]
    npcNamesInclude?: string[]
    npcNamesAbsent?: string[]
    npcIdsIncludes?: string[]
    npcIdentityIncludes?: Array<{ npcId: string; pronoun?: string; age?: string }>
    temporalAnchorsInclude?: Array<{ anchorId: string; kind?: string; label?: string; anchorText?: string }>
    scenePacketTemporalAnchorsInclude?: string[]
    currentSceneId?: string | null
    currentTimeLabel?: string | null
    currentLocationId?: string | null
    sceneBundleCacheCleared?: boolean | null
    invariantEventsInclude?: string[]
    archivistAcceptedRefs?: string[]
    archivistRejectedRefs?: string[]
    driftIncludes?: Array<{ kind: string; detailIncludes?: string }>
    sensitiveDisclosureGaps?: Array<{ npcId: string; terms: string[] }>
  }
}

interface ReplayResult {
  fixture: ReplayFixture
  path: string
  failures: string[]
}

type JsonRecord = Record<string, unknown>

function main(): void {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: npm run sf2:replay -- <fixture-file-or-directory>')
    process.exit(2)
  }

  const paths = collectFixturePaths(resolve(process.cwd(), target))
  if (paths.length === 0) {
    console.error(`No replay fixtures found at ${target}`)
    process.exit(2)
  }

  const results = paths.map(runFixturePath)
  for (const result of results) {
    const label = `${result.fixture.name} (${result.path})`
    if (result.failures.length === 0) {
      console.log(`PASS ${label}`)
    } else {
      console.log(`FAIL ${label}`)
      for (const failure of result.failures) console.log(`  - ${failure}`)
    }
  }

  const failed = results.filter((r) => r.failures.length > 0).length
  console.log(`\n${results.length - failed}/${results.length} replay fixtures passed`)
  process.exit(failed === 0 ? 0 : 1)
}

function collectFixturePaths(target: string): string[] {
  if (!existsSync(target)) return []
  const stat = statSync(target)
  if (stat.isFile()) return target.endsWith('.json') ? [target] : []
  return readdirSync(target)
    .flatMap((entry) => collectFixturePaths(resolve(target, entry)))
    .filter((path) => path.endsWith('.json'))
    .sort()
}

function runFixturePath(path: string): ReplayResult {
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as ReplayFixture
  const failures: string[] = []

  if (fixture.schema !== 'sf2-replay-fixture/v1') {
    return { fixture, path, failures: [`unsupported schema ${String(fixture.schema)}`] }
  }

  const stateBefore = buildStateBefore(fixture)
  const turnIndex = fixture.input.turnIndex ?? stateBefore.history.turns.length
  const annotation = fixture.input.narrator.annotation ?? null
  const mechanicalEffects = fixture.input.narrator.mechanicalEffects ?? extractMechanicalEffects(annotation)
  const patch = normalizePatch(fixture.input.archivist?.patch ?? null, turnIndex + 1)

  const stateWithTurnLogged: Sf2State = structuredClone(stateBefore)
  stateWithTurnLogged.history.turns.push({
    index: turnIndex,
    chapter: stateWithTurnLogged.meta.currentChapter,
    playerInput: fixture.input.isInitial ? '' : fixture.input.playerInput,
    narratorProse: fixture.input.narrator.prose,
    narratorAnnotation: annotation ? normalizeAnnotation(annotation) : undefined,
    narratorAnnotationRaw: annotation ?? undefined,
    timestamp: 'replay',
  })
  stateWithTurnLogged.history.recentTurns = stateWithTurnLogged.history.turns.slice(-6)
  stateWithTurnLogged.campaign.pendingRecoveryNotes = undefined
  stateWithTurnLogged.campaign.pendingCoherenceNotes = undefined

  const patchResult = applyArchivistPatch(
    stateWithTurnLogged,
    patch,
    stateWithTurnLogged.meta.currentChapter
  )

  const stateAfter: Sf2State = structuredClone(patchResult.nextState)
  const invariantEvents: Array<{ kind: string; at: number; data: unknown }> = []
  for (const effect of mechanicalEffects) {
    applyMechanicalEffectLocally(stateAfter, effect, invariantEvents)
  }
  stateAfter.meta.updatedAt = 'replay'

  let scenePacketCastIds: string[] = []
  try {
    const scenePacket = buildScenePacket(stateAfter, fixture.input.playerInput, turnIndex + 1)
    scenePacketCastIds = scenePacket.packet.cast.map((c) => c.npcId)
  } catch (error) {
    failures.push(`scene packet build failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  assertExpected(fixture, stateAfter, patchResult, invariantEvents, scenePacketCastIds, failures)
  assertSensitiveDisclosureGaps(fixture, stateBefore, failures)
  return { fixture, path, failures }
}

function buildStateBefore(fixture: ReplayFixture): Sf2State {
  if (fixture.input.stateBefore) return fixture.input.stateBefore
  if (fixture.input.stateBeforePreset === 'minimal') {
    return deepMerge(createMinimalState(), fixture.input.stateBeforePatch ?? {}) as Sf2State
  }
  throw new Error(`fixture ${fixture.name} needs input.stateBefore or input.stateBeforePreset`)
}

function normalizePatch(patch: Partial<Sf2ArchivistPatch> | null, turnIndex: number): Sf2ArchivistPatch {
  return {
    turnIndex: Number(patch?.turnIndex ?? turnIndex),
    creates: patch?.creates ?? [],
    updates: patch?.updates ?? [],
    transitions: patch?.transitions ?? [],
    attachments: patch?.attachments ?? [],
    sceneResult: patch?.sceneResult,
    pacingClassification: patch?.pacingClassification ?? {
      worldInitiated: false,
      sceneEndLeadsTo: 'not_applicable',
      tensionDeltasByThreadId: {},
    },
    flags: patch?.flags ?? [],
    lexiconAdditions: patch?.lexiconAdditions ?? [],
    ladderFires: patch?.ladderFires ?? [],
    coherenceFindings: patch?.coherenceFindings ?? [],
  }
}

function extractMechanicalEffects(annotation: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!annotation) return []
  const snake = annotation.mechanical_effects
  if (Array.isArray(snake)) return snake as Array<Record<string, unknown>>
  const camel = annotation.mechanicalEffects
  if (Array.isArray(camel)) return camel as Array<Record<string, unknown>>
  return []
}

function normalizeAnnotation(input: Record<string, unknown>): Sf2NarratorAnnotation {
  const mechanicalEffects = extractMechanicalEffects(input)
  const hinted = (input.hinted_entities ?? input.hintedEntities ?? {}) as JsonRecord
  const authorial = (input.authorial_moves ?? input.authorialMoves ?? {}) as JsonRecord
  const suggested = input.suggested_actions ?? input.suggestedActions
  return {
    pendingCheck: undefined,
    mechanicalEffects: mechanicalEffects as Sf2NarratorAnnotation['mechanicalEffects'],
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

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function assertExpected(
  fixture: ReplayFixture,
  state: Sf2State,
  patchResult: ApplyPatchResult,
  invariantEvents: Array<{ kind: string; at: number; data: unknown }>,
  scenePacketCastIds: string[],
  failures: string[]
): void {
  const expected = fixture.expected ?? {}
  for (const id of expected.presentNpcIdsIncludes ?? []) {
    if (!state.world.sceneSnapshot.presentNpcIds.includes(id)) failures.push(`presentNpcIds missing ${id}`)
  }
  for (const id of expected.presentNpcIdsExcludes ?? []) {
    if (state.world.sceneSnapshot.presentNpcIds.includes(id)) failures.push(`presentNpcIds unexpectedly includes ${id}`)
  }
  for (const id of expected.scenePacketCastIncludes ?? []) {
    if (!scenePacketCastIds.includes(id)) failures.push(`scene packet cast missing ${id}`)
  }
  for (const id of expected.scenePacketCastExcludes ?? []) {
    if (scenePacketCastIds.includes(id)) failures.push(`scene packet cast unexpectedly includes ${id}`)
  }
  for (const id of expected.npcIdsIncludes ?? []) {
    if (!state.campaign.npcs[id]) failures.push(`npc registry missing ${id}`)
  }
  for (const name of expected.npcNamesInclude ?? []) {
    const match = Object.values(state.campaign.npcs).find(
      (npc) => npc.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (!match) failures.push(`npc name "${name}" is missing`)
  }
  for (const name of expected.npcNamesAbsent ?? []) {
    const match = Object.values(state.campaign.npcs).find(
      (npc) => npc.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (match) failures.push(`npc name "${name}" exists as ${match.id}`)
  }
  for (const identity of expected.npcIdentityIncludes ?? []) {
    const npc = state.campaign.npcs[identity.npcId]
    if (!npc) {
      failures.push(`npc identity target ${identity.npcId} missing`)
      continue
    }
    if (identity.pronoun !== undefined && npc.identity.pronoun !== identity.pronoun) {
      failures.push(
        `npc ${identity.npcId} pronoun expected ${identity.pronoun}, got ${npc.identity.pronoun ?? 'unset'}`
      )
    }
    if (identity.age !== undefined && npc.identity.age !== identity.age) {
      failures.push(`npc ${identity.npcId} age expected ${identity.age}, got ${npc.identity.age ?? 'unset'}`)
    }
  }
  for (const anchorExpected of expected.temporalAnchorsInclude ?? []) {
    const anchor = state.campaign.temporalAnchors?.[anchorExpected.anchorId]
    if (!anchor) {
      failures.push(`temporal anchor ${anchorExpected.anchorId} missing`)
      continue
    }
    if (anchorExpected.kind !== undefined && anchor.kind !== anchorExpected.kind) {
      failures.push(`temporal anchor ${anchorExpected.anchorId} kind expected ${anchorExpected.kind}, got ${anchor.kind}`)
    }
    if (anchorExpected.label !== undefined && anchor.label !== anchorExpected.label) {
      failures.push(`temporal anchor ${anchorExpected.anchorId} label expected ${anchorExpected.label}, got ${anchor.label}`)
    }
    if (anchorExpected.anchorText !== undefined && anchor.anchorText !== anchorExpected.anchorText) {
      failures.push(
        `temporal anchor ${anchorExpected.anchorId} anchorText expected ${anchorExpected.anchorText}, got ${anchor.anchorText}`
      )
    }
  }
  for (const id of expected.scenePacketTemporalAnchorsInclude ?? []) {
    const scenePacket = buildScenePacket(state, fixture.input.playerInput, state.history.turns.length)
    if (!scenePacket.packet.temporalAnchors.some((a) => a.anchorId === id)) {
      failures.push(`scene packet temporal anchors missing ${id}`)
    }
  }
  if (expected.currentSceneId !== undefined && expected.currentSceneId !== null) {
    if (state.meta.currentSceneId !== expected.currentSceneId) {
      failures.push(`currentSceneId expected ${expected.currentSceneId}, got ${state.meta.currentSceneId}`)
    }
  }
  if (expected.currentTimeLabel !== undefined && expected.currentTimeLabel !== null) {
    if (state.world.currentTimeLabel !== expected.currentTimeLabel) {
      failures.push(`currentTimeLabel expected ${expected.currentTimeLabel}, got ${state.world.currentTimeLabel}`)
    }
    if (state.meta.currentTimeLabel !== expected.currentTimeLabel) {
      failures.push(`meta.currentTimeLabel expected ${expected.currentTimeLabel}, got ${state.meta.currentTimeLabel}`)
    }
  }
  if (expected.currentLocationId !== undefined && expected.currentLocationId !== null) {
    if (state.world.currentLocation.id !== expected.currentLocationId) {
      failures.push(`currentLocation.id expected ${expected.currentLocationId}, got ${state.world.currentLocation.id}`)
    }
  }
  if (expected.sceneBundleCacheCleared !== undefined && expected.sceneBundleCacheCleared !== null) {
    const cleared = state.world.sceneBundleCache === undefined
    if (cleared !== expected.sceneBundleCacheCleared) {
      failures.push(`sceneBundleCacheCleared expected ${expected.sceneBundleCacheCleared}, got ${cleared}`)
    }
  }
  for (const type of expected.invariantEventsInclude ?? []) {
    if (!invariantEvents.some((event) => getEventType(event) === type)) {
      failures.push(`missing invariant event ${type}`)
    }
  }
  for (const ref of expected.archivistAcceptedRefs ?? []) {
    const outcome = patchResult.outcomes.find((o) => o.writeRef === ref)
    if (!outcome?.accepted) failures.push(`archivist write ${ref} was not accepted`)
  }
  for (const ref of expected.archivistRejectedRefs ?? []) {
    const outcome = patchResult.outcomes.find((o) => o.writeRef === ref)
    if (!outcome || outcome.accepted) failures.push(`archivist write ${ref} was not rejected`)
  }
  for (const driftExpected of expected.driftIncludes ?? []) {
    const match = patchResult.drift.find((drift) =>
      drift.kind === driftExpected.kind &&
      (
        !driftExpected.detailIncludes ||
        drift.detail.toLowerCase().includes(driftExpected.detailIncludes.toLowerCase())
      )
    )
    if (!match) {
      failures.push(
        `missing drift ${driftExpected.kind}${driftExpected.detailIncludes ? ` including "${driftExpected.detailIncludes}"` : ''}`
      )
    }
  }
}

function assertSensitiveDisclosureGaps(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.sensitiveDisclosureGaps ?? []
  if (expected.length === 0) return

  const annotation = fixture.input.narrator.annotation ?? null
  const hasPendingCheck = Boolean(annotation?.pending_check || annotation?.pendingCheck)
  const prose = fixture.input.narrator.prose.toLowerCase()

  for (const gap of expected) {
    const npc = stateBefore.campaign.npcs[gap.npcId]
    if (!npc) {
      failures.push(`sensitive disclosure gap npc ${gap.npcId} missing from stateBefore`)
      continue
    }
    if (npc.disposition !== 'hostile' && npc.disposition !== 'wary') {
      failures.push(`sensitive disclosure gap npc ${gap.npcId} disposition is ${npc.disposition}, not wary/hostile`)
      continue
    }
    const missingTerms = gap.terms.filter((term) => !prose.includes(term.toLowerCase()))
    if (missingTerms.length > 0) {
      failures.push(`sensitive disclosure gap missing prose terms: ${missingTerms.join(', ')}`)
      continue
    }
    if (hasPendingCheck) {
      failures.push(`sensitive disclosure gap expected no pending check, but annotation includes one`)
    }
  }
}

function getEventType(event: { data: unknown }): string | null {
  if (!event.data || typeof event.data !== 'object') return null
  const data = event.data as { type?: unknown }
  return typeof data.type === 'string' ? data.type : null
}

function createMinimalState(): Sf2State {
  const now = '2026-04-25T00:00:00.000Z'
  const location = {
    id: 'scene_intake',
    name: 'Intake Hall',
    description: 'A narrow public intake hall with old counters and tired lights.',
    atmosphericConditions: ['stale air'],
  }
  return {
    meta: {
      campaignId: 'replay_minimal',
      createdAt: now,
      updatedAt: now,
      schemaVersion: SF2_SCHEMA_VERSION,
      genreId: 'hegemony',
      playbookId: 'seeker',
      originId: 'frontier',
      currentChapter: 1,
      currentSceneId: location.id,
      currentTimeLabel: 'morning',
    },
    campaign: {
      arcs: {},
      threads: {
        thread_spine: {
          id: 'thread_spine',
          title: 'The intake problem',
          chapterCreated: 1,
          category: 'thread',
          status: 'active',
          owner: { kind: 'faction', id: 'faction_registry' },
          stakeholders: [],
          tension: 5,
          resolutionCriteria: 'The immediate intake problem is resolved.',
          failureMode: 'The intake problem escalates.',
          retrievalCue: 'The public-facing pressure in the current chapter.',
          loadBearing: true,
          spineForChapter: 1,
          tensionHistory: [],
        },
      },
      decisions: {},
      promises: {},
      clues: {},
      temporalAnchors: {},
      npcs: {},
      factions: {
        faction_registry: {
          id: 'faction_registry',
          name: 'Registry',
          stance: 'neutral',
          heat: 'none',
          heatReasons: [],
          ownedThreadIds: ['thread_spine'],
          retrievalCue: 'Local administrative pressure.',
        },
      },
      locations: {
        [location.id]: location,
      },
      floatingClueIds: [],
      pivotalSceneIds: [],
      lexicon: [],
    },
    player: {
      name: 'Replay Seeker',
      species: 'Human',
      origin: { id: 'frontier', name: 'Frontier' },
      class: { id: 'seeker', name: 'Seeker' },
      level: 1,
      hp: { current: 10, max: 10 },
      ac: 12,
      credits: 0,
      stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      proficiencies: [],
      inventory: [],
      traits: [],
      tempModifiers: [],
      inspiration: 0,
      exhaustion: 0,
    },
    chapter: {
      number: 1,
      title: 'Replay Chapter',
      setup: {
        chapter: 1,
        title: 'Replay Chapter',
        frame: {
          title: 'Replay Chapter',
          premise: 'A contained replay fixture.',
          activePressure: 'Administrative pressure.',
          centralTension: 'Whether the scene remains coherent.',
          chapterScope: 'One scene.',
          objective: 'Keep the local truth stable.',
          crucible: 'A continuity-sensitive exchange.',
          outcomeSpectrum: {
            clean: 'Continuity holds.',
            costly: 'Continuity holds with friction.',
            failure: 'Continuity drifts.',
            catastrophic: 'Continuity collapses.',
          },
        },
        antagonistField: {
          sourceSystem: 'fixture',
          corePressure: 'Local confusion',
          defaultFace: {
            id: 'faction_registry',
            name: 'Registry',
            role: 'Institution',
            pressureStyle: 'Procedural drag',
          },
          currentPrimaryFace: {
            id: 'faction_registry',
            name: 'Registry',
            role: 'Institution',
            pressureStyle: 'Procedural drag',
          },
          escalationLogic: 'Escalate only when the fixture says so.',
        },
        startingNpcIds: [],
        activeThreadIds: ['thread_spine'],
        spineThreadId: 'thread_spine',
        loadBearingThreadIds: ['thread_spine'],
        carriedThreadIds: [],
        editorializedLore: [],
        openingSceneSpec: {
          location: location.name,
          atmosphericCondition: 'stale air',
          initialState: 'The replay begins.',
          firstPlayerFacing: 'The scene waits.',
          immediateChoice: 'Act.',
          noStartingCombat: true,
          noExpositionDump: true,
          visibleNpcIds: [],
        },
        pressureLadder: [],
        surfaceThreads: [],
        surfaceNpcIds: [],
      },
      scaffolding: {
        chapter: 1,
        npcHiddenPressures: {},
        antagonistFaces: [],
        possibleRevelations: [],
        moralFaultLines: [],
        escalationOptions: [],
      },
      artifacts: {
        opening: {
          sceneIntent: 'Verify deterministic replay behavior.',
          openingPressure: 'Continuity pressure.',
          chapterObjective: 'Keep the local truth stable.',
          chapterCrucible: 'A continuity-sensitive exchange.',
          visibleNpcIds: [],
          visibleThreadIds: ['thread_spine'],
          loreForOpening: [],
          sceneWarnings: [],
        },
      },
      sceneSummaries: [],
      currentSceneId: location.id,
    },
    world: {
      currentLocation: location,
      sceneSnapshot: {
        sceneId: location.id,
        location,
        presentNpcIds: [],
        timeLabel: 'morning',
        established: ['The replay begins in the intake hall.'],
      },
      currentTimeLabel: 'morning',
    },
    history: {
      turns: [],
      rollLog: [],
      recentTurns: [],
    },
    derived: {},
  }
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base
  if (!isRecord(base) || !isRecord(patch)) return patch ?? base
  const next: JsonRecord = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    next[key] = key in next ? deepMerge(next[key], value) : value
  }
  return next
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

main()
