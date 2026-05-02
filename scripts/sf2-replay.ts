import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeAuthorSetup, validateAuthorSetup, validateChapterRaw } from '../lib/sf2/author/contract'
import { validateNpcDisposition } from '../lib/sf2/author/disposition-defaults'
import { transformArcSetup, validateArcPlan } from '../lib/sf2/arc-author/transform'
import { normalizePersistedSf2State } from '../lib/sf2/persistence/normalize'
import { buildScenePacket, renderPerTurnDelta } from '../lib/sf2/retrieval/scene-packet'
import { buildMessagesForNarrator } from '../lib/sf2/narrator/messages'
import { buildSceneKernel } from '../lib/sf2/scene-kernel/build'
import { formatFinding, scanDisplayOutput } from '../lib/sf2/sentinel/display'
import { classifyQuickAction, repairSuggestedActions } from '../lib/sf2/narrator/suggested-actions'
import { compileAuthorInputSeed } from '../lib/sf2/author/payload'
import {
  coolThreadForChapterOpen,
  deriveEngineValue,
  getEffectiveThreadPressure,
  initializeChapterPressure,
  threadContribution,
} from '../lib/sf2/pressure/derive'
import {
  chapterPressureRuntime,
  computeChapterCloseReadiness,
} from '../lib/sf2/pressure/runtime'
import {
  SF2_SCHEMA_VERSION,
  type Sf2ArchivistPatch,
  type Sf2State,
  type ThreadRole,
} from '../lib/sf2/types'
import {
  commitSf2Turn,
  extractMechanicalEffects,
  finalizeArchivistTurn,
  type Sf2TurnPipelineEvent,
} from '../lib/sf2/runtime/turn-pipeline'
import { applyArchivistPatch, summarizePatchOutcome, type ApplyPatchResult } from '../lib/sf2/validation/apply-patch'

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
    castPacketIncludes?: Array<{
      npcId: string
      tempLoadTag?: string
      voiceImperativeIncludes?: string
      behavioralContractIncludes?: string[]
      prohibitionsInclude?: string[]
      prohibitionsExclude?: string[]
    }>
    perTurnDeltaIncludes?: string[]
    perTurnDeltaExcludes?: string[]
    npcNamesInclude?: string[]
    npcNamesAbsent?: string[]
    npcIdsIncludes?: string[]
    npcIdentityIncludes?: Array<{ npcId: string; pronoun?: string; age?: string }>
    npcAgendasInclude?: Array<{ npcId: string; currentMove?: string; lastUpdatedTurn?: number }>
    temporalAnchorsInclude?: Array<{ anchorId: string; kind?: string; label?: string; anchorText?: string }>
    scenePacketTemporalAnchorsInclude?: string[]
    documentsInclude?: Array<{
      documentId: string
      type?: string
      kindLabel?: string
      status?: string
      signedByEntityId?: string
      filedByEntityId?: string
      subjectEntityIds?: string[]
      originalSummaryEquals?: string
      currentSummaryIncludes?: string
      revisionsCount?: number
    }>
    sceneSummariesInclude?: Array<{
      sceneId: string
      chapter?: number
      leadsTo?: string | null
      summaryIncludes?: string
    }>
    sceneSummariesCount?: number
    activeThreadIdsEquals?: string[]
    activeThreadIdsExcludes?: string[]
    loadBearingThreadIdsIncludes?: string[]
    successorThreadIdsIncludes?: string[]
    threadsInclude?: Array<{
      threadId: string
      status?: string
      tension?: number
      peakTension?: number
      loadBearing?: boolean
      chapterDriverKind?: string
      successorToThreadId?: string
      tensionHistoryIncludes?: Array<{ turn: number; value: number }>
    }>
    chapterCloseReadiness?: {
      pivotSignaled?: boolean
      closeReady: boolean
      spineResolved?: boolean
      stalledFallback?: boolean
      successorRequired?: boolean
      promotedSpineThreadId?: string
    }
    quickActionRepair?: {
      failedSkill?: string
      inputActions: string[]
      outputActionsInclude?: string[]
      outputActionsExclude?: string[]
      outputCount?: number
      categoryCountAtLeast?: number
      notesInclude?: string[]
    }
    authorInputSeed?: {
      priorChapterMeaning?: Record<string, unknown> | null
      hookPremiseIncludes?: string[]
      hookFirstEpisodeIncludes?: string[]
    }
    pressure?: {
      initializeChapterSetupPatch?: Record<string, unknown>
      priorActiveThreadIds?: string[]
      engineValues?: Array<{ engineId: string; value: number }>
      threadContributions?: Array<{ threadId: string; value: number }>
      coolThreads?: Array<{ threadId: string; role: string; engineFloor: number; openingFloor: number; cooledAtOpen?: boolean }>
      initializedThreadPressure?: Array<{
        threadId: string
        role?: string
        openingFloor?: number
        localEscalation?: number
        maxThisChapter?: number
        cooledAtOpen?: boolean
      }>
      effectiveThreadPressure?: Array<{ threadId: string; value: number }>
    }
    preparedPressureRuntime?: {
      priorActiveThreadIds?: string[]
      engineAnchorsInclude?: Array<{ engineId: string; threadIds: string[] }>
      engineValues?: Array<{ engineId: string; value: number }>
      threadPressureIncludes?: Array<{ threadId: string; openingFloor?: number; role?: string }>
    }
    threadPressureIncludes?: Array<{
      threadId: string
      role?: string
      openingFloor?: number
      localEscalation?: number
      maxThisChapter?: number
      effectivePressure?: number
      absent?: boolean
    }>
    beatsCount?: number
    beatsInclude?: Array<{
      textIncludes?: string
      salienceAtLeast?: number
      tagsInclude?: string[]
      participantsInclude?: string[]
    }>
    revelationsInclude?: Array<{
      id: string
      hintsDelivered?: number
      hintsRequired?: number
      revealed?: boolean
      hintEvidenceCount?: number
      hintEvidencePhraseEmittedIncludes?: string[]
    }>
    workingSetTelemetry?: {
      excludedButReferencedIncludes?: string[]
      fullButUnreferencedIncludes?: string[]
      stubButMutatedIncludes?: string[]
      referencedByAliasIncludes?: string[]
      referencedByRoleIncludes?: string[]
    }
    sceneKernel?: {
      sceneId?: string
      presentEntityIdsEquals?: string[]
      currentInterlocutorIdsEquals?: string[]
      nearbyEntityIdsEquals?: string[]
      absentEntityIdsIncludes?: string[]
      absentEntityIdsExcludes?: string[]
      speakingAllowedEntityIdsIncludes?: string[]
      activeProcedureIdsIncludes?: string[]
      activeCountdownIdsIncludes?: string[]
      forbiddenWithoutTransitionMinCount?: number
      aliasMapIncludes?: Array<{ entityId: string; aliasIncludes: string }>
      version?: number
    }
    resolvedAction?: {
      actionType?: string
      targetEntityIdsEquals?: string[]
      forbiddenTargetSubstitutionsIncludes?: string[]
      resolvedReferenceIncludes?: Array<{ surface?: string; resolvedToEntityId?: string; confidence?: string }>
    }
    invariantEventDetailIncludes?: Array<{ type: string; detailIncludes: string }>
    arcTransform?: {
      // Pure-function check on transformArcSetup(rawTool, seed) → ArcPlan.
      // The fixture supplies the raw tool input + a minimal seed; expectations
      // assert on the canonicalized ArcPlan shape. No model calls.
      seedHookTitle: string
      seedHookPremise: string
      seedHookCrucible: string
      rawToolInput: Record<string, unknown>
      expect: {
        idEquals?: string
        titleEquals?: string
        scenarioModeEquals?: string
        pressureEnginesCountAtLeast?: number
        playerStanceAxesCountAtLeast?: number
        chapterFunctionMapCountEquals?: number
        durableNpcSeedsCountAtLeast?: number
        scenarioRejectedDefaultIncludes?: string
      }
    }
    arcValidation?: {
      // Pure-function check on validateArcPlan(arcPlan) → string[] errors.
      // Use a minimal ArcPlan and assert which errors fire / don't fire.
      arcPlan: Record<string, unknown>  // partial shape; cast to Sf2ArcPlan inside
      expect: {
        errorIncludesAll?: string[]
        errorIncludesNone?: string[]
      }
    }
    dispositionDerivation?: {
      // Standalone pure-function check on the disposition derivation logic.
      // Exercises lib/sf2/author/disposition-defaults.ts without going through
      // the route. Each case names a PC context and an authored NPC plus the
      // expected outcome (flagged or accepted).
      ctx: { genreId: string; pcOriginId: string; pcPlaybookId: string }
      cases: Array<{
        name: string  // for error reporting
        role: string
        affiliation: string
        initialDisposition: string
        dispositionReason?: string
        expect: 'flagged' | 'accepted'
        flagIncludes?: string  // optional substring match against the error message
      }>
    }
    authorContract?: {
      // Pure-function check on the Chapter Author contract module.
      // Exercises raw tool validation, snake_case/camelCase normalization, and
      // final normalized boundary validation without making a model call.
      ctx: { genreId: string; pcOriginId: string; pcPlaybookId: string; isContinuation?: boolean }
      rawToolInput: Record<string, unknown>
      expect: {
        rawErrorCount?: number
        validationErrorCount?: number
        titleEquals?: string
        threadCountEquals?: number
        firstThreadInitialTensionEquals?: number
        visibleNpcIdsEquals?: string[]
        firstRevealValidContextsEquals?: string[]
        pacingTargetEquals?: { min: number; max: number }
      }
    }
    persistenceNormalize?: {
      // Pure-function check on the SF2 persistence normalizer. Supplies a
      // legacy or partial stored blob and asserts the current save-shape that
      // loadCampaign/saveCampaign will see through the IndexedDB adapter.
      rawState: Record<string, unknown>
      expect: {
        schemaVersionEquals?: string
        recentTurnsCountEquals?: number
        currentSceneIdEquals?: string
        currentLocationIdEquals?: string
        currentInterlocutorIdsEquals?: string[]
        sceneSnapshotFirstTurnIndexEquals?: number
        sceneBundleCacheCleared?: boolean
        hasCampaignBuckets?: string[]
        threadOwnerEquals?: { threadId: string; kind: string; id: string }
        repairsInclude?: string[]
      }
    }
    narratorMessages?: {
      // Run buildMessagesForNarrator(stateBefore, ...) and assert the assembled
      // message array. Targets regressions where the message build drops or
      // omits required content (cache-invalidation dropping replay window,
      // skill-tag binding not getting injected, etc.).
      stateBefore?: 'fixture-stateBefore' | 'fixture-stateAfter'
      isInitial?: boolean
      playerInput?: string
      includesAssistantProseMatching?: string[]
      assistantMessageCountAtLeast?: number
      assistantMessageCountEquals?: number
      sceneSnapshotFirstTurnIndexEquals?: number
      userMessageContainsAll?: string[]
      userMessageContainsNone?: string[]
    }
    displaySentinel?: {
      findingsCount?: number
      findingsCountAtLeast?: number
      findingsAbsent?: boolean
      findingsInclude?: Array<{
        findingType?: string
        severity?: string
        surfaceEquals?: string
        recommendedAction?: string
      }>
    }
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
  workingSetTelemetry?: NonNullable<Sf2State['derived']['workingSetTelemetry']>[number]
}

type JsonRecord = Record<string, unknown>

async function main(): Promise<void> {
  const dumpWorkingSetTelemetry = process.argv.includes('--working-set-telemetry')
  const target = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!target) {
    console.error('Usage: npm run sf2:replay -- <fixture-file-or-directory> [--working-set-telemetry]')
    process.exit(2)
  }

  const paths = collectFixturePaths(resolve(process.cwd(), target))
  if (paths.length === 0) {
    console.error(`No replay fixtures found at ${target}`)
    process.exit(2)
  }

  const results = await Promise.all(paths.map(runFixturePath))
  if (dumpWorkingSetTelemetry) {
    printWorkingSetTelemetry()
    for (const result of results) {
      if (result.workingSetTelemetry) {
        printWorkingSetTelemetryRow(result.fixture.name, result.workingSetTelemetry)
      }
    }
  }
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

function printWorkingSetTelemetry(): void {
  console.log('\nWorking-set telemetry')
  console.log('fixture | turn | full/stub/excl | tokens full/stub | exclRef | fullUnused | stubMut')
}

function printWorkingSetTelemetryRow(
  fixtureName: string,
  row: NonNullable<Sf2State['derived']['workingSetTelemetry']>[number]
): void {
  console.log(
    [
      fixtureName,
      `T${row.turn}`,
      `${row.fullCount}/${row.stubCount}/${row.excludedCount}`,
      `${row.fullTokensApprox}/${row.stubTokensApprox}`,
      row.excludedButReferenced.join(',') || '-',
      row.fullButUnreferenced.join(',') || '-',
      row.stubButMutated.join(',') || '-',
    ].join(' | ')
  )
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

async function runFixturePath(path: string): Promise<ReplayResult> {
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
  const preTurnWorkingSet = buildScenePacket(
    stateBefore,
    fixture.input.isInitial ? '' : fixture.input.playerInput,
    turnIndex
  ).workingSet

  // Phase C display sentinel — observe mode. Scan the Narrator prose for
  // forbidden debug/control vocabulary AND absent-NPC speech; surface
  // findings as invariant events so fixtures can assert detection without
  // coupling to the (yet-to-land) streaming integration. Live wiring at the
  // API route will call the same scanDisplayOutput function with
  // action='block_and_repair'. The absent_speaker scan is opt-in via the
  // `absentSpeakers` option — built from the kernel projected over the
  // pre-prose state so fixtures can exercise prose-vs-kernel mismatches.
  const turnSentinelEvents: Sf2TurnPipelineEvent[] = []
  const sentinelKernel = buildSceneKernel(stateBefore)
  const displayFindings = scanDisplayOutput(fixture.input.narrator.prose, {
    action: 'allow_but_quarantine_writes', // observe-mode: don't block, just record
    campaign: stateBefore.campaign,
    locationContinuity: {
      recentSceneText: buildLocationContinuityText(stateBefore),
    },
    absentSpeakers: {
      absentEntityIds: sentinelKernel.absentEntityIds,
      aliasMap: sentinelKernel.aliasMap,
    },
  })
  for (const finding of displayFindings) {
    turnSentinelEvents.push({
      kind: 'sf2.invariant',
      at: Date.now(),
      data: {
        type: 'display_sentinel_finding',
        findingType: finding.type,
        severity: finding.severity,
        surface: finding.surface,
        matchStart: finding.matchStart,
        recommendedAction: finding.recommendedAction,
        detail: formatFinding(finding),
      },
    })
  }

  let patchResult: ApplyPatchResult | null = null
  let workingSetTelemetry: ReplayResult['workingSetTelemetry']
  const committedTurn = await commitSf2Turn({
    stateBefore,
    turnIndex,
    playerInput: fixture.input.playerInput,
    isInitial: Boolean(fixture.input.isInitial),
    narrator: {
      prose: fixture.input.narrator.prose,
      annotation,
      mechanicalEffects,
      sentinelEvents: turnSentinelEvents,
      workingSet: preTurnWorkingSet,
    },
    now: () => 'replay',
    applyArchivist: ({ stateWithTurnLogged, narratorProse }) => {
      const result = applyArchivistPatch(
        stateWithTurnLogged,
        patch,
        stateWithTurnLogged.meta.currentChapter
      )
      patchResult = result
      const runtimeResult = finalizeArchivistTurn({
        stateBeforeArchivist: stateWithTurnLogged,
        narratorProse,
        patch,
        applyResult: result,
        telemetryLimit: 50,
      })
      workingSetTelemetry = runtimeResult.workingSetTelemetry
      return {
        nextState: runtimeResult.nextState,
        invariantEvents: runtimeResult.invariantEvents,
        replay: {
          patch,
          outcomes: result.outcomes,
          deferredWrites: result.deferredWrites,
          drift: result.drift,
          summary: summarizePatchOutcome(result),
          coherenceFindings: runtimeResult.coherenceFindings,
        },
      }
    },
  })
  if (!patchResult) {
    throw new Error(`fixture ${fixture.name} did not apply an Archivist patch`)
  }
  const stateAfter = committedTurn.stateAfter
  const invariantEvents = committedTurn.invariantEvents

  let scenePacketCastIds: string[] = []
  let scenePacketCast: ReturnType<typeof buildScenePacket>['packet']['cast'] = []
  let perTurnDeltaText = ''
  try {
    const scenePacket = buildScenePacket(stateAfter, fixture.input.playerInput, turnIndex + 1)
    scenePacketCastIds = scenePacket.packet.cast.map((c) => c.npcId)
    scenePacketCast = scenePacket.packet.cast
    perTurnDeltaText = renderPerTurnDelta(scenePacket.packet, {
      advisoryText: scenePacket.advisoryText,
      isInitial: false,
      playerInput: fixture.input.playerInput,
    })
  } catch (error) {
    failures.push(`scene packet build failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  assertExpected(
    fixture,
    stateBefore,
    stateAfter,
    patchResult,
    invariantEvents,
    scenePacketCastIds,
    scenePacketCast,
    perTurnDeltaText,
    failures
  )
  assertSensitiveDisclosureGaps(fixture, stateBefore, failures)
  assertNarratorMessages(fixture, stateBefore, stateAfter, failures)
  assertDispositionDerivation(fixture, failures)
  assertAuthorContract(fixture, stateBefore, failures)
  assertPersistenceNormalize(fixture, failures)
  assertArcTransform(fixture, failures)
  assertArcValidation(fixture, failures)
  return { fixture, path, failures, workingSetTelemetry }
}

function buildLocationContinuityText(state: Sf2State): string {
  return [
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...(state.world.sceneSnapshot?.established ?? []),
    ...(state.chapter.sceneSummaries ?? []).slice(-2).map((s) => s.summary),
  ].join(' ')
}

function assertArcTransform(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.arcTransform
  if (!expected) return

  const seed = {
    genreId: 'epic-scifi',
    genreName: 'Hegemony',
    playbookId: 'warden',
    playbookName: 'Warden',
    originId: 'imperial-service',
    originName: 'Imperial Service',
    hook: {
      title: expected.seedHookTitle,
      premise: expected.seedHookPremise,
      crucible: expected.seedHookCrucible,
    },
    worldRules: { settingSummary: '', institutionalForces: [], socialPressures: [], bannedRegisters: [], vocabulary: [] },
    toneRules: { toneMix: '', narrativePrinciples: [] },
    npcRules: { likelyAffiliations: [], factionVoiceRules: [], affiliationRequirement: '' },
    onboardingRules: { playerKnowledgeAssumption: '', avoidEarly: [] },
  } as unknown as Parameters<typeof transformArcSetup>[1]

  const plan = transformArcSetup(expected.rawToolInput, seed)
  const e = expected.expect
  if (e.idEquals !== undefined && plan.id !== e.idEquals) failures.push(`arcTransform.id: expected "${e.idEquals}", got "${plan.id}"`)
  if (e.titleEquals !== undefined && plan.title !== e.titleEquals) failures.push(`arcTransform.title: expected "${e.titleEquals}", got "${plan.title}"`)
  if (e.scenarioModeEquals !== undefined && plan.scenarioShape.mode !== e.scenarioModeEquals) {
    failures.push(`arcTransform.scenarioShape.mode: expected "${e.scenarioModeEquals}", got "${plan.scenarioShape.mode}"`)
  }
  if (typeof e.pressureEnginesCountAtLeast === 'number' && plan.pressureEngines.length < e.pressureEnginesCountAtLeast) {
    failures.push(`arcTransform.pressureEngines: expected ≥${e.pressureEnginesCountAtLeast}, got ${plan.pressureEngines.length}`)
  }
  if (typeof e.playerStanceAxesCountAtLeast === 'number' && plan.playerStanceAxes.length < e.playerStanceAxesCountAtLeast) {
    failures.push(`arcTransform.playerStanceAxes: expected ≥${e.playerStanceAxesCountAtLeast}, got ${plan.playerStanceAxes.length}`)
  }
  if (typeof e.chapterFunctionMapCountEquals === 'number' && plan.chapterFunctionMap.length !== e.chapterFunctionMapCountEquals) {
    failures.push(`arcTransform.chapterFunctionMap: expected ${e.chapterFunctionMapCountEquals}, got ${plan.chapterFunctionMap.length}`)
  }
  if (typeof e.durableNpcSeedsCountAtLeast === 'number' && plan.durableNpcSeeds.length < e.durableNpcSeedsCountAtLeast) {
    failures.push(`arcTransform.durableNpcSeeds: expected ≥${e.durableNpcSeedsCountAtLeast}, got ${plan.durableNpcSeeds.length}`)
  }
  if (e.scenarioRejectedDefaultIncludes && !plan.scenarioShape.rejectedDefaultShape.toLowerCase().includes(e.scenarioRejectedDefaultIncludes.toLowerCase())) {
    failures.push(`arcTransform.rejectedDefaultShape: expected to include "${e.scenarioRejectedDefaultIncludes}", got "${plan.scenarioShape.rejectedDefaultShape}"`)
  }
}

function assertArcValidation(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.arcValidation
  if (!expected) return

  const errors = validateArcPlan(expected.arcPlan as unknown as Parameters<typeof validateArcPlan>[0])
  for (const fragment of expected.expect.errorIncludesAll ?? []) {
    if (!errors.some((e) => e.includes(fragment))) {
      failures.push(`arcValidation: expected error containing "${fragment}", got [${errors.join('; ') || 'none'}]`)
    }
  }
  for (const fragment of expected.expect.errorIncludesNone ?? []) {
    if (errors.some((e) => e.includes(fragment))) {
      failures.push(`arcValidation: did not expect error containing "${fragment}", got [${errors.join('; ')}]`)
    }
  }
}

function assertDispositionDerivation(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.dispositionDerivation
  if (!expected) return

  for (const c of expected.cases) {
    const err = validateNpcDisposition(
      expected.ctx,
      {
        role: c.role,
        affiliation: c.affiliation,
        initialDisposition: c.initialDisposition,
        dispositionReason: c.dispositionReason,
      },
      c.name
    )
    if (c.expect === 'flagged') {
      if (!err) {
        failures.push(`disposition: case "${c.name}" expected flagged, got accepted`)
      } else if (c.flagIncludes && !err.includes(c.flagIncludes)) {
        failures.push(`disposition: case "${c.name}" flag did not include "${c.flagIncludes}" — got "${err}"`)
      }
    } else if (c.expect === 'accepted') {
      if (err) {
        failures.push(`disposition: case "${c.name}" expected accepted, got flagged — "${err}"`)
      }
    }
  }
}

function assertAuthorContract(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.authorContract
  if (!expected) return

  const ctx = {
    ...expected.ctx,
    state: stateBefore,
  }
  const rawErrors = validateChapterRaw(expected.rawToolInput, ctx)
  if (typeof expected.expect.rawErrorCount === 'number' && rawErrors.length !== expected.expect.rawErrorCount) {
    failures.push(`authorContract.rawErrors: expected ${expected.expect.rawErrorCount}, got ${rawErrors.length} [${rawErrors.join('; ') || 'none'}]`)
  }

  const authored = normalizeAuthorSetup(expected.rawToolInput)
  const validationErrors = validateAuthorSetup(authored, {
    isContinuation: Boolean(expected.ctx.isContinuation),
    state: stateBefore,
  })
  if (typeof expected.expect.validationErrorCount === 'number' && validationErrors.length !== expected.expect.validationErrorCount) {
    failures.push(`authorContract.validationErrors: expected ${expected.expect.validationErrorCount}, got ${validationErrors.length} [${validationErrors.join('; ') || 'none'}]`)
  }

  if (expected.expect.titleEquals !== undefined && authored.chapterFrame.title !== expected.expect.titleEquals) {
    failures.push(`authorContract.title: expected "${expected.expect.titleEquals}", got "${authored.chapterFrame.title}"`)
  }
  if (typeof expected.expect.threadCountEquals === 'number' && authored.activeThreads.length !== expected.expect.threadCountEquals) {
    failures.push(`authorContract.activeThreads: expected ${expected.expect.threadCountEquals}, got ${authored.activeThreads.length}`)
  }
  if (
    typeof expected.expect.firstThreadInitialTensionEquals === 'number' &&
    authored.activeThreads[0]?.initialTension !== expected.expect.firstThreadInitialTensionEquals
  ) {
    failures.push(
      `authorContract.activeThreads[0].initialTension: expected ${expected.expect.firstThreadInitialTensionEquals}, got ${String(authored.activeThreads[0]?.initialTension)}`
    )
  }
  if (expected.expect.visibleNpcIdsEquals !== undefined) {
    const got = [...(authored.openingSceneSpec.visibleNpcIds ?? [])].sort().join(',')
    const want = [...expected.expect.visibleNpcIdsEquals].sort().join(',')
    if (got !== want) failures.push(`authorContract.visibleNpcIds: expected ${want}, got ${got}`)
  }
  if (expected.expect.firstRevealValidContextsEquals !== undefined) {
    const got = [...(authored.possibleRevelations[0]?.validRevealContexts ?? [])].sort().join(',')
    const want = [...expected.expect.firstRevealValidContextsEquals].sort().join(',')
    if (got !== want) failures.push(`authorContract.possibleRevelations[0].validRevealContexts: expected ${want}, got ${got}`)
  }
  if (expected.expect.pacingTargetEquals !== undefined) {
    const got = authored.pacingContract.targetTurns
    const want = expected.expect.pacingTargetEquals
    if (got.min !== want.min || got.max !== want.max) {
      failures.push(`authorContract.pacingContract.targetTurns: expected ${want.min}-${want.max}, got ${got.min}-${got.max}`)
    }
  }
}

function assertPersistenceNormalize(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.persistenceNormalize
  if (!expected) return

  const normalized = normalizePersistedSf2State(expected.rawState)
  if (!normalized) {
    failures.push('persistenceNormalize: expected normalized state, got null')
    return
  }

  const state = normalized.state
  const e = expected.expect
  if (e.schemaVersionEquals !== undefined && state.meta.schemaVersion !== e.schemaVersionEquals) {
    failures.push(`persistenceNormalize.schemaVersion: expected ${e.schemaVersionEquals}, got ${state.meta.schemaVersion}`)
  }
  if (typeof e.recentTurnsCountEquals === 'number' && state.history.recentTurns.length !== e.recentTurnsCountEquals) {
    failures.push(`persistenceNormalize.recentTurns: expected ${e.recentTurnsCountEquals}, got ${state.history.recentTurns.length}`)
  }
  if (e.currentSceneIdEquals !== undefined && state.meta.currentSceneId !== e.currentSceneIdEquals) {
    failures.push(`persistenceNormalize.meta.currentSceneId: expected ${e.currentSceneIdEquals}, got ${state.meta.currentSceneId}`)
  }
  if (e.currentLocationIdEquals !== undefined && state.world.currentLocation.id !== e.currentLocationIdEquals) {
    failures.push(`persistenceNormalize.world.currentLocation.id: expected ${e.currentLocationIdEquals}, got ${state.world.currentLocation.id}`)
  }
  if (e.currentInterlocutorIdsEquals !== undefined) {
    const want = [...e.currentInterlocutorIdsEquals].sort().join(',')
    const got = [...(state.world.sceneSnapshot.currentInterlocutorIds ?? [])].sort().join(',')
    if (want !== got) failures.push(`persistenceNormalize.currentInterlocutorIds: expected [${want}], got [${got}]`)
  }
  if (
    typeof e.sceneSnapshotFirstTurnIndexEquals === 'number' &&
    state.world.sceneSnapshot.firstTurnIndex !== e.sceneSnapshotFirstTurnIndexEquals
  ) {
    failures.push(
      `persistenceNormalize.sceneSnapshot.firstTurnIndex: expected ${e.sceneSnapshotFirstTurnIndexEquals}, got ${state.world.sceneSnapshot.firstTurnIndex}`
    )
  }
  if (typeof e.sceneBundleCacheCleared === 'boolean') {
    const cleared = state.world.sceneBundleCache === undefined
    if (cleared !== e.sceneBundleCacheCleared) {
      failures.push(`persistenceNormalize.sceneBundleCacheCleared: expected ${e.sceneBundleCacheCleared}, got ${cleared}`)
    }
  }
  for (const bucket of e.hasCampaignBuckets ?? []) {
    const value = (state.campaign as unknown as Record<string, unknown>)[bucket]
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      failures.push(`persistenceNormalize.campaign.${bucket}: expected object bucket`)
    }
  }
  if (e.threadOwnerEquals) {
    const thread = state.campaign.threads[e.threadOwnerEquals.threadId]
    if (!thread) {
      failures.push(`persistenceNormalize.threadOwner: missing ${e.threadOwnerEquals.threadId}`)
    } else if (thread.owner.kind !== e.threadOwnerEquals.kind || thread.owner.id !== e.threadOwnerEquals.id) {
      failures.push(
        `persistenceNormalize.threadOwner: expected ${e.threadOwnerEquals.kind}:${e.threadOwnerEquals.id}, got ${thread.owner.kind}:${thread.owner.id}`
      )
    }
  }
  for (const fragment of e.repairsInclude ?? []) {
    if (!normalized.repairs.some((repair) => repair.includes(fragment))) {
      failures.push(`persistenceNormalize.repairs: expected repair containing "${fragment}", got [${normalized.repairs.join('; ') || 'none'}]`)
    }
  }
}

function assertNarratorMessages(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  stateAfter: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.narratorMessages
  if (!expected) return

  const sourceState = expected.stateBefore === 'fixture-stateAfter' ? stateAfter : stateBefore
  const playerInput = expected.playerInput ?? fixture.input.playerInput
  const isInitial = expected.isInitial ?? false
  const turnIndex = sourceState.history.turns.length

  let messages: Array<{ role: string; content: unknown }>
  try {
    const result = buildMessagesForNarrator(sourceState, playerInput, isInitial, turnIndex)
    messages = result.messages as Array<{ role: string; content: unknown }>
  } catch (error) {
    failures.push(`buildMessagesForNarrator threw: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const assistantTexts = assistantMessages.map((m) => {
    if (typeof m.content === 'string') return m.content
    if (Array.isArray(m.content)) {
      return m.content
        .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : ''))
        .join('')
    }
    return ''
  })

  if (typeof expected.assistantMessageCountEquals === 'number') {
    if (assistantMessages.length !== expected.assistantMessageCountEquals) {
      failures.push(
        `narrator messages: expected ${expected.assistantMessageCountEquals} assistant messages, got ${assistantMessages.length}`
      )
    }
  }
  if (typeof expected.assistantMessageCountAtLeast === 'number') {
    if (assistantMessages.length < expected.assistantMessageCountAtLeast) {
      failures.push(
        `narrator messages: expected at least ${expected.assistantMessageCountAtLeast} assistant messages, got ${assistantMessages.length}`
      )
    }
  }
  for (const fragment of expected.includesAssistantProseMatching ?? []) {
    if (!assistantTexts.some((t) => t.includes(fragment))) {
      failures.push(`narrator messages: no assistant message contains "${fragment.slice(0, 60)}"`)
    }
  }
  if (typeof expected.sceneSnapshotFirstTurnIndexEquals === 'number') {
    const actual = sourceState.world.sceneSnapshot.firstTurnIndex
    if (actual !== expected.sceneSnapshotFirstTurnIndexEquals) {
      failures.push(
        `sceneSnapshot.firstTurnIndex: expected ${expected.sceneSnapshotFirstTurnIndexEquals}, got ${actual}`
      )
    }
  }

  const userTexts = messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      if (typeof m.content === 'string') return m.content
      if (Array.isArray(m.content)) {
        return m.content
          .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : ''))
          .join('')
      }
      return ''
    })
  for (const fragment of expected.userMessageContainsAll ?? []) {
    if (!userTexts.some((t) => t.includes(fragment))) {
      failures.push(`narrator user messages: missing required fragment "${fragment.slice(0, 60)}"`)
    }
  }
  for (const fragment of expected.userMessageContainsNone ?? []) {
    if (userTexts.some((t) => t.includes(fragment))) {
      failures.push(`narrator user messages: unexpectedly contains "${fragment.slice(0, 60)}"`)
    }
  }
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
    emotionalBeats: patch?.emotionalBeats,
    revelationHintsDelivered: patch?.revelationHintsDelivered,
    revelationsRevealed: patch?.revelationsRevealed,
  }
}

function assertExpected(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  state: Sf2State,
  patchResult: ApplyPatchResult,
  invariantEvents: Array<{ kind: string; at: number; data: unknown }>,
  scenePacketCastIds: string[],
  scenePacketCast: ReturnType<typeof buildScenePacket>['packet']['cast'],
  perTurnDeltaText: string,
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
  for (const want of expected.castPacketIncludes ?? []) {
    const c = scenePacketCast.find((entry) => entry.npcId === want.npcId)
    if (!c) {
      failures.push(`castPacket missing ${want.npcId}`)
      continue
    }
    if (want.tempLoadTag !== undefined && c.tempLoadTag !== want.tempLoadTag) {
      failures.push(`castPacket ${want.npcId} tempLoadTag expected "${want.tempLoadTag}", got "${c.tempLoadTag ?? '(unset)'}"`)
    }
    if (want.voiceImperativeIncludes && !c.voiceImperative.toLowerCase().includes(want.voiceImperativeIncludes.toLowerCase())) {
      failures.push(`castPacket ${want.npcId} voiceImperative missing "${want.voiceImperativeIncludes}" (got: "${c.voiceImperative}")`)
    }
    for (const fragment of want.behavioralContractIncludes ?? []) {
      if (!c.behavioralContract.toLowerCase().includes(fragment.toLowerCase())) {
        failures.push(`castPacket ${want.npcId} behavioralContract missing "${fragment}" (got: "${c.behavioralContract}")`)
      }
    }
    for (const fragment of want.prohibitionsInclude ?? []) {
      const found = c.prohibitions.some((p) => p.toLowerCase().includes(fragment.toLowerCase()))
      if (!found) {
        failures.push(`castPacket ${want.npcId} prohibitions missing "${fragment}" (got: ${c.prohibitions.join(', ')})`)
      }
    }
    for (const fragment of want.prohibitionsExclude ?? []) {
      const found = c.prohibitions.some((p) => p.toLowerCase().includes(fragment.toLowerCase()))
      if (found) {
        failures.push(`castPacket ${want.npcId} prohibitions unexpectedly includes "${fragment}" (got: ${c.prohibitions.join(', ')})`)
      }
    }
  }
  for (const fragment of expected.perTurnDeltaIncludes ?? []) {
    if (!perTurnDeltaText.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`perTurnDelta missing "${fragment}"`)
    }
  }
  for (const fragment of expected.perTurnDeltaExcludes ?? []) {
    if (perTurnDeltaText.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`perTurnDelta unexpectedly contains "${fragment}"`)
    }
  }
  for (const pressureExpected of expected.threadPressureIncludes ?? []) {
    const entry = state.chapter.setup.threadPressure?.[pressureExpected.threadId]
    if (pressureExpected.absent) {
      if (entry) failures.push(`threadPressure ${pressureExpected.threadId} unexpectedly present`)
      continue
    }
    if (!entry) {
      failures.push(`threadPressure ${pressureExpected.threadId} missing`)
      continue
    }
    if (pressureExpected.role !== undefined && entry.role !== pressureExpected.role) {
      failures.push(`threadPressure ${pressureExpected.threadId} role expected ${pressureExpected.role}, got ${entry.role}`)
    }
    if (pressureExpected.openingFloor !== undefined && entry.openingFloor !== pressureExpected.openingFloor) {
      failures.push(`threadPressure ${pressureExpected.threadId} openingFloor expected ${pressureExpected.openingFloor}, got ${entry.openingFloor}`)
    }
    if (pressureExpected.localEscalation !== undefined && entry.localEscalation !== pressureExpected.localEscalation) {
      failures.push(`threadPressure ${pressureExpected.threadId} localEscalation expected ${pressureExpected.localEscalation}, got ${entry.localEscalation}`)
    }
    if (pressureExpected.maxThisChapter !== undefined && entry.maxThisChapter !== pressureExpected.maxThisChapter) {
      failures.push(`threadPressure ${pressureExpected.threadId} maxThisChapter expected ${pressureExpected.maxThisChapter}, got ${entry.maxThisChapter}`)
    }
    if (pressureExpected.effectivePressure !== undefined) {
      const effective = entry.openingFloor + entry.localEscalation
      if (effective !== pressureExpected.effectivePressure) {
        failures.push(`threadPressure ${pressureExpected.threadId} effective expected ${pressureExpected.effectivePressure}, got ${effective}`)
      }
    }
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
  for (const agendaExpected of expected.npcAgendasInclude ?? []) {
    const npc = state.campaign.npcs[agendaExpected.npcId]
    if (!npc) {
      failures.push(`npc agenda target ${agendaExpected.npcId} missing`)
      continue
    }
    if (agendaExpected.currentMove !== undefined && npc.agenda?.currentMove !== agendaExpected.currentMove) {
      failures.push(
        `npc ${agendaExpected.npcId} agenda.currentMove expected "${agendaExpected.currentMove}", got "${npc.agenda?.currentMove ?? 'unset'}"`
      )
    }
    if (
      agendaExpected.lastUpdatedTurn !== undefined &&
      npc.agenda?.lastUpdatedTurn !== agendaExpected.lastUpdatedTurn
    ) {
      failures.push(
        `npc ${agendaExpected.npcId} agenda.lastUpdatedTurn expected ${agendaExpected.lastUpdatedTurn}, got ${npc.agenda?.lastUpdatedTurn ?? 'unset'}`
      )
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
  for (const docExpected of expected.documentsInclude ?? []) {
    const doc = state.campaign.documents?.[docExpected.documentId]
    if (!doc) {
      failures.push(`document ${docExpected.documentId} missing`)
      continue
    }
    if (docExpected.type !== undefined && doc.type !== docExpected.type) {
      failures.push(`document ${docExpected.documentId} type expected ${docExpected.type}, got ${doc.type}`)
    }
    if (docExpected.kindLabel !== undefined && doc.kindLabel !== docExpected.kindLabel) {
      failures.push(`document ${docExpected.documentId} kindLabel expected ${docExpected.kindLabel}, got ${doc.kindLabel}`)
    }
    if (docExpected.status !== undefined && doc.status !== docExpected.status) {
      failures.push(`document ${docExpected.documentId} status expected ${docExpected.status}, got ${doc.status}`)
    }
    if (docExpected.signedByEntityId !== undefined && doc.signedByEntityId !== docExpected.signedByEntityId) {
      failures.push(
        `document ${docExpected.documentId} signedBy expected ${docExpected.signedByEntityId}, got ${doc.signedByEntityId ?? 'unset'}`
      )
    }
    if (docExpected.filedByEntityId !== undefined && doc.filedByEntityId !== docExpected.filedByEntityId) {
      failures.push(
        `document ${docExpected.documentId} filedBy expected ${docExpected.filedByEntityId}, got ${doc.filedByEntityId ?? 'unset'}`
      )
    }
    if (docExpected.subjectEntityIds !== undefined) {
      const expectedSet = new Set(docExpected.subjectEntityIds)
      const actualSet = new Set(doc.subjectEntityIds)
      if (
        expectedSet.size !== actualSet.size ||
        [...expectedSet].some((id) => !actualSet.has(id))
      ) {
        failures.push(
          `document ${docExpected.documentId} subjects expected [${[...expectedSet].join(',')}], got [${doc.subjectEntityIds.join(',')}]`
        )
      }
    }
    if (docExpected.originalSummaryEquals !== undefined && doc.originalSummary !== docExpected.originalSummaryEquals) {
      failures.push(
        `document ${docExpected.documentId} originalSummary expected "${docExpected.originalSummaryEquals}", got "${doc.originalSummary}"`
      )
    }
    if (docExpected.currentSummaryIncludes !== undefined && !doc.currentSummary.includes(docExpected.currentSummaryIncludes)) {
      failures.push(
        `document ${docExpected.documentId} currentSummary expected to include "${docExpected.currentSummaryIncludes}", got "${doc.currentSummary}"`
      )
    }
    if (docExpected.revisionsCount !== undefined && doc.revisions.length !== docExpected.revisionsCount) {
      failures.push(
        `document ${docExpected.documentId} revisions expected ${docExpected.revisionsCount}, got ${doc.revisions.length}`
      )
    }
  }
  for (const summaryExpected of expected.sceneSummariesInclude ?? []) {
    const summary = state.chapter.sceneSummaries.find((s) => s.sceneId === summaryExpected.sceneId)
    if (!summary) {
      failures.push(`scene summary ${summaryExpected.sceneId} missing`)
      continue
    }
    if (summaryExpected.chapter !== undefined && summary.chapter !== summaryExpected.chapter) {
      failures.push(`scene summary ${summaryExpected.sceneId} chapter expected ${summaryExpected.chapter}, got ${summary.chapter}`)
    }
    if (summaryExpected.leadsTo !== undefined && summary.leadsTo !== summaryExpected.leadsTo) {
      failures.push(`scene summary ${summaryExpected.sceneId} leadsTo expected ${summaryExpected.leadsTo}, got ${summary.leadsTo ?? 'null'}`)
    }
    if (summaryExpected.summaryIncludes !== undefined && !summary.summary.includes(summaryExpected.summaryIncludes)) {
      failures.push(`scene summary ${summaryExpected.sceneId} summary missing "${summaryExpected.summaryIncludes}"`)
    }
  }
  if (expected.sceneSummariesCount !== undefined && state.chapter.sceneSummaries.length !== expected.sceneSummariesCount) {
    failures.push(`scene summaries count expected ${expected.sceneSummariesCount}, got ${state.chapter.sceneSummaries.length}`)
  }
  if (expected.activeThreadIdsEquals !== undefined) {
    const want = [...expected.activeThreadIdsEquals].sort().join(',')
    const got = [...state.chapter.setup.activeThreadIds].sort().join(',')
    if (want !== got) failures.push(`activeThreadIds expected [${want}], got [${got}]`)
  }
  for (const id of expected.activeThreadIdsExcludes ?? []) {
    if (state.chapter.setup.activeThreadIds.includes(id)) {
      failures.push(`activeThreadIds unexpectedly includes ${id}`)
    }
  }
  for (const id of expected.loadBearingThreadIdsIncludes ?? []) {
    if (!state.chapter.setup.loadBearingThreadIds.includes(id)) {
      failures.push(`loadBearingThreadIds missing ${id}`)
    }
  }
  for (const id of expected.successorThreadIdsIncludes ?? []) {
    if (!(state.chapter.setup.successorThreadIds ?? []).includes(id)) {
      failures.push(`successorThreadIds missing ${id}`)
    }
  }
  for (const threadExpected of expected.threadsInclude ?? []) {
    const thread = state.campaign.threads[threadExpected.threadId]
    if (!thread) {
      failures.push(`thread ${threadExpected.threadId} missing`)
      continue
    }
    if (threadExpected.status !== undefined && thread.status !== threadExpected.status) {
      failures.push(`thread ${threadExpected.threadId} status expected ${threadExpected.status}, got ${thread.status}`)
    }
    if (threadExpected.tension !== undefined && thread.tension !== threadExpected.tension) {
      failures.push(`thread ${threadExpected.threadId} tension expected ${threadExpected.tension}, got ${thread.tension}`)
    }
    if (threadExpected.peakTension !== undefined && thread.peakTension !== threadExpected.peakTension) {
      failures.push(`thread ${threadExpected.threadId} peakTension expected ${threadExpected.peakTension}, got ${thread.peakTension}`)
    }
    if (threadExpected.loadBearing !== undefined && thread.loadBearing !== threadExpected.loadBearing) {
      failures.push(`thread ${threadExpected.threadId} loadBearing expected ${threadExpected.loadBearing}, got ${thread.loadBearing}`)
    }
    if (threadExpected.chapterDriverKind !== undefined && thread.chapterDriverKind !== threadExpected.chapterDriverKind) {
      failures.push(`thread ${threadExpected.threadId} chapterDriverKind expected ${threadExpected.chapterDriverKind}, got ${thread.chapterDriverKind ?? '(unset)'}`)
    }
    if (threadExpected.successorToThreadId !== undefined && thread.successorToThreadId !== threadExpected.successorToThreadId) {
      failures.push(`thread ${threadExpected.threadId} successorToThreadId expected ${threadExpected.successorToThreadId}, got ${thread.successorToThreadId ?? '(unset)'}`)
    }
    for (const wantEntry of threadExpected.tensionHistoryIncludes ?? []) {
      const found = thread.tensionHistory.some((e) => e.turn === wantEntry.turn && e.value === wantEntry.value)
      if (!found) {
        failures.push(
          `thread ${threadExpected.threadId} tensionHistory missing { turn: ${wantEntry.turn}, value: ${wantEntry.value} }; got ${JSON.stringify(thread.tensionHistory)}`
        )
      }
    }
  }
  if (expected.chapterCloseReadiness) {
    const readiness = computeChapterCloseReadiness(
      state,
      expected.chapterCloseReadiness.pivotSignaled ?? false
    )
    if (readiness.closeReady !== expected.chapterCloseReadiness.closeReady) {
      failures.push(
        `chapterCloseReadiness.closeReady expected ${expected.chapterCloseReadiness.closeReady}, got ${readiness.closeReady}`
      )
    }
    if (
      expected.chapterCloseReadiness.spineResolved !== undefined &&
      readiness.spineResolved !== expected.chapterCloseReadiness.spineResolved
    ) {
      failures.push(
        `chapterCloseReadiness.spineResolved expected ${expected.chapterCloseReadiness.spineResolved}, got ${readiness.spineResolved}`
      )
    }
    if (
      expected.chapterCloseReadiness.stalledFallback !== undefined &&
      readiness.stalledFallback !== expected.chapterCloseReadiness.stalledFallback
    ) {
      failures.push(
        `chapterCloseReadiness.stalledFallback expected ${expected.chapterCloseReadiness.stalledFallback}, got ${readiness.stalledFallback}`
      )
    }
    if (
      expected.chapterCloseReadiness.successorRequired !== undefined &&
      readiness.successorRequired !== expected.chapterCloseReadiness.successorRequired
    ) {
      failures.push(
        `chapterCloseReadiness.successorRequired expected ${expected.chapterCloseReadiness.successorRequired}, got ${readiness.successorRequired}`
      )
    }
    if (
      expected.chapterCloseReadiness.promotedSpineThreadId !== undefined &&
      readiness.promotedSpineThreadId !== expected.chapterCloseReadiness.promotedSpineThreadId
    ) {
      const promotedId = expected.chapterCloseReadiness.promotedSpineThreadId
      const promotedThread = state.campaign.threads[promotedId]
      const promotionAlreadyApplied =
        state.chapter.setup.spineThreadId === promotedId &&
        promotedThread?.spineForChapter === state.meta.currentChapter
      if (!promotionAlreadyApplied) {
        failures.push(
          `chapterCloseReadiness.promotedSpineThreadId expected ${promotedId}, got ${readiness.promotedSpineThreadId ?? '(none)'}`
        )
      }
    }
  }
  if (expected.quickActionRepair) {
    const qr = expected.quickActionRepair
    const repaired = repairSuggestedActions(qr.inputActions, {
      state: stateBefore,
      failedSkill: qr.failedSkill,
    })
    if (qr.outputCount !== undefined && repaired.actions.length !== qr.outputCount) {
      failures.push(`quickActionRepair.outputCount expected ${qr.outputCount}, got ${repaired.actions.length}`)
    }
    for (const expectedAction of qr.outputActionsInclude ?? []) {
      if (!repaired.actions.includes(expectedAction)) {
        failures.push(`quickActionRepair output missing "${expectedAction}"`)
      }
    }
    for (const unexpectedAction of qr.outputActionsExclude ?? []) {
      if (repaired.actions.includes(unexpectedAction)) {
        failures.push(`quickActionRepair output unexpectedly includes "${unexpectedAction}"`)
      }
    }
    if (qr.categoryCountAtLeast !== undefined) {
      const categoryCount = new Set(repaired.actions.map(classifyQuickAction)).size
      if (categoryCount < qr.categoryCountAtLeast) {
        failures.push(`quickActionRepair categoryCount expected ≥${qr.categoryCountAtLeast}, got ${categoryCount}`)
      }
    }
    for (const note of qr.notesInclude ?? []) {
      if (!repaired.notes.some((n) => n.includes(note))) {
        failures.push(`quickActionRepair notes missing "${note}"`)
      }
    }
  }
  if (expected.authorInputSeed) {
    const seed = compileAuthorInputSeed(
      stateBefore,
      (expected.authorInputSeed.priorChapterMeaning ?? null) as never
    )
    for (const snippet of expected.authorInputSeed.hookPremiseIncludes ?? []) {
      if (!seed.hook.premise.includes(snippet)) {
        failures.push(`authorInputSeed.hook.premise missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.hookFirstEpisodeIncludes ?? []) {
      if (!seed.hook.firstEpisode?.includes(snippet)) {
        failures.push(`authorInputSeed.hook.firstEpisode missing "${snippet}"`)
      }
    }
  }
  if (expected.pressure) {
    const pressure = expected.pressure
    for (const engineExpected of pressure.engineValues ?? []) {
      const engine = stateBefore.campaign.engines[engineExpected.engineId]
      if (!engine) {
        failures.push(`pressure.engineValues missing engine ${engineExpected.engineId}`)
        continue
      }
      const value = deriveEngineValue(engine, stateBefore.campaign.threads)
      if (value !== engineExpected.value) {
        failures.push(`pressure.engineValues ${engineExpected.engineId} expected ${engineExpected.value}, got ${value}`)
      }
    }
    for (const contributionExpected of pressure.threadContributions ?? []) {
      const thread = stateBefore.campaign.threads[contributionExpected.threadId]
      if (!thread) {
        failures.push(`pressure.threadContributions missing thread ${contributionExpected.threadId}`)
        continue
      }
      const value = threadContribution(thread)
      if (value !== contributionExpected.value) {
        failures.push(`pressure.threadContributions ${contributionExpected.threadId} expected ${contributionExpected.value}, got ${value}`)
      }
    }
    for (const coolExpected of pressure.coolThreads ?? []) {
      const thread = stateBefore.campaign.threads[coolExpected.threadId]
      if (!thread) {
        failures.push(`pressure.coolThreads missing thread ${coolExpected.threadId}`)
        continue
      }
      const result = coolThreadForChapterOpen(
        thread,
        coolExpected.role as Exclude<ThreadRole, 'new'>,
        coolExpected.engineFloor
      )
      if (result.openingFloor !== coolExpected.openingFloor) {
        failures.push(`pressure.coolThreads ${coolExpected.threadId} openingFloor expected ${coolExpected.openingFloor}, got ${result.openingFloor}`)
      }
      if (coolExpected.cooledAtOpen !== undefined && result.cooledAtOpen !== coolExpected.cooledAtOpen) {
        failures.push(`pressure.coolThreads ${coolExpected.threadId} cooledAtOpen expected ${coolExpected.cooledAtOpen}, got ${result.cooledAtOpen}`)
      }
    }
    if (pressure.initializedThreadPressure || pressure.effectiveThreadPressure) {
      const chapterSetup = pressure.initializeChapterSetupPatch
        ? deepMerge(stateBefore.chapter.setup, pressure.initializeChapterSetupPatch) as typeof stateBefore.chapter.setup
        : stateBefore.chapter.setup
      // Priors default to the pre-patch chapter's actives — that's the
      // semantic "active last chapter" set. Fixtures that need a different
      // prior set (e.g. simulating a Ch3→Ch4 transition) can override.
      const priorActiveThreadIds = pressure.priorActiveThreadIds ?? stateBefore.chapter.setup.activeThreadIds
      const initialized = initializeChapterPressure(stateBefore, chapterSetup, priorActiveThreadIds)
      const setupWithPressure = {
        ...chapterSetup,
        threadPressure: initialized,
      }
      for (const expectedEntry of pressure.initializedThreadPressure ?? []) {
        const entry = initialized[expectedEntry.threadId]
        if (!entry) {
          failures.push(`pressure.initializedThreadPressure missing ${expectedEntry.threadId}`)
          continue
        }
        if (expectedEntry.role !== undefined && entry.role !== expectedEntry.role) {
          failures.push(`pressure.initializedThreadPressure ${expectedEntry.threadId} role expected ${expectedEntry.role}, got ${entry.role}`)
        }
        if (expectedEntry.openingFloor !== undefined && entry.openingFloor !== expectedEntry.openingFloor) {
          failures.push(`pressure.initializedThreadPressure ${expectedEntry.threadId} openingFloor expected ${expectedEntry.openingFloor}, got ${entry.openingFloor}`)
        }
        if (expectedEntry.localEscalation !== undefined && entry.localEscalation !== expectedEntry.localEscalation) {
          failures.push(`pressure.initializedThreadPressure ${expectedEntry.threadId} localEscalation expected ${expectedEntry.localEscalation}, got ${entry.localEscalation}`)
        }
        if (expectedEntry.maxThisChapter !== undefined && entry.maxThisChapter !== expectedEntry.maxThisChapter) {
          failures.push(`pressure.initializedThreadPressure ${expectedEntry.threadId} maxThisChapter expected ${expectedEntry.maxThisChapter}, got ${entry.maxThisChapter}`)
        }
        if (expectedEntry.cooledAtOpen !== undefined && entry.cooledAtOpen !== expectedEntry.cooledAtOpen) {
          failures.push(`pressure.initializedThreadPressure ${expectedEntry.threadId} cooledAtOpen expected ${expectedEntry.cooledAtOpen}, got ${entry.cooledAtOpen}`)
        }
      }
      for (const expectedEffective of pressure.effectiveThreadPressure ?? []) {
        const value = getEffectiveThreadPressure(expectedEffective.threadId, setupWithPressure)
        if (value !== expectedEffective.value) {
          failures.push(`pressure.effectiveThreadPressure ${expectedEffective.threadId} expected ${expectedEffective.value}, got ${value}`)
        }
      }
    }
  }
  if (expected.preparedPressureRuntime) {
    const preparedState: Sf2State = structuredClone(stateBefore)
    const priorActiveThreadIds = expected.preparedPressureRuntime.priorActiveThreadIds
      ?? preparedState.chapter.setup.activeThreadIds
    preparedState.chapter.setup = chapterPressureRuntime.prepareChapterOpen(
      preparedState,
      preparedState.chapter.setup,
      priorActiveThreadIds
    )
    for (const engineExpected of expected.preparedPressureRuntime.engineAnchorsInclude ?? []) {
      const engine = preparedState.campaign.engines[engineExpected.engineId]
      if (!engine) {
        failures.push(`preparedPressureRuntime missing engine ${engineExpected.engineId}`)
        continue
      }
      for (const threadId of engineExpected.threadIds) {
        if (!engine.anchorThreadIds.includes(threadId)) {
          failures.push(`preparedPressureRuntime engine ${engineExpected.engineId} missing anchor ${threadId}`)
        }
      }
    }
    for (const engineExpected of expected.preparedPressureRuntime.engineValues ?? []) {
      const engine = preparedState.campaign.engines[engineExpected.engineId]
      if (!engine) {
        failures.push(`preparedPressureRuntime missing engine ${engineExpected.engineId}`)
        continue
      }
      if (engine.value !== engineExpected.value) {
        failures.push(`preparedPressureRuntime engine ${engineExpected.engineId} value expected ${engineExpected.value}, got ${engine.value}`)
      }
    }
    for (const threadExpected of expected.preparedPressureRuntime.threadPressureIncludes ?? []) {
      const entry = preparedState.chapter.setup.threadPressure[threadExpected.threadId]
      if (!entry) {
        failures.push(`preparedPressureRuntime missing threadPressure ${threadExpected.threadId}`)
        continue
      }
      if (threadExpected.openingFloor !== undefined && entry.openingFloor !== threadExpected.openingFloor) {
        failures.push(`preparedPressureRuntime ${threadExpected.threadId} openingFloor expected ${threadExpected.openingFloor}, got ${entry.openingFloor}`)
      }
      if (threadExpected.role !== undefined && entry.role !== threadExpected.role) {
        failures.push(`preparedPressureRuntime ${threadExpected.threadId} role expected ${threadExpected.role}, got ${entry.role}`)
      }
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
  for (const detailExpected of expected.invariantEventDetailIncludes ?? []) {
    const match = invariantEvents.find((event) => {
      if (getEventType(event) !== detailExpected.type) return false
      const data = (event as { data?: { detail?: unknown } }).data
      const detail = typeof data?.detail === 'string' ? data.detail : ''
      return detail.toLowerCase().includes(detailExpected.detailIncludes.toLowerCase())
    })
    if (!match) {
      failures.push(
        `missing invariant event ${detailExpected.type} with detail including "${detailExpected.detailIncludes}"`
      )
    }
  }
  if (expected.displaySentinel) {
    const ds = expected.displaySentinel
    const sentinelEvents = invariantEvents.filter(
      (e) => getEventType(e) === 'display_sentinel_finding'
    )
    if (ds.findingsCount !== undefined && sentinelEvents.length !== ds.findingsCount) {
      failures.push(
        `displaySentinel.findingsCount expected ${ds.findingsCount}, got ${sentinelEvents.length}`
      )
    }
    if (ds.findingsCountAtLeast !== undefined && sentinelEvents.length < ds.findingsCountAtLeast) {
      failures.push(
        `displaySentinel.findingsCountAtLeast expected ≥${ds.findingsCountAtLeast}, got ${sentinelEvents.length}`
      )
    }
    if (ds.findingsAbsent && sentinelEvents.length > 0) {
      const surfaces = sentinelEvents
        .map((e) => (e as { data?: { surface?: string } }).data?.surface)
        .filter(Boolean)
        .join(', ')
      failures.push(`displaySentinel expected zero findings, got ${sentinelEvents.length} (${surfaces})`)
    }
    for (const include of ds.findingsInclude ?? []) {
      const match = sentinelEvents.find((e) => {
        const data = (e as { data?: Record<string, unknown> }).data ?? {}
        if (include.findingType !== undefined && data.findingType !== include.findingType) return false
        if (include.severity !== undefined && data.severity !== include.severity) return false
        if (include.surfaceEquals !== undefined && data.surface !== include.surfaceEquals) return false
        if (include.recommendedAction !== undefined && data.recommendedAction !== include.recommendedAction)
          return false
        return true
      })
      if (!match) {
        failures.push(
          `displaySentinel.findingsInclude missing ${JSON.stringify(include)}`
        )
      }
    }
  }
  if (expected.sceneKernel) {
    const sk = buildSceneKernel(state)
    const k = expected.sceneKernel
    if (k.sceneId !== undefined && sk.sceneId !== k.sceneId) {
      failures.push(`sceneKernel.sceneId expected ${k.sceneId}, got ${sk.sceneId}`)
    }
    if (k.presentEntityIdsEquals !== undefined) {
      const want = [...k.presentEntityIdsEquals].sort().join(',')
      const got = [...sk.presentEntityIds].sort().join(',')
      if (want !== got) failures.push(`sceneKernel.presentEntityIds expected [${want}], got [${got}]`)
    }
    if (k.currentInterlocutorIdsEquals !== undefined) {
      const want = [...k.currentInterlocutorIdsEquals].sort().join(',')
      const got = [...sk.currentInterlocutorIds].sort().join(',')
      if (want !== got) failures.push(`sceneKernel.currentInterlocutorIds expected [${want}], got [${got}]`)
    }
    if (k.nearbyEntityIdsEquals !== undefined) {
      const want = [...k.nearbyEntityIdsEquals].sort().join(',')
      const got = [...sk.nearbyEntityIds].sort().join(',')
      if (want !== got) failures.push(`sceneKernel.nearbyEntityIds expected [${want}], got [${got}]`)
    }
    for (const id of k.absentEntityIdsIncludes ?? []) {
      if (!sk.absentEntityIds.includes(id)) failures.push(`sceneKernel.absentEntityIds missing ${id}`)
    }
    for (const id of k.absentEntityIdsExcludes ?? []) {
      if (sk.absentEntityIds.includes(id)) failures.push(`sceneKernel.absentEntityIds should exclude ${id}`)
    }
    for (const id of k.speakingAllowedEntityIdsIncludes ?? []) {
      if (!sk.speakingAllowedEntityIds.includes(id))
        failures.push(`sceneKernel.speakingAllowedEntityIds missing ${id}`)
    }
    for (const id of k.activeProcedureIdsIncludes ?? []) {
      if (!sk.activeProcedureIds.includes(id))
        failures.push(`sceneKernel.activeProcedureIds missing ${id}`)
    }
    for (const id of k.activeCountdownIdsIncludes ?? []) {
      if (!sk.time.activeCountdowns.some((c) => c.id === id))
        failures.push(`sceneKernel.activeCountdowns missing ${id}`)
    }
    if (k.forbiddenWithoutTransitionMinCount !== undefined) {
      if (sk.forbiddenWithoutTransition.length < k.forbiddenWithoutTransitionMinCount) {
        failures.push(
          `sceneKernel.forbiddenWithoutTransition expected ≥${k.forbiddenWithoutTransitionMinCount}, got ${sk.forbiddenWithoutTransition.length}`
        )
      }
    }
    for (const aliasExpected of k.aliasMapIncludes ?? []) {
      const aliases = sk.aliasMap[aliasExpected.entityId]
      if (!aliases || !aliases.some((a) => a.includes(aliasExpected.aliasIncludes))) {
        failures.push(
          `sceneKernel.aliasMap[${aliasExpected.entityId}] missing alias including "${aliasExpected.aliasIncludes}"`
        )
      }
    }
    if (k.version !== undefined && sk.version !== k.version) {
      failures.push(`sceneKernel.version expected ${k.version}, got ${sk.version}`)
    }
  }
  if (expected.resolvedAction) {
    const scenePacket = buildScenePacket(stateBefore, fixture.input.playerInput, stateBefore.history.turns.length)
    const action = scenePacket.packet.playerInput.resolvedAction
    const want = expected.resolvedAction
    if (!action) {
      failures.push('resolvedAction missing from scene packet')
    } else {
      if (want.actionType !== undefined && action.actionType !== want.actionType) {
        failures.push(`resolvedAction.actionType expected ${want.actionType}, got ${action.actionType}`)
      }
      if (want.targetEntityIdsEquals !== undefined) {
        const expectedIds = [...want.targetEntityIdsEquals].sort().join(',')
        const actualIds = [...action.targetEntityIds].sort().join(',')
        if (expectedIds !== actualIds) {
          failures.push(`resolvedAction.targetEntityIds expected [${expectedIds}], got [${actualIds}]`)
        }
      }
      for (const id of want.forbiddenTargetSubstitutionsIncludes ?? []) {
        if (!action.forbiddenTargetSubstitutions.includes(id)) {
          failures.push(`resolvedAction.forbiddenTargetSubstitutions missing ${id}`)
        }
      }
      for (const refExpected of want.resolvedReferenceIncludes ?? []) {
        const match = action.resolvedReferences.find((ref) => {
          if (refExpected.surface !== undefined && ref.surface !== refExpected.surface) return false
          if (refExpected.resolvedToEntityId !== undefined && ref.resolvedToEntityId !== refExpected.resolvedToEntityId) return false
          if (refExpected.confidence !== undefined && ref.confidence !== refExpected.confidence) return false
          return true
        })
        if (!match) failures.push(`resolvedAction.resolvedReference missing ${JSON.stringify(refExpected)}`)
      }
    }
  }
  for (const ref of expected.archivistAcceptedRefs ?? []) {
    const outcome = patchResult.outcomes.find((o) => o.writeRef === ref)
    if (!outcome?.accepted) failures.push(`archivist write ${ref} was not accepted${outcome?.reason ? `: ${outcome.reason}` : ''}`)
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

  // Beats — count + content checks against the post-patch beat registry.
  const beats = Object.values(state.campaign.beats ?? {})
  if (typeof expected.beatsCount === 'number') {
    if (beats.length !== expected.beatsCount) {
      failures.push(`beats count expected ${expected.beatsCount}, got ${beats.length}`)
    }
  }
  for (const want of expected.beatsInclude ?? []) {
    const match = beats.find((b) => {
      if (want.textIncludes && !b.text.toLowerCase().includes(want.textIncludes.toLowerCase())) return false
      if (typeof want.salienceAtLeast === 'number' && b.salience < want.salienceAtLeast) return false
      if (want.tagsInclude && !want.tagsInclude.every((t) => b.emotionalTags.includes(t as never))) return false
      if (want.participantsInclude && !want.participantsInclude.every((p) => b.participants.includes(p))) return false
      return true
    })
    if (!match) {
      failures.push(`missing beat matching ${JSON.stringify(want)}`)
    }
  }

  // Revelations — counter + evidence + revealed-flag checks.
  const revelations = state.chapter?.scaffolding?.possibleRevelations ?? []
  for (const want of expected.revelationsInclude ?? []) {
    const r = revelations.find((rev) => rev.id === want.id)
    if (!r) {
      failures.push(`revelation ${want.id} not found`)
      continue
    }
    if (typeof want.hintsDelivered === 'number' && (r.hintsDelivered ?? 0) !== want.hintsDelivered) {
      failures.push(`revelation ${want.id} hintsDelivered expected ${want.hintsDelivered}, got ${r.hintsDelivered ?? 0}`)
    }
    if (typeof want.hintsRequired === 'number' && (r.hintsRequired ?? 0) !== want.hintsRequired) {
      failures.push(`revelation ${want.id} hintsRequired expected ${want.hintsRequired}, got ${r.hintsRequired ?? 0}`)
    }
    if (typeof want.revealed === 'boolean' && r.revealed !== want.revealed) {
      failures.push(`revelation ${want.id} revealed expected ${want.revealed}, got ${r.revealed}`)
    }
    if (typeof want.hintEvidenceCount === 'number') {
      const got = (r.hintEvidence ?? []).length
      if (got !== want.hintEvidenceCount) {
        failures.push(`revelation ${want.id} hintEvidenceCount expected ${want.hintEvidenceCount}, got ${got}`)
      }
    }
    for (const phrase of want.hintEvidencePhraseEmittedIncludes ?? []) {
      const found = (r.hintEvidence ?? []).some(
        (e) => (e.phraseEmitted ?? '').toLowerCase().includes(phrase.toLowerCase())
      )
      if (!found) {
        failures.push(`revelation ${want.id} hintEvidence missing phraseEmitted "${phrase}"`)
      }
    }
  }

  // Working-set telemetry — assert against the most-recent record on stateAfter.
  if (expected.workingSetTelemetry) {
    const records = state.derived?.workingSetTelemetry ?? []
    const latest = records[records.length - 1]
    if (!latest) {
      failures.push(`workingSetTelemetry: no record present on stateAfter`)
    } else {
      const want = expected.workingSetTelemetry
      const checkBucket = (
        label: string,
        bucket: string[] | undefined,
        actual: ReadonlyArray<string>
      ): void => {
        for (const id of bucket ?? []) {
          if (!actual.includes(id)) {
            failures.push(`workingSetTelemetry.${label} missing ${id} (got: ${actual.join(', ') || 'empty'})`)
          }
        }
      }
      checkBucket('excludedButReferenced', want.excludedButReferencedIncludes, latest.excludedButReferenced)
      checkBucket('fullButUnreferenced', want.fullButUnreferencedIncludes, latest.fullButUnreferenced)
      checkBucket('stubButMutated', want.stubButMutatedIncludes, latest.stubButMutated)
      checkBucket('referencedByAlias', want.referencedByAliasIncludes, latest.referencedByAlias)
      checkBucket('referencedByRole', want.referencedByRoleIncludes, latest.referencedByRole)
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
          peakTension: 5,
          resolutionCriteria: 'The immediate intake problem is resolved.',
          failureMode: 'The intake problem escalates.',
          retrievalCue: 'The public-facing pressure in the current chapter.',
          loadBearing: true,
          spineForChapter: 1,
          tensionHistory: [],
        },
      },
      decisions: {},
      engines: {},
      promises: {},
      clues: {},
      beats: {},
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
      documents: {},
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
        threadPressure: {},
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
        firstTurnIndex: 0,
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
