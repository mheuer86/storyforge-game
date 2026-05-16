import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { completeAuthorSetupForValidation, normalizeAuthorSetup, validateAuthorSetup, validateAuthorSetupWarnings, validateAuthorToolInput, validateChapterRaw } from '../lib/sf2/author/contract'
import { applyAuthorChapterOpening } from '../lib/sf2/author/chapter-opening'
import { applyAuthoredToCampaign } from '../lib/sf2/author/hydrate'
import { validateNpcDisposition } from '../lib/sf2/author/disposition-defaults'
import { arcThreadsFromArcSetup, transformArcSetup, validateArcPlan } from '../lib/sf2/arc-author/transform'
import { transformAuthorSetup } from '../lib/sf2/author/transform'
import { getArcVariantCandidates } from '../lib/sf2/arc-author/variants'
import { applyLatentArcQuestionChapterOpen, selectLatentArcQuestionsForChapter } from '../lib/sf2/arc-questions'
import { normalizePersistedSf2State } from '../lib/sf2/persistence/normalize'
import { applySf2RollResourceSpends, resolveSf2Roll } from '../lib/sf2/rolls/resolve'
import { buildScenePacket, renderPerTurnDelta } from '../lib/sf2/retrieval/scene-packet'
import {
  buildNarratorTurnContext,
  type Sf2NarratorRollResolution,
} from '../lib/sf2/narrator/turn-context'
import { extractSf2RollSkillTags, inspectSf2RollSkillTags } from '../lib/sf2/narrator/roll-gates'
import {
  evaluateSocialModifierAdvisories,
  reconcileRollModifierWithSocialAdvisories,
  renderSocialModifierAdvisories,
} from '../lib/sf2/social-modifiers/evaluate'
import { buildMissingNarrateTurnRepairRequest } from '../lib/sf2/narrator/commit-repair'
import { buildSceneKernel } from '../lib/sf2/scene-kernel/build'
import { formatFinding, repairVisibleLeaks, scanDisplayOutput } from '../lib/sf2/sentinel/display'
import { classifyQuickAction, repairSuggestedActions } from '../lib/sf2/narrator/suggested-actions'
import { compileAuthorInputSeed } from '../lib/sf2/author/payload'
import { buildAuthorSituation } from '../lib/sf2/author/prompt'
import { compileSf2SetupSeed } from '../lib/sf2/setup/compile-seed'
import {
  listSf2SetupHooks,
  listSf2SetupOrigins,
  listSf2SetupPlaybooks,
} from '../lib/sf2/setup/options'
import type { Sf2SetupSelection } from '../lib/sf2/setup/types'
import { buildArcAuthorSituation, SF2_ARC_AUTHOR_ROLE } from '../lib/sf2/arc-author/prompt'
import {
  AUTHOR_DEFAULT_MAX_ATTEMPTS,
  buildAuthorRetryNudge,
  shouldRetryAuthorValidation,
} from '../lib/sf2/author/retry'
import { evaluateProcedureArcPassBar } from '../lib/sf2/arc-author/procedure-eval'
import { debugEntriesToDiagnosticFindings, queryOpenErrorFindingsForEntity } from '../lib/sf2/diagnostics'
import { buildArchivistTurnMessage } from '../lib/sf2/archivist/prompt'
import { ARCHIVIST_PARITY_CONTRACT, extractTurnTool } from '../lib/sf2/archivist/tools'
import { processArchivistExtraction } from '../lib/sf2/archivist/extraction'
import { AUTHOR_TOOLS, AUTHOR_TOOL_NAME } from '../lib/sf2/author/tools'
import { ARC_AUTHOR_TOOLS, ARC_AUTHOR_TOOL_NAME } from '../lib/sf2/arc-author/tools'
import { CHAPTER_MEANING_TOOLS, CHAPTER_MEANING_TOOL_NAME } from '../lib/sf2/chapter-meaning/tools'
import { NARRATOR_MECHANICAL_EFFECT_KINDS, NARRATOR_TOOL_NAME, NARRATOR_TOOLS } from '../lib/sf2/narrator/tools'
import { createInitialSf2State, isArcAuthored, isChapterAuthored } from '../lib/sf2/game-data'
import { evaluateWrite, recordObservation } from '../lib/sf2/firewall/actor'
import { validateChapterMeaningTransitionSeed } from '../lib/sf2/chapter-meaning/validation'
import { buildAccessExplorationPacket } from '../lib/sf2/procedure-access-exploration'
import {
  derivePlanningRollSupport,
  normalizeOffscreenTaskRecord,
  normalizePlanningAssessment,
  normalizePlanningSupportContributions,
} from '../lib/sf2/procedure-planning'
import {
  buildInvestigationSynthesisPacket,
  classifyInvestigationDatum,
} from '../lib/sf2/procedure-investigation'
import { detectProcedureOmissionDrift } from '../lib/sf2/procedure-activation-diagnostics'
import {
  chooseProcedureTransition,
  deriveForwardMotionAdvisory,
} from '../lib/sf2/procedure-transitions'
import { canonicalLocationNameKey } from '../lib/sf2/locations'
import { countRetrievalCueWords } from '../lib/sf2/retrieval-cues'
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
  type Sf2ChapterMeaning,
  type Sf2CoherenceFinding,
  type Sf2RollRecord,
  type Sf2State,
  type ThreadRole,
} from '../lib/sf2/types'
import { computeSessionSummary } from '../lib/sf2/instrumentation/session-summary'
import {
  coerceDisposition,
  coerceHeat,
  coerceTempLoadTag,
  repairOwnerRef,
  resolveAuthoredThreadOwnership,
  resolveSceneSnapshotReferences,
  validateSnapshotIdsForMode,
  type Sf2ReferencePolicyMode,
} from '../lib/sf2/reference-policy'
import {
  commitSf2Turn,
  extractMechanicalEffects,
  finalizeArchivistTurn,
  type Sf2TurnPipelineEvent,
} from '../lib/sf2/runtime/turn-pipeline'
import { applyArchivistPatch, summarizePatchOutcome, type ApplyPatchResult } from '../lib/sf2/validation/apply-patch'
import { __sf2TurnResolutionTestHooks } from '../lib/sf2/turn-resolution/resolve'

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
      rollRecords?: Sf2RollRecord[]
    }
    archivist?: {
      patch?: Partial<Sf2ArchivistPatch> | null
    } | null
  }
  expected?: {
    presentNpcIdsIncludes?: string[]
    presentNpcIdsExcludes?: string[]
    presentNpcIdsExact?: string[]
    scenePacketAtmosphereIncludes?: string[]
    scenePacketAtmosphereCountBetween?: [number, number]
    revelationProgressIncludes?: Array<{
      revelationId: string
      due?: boolean
      dueReasonIncludes?: string
      statementIncludes?: string
    }>
    coherenceFindingsInclude?: Array<{
      type: string
      stateReference?: string
      suggestedNoteIncludes?: string
    }>
    coherenceFindingsExclude?: Array<{
      type: string
      stateReference?: string
    }>
    scenePacketCastIncludes?: string[]
    scenePacketCastExcludes?: string[]
    castPacketIncludes?: Array<{
      npcId: string
      tempLoadTag?: string
      voiceImperativeIncludes?: string
      behavioralContractIncludes?: string[]
      prohibitionsInclude?: string[]
      prohibitionsExclude?: string[]
      profileFactsInclude?: string[]
    }>
    perTurnDeltaIncludes?: string[]
    perTurnDeltaExcludes?: string[]
    procedurePlanningSupport?: Record<string, unknown>
    procedureOffscreenTask?: Record<string, unknown>
    procedureTransitions?: Record<string, unknown>
    forwardMotionAdvisories?: Record<string, unknown>
    procedureAccessExploration?: Record<string, unknown>
    procedureInvestigation?: Record<string, unknown>
    procedureActivationDiagnostics?: Record<string, unknown>
    arcAuthorProcedureEval?: Record<string, unknown>
    latentArcQuestions?: Record<string, unknown>
    npcNamesInclude?: string[]
    npcNamesAbsent?: string[]
    npcIdsIncludes?: string[]
    npcRolesInclude?: Array<{ npcId: string; role: string }>
    ownerThreadIdsEquals?: Array<{ ownerKind: string; ownerId: string; threadIds: string[] }>
    arcStatusesInclude?: Array<{ arcId: string; status: string; arcPlanStatus?: string }>
    npcIdentityIncludes?: Array<{ npcId: string; pronoun?: string; age?: string; profileFactsInclude?: string[] }>
    npcAgendasInclude?: Array<{ npcId: string; currentMove?: string; lastUpdatedTurn?: number }>
    temporalAnchorsInclude?: Array<{ anchorId: string; kind?: string; label?: string; anchorText?: string; status?: string }>
    obligationsInclude?: Array<{ obligationId: string; status?: string; balance?: number; unit?: string; claimantId?: string; debtorKind?: string; dueConditionIncludes?: string; clearanceConditionIncludes?: string }>
    playerCreditsEquals?: number
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
      deterioration?: { kind?: string; deadline?: string; temporalAnchorId?: string }
      tensionHistoryIncludes?: Array<{ turn: number; value: number }>
      resolutionGatesInclude?: Array<{ gateId: string; status?: string; evidenceQuoteIncludes?: string }>
      progressEventsInclude?: Array<{ summaryIncludes: string; gateIdsInclude?: string[]; satisfiedGateIdsInclude?: string[] }>
    }>
    cluesInclude?: Array<{
      clueId: string
      status?: string
      anchoredToIncludes?: string[]
      contentIncludes?: string
      retrievalCueEquals?: string
      retrievalCueMaxWords?: number
      retrievalCueMaxChars?: number
    }>
    cluesCount?: number
    chapterCloseReadiness?: {
      pivotSignaled?: boolean
      closeReady: boolean
      spineResolved?: boolean
      stalledFallback?: boolean
      successorRequired?: boolean
      promotedSpineThreadId?: string
      objectiveResolved?: boolean
      objectiveOutcome?: string
      reframeCandidateThreadId?: string
      closeOrReframeDirectiveIncludes?: string
    }
    postTurnPressureRecovery?: {
      pendingRecoveryNotesInclude?: string[]
      eventsInclude?: Array<{ type: string; reason?: string }>
    }
    quickActionRepair?: {
      failedSkill?: string
      playerInput?: string
      visibleProse?: string
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
      hookPremiseExcludes?: string[]
      hookCrucibleIncludes?: string[]
      hookCrucibleExcludes?: string[]
      hookFirstEpisodeIncludes?: string[]
      worldVocabularyIncludes?: string[]
      worldVocabularyExcludes?: string[]
      seedJsonIncludes?: string[]
      seedJsonExcludes?: string[]
      arcAuthorSituationIncludes?: string[]
      arcAuthorSituationExcludes?: string[]
      arcAuthorRoleIncludes?: string[]
      arcAuthorRoleExcludes?: string[]
      authorSituationIncludes?: string[]
      authorSituationExcludes?: string[]
      arcVariantCandidateCount?: number
      arcVariantCandidateIdsInclude?: string[]
      arcVariantCandidateScenarioBiasesInclude?: string[]
      arcVariantCandidateJsonIncludes?: string[]
      arcVariantCandidateJsonExcludes?: string[]
    }
    setupCompiler?: {
      cases: Array<{
        name: string
        selection: Omit<Sf2SetupSelection, 'hookId'> & { hookTitle: string }
        expect: {
          originName?: string
          playbookName?: string
          hookTitle?: string
          hookPremiseIncludes?: string[]
          hookObjectiveEquals?: string
          hookCrucibleEquals?: string
          hookArcNameEquals?: string
          hookFirstEpisodeEquals?: string
          worldVocabularyIncludes?: string[]
          playerHpEquals?: number
          playerAcEquals?: number
          playerCreditsEquals?: number
          playerProficienciesInclude?: string[]
          playerInventoryIncludes?: string[]
          playerTraitEquals?: string
          pcNaturalMovesInclude?: string[]
        }
      }>
      hookFilters?: Array<{
        genreId: string
        originId: string
        playbookId: string
        includesTitles?: string[]
        excludesTitles?: string[]
      }>
      optionLists?: Array<{
        genreId: string
        originIdsInclude?: string[]
        playbookIdsInclude?: Array<{ originId: string; playbookIds: string[] }>
      }>
    }
    authorRetryNudge?: {
      errors: string[]
      genreId?: string
      hookTitle?: string
      containsAll?: string[]
      containsNone?: string[]
    }
    authorRetryPolicy?: {
      defaultMaxAttemptsEquals?: number
      retryableErrors?: string[]
      nonRetryableErrors?: string[]
    }
    diagnosticEnvelope?: {
      debugEntries: Array<{ kind: string; at: number; data: unknown }>
      countEquals?: number
      sourcesInclude?: string[]
      openErrorQuery?: { entityId: string; countEquals: number }
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
    pressureEventsCount?: number
    pressureEventsInclude?: Array<{
      idempotencyKey?: string
      source?: string
      targetThreadIdsInclude?: string[]
      whoPays?: string
      visiblePressureIncludes?: string
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
    turnResolution?: {
      actionType?: string
      targetEntityIdsEquals?: string[]
      targetThreadIdsEquals?: string[]
      consequenceEventsInclude?: Array<{
        kind: string
        rollOutcome?: string
        pressureDelta?: number
        stateMutationObserved?: boolean
        targetThreadIdsEquals?: string[]
        noteIncludes?: string
      }>
      driftFindingsInclude?: Array<{
        type?: string
        stateReference?: string
        suggestedNoteIncludes?: string
      }>
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
        arcThreadIdsCountAtLeast?: number
        arcThreadEntitiesCountAtLeast?: number
        arcThreadEntitiesStatusEquals?: string
        arcThreadEntitiesAnchoredArcIdEquals?: string
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
        warningCount?: number
        combinedErrorCount?: number
        validationErrorIncludesAll?: string[]
        warningIncludesAll?: string[]
        combinedErrorIncludesAll?: string[]
        titleEquals?: string
        threadCountEquals?: number
        firstThreadInitialTensionEquals?: number
        visibleNpcIdsEquals?: string[]
        firstRevealValidContextsEquals?: string[]
        firstRevealPlayerTopicKeysEquals?: string[]
        firstRevealCashPlayerPressesTopic?: boolean
        pacingTargetEquals?: { min: number; max: number }
        pressureLadderTriggerConditionEquals?: Array<{ index: number; value: string }>
        arcThreadIdsEquals?: string[]
        threadLinksEquals?: Array<{ activeThreadId: string; arcThreadId: string; relation?: string }>
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
        currentAreaNodeIdEquals?: string
        locationAreaNodes?: Array<{
          locationId: string
          idsInclude?: string[]
          namesInclude?: string[]
          count?: number
        }>
        currentInterlocutorIdsEquals?: string[]
        sceneSnapshotFirstTurnIndexEquals?: number
        sceneBundleCacheCleared?: boolean
        hasCampaignBuckets?: string[]
        pressureEventsCount?: number
        threadOwnerEquals?: { threadId: string; kind: string; id: string }
        npcRolesInclude?: Array<{ npcId: string; role: string }>
        ownerThreadIdsEquals?: Array<{ ownerKind: string; ownerId: string; threadIds: string[] }>
        arcPlanStatusEquals?: string
        arcEntityStatusEquals?: { arcId: string; status: string }
        chapterArcThreadIdsEquals?: string[]
        chapterThreadLinksEquals?: Array<{ activeThreadId: string; arcThreadId: string; relation?: string }>
        repairsInclude?: string[]
      }
    }
    authorHydration?: {
      rawToolInput: Record<string, unknown>
      chapter?: number
      loadBearingIds?: string[]
      expect: {
        npcIdentityIncludes?: Array<{ npcId: string; pronoun?: string; age?: string; profileFactsInclude?: string[] }>
        npcRolesInclude?: Array<{ npcId: string; role: string }>
        ownerThreadIdsEquals?: Array<{ ownerKind: string; ownerId: string; threadIds: string[] }>
        threadOwnerEquals?: { threadId: string; kind: string; id: string }
      }
    }
    authorChapterOpening?: {
      phase: 'chapter_1' | 'continuation'
      rawToolInput: Record<string, unknown>
      chapter: number
      expect: {
        currentChapterEquals?: number
        currentSceneIdEquals?: string
        currentLocationIdEquals?: string
        currentLocationNameEquals?: string
        currentTimeLabelEquals?: string
        sceneSnapshotFirstTurnIndexEquals?: number
        sceneBundleCacheCleared?: boolean
        threadStatusesInclude?: Array<{ threadId: string; status: string }>
        threadPressureIncludes?: Array<{ threadId: string; role?: string; openingFloor?: number; localEscalation?: number; maxThisChapter?: number }>
        telemetryEquals?: {
          chapter?: number
          title?: string
          activeThreadCount?: number
          pressureLadderCount?: number
        }
      }
    }
    referencePolicy?: {
      // Pure-function checks on lib/sf2/reference-policy. These assert the
      // policy boundary directly so observe/strict/repair behavior is visible
      // without relying on a model call.
      canonicalIds?: Array<{
        value: string
        mode: Sf2ReferencePolicyMode
        ok: boolean
        violationReasons?: string[]
      }>
      sceneSnapshot?: {
        mode: Sf2ReferencePolicyMode
        presentNpcIds?: unknown[]
        currentInterlocutorIds?: unknown[]
        resolvedPresentNpcIdsEquals?: string[]
        currentInterlocutorIdsEquals?: string[]
        placeholderIdsInclude?: string[]
        violationReasonsInclude?: string[]
      }
      ownerHints?: Array<{
        ownerHint: string
        ownerKind?: string
        ownerId?: string
        stakeholderIds?: string[]
      }>
      ownerRepair?: {
        raw: Record<string, unknown> | null
        kind: string
        id: string
      }
      coercions?: {
        disposition?: { raw: unknown; fallback: string; tier: string; coerced?: boolean }
        heat?: { raw: unknown; fallback: string; level: string; coerced?: boolean }
        tempLoadTag?: { raw: unknown; status: string; value?: string }
      }
    }
    narratorMessages?: {
      // Run buildNarratorTurnContext(stateBefore, ...) and assert the assembled
      // message array. Targets regressions where the message build drops or
      // omits required content (cache-invalidation dropping replay window,
      // skill-tag binding not getting injected, etc.).
      stateBefore?: 'fixture-stateBefore' | 'fixture-stateAfter'
      isInitial?: boolean
      playerInput?: string
      rollResolution?: Sf2NarratorRollResolution
      includesAssistantProseMatching?: string[]
      assistantMessageCountAtLeast?: number
      assistantMessageCountEquals?: number
      messageCountEquals?: number
      sceneSnapshotFirstTurnIndexEquals?: number
      workingSetEventAbsent?: boolean
      sceneBundleEventAbsent?: boolean
      pacingEventAbsent?: boolean
      systemContainsAll?: string[]
      systemContainsNone?: string[]
      userMessageContainsAll?: string[]
      userMessageContainsNone?: string[]
      requiredRollGateExists?: boolean
    }
    requiredRollGate?: {
      exists: boolean
      source?: string
      kind?: string
      sourceId?: string
      skillsInclude?: string[]
      reasonIncludes?: string
    }
    rollResolver?: {
      cases: Array<{
        name: string
        skill: string
        dc?: number
        modifierType?: 'advantage' | 'disadvantage' | 'challenge'
        modifierReason?: string
        selectedActionLabelIncludes?: string
        expect: {
          ability?: string
          proficient?: boolean
          modifier?: number
          flatBonus?: number
          effectiveDc?: number
          diceMode?: string
          criticalRange?: number
          resolutionKind?: string
          actionOptionKindsInclude?: string[]
          actionOptionLabelsInclude?: string[]
          actionOptionLabelsExclude?: string[]
          sourceLabelsInclude?: string[]
          sourceLabelCounts?: Array<{ labelIncludes: string; count: number }>
          sourceKindsInclude?: string[]
          spentResourcesInclude?: Array<{ kind: string; name: string; amount?: number }>
          applySpend?: {
            traitUses?: Array<{ name: string; current: number }>
            itemCharges?: Array<{ name: string; charges: number }>
          }
        }
      }>
    }
    rollSkillTags?: {
      playerInput?: string
      skillsEquals?: string[]
      skillsInclude?: string[]
      unknownSkillLikeTagsInclude?: string[]
      unknownSkillLikeTagsAbsent?: string[]
    }
    socialModifierAdvisories?: {
      stateBefore?: 'fixture-stateBefore' | 'fixture-stateAfter'
      playerInput?: string
      skill?: string
      targetEntityIds?: string[]
      countEquals?: number
      includes?: Array<{
        id?: string
        source?: string
        modifierType?: string
        targetNpcId?: string
        reasonIncludes?: string
      }>
      renderedIncludes?: string[]
      reconciliation?: {
        skill: string
        requestedModifierType?: 'advantage' | 'disadvantage' | 'challenge'
        requestedModifierReason?: string
        modifierType?: 'advantage' | 'disadvantage' | 'challenge'
        modifierReasonIncludes?: string[]
        diagnosticsInclude?: string[]
      }
    }
    narratorCommitRepair?: {
      completedAssistantProse: string
      toolNamesEquals?: string[]
      toolChoiceTypeEquals?: string
      requestMessageContainsAll?: string[]
      requestMessageContainsNone?: string[]
      assistantMessageContainsAll?: string[]
      messageCountAtLeast?: number
    }
    archivistTurnMessage?: {
      containsAll?: string[]
      containsNone?: string[]
    }
    displaySentinel?: {
      findingsCount?: number
      findingsCountAtLeast?: number
      findingsAbsent?: boolean
      repairsVisibleProse?: {
        containsAll?: string[]
        containsNone?: string[]
      }
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
    currentAreaNodeId?: string | null
    entityIdsInclude?: string[]
    entityIdsAbsent?: string[]
    locationIdsInclude?: string[]
    locationIdsAbsent?: string[]
    locationsMatchingName?: Array<{
      name: string
      count?: number
      idsInclude?: string[]
      idsExclude?: string[]
    }>
    locationDetailsInclude?: Array<{
      locationId: string
      descriptionIncludes?: string
      atmosphericConditionsInclude?: string[]
    }>
    locationAreaNodes?: Array<{
      locationId: string
      idsInclude?: string[]
      namesInclude?: string[]
      count?: number
    }>
    sceneBundleCacheCleared?: boolean | null
    invariantEventsInclude?: string[]
    pendingCoherenceNotesInclude?: string[]
    archivistAcceptedRefs?: string[]
    archivistRejectedRefs?: string[]
    driftIncludes?: Array<{ kind: string; detailIncludes?: string }>
    sensitiveDisclosureGaps?: Array<{ npcId: string; terms: string[] }>
    chapterMeaningValidation?: {
      meaning: Sf2ChapterMeaning
      findingCount?: number
      findingsInclude?: Array<{ field?: string; messageIncludes?: string; severity?: string }>
    }
    archivistSchemaParity?: {
      assertContract?: boolean
    }
    archivistExtraction?: {
      rawToolInput: Record<string, unknown>
      turnIndex?: number
      narratorProse?: string
      expect: {
        pressureEventIdsEquals?: string[]
        pressureEventsCount?: number
        coherenceFindingTypesEquals?: string[]
        fallbackCounters?: Record<string, number>
        summaryEquals?: {
          totalWrites?: number
          accepted?: number
          rejected?: number
          deferred?: number
          anchorMisses?: number
        }
      }
    }
    roleSchemaParity?: {
      assertNarrator?: boolean
      assertAuthor?: boolean
      assertArcAuthor?: boolean
      assertChapterMeaning?: boolean
      assertFirewallDevAssertion?: boolean
    }
    turnResolutionStableJson?: {
      assertThreadKeyOrderIgnored?: boolean
    }
    sessionSummary?: {
      state?: 'fixture-stateBefore' | 'fixture-stateAfter'
      chapterActivityGraceTurns?: number
      arcAdvancementPass?: boolean
      arcAdvancementStatus?: string
      arcAdvancementNotYetEvaluableChapters?: number[]
      arcAdvancementFailedChapters?: number[]
      perChapter?: Array<{
        chapter: number
        arcAdvancementStatus?: string
        arcAdvancementReasonIncludes?: string
      }>
    }
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
  const preTurnScenePacket = buildScenePacket(
    stateBefore,
    fixture.input.isInitial ? '' : fixture.input.playerInput,
    turnIndex
  )
  const preTurnWorkingSet = preTurnScenePacket.workingSet

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
      rollRecords: fixture.input.narrator.rollRecords,
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
  const archivistTurnMessage = buildArchivistTurnMessage(
    committedTurn.stateWithTurnLogged,
    turnIndex + 1,
    fixture.input.narrator.prose,
    annotation
  )

  let scenePacketCastIds: string[] = []
  let scenePacketCast: ReturnType<typeof buildScenePacket>['packet']['cast'] = []
  let scenePacketAtmosphere: string[] = []
  let perTurnDeltaText = ''
  try {
    const scenePacket = buildScenePacket(stateAfter, fixture.input.playerInput, turnIndex + 1)
    scenePacketCastIds = scenePacket.packet.cast.map((c) => c.npcId)
    scenePacketCast = scenePacket.packet.cast
    scenePacketAtmosphere = scenePacket.packet.scene.location.atmosphericConditions
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
    preTurnScenePacket.packet.revelationProgress,
    (committedTurn.archivistReplay?.coherenceFindings ?? []) as Sf2CoherenceFinding[],
    scenePacketCastIds,
    scenePacketCast,
    scenePacketAtmosphere,
    perTurnDeltaText,
    archivistTurnMessage,
    failures
  )
  assertSensitiveDisclosureGaps(fixture, stateBefore, failures)
  assertRollSkillTags(fixture, failures)
  assertSocialModifierAdvisories(fixture, stateBefore, stateAfter, failures)
  assertRequiredRollGate(fixture, stateBefore, failures)
  assertNarratorMessages(fixture, stateBefore, stateAfter, failures)
  assertNarratorCommitRepair(fixture, stateBefore, failures)
  assertDispositionDerivation(fixture, failures)
  assertAuthorContract(fixture, stateBefore, failures)
  assertAuthorHydration(fixture, stateBefore, failures)
  assertAuthorChapterOpening(fixture, stateBefore, failures)
  assertPersistenceNormalize(fixture, failures)
  assertReferencePolicy(fixture, stateBefore, failures)
  assertArcTransform(fixture, failures)
  assertArcValidation(fixture, failures)
  assertLatentArcQuestions(fixture, stateBefore, failures)
  assertChapterMeaningValidation(fixture, stateBefore, failures)
  assertArchivistSchemaParity(fixture, failures)
  assertArchivistExtraction(fixture, stateBefore, failures)
  assertRoleSchemaParity(fixture, failures)
  assertTurnResolutionStableJson(fixture, failures)
  assertSessionSummary(fixture, stateBefore, stateAfter, failures)
  assertProcedurePlanningSupport(fixture, failures)
  assertProcedureOffscreenTask(fixture, failures)
  assertProcedureTransitions(fixture, failures)
  assertForwardMotionAdvisories(fixture, failures)
  assertRollResolver(fixture, stateBefore, failures)
  assertProcedureAccessExploration(fixture, stateAfter, failures)
  assertProcedureInvestigation(fixture, stateAfter, failures)
  assertProcedureActivationDiagnostics(fixture, stateAfter, failures)
  assertArcAuthorProcedureEval(fixture, failures)
  return { fixture, path, failures, workingSetTelemetry }
}

function assertProcedurePlanningSupport(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.procedurePlanningSupport
  if (!expected) return
  const contributions = normalizePlanningSupportContributions(expected.supportInputs)
  const assessment = normalizePlanningAssessment(
    expected.assessment,
    fixture.input.turnIndex ?? 0,
    contributions
  )
  const support = derivePlanningRollSupport(assessment, contributions)
  const want = replayRecord(expected.expect)
  if (Array.isArray(want.normalizedContributionIds)) {
    assertStringSetEquals(
      contributions.map((contribution) => contribution.id),
      want.normalizedContributionIds.map(String),
      'procedurePlanningSupport.normalizedContributionIds',
      failures
    )
  }
  const wantSupport = replayRecord(want.rollSupport)
  for (const key of ['assessmentId', 'skill', 'baseDc', 'dc', 'dcShift', 'advantage', 'disadvantage'] as const) {
    if (wantSupport[key] !== undefined && support[key] !== wantSupport[key]) {
      failures.push(`procedurePlanningSupport.rollSupport.${key}: expected ${String(wantSupport[key])}, got ${String(support[key])}`)
    }
  }
  if (Array.isArray(wantSupport.supportContributionIds)) {
    assertStringSetEquals(support.supportContributionIds, wantSupport.supportContributionIds.map(String), 'procedurePlanningSupport.rollSupport.supportContributionIds', failures)
  }
  if (Array.isArray(wantSupport.adverseContributionIds)) {
    assertStringSetEquals(support.adverseContributionIds, wantSupport.adverseContributionIds.map(String), 'procedurePlanningSupport.rollSupport.adverseContributionIds', failures)
  }
  for (const fragment of replayArray(wantSupport.rationaleIncludes).map(String)) {
    if (!support.rationale.some((line) => line.includes(fragment))) {
      failures.push(`procedurePlanningSupport.rollSupport.rationale missing "${fragment}"`)
    }
  }
}

function assertProcedureOffscreenTask(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.procedureOffscreenTask
  if (!expected) return
  const task = normalizeOffscreenTaskRecord(expected.task, fixture.input.turnIndex ?? 0)
  const want = replayRecord(expected.expect)
  for (const key of ['id', 'status', 'risk', 'procedureId'] as const) {
    if (want[key] !== undefined && task[key] !== want[key]) {
      failures.push(`procedureOffscreenTask.${key}: expected ${String(want[key])}, got ${String(task[key])}`)
    }
  }
  const visibleTraceIncludes = typeof want.visibleTraceIncludes === 'string' ? want.visibleTraceIncludes : ''
  if (visibleTraceIncludes && !task.visibleTrace.includes(visibleTraceIncludes)) {
    failures.push(`procedureOffscreenTask.visibleTrace missing "${visibleTraceIncludes}"`)
  }
  const partialKinds = task.partialResults.map((result) => result.kind)
  const finalKind = task.finalResult?.kind ?? null
  const allResults = [...task.partialResults, ...(task.finalResult ? [task.finalResult] : [])]
  if (Array.isArray(want.partialResultKinds)) {
    assertOrderedStrings(partialKinds, want.partialResultKinds.map(String), 'procedureOffscreenTask.partialResultKinds', failures)
  }
  if (want.finalResultKind !== undefined && finalKind !== want.finalResultKind) {
    failures.push(`procedureOffscreenTask.finalResultKind: expected ${String(want.finalResultKind)}, got ${String(finalKind)}`)
  }
  if (Array.isArray(want.resultKinds)) {
    assertOrderedStrings(allResults.map((result) => result.kind), want.resultKinds.map(String), 'procedureOffscreenTask.resultKinds', failures)
  }
  if (want.firstResultFactId !== undefined) {
    const first = allResults[0]
    const factId = first?.kind === 'procedure_fact' ? first.fact.id : undefined
    if (factId !== want.firstResultFactId) failures.push(`procedureOffscreenTask.firstResultFactId: expected ${String(want.firstResultFactId)}, got ${String(factId)}`)
  }
  if (want.secondResultClockDelta !== undefined) {
    const second = allResults[1]
    const delta = second?.kind === 'clock_tick' ? second.delta : undefined
    if (delta !== want.secondResultClockDelta) failures.push(`procedureOffscreenTask.secondResultClockDelta: expected ${String(want.secondResultClockDelta)}, got ${String(delta)}`)
  }
  if (want.finalResultAffordanceKind !== undefined) {
    const kind = task.finalResult?.kind === 'affordance_delta' ? task.finalResult.affordance.kind : undefined
    if (kind !== want.finalResultAffordanceKind) failures.push(`procedureOffscreenTask.finalResultAffordanceKind: expected ${String(want.finalResultAffordanceKind)}, got ${String(kind)}`)
  }
}

function assertProcedureTransitions(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.procedureTransitions
  if (!expected) return
  for (const rawCase of replayArray(expected.carryForwardCases)) {
    const testCase = replayRecord(rawCase)
    const decision = chooseProcedureTransition(replayRecord(testCase.input))
    if (testCase.classEquals !== undefined && decision.residueClass !== testCase.classEquals) {
      failures.push(`procedureTransitions.${String(testCase.input)}.class: expected ${String(testCase.classEquals)}, got ${decision.residueClass}`)
    }
    if (testCase.actionEquals !== undefined && decision.action !== testCase.actionEquals) {
      failures.push(`procedureTransitions.action: expected ${String(testCase.actionEquals)}, got ${decision.action}`)
    }
    if (testCase.carryForwardAsEquals !== undefined && decision.carryForwardAs !== testCase.carryForwardAsEquals) {
      failures.push(`procedureTransitions.carryForwardAs: expected ${String(testCase.carryForwardAsEquals)}, got ${String(decision.carryForwardAs)}`)
    }
    const fragment = typeof testCase.instructionIncludes === 'string' ? testCase.instructionIncludes : ''
    if (fragment && !decision.instruction.includes(fragment)) {
      failures.push(`procedureTransitions.instruction missing "${fragment}"`)
    }
  }
}

function assertForwardMotionAdvisories(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.forwardMotionAdvisories
  if (!expected) return
  for (const rawCase of replayArray(expected.cases)) {
    const testCase = replayRecord(rawCase)
    const advisory = deriveForwardMotionAdvisory(replayRecord(testCase.input) as unknown as Parameters<typeof deriveForwardMotionAdvisory>[0])
    if (testCase.advisoryEquals === null && advisory !== null) {
      failures.push(`forwardMotionAdvisories.${String(testCase.name)}: expected null, got ${advisory.kind}`)
      continue
    }
    if (testCase.advisoryKindEquals !== undefined && advisory?.kind !== testCase.advisoryKindEquals) {
      failures.push(`forwardMotionAdvisories.${String(testCase.name)}.kind: expected ${String(testCase.advisoryKindEquals)}, got ${String(advisory?.kind)}`)
    }
    if (testCase.severityEquals !== undefined && advisory?.severity !== testCase.severityEquals) {
      failures.push(`forwardMotionAdvisories.${String(testCase.name)}.severity: expected ${String(testCase.severityEquals)}, got ${String(advisory?.severity)}`)
    }
    const fragment = typeof testCase.instructionIncludes === 'string' ? testCase.instructionIncludes : ''
    if (fragment && !advisory?.instruction.includes(fragment)) {
      failures.push(`forwardMotionAdvisories.${String(testCase.name)}.instruction missing "${fragment}"`)
    }
  }
}

function assertProcedureAccessExploration(fixture: ReplayFixture, state: Sf2State, failures: string[]): void {
  const expected = fixture.expected?.procedureAccessExploration
  if (!expected) return
  for (const rawWant of replayArray(expected.packets)) {
    const want = replayRecord(rawWant)
    const procedureId = typeof want.procedureId === 'string' ? want.procedureId : ''
    const runtime = state.campaign.procedures?.[procedureId]
    if (!runtime) {
      failures.push(`procedureAccessExploration: missing procedure ${procedureId}`)
      continue
    }
    const packet = buildAccessExplorationPacket(runtime)
    if (!packet) {
      failures.push(`procedureAccessExploration: no packet for ${procedureId}`)
      continue
    }
    if (want.kind !== undefined && packet.kind !== want.kind) {
      failures.push(`procedureAccessExploration.${procedureId}.kind: expected ${String(want.kind)}, got ${packet.kind}`)
    }
    if (packet.access) {
      if (want.posture !== undefined && packet.access.posture !== want.posture) {
        failures.push(`procedureAccessExploration.${procedureId}.posture: expected ${String(want.posture)}, got ${packet.access.posture}`)
      }
      if (Array.isArray(want.credentialMaskIds)) {
        assertStringSetEquals(packet.access.credentialMasks.map((mask) => mask.id), want.credentialMaskIds.map(String), `procedureAccessExploration.${procedureId}.credentialMaskIds`, failures)
      }
      if (Array.isArray(want.scrutinyLayerIds)) {
        assertStringSetEquals(packet.access.scrutinyLayers.map((layer) => layer.id), want.scrutinyLayerIds.map(String), `procedureAccessExploration.${procedureId}.scrutinyLayerIds`, failures)
      }
      const clock = replayRecord(want.exposureClock)
      if (clock.id !== undefined && packet.access.exposureClock?.id !== clock.id) {
        failures.push(`procedureAccessExploration.${procedureId}.exposureClock.id: expected ${String(clock.id)}, got ${String(packet.access.exposureClock?.id)}`)
      }
      if (clock.current !== undefined && packet.access.exposureClock?.current !== clock.current) {
        failures.push(`procedureAccessExploration.${procedureId}.exposureClock.current: expected ${String(clock.current)}, got ${String(packet.access.exposureClock?.current)}`)
      }
      if (clock.max !== undefined && packet.access.exposureClock?.max !== clock.max) {
        failures.push(`procedureAccessExploration.${procedureId}.exposureClock.max: expected ${String(clock.max)}, got ${String(packet.access.exposureClock?.max)}`)
      }
      if (want.egressPhase !== undefined && packet.access.egressPhase !== want.egressPhase) {
        failures.push(`procedureAccessExploration.${procedureId}.egressPhase: expected ${String(want.egressPhase)}, got ${packet.access.egressPhase}`)
      }
      if (want.ambientAlertness !== undefined && packet.access.ambientAlertness !== want.ambientAlertness) {
        failures.push(`procedureAccessExploration.${procedureId}.ambientAlertness: expected ${String(want.ambientAlertness)}, got ${String(packet.access.ambientAlertness)}`)
      }
    }
    if (packet.exploration) {
      if (want.currentNodeId !== undefined && packet.exploration.currentNodeId !== want.currentNodeId) {
        failures.push(`procedureAccessExploration.${procedureId}.currentNodeId: expected ${String(want.currentNodeId)}, got ${String(packet.exploration.currentNodeId)}`)
      }
      if (Array.isArray(want.nodeIds)) {
        assertStringSetEquals(packet.exploration.nodes.map((node) => node.id), want.nodeIds.map(String), `procedureAccessExploration.${procedureId}.nodeIds`, failures)
      }
      if (Array.isArray(want.routeIds)) {
        assertStringSetEquals(packet.exploration.routes.map((route) => route.id), want.routeIds.map(String), `procedureAccessExploration.${procedureId}.routeIds`, failures)
      }
      if (Array.isArray(want.hazardIds)) {
        assertStringSetEquals(packet.exploration.hazards.map((hazard) => hazard.id), want.hazardIds.map(String), `procedureAccessExploration.${procedureId}.hazardIds`, failures)
      }
      if (want.ambientAlertness !== undefined && packet.exploration.ambientAlertness !== want.ambientAlertness) {
        failures.push(`procedureAccessExploration.${procedureId}.ambientAlertness: expected ${String(want.ambientAlertness)}, got ${String(packet.exploration.ambientAlertness)}`)
      }
    }
    if (Array.isArray(want.facts)) {
      assertStringSetEquals(packet.facts.map((fact) => fact.text), want.facts.map(String), `procedureAccessExploration.${procedureId}.facts`, failures)
    }
  }
}

function assertProcedureInvestigation(fixture: ReplayFixture, state: Sf2State, failures: string[]): void {
  const expected = fixture.expected?.procedureInvestigation
  if (!expected) return
  const packet = buildInvestigationSynthesisPacket(state)
  if (expected.packetEquals === null) {
    if (packet !== null) failures.push('procedureInvestigation: expected no packet')
    return
  }
  if (!packet) {
    failures.push('procedureInvestigation: expected synthesis packet')
    return
  }
  if (expected.active !== undefined && packet.active !== expected.active) {
    failures.push(`procedureInvestigation.active: expected ${String(expected.active)}, got ${String(packet.active)}`)
  }
  if (expected.procedureId !== undefined && packet.procedureId !== expected.procedureId) {
    failures.push(`procedureInvestigation.procedureId: expected ${String(expected.procedureId)}, got ${packet.procedureId}`)
  }
  if (Array.isArray(expected.openQuestions)) {
    assertStringSetEquals(packet.openQuestions, expected.openQuestions.map(String), 'procedureInvestigation.openQuestions', failures)
  }
  if (Array.isArray(expected.hypothesisClaims)) {
    assertStringSetEquals(packet.hypotheses.map((hypothesis) => hypothesis.claim), expected.hypothesisClaims.map(String), 'procedureInvestigation.hypothesisClaims', failures)
  }
  if (Array.isArray(expected.contradictionIds)) {
    assertStringSetEquals(packet.contradictions.map((contradiction) => contradiction.id), expected.contradictionIds.map(String), 'procedureInvestigation.contradictionIds', failures)
  }
  if (Array.isArray(expected.nextLeadTextsInclude)) {
    for (const fragment of expected.nextLeadTextsInclude.map(String)) {
      if (!packet.nextLeads.some((lead) => lead.text.includes(fragment))) {
        failures.push(`procedureInvestigation.nextLeads missing "${fragment}"`)
      }
    }
  }
  const discriminator = replayRecord(expected.discriminator)
  for (const rawCase of replayArray(discriminator.cases)) {
    const testCase = replayRecord(rawCase)
    const lane = classifyInvestigationDatum(replayRecord(testCase.input) as Parameters<typeof classifyInvestigationDatum>[0])
    if (testCase.laneEquals !== undefined && lane !== testCase.laneEquals) {
      failures.push(`procedureInvestigation.discriminator.${String(testCase.name)}: expected ${String(testCase.laneEquals)}, got ${lane}`)
    }
  }
}

function assertProcedureActivationDiagnostics(fixture: ReplayFixture, state: Sf2State, failures: string[]): void {
  const expected = fixture.expected?.procedureActivationDiagnostics
  if (!expected) return
  const finding = detectProcedureOmissionDrift(state)
  if (expected.omissionEquals === null) {
    if (finding !== null) failures.push(`procedureActivationDiagnostics.omission: expected null, got ${finding.kind}`)
    return
  }
  if (!finding) {
    failures.push('procedureActivationDiagnostics.omission: expected procedure_omission_drift')
    return
  }
  if (expected.severityEquals !== undefined && finding.severity !== expected.severityEquals) {
    failures.push(`procedureActivationDiagnostics.severity: expected ${String(expected.severityEquals)}, got ${finding.severity}`)
  }
  if (Array.isArray(expected.repeatedTermsInclude)) {
    for (const term of expected.repeatedTermsInclude.map(String)) {
      if (!finding.repeatedTerms.includes(term)) {
        failures.push(`procedureActivationDiagnostics.repeatedTerms missing ${term}`)
      }
    }
  }
  if (Array.isArray(expected.turnIndexesInclude)) {
    for (const index of expected.turnIndexesInclude) {
      if (!finding.turnIndexes.includes(Number(index))) {
        failures.push(`procedureActivationDiagnostics.turnIndexes missing ${String(index)}`)
      }
    }
  }
}

function assertArcAuthorProcedureEval(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.arcAuthorProcedureEval
  if (!expected) return
  const result = evaluateProcedureArcPassBar(replayRecord(expected.input) as unknown as Parameters<typeof evaluateProcedureArcPassBar>[0])
  if (expected.verdictEquals !== undefined && result.verdict !== expected.verdictEquals) {
    failures.push(`arcAuthorProcedureEval.verdict: expected ${String(expected.verdictEquals)}, got ${result.verdict}`)
  }
  const checklist = replayRecord(expected.checklist)
  for (const [key, want] of Object.entries(checklist)) {
    if (result.checklist[key] !== want) {
      failures.push(`arcAuthorProcedureEval.checklist.${key}: expected ${String(want)}, got ${String(result.checklist[key])}`)
    }
  }
  if (Array.isArray(expected.reauthorNotesInclude)) {
    for (const fragment of expected.reauthorNotesInclude.map(String)) {
      if (!result.reauthorNotes.some((note) => note.includes(fragment))) {
        failures.push(`arcAuthorProcedureEval.reauthorNotes missing "${fragment}"`)
      }
    }
  }
}

function assertTurnResolutionStableJson(fixture: ReplayFixture, failures: string[]): void {
  if (!fixture.expected?.turnResolutionStableJson?.assertThreadKeyOrderIgnored) return
  const stateBefore = createMinimalState()
  const stateAfter = structuredClone(stateBefore)
  const thread = stateBefore.campaign.threads.thread_spine
  stateAfter.campaign.threads.thread_spine = Object.keys(thread)
    .reverse()
    .reduce((acc, key) => {
      acc[key] = (thread as unknown as Record<string, unknown>)[key]
      return acc
    }, {} as Record<string, unknown>) as unknown as typeof thread
  const beforeJson = __sf2TurnResolutionTestHooks.stableJson(stateBefore.campaign.threads.thread_spine)
  const afterJson = __sf2TurnResolutionTestHooks.stableJson(stateAfter.campaign.threads.thread_spine)
  if (beforeJson !== afterJson) failures.push('turnResolutionStableJson: stableJson changed with object key order')
  const mutated = __sf2TurnResolutionTestHooks.hasDurableTargetMutation({
    stateBefore,
    stateAfter,
    targetEntityIds: [],
    targetThreadIds: ['thread_spine'],
    includePressure: false,
  })
  if (mutated) failures.push('turnResolutionStableJson: hasDurableTargetMutation treated key order as mutation')
}

function assertSessionSummary(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  stateAfter: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.sessionSummary
  if (!expected) return
  const summaryState = expected.state === 'fixture-stateAfter' ? stateAfter : stateBefore
  const summary = computeSessionSummary(summaryState, [], {
    chapterActivityGraceTurns: expected.chapterActivityGraceTurns,
  })
  if (
    expected.arcAdvancementPass !== undefined &&
    summary.killCriteria.arcAdvancementPass !== expected.arcAdvancementPass
  ) {
    failures.push(
      `sessionSummary.arcAdvancementPass: expected ${expected.arcAdvancementPass}, got ${summary.killCriteria.arcAdvancementPass}`
    )
  }
  if (
    expected.arcAdvancementStatus !== undefined &&
    summary.killCriteria.arcAdvancementStatus !== expected.arcAdvancementStatus
  ) {
    failures.push(
      `sessionSummary.arcAdvancementStatus: expected ${expected.arcAdvancementStatus}, got ${summary.killCriteria.arcAdvancementStatus}`
    )
  }
  if (expected.arcAdvancementNotYetEvaluableChapters !== undefined) {
    assertNumberSetEquals(
      summary.killCriteria.arcAdvancementNotYetEvaluableChapters,
      expected.arcAdvancementNotYetEvaluableChapters,
      'sessionSummary.arcAdvancementNotYetEvaluableChapters',
      failures
    )
  }
  if (expected.arcAdvancementFailedChapters !== undefined) {
    assertNumberSetEquals(
      summary.killCriteria.arcAdvancementFailedChapters,
      expected.arcAdvancementFailedChapters,
      'sessionSummary.arcAdvancementFailedChapters',
      failures
    )
  }
  for (const chapterExpected of expected.perChapter ?? []) {
    const actual = summary.perChapter.find((chapter) => chapter.chapter === chapterExpected.chapter)
    if (!actual) {
      failures.push(`sessionSummary.perChapter missing Ch${chapterExpected.chapter}`)
      continue
    }
    if (
      chapterExpected.arcAdvancementStatus !== undefined &&
      actual.arcAdvancementStatus !== chapterExpected.arcAdvancementStatus
    ) {
      failures.push(
        `sessionSummary.perChapter.Ch${chapterExpected.chapter}.arcAdvancementStatus: expected ${chapterExpected.arcAdvancementStatus}, got ${actual.arcAdvancementStatus}`
      )
    }
    if (
      chapterExpected.arcAdvancementReasonIncludes !== undefined &&
      !actual.arcAdvancementReason.includes(chapterExpected.arcAdvancementReasonIncludes)
    ) {
      failures.push(
        `sessionSummary.perChapter.Ch${chapterExpected.chapter}.arcAdvancementReason missing "${chapterExpected.arcAdvancementReasonIncludes}"`
      )
    }
  }
}

function assertRoleSchemaParity(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.roleSchemaParity
  if (!expected) return

  if (expected.assertNarrator) {
    const tool = NARRATOR_TOOLS.find((t) => t.name === NARRATOR_TOOL_NAME)
    const schema = tool?.input_schema as Record<string, unknown> | undefined
    const properties = schema?.properties as Record<string, unknown> | undefined
    const effectItems = ((properties?.mechanical_effects as Record<string, unknown> | undefined)?.items as Record<string, unknown> | undefined) ?? {}
    const effectKindEnum = (((effectItems.properties as Record<string, unknown> | undefined)?.kind as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
    const expectedKinds = [...NARRATOR_MECHANICAL_EFFECT_KINDS]
    if (!sameMembers(effectKindEnum, expectedKinds)) {
      failures.push(`roleSchemaParity.narrator: mechanical effect enum ${effectKindEnum.join(',')} != contract ${expectedKinds.join(',')}`)
    }
    for (const kind of expectedKinds) {
      const decision = evaluateWrite({
        actor: 'narrator',
        kind: kind as Parameters<typeof evaluateWrite>[0]['kind'],
        turnIndex: 0,
        chapter: 1,
        timestamp: 'replay',
      })
      if (!decision.permitted || decision.reason) failures.push(`roleSchemaParity.narrator: firewall rejects schema kind ${kind}`)
    }
    const combatDecision = evaluateWrite({
      actor: 'narrator',
      kind: 'combat',
      turnIndex: 0,
      chapter: 1,
      timestamp: 'replay',
    })
    if (!combatDecision.reason) failures.push('roleSchemaParity.narrator: stale combat kind is still firewall-allowed')
  }

  if (expected.assertFirewallDevAssertion) {
    try {
      recordObservation({
        actor: 'narrator',
        kind: 'create_entity',
        turnIndex: 0,
        chapter: 1,
        timestamp: 'replay',
      })
      failures.push('roleSchemaParity.firewall: illegal write did not throw in dev/test mode')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('actor narrator is not permitted to emit create_entity')) {
        failures.push(`roleSchemaParity.firewall: unexpected assertion message "${message}"`)
      }
    }
  }

  if (expected.assertAuthor) {
    const tool = AUTHOR_TOOLS.find((t) => t.name === AUTHOR_TOOL_NAME)
    const schema = tool?.input_schema as Record<string, unknown> | undefined
    const properties = schema?.properties as Record<string, unknown> | undefined
    const opening = (properties?.opening_scene_spec as Record<string, unknown> | undefined) ?? {}
    const openingProps = (opening.properties as Record<string, unknown> | undefined) ?? {}
    const openingRequired = getRequired(opening)
    for (const field of ['visible_npc_ids', 'withheld_premise_facts']) {
      if (!openingRequired.includes(field)) failures.push(`roleSchemaParity.author: opening_scene_spec required missing ${field}`)
      if (!openingProps[field]) failures.push(`roleSchemaParity.author: opening_scene_spec schema missing ${field}`)
    }
    const visible = openingProps.visible_npc_ids as Record<string, unknown> | undefined
    if (visible?.type !== 'array') failures.push('roleSchemaParity.author: visible_npc_ids must be an array')
    const pressureLadder = (properties?.pressure_ladder as Record<string, unknown> | undefined) ?? {}
    const ladderItem = (pressureLadder.items as Record<string, unknown> | undefined) ?? {}
    const ladderRequired = getRequired(ladderItem)
    const ladderProps = (ladderItem.properties as Record<string, unknown> | undefined) ?? {}
    if (!ladderRequired.includes('trigger_event')) {
      failures.push('roleSchemaParity.author: pressure_ladder item required missing trigger_event')
    }
    if (ladderRequired.includes('trigger_condition')) {
      failures.push('roleSchemaParity.author: pressure_ladder item should not require trigger_condition')
    }
    const triggerEvent = (ladderProps.trigger_event as Record<string, unknown> | undefined) ?? {}
    const triggerEventRequired = getRequired(triggerEvent)
    for (const field of ['kind', 'actor_id', 'action', 'target_id', 'stakes']) {
      if (!triggerEventRequired.includes(field)) {
        failures.push(`roleSchemaParity.author: pressure_ladder.trigger_event required missing ${field}`)
      }
    }
    const triggerEventProps = (triggerEvent.properties as Record<string, unknown> | undefined) ?? {}
    if (!triggerEventProps.location_id) {
      failures.push('roleSchemaParity.author: pressure_ladder.trigger_event schema missing location_id')
    }
    const kindEnum = ((triggerEventProps.kind as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
    for (const kind of ['entity_action', 'location_objective', 'late_unresolved']) {
      if (!kindEnum.includes(kind)) {
        failures.push(`roleSchemaParity.author: pressure_ladder.trigger_event.kind enum missing ${kind}`)
      }
    }
    const actionEnum = ((triggerEventProps.action as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
    for (const action of ['retrieves_from', 'late_chapter_unresolved']) {
      if (!actionEnum.includes(action)) {
        failures.push(`roleSchemaParity.author: pressure_ladder.trigger_event.action enum missing ${action}`)
      }
    }
  }

  if (expected.assertArcAuthor) {
    const tool = ARC_AUTHOR_TOOLS.find((t) => t.name === ARC_AUTHOR_TOOL_NAME)
    const schema = tool?.input_schema as Record<string, unknown> | undefined
    const required = getRequired(schema ?? {})
    for (const field of ['scenario_shape', 'durable_forces', 'durable_npc_seeds', 'arc_threads', 'latent_arc_questions', 'chapter_function_map']) {
      if (!required.includes(field)) failures.push(`roleSchemaParity.arcAuthor: required missing ${field}`)
    }
  }

  if (expected.assertChapterMeaning) {
    const tool = CHAPTER_MEANING_TOOLS.find((t) => t.name === CHAPTER_MEANING_TOOL_NAME)
    const schema = tool?.input_schema as Record<string, unknown> | undefined
    const properties = schema?.properties as Record<string, unknown> | undefined
    const required = getRequired(schema ?? {})
    for (const field of ['situation', 'tension', 'ticking', 'question', 'closer', 'closingResolution', 'transition_seed']) {
      if (!required.includes(field)) failures.push(`roleSchemaParity.chapterMeaning: required missing ${field}`)
    }
    const transitionSeed = (properties?.transition_seed as Record<string, unknown> | undefined) ?? {}
    const residue = (((transitionSeed.properties as Record<string, unknown> | undefined)?.procedure_residue as Record<string, unknown> | undefined)?.properties as Record<string, unknown> | undefined) ?? {}
    const keepAsEnum = ((residue.keep_as as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
    for (const value of ['constraint', 'leverage', 'background', 'discard']) {
      if (!keepAsEnum.includes(value)) failures.push(`roleSchemaParity.chapterMeaning: procedure_residue.keep_as enum missing ${value}`)
    }
  }
}

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value))
}

function assertArchivistSchemaParity(fixture: ReplayFixture, failures: string[]): void {
  if (!fixture.expected?.archivistSchemaParity?.assertContract) return
  const schema = extractTurnTool.input_schema as Record<string, unknown>
  const topRequired = getRequired(schema)
  for (const field of ARCHIVIST_PARITY_CONTRACT.requiredTopLevel) {
    if (!topRequired.includes(field)) failures.push(`archivistSchemaParity: top-level required missing ${field}`)
  }

  const properties = schema.properties as Record<string, unknown> | undefined
  const createsItems = ((properties?.creates as Record<string, unknown> | undefined)?.items as Record<string, unknown> | undefined) ?? {}
  const updatesItems = ((properties?.updates as Record<string, unknown> | undefined)?.items as Record<string, unknown> | undefined) ?? {}
  const createRequired = getRequired(createsItems)
  const updateRequired = getRequired(updatesItems)
  for (const field of ARCHIVIST_PARITY_CONTRACT.requiredCreateFields) {
    if (!createRequired.includes(field)) failures.push(`archivistSchemaParity: creates[].required missing ${field}`)
  }
  for (const field of ARCHIVIST_PARITY_CONTRACT.requiredUpdateFields) {
    if (!updateRequired.includes(field)) failures.push(`archivistSchemaParity: updates[].required missing ${field}`)
  }

  const findingTypeEnum = ((((((properties?.coherence_findings as Record<string, unknown> | undefined)?.items as Record<string, unknown> | undefined)?.properties as Record<string, unknown> | undefined)?.type as Record<string, unknown> | undefined)?.enum as unknown[]) ?? []).map(String)
  for (const forbidden of ARCHIVIST_PARITY_CONTRACT.forbiddenCoherenceFindingTypes) {
    if (findingTypeEnum.includes(forbidden)) failures.push(`archivistSchemaParity: forbidden coherence finding type still schema-emittable: ${forbidden}`)
  }

  const payloadProperties = (((createsItems.properties as Record<string, unknown> | undefined)?.payload as Record<string, unknown> | undefined)?.properties as Record<string, unknown> | undefined) ?? {}
  const pronounEnum = ((payloadProperties.pronoun as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
  for (const pronoun of ['she/her', 'he/him', 'they/them', 'other']) {
    if (!pronounEnum.includes(pronoun)) failures.push(`archivistSchemaParity: payload.pronoun enum missing ${pronoun}`)
  }
  const keyFactsMax = (payloadProperties.key_facts as Record<string, unknown> | undefined)?.maxItems
  if (keyFactsMax !== 3) failures.push(`archivistSchemaParity: payload.key_facts maxItems expected 3, got ${String(keyFactsMax)}`)
  const docTypeEnum = ((payloadProperties.type as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
  for (const type of ['authorization', 'directive', 'communication', 'record', 'petition', 'notation']) {
    if (!docTypeEnum.includes(type)) failures.push(`archivistSchemaParity: payload document type enum missing ${type}`)
  }
  const subjectMin = (payloadProperties.subject_entity_ids as Record<string, unknown> | undefined)?.minItems
  if (subjectMin !== 1) failures.push(`archivistSchemaParity: payload.subject_entity_ids minItems expected 1, got ${String(subjectMin)}`)
  const temporalKindEnum = ((payloadProperties.kind as Record<string, unknown> | undefined)?.enum as unknown[] | undefined)?.map(String) ?? []
  for (const kind of ['deadline', 'timestamp', 'duration', 'sequence', 'recurrence']) {
    if (!temporalKindEnum.includes(kind)) failures.push(`archivistSchemaParity: payload temporal kind enum missing ${kind}`)
  }
}

function assertArchivistExtraction(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.archivistExtraction
  if (!expected) return

  const result = processArchivistExtraction({
    state: structuredClone(stateBefore),
    rawToolInput: expected.rawToolInput,
    turnIndex: expected.turnIndex ?? ((fixture.input.turnIndex ?? stateBefore.history.turns.length) + 1),
    narratorProse: expected.narratorProse ?? fixture.input.narrator.prose,
  })

  if (typeof expected.expect.pressureEventsCount === 'number') {
    const got = result.patch.pressureEvents?.length ?? 0
    if (got !== expected.expect.pressureEventsCount) {
      failures.push(`archivistExtraction.pressureEvents: expected ${expected.expect.pressureEventsCount}, got ${got}`)
    }
  }

  if (expected.expect.pressureEventIdsEquals !== undefined) {
    const got = (result.patch.pressureEvents ?? []).map((event) => event.id).sort().join(',')
    const want = [...expected.expect.pressureEventIdsEquals].sort().join(',')
    if (got !== want) failures.push(`archivistExtraction.pressureEventIds: expected ${want}, got ${got}`)
  }

  if (expected.expect.coherenceFindingTypesEquals !== undefined) {
    const got = (result.patch.coherenceFindings ?? []).map((finding) => finding.type).sort().join(',')
    const want = [...expected.expect.coherenceFindingTypesEquals].sort().join(',')
    if (got !== want) failures.push(`archivistExtraction.coherenceFindingTypes: expected ${want}, got ${got}`)
  }

  for (const [key, want] of Object.entries(expected.expect.fallbackCounters ?? {})) {
    const got = result.normalization.fallbackCounters[key] ?? 0
    if (got !== want) failures.push(`archivistExtraction.fallbackCounters.${key}: expected ${want}, got ${got}`)
  }

  const summary = expected.expect.summaryEquals
  if (summary) {
    for (const key of ['totalWrites', 'accepted', 'rejected', 'deferred', 'anchorMisses'] as const) {
      const want = summary[key]
      if (want !== undefined && result.summary[key] !== want) {
        failures.push(`archivistExtraction.summary.${key}: expected ${want}, got ${result.summary[key]}`)
      }
    }
  }
}

function getRequired(schema: Record<string, unknown>): string[] {
  return Array.isArray(schema.required) ? schema.required.map(String) : []
}

function assertChapterMeaningValidation(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.chapterMeaningValidation
  if (!expected) return
  const findings = validateChapterMeaningTransitionSeed(stateBefore, expected.meaning)
  if (typeof expected.findingCount === 'number' && findings.length !== expected.findingCount) {
    failures.push(`chapterMeaningValidation.findingCount expected ${expected.findingCount}, got ${findings.length}`)
  }
  for (const include of expected.findingsInclude ?? []) {
    const match = findings.find((finding) => {
      if (include.field && finding.field !== include.field) return false
      if (include.severity && finding.severity !== include.severity) return false
      if (include.messageIncludes && !finding.message.toLowerCase().includes(include.messageIncludes.toLowerCase())) return false
      return true
    })
    if (!match) failures.push(`chapterMeaningValidation missing ${JSON.stringify(include)} in ${JSON.stringify(findings)}`)
  }
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
  const arcThreads = arcThreadsFromArcSetup(expected.rawToolInput, plan)
  const e = expected.expect
  if (e.idEquals !== undefined && plan.id !== e.idEquals) failures.push(`arcTransform.id: expected "${e.idEquals}", got "${plan.id}"`)
  if (e.titleEquals !== undefined && plan.title !== e.titleEquals) failures.push(`arcTransform.title: expected "${e.titleEquals}", got "${plan.title}"`)
  if (e.scenarioModeEquals !== undefined && plan.scenarioShape.mode !== e.scenarioModeEquals) {
    failures.push(`arcTransform.scenarioShape.mode: expected "${e.scenarioModeEquals}", got "${plan.scenarioShape.mode}"`)
  }
  if (typeof e.arcThreadIdsCountAtLeast === 'number' && plan.arcThreadIds.length < e.arcThreadIdsCountAtLeast) {
    failures.push(`arcTransform.arcThreadIds: expected ≥${e.arcThreadIdsCountAtLeast}, got ${plan.arcThreadIds.length}`)
  }
  if (typeof e.arcThreadEntitiesCountAtLeast === 'number' && arcThreads.length < e.arcThreadEntitiesCountAtLeast) {
    failures.push(`arcTransform.arcThreadEntities: expected ≥${e.arcThreadEntitiesCountAtLeast}, got ${arcThreads.length}`)
  }
  if (e.arcThreadEntitiesStatusEquals !== undefined) {
    for (const thread of arcThreads) {
      if (thread.status !== e.arcThreadEntitiesStatusEquals) {
        failures.push(`arcTransform.arcThreadEntities.${thread.id}.status: expected ${e.arcThreadEntitiesStatusEquals}, got ${thread.status}`)
      }
    }
  }
  if (e.arcThreadEntitiesAnchoredArcIdEquals !== undefined) {
    for (const thread of arcThreads) {
      if (thread.anchoredArcId !== e.arcThreadEntitiesAnchoredArcIdEquals) {
        failures.push(`arcTransform.arcThreadEntities.${thread.id}.anchoredArcId: expected ${e.arcThreadEntitiesAnchoredArcIdEquals}, got ${thread.anchoredArcId ?? '(unset)'}`)
      }
    }
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

function assertLatentArcQuestions(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.latentArcQuestions
  if (!expected) return

  const targetChapter = Number(expected.targetChapter ?? stateBefore.meta.currentChapter)
  const selection = selectLatentArcQuestionsForChapter(stateBefore, targetChapter)
  const candidateIds = selection.candidates.map((candidate) => candidate.id)
  const expectCandidateIds = Array.isArray(expected.candidateIdsEquals)
    ? expected.candidateIdsEquals.map(String)
    : undefined
  if (expectCandidateIds && JSON.stringify(candidateIds) !== JSON.stringify(expectCandidateIds)) {
    failures.push(`latentArcQuestions.candidateIds: expected ${JSON.stringify(expectCandidateIds)}, got ${JSON.stringify(candidateIds)}`)
  }
  if (expected.promotionRequiredEquals !== undefined && selection.promotionRequired !== Boolean(expected.promotionRequiredEquals)) {
    failures.push(`latentArcQuestions.promotionRequired: expected ${String(expected.promotionRequiredEquals)}, got ${String(selection.promotionRequired)}`)
  }
  if (expected.applyChapterOpen) {
    const next = structuredClone(stateBefore)
    const apply = expected.applyChapterOpen as Record<string, unknown>
    const promotedIds = Array.isArray(apply.promotedIds) ? apply.promotedIds.map(String) : []
    applyLatentArcQuestionChapterOpen(next, targetChapter, promotedIds)
    const statuses = Object.fromEntries(
      (next.campaign.arcPlan?.latentArcQuestions ?? []).map((question) => [question.id, question.status])
    )
    const expectStatuses = replayRecord(apply.statusesEqual)
    for (const [id, status] of Object.entries(expectStatuses)) {
      if (statuses[id] !== status) {
        failures.push(`latentArcQuestions.status.${id}: expected ${String(status)}, got ${String(statuses[id] ?? '(missing)')}`)
      }
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
  const completedAuthored = completeAuthorSetupForValidation(authored, {
    isContinuation: Boolean(expected.ctx.isContinuation),
    state: stateBefore,
  })
  const validationErrors = validateAuthorSetup(authored, {
    isContinuation: Boolean(expected.ctx.isContinuation),
    state: stateBefore,
  })
  if (typeof expected.expect.validationErrorCount === 'number' && validationErrors.length !== expected.expect.validationErrorCount) {
    failures.push(`authorContract.validationErrors: expected ${expected.expect.validationErrorCount}, got ${validationErrors.length} [${validationErrors.join('; ') || 'none'}]`)
  }
  for (const fragment of expected.expect.validationErrorIncludesAll ?? []) {
    if (!validationErrors.some((error) => error.includes(fragment))) {
      failures.push(`authorContract.validationErrors: expected error containing "${fragment}", got [${validationErrors.join('; ') || 'none'}]`)
    }
  }

  const validationWarnings = validateAuthorSetupWarnings(authored, {
    isContinuation: Boolean(expected.ctx.isContinuation),
    state: stateBefore,
  })
  if (typeof expected.expect.warningCount === 'number' && validationWarnings.length !== expected.expect.warningCount) {
    failures.push(`authorContract.warnings: expected ${expected.expect.warningCount}, got ${validationWarnings.length} [${validationWarnings.join('; ') || 'none'}]`)
  }
  for (const fragment of expected.expect.warningIncludesAll ?? []) {
    if (!validationWarnings.some((warning) => warning.includes(fragment))) {
      failures.push(`authorContract.warnings: expected warning containing "${fragment}", got [${validationWarnings.join('; ') || 'none'}]`)
    }
  }

  const combinedErrors = validateAuthorToolInput(expected.rawToolInput, ctx)
  if (typeof expected.expect.combinedErrorCount === 'number' && combinedErrors.length !== expected.expect.combinedErrorCount) {
    failures.push(`authorContract.combinedErrors: expected ${expected.expect.combinedErrorCount}, got ${combinedErrors.length} [${combinedErrors.join('; ') || 'none'}]`)
  }
  for (const fragment of expected.expect.combinedErrorIncludesAll ?? []) {
    if (!combinedErrors.some((error) => error.includes(fragment))) {
      failures.push(`authorContract.combinedErrors: expected error containing "${fragment}", got [${combinedErrors.join('; ') || 'none'}]`)
    }
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
  if (expected.expect.firstRevealPlayerTopicKeysEquals !== undefined) {
    const got = [...(authored.possibleRevelations[0]?.playerTopicKeys ?? [])].sort().join(',')
    const want = [...expected.expect.firstRevealPlayerTopicKeysEquals].sort().join(',')
    if (got !== want) failures.push(`authorContract.possibleRevelations[0].playerTopicKeys: expected ${want}, got ${got}`)
  }
  if (expected.expect.firstRevealCashPlayerPressesTopic !== undefined) {
    const got = authored.possibleRevelations[0]?.cashConditions?.playerPressesTopic
    if (got !== expected.expect.firstRevealCashPlayerPressesTopic) {
      failures.push(`authorContract.possibleRevelations[0].cashConditions.playerPressesTopic: expected ${expected.expect.firstRevealCashPlayerPressesTopic}, got ${String(got)}`)
    }
  }
  if (expected.expect.pacingTargetEquals !== undefined) {
    const got = authored.pacingContract.targetTurns
    const want = expected.expect.pacingTargetEquals
    if (got.min !== want.min || got.max !== want.max) {
      failures.push(`authorContract.pacingContract.targetTurns: expected ${want.min}-${want.max}, got ${got.min}-${got.max}`)
    }
  }
  for (const expectedTrigger of expected.expect.pressureLadderTriggerConditionEquals ?? []) {
    const got = authored.pressureLadder[expectedTrigger.index]?.triggerCondition
    if (got !== expectedTrigger.value) {
      failures.push(
        `authorContract.pressureLadder[${expectedTrigger.index}].triggerCondition: expected "${expectedTrigger.value}", got "${got}"`
      )
    }
  }
  if (expected.expect.arcThreadIdsEquals !== undefined) {
    const got = [...completedAuthored.arcLink.arcThreadIds].sort().join(',')
    const want = [...expected.expect.arcThreadIdsEquals].sort().join(',')
    if (got !== want) failures.push(`authorContract.arcLink.arcThreadIds: expected ${want}, got ${got}`)
  }
  if (expected.expect.threadLinksEquals !== undefined) {
    const got = completedAuthored.arcLink.threadLinks
      .map((link) => `${link.activeThreadId}->${link.arcThreadId}:${link.relation}`)
      .sort()
      .join(',')
    const want = expected.expect.threadLinksEquals
      .map((link) => `${link.activeThreadId}->${link.arcThreadId}:${link.relation ?? 'instantiates'}`)
      .sort()
      .join(',')
    if (got !== want) failures.push(`authorContract.arcLink.threadLinks: expected ${want}, got ${got}`)
  }
}

function assertAuthorHydration(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.authorHydration
  if (!expected) return

  const state = structuredClone(stateBefore)
  const authored = normalizeAuthorSetup(expected.rawToolInput)
  applyAuthoredToCampaign(
    state,
    authored,
    (expected.chapter ?? state.meta.currentChapter) as Sf2State['meta']['currentChapter'],
    expected.loadBearingIds ?? []
  )

  assertNpcIdentityIncludes(state, expected.expect.npcIdentityIncludes, 'authorHydration', failures)
  assertNpcRoles(state, expected.expect.npcRolesInclude, 'authorHydration', failures)
  assertOwnerThreadIds(state, expected.expect.ownerThreadIdsEquals, 'authorHydration', failures)

  const threadOwner = expected.expect.threadOwnerEquals
  if (threadOwner) {
    const thread = state.campaign.threads[threadOwner.threadId]
    if (!thread) {
      failures.push(`authorHydration.threadOwner: missing ${threadOwner.threadId}`)
    } else if (thread.owner.kind !== threadOwner.kind || thread.owner.id !== threadOwner.id) {
      failures.push(
        `authorHydration.threadOwner: expected ${threadOwner.kind}:${threadOwner.id}, got ${thread.owner.kind}:${thread.owner.id}`
      )
    }
  }
}

function assertAuthorChapterOpening(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.authorChapterOpening
  if (!expected) return

  const authored = normalizeAuthorSetup(expected.rawToolInput)
  const transformed = transformAuthorSetup(
    authored,
    expected.chapter as Sf2State['chapter']['number']
  )
  const result = applyAuthorChapterOpening({
    state: stateBefore,
    phase: expected.phase,
    authorResult: {
      ...transformed,
      authored,
    },
  })
  const state = result.nextState
  const e = expected.expect

  if (e.currentChapterEquals !== undefined && state.meta.currentChapter !== e.currentChapterEquals) {
    failures.push(`authorChapterOpening.currentChapter: expected ${e.currentChapterEquals}, got ${state.meta.currentChapter}`)
  }
  if (e.currentSceneIdEquals !== undefined && state.meta.currentSceneId !== e.currentSceneIdEquals) {
    failures.push(`authorChapterOpening.currentSceneId: expected ${e.currentSceneIdEquals}, got ${state.meta.currentSceneId}`)
  }
  if (e.currentLocationIdEquals !== undefined && state.world.currentLocation.id !== e.currentLocationIdEquals) {
    failures.push(`authorChapterOpening.currentLocation.id: expected ${e.currentLocationIdEquals}, got ${state.world.currentLocation.id}`)
  }
  if (e.currentLocationNameEquals !== undefined && state.world.currentLocation.name !== e.currentLocationNameEquals) {
    failures.push(`authorChapterOpening.currentLocation.name: expected ${e.currentLocationNameEquals}, got ${state.world.currentLocation.name}`)
  }
  if (e.currentTimeLabelEquals !== undefined && state.world.currentTimeLabel !== e.currentTimeLabelEquals) {
    failures.push(`authorChapterOpening.currentTimeLabel: expected ${e.currentTimeLabelEquals}, got ${state.world.currentTimeLabel}`)
  }
  if (
    typeof e.sceneSnapshotFirstTurnIndexEquals === 'number' &&
    state.world.sceneSnapshot.firstTurnIndex !== e.sceneSnapshotFirstTurnIndexEquals
  ) {
    failures.push(
      `authorChapterOpening.sceneSnapshot.firstTurnIndex: expected ${e.sceneSnapshotFirstTurnIndexEquals}, got ${state.world.sceneSnapshot.firstTurnIndex}`
    )
  }
  if (typeof e.sceneBundleCacheCleared === 'boolean') {
    const cleared = state.world.sceneBundleCache === undefined
    if (cleared !== e.sceneBundleCacheCleared) {
      failures.push(`authorChapterOpening.sceneBundleCacheCleared: expected ${e.sceneBundleCacheCleared}, got ${cleared}`)
    }
  }
  for (const want of e.threadStatusesInclude ?? []) {
    const thread = state.campaign.threads[want.threadId]
    if (!thread) {
      failures.push(`authorChapterOpening.threadStatus: missing ${want.threadId}`)
    } else if (thread.status !== want.status) {
      failures.push(`authorChapterOpening.threadStatus.${want.threadId}: expected ${want.status}, got ${thread.status}`)
    }
  }
  for (const want of e.threadPressureIncludes ?? []) {
    const pressure = state.chapter.setup.threadPressure[want.threadId]
    if (!pressure) {
      failures.push(`authorChapterOpening.threadPressure: missing ${want.threadId}`)
      continue
    }
    if (want.role !== undefined && pressure.role !== want.role) {
      failures.push(`authorChapterOpening.threadPressure.${want.threadId}.role: expected ${want.role}, got ${pressure.role}`)
    }
    if (want.openingFloor !== undefined && pressure.openingFloor !== want.openingFloor) {
      failures.push(`authorChapterOpening.threadPressure.${want.threadId}.openingFloor: expected ${want.openingFloor}, got ${pressure.openingFloor}`)
    }
    if (want.localEscalation !== undefined && pressure.localEscalation !== want.localEscalation) {
      failures.push(`authorChapterOpening.threadPressure.${want.threadId}.localEscalation: expected ${want.localEscalation}, got ${pressure.localEscalation}`)
    }
    if (want.maxThisChapter !== undefined && pressure.maxThisChapter !== want.maxThisChapter) {
      failures.push(`authorChapterOpening.threadPressure.${want.threadId}.maxThisChapter: expected ${want.maxThisChapter}, got ${pressure.maxThisChapter}`)
    }
  }
  const telemetry = e.telemetryEquals
  if (telemetry) {
    for (const [key, want] of Object.entries(telemetry)) {
      const got = result.telemetry[key as keyof typeof result.telemetry]
      if (got !== want) {
        failures.push(`authorChapterOpening.telemetry.${key}: expected ${String(want)}, got ${String(got)}`)
      }
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
  if (e.currentAreaNodeIdEquals !== undefined && state.world.currentPosition?.areaNodeId !== e.currentAreaNodeIdEquals) {
    failures.push(`persistenceNormalize.world.currentPosition.areaNodeId: expected ${e.currentAreaNodeIdEquals}, got ${state.world.currentPosition?.areaNodeId ?? 'unset'}`)
  }
  assertLocationAreaNodes(state, e.locationAreaNodes, 'persistenceNormalize', failures)
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
  if (typeof e.pressureEventsCount === 'number' && state.campaign.pressureEvents.length !== e.pressureEventsCount) {
    failures.push(`persistenceNormalize.pressureEvents: expected ${e.pressureEventsCount}, got ${state.campaign.pressureEvents.length}`)
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
  assertNpcRoles(state, e.npcRolesInclude, 'persistenceNormalize', failures)
  assertOwnerThreadIds(state, e.ownerThreadIdsEquals, 'persistenceNormalize', failures)
  if (e.arcPlanStatusEquals !== undefined && state.campaign.arcPlan?.status !== e.arcPlanStatusEquals) {
    failures.push(
      `persistenceNormalize.arcPlan.status: expected ${e.arcPlanStatusEquals}, got ${state.campaign.arcPlan?.status ?? 'unset'}`
    )
  }
  if (e.arcEntityStatusEquals) {
    const arc = state.campaign.arcs[e.arcEntityStatusEquals.arcId]
    if (!arc) {
      failures.push(`persistenceNormalize.arcEntityStatus: missing ${e.arcEntityStatusEquals.arcId}`)
    } else if (arc.status !== e.arcEntityStatusEquals.status) {
      failures.push(
        `persistenceNormalize.arcEntityStatus: expected ${e.arcEntityStatusEquals.status}, got ${arc.status}`
      )
    }
  }
  if (e.chapterArcThreadIdsEquals !== undefined) {
    const got = [...(state.chapter.setup.arcLink?.arcThreadIds ?? [])].sort().join(',')
    const want = [...e.chapterArcThreadIdsEquals].sort().join(',')
    if (got !== want) failures.push(`persistenceNormalize.chapter.arcThreadIds: expected ${want}, got ${got}`)
  }
  if (e.chapterThreadLinksEquals !== undefined) {
    const got = (state.chapter.setup.arcLink?.threadLinks ?? [])
      .map((link) => `${link.activeThreadId}->${link.arcThreadId}:${link.relation}`)
      .sort()
      .join(',')
    const want = e.chapterThreadLinksEquals
      .map((link) => `${link.activeThreadId}->${link.arcThreadId}:${link.relation ?? 'instantiates'}`)
      .sort()
      .join(',')
    if (got !== want) failures.push(`persistenceNormalize.chapter.threadLinks: expected ${want}, got ${got}`)
  }
  for (const fragment of e.repairsInclude ?? []) {
    if (!normalized.repairs.some((repair) => repair.includes(fragment))) {
      failures.push(`persistenceNormalize.repairs: expected repair containing "${fragment}", got [${normalized.repairs.join('; ') || 'none'}]`)
    }
  }
}

function assertLocationAreaNodes(
  state: Sf2State,
  expectations: Array<{
    locationId: string
    idsInclude?: string[]
    namesInclude?: string[]
    count?: number
  }> | undefined,
  label: string,
  failures: string[]
): void {
  for (const expected of expectations ?? []) {
    const location = state.campaign.locations[expected.locationId]
    if (!location) {
      failures.push(`${label}.locationAreaNodes: missing location ${expected.locationId}`)
      continue
    }
    const nodes = location.areaNodes ?? []
    if (expected.count !== undefined && nodes.length !== expected.count) {
      failures.push(`${label}.locationAreaNodes.${expected.locationId}: expected ${expected.count}, got ${nodes.length}`)
    }
    for (const id of expected.idsInclude ?? []) {
      if (!nodes.some((node) => node.id === id)) {
        failures.push(`${label}.locationAreaNodes.${expected.locationId}: missing node id ${id}`)
      }
    }
    for (const name of expected.namesInclude ?? []) {
      const key = canonicalLocationNameKey(name)
      if (!nodes.some((node) => canonicalLocationNameKey(node.name || node.id) === key)) {
        failures.push(`${label}.locationAreaNodes.${expected.locationId}: missing node name ${name}`)
      }
    }
  }
}

function assertReferencePolicy(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.referencePolicy
  if (!expected) return

  for (const c of expected.canonicalIds ?? []) {
    const result = validateSnapshotIdsForMode(
      { presentNpcIds: [c.value] },
      stateBefore.campaign,
      c.mode
    )
    if (result.ok !== c.ok) {
      failures.push(`referencePolicy.canonicalIds[${c.value}].ok: expected ${c.ok}, got ${result.ok}`)
    }
    for (const reason of c.violationReasons ?? []) {
      if (!result.violations.some((v) => v.reason === reason)) {
        failures.push(
          `referencePolicy.canonicalIds[${c.value}].violations: expected reason ${reason}, got [${result.violations.map((v) => v.reason).join(',') || 'none'}]`
        )
      }
    }
  }

  if (expected.sceneSnapshot) {
    const s = expected.sceneSnapshot
    const state = structuredClone(stateBefore)
    const result = resolveSceneSnapshotReferences(state, {
      mode: s.mode,
      presentNpcIds: s.presentNpcIds,
      currentInterlocutorIds: s.currentInterlocutorIds,
    })
    if (s.resolvedPresentNpcIdsEquals !== undefined) {
      assertStringSetEquals(
        result.presentNpcIds ?? [],
        s.resolvedPresentNpcIdsEquals,
        'referencePolicy.sceneSnapshot.presentNpcIds',
        failures
      )
    }
    if (s.currentInterlocutorIdsEquals !== undefined) {
      assertStringSetEquals(
        result.currentInterlocutorIds ?? [],
        s.currentInterlocutorIdsEquals,
        'referencePolicy.sceneSnapshot.currentInterlocutorIds',
        failures
      )
    }
    for (const id of s.placeholderIdsInclude ?? []) {
      if (!result.placeholderCreations.some((creation) => creation.placeholderId === id)) {
        failures.push(
          `referencePolicy.sceneSnapshot.placeholderCreations: expected ${id}, got [${result.placeholderCreations.map((c) => c.placeholderId).join(',') || 'none'}]`
        )
      }
    }
    for (const reason of s.violationReasonsInclude ?? []) {
      if (!result.idCheck.violations.some((v) => v.reason === reason)) {
        failures.push(
          `referencePolicy.sceneSnapshot.violations: expected reason ${reason}, got [${result.idCheck.violations.map((v) => v.reason).join(',') || 'none'}]`
        )
      }
    }
  }

  for (const c of expected.ownerHints ?? []) {
    const state = structuredClone(stateBefore)
    const result = resolveAuthoredThreadOwnership(state, c.ownerHint)
    if (c.ownerKind !== undefined && result.owner?.kind !== c.ownerKind) {
      failures.push(`referencePolicy.ownerHints[${c.ownerHint}].kind: expected ${c.ownerKind}, got ${result.owner?.kind ?? 'null'}`)
    }
    if (c.ownerId !== undefined && result.owner?.id !== c.ownerId) {
      failures.push(`referencePolicy.ownerHints[${c.ownerHint}].id: expected ${c.ownerId}, got ${result.owner?.id ?? 'null'}`)
    }
    if (c.stakeholderIds !== undefined) {
      assertStringSetEquals(
        result.stakeholders.map((s) => s.id),
        c.stakeholderIds,
        `referencePolicy.ownerHints[${c.ownerHint}].stakeholders`,
        failures
      )
    }
  }

  if (expected.ownerRepair) {
    const repaired = repairOwnerRef(expected.ownerRepair.raw)
    if (repaired.kind !== expected.ownerRepair.kind || repaired.id !== expected.ownerRepair.id) {
      failures.push(
        `referencePolicy.ownerRepair: expected ${expected.ownerRepair.kind}:${expected.ownerRepair.id}, got ${repaired.kind}:${repaired.id}`
      )
    }
  }

  const coercions = expected.coercions
  if (coercions?.disposition) {
    const c = coercions.disposition
    const result = coerceDisposition(c.raw, c.fallback as Parameters<typeof coerceDisposition>[1])
    if (result.tier !== c.tier || (c.coerced !== undefined && result.coerced !== c.coerced)) {
      failures.push(
        `referencePolicy.coercions.disposition: expected ${c.tier}/${String(c.coerced)}, got ${result.tier}/${String(result.coerced)}`
      )
    }
  }
  if (coercions?.heat) {
    const c = coercions.heat
    const result = coerceHeat(c.raw, c.fallback as Parameters<typeof coerceHeat>[1])
    if (result.level !== c.level || (c.coerced !== undefined && result.coerced !== c.coerced)) {
      failures.push(
        `referencePolicy.coercions.heat: expected ${c.level}/${String(c.coerced)}, got ${result.level}/${String(result.coerced)}`
      )
    }
  }
  if (coercions?.tempLoadTag) {
    const c = coercions.tempLoadTag
    const result = coerceTempLoadTag(c.raw)
    if (result.status !== c.status || (c.value !== undefined && result.value !== c.value)) {
      failures.push(
        `referencePolicy.coercions.tempLoadTag: expected ${c.status}/${c.value ?? ''}, got ${result.status}/${result.value ?? ''}`
      )
    }
  }
}

function assertStringSetEquals(
  got: string[],
  want: string[],
  label: string,
  failures: string[]
): void {
  const gotSorted = [...got].sort().join(',')
  const wantSorted = [...want].sort().join(',')
  if (gotSorted !== wantSorted) {
    failures.push(`${label}: expected [${wantSorted}], got [${gotSorted}]`)
  }
}

function assertNumberSetEquals(
  got: number[],
  want: number[],
  label: string,
  failures: string[]
): void {
  const gotSorted = [...got].sort((a, b) => a - b).join(',')
  const wantSorted = [...want].sort((a, b) => a - b).join(',')
  if (gotSorted !== wantSorted) {
    failures.push(`${label}: expected [${wantSorted}], got [${gotSorted}]`)
  }
}

function assertOrderedStrings(
  got: string[],
  want: string[],
  label: string,
  failures: string[]
): void {
  const gotKey = got.join('|')
  const wantKey = want.join('|')
  if (gotKey !== wantKey) {
    failures.push(`${label}: expected [${want.join(',')}], got [${got.join(',')}]`)
  }
}

function replayRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function replayArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function assertNpcRoles(
  state: Sf2State,
  expected: Array<{ npcId: string; role: string }> | undefined,
  label: string,
  failures: string[]
): void {
  for (const want of expected ?? []) {
    const npc = state.campaign.npcs[want.npcId]
    if (!npc) {
      failures.push(`${label}.npcRoles: missing ${want.npcId}`)
    } else if (npc.role !== want.role) {
      failures.push(`${label}.npcRoles ${want.npcId}: expected "${want.role}", got "${npc.role}"`)
    }
  }
}

function assertOwnerThreadIds(
  state: Sf2State,
  expected: Array<{ ownerKind: string; ownerId: string; threadIds: string[] }> | undefined,
  label: string,
  failures: string[]
): void {
  for (const want of expected ?? []) {
    const owner =
      want.ownerKind === 'npc'
        ? state.campaign.npcs[want.ownerId]
        : state.campaign.factions[want.ownerId]
    if (!owner) {
      failures.push(`${label}.ownerThreadIds: missing ${want.ownerKind}:${want.ownerId}`)
      continue
    }
    assertStringSetEquals(
      owner.ownedThreadIds,
      want.threadIds,
      `${label}.ownerThreadIds ${want.ownerKind}:${want.ownerId}`,
      failures
    )
  }
}

function assertNpcIdentityIncludes(
  state: Sf2State,
  expected: Array<{ npcId: string; pronoun?: string; age?: string; profileFactsInclude?: string[] }> | undefined,
  label: string,
  failures: string[]
): void {
  for (const identity of expected ?? []) {
    const npc = state.campaign.npcs[identity.npcId]
    if (!npc) {
      failures.push(`${label}.npcIdentity: target ${identity.npcId} missing`)
      continue
    }
    if (identity.pronoun !== undefined && npc.identity.pronoun !== identity.pronoun) {
      failures.push(
        `${label}.npcIdentity ${identity.npcId}: pronoun expected ${identity.pronoun}, got ${npc.identity.pronoun ?? 'unset'}`
      )
    }
    if (identity.age !== undefined && npc.identity.age !== identity.age) {
      failures.push(
        `${label}.npcIdentity ${identity.npcId}: age expected ${identity.age}, got ${npc.identity.age ?? 'unset'}`
      )
    }
    for (const fact of identity.profileFactsInclude ?? []) {
      if (!(npc.identity.profileFacts ?? []).some((actual) => actual.toLowerCase().includes(fact.toLowerCase()))) {
        failures.push(`${label}.npcIdentity ${identity.npcId}: profileFacts missing "${fact}"`)
      }
    }
  }
}

function assertArcStatuses(
  state: Sf2State,
  expected: Array<{ arcId: string; status: string; arcPlanStatus?: string }> | undefined,
  failures: string[]
): void {
  for (const want of expected ?? []) {
    const arc = state.campaign.arcs[want.arcId]
    if (!arc) {
      failures.push(`arcStatuses: missing ${want.arcId}`)
    } else if (arc.status !== want.status) {
      failures.push(`arcStatuses ${want.arcId}: expected ${want.status}, got ${arc.status}`)
    }
    if (want.arcPlanStatus !== undefined && state.campaign.arcPlan?.status !== want.arcPlanStatus) {
      failures.push(
        `arcStatuses arcPlan: expected ${want.arcPlanStatus}, got ${state.campaign.arcPlan?.status ?? 'unset'}`
      )
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
  let context: ReturnType<typeof buildNarratorTurnContext>
  try {
    context = buildNarratorTurnContext({
      state: sourceState,
      playerInput,
      isInitial,
      turnIndex,
      rollResolution: expected.rollResolution,
    })
    messages = context.messages as Array<{ role: string; content: unknown }>
  } catch (error) {
    failures.push(`buildNarratorTurnContext threw: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const assistantTexts = assistantMessages.map((m) => messageContentText(m.content))
  const systemTexts = context.system.map((block) =>
    typeof block.text === 'string' ? block.text : ''
  )

  if (typeof expected.messageCountEquals === 'number') {
    if (messages.length !== expected.messageCountEquals) {
      failures.push(
        `narrator messages: expected ${expected.messageCountEquals} total messages, got ${messages.length}`
      )
    }
  }

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
  for (const fragment of expected.systemContainsAll ?? []) {
    if (!systemTexts.some((t) => t.includes(fragment))) {
      failures.push(`narrator system blocks: missing required fragment "${fragment.slice(0, 60)}"`)
    }
  }
  for (const fragment of expected.systemContainsNone ?? []) {
    if (systemTexts.some((t) => t.includes(fragment))) {
      failures.push(`narrator system blocks: unexpectedly contains "${fragment.slice(0, 60)}"`)
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
    .map((m) => messageContentText(m.content))
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
  if (expected.workingSetEventAbsent && context.diagnostics.workingSet !== null) {
    failures.push('narrator context: expected no working-set event payload')
  }
  if (expected.sceneBundleEventAbsent && context.diagnostics.sceneBundleBuilt !== null) {
    failures.push('narrator context: expected no scene-bundle event payload')
  }
  if (expected.pacingEventAbsent && context.diagnostics.pacingAdvisory !== null) {
    failures.push('narrator context: expected no pacing event payload')
  }
  if (
    expected.requiredRollGateExists !== undefined &&
    Boolean(context.requiredRollGate) !== expected.requiredRollGateExists
  ) {
    failures.push(
      `narrator context: expected requiredRollGateExists=${expected.requiredRollGateExists}, got ${context.requiredRollGate ? `${context.requiredRollGate.kind} from ${context.requiredRollGate.source}` : 'none'}`
    )
  }
}

function assertRequiredRollGate(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.requiredRollGate
  if (!expected) return

  const gate = buildNarratorTurnContext({
    state: stateBefore,
    playerInput: fixture.input.playerInput,
    isInitial: Boolean(fixture.input.isInitial),
    turnIndex: fixture.input.turnIndex ?? stateBefore.history.turns.length,
  }).requiredRollGate
  if (expected.exists && !gate) {
    failures.push('requiredRollGate: expected gate, got none')
    return
  }
  if (!expected.exists && gate) {
    failures.push(`requiredRollGate: expected no gate, got ${gate.kind} from ${gate.source}`)
    return
  }
  if (!gate) return

  if (expected.source !== undefined && gate.source !== expected.source) {
    failures.push(`requiredRollGate.source: expected ${expected.source}, got ${gate.source}`)
  }
  if (expected.kind !== undefined && gate.kind !== expected.kind) {
    failures.push(`requiredRollGate.kind: expected ${expected.kind}, got ${gate.kind}`)
  }
  if (expected.sourceId !== undefined && gate.sourceId !== expected.sourceId) {
    failures.push(`requiredRollGate.sourceId: expected ${expected.sourceId}, got ${gate.sourceId ?? 'unset'}`)
  }
  for (const skill of expected.skillsInclude ?? []) {
    if (!gate.skills.includes(skill)) {
      failures.push(`requiredRollGate.skills: missing ${skill}; got [${gate.skills.join(', ')}]`)
    }
  }
  if (expected.reasonIncludes !== undefined && !gate.reason.includes(expected.reasonIncludes)) {
    failures.push(`requiredRollGate.reason missing "${expected.reasonIncludes}"; got "${gate.reason}"`)
  }
}

function assertRollSkillTags(fixture: ReplayFixture, failures: string[]): void {
  const expected = fixture.expected?.rollSkillTags
  if (!expected) return

  const playerInput = expected.playerInput ?? fixture.input.playerInput
  const skills = extractSf2RollSkillTags(playerInput)
  const inspection = inspectSf2RollSkillTags(playerInput)
  if (expected.skillsEquals !== undefined) {
    assertStringSetEquals(skills, expected.skillsEquals, 'rollSkillTags.skills', failures)
  }
  for (const skill of expected.skillsInclude ?? []) {
    if (!skills.includes(skill)) {
      failures.push(`rollSkillTags.skills missing ${skill}; got [${skills.join(', ')}]`)
    }
  }
  for (const tag of expected.unknownSkillLikeTagsInclude ?? []) {
    if (!inspection.unknownSkillLikeTags.includes(tag)) {
      failures.push(
        `rollSkillTags.unknownSkillLikeTags missing ${tag}; got [${inspection.unknownSkillLikeTags.join(', ')}]`
      )
    }
  }
  for (const tag of expected.unknownSkillLikeTagsAbsent ?? []) {
    if (inspection.unknownSkillLikeTags.includes(tag)) {
      failures.push(
        `rollSkillTags.unknownSkillLikeTags unexpectedly included ${tag}; got [${inspection.unknownSkillLikeTags.join(', ')}]`
      )
    }
  }
}

function assertRollResolver(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.rollResolver
  if (!expected) return

  for (const testCase of expected.cases) {
    const base = resolveSf2Roll(stateBefore, {
      skill: testCase.skill,
      dc: testCase.dc ?? 12,
      modifierType: testCase.modifierType,
      modifierReason: testCase.modifierReason,
    })
    const selected = testCase.selectedActionLabelIncludes
      ? base.actionOptions.find((option) => option.label.includes(testCase.selectedActionLabelIncludes ?? ''))
      : undefined
    const resolved = resolveSf2Roll(stateBefore, {
      skill: testCase.skill,
      dc: testCase.dc ?? 12,
      modifierType: testCase.modifierType,
      modifierReason: testCase.modifierReason,
    }, selected?.id)
    const prefix = `rollResolver.${testCase.name}`
    const want = testCase.expect

    if (testCase.selectedActionLabelIncludes && !selected) {
      failures.push(`${prefix}.selectedAction: missing option containing "${testCase.selectedActionLabelIncludes}"; got [${base.actionOptions.map((option) => option.label).join('; ')}]`)
    }
    if (want.ability !== undefined && resolved.ability !== want.ability) {
      failures.push(`${prefix}.ability: expected ${want.ability}, got ${resolved.ability}`)
    }
    if (want.proficient !== undefined && resolved.proficient !== want.proficient) {
      failures.push(`${prefix}.proficient: expected ${String(want.proficient)}, got ${String(resolved.proficient)}`)
    }
    if (want.modifier !== undefined && resolved.modifier !== want.modifier) {
      failures.push(`${prefix}.modifier: expected ${want.modifier}, got ${resolved.modifier}`)
    }
    if (want.flatBonus !== undefined && resolved.flatBonus !== want.flatBonus) {
      failures.push(`${prefix}.flatBonus: expected ${want.flatBonus}, got ${resolved.flatBonus}`)
    }
    if (want.effectiveDc !== undefined && resolved.effectiveDc !== want.effectiveDc) {
      failures.push(`${prefix}.effectiveDc: expected ${want.effectiveDc}, got ${resolved.effectiveDc}`)
    }
    if (want.diceMode !== undefined && resolved.diceMode !== want.diceMode) {
      failures.push(`${prefix}.diceMode: expected ${want.diceMode}, got ${resolved.diceMode}`)
    }
    if (want.criticalRange !== undefined && resolved.criticalRange !== want.criticalRange) {
      failures.push(`${prefix}.criticalRange: expected ${want.criticalRange}, got ${resolved.criticalRange}`)
    }
    if (want.resolutionKind !== undefined && resolved.resolutionKind !== want.resolutionKind) {
      failures.push(`${prefix}.resolutionKind: expected ${want.resolutionKind}, got ${resolved.resolutionKind ?? 'unset'}`)
    }

    const actionKinds = resolved.actionOptions.map((option) => option.kind)
    for (const kind of want.actionOptionKindsInclude ?? []) {
      if (!actionKinds.includes(kind as typeof actionKinds[number])) {
        failures.push(`${prefix}.actionOptions.kind missing ${kind}; got [${actionKinds.join(', ')}]`)
      }
    }
    for (const fragment of want.actionOptionLabelsInclude ?? []) {
      if (!resolved.actionOptions.some((option) => option.label.includes(fragment))) {
        failures.push(`${prefix}.actionOptions.label missing "${fragment}"; got [${resolved.actionOptions.map((option) => option.label).join('; ')}]`)
      }
    }
    for (const fragment of want.actionOptionLabelsExclude ?? []) {
      if (resolved.actionOptions.some((option) => option.label.includes(fragment))) {
        failures.push(`${prefix}.actionOptions.label should not include "${fragment}"; got [${resolved.actionOptions.map((option) => option.label).join('; ')}]`)
      }
    }
    for (const fragment of want.sourceLabelsInclude ?? []) {
      if (!resolved.sourceBreakdown.some((source) => source.label.includes(fragment))) {
        failures.push(`${prefix}.sourceLabels missing "${fragment}"; got [${resolved.sourceBreakdown.map((source) => source.label).join('; ')}]`)
      }
    }
    for (const expectedCount of want.sourceLabelCounts ?? []) {
      const count = resolved.sourceBreakdown.filter((source) =>
        source.label.includes(expectedCount.labelIncludes)
      ).length
      if (count !== expectedCount.count) {
        failures.push(`${prefix}.sourceLabelCounts.${expectedCount.labelIncludes}: expected ${expectedCount.count}, got ${count}; got [${resolved.sourceBreakdown.map((source) => source.label).join('; ')}]`)
      }
    }
    for (const kind of want.sourceKindsInclude ?? []) {
      if (!resolved.sourceBreakdown.some((source) => source.kind === kind)) {
        failures.push(`${prefix}.sourceKinds missing ${kind}; got [${resolved.sourceBreakdown.map((source) => source.kind).join(', ')}]`)
      }
    }
    for (const spend of want.spentResourcesInclude ?? []) {
      const found = resolved.spentResources.find((actual) =>
        actual.kind === spend.kind
        && actual.name === spend.name
        && (spend.amount === undefined || actual.amount === spend.amount)
      )
      if (!found) {
        failures.push(`${prefix}.spentResources missing ${JSON.stringify(spend)}; got ${JSON.stringify(resolved.spentResources)}`)
      }
    }
    if (want.applySpend) {
      const spentState = applySf2RollResourceSpends(stateBefore, resolved.spentResources)
      for (const trait of want.applySpend.traitUses ?? []) {
        const actual = spentState.player.traits.find((candidate) => candidate.name === trait.name)
        if (actual?.uses?.current !== trait.current) {
          failures.push(`${prefix}.applySpend.trait.${trait.name}: expected ${trait.current}, got ${String(actual?.uses?.current)}`)
        }
      }
      for (const item of want.applySpend.itemCharges ?? []) {
        const actual = spentState.player.inventory.find((candidate) => candidate.name === item.name)
        if (actual?.charges !== item.charges) {
          failures.push(`${prefix}.applySpend.item.${item.name}: expected ${item.charges}, got ${String(actual?.charges)}`)
        }
      }
    }
  }
}

function assertSocialModifierAdvisories(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  stateAfter: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.socialModifierAdvisories
  if (!expected) return

  const state = expected.stateBefore === 'fixture-stateAfter' ? stateAfter : stateBefore
  const playerInput = expected.playerInput ?? fixture.input.playerInput
  const advisories = evaluateSocialModifierAdvisories({
    state,
    playerInput,
    skill: expected.skill,
    targetEntityIds: expected.targetEntityIds,
  })

  if (typeof expected.countEquals === 'number' && advisories.length !== expected.countEquals) {
    failures.push(`socialModifierAdvisories.count: expected ${expected.countEquals}, got ${advisories.length}`)
  }

  for (const want of expected.includes ?? []) {
    const found = advisories.find((advisory) => {
      if (want.id !== undefined && advisory.id !== want.id) return false
      if (want.source !== undefined && advisory.source !== want.source) return false
      if (want.modifierType !== undefined && advisory.modifierType !== want.modifierType) return false
      if (want.targetNpcId !== undefined && advisory.targetNpcId !== want.targetNpcId) return false
      if (want.reasonIncludes !== undefined && !advisory.reason.includes(want.reasonIncludes)) return false
      return true
    })
    if (!found) {
      failures.push(
        `socialModifierAdvisories missing ${JSON.stringify(want)}; got ${JSON.stringify(advisories)}`
      )
    }
  }

  const rendered = renderSocialModifierAdvisories(advisories)
  for (const fragment of expected.renderedIncludes ?? []) {
    if (!rendered.includes(fragment)) {
      failures.push(`socialModifierAdvisories.rendered missing "${fragment}"`)
    }
  }

  if (expected.reconciliation) {
    const reconciliation = reconcileRollModifierWithSocialAdvisories({
      state,
      playerInput,
      skill: expected.reconciliation.skill,
      requestedModifierType: expected.reconciliation.requestedModifierType,
      requestedModifierReason: expected.reconciliation.requestedModifierReason,
      targetEntityIds: expected.targetEntityIds,
    })
    if (
      expected.reconciliation.modifierType !== undefined &&
      reconciliation.modifierType !== expected.reconciliation.modifierType
    ) {
      failures.push(
        `socialModifierAdvisories.reconciliation.modifierType: expected ${expected.reconciliation.modifierType}, got ${reconciliation.modifierType ?? 'unset'}`
      )
    }
    for (const fragment of expected.reconciliation.modifierReasonIncludes ?? []) {
      if (!reconciliation.modifierReason?.includes(fragment)) {
        failures.push(
          `socialModifierAdvisories.reconciliation.modifierReason missing "${fragment}"; got "${reconciliation.modifierReason ?? ''}"`
        )
      }
    }
    for (const fragment of expected.reconciliation.diagnosticsInclude ?? []) {
      if (!reconciliation.diagnostics.some((line) => line.includes(fragment))) {
        failures.push(
          `socialModifierAdvisories.reconciliation.diagnostics missing "${fragment}"; got [${reconciliation.diagnostics.join('; ')}]`
        )
      }
    }
  }
}

function messageContentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if ('text' in part) return String((part as { text: unknown }).text)
      if ('content' in part) return String((part as { content: unknown }).content)
      return ''
    })
    .join('')
}

function assertNarratorCommitRepair(
  fixture: ReplayFixture,
  stateBefore: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected?.narratorCommitRepair
  if (!expected) return

  let request: ReturnType<typeof buildMissingNarrateTurnRepairRequest>
  try {
    const context = buildNarratorTurnContext({
      state: stateBefore,
      playerInput: fixture.input.playerInput,
      isInitial: Boolean(fixture.input.isInitial),
      turnIndex: fixture.input.turnIndex ?? stateBefore.history.turns.length,
    })
    request = buildMissingNarrateTurnRepairRequest({
      turnContext: context,
      completedContent: [{ type: 'text', text: expected.completedAssistantProse }],
    })
  } catch (error) {
    failures.push(`buildMissingNarrateTurnRepairRequest threw: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  if (expected.toolNamesEquals) {
    const actual = request.tools.map((tool) => tool.name).sort().join(',')
    const want = [...expected.toolNamesEquals].sort().join(',')
    if (actual !== want) failures.push(`narratorCommitRepair.tools expected ${want}, got ${actual}`)
  }

  if (
    expected.toolChoiceTypeEquals !== undefined &&
    request.toolChoice.type !== expected.toolChoiceTypeEquals
  ) {
    failures.push(`narratorCommitRepair.toolChoice expected ${expected.toolChoiceTypeEquals}, got ${request.toolChoice.type}`)
  }

  if (
    typeof expected.messageCountAtLeast === 'number' &&
    request.messages.length < expected.messageCountAtLeast
  ) {
    failures.push(`narratorCommitRepair.messages expected at least ${expected.messageCountAtLeast}, got ${request.messages.length}`)
  }

  const userTexts = request.messages
    .filter((message) => message.role === 'user')
    .map((message) => messageContentText(message.content))
  const assistantTexts = request.messages
    .filter((message) => message.role === 'assistant')
    .map((message) => messageContentText(message.content))

  for (const fragment of expected.requestMessageContainsAll ?? []) {
    if (!userTexts.some((text) => text.includes(fragment))) {
      failures.push(`narratorCommitRepair request missing required fragment "${fragment.slice(0, 80)}"`)
    }
  }
  for (const fragment of expected.requestMessageContainsNone ?? []) {
    if (userTexts.some((text) => text.includes(fragment))) {
      failures.push(`narratorCommitRepair request unexpectedly contains "${fragment.slice(0, 80)}"`)
    }
  }
  for (const fragment of expected.assistantMessageContainsAll ?? []) {
    if (!assistantTexts.some((text) => text.includes(fragment))) {
      failures.push(`narratorCommitRepair assistant messages missing required fragment "${fragment.slice(0, 80)}"`)
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

function resolveSetupSelectionByTitle(
  selection: Omit<Sf2SetupSelection, 'hookId'> & { hookTitle: string }
): Sf2SetupSelection {
  const hook = listSf2SetupHooks(
    selection.genreId,
    selection.originId,
    selection.playbookId
  ).find((candidate) => candidate.title === selection.hookTitle)
  if (!hook) {
    throw new Error(
      `No setup hook titled "${selection.hookTitle}" for ${selection.genreId}/${selection.originId}/${selection.playbookId}`
    )
  }
  return {
    genreId: selection.genreId,
    originId: selection.originId,
    playbookId: selection.playbookId,
    hookId: hook.id,
    ...(selection.characterName ? { characterName: selection.characterName } : {}),
  }
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
    pressureEvents: patch?.pressureEvents,
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
  revelationProgress: ReturnType<typeof buildScenePacket>['packet']['revelationProgress'],
  coherenceFindings: Sf2CoherenceFinding[],
  scenePacketCastIds: string[],
  scenePacketCast: ReturnType<typeof buildScenePacket>['packet']['cast'],
  scenePacketAtmosphere: string[],
  perTurnDeltaText: string,
  archivistTurnMessage: string,
  failures: string[]
): void {
  const expected = fixture.expected ?? {}
  for (const id of expected.presentNpcIdsIncludes ?? []) {
    if (!state.world.sceneSnapshot.presentNpcIds.includes(id)) failures.push(`presentNpcIds missing ${id}`)
  }
  for (const id of expected.presentNpcIdsExcludes ?? []) {
    if (state.world.sceneSnapshot.presentNpcIds.includes(id)) failures.push(`presentNpcIds unexpectedly includes ${id}`)
  }
  if (expected.presentNpcIdsExact) {
    const actual = [...state.world.sceneSnapshot.presentNpcIds].sort()
    const wanted = [...expected.presentNpcIdsExact].sort()
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
      failures.push(`presentNpcIdsExact expected [${wanted.join(',')}], got [${actual.join(',')}]`)
    }
  }
  for (const fragment of expected.scenePacketAtmosphereIncludes ?? []) {
    const found = scenePacketAtmosphere.some((condition) =>
      condition.toLowerCase().includes(fragment.toLowerCase())
    )
    if (!found) {
      failures.push(`scene packet atmosphere missing "${fragment}" (got: ${scenePacketAtmosphere.join(', ')})`)
    }
  }
  if (expected.scenePacketAtmosphereCountBetween) {
    const [min, max] = expected.scenePacketAtmosphereCountBetween
    if (scenePacketAtmosphere.length < min || scenePacketAtmosphere.length > max) {
      failures.push(`scene packet atmosphere count expected ${min}-${max}, got ${scenePacketAtmosphere.length}`)
    }
  }
  for (const want of expected.revelationProgressIncludes ?? []) {
    const packet = revelationProgress.find((r) => r.revelationId === want.revelationId)
    if (!packet) {
      failures.push(`revelation progress missing ${want.revelationId}`)
      continue
    }
    if (typeof want.due === 'boolean' && packet.due !== want.due) {
      failures.push(`revelation progress ${want.revelationId} due expected ${want.due}, got ${packet.due}`)
    }
    if (
      want.dueReasonIncludes &&
      !packet.dueReason.toLowerCase().includes(want.dueReasonIncludes.toLowerCase())
    ) {
      failures.push(`revelation progress ${want.revelationId} dueReason missing "${want.dueReasonIncludes}" (got "${packet.dueReason}")`)
    }
    if (
      want.statementIncludes &&
      !packet.statement.toLowerCase().includes(want.statementIncludes.toLowerCase())
    ) {
      failures.push(`revelation progress ${want.revelationId} statement missing "${want.statementIncludes}"`)
    }
  }
  for (const want of expected.coherenceFindingsInclude ?? []) {
    const match = coherenceFindings.find((finding) => {
      if (finding.type !== want.type) return false
      if (want.stateReference !== undefined && finding.stateReference !== want.stateReference) return false
      if (
        want.suggestedNoteIncludes !== undefined &&
        !finding.suggestedNote.toLowerCase().includes(want.suggestedNoteIncludes.toLowerCase())
      ) return false
      return true
    })
    if (!match) {
      failures.push(`coherence finding missing ${JSON.stringify(want)} (got: ${coherenceFindings.map((f) => `${f.type}:${f.stateReference}`).join(', ') || 'none'})`)
    }
  }
  for (const want of expected.coherenceFindingsExclude ?? []) {
    const match = coherenceFindings.find((finding) => {
      if (finding.type !== want.type) return false
      if (want.stateReference !== undefined && finding.stateReference !== want.stateReference) return false
      return true
    })
    if (match) {
      failures.push(`coherence finding unexpectedly present ${JSON.stringify(want)} (got: ${coherenceFindings.map((f) => `${f.type}:${f.stateReference}`).join(', ') || 'none'})`)
    }
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
    for (const fragment of want.profileFactsInclude ?? []) {
      const found = (c.profileFacts ?? []).some((fact) => fact.toLowerCase().includes(fragment.toLowerCase()))
      if (!found) {
        failures.push(`castPacket ${want.npcId} profileFacts missing "${fragment}"`)
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
  const pressureEvents = state.campaign.pressureEvents ?? []
  if (typeof expected.pressureEventsCount === 'number' && pressureEvents.length !== expected.pressureEventsCount) {
    failures.push(`pressureEvents count expected ${expected.pressureEventsCount}, got ${pressureEvents.length}`)
  }
  for (const want of expected.pressureEventsInclude ?? []) {
    const match = pressureEvents.find((event) => {
      if (want.idempotencyKey !== undefined && event.idempotencyKey !== want.idempotencyKey) return false
      if (want.source !== undefined && event.source !== want.source) return false
      if (
        want.targetThreadIdsInclude &&
        !want.targetThreadIdsInclude.every((threadId) => event.targetThreadIds.includes(threadId))
      ) return false
      if (want.whoPays !== undefined && event.humanConsequence.whoPays !== want.whoPays) return false
      if (
        want.visiblePressureIncludes !== undefined &&
        !event.humanConsequence.visiblePressure.toLowerCase().includes(want.visiblePressureIncludes.toLowerCase())
      ) return false
      return true
    })
    if (!match) failures.push(`missing pressureEvent matching ${JSON.stringify(want)}`)
  }
  for (const id of expected.npcIdsIncludes ?? []) {
    if (!state.campaign.npcs[id]) failures.push(`npc registry missing ${id}`)
  }
  assertNpcRoles(state, expected.npcRolesInclude, 'stateAfter', failures)
  assertOwnerThreadIds(state, expected.ownerThreadIdsEquals, 'stateAfter', failures)
  assertArcStatuses(state, expected.arcStatusesInclude, failures)
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
  assertNpcIdentityIncludes(state, expected.npcIdentityIncludes, 'stateAfter', failures)
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
    if (anchorExpected.status !== undefined && anchor.status !== anchorExpected.status) {
      failures.push(`temporal anchor ${anchorExpected.anchorId} status expected ${anchorExpected.status}, got ${anchor.status}`)
    }
  }
  if (expected.playerCreditsEquals !== undefined && state.player.credits !== expected.playerCreditsEquals) {
    failures.push(`player credits expected ${expected.playerCreditsEquals}, got ${state.player.credits}`)
  }
  for (const obligationExpected of expected.obligationsInclude ?? []) {
    const obligation = state.campaign.obligations?.[obligationExpected.obligationId]
    if (!obligation) {
      failures.push(`obligation ${obligationExpected.obligationId} missing`)
      continue
    }
    if (obligationExpected.status !== undefined && obligation.status !== obligationExpected.status) {
      failures.push(`obligation ${obligationExpected.obligationId} status expected ${obligationExpected.status}, got ${obligation.status}`)
    }
    if (obligationExpected.balance !== undefined && obligation.balance !== obligationExpected.balance) {
      failures.push(`obligation ${obligationExpected.obligationId} balance expected ${obligationExpected.balance}, got ${obligation.balance ?? 'unset'}`)
    }
    if (obligationExpected.unit !== undefined && obligation.unit !== obligationExpected.unit) {
      failures.push(`obligation ${obligationExpected.obligationId} unit expected ${obligationExpected.unit}, got ${obligation.unit ?? 'unset'}`)
    }
    if (obligationExpected.claimantId !== undefined && obligation.claimant.id !== obligationExpected.claimantId) {
      failures.push(`obligation ${obligationExpected.obligationId} claimant expected ${obligationExpected.claimantId}, got ${obligation.claimant.id}`)
    }
    if (obligationExpected.debtorKind !== undefined && obligation.debtor.kind !== obligationExpected.debtorKind) {
      failures.push(`obligation ${obligationExpected.obligationId} debtor kind expected ${obligationExpected.debtorKind}, got ${obligation.debtor.kind}`)
    }
    if (
      obligationExpected.dueConditionIncludes !== undefined &&
      !obligation.dueCondition.includes(obligationExpected.dueConditionIncludes)
    ) {
      failures.push(`obligation ${obligationExpected.obligationId} due condition missing "${obligationExpected.dueConditionIncludes}"`)
    }
    if (
      obligationExpected.clearanceConditionIncludes !== undefined &&
      !obligation.clearanceCondition.includes(obligationExpected.clearanceConditionIncludes)
    ) {
      failures.push(`obligation ${obligationExpected.obligationId} clearance condition missing "${obligationExpected.clearanceConditionIncludes}"`)
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
    if (threadExpected.deterioration) {
      const d = thread.deterioration
      if (!d) {
        failures.push(`thread ${threadExpected.threadId} deterioration missing`)
      } else {
        if (threadExpected.deterioration.kind !== undefined && d.kind !== threadExpected.deterioration.kind) {
          failures.push(`thread ${threadExpected.threadId} deterioration.kind expected ${threadExpected.deterioration.kind}, got ${d.kind}`)
        }
        if ('deadline' in threadExpected.deterioration) {
          const gotDeadline = d.kind === 'timer' ? d.deadline : undefined
          if (gotDeadline !== threadExpected.deterioration.deadline) {
            failures.push(`thread ${threadExpected.threadId} deterioration.deadline expected ${threadExpected.deterioration.deadline}, got ${gotDeadline ?? '(unset)'}`)
          }
        }
        if ('temporalAnchorId' in threadExpected.deterioration) {
          const gotAnchorId = d.kind === 'timer' ? d.temporalAnchorId : undefined
          if (gotAnchorId !== threadExpected.deterioration.temporalAnchorId) {
            failures.push(`thread ${threadExpected.threadId} deterioration.temporalAnchorId expected ${threadExpected.deterioration.temporalAnchorId}, got ${gotAnchorId ?? '(unset)'}`)
          }
        }
      }
    }
    for (const wantEntry of threadExpected.tensionHistoryIncludes ?? []) {
      const found = thread.tensionHistory.some((e) => e.turn === wantEntry.turn && e.value === wantEntry.value)
      if (!found) {
        failures.push(
          `thread ${threadExpected.threadId} tensionHistory missing { turn: ${wantEntry.turn}, value: ${wantEntry.value} }; got ${JSON.stringify(thread.tensionHistory)}`
        )
      }
    }
    for (const gateExpected of threadExpected.resolutionGatesInclude ?? []) {
      const gate = (thread.resolutionGates ?? []).find((g) => g.id === gateExpected.gateId)
      if (!gate) {
        failures.push(`thread ${threadExpected.threadId} resolution gate ${gateExpected.gateId} missing`)
        continue
      }
      if (gateExpected.status !== undefined && gate.status !== gateExpected.status) {
        failures.push(`thread ${threadExpected.threadId} gate ${gate.id} status expected ${gateExpected.status}, got ${gate.status}`)
      }
      if (
        gateExpected.evidenceQuoteIncludes !== undefined &&
        !String(gate.evidenceQuote ?? '').includes(gateExpected.evidenceQuoteIncludes)
      ) {
        failures.push(`thread ${threadExpected.threadId} gate ${gate.id} evidence missing "${gateExpected.evidenceQuoteIncludes}"`)
      }
    }
    for (const eventExpected of threadExpected.progressEventsInclude ?? []) {
      const event = (thread.progressEvents ?? []).find((e) =>
        e.summary.includes(eventExpected.summaryIncludes) &&
        (eventExpected.gateIdsInclude ?? []).every((id) => (e.gateIds ?? []).includes(id)) &&
        (eventExpected.satisfiedGateIdsInclude ?? []).every((id) => (e.satisfiedGateIds ?? []).includes(id))
      )
      if (!event) {
        failures.push(`thread ${threadExpected.threadId} progress event missing ${JSON.stringify(eventExpected)}`)
      }
    }
  }
  for (const clueExpected of expected.cluesInclude ?? []) {
    const clue = state.campaign.clues[clueExpected.clueId]
    if (!clue) {
      failures.push(`clue ${clueExpected.clueId} missing`)
      continue
    }
    if (clueExpected.status !== undefined && clue.status !== clueExpected.status) {
      failures.push(`clue ${clueExpected.clueId} status expected ${clueExpected.status}, got ${clue.status}`)
    }
    if (clueExpected.contentIncludes !== undefined && !clue.content.includes(clueExpected.contentIncludes)) {
      failures.push(`clue ${clueExpected.clueId} content expected to include "${clueExpected.contentIncludes}", got "${clue.content}"`)
    }
    if (clueExpected.retrievalCueEquals !== undefined && clue.retrievalCue !== clueExpected.retrievalCueEquals) {
      failures.push(
        `clue ${clueExpected.clueId} retrievalCue expected "${clueExpected.retrievalCueEquals}", got "${clue.retrievalCue}"`
      )
    }
    if (
      clueExpected.retrievalCueMaxWords !== undefined &&
      countRetrievalCueWords(clue.retrievalCue) > clueExpected.retrievalCueMaxWords
    ) {
      failures.push(
        `clue ${clueExpected.clueId} retrievalCue expected ≤${clueExpected.retrievalCueMaxWords} words, got "${clue.retrievalCue}"`
      )
    }
    if (
      clueExpected.retrievalCueMaxChars !== undefined &&
      clue.retrievalCue.length > clueExpected.retrievalCueMaxChars
    ) {
      failures.push(
        `clue ${clueExpected.clueId} retrievalCue expected ≤${clueExpected.retrievalCueMaxChars} chars, got "${clue.retrievalCue}"`
      )
    }
    for (const threadId of clueExpected.anchoredToIncludes ?? []) {
      if (!clue.anchoredTo.includes(threadId)) {
        failures.push(`clue ${clueExpected.clueId} anchoredTo missing ${threadId}`)
      }
    }
  }
  if (expected.cluesCount !== undefined) {
    const count = Object.keys(state.campaign.clues ?? {}).length
    if (count !== expected.cluesCount) {
      failures.push(`clues count expected ${expected.cluesCount}, got ${count}`)
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
    if (
      expected.chapterCloseReadiness.objectiveResolved !== undefined &&
      readiness.objectiveResolved !== expected.chapterCloseReadiness.objectiveResolved
    ) {
      failures.push(
        `chapterCloseReadiness.objectiveResolved expected ${expected.chapterCloseReadiness.objectiveResolved}, got ${readiness.objectiveResolved}`
      )
    }
    if (
      expected.chapterCloseReadiness.objectiveOutcome !== undefined &&
      readiness.objectiveOutcome !== expected.chapterCloseReadiness.objectiveOutcome
    ) {
      failures.push(
        `chapterCloseReadiness.objectiveOutcome expected ${expected.chapterCloseReadiness.objectiveOutcome}, got ${readiness.objectiveOutcome ?? 'unset'}`
      )
    }
    if (
      expected.chapterCloseReadiness.reframeCandidateThreadId !== undefined &&
      readiness.reframeCandidateThreadId !== expected.chapterCloseReadiness.reframeCandidateThreadId
    ) {
      failures.push(
        `chapterCloseReadiness.reframeCandidateThreadId expected ${expected.chapterCloseReadiness.reframeCandidateThreadId}, got ${readiness.reframeCandidateThreadId ?? 'unset'}`
      )
    }
    if (
      expected.chapterCloseReadiness.closeOrReframeDirectiveIncludes !== undefined &&
      !readiness.closeOrReframeDirective?.includes(expected.chapterCloseReadiness.closeOrReframeDirectiveIncludes)
    ) {
      failures.push(
        `chapterCloseReadiness.closeOrReframeDirective expected to include "${expected.chapterCloseReadiness.closeOrReframeDirectiveIncludes}", got "${readiness.closeOrReframeDirective ?? 'unset'}"`
      )
    }
  }
  if (expected.postTurnPressureRecovery) {
    const recoveryState: Sf2State = structuredClone(state)
    const recovery = chapterPressureRuntime.recoverAfterTurn(recoveryState)
    for (const fragment of expected.postTurnPressureRecovery.pendingRecoveryNotesInclude ?? []) {
      const notes = recoveryState.campaign.pendingRecoveryNotes ?? []
      if (!notes.some((note) => note.includes(fragment))) {
        failures.push(`postTurnPressureRecovery.pendingRecoveryNotes missing "${fragment}"`)
      }
    }
    for (const want of expected.postTurnPressureRecovery.eventsInclude ?? []) {
      const match = recovery.events.find((event) => {
        if (event.type !== want.type) return false
        if (want.reason !== undefined && event.data.reason !== want.reason) return false
        return true
      })
      if (!match) {
        failures.push(`postTurnPressureRecovery.events missing ${JSON.stringify(want)}`)
      }
    }
  }
  if (expected.quickActionRepair) {
    const qr = expected.quickActionRepair
    const repaired = repairSuggestedActions(qr.inputActions, {
      state: stateBefore,
      failedSkill: qr.failedSkill,
      playerInput: qr.playerInput,
      visibleProse: qr.visibleProse,
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
    const priorChapterMeaning = (expected.authorInputSeed.priorChapterMeaning ?? null) as Sf2ChapterMeaning | null
    const seed = compileAuthorInputSeed(
      stateBefore,
      priorChapterMeaning
    )
    const seedJson = JSON.stringify(seed, null, 2)
    const vocabulary = seed.worldRules.vocabulary.join('\n')
    const arcSituation = buildArcAuthorSituation(seed)
    const authorSituation = buildAuthorSituation(stateBefore, priorChapterMeaning)
    const arcVariantCandidates = getArcVariantCandidates(seed)
    const arcVariantCandidateJson = JSON.stringify(arcVariantCandidates, null, 2)
    for (const snippet of expected.authorInputSeed.hookPremiseIncludes ?? []) {
      if (!seed.hook.premise.includes(snippet)) {
        failures.push(`authorInputSeed.hook.premise missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.hookPremiseExcludes ?? []) {
      if (seed.hook.premise.includes(snippet)) {
        failures.push(`authorInputSeed.hook.premise unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.hookCrucibleIncludes ?? []) {
      if (!seed.hook.crucible.includes(snippet)) {
        failures.push(`authorInputSeed.hook.crucible missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.hookCrucibleExcludes ?? []) {
      if (seed.hook.crucible.includes(snippet)) {
        failures.push(`authorInputSeed.hook.crucible unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.hookFirstEpisodeIncludes ?? []) {
      if (!seed.hook.firstEpisode?.includes(snippet)) {
        failures.push(`authorInputSeed.hook.firstEpisode missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.worldVocabularyIncludes ?? []) {
      if (!vocabulary.includes(snippet)) {
        failures.push(`authorInputSeed.worldRules.vocabulary missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.worldVocabularyExcludes ?? []) {
      if (vocabulary.includes(snippet)) {
        failures.push(`authorInputSeed.worldRules.vocabulary unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.seedJsonIncludes ?? []) {
      if (!seedJson.includes(snippet)) {
        failures.push(`authorInputSeed JSON missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.seedJsonExcludes ?? []) {
      if (seedJson.includes(snippet)) {
        failures.push(`authorInputSeed JSON unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcAuthorSituationIncludes ?? []) {
      if (!arcSituation.includes(snippet)) {
        failures.push(`arcAuthorSituation missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcAuthorSituationExcludes ?? []) {
      if (arcSituation.includes(snippet)) {
        failures.push(`arcAuthorSituation unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcAuthorRoleIncludes ?? []) {
      if (!SF2_ARC_AUTHOR_ROLE.includes(snippet)) {
        failures.push(`arcAuthorRole missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcAuthorRoleExcludes ?? []) {
      if (SF2_ARC_AUTHOR_ROLE.includes(snippet)) {
        failures.push(`arcAuthorRole unexpectedly includes "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.authorSituationIncludes ?? []) {
      if (!authorSituation.includes(snippet)) {
        failures.push(`authorSituation missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.authorSituationExcludes ?? []) {
      if (authorSituation.includes(snippet)) {
        failures.push(`authorSituation unexpectedly includes "${snippet}"`)
      }
    }
    if (
      expected.authorInputSeed.arcVariantCandidateCount !== undefined &&
      arcVariantCandidates.length !== expected.authorInputSeed.arcVariantCandidateCount
    ) {
      failures.push(
        `authorInputSeed.arcVariantCandidates: expected ${expected.authorInputSeed.arcVariantCandidateCount}, got ${arcVariantCandidates.length}`
      )
    }
    for (const id of expected.authorInputSeed.arcVariantCandidateIdsInclude ?? []) {
      if (!arcVariantCandidates.some((candidate) => candidate.id === id)) {
        failures.push(`authorInputSeed.arcVariantCandidates missing id "${id}"`)
      }
    }
    for (const scenarioBias of expected.authorInputSeed.arcVariantCandidateScenarioBiasesInclude ?? []) {
      if (!arcVariantCandidates.some((candidate) => candidate.scenarioBias === scenarioBias)) {
        failures.push(`authorInputSeed.arcVariantCandidates missing scenarioBias "${scenarioBias}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcVariantCandidateJsonIncludes ?? []) {
      if (!arcVariantCandidateJson.includes(snippet)) {
        failures.push(`authorInputSeed.arcVariantCandidates JSON missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorInputSeed.arcVariantCandidateJsonExcludes ?? []) {
      if (arcVariantCandidateJson.includes(snippet)) {
        failures.push(`authorInputSeed.arcVariantCandidates JSON unexpectedly includes "${snippet}"`)
      }
    }
  }
  if (expected.setupCompiler) {
    for (const optionList of expected.setupCompiler.optionLists ?? []) {
      const origins = listSf2SetupOrigins(optionList.genreId)
      for (const originId of optionList.originIdsInclude ?? []) {
        if (!origins.some((origin) => origin.id === originId)) {
          failures.push(`setupCompiler.optionLists ${optionList.genreId}: missing origin ${originId}`)
        }
      }
      for (const playbookList of optionList.playbookIdsInclude ?? []) {
        const playbooks = listSf2SetupPlaybooks(optionList.genreId, playbookList.originId)
        for (const playbookId of playbookList.playbookIds) {
          if (!playbooks.some((playbook) => playbook.id === playbookId)) {
            failures.push(`setupCompiler.optionLists ${optionList.genreId}/${playbookList.originId}: missing playbook ${playbookId}`)
          }
        }
      }
    }

    for (const filter of expected.setupCompiler.hookFilters ?? []) {
      const hooks = listSf2SetupHooks(filter.genreId, filter.originId, filter.playbookId)
      const titles = hooks.map((hook) => hook.title)
      for (const title of filter.includesTitles ?? []) {
        if (!titles.includes(title)) {
          failures.push(`setupCompiler.hookFilters ${filter.genreId}/${filter.originId}/${filter.playbookId}: missing hook "${title}"`)
        }
      }
      for (const title of filter.excludesTitles ?? []) {
        if (titles.includes(title)) {
          failures.push(`setupCompiler.hookFilters ${filter.genreId}/${filter.originId}/${filter.playbookId}: unexpectedly includes hook "${title}"`)
        }
      }
    }

    for (const setupCase of expected.setupCompiler.cases) {
      const selection = resolveSetupSelectionByTitle(setupCase.selection)
      const seed = compileSf2SetupSeed(selection)
      const created = createInitialSf2State({
        campaignId: `setup_${setupCase.name.replace(/\W+/g, '_')}`,
        playerName: setupCase.selection.characterName ?? 'Replay Runner',
        setupSelection: selection,
      })
      const player = created.player
      const expect = setupCase.expect
      const label = `setupCompiler.${setupCase.name}`
      if (expect.originName !== undefined && seed.originName !== expect.originName) {
        failures.push(`${label}.originName expected ${expect.originName}, got ${seed.originName}`)
      }
      if (expect.playbookName !== undefined && seed.playbookName !== expect.playbookName) {
        failures.push(`${label}.playbookName expected ${expect.playbookName}, got ${seed.playbookName}`)
      }
      if (expect.hookTitle !== undefined && seed.hook.title !== expect.hookTitle) {
        failures.push(`${label}.hook.title expected ${expect.hookTitle}, got ${seed.hook.title}`)
      }
      for (const snippet of expect.hookPremiseIncludes ?? []) {
        if (!seed.hook.premise.includes(snippet)) {
          failures.push(`${label}.hook.premise missing "${snippet}"`)
        }
      }
      if (expect.hookObjectiveEquals !== undefined && seed.hook.objective !== expect.hookObjectiveEquals) {
        failures.push(`${label}.hook.objective expected ${expect.hookObjectiveEquals}, got ${seed.hook.objective ?? 'unset'}`)
      }
      if (expect.hookCrucibleEquals !== undefined && seed.hook.crucible !== expect.hookCrucibleEquals) {
        failures.push(`${label}.hook.crucible expected ${expect.hookCrucibleEquals}, got ${seed.hook.crucible}`)
      }
      if (expect.hookArcNameEquals !== undefined && seed.hook.arcName !== expect.hookArcNameEquals) {
        failures.push(`${label}.hook.arcName expected ${expect.hookArcNameEquals}, got ${seed.hook.arcName ?? 'unset'}`)
      }
      if (expect.hookFirstEpisodeEquals !== undefined && seed.hook.firstEpisode !== expect.hookFirstEpisodeEquals) {
        failures.push(`${label}.hook.firstEpisode expected ${expect.hookFirstEpisodeEquals}, got ${seed.hook.firstEpisode ?? 'unset'}`)
      }
      for (const term of expect.worldVocabularyIncludes ?? []) {
        if (!seed.worldRules.vocabulary.includes(term)) {
          failures.push(`${label}.worldRules.vocabulary missing ${term}`)
        }
      }
      if (expect.playerHpEquals !== undefined && player.hp.max !== expect.playerHpEquals) {
        failures.push(`${label}.player.hp expected ${expect.playerHpEquals}, got ${player.hp.max}`)
      }
      if (expect.playerAcEquals !== undefined && player.ac !== expect.playerAcEquals) {
        failures.push(`${label}.player.ac expected ${expect.playerAcEquals}, got ${player.ac}`)
      }
      if (expect.playerCreditsEquals !== undefined && player.credits !== expect.playerCreditsEquals) {
        failures.push(`${label}.player.credits expected ${expect.playerCreditsEquals}, got ${player.credits}`)
      }
      for (const proficiency of expect.playerProficienciesInclude ?? []) {
        if (!player.proficiencies.includes(proficiency)) {
          failures.push(`${label}.player.proficiencies missing ${proficiency}`)
        }
      }
      for (const itemName of expect.playerInventoryIncludes ?? []) {
        if (!player.inventory.some((item) => item.name === itemName)) {
          failures.push(`${label}.player.inventory missing ${itemName}`)
        }
      }
      if (expect.playerTraitEquals !== undefined && player.traits[0]?.name !== expect.playerTraitEquals) {
        failures.push(`${label}.player.trait expected ${expect.playerTraitEquals}, got ${player.traits[0]?.name ?? 'unset'}`)
      }
      for (const naturalMove of expect.pcNaturalMovesInclude ?? []) {
        if (!seed.pcCapabilities?.playbookProfile?.naturalMoves.includes(naturalMove)) {
          failures.push(`${label}.pcCapabilities.playbookProfile.naturalMoves missing ${naturalMove}`)
        }
      }
      if (created.meta.setupSelection?.hookId !== selection.hookId) {
        failures.push(`${label}.meta.setupSelection hook id was not persisted`)
      }
      if (created.meta.hookTitle !== seed.hook.title) {
        failures.push(`${label}.meta.hookTitle expected ${seed.hook.title}, got ${created.meta.hookTitle ?? 'unset'}`)
      }
      const compiledFromState = compileAuthorInputSeed(created, null)
      if (compiledFromState.hook.title !== seed.hook.title) {
        failures.push(`${label}.compileAuthorInputSeed returned ${compiledFromState.hook.title}, expected ${seed.hook.title}`)
      }
    }
  }
  if (expected.authorRetryNudge) {
    const nudge = buildAuthorRetryNudge(
      expected.authorRetryNudge.errors,
      expected.authorRetryNudge.genreId,
      expected.authorRetryNudge.hookTitle
    )
    for (const snippet of expected.authorRetryNudge.containsAll ?? []) {
      if (!nudge.includes(snippet)) {
        failures.push(`authorRetryNudge missing "${snippet}"`)
      }
    }
    for (const snippet of expected.authorRetryNudge.containsNone ?? []) {
      if (nudge.includes(snippet)) {
        failures.push(`authorRetryNudge unexpectedly includes "${snippet}"`)
      }
    }
  }
  if (expected.authorRetryPolicy) {
    if (
      typeof expected.authorRetryPolicy.defaultMaxAttemptsEquals === 'number' &&
      AUTHOR_DEFAULT_MAX_ATTEMPTS !== expected.authorRetryPolicy.defaultMaxAttemptsEquals
    ) {
      failures.push(
        `authorRetryPolicy.defaultMaxAttempts: expected ${expected.authorRetryPolicy.defaultMaxAttemptsEquals}, got ${AUTHOR_DEFAULT_MAX_ATTEMPTS}`
      )
    }
    if (
      expected.authorRetryPolicy.retryableErrors &&
      !shouldRetryAuthorValidation(expected.authorRetryPolicy.retryableErrors)
    ) {
      failures.push('authorRetryPolicy.retryableErrors: expected validation retry')
    }
    if (
      expected.authorRetryPolicy.nonRetryableErrors &&
      shouldRetryAuthorValidation(expected.authorRetryPolicy.nonRetryableErrors)
    ) {
      failures.push('authorRetryPolicy.nonRetryableErrors: expected no validation retry')
    }
  }
  if (expected.diagnosticEnvelope) {
    const findings = debugEntriesToDiagnosticFindings(expected.diagnosticEnvelope.debugEntries as never)
    if (
      typeof expected.diagnosticEnvelope.countEquals === 'number' &&
      findings.length !== expected.diagnosticEnvelope.countEquals
    ) {
      failures.push(`diagnosticEnvelope.count: expected ${expected.diagnosticEnvelope.countEquals}, got ${findings.length}`)
    }
    for (const source of expected.diagnosticEnvelope.sourcesInclude ?? []) {
      if (!findings.some((finding) => finding.source === source)) {
        failures.push(`diagnosticEnvelope.sources missing ${source}`)
      }
    }
    if (expected.diagnosticEnvelope.openErrorQuery) {
      const query = expected.diagnosticEnvelope.openErrorQuery
      const got = queryOpenErrorFindingsForEntity(findings, query.entityId).length
      if (got !== query.countEquals) {
        failures.push(`diagnosticEnvelope.openErrorQuery: expected ${query.countEquals}, got ${got}`)
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
    if (state.chapter.currentSceneId !== expected.currentSceneId) {
      failures.push(`chapter.currentSceneId expected ${expected.currentSceneId}, got ${state.chapter.currentSceneId}`)
    }
    if (state.world.sceneSnapshot.sceneId !== expected.currentSceneId) {
      failures.push(`world.sceneSnapshot.sceneId expected ${expected.currentSceneId}, got ${state.world.sceneSnapshot.sceneId}`)
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
  if (expected.currentAreaNodeId !== undefined) {
    if (expected.currentAreaNodeId === null) {
      if (state.world.currentPosition?.areaNodeId !== undefined) {
        failures.push(`currentPosition.areaNodeId expected unset, got ${state.world.currentPosition.areaNodeId}`)
      }
    } else if (state.world.currentPosition?.areaNodeId !== expected.currentAreaNodeId) {
      failures.push(`currentPosition.areaNodeId expected ${expected.currentAreaNodeId}, got ${state.world.currentPosition?.areaNodeId ?? 'unset'}`)
    }
  }
  for (const id of expected.entityIdsInclude ?? []) {
    if (!hasEntityId(state, id)) failures.push(`entity ${id} missing`)
  }
  for (const id of expected.entityIdsAbsent ?? []) {
    if (hasEntityId(state, id)) failures.push(`entity ${id} unexpectedly present`)
  }
  for (const id of expected.locationIdsInclude ?? []) {
    if (!state.campaign.locations[id]) failures.push(`location ${id} missing`)
  }
  for (const id of expected.locationIdsAbsent ?? []) {
    if (state.campaign.locations[id]) failures.push(`location ${id} unexpectedly present`)
  }
  for (const matchExpected of expected.locationsMatchingName ?? []) {
    const key = canonicalLocationNameKey(matchExpected.name)
    const matches = Object.values(state.campaign.locations)
      .filter((location) => canonicalLocationNameKey(location.name || location.id) === key)
    if (matchExpected.count !== undefined && matches.length !== matchExpected.count) {
      failures.push(`locations matching "${matchExpected.name}" expected ${matchExpected.count}, got ${matches.length} [${matches.map((l) => l.id).join(',')}]`)
    }
    for (const id of matchExpected.idsInclude ?? []) {
      if (!matches.some((location) => location.id === id)) {
        failures.push(`locations matching "${matchExpected.name}" missing ${id} [${matches.map((l) => l.id).join(',')}]`)
      }
    }
    for (const id of matchExpected.idsExclude ?? []) {
      if (matches.some((location) => location.id === id)) {
        failures.push(`locations matching "${matchExpected.name}" unexpectedly includes ${id}`)
      }
    }
  }
  for (const detailExpected of expected.locationDetailsInclude ?? []) {
    const location = state.campaign.locations[detailExpected.locationId]
    if (!location) {
      failures.push(`locationDetails ${detailExpected.locationId} missing`)
      continue
    }
    if (
      detailExpected.descriptionIncludes !== undefined &&
      !location.description.includes(detailExpected.descriptionIncludes)
    ) {
      failures.push(
        `locationDetails ${detailExpected.locationId}.description missing "${detailExpected.descriptionIncludes}"`
      )
    }
    for (const condition of detailExpected.atmosphericConditionsInclude ?? []) {
      if (!(location.atmosphericConditions ?? []).includes(condition)) {
        failures.push(`locationDetails ${detailExpected.locationId}.atmosphericConditions missing "${condition}"`)
      }
    }
  }
  assertLocationAreaNodes(state, expected.locationAreaNodes, 'expected', failures)
  for (const fragment of expected.archivistTurnMessage?.containsAll ?? []) {
    if (!archivistTurnMessage.includes(fragment)) {
      failures.push(`archivist turn message missing "${fragment.slice(0, 80)}"`)
    }
  }
  for (const fragment of expected.archivistTurnMessage?.containsNone ?? []) {
    if (archivistTurnMessage.includes(fragment)) {
      failures.push(`archivist turn message unexpectedly contains "${fragment.slice(0, 80)}"`)
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
  for (const fragment of expected.pendingCoherenceNotesInclude ?? []) {
    const notes = state.campaign.pendingCoherenceNotes ?? []
    if (!notes.some((note) => note.includes(fragment))) {
      failures.push(`pendingCoherenceNotes missing "${fragment}"`)
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
    if (ds.repairsVisibleProse) {
      const sentinelKernel = buildSceneKernel(stateBefore)
      const findings = scanDisplayOutput(fixture.input.narrator.prose, {
        campaign: stateBefore.campaign,
        locationContinuity: {
          recentSceneText: buildLocationContinuityText(stateBefore),
        },
        absentSpeakers: {
          absentEntityIds: sentinelKernel.absentEntityIds,
          aliasMap: sentinelKernel.aliasMap,
        },
      })
      const repairedProse = repairVisibleLeaks(fixture.input.narrator.prose, findings)
      const repaired = repairedProse !== fixture.input.narrator.prose
      const clientVisibleProse = repaired ? repairedProse : fixture.input.narrator.prose
      for (const text of ds.repairsVisibleProse.containsAll ?? []) {
        if (!clientVisibleProse.includes(text)) failures.push(`displaySentinel repaired prose missing "${text}"`)
      }
      for (const text of ds.repairsVisibleProse.containsNone ?? []) {
        if (clientVisibleProse.includes(text)) failures.push(`displaySentinel repaired prose still contains "${text}"`)
      }
      if (!repaired) failures.push('displaySentinel expected repaired prose to supersede streamed prose, but prose was unchanged')
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
  if (expected.turnResolution) {
    const resolution = state.history.turns.find((t) => t.index === (fixture.input.turnIndex ?? stateBefore.history.turns.length))
      ?.turnResolution ?? state.history.turns.at(-1)?.turnResolution
    const want = expected.turnResolution
    if (!resolution) {
      failures.push('turnResolution missing from turn record')
    } else {
      if (want.actionType !== undefined && resolution.action.actionType !== want.actionType) {
        failures.push(`turnResolution.actionType expected ${want.actionType}, got ${resolution.action.actionType}`)
      }
      if (want.targetEntityIdsEquals !== undefined) {
        const expectedIds = [...want.targetEntityIdsEquals].sort().join(',')
        const actualIds = [...resolution.action.targetEntityIds].sort().join(',')
        if (expectedIds !== actualIds) {
          failures.push(`turnResolution.targetEntityIds expected [${expectedIds}], got [${actualIds}]`)
        }
      }
      if (want.targetThreadIdsEquals !== undefined) {
        const expectedIds = [...want.targetThreadIdsEquals].sort().join(',')
        const actualIds = [...resolution.targetThreadIds].sort().join(',')
        if (expectedIds !== actualIds) {
          failures.push(`turnResolution.targetThreadIds expected [${expectedIds}], got [${actualIds}]`)
        }
      }
      for (const eventExpected of want.consequenceEventsInclude ?? []) {
        const match = resolution.consequenceEvents.find((event) => {
          if (event.kind !== eventExpected.kind) return false
          if (eventExpected.rollOutcome !== undefined && event.rollOutcome !== eventExpected.rollOutcome) return false
          if (eventExpected.pressureDelta !== undefined && event.pressureDelta !== eventExpected.pressureDelta) return false
          if (
            eventExpected.stateMutationObserved !== undefined &&
            event.stateMutationObserved !== eventExpected.stateMutationObserved
          ) return false
          if (eventExpected.targetThreadIdsEquals !== undefined) {
            const expectedIds = [...eventExpected.targetThreadIdsEquals].sort().join(',')
            const actualIds = [...event.targetThreadIds].sort().join(',')
            if (expectedIds !== actualIds) return false
          }
          if (
            eventExpected.noteIncludes !== undefined &&
            !event.note.toLowerCase().includes(eventExpected.noteIncludes.toLowerCase())
          ) return false
          return true
        })
        if (!match) failures.push(`turnResolution consequence missing ${JSON.stringify(eventExpected)}`)
      }
      for (const findingExpected of want.driftFindingsInclude ?? []) {
        const match = resolution.driftFindings.find((finding) => {
          if (findingExpected.type !== undefined && finding.type !== findingExpected.type) return false
          if (findingExpected.stateReference !== undefined && finding.stateReference !== findingExpected.stateReference) return false
          if (
            findingExpected.suggestedNoteIncludes !== undefined &&
            !finding.suggestedNote.toLowerCase().includes(findingExpected.suggestedNoteIncludes.toLowerCase())
          ) return false
          return true
        })
        if (!match) failures.push(`turnResolution drift finding missing ${JSON.stringify(findingExpected)}`)
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

function hasEntityId(state: Sf2State, id: string): boolean {
  return Boolean(
    state.campaign.arcs[id] ||
    state.campaign.threads[id] ||
    state.campaign.decisions[id] ||
    state.campaign.promises[id] ||
    state.campaign.obligations?.[id] ||
    state.campaign.clues[id] ||
    state.campaign.beats[id] ||
    state.campaign.temporalAnchors[id] ||
    state.campaign.npcs[id] ||
    state.campaign.factions[id] ||
    state.campaign.locations[id] ||
    state.campaign.documents[id]
  )
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
          resolutionGates: [],
          progressEvents: [],
          tensionHistory: [],
        },
      },
      decisions: {},
      engines: {},
      promises: {},
      obligations: {},
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
      pressureEvents: [],
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
          sourceFactionLabel: 'fixture',
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
