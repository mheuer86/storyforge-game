import {
  validateNpcDisposition,
  type DispositionDerivationContext,
} from './disposition-defaults'
import { CHAPTER_OPEN_CAP } from '../pressure/constants'
import { normalizeThreadResolutionGates } from '../thread-resolution'
import { PROCEDURE_NONE } from '../procedure'
import { isSf2bState } from '../../sf2b/mode'
import {
  deriveSf2bContinuityLock,
  validateSf2bContinuityLockUsage,
} from '../../sf2b/continuity-lock'
import type {
  AuthorChapterSetupV2,
  Sf2HumanStakeCostSurface,
  Sf2ChapterTensionRole,
  Sf2RevealContext,
  Sf2RevelationCashConditions,
  Sf2State,
  Sf2ThreadStatus,
} from '../types'
import { SF2_HUMAN_STAKE_COST_SURFACES } from '../types'
import { isThreadTerminal } from '../thread-lifecycle'
import { selectLatentArcQuestionsForChapter } from '../arc-questions'

export type AuthorRawValidationContext = DispositionDerivationContext & {
  isContinuation?: boolean
  state?: Sf2State
}

export type AuthorSetupValidationOptions = {
  isContinuation: boolean
  state?: Sf2State
}

const BASE_PROCEDURE_GRAVITY_RE =
  /\b(countdown|timer|minutes?|seconds?|percent(?:age)?|decryption|decrypt|unlock|lock|scan|sweep|passive|audit|query|warrant|protocol|queue|window|threshold|code|authorization)\b/i
const PROCEDURE_GRAVITY_BY_GENRE: Record<string, RegExp> = {
  'space-opera': /\b(clamp|release|manifest|fork|route|corridor|beacon|clearance)\b/i,
  cyberpunk: /\b(daemon|ice|firewall|credential|credentialed|backdoor|trace|traceback|exploit|blackout)\b/i,
  fantasy: /\b(ward|seal|rite|ritual|oath|geas|sigil|threshold|key|gate)\b/i,
  grimdark: /\b(edict|tithe|seal|writ|ration|muster|purge|inquest|confession)\b/i,
  noire: /\b(warrant|ledger|wire|tail|stakeout|alibi|booking|evidence|docket)\b/i,
}
const HUMAN_LEVERAGE_RE =
  /\b(threats?|offers?|takes?|withholds?|exposes?|leverage|pressure|forces?|demands?|bargains?|trades?|promises?|costs?|authority|warrant|blackmail|protects?|betrays?|needs?|wants?|asks?|uses?)\b/i
export const OUTCOME_HUMAN_ANCHOR_WORDS = [
  'trust',
  'cools',
  'cooled',
  'owed',
  'burned',
  'exposed',
  'hunts',
  'knows',
  'promise',
  'debt',
  'cost',
  'standing',
  'freedom',
  'loyalty',
  'relationship',
  'safety',
  'reputation',
] as const
const OUTCOME_HUMAN_ANCHOR_RE = new RegExp(`\\b(${OUTCOME_HUMAN_ANCHOR_WORDS.join('|')})\\b`, 'i')
const PROCEDURAL_ONLY_OUTCOME_RE =
  /\b(audit|warrant|cipher|file|record|ledger|form|queue|protocol|review|query|case|route|manifest)\b.*\b(closes?|releases?|fails?|clears?|updates?|resolves?|processes?|opens?)\b/i
const SCENE_ELEMENT_PATTERN =
  '(?:record room|control room|room|door|hall|chamber|gate|terminal|station|berth|corridor|antechamber|annex|platform|dock|bay|lift|elevator|console|desk|table|threshold|airlock|hangar|office|booth|atrium|archive)'
const SCENE_PREPOSITION_RE = new RegExp(
  `\\b(?:in|inside|within|at|by|beside|near|from|through|toward|towards|into|onto|outside|behind|under|over|past)\\s+(?:the\\s+)?${SCENE_ELEMENT_PATTERN}\\b`,
  'i'
)
const SCENE_OBJECT_ACTION_RE = new RegExp(
  `\\b(?:reaches?|touch(?:es)?|opens?|uses?|enters?|exits?|leaves?|blocks?|clears?|unlocks?|locks?|crosses?|passes?|approaches?|activates?|deactivates?)\\s+(?:the\\s+)?${SCENE_ELEMENT_PATTERN}\\b`,
  'i'
)
const EXPLICIT_SCENE_ELEMENT_RE = new RegExp(
  `\\b(?:the\\s+)?${SCENE_ELEMENT_PATTERN}\\s+(?:opens?|closes?|locks?|unlocks?|seals?|unseals?|blocks?)\\b`,
  'i'
)
const SCENE_ELEMENT_LABEL_RE = new RegExp(`^(?:the\\s+)?${SCENE_ELEMENT_PATTERN}$`, 'i')

export function validateChapterRaw(
  raw: Record<string, unknown>,
  ctx: AuthorRawValidationContext
): string[] {
  const errors: string[] = []
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  if (!stringField(frame, 'title').trim()) errors.push('chapter_frame.title is empty')
  if (!stringField(frame, 'premise').trim()) errors.push('chapter_frame.premise is empty')

  const spectrum = getObject(frame, 'outcome_spectrum', 'outcomeSpectrum')
  if (Object.keys(spectrum).length === 0) {
    errors.push('chapter_frame.outcome_spectrum is missing')
  } else {
    for (const key of ['clean', 'costly', 'failure', 'catastrophic']) {
      const value = stringField(spectrum, key).trim()
      if (!value) errors.push(`chapter_frame.outcome_spectrum.${key} is empty`)
      else if (!hasHumanOutcomeAnchor(value)) errors.push(`chapter_frame.outcome_spectrum.${key} must name a human consequence, named entity, or relationship/cost`)
    }
  }

  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  const sourceFactionId = stringField(antag, 'source_faction_id', 'sourceFactionId').trim()
  const sourceFactionLabel = stringField(antag, 'source_faction_label', 'sourceFactionLabel').trim()
  const legacySourceSystem = stringField(antag, 'source_system', 'sourceSystem').trim()
  if (!sourceFactionId && !sourceFactionLabel && !legacySourceSystem) {
    errors.push('antagonist_field must include source_faction_id or source_faction_label')
  }
  if (sourceFactionId && ctx.state && !isKnownFactionSourceId(ctx.state, sourceFactionId)) {
    errors.push(`antagonist_field.source_faction_id ${sourceFactionId} is not an existing faction`)
  }
  if (!stringField(antag, 'core_pressure', 'corePressure').trim()) errors.push('antagonist_field.core_pressure is empty')
  const defaultFace = getObject(antag, 'default_face', 'defaultFace')
  if (!stringField(defaultFace, 'name').trim()) errors.push('antagonist_field.default_face.name is empty')

  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')
  for (const key of ['location', 'atmospheric_condition', 'initial_state', 'first_player_facing']) {
    const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
    if (!stringField(opening, key, camel).trim()) errors.push(`opening_scene_spec.${key} is empty`)
  }
  if (ctx.isContinuation) {
    for (const key of ['dramatic_situation', 'first_visible_pressure', 'first_human_or_institutional_move']) {
      const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
      if (!stringField(opening, key, camel).trim()) errors.push(`opening_scene_spec.${key} is empty for chapter ≥ 2`)
    }
    if (stringArray(opening, 'do_not_restage', 'doNotRestage').length === 0) {
      errors.push('opening_scene_spec.do_not_restage must list at least one prior mechanism/milestone for chapter ≥ 2')
    }
    errors.push(...validateRawContinuationDramaticTurn(raw))
  }

  const npcs = getArray(raw, 'starting_npcs', 'startingNPCs')
  if (npcs.length !== 3) errors.push(`starting_npcs must contain exactly 3 NPCs (got ${npcs.length})`)
  const threads = getArray(raw, 'active_threads', 'activeThreads')
  const transitionStatuses = new Map(
    getArray(raw, 'thread_transitions', 'threadTransitions').map((t) => [
      stringField(t, 'id'),
      stringField(t, 'to_status', 'toStatus') as Sf2ThreadStatus,
    ])
  )
  const expectedThreadCount = ctx.isContinuation ? 4 : 3
  if (threads.length !== expectedThreadCount) {
    errors.push(`active_threads must contain exactly ${expectedThreadCount} threads (got ${threads.length})`)
  }
  let continuationDriverCount = 0
  threads.forEach((t, i) => {
    const initial = valueField(t, 'initial_tension', 'initialTension')
    const initialValue = Number(initial)
    if (initial !== undefined && (!Number.isFinite(initialValue) || initialValue < 0 || initialValue > CHAPTER_OPEN_CAP)) {
      errors.push(`active_threads[${i}].initial_tension must be between 0 and ${CHAPTER_OPEN_CAP}`)
    }
    if (ctx.isContinuation) {
      const id = stringField(t, 'id')
      const driverKind = stringField(t, 'driver_kind', 'driverKind')
      const successorTo = stringField(t, 'successor_to_thread_id', 'successorToThreadId')
      const tension = Number(valueField(t, 'tension') ?? 0)
      const existing = ctx.state?.campaign?.threads?.[id]
      if (existing && isThreadTerminal(existing.status)) {
        errors.push(`active_threads[${i}].id ${id} is already terminal (${existing.status}); transition it and author a successor instead`)
      }
      if (!['carry_forward', 'successor', 'new_pressure', 'arc_promoted'].includes(driverKind)) {
        errors.push(`active_threads[${i}].driver_kind is required for chapter ≥ 2`)
      }
      if (driverKind === 'successor' && !successorTo.trim()) {
        errors.push(`active_threads[${i}].successor_to_thread_id is required for successor threads`)
      } else if (driverKind === 'successor') {
        const predecessor = ctx.state?.campaign?.threads?.[successorTo]
        if (!predecessor) {
          errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} is not an existing thread`)
        } else if (successorTo === id) {
          errors.push(`active_threads[${i}].successor_to_thread_id cannot point to itself`)
        } else {
          const transitionStatus = transitionStatuses.get(successorTo)
          const terminalByState = isThreadTerminal(predecessor.status)
          const terminalByTransition = transitionStatus ? isThreadTerminal(transitionStatus) : false
          const terminalByCompletion =
            !terminalByState && !terminalByTransition && canCompleteSuccessorTransition(ctx, successorTo)
          if (!terminalByState && !terminalByTransition && !terminalByCompletion) {
            errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} must be terminal already or terminal in thread_transitions`)
          }
        }
      }
      if (driverKind === 'successor' || driverKind === 'new_pressure' || driverKind === 'arc_promoted') {
        continuationDriverCount += 1
        if (!Number.isFinite(tension) || tension < 6) {
          errors.push(`active_threads[${i}] new/successor/arc_promoted driver must be load-bearing tension ≥6`)
        }
      }
    }
  })
  if (ctx.isContinuation && continuationDriverCount < 1) {
    errors.push('active_threads must include at least 1 successor, new_pressure, or arc_promoted driver for chapter ≥ 2')
  }

  const arcLink = getObject(raw, 'arc_link', 'arcLink')
  if (!stringField(arcLink, 'arc_id', 'arcId').trim()) errors.push('arc_link.arc_id is empty')
  if (!stringField(arcLink, 'chapter_function', 'chapterFunction').trim()) errors.push('arc_link.chapter_function is empty')

  const pacing = getObject(raw, 'pacing_contract', 'pacingContract')
  if (!stringField(pacing, 'chapter_question', 'chapterQuestion').trim()) errors.push('pacing_contract.chapter_question is empty')
  const targetTurns = getObject(pacing, 'target_turns', 'targetTurns')
  if (Number(targetTurns.min ?? 0) < 1 || Number(targetTurns.max ?? 0) < 1) {
    errors.push('pacing_contract.target_turns is missing')
  }

  // Disposition derivation: per-genre default ranges per role × affiliation pair.
  // Catches the rule-8 violation class observed in playthrough 7 (settlement
  // elder authored as 'trusted' toward an Imperial Warden). Author may override
  // when there's authorial reason — captured by `disposition_reason` ≥5 words.
  // ctx.genreId === '' (campaign without a state, edge case) → derivation
  // returns null and no constraint applies.
  npcs.forEach((n, i) => {
    const role = stringField(n, 'role')
    const affiliation = stringField(n, 'affiliation')
    const initialDisposition = stringField(n, 'initial_disposition', 'initialDisposition')
    const dispositionReason = stringField(n, 'disposition_reason', 'dispositionReason')
    if (!role || !affiliation || !initialDisposition) return
    const err = validateNpcDisposition(
      ctx,
      { role, affiliation, initialDisposition, dispositionReason },
      `starting_npcs[${i}]`
    )
    if (err) errors.push(err)
  })

  const ladder = getArray(raw, 'pressure_ladder', 'pressureLadder')
  if (ladder.length !== 3) errors.push(`pressure_ladder must contain exactly 3 steps (got ${ladder.length})`)
  ladder.forEach((step, i) => {
    errors.push(...validateRawPressureTriggerEvent(step, i))
  })
  errors.push(...validateRawHumanStakes(raw, threads, npcs, ctx.state))
  const tensionScore = getArray(raw, 'tension_score', 'tensionScore')
  const requiresTensionScore = ctx.isContinuation && ctx.state && isSf2bState(ctx.state)
  if (requiresTensionScore && (tensionScore.length < 3 || tensionScore.length > 4)) {
    errors.push(`tension_score must contain 3-4 lines for SF2B continuation chapters (got ${tensionScore.length})`)
  }
  tensionScore.forEach((line, i) => {
    const role = stringField(line, 'role')
    if (!TENSION_SCORE_ROLES.has(role as Sf2ChapterTensionRole)) {
      errors.push(`tension_score[${i}].role is invalid`)
    }
    for (const key of ['pressure', 'prose_surface', 'advances_when', 'resolves_or_reframes_when']) {
      const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
      if (!stringField(line, key, camel).trim()) errors.push(`tension_score[${i}].${key} is empty`)
    }
  })
  const revelations = getArray(raw, 'possible_revelations', 'possibleRevelations')
  if (revelations.length !== 2) errors.push(`possible_revelations must contain exactly 2 revelations (got ${revelations.length})`)
  const faultLines = getArray(raw, 'moral_fault_lines', 'moralFaultLines')
  if (faultLines.length !== 2) errors.push(`moral_fault_lines must contain exactly 2 fault lines (got ${faultLines.length})`)
  const escalations = getArray(raw, 'escalation_options', 'escalationOptions')
  if (escalations.length !== 3) errors.push(`escalation_options must contain exactly 3 options (got ${escalations.length})`)
  const lore = getArray(raw, 'editorialized_lore', 'editorializedLore')
  if (lore.length !== 2) errors.push(`editorialized_lore must contain exactly 2 items (got ${lore.length})`)
  return errors
}

export function validateAuthorToolInput(
  raw: Record<string, unknown>,
  ctx: AuthorRawValidationContext
): string[] {
  const rawErrors = validateChapterRaw(raw, ctx)
  try {
    const authored = completeAuthorSetupForValidation(normalizeAuthorSetup(raw), {
      isContinuation: Boolean(ctx.isContinuation),
      state: ctx.state,
    })
    const semanticErrors = validateAuthorSetup(authored, {
      isContinuation: Boolean(ctx.isContinuation),
      state: ctx.state,
    })
    return uniqueErrors([...rawErrors, ...semanticErrors])
  } catch (error) {
    return uniqueErrors([
      ...rawErrors,
      `author setup normalization failed: ${error instanceof Error ? error.message : String(error)}`,
    ])
  }
}

export function normalizeAuthorSetup(raw: Record<string, unknown>): AuthorChapterSetupV2 {
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  const sourceFactionId = stringField(antag, 'source_faction_id', 'sourceFactionId').trim()
  const sourceFactionLabel = stringField(antag, 'source_faction_label', 'sourceFactionLabel').trim()
  const legacySourceSystem = stringField(antag, 'source_system', 'sourceSystem').trim()
  const possibleFacesRaw = getArray(antag, 'possible_faces', 'possibleFaces')
  const defaultFace =
    getObject(antag, 'default_face', 'defaultFace') ??
    (possibleFacesRaw[0] as Record<string, unknown> | undefined) ??
    {}
  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')
  const arcLink = getObject(raw, 'arc_link', 'arcLink')
  const pacing = getObject(raw, 'pacing_contract', 'pacingContract')
  const targetTurns = getObject(pacing, 'target_turns', 'targetTurns')
  const continuation = getObject(raw, 'continuation_moves', 'continuationMoves')
  const dramaticTurn = getObject(raw, 'continuation_dramatic_turn', 'continuationDramaticTurn')
  const continuationMoves =
    Object.keys(continuation).length > 0
      ? {
          priorChapterMeaning: stringField(continuation, 'prior_chapter_meaning', 'priorChapterMeaning'),
          largerPatternRevealed: stringField(continuation, 'larger_pattern_revealed', 'largerPatternRevealed'),
          institutionalScaleEscalation: {
            from: stringField(getObject(continuation, 'institutional_scale_escalation', 'institutionalScaleEscalation'), 'from'),
            to: stringField(getObject(continuation, 'institutional_scale_escalation', 'institutionalScaleEscalation'), 'to'),
          },
          newNamedThreatFromPriorSuccess: {
            name: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'name'),
            emergedFrom: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'emerged_from', 'emergedFrom'),
            whyInevitable: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'why_inevitable', 'whyInevitable'),
          },
          worsenedExistingThread: {
            threadId: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'thread_id', 'threadId'),
            priorSmallDetail: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'prior_small_detail', 'priorSmallDetail'),
            whyLoadBearingNow: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'why_load_bearing_now', 'whyLoadBearingNow'),
          },
          plantedMidchapterRevelation: {
            hiddenStatement: stringField(getObject(continuation, 'planted_midchapter_revelation', 'plantedMidchapterRevelation'), 'hidden_statement', 'hiddenStatement'),
            recontextualizes: stringField(getObject(continuation, 'planted_midchapter_revelation', 'plantedMidchapterRevelation'), 'recontextualizes'),
          },
          relationshipDeepeningTarget: Object.keys(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget')).length > 0
            ? {
                entityId: stringField(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget'), 'entity_id', 'entityId'),
                pressure: stringField(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget'), 'pressure'),
              }
            : undefined,
        }
      : undefined
  const continuationDramaticTurn =
    Object.keys(dramaticTurn).length > 0
      ? {
          priorChapterMeant: stringField(dramaticTurn, 'prior_chapter_meant', 'priorChapterMeant'),
          largerPatternRevealed: stringField(dramaticTurn, 'larger_pattern_revealed', 'largerPatternRevealed'),
          pressureOwner: {
            idOrNewBridge: stringField(getObject(dramaticTurn, 'pressure_owner', 'pressureOwner'), 'id_or_new_bridge', 'idOrNewBridge'),
            whyTheyNowAct: stringField(getObject(dramaticTurn, 'pressure_owner', 'pressureOwner'), 'why_they_now_act', 'whyTheyNowAct'),
          },
          humanLeverage: {
            whatTheyCanTakeOrOffer: stringField(getObject(dramaticTurn, 'human_leverage', 'humanLeverage'), 'what_they_can_take_or_offer', 'whatTheyCanTakeOrOffer'),
            whatTheyNeedFromPc: stringField(getObject(dramaticTurn, 'human_leverage', 'humanLeverage'), 'what_they_need_from_pc', 'whatTheyNeedFromPc'),
          },
          worsenedDetail: {
            priorDetail: stringField(getObject(dramaticTurn, 'worsened_detail', 'worsenedDetail'), 'prior_detail', 'priorDetail'),
            whyItIsLoadBearingNow: stringField(getObject(dramaticTurn, 'worsened_detail', 'worsenedDetail'), 'why_it_is_load_bearing_now', 'whyItIsLoadBearingNow'),
          },
          offscreenAntagonistPresence: stringField(dramaticTurn, 'offscreen_antagonist_presence', 'offscreenAntagonistPresence'),
          procedureBudget: {
            mechanism: stringField(getObject(dramaticTurn, 'procedure_budget', 'procedureBudget'), 'mechanism'),
            ownerUsingIt: stringField(getObject(dramaticTurn, 'procedure_budget', 'procedureBudget'), 'owner_using_it', 'ownerUsingIt'),
            dramaticFunction: stringField(getObject(dramaticTurn, 'procedure_budget', 'procedureBudget'), 'dramatic_function', 'dramaticFunction'),
            maxOpeningBeats: normalizeMaxOpeningBeats(
              valueField(getObject(dramaticTurn, 'procedure_budget', 'procedureBudget'), 'max_opening_beats', 'maxOpeningBeats')
            ),
          },
        }
      : undefined

  return {
    chapterFrame: {
      title: stringField(frame, 'title'),
      premise: stringField(frame, 'premise'),
      activePressure: stringField(frame, 'active_pressure', 'activePressure'),
      centralTension: stringField(frame, 'central_tension', 'centralTension'),
      objective: stringField(frame, 'objective'),
      crucible: stringField(frame, 'crucible'),
      outcomeSpectrum: valueField(frame, 'outcome_spectrum', 'outcomeSpectrum') as AuthorChapterSetupV2['chapterFrame']['outcomeSpectrum'],
    },
    antagonistField: {
      sourceFactionId: sourceFactionId || undefined,
      sourceFactionLabel: sourceFactionLabel || legacySourceSystem || undefined,
      corePressure: stringField(antag, 'core_pressure', 'corePressure'),
      defaultFace: {
        name: stringField(defaultFace, 'name'),
        role: stringField(defaultFace, 'role'),
        pressureStyle: stringField(defaultFace, 'pressure_style', 'pressureStyle'),
      },
      possibleFaces: possibleFacesRaw.map((f) => ({
        id: stringField(f, 'id'),
        name: stringField(f, 'name'),
        role: stringField(f, 'role'),
        becomesPrimaryWhen: stringField(f, 'becomes_primary_when', 'becomesPrimaryWhen'),
        pressureStyle: stringField(f, 'pressure_style', 'pressureStyle'),
      })),
      escalationLogic: stringField(antag, 'escalation_logic', 'escalationLogic'),
    },
    startingNPCs: getArray(raw, 'starting_npcs', 'startingNPCs').map((n) => ({
      id: stringField(n, 'id'),
      name: stringField(n, 'name'),
      affiliation: stringField(n, 'affiliation'),
      role: stringField(n, 'role'),
      voiceRegister: stringField(n, 'voice_register', 'voiceRegister'),
      voiceNote: stringField(n, 'voice_note', 'voiceNote') || undefined,
      dramaticFunction: stringField(n, 'dramatic_function', 'dramaticFunction'),
      hiddenPressure: stringField(n, 'hidden_pressure', 'hiddenPressure'),
      retrievalCue: stringField(n, 'retrieval_cue', 'retrievalCue'),
      initialDisposition: (valueField(n, 'initial_disposition', 'initialDisposition') as AuthorChapterSetupV2['startingNPCs'][number]['initialDisposition']) ?? 'neutral',
      dispositionReason: stringField(n, 'disposition_reason', 'dispositionReason'),
    })),
    activeThreads: getArray(raw, 'active_threads', 'activeThreads').map((t) => ({
      id: stringField(t, 'id'),
      title: stringField(t, 'title'),
      question: stringField(t, 'question'),
      ownerHint: stringField(t, 'owner_hint', 'ownerHint'),
      tension: Number(valueField(t, 'tension') ?? 5),
      initialTension: optionalBoundedTension(valueField(t, 'initial_tension', 'initialTension')),
      successorToThreadId: stringField(t, 'successor_to_thread_id', 'successorToThreadId') || undefined,
      driverKind: normalizeDriverKind(valueField(t, 'driver_kind', 'driverKind')),
      resolutionCriteria: stringField(t, 'resolution_criteria', 'resolutionCriteria'),
      resolutionGates: normalizeThreadResolutionGates(valueField(t, 'resolution_gates', 'resolutionGates')),
      failureMode: stringField(t, 'failure_mode', 'failureMode'),
      retrievalCue: stringField(t, 'retrieval_cue', 'retrievalCue'),
    })),
    pressureLadder: getArray(raw, 'pressure_ladder', 'pressureLadder').map((s) => ({
      id: stringField(s, 'id'),
      pressure: stringField(s, 'pressure'),
      triggerKind: normalizePressureTriggerKind(getObject(s, 'trigger_event', 'triggerEvent')),
      triggerCondition: canonicalPressureTriggerCondition(s),
      narrativeEffect: stringField(s, 'narrative_effect', 'narrativeEffect'),
      severity: stringField(s, 'severity') === 'hard' ? 'hard' : 'standard',
    })),
    humanStakes: getArray(raw, 'human_stakes', 'humanStakes').map((s) => ({
      whoPays: stringField(s, 'who_pays', 'whoPays') as AuthorChapterSetupV2['humanStakes'][number]['whoPays'],
      costSurface: stringField(s, 'cost_surface', 'costSurface') as Sf2HumanStakeCostSurface,
      whatIsLost: stringField(s, 'what_is_lost', 'whatIsLost'),
      triggeringPressure: stringField(s, 'triggering_pressure', 'triggeringPressure'),
    })),
    tensionScore: getArray(raw, 'tension_score', 'tensionScore').map((line) => ({
      id: stringField(line, 'id'),
      role: normalizeTensionScoreRole(valueField(line, 'role')),
      sourceEntityId: stringField(line, 'source_entity_id', 'sourceEntityId') || undefined,
      sourceThreadId: stringField(line, 'source_thread_id', 'sourceThreadId') || undefined,
      pressure: stringField(line, 'pressure'),
      proseSurface: stringField(line, 'prose_surface', 'proseSurface'),
      advancesWhen: stringField(line, 'advances_when', 'advancesWhen'),
      resolvesOrReframesWhen: stringField(line, 'resolves_or_reframes_when', 'resolvesOrReframesWhen'),
      carried: Boolean(valueField(line, 'carried')),
    })),
    possibleRevelations: getArray(raw, 'possible_revelations', 'possibleRevelations').map((r) => ({
      id: stringField(r, 'id'),
      statement: stringField(r, 'statement'),
      heldBy: stringField(r, 'held_by', 'heldBy'),
      emergenceCondition: stringField(r, 'emergence_condition', 'emergenceCondition'),
      recontextualizes: stringField(r, 'recontextualizes'),
      hintPhrases: stringArray(r, 'hint_phrases', 'hintPhrases'),
      playerTopicKeys: stringArray(r, 'player_topic_keys', 'playerTopicKeys'),
      cashConditions: normalizeRevelationCashConditions(
        getObject(r, 'cash_conditions', 'cashConditions')
      ),
      hintsRequired: optionalPositiveInt(valueField(r, 'hints_required', 'hintsRequired')),
      validRevealContexts: revealContextArray(r, 'valid_reveal_contexts', 'validRevealContexts'),
      invalidRevealContexts: revealContextArray(r, 'invalid_reveal_contexts', 'invalidRevealContexts'),
    })),
    moralFaultLines: getArray(raw, 'moral_fault_lines', 'moralFaultLines').map((m) => ({
      id: stringField(m, 'id'),
      tension: stringField(m, 'tension'),
      sideA: stringField(m, 'side_a', 'sideA'),
      sideB: stringField(m, 'side_b', 'sideB'),
      whyItHurts: stringField(m, 'why_it_hurts', 'whyItHurts'),
    })),
    escalationOptions: getArray(raw, 'escalation_options', 'escalationOptions').map((e) => ({
      id: stringField(e, 'id'),
      type: (valueField(e, 'type') ?? 'institutional') as AuthorChapterSetupV2['escalationOptions'][number]['type'],
      condition: stringField(e, 'condition'),
      consequence: stringField(e, 'consequence'),
    })),
    editorializedLore: getArray(raw, 'editorialized_lore', 'editorializedLore').map((l) => ({
      item: stringField(l, 'item'),
      relevanceNow: stringField(l, 'relevance_now', 'relevanceNow'),
      deliveryMethod: stringField(l, 'delivery_method', 'deliveryMethod'),
    })),
    arcLink: {
      arcId: stringField(arcLink, 'arc_id', 'arcId'),
      chapterFunction: stringField(arcLink, 'chapter_function', 'chapterFunction'),
      playerStanceRead: stringField(arcLink, 'player_stance_read', 'playerStanceRead'),
      arcThreadIds: stringArray(arcLink, 'arc_thread_ids', 'arcThreadIds').length > 0
        ? stringArray(arcLink, 'arc_thread_ids', 'arcThreadIds')
        : stringArray(arcLink, 'pressure_engine_ids', 'pressureEngineIds'),
      promotedLatentQuestionIds: stringArray(arcLink, 'promoted_latent_question_ids', 'promotedLatentQuestionIds'),
    },
    pacingContract: {
      targetTurns: {
        min: Number(valueField(targetTurns, 'min') ?? 18),
        max: Number(valueField(targetTurns, 'max') ?? 25),
      },
      chapterQuestion: stringField(pacing, 'chapter_question', 'chapterQuestion'),
      acceptableResolutions: stringArray(pacing, 'acceptable_resolutions', 'acceptableResolutions'),
      earlyPressure: stringField(pacing, 'early_pressure', 'earlyPressure'),
      middlePressure: stringField(pacing, 'middle_pressure', 'middlePressure'),
      latePressure: stringField(pacing, 'late_pressure', 'latePressure'),
      closeWhenAny: stringArray(pacing, 'close_when_any', 'closeWhenAny'),
      avoidExtendingFor: stringArray(pacing, 'avoid_extending_for', 'avoidExtendingFor'),
    },
    continuationMoves,
    continuationDramaticTurn,
    threadTransitions: getArray(raw, 'thread_transitions', 'threadTransitions').length > 0
      ? getArray(raw, 'thread_transitions', 'threadTransitions').map((t) => ({
          id: stringField(t, 'id'),
          toStatus: stringField(t, 'to_status', 'toStatus') as Sf2ThreadStatus,
          reason: stringField(t, 'reason'),
        }))
      : undefined,
    openingSceneSpec: {
      location: stringField(opening, 'location'),
      atmosphericCondition: stringField(opening, 'atmospheric_condition', 'atmosphericCondition'),
      initialState: stringField(opening, 'initial_state', 'initialState'),
      firstPlayerFacing: stringField(opening, 'first_player_facing', 'firstPlayerFacing'),
      dramaticSituation: stringField(opening, 'dramatic_situation', 'dramaticSituation') || undefined,
      firstVisiblePressure: stringField(opening, 'first_visible_pressure', 'firstVisiblePressure') || undefined,
      firstHumanOrInstitutionalMove: stringField(opening, 'first_human_or_institutional_move', 'firstHumanOrInstitutionalMove') || undefined,
      doNotRestage: stringArray(opening, 'do_not_restage', 'doNotRestage'),
      noStartingCombat: Boolean(valueField(opening, 'no_starting_combat', 'noStartingCombat')),
      noExpositionDump: Boolean(valueField(opening, 'no_exposition_dump', 'noExpositionDump')),
      visibleNpcIds: Array.isArray(valueField(opening, 'visible_npc_ids', 'visibleNpcIds'))
        ? (valueField(opening, 'visible_npc_ids', 'visibleNpcIds') as unknown[]).map(String).filter((s) => s.length > 0)
        : undefined,
      withheldPremiseFacts: Array.isArray(valueField(opening, 'withheld_premise_facts', 'withheldPremiseFacts'))
        ? (valueField(opening, 'withheld_premise_facts', 'withheldPremiseFacts') as unknown[]).map(String).filter((s) => s.length > 0)
        : undefined,
    },
  }
}

export function completeAuthorSetupForValidation(
  authored: AuthorChapterSetupV2,
  opts: AuthorSetupValidationOptions = { isContinuation: false }
): AuthorChapterSetupV2 {
  let completed = authored
  const transitions = [...(authored.threadTransitions ?? [])]
  let transitionsChanged = false

  if (opts.isContinuation && opts.state) {
    for (const thread of authored.activeThreads) {
      if (thread.driverKind !== 'successor') continue
      const predecessorId = thread.successorToThreadId?.trim()
      if (!predecessorId) continue

      const predecessor = opts.state.campaign.threads[predecessorId]
      if (!predecessor || isThreadTerminal(predecessor.status)) continue

      const existingIndex = transitions.findIndex((transition) => transition.id === predecessorId)
      const existingStatus = existingIndex >= 0 ? transitions[existingIndex]?.toStatus : undefined
      if (existingStatus && isThreadTerminal(existingStatus)) continue

      const terminalTransition = {
        id: predecessorId,
        toStatus: terminalStatusForChapterClose(opts.state.chapter.artifacts.meaning?.closingResolution),
        reason: `Chapter ${opts.state.meta.currentChapter + 1} opened ${thread.id} as successor to ${predecessorId}.`,
      }
      if (existingIndex >= 0) transitions[existingIndex] = terminalTransition
      else transitions.push(terminalTransition)
      transitionsChanged = true
    }
  }

  if (transitionsChanged) {
    completed = { ...completed, threadTransitions: transitions }
  }

  const residue = opts.state?.chapter.artifacts.meaning?.transitionSeed?.procedureResidue
  const budget = completed.continuationDramaticTurn?.procedureBudget
  if (
    opts.isContinuation &&
    residue?.keepAs === 'leverage' &&
    residue.mechanism.trim() &&
    budget &&
    budget.ownerUsingIt.trim() &&
    budget.ownerUsingIt.trim().toLowerCase() !== PROCEDURE_NONE
  ) {
    const budgetText = [budget.mechanism, budget.ownerUsingIt, budget.dramaticFunction].join('\n')
    if (!hasMeaningfulOverlap(residue.mechanism, budgetText)) {
      completed = {
        ...completed,
        continuationDramaticTurn: {
          ...completed.continuationDramaticTurn!,
          procedureBudget: {
            ...budget,
            mechanism: residue.mechanism,
          },
        },
      }
    }
  }

  return completed
}

// Final boundary validation on the normalized single-call AuthorChapterSetupV2.
export function validateAuthorSetup(
  authoredInput: AuthorChapterSetupV2,
  opts: AuthorSetupValidationOptions = { isContinuation: false }
): string[] {
  const authored = completeAuthorSetupForValidation(authoredInput, opts)
  const errors: string[] = []
  const requiredOpeningStrings: Array<keyof AuthorChapterSetupV2['openingSceneSpec']> = [
    'location',
    'atmosphericCondition',
    'initialState',
    'firstPlayerFacing',
  ]
  for (const key of requiredOpeningStrings) {
    const value = authored.openingSceneSpec[key]
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`opening_scene_spec.${String(key)} is empty`)
    }
  }
  if (!authored.chapterFrame.title.trim()) errors.push('chapter_frame.title is empty')
  if (!authored.chapterFrame.premise.trim()) errors.push('chapter_frame.premise is empty')

  const spectrum = authored.chapterFrame.outcomeSpectrum as unknown as Record<string, unknown> | undefined
  if (!spectrum || typeof spectrum !== 'object') {
    errors.push('chapter_frame.outcome_spectrum is missing')
  } else {
    for (const key of ['clean', 'costly', 'failure', 'catastrophic']) {
      const value = spectrum[key]
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`chapter_frame.outcome_spectrum.${key} is empty`)
      } else if (!hasHumanOutcomeAnchor(value)) {
        errors.push(`chapter_frame.outcome_spectrum.${key} must name a human consequence, named entity, or relationship/cost`)
      }
    }
  }

  const antag = authored.antagonistField
  if (!antag.sourceFactionId?.trim() && !antag.sourceFactionLabel?.trim()) {
    errors.push('antagonist_field must include source_faction_id or source_faction_label')
  }
  if (antag.sourceFactionId?.trim() && opts.state && !isKnownFactionSourceId(opts.state, antag.sourceFactionId)) {
    errors.push(`antagonist_field.source_faction_id ${antag.sourceFactionId} is not an existing faction`)
  }
  if (!antag.corePressure.trim()) errors.push('antagonist_field.core_pressure is empty')
  if (!antag.defaultFace.name.trim()) errors.push('antagonist_field.default_face.name is empty')

  if (authored.startingNPCs.length === 0) errors.push('starting_npcs is empty')
  const expectedThreadCount = opts.isContinuation ? 4 : 3
  if (authored.activeThreads.length !== expectedThreadCount) {
    errors.push(`active_threads must contain exactly ${expectedThreadCount} threads (got ${authored.activeThreads.length})`)
  }
  let continuationDriverCount = 0
  const transitionStatuses = new Map(
    (authored.threadTransitions ?? []).map((t) => [t.id, t.toStatus])
  )
  const transitionIds = new Set<string>()
  authored.threadTransitions?.forEach((transition, i) => {
    const id = transition.id.trim()
    if (!id) return
    if (transitionIds.has(id)) errors.push(`thread_transitions[${i}].id ${id} duplicates an earlier transition`)
    transitionIds.add(id)
  })
  authored.activeThreads.forEach((thread, i) => {
    if (thread.initialTension !== undefined && (thread.initialTension < 0 || thread.initialTension > CHAPTER_OPEN_CAP)) {
      errors.push(`active_threads[${i}].initial_tension must be between 0 and ${CHAPTER_OPEN_CAP}`)
    }
    if (opts.isContinuation) {
      const existing = opts.state?.campaign?.threads?.[thread.id]
      if (existing && isThreadTerminal(existing.status)) {
        errors.push(`active_threads[${i}].id ${thread.id} is already terminal (${existing.status}); transition it and author a successor instead`)
      }
      if (!thread.driverKind) errors.push(`active_threads[${i}].driver_kind is required for chapter ≥ 2`)
      if (thread.driverKind === 'successor' && !thread.successorToThreadId?.trim()) {
        errors.push(`active_threads[${i}].successor_to_thread_id is required for successor threads`)
      } else if (thread.driverKind === 'successor') {
        const successorTo = thread.successorToThreadId ?? ''
        const predecessor = opts.state?.campaign?.threads?.[successorTo]
        if (!predecessor) {
          errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} is not an existing thread`)
        } else if (successorTo === thread.id) {
          errors.push(`active_threads[${i}].successor_to_thread_id cannot point to itself`)
        } else {
          const transitionStatus = transitionStatuses.get(successorTo)
          const terminalByState = isThreadTerminal(predecessor.status)
          const terminalByTransition = transitionStatus ? isThreadTerminal(transitionStatus) : false
          if (!terminalByState && !terminalByTransition) {
            errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} must be terminal already or terminal in thread_transitions`)
          }
        }
      }
      if (thread.driverKind === 'successor' || thread.driverKind === 'new_pressure' || thread.driverKind === 'arc_promoted') {
        continuationDriverCount += 1
        if (thread.tension < 6) errors.push(`active_threads[${i}] new/successor/arc_promoted driver must be load-bearing tension ≥6`)
      }
    }
  })
  if (opts.isContinuation && continuationDriverCount < 1) {
    errors.push('active_threads must include at least 1 successor, new_pressure, or arc_promoted driver for chapter ≥ 2')
  }
  if (!authored.arcLink.arcId.trim()) errors.push('arc_link.arc_id is empty')
  if (!authored.arcLink.chapterFunction.trim()) errors.push('arc_link.chapter_function is empty')
  if (opts.state) {
    errors.push(...validateArcThreadAndLatentPromotion(authored, opts.state))
  }
  if (!authored.pacingContract.chapterQuestion.trim()) errors.push('pacing_contract.chapter_question is empty')
  if (
    authored.pacingContract.targetTurns.min < 12 ||
    authored.pacingContract.targetTurns.max > 30 ||
    authored.pacingContract.targetTurns.max < authored.pacingContract.targetTurns.min
  ) {
    errors.push('pacing_contract.target_turns is invalid')
  }
  errors.push(...validatePressureLadderDiscipline(authored))
  errors.push(...validateHumanStakes(authored, opts.state))

  const tensionScoreState = opts.isContinuation && opts.state && isSf2bState(opts.state)
    ? opts.state
    : null
  if (tensionScoreState) {
    if (!authored.tensionScore || authored.tensionScore.length < 3 || authored.tensionScore.length > 4) {
      errors.push(`tension_score must contain 3-4 lines for SF2B continuation chapters (got ${authored.tensionScore?.length ?? 0})`)
    } else {
      const roles = new Set(authored.tensionScore.map((line) => line.role))
      if (!roles.has('foreground_objective')) errors.push('tension_score must include foreground_objective')
      if (!roles.has('relational_social_pressure')) errors.push('tension_score must include relational_social_pressure')
      if (!roles.has('shadow_faction_pressure')) errors.push('tension_score must include shadow_faction_pressure')
      authored.tensionScore.forEach((line, i) => {
        if (!line.sourceEntityId?.trim() && !line.sourceThreadId?.trim()) {
          errors.push(`tension_score[${i}] must include source_entity_id or source_thread_id`)
        }
        if (!line.pressure.trim()) errors.push(`tension_score[${i}].pressure is empty`)
        if (!line.proseSurface.trim()) errors.push(`tension_score[${i}].prose_surface is empty`)
        if (!line.advancesWhen.trim()) errors.push(`tension_score[${i}].advances_when is empty`)
        if (!line.resolvesOrReframesWhen.trim()) errors.push(`tension_score[${i}].resolves_or_reframes_when is empty`)
      })
    }
    errors.push(...validateSf2bContinuityLockUsage(authored, deriveSf2bContinuityLock(tensionScoreState)))
  }

  // Continuation Chapter Law enforcement (chapter ≥ 2 only). The five-move
  // discipline lives in SF2_AUTHOR_ROLE; validation here makes it load-bearing.
  if (opts.isContinuation) {
    const cm = authored.continuationMoves
    if (!cm) {
      errors.push('continuation_moves is missing (required for chapter ≥ 2)')
    } else {
      if (!cm.priorChapterMeaning?.trim()) errors.push('continuation_moves.prior_chapter_meaning is empty')
      if (!cm.largerPatternRevealed?.trim()) errors.push('continuation_moves.larger_pattern_revealed is empty')
      if (!cm.institutionalScaleEscalation?.from?.trim() || !cm.institutionalScaleEscalation?.to?.trim()) {
        errors.push('continuation_moves.institutional_scale_escalation requires both from and to')
      }
      if (!cm.newNamedThreatFromPriorSuccess?.name?.trim() || !cm.newNamedThreatFromPriorSuccess?.emergedFrom?.trim()) {
        errors.push('continuation_moves.new_named_threat_from_prior_success requires name and emerged_from')
      }
      if (!cm.worsenedExistingThread?.threadId?.trim() || !cm.worsenedExistingThread?.priorSmallDetail?.trim()) {
        errors.push('continuation_moves.worsened_existing_thread requires thread_id and prior_small_detail')
      }
      if (!cm.plantedMidchapterRevelation?.hiddenStatement?.trim()) {
        errors.push('continuation_moves.planted_midchapter_revelation.hidden_statement is empty')
      }
    }
    errors.push(...validateContinuationDramaticTurn(authored))
    errors.push(...validateContinuationOpeningLocationBridge(authored, opts.state))
    errors.push(...validateProcedureGravity(authored, opts.state?.meta.genreId))
    if (opts.state?.chapter?.artifacts?.meaning?.transitionSeed) {
      errors.push(...validateTransitionSeedHonored(authored, opts.state.chapter.artifacts.meaning.transitionSeed))
    }
  }

  return errors
}

export function validateAuthorSetupWarnings(
  authoredInput: AuthorChapterSetupV2,
  opts: AuthorSetupValidationOptions = { isContinuation: false }
): string[] {
  const authored = completeAuthorSetupForValidation(authoredInput, opts)
  const warnings: string[] = []

  if (opts.isContinuation) {
    warnings.push(...warnContinuationPressureLaneClustering(authored))
  }

  return uniqueErrors(warnings)
}

function validateContinuationOpeningLocationBridge(
  authored: AuthorChapterSetupV2,
  state?: Sf2State
): string[] {
  if (!state) return []

  const closingLocation = state.world.sceneSnapshot.location
  const closingTerms = importantLocationTerms(closingLocation.name, closingLocation.id)
  if (closingTerms.length === 0) return []

  const openingText = [
    authored.openingSceneSpec.location,
    authored.openingSceneSpec.initialState,
    authored.openingSceneSpec.firstPlayerFacing,
    authored.openingSceneSpec.dramaticSituation,
    authored.openingSceneSpec.firstVisiblePressure,
    authored.openingSceneSpec.firstHumanOrInstitutionalMove,
  ].filter(Boolean).join('\n')

  if (mentionsAnyTerm(openingText, closingTerms)) return []
  if (hasLocationBridgeLanguage(openingText)) return []

  return [
    `opening_scene_spec.location must bridge from prior closing location ${closingLocation.id} (${closingLocation.name}); open there, name travel from there, or justify the jump in opening_scene_spec.initial_state/first_player_facing`,
  ]
}

function warnContinuationPressureLaneClustering(authored: AuthorChapterSetupV2): string[] {
  const lanes = authored.activeThreads.map(classifyPressureLane)
  const laneCounts = new Map<string, number>()
  for (const lane of lanes) laneCounts.set(lane, (laneCounts.get(lane) ?? 0) + 1)

  const dominant = [...laneCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!dominant || dominant[1] < 3 || lanes.length < 4) return []

  return [
    `active_threads cluster in the ${dominant[0]} lane (${dominant[1]}/${lanes.length}); continuation chapters should distribute pressure across foreground objective, relational/social cost, and shadow faction/institution pressure`,
  ]
}

function classifyPressureLane(thread: AuthorChapterSetupV2['activeThreads'][number]): string {
  const text = [
    thread.title,
    thread.question,
    thread.ownerHint,
    thread.resolutionCriteria,
    thread.failureMode,
    thread.retrievalCue,
  ].join(' ')

  if (/\b(friend|ally|trust|loyal|relationship|promise|contact|family|crew|companion|reputation|standing|owed|debt|betray|protect|safety|freedom)\b/i.test(text)) {
    return 'relational_social_pressure'
  }
  if (/\b(faction|institution|authority|regime|guild|house|court|imperial|corporate|syndicate|watch|police|ministry|hegemony|church|cabal|rival)\b/i.test(text)) {
    return 'shadow_faction_pressure'
  }
  if (/\b(cargo|system|engine|ship|route|environment|storm|radiation|weather|terrain|procedure|audit|record|queue|permit|clearance|gate|lock|timer)\b/i.test(text)) {
    return 'environmental_or_system_pressure'
  }
  return 'foreground_objective'
}

function canCompleteSuccessorTransition(ctx: AuthorRawValidationContext, predecessorId: string): boolean {
  if (!ctx.isContinuation || !ctx.state) return false
  const predecessor = ctx.state.campaign.threads[predecessorId]
  return Boolean(predecessor && !isThreadTerminal(predecessor.status))
}

function terminalStatusForChapterClose(
  closingResolution: NonNullable<Sf2State['chapter']['artifacts']['meaning']>['closingResolution'] | undefined
): Sf2ThreadStatus {
  switch (closingResolution) {
    case 'clean':
      return 'resolved_clean'
    case 'failure':
      return 'resolved_failure'
    case 'catastrophic':
      return 'resolved_catastrophic'
    case 'costly':
    case 'unresolved':
    default:
      return 'resolved_costly'
  }
}

function validatePressureLadderDiscipline(authored: AuthorChapterSetupV2): string[] {
  const errors: string[] = []
  const ladder = authored.pressureLadder
  if (ladder.length > 0 && !ladder.some((step) => step.severity === 'hard')) {
    errors.push('pressure_ladder must include at least one hard-severity rung')
  }

  ladder.forEach((step, i) => {
    const trigger = step.triggerCondition ?? ''
    if (!trigger.trim()) {
      errors.push(`pressure_ladder[${i}].trigger_condition is empty`)
      return
    }
    if (step.triggerKind !== 'location_objective' && isSceneCoupledPressureTrigger(trigger)) {
      errors.push(`pressure_ladder[${i}].trigger_condition is scene-coupled; bind it to an entity-level action instead`)
    }
  })
  return errors
}

function validateRawPressureTriggerEvent(step: Record<string, unknown>, index: number): string[] {
  const event = getObject(step, 'trigger_event', 'triggerEvent')
  if (Object.keys(event).length === 0) return []

  const errors: string[] = []
  const kind = stringField(event, 'kind')
  const actor = stringField(event, 'actor_id', 'actorId').trim()
  const target = stringField(event, 'target_id', 'targetId').trim()
  const action = stringField(event, 'action').trim()
  const location = stringField(event, 'location_id', 'locationId').trim()
  const stakes = stringField(event, 'stakes').trim()

  if (!PRESSURE_TRIGGER_KINDS.has(kind as PressureTriggerKind)) {
    errors.push(`pressure_ladder[${index}].trigger_event.kind is invalid`)
  }
  for (const [field, value] of [
    ['actor_id', actor],
    ['action', action],
    ['target_id', target],
    ['stakes', stakes],
  ] as const) {
    if (!value) errors.push(`pressure_ladder[${index}].trigger_event.${field} is empty`)
  }
  if (kind === 'location_objective') {
    if (!location) errors.push(`pressure_ladder[${index}].trigger_event.location_id is required for location_objective`)
  } else if (location) {
    errors.push(`pressure_ladder[${index}].trigger_event.location_id is only valid for location_objective`)
  }
  if (kind === 'entity_action') {
    for (const [field, value] of [
      ['actor_id', actor],
      ['target_id', target],
      ['stakes', stakes],
    ] as const) {
      if (isSceneObjectLabel(value) || isSceneCoupledPressureTrigger(value)) {
        errors.push(`pressure_ladder[${index}].trigger_event.${field} is scene-coupled; use location_objective only for durable location objectives`)
      }
    }
  }
  return errors
}

function canonicalPressureTriggerCondition(step: Record<string, unknown>): string {
  const structured = renderPressureTriggerEventCondition(getObject(step, 'trigger_event', 'triggerEvent'))
  return structured || stringField(step, 'trigger_condition', 'triggerCondition')
}

function renderPressureTriggerEventCondition(event: Record<string, unknown>): string {
  if (Object.keys(event).length === 0) return ''

  const kind = normalizePressureTriggerKind(event)
  const actor = cleanTriggerLabel(stringField(event, 'actor_id', 'actorId'))
  const target = cleanTriggerLabel(stringField(event, 'target_id', 'targetId'))
  const action = stringField(event, 'action')
  const stakes = cleanTriggerStakes(stringField(event, 'stakes'))

  if (!actor || !target || !action) return ''

  if (kind === 'late_unresolved' || action === 'late_chapter_unresolved') {
    return `When ${target} remains unresolved late and ${actor} uses that delay to raise the cost.`
  }

  if (kind === 'location_objective') {
    const location = cleanTriggerLabel(stringField(event, 'location_id', 'locationId'))
    if (!location) return ''
    const phrase = LOCATION_OBJECTIVE_ACTION_PHRASES[action] ?? action.replace(/_/g, ' ')
    const consequence = stakes ? `, making ${stakes}` : ''
    return `When ${actor} ${phrase} ${target} at ${location}${consequence}.`
  }

  const phrase = PRESSURE_TRIGGER_ACTION_PHRASES[action] ?? action.replace(/_/g, ' ')
  const consequence = stakes ? `, making ${stakes}` : ''
  return `When ${actor} ${phrase} ${target}${consequence}.`
}

type PressureTriggerKind = NonNullable<AuthorChapterSetupV2['pressureLadder'][number]['triggerKind']>

const PRESSURE_TRIGGER_KINDS = new Set<PressureTriggerKind>([
  'entity_action',
  'location_objective',
  'late_unresolved',
])

function normalizePressureTriggerKind(event: Record<string, unknown>): PressureTriggerKind | undefined {
  const kind = stringField(event, 'kind')
  return PRESSURE_TRIGGER_KINDS.has(kind as PressureTriggerKind)
    ? (kind as PressureTriggerKind)
    : undefined
}

const PRESSURE_TRIGGER_ACTION_PHRASES: Record<string, string> = {
  refuses: 'refuses',
  demands_cost_from: 'demands a cost from',
  exposes: 'exposes',
  betrays: 'betrays',
  protects: 'protects',
  threatens: 'threatens',
  calls_in_debt_from: 'calls in a debt from',
  withholds: 'withholds help from',
  commits_against: 'commits against',
  escalates_authority_over: 'escalates authority over',
  forces_choice_on: 'forces an irreversible choice on',
}

const LOCATION_OBJECTIVE_ACTION_PHRASES: Record<string, string> = {
  retrieves_from: 'retrieves',
  secures_at: 'secures',
  delivers_to: 'delivers',
  removes_from: 'removes',
}

function cleanTriggerLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function cleanTriggerStakes(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ')
  return cleaned && !isSceneCoupledPressureTrigger(cleaned)
    ? cleaned
    : 'the human cost visible'
}

function isSceneCoupledPressureTrigger(value: string): boolean {
  return (
    SCENE_PREPOSITION_RE.test(value) ||
    SCENE_OBJECT_ACTION_RE.test(value) ||
    EXPLICIT_SCENE_ELEMENT_RE.test(value)
  )
}

function isSceneObjectLabel(value: string): boolean {
  return SCENE_ELEMENT_LABEL_RE.test(value.trim())
}

function hasHumanOutcomeAnchor(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (OUTCOME_HUMAN_ANCHOR_RE.test(trimmed)) return true
  if (PROCEDURAL_ONLY_OUTCOME_RE.test(trimmed)) return false
  return /\b[A-Z][a-z][A-Za-z'-]{2,}\b/.test(trimmed)
}

function validateRawHumanStakes(
  raw: Record<string, unknown>,
  threads: Record<string, unknown>[],
  npcs: Record<string, unknown>[],
  state?: Sf2State
): string[] {
  const errors: string[] = []
  const stakes = getArray(raw, 'human_stakes', 'humanStakes')
  if (stakes.length < 2 || stakes.length > 3) {
    errors.push(`human_stakes must contain 2-3 stakes (got ${stakes.length})`)
    return errors
  }
  const startingNpcIds = new Set(npcs.map((n) => stringField(n, 'id')).filter(Boolean))
  const pressureIds = new Set(threads.map((t) => stringField(t, 'id')).filter(Boolean))
  let externalStakeCount = 0
  stakes.forEach((stake, i) => {
    const whoPays = stringField(stake, 'who_pays', 'whoPays')
    const costSurface = stringField(stake, 'cost_surface', 'costSurface')
    const whatIsLost = stringField(stake, 'what_is_lost', 'whatIsLost')
    const triggeringPressure = stringField(stake, 'triggering_pressure', 'triggeringPressure')
    if (startingNpcIds.has(whoPays)) externalStakeCount += 1
    if (whoPays !== 'the PC' && !startingNpcIds.has(whoPays)) {
      errors.push(`human_stakes[${i}].who_pays must be "the PC" or a starting_npcs id`)
    }
    if (!SF2_HUMAN_STAKE_COST_SURFACES.includes(costSurface as Sf2HumanStakeCostSurface)) {
      errors.push(`human_stakes[${i}].cost_surface is invalid`)
    }
    if (!whatIsLost.trim()) errors.push(`human_stakes[${i}].what_is_lost is empty`)
    if (!pressureIds.has(triggeringPressure)) {
      errors.push(`human_stakes[${i}].triggering_pressure must reference an active_threads id`)
    }
  })
  if (externalStakeCount < 1) errors.push('human_stakes must include at least one starting_npcs id as who_pays')
  return errors
}

function isKnownFactionSourceId(state: Sf2State, id: string): boolean {
  if (state.campaign.factions[id]) return true
  return Boolean(state.campaign.arcPlan?.durableForces.some((force) => force.id === id))
}

function validateHumanStakes(authored: AuthorChapterSetupV2, state?: Sf2State): string[] {
  const errors: string[] = []
  const stakes = authored.humanStakes ?? []
  if (stakes.length < 2 || stakes.length > 3) {
    errors.push(`human_stakes must contain 2-3 stakes (got ${stakes.length})`)
    return errors
  }
  const startingNpcIds = new Set(authored.startingNPCs.map((n) => n.id))
  const pressureIds = new Set(authored.activeThreads.map((t) => t.id))
  let externalStakeCount = 0
  stakes.forEach((stake, i) => {
    if (startingNpcIds.has(stake.whoPays)) externalStakeCount += 1
    if (stake.whoPays !== 'the PC' && !startingNpcIds.has(stake.whoPays)) {
      errors.push(`human_stakes[${i}].who_pays must be "the PC" or a starting_npcs id`)
    }
    if (!SF2_HUMAN_STAKE_COST_SURFACES.includes(stake.costSurface)) {
      errors.push(`human_stakes[${i}].cost_surface is invalid`)
    }
    if (!stake.whatIsLost.trim()) errors.push(`human_stakes[${i}].what_is_lost is empty`)
    if (!pressureIds.has(stake.triggeringPressure)) {
      errors.push(`human_stakes[${i}].triggering_pressure must reference an active thread`)
    }
  })
  if (externalStakeCount < 1) errors.push('human_stakes must include at least one starting_npcs id as who_pays')
  return errors
}

function validateArcThreadAndLatentPromotion(
  authored: AuthorChapterSetupV2,
  state: Sf2State
): string[] {
  const errors: string[] = []
  const arcPlan = state.campaign.arcPlan
  if (!arcPlan || arcPlan.id !== authored.arcLink.arcId) return errors
  const targetChapter = state.history.turns.length > 0 ? state.meta.currentChapter + 1 : 1
  const activeThreadIds = new Set(authored.activeThreads.map((thread) => thread.id))
  const arcThreadIds = new Set(arcPlan.arcThreadIds ?? [])
  const openLatentIds = new Set(
    (arcPlan.latentArcQuestions ?? [])
      .filter((question) => question.status === 'open')
      .map((question) => question.id) ?? []
  )

  authored.activeThreads.forEach((thread, index) => {
    if (thread.driverKind !== 'arc_promoted') return
    const existing = state.campaign.threads[thread.id]
    if (!existing || !arcThreadIds.has(thread.id)) {
      errors.push(`active_threads[${index}].driver_kind arc_promoted must reuse a deferred arc thread id`)
    } else if (existing.status !== 'deferred' && existing.status !== 'active') {
      errors.push(`active_threads[${index}].driver_kind arc_promoted cannot promote ${existing.status} thread ${thread.id}`)
    }
  })

  authored.arcLink.arcThreadIds.forEach((id, index) => {
    if (!arcThreadIds.has(id)) errors.push(`arc_link.arc_thread_ids[${index}] ${id} is not an arc thread id`)
    if (!activeThreadIds.has(id)) errors.push(`arc_link.arc_thread_ids[${index}] ${id} must also be in active_threads`)
  })

  const selection = selectLatentArcQuestionsForChapter(state, targetChapter, null)
  const selectedIds = new Set(selection.candidates.map((candidate) => candidate.id))
  const promotedIds = authored.arcLink.promotedLatentQuestionIds
  promotedIds.forEach((id, index) => {
    if (!openLatentIds.has(id)) errors.push(`arc_link.promoted_latent_question_ids[${index}] ${id} is not an open latent arc question`)
    if (!selectedIds.has(id)) errors.push(`arc_link.promoted_latent_question_ids[${index}] ${id} was not selected for this chapter`)
  })
  if (selection.promotionRequired && promotedIds.length !== 1) {
    errors.push('arc_link.promoted_latent_question_ids must contain exactly 1 selected latent question when promotion is required')
  }
  if (!selection.promotionRequired && promotedIds.length > 1) {
    errors.push('arc_link.promoted_latent_question_ids must contain at most 1 latent question')
  }
  return errors
}

function validateRawContinuationDramaticTurn(raw: Record<string, unknown>): string[] {
  const errors: string[] = []
  const turn = getObject(raw, 'continuation_dramatic_turn', 'continuationDramaticTurn')
  if (Object.keys(turn).length === 0) {
    return ['continuation_dramatic_turn is missing (required for chapter ≥ 2)']
  }
  for (const key of ['prior_chapter_meant', 'larger_pattern_revealed', 'offscreen_antagonist_presence']) {
    const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
    if (!stringField(turn, key, camel).trim()) errors.push(`continuation_dramatic_turn.${key} is empty`)
  }
  const owner = getObject(turn, 'pressure_owner', 'pressureOwner')
  if (!stringField(owner, 'id_or_new_bridge', 'idOrNewBridge').trim() || !stringField(owner, 'why_they_now_act', 'whyTheyNowAct').trim()) {
    errors.push('continuation_dramatic_turn.pressure_owner requires id_or_new_bridge and why_they_now_act')
  }
  const leverage = getObject(turn, 'human_leverage', 'humanLeverage')
  if (!stringField(leverage, 'what_they_can_take_or_offer', 'whatTheyCanTakeOrOffer').trim() || !stringField(leverage, 'what_they_need_from_pc', 'whatTheyNeedFromPc').trim()) {
    errors.push('continuation_dramatic_turn.human_leverage requires what_they_can_take_or_offer and what_they_need_from_pc')
  }
  const detail = getObject(turn, 'worsened_detail', 'worsenedDetail')
  if (!stringField(detail, 'prior_detail', 'priorDetail').trim() || !stringField(detail, 'why_it_is_load_bearing_now', 'whyItIsLoadBearingNow').trim()) {
    errors.push('continuation_dramatic_turn.worsened_detail requires prior_detail and why_it_is_load_bearing_now')
  }
  const budget = getObject(turn, 'procedure_budget', 'procedureBudget')
  if (!stringField(budget, 'mechanism').trim() || !stringField(budget, 'owner_using_it', 'ownerUsingIt').trim() || !stringField(budget, 'dramatic_function', 'dramaticFunction').trim()) {
    errors.push('continuation_dramatic_turn.procedure_budget requires mechanism, owner_using_it, and dramatic_function')
  }
  if (isInvalidMaxOpeningBeats(valueField(budget, 'max_opening_beats', 'maxOpeningBeats'))) {
    errors.push('continuation_dramatic_turn.procedure_budget.max_opening_beats must be 0 or 1')
  }
  return errors
}

function validateContinuationDramaticTurn(authored: AuthorChapterSetupV2): string[] {
  const errors: string[] = []
  const turn = authored.continuationDramaticTurn
  if (!turn) {
    return ['continuation_dramatic_turn is missing (required for chapter ≥ 2)']
  }
  if (!turn.priorChapterMeant.trim()) errors.push('continuation_dramatic_turn.prior_chapter_meant is empty')
  if (!turn.largerPatternRevealed.trim()) errors.push('continuation_dramatic_turn.larger_pattern_revealed is empty')
  if (!turn.pressureOwner.idOrNewBridge.trim() || !turn.pressureOwner.whyTheyNowAct.trim()) {
    errors.push('continuation_dramatic_turn.pressure_owner requires id_or_new_bridge and why_they_now_act')
  }
  if (!turn.humanLeverage.whatTheyCanTakeOrOffer.trim() || !turn.humanLeverage.whatTheyNeedFromPc.trim()) {
    errors.push('continuation_dramatic_turn.human_leverage requires what_they_can_take_or_offer and what_they_need_from_pc')
  }
  if (!turn.worsenedDetail.priorDetail.trim() || !turn.worsenedDetail.whyItIsLoadBearingNow.trim()) {
    errors.push('continuation_dramatic_turn.worsened_detail requires prior_detail and why_it_is_load_bearing_now')
  }
  if (!turn.offscreenAntagonistPresence.trim()) errors.push('continuation_dramatic_turn.offscreen_antagonist_presence is empty')
  if (!turn.procedureBudget.mechanism.trim() || !turn.procedureBudget.ownerUsingIt.trim() || !turn.procedureBudget.dramaticFunction.trim()) {
    errors.push('continuation_dramatic_turn.procedure_budget requires mechanism, owner_using_it, and dramatic_function')
  }
  if (isInvalidMaxOpeningBeats(turn.procedureBudget.maxOpeningBeats)) {
    errors.push('continuation_dramatic_turn.procedure_budget.max_opening_beats must be 0 or 1')
  }
  const opening = authored.openingSceneSpec
  if (!opening.dramaticSituation?.trim()) errors.push('opening_scene_spec.dramatic_situation is empty for chapter ≥ 2')
  if (!opening.firstVisiblePressure?.trim()) errors.push('opening_scene_spec.first_visible_pressure is empty for chapter ≥ 2')
  if (!opening.firstHumanOrInstitutionalMove?.trim()) errors.push('opening_scene_spec.first_human_or_institutional_move is empty for chapter ≥ 2')
  if (!opening.doNotRestage || opening.doNotRestage.length === 0) {
    errors.push('opening_scene_spec.do_not_restage must list at least one prior mechanism/milestone for chapter ≥ 2')
  }
  return errors
}

function procedureGravityForGenre(genreId?: string | null): RegExp[] {
  const genrePattern = genreId ? PROCEDURE_GRAVITY_BY_GENRE[genreId] : undefined
  return genrePattern ? [BASE_PROCEDURE_GRAVITY_RE, genrePattern] : [BASE_PROCEDURE_GRAVITY_RE]
}

function validateProcedureGravity(authored: AuthorChapterSetupV2, genreId?: string | null): string[] {
  const opening = authored.openingSceneSpec
  const openingText = [
    opening.location,
    opening.atmosphericCondition,
    opening.initialState,
    opening.firstPlayerFacing,
    opening.dramaticSituation,
    opening.firstVisiblePressure,
    opening.firstHumanOrInstitutionalMove,
    authored.chapterFrame.premise,
    authored.chapterFrame.activePressure,
    authored.chapterFrame.centralTension,
  ].filter(Boolean).join('\n')
  if (!procedureGravityForGenre(genreId).some((pattern) => pattern.test(openingText))) return []

  const turn = authored.continuationDramaticTurn
  if (!turn) return []

  const budgetText = [
    turn.procedureBudget.mechanism,
    turn.procedureBudget.ownerUsingIt,
    turn.procedureBudget.dramaticFunction,
    turn.humanLeverage.whatTheyCanTakeOrOffer,
    turn.humanLeverage.whatTheyNeedFromPc,
    opening.firstHumanOrInstitutionalMove,
  ].join('\n')
  const errors: string[] = []
  if (!turn.procedureBudget.ownerUsingIt.trim() || turn.procedureBudget.ownerUsingIt.trim().toLowerCase() === PROCEDURE_NONE) {
    errors.push('procedure_gravity: procedural opener must name who uses the mechanism for leverage')
  }
  if (!turn.procedureBudget.dramaticFunction.trim() || !HUMAN_LEVERAGE_RE.test(budgetText)) {
    errors.push('procedure_gravity: procedural opener must state the human leverage or irreversible choice the mechanism creates')
  }
  if (isInvalidMaxOpeningBeats(turn.procedureBudget.maxOpeningBeats)) {
    errors.push('procedure_gravity: procedural mechanism may occupy at most one opening beat')
  }
  return errors
}

function validateTransitionSeedHonored(
  authored: AuthorChapterSetupV2,
  seed: NonNullable<Sf2State['chapter']['artifacts']['meaning']>['transitionSeed']
): string[] {
  if (!seed) return []
  const errors: string[] = []
  const authoredDoNotRestage = (authored.openingSceneSpec.doNotRestage ?? []).join('\n')
  if (
    seed.doNotRestage.length > 0 &&
    !seed.doNotRestage.some((item) => hasMeaningfulOverlap(item, authoredDoNotRestage))
  ) {
    errors.push('transition_seed.do_not_restage not reflected in opening_scene_spec.do_not_restage')
  }

  const mechanism = seed.procedureResidue.mechanism.trim()
  if (!mechanism || mechanism.toLowerCase() === PROCEDURE_NONE) return errors

  const openingChoiceText = [
    authored.openingSceneSpec.firstPlayerFacing,
    authored.openingSceneSpec.firstVisiblePressure,
  ].filter(Boolean).join('\n')
  const openingFullText = [
    openingChoiceText,
    authored.openingSceneSpec.initialState,
    authored.openingSceneSpec.dramaticSituation,
    authored.openingSceneSpec.firstHumanOrInstitutionalMove,
  ].filter(Boolean).join('\n')
  const budget = authored.continuationDramaticTurn?.procedureBudget
  const budgetText = budget ? [budget.mechanism, budget.ownerUsingIt, budget.dramaticFunction].join('\n') : ''

  if (seed.procedureResidue.keepAs === 'leverage') {
    if (!budget || !hasMeaningfulOverlap(mechanism, budgetText) || budget.ownerUsingIt.trim().toLowerCase() === PROCEDURE_NONE) {
      errors.push(`transition_seed.procedure_residue ${mechanism} marked leverage but continuation_dramatic_turn.procedure_budget does not assign it to a pressure owner`)
    }
  } else if (seed.procedureResidue.keepAs === 'discard' && hasMeaningfulOverlap(mechanism, openingFullText)) {
    errors.push(`transition_seed.procedure_residue ${mechanism} marked discard but opening still foregrounds it`)
  }

  return errors
}

function hasMeaningfulOverlap(source: string, target: string): boolean {
  const targetLower = target.toLowerCase()
  return meaningfulTerms(source).some((term) => targetLower.includes(term))
}

function meaningfulTerms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !COMMON_TERMS.has(term))
}

const COMMON_TERMS = new Set([
  'chapter',
  'prior',
  'scene',
  'opening',
  'pressure',
  'detail',
  'cargo',
  'sealed',
  'choice',
  'route',
])

function valueField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): unknown {
  if (!obj) return undefined
  return obj[snake] ?? (camel ? obj[camel] : undefined)
}

function optionalBoundedTension(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.min(CHAPTER_OPEN_CAP, Math.round(n)))
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.round(n))
}

function normalizeMaxOpeningBeats(value: unknown): number {
  const n = Number(value ?? 1)
  return Number.isFinite(n) ? n : Number.NaN
}

function isInvalidMaxOpeningBeats(value: unknown): boolean {
  const n = Number(value)
  return !Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 1
}

function uniqueErrors(errors: string[]): string[] {
  return [...new Set(errors)]
}

function importantLocationTerms(name: string, id: string): string[] {
  const nameTerms = name
    .split(/[^a-z0-9']+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 4 && !COMMON_TERMS.has(term.toLowerCase()))

  return [...new Set([id, name, ...nameTerms].filter((term) => term.trim().length > 0))]
}

function mentionsAnyTerm(text: string, terms: string[]): boolean {
  const lowerText = text.toLowerCase()
  return terms.some((term) => lowerText.includes(term.toLowerCase()))
}

function hasLocationBridgeLanguage(text: string): boolean {
  return /\b(?:from|after leaving|having left|arriv(?:e|es|ed|ing)|travel(?:s|ed|ing)?|walk(?:s|ed|ing)?|drive(?:s|n|ing)?|drove|flew|flies|flight|carried|escorted|taken|brought|transferred|relocat(?:e|es|ed|ing)|time[- ]?jump|jump(?:s|ed|ing)?|days? later|hours? later|meanwhile|elsewhere|because|as a consequence|in the wake of)\b/i.test(text)
}

function normalizeDriverKind(value: unknown): AuthorChapterSetupV2['activeThreads'][number]['driverKind'] {
  return value === 'carry_forward' || value === 'successor' || value === 'new_pressure' || value === 'arc_promoted'
    ? value
    : undefined
}

const TENSION_SCORE_ROLES = new Set<Sf2ChapterTensionRole>([
  'foreground_objective',
  'relational_social_pressure',
  'shadow_faction_pressure',
  'cargo_system_pressure',
  'environmental_pressure',
])

function normalizeTensionScoreRole(value: unknown): Sf2ChapterTensionRole {
  return TENSION_SCORE_ROLES.has(value as Sf2ChapterTensionRole)
    ? (value as Sf2ChapterTensionRole)
    : 'foreground_objective'
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

function revealContextArray(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Sf2RevealContext[] {
  return stringArray(obj, snake, camel).filter((v): v is Sf2RevealContext =>
    REVEAL_CONTEXTS.includes(v as Sf2RevealContext)
  )
}

function normalizeRevelationCashConditions(
  raw: Record<string, unknown>
): Sf2RevelationCashConditions | undefined {
  if (Object.keys(raw).length === 0) return undefined
  const minTension = getObject(raw, 'min_tension', 'minTension')
  const normalized: Sf2RevelationCashConditions = {}
  const playerPressesTopic = valueField(raw, 'player_presses_topic', 'playerPressesTopic')
  if (typeof playerPressesTopic === 'boolean') {
    normalized.playerPressesTopic = playerPressesTopic
  }
  const minTurn = optionalPositiveInt(valueField(raw, 'min_turn', 'minTurn'))
  if (minTurn !== undefined) normalized.minTurn = minTurn
  const threadId = stringField(minTension, 'thread_id', 'threadId').trim()
  const tensionValue = valueField(minTension, 'value')
  if (threadId && tensionValue !== undefined) {
    const n = Number(tensionValue)
    if (Number.isFinite(n)) {
      normalized.minTension = {
        threadId,
        value: Math.max(0, Math.min(10, Math.round(n))),
      }
    }
  }
  const contexts = revealContextArray(raw, 'requires_context', 'requiresContext')
  if (contexts.length > 0) normalized.requiresContext = contexts
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function stringField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): string {
  return String(valueField(obj, snake, camel) ?? '')
}

function stringArray(obj: Record<string, unknown> | undefined, snake: string, camel?: string): string[] {
  const value = valueField(obj, snake, camel)
  return Array.isArray(value) ? value.map(String).filter((s) => s.trim().length > 0) : []
}

function getObject(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Record<string, unknown> {
  const value = valueField(obj, snake, camel)
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getArray(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Array<Record<string, unknown>> {
  const value = valueField(obj, snake, camel)
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      )
    : []
}
