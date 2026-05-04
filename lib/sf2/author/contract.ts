import {
  validateNpcDisposition,
  type DispositionDerivationContext,
} from './disposition-defaults'
import { CHAPTER_OPEN_CAP } from '../pressure/constants'
import { normalizeThreadResolutionGates } from '../thread-resolution'
import type {
  AuthorChapterSetupV2,
  Sf2RevealContext,
  Sf2State,
  Sf2ThreadStatus,
} from '../types'

export type AuthorRawValidationContext = DispositionDerivationContext & {
  isContinuation?: boolean
  state?: Sf2State
}

export type AuthorSetupValidationOptions = {
  isContinuation: boolean
  state?: Sf2State
}

const TERMINAL_THREAD_STATUSES = new Set<Sf2ThreadStatus>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
])

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
      if (!stringField(spectrum, key).trim()) errors.push(`chapter_frame.outcome_spectrum.${key} is empty`)
    }
  }

  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  if (!stringField(antag, 'source_system', 'sourceSystem').trim()) errors.push('antagonist_field.source_system is empty')
  if (!stringField(antag, 'core_pressure', 'corePressure').trim()) errors.push('antagonist_field.core_pressure is empty')
  const defaultFace = getObject(antag, 'default_face', 'defaultFace')
  if (!stringField(defaultFace, 'name').trim()) errors.push('antagonist_field.default_face.name is empty')

  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')
  for (const key of ['location', 'atmospheric_condition', 'initial_state', 'first_player_facing', 'immediate_choice']) {
    const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
    if (!stringField(opening, key, camel).trim()) errors.push(`opening_scene_spec.${key} is empty`)
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
      if (existing && TERMINAL_THREAD_STATUSES.has(existing.status)) {
        errors.push(`active_threads[${i}].id ${id} is already terminal (${existing.status}); transition it and author a successor instead`)
      }
      if (!['carry_forward', 'successor', 'new_pressure'].includes(driverKind)) {
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
          const terminalByState = TERMINAL_THREAD_STATUSES.has(predecessor.status)
          const terminalByTransition = transitionStatus ? TERMINAL_THREAD_STATUSES.has(transitionStatus) : false
          if (!terminalByState && !terminalByTransition) {
            errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} must be terminal already or terminal in thread_transitions`)
          }
        }
      }
      if (driverKind === 'successor' || driverKind === 'new_pressure') {
        continuationDriverCount += 1
        if (!Number.isFinite(tension) || tension < 6) {
          errors.push(`active_threads[${i}] new/successor driver must be load-bearing tension ≥6`)
        }
      }
    }
  })
  if (ctx.isContinuation && continuationDriverCount < 1) {
    errors.push('active_threads must include at least 1 successor or new_pressure driver for chapter ≥ 2')
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

export function normalizeAuthorSetup(raw: Record<string, unknown>): AuthorChapterSetupV2 {
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
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

  return {
    chapterFrame: {
      title: stringField(frame, 'title'),
      premise: stringField(frame, 'premise'),
      activePressure: stringField(frame, 'active_pressure', 'activePressure'),
      centralTension: stringField(frame, 'central_tension', 'centralTension'),
      chapterScope: stringField(frame, 'chapter_scope', 'chapterScope'),
      objective: stringField(frame, 'objective'),
      crucible: stringField(frame, 'crucible'),
      outcomeSpectrum: valueField(frame, 'outcome_spectrum', 'outcomeSpectrum') as AuthorChapterSetupV2['chapterFrame']['outcomeSpectrum'],
    },
    antagonistField: {
      sourceSystem: stringField(antag, 'source_system', 'sourceSystem'),
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
      triggerCondition: stringField(s, 'trigger_condition', 'triggerCondition'),
      narrativeEffect: stringField(s, 'narrative_effect', 'narrativeEffect'),
      severity: stringField(s, 'severity') === 'hard' ? 'hard' : 'standard',
    })),
    possibleRevelations: getArray(raw, 'possible_revelations', 'possibleRevelations').map((r) => ({
      id: stringField(r, 'id'),
      statement: stringField(r, 'statement'),
      heldBy: stringField(r, 'held_by', 'heldBy'),
      emergenceCondition: stringField(r, 'emergence_condition', 'emergenceCondition'),
      recontextualizes: stringField(r, 'recontextualizes'),
      hintPhrases: stringArray(r, 'hint_phrases', 'hintPhrases'),
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
      pressureEngineIds: stringArray(arcLink, 'pressure_engine_ids', 'pressureEngineIds'),
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
      immediateChoice: stringField(opening, 'immediate_choice', 'immediateChoice'),
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

// Final boundary validation on the normalized single-call AuthorChapterSetupV2.
export function validateAuthorSetup(
  authored: AuthorChapterSetupV2,
  opts: AuthorSetupValidationOptions = { isContinuation: false }
): string[] {
  const errors: string[] = []
  const requiredOpeningStrings: Array<keyof AuthorChapterSetupV2['openingSceneSpec']> = [
    'location',
    'atmosphericCondition',
    'initialState',
    'firstPlayerFacing',
    'immediateChoice',
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
      }
    }
  }

  const antag = authored.antagonistField
  if (!antag.sourceSystem.trim()) errors.push('antagonist_field.source_system is empty')
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
  authored.activeThreads.forEach((thread, i) => {
    if (thread.initialTension !== undefined && (thread.initialTension < 0 || thread.initialTension > CHAPTER_OPEN_CAP)) {
      errors.push(`active_threads[${i}].initial_tension must be between 0 and ${CHAPTER_OPEN_CAP}`)
    }
    if (opts.isContinuation) {
      const existing = opts.state?.campaign?.threads?.[thread.id]
      if (existing && TERMINAL_THREAD_STATUSES.has(existing.status)) {
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
          const terminalByState = TERMINAL_THREAD_STATUSES.has(predecessor.status)
          const terminalByTransition = transitionStatus ? TERMINAL_THREAD_STATUSES.has(transitionStatus) : false
          if (!terminalByState && !terminalByTransition) {
            errors.push(`active_threads[${i}].successor_to_thread_id ${successorTo} must be terminal already or terminal in thread_transitions`)
          }
        }
      }
      if (thread.driverKind === 'successor' || thread.driverKind === 'new_pressure') {
        continuationDriverCount += 1
        if (thread.tension < 6) errors.push(`active_threads[${i}] new/successor driver must be load-bearing tension ≥6`)
      }
    }
  })
  if (opts.isContinuation && continuationDriverCount < 1) {
    errors.push('active_threads must include at least 1 successor or new_pressure driver for chapter ≥ 2')
  }
  if (!authored.arcLink.arcId.trim()) errors.push('arc_link.arc_id is empty')
  if (!authored.arcLink.chapterFunction.trim()) errors.push('arc_link.chapter_function is empty')
  if (!authored.pacingContract.chapterQuestion.trim()) errors.push('pacing_contract.chapter_question is empty')
  if (authored.pacingContract.targetTurns.min < 1 || authored.pacingContract.targetTurns.max < authored.pacingContract.targetTurns.min) {
    errors.push('pacing_contract.target_turns is invalid')
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
  }

  return errors
}

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

function normalizeDriverKind(value: unknown): AuthorChapterSetupV2['activeThreads'][number]['driverKind'] {
  return value === 'carry_forward' || value === 'successor' || value === 'new_pressure'
    ? value
    : undefined
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
