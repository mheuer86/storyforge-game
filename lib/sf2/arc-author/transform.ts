import type { AuthorInputSeed, Sf2Arc, Sf2ArcPlan, Sf2Faction, Sf2Thread } from '../types'

export function transformArcSetup(raw: Record<string, unknown>, seed: AuthorInputSeed): Sf2ArcPlan {
  const source = getObject(raw, 'source_hook', 'sourceHook')
  const scenario = getObject(raw, 'scenario_shape', 'scenarioShape')
  const durableForces = getArray(raw, 'durable_forces', 'durableForces').map((f) => {
    const id = stringField(f, 'id')
    const name = stringField(f, 'name')
    return {
      id,
      factionId: factionIdForDurableForce(id, name),
      name,
      agenda: stringField(f, 'agenda'),
      leverage: stringField(f, 'leverage'),
      fear: stringField(f, 'fear'),
      pressureStyle: stringField(f, 'pressure_style', 'pressureStyle'),
    }
  })
  const arcThreads = getArray(raw, 'arc_threads', 'arcThreads')

  return {
    id: stringField(raw, 'id') || `arc_${slug(seed.hook.title)}`,
    status: 'active',
    title: stringField(raw, 'title') || seed.hook.title,
    sourceHook: {
      title: stringField(source, 'title') || seed.hook.title,
      premise: stringField(source, 'premise') || seed.hook.premise,
      objective: stringField(source, 'objective') || seed.hook.objective,
      crucible: stringField(source, 'crucible') || seed.hook.crucible,
      firstEpisode: stringField(source, 'first_episode', 'firstEpisode') || seed.hook.firstEpisode,
    },
    scenarioShape: {
      mode: (stringField(scenario, 'mode') || 'other') as Sf2ArcPlan['scenarioShape']['mode'],
      premise: stringField(scenario, 'premise'),
      whyThisRun: stringField(scenario, 'why_this_run', 'whyThisRun'),
      whatThisIsNot: stringField(scenario, 'what_this_is_not', 'whatThisIsNot'),
      selectionRationale: stringField(scenario, 'selection_rationale', 'selectionRationale'),
      rejectedDefaultShape: stringField(scenario, 'rejected_default_shape', 'rejectedDefaultShape'),
    },
    arcQuestion: stringField(raw, 'arc_question', 'arcQuestion'),
    coreCrucible: stringField(raw, 'core_crucible', 'coreCrucible') || seed.hook.crucible,
    invariantFacts: stringArray(raw, 'invariant_facts', 'invariantFacts'),
    variableTruthsForThisRun: stringArray(raw, 'variable_truths_for_this_run', 'variableTruthsForThisRun'),
    durableForces,
    durableNpcSeeds: getArray(raw, 'durable_npc_seeds', 'durableNpcSeeds').map((n) => ({
      id: stringField(n, 'id'),
      role: stringField(n, 'role'),
      affiliation: stringField(n, 'affiliation'),
      dramaticFunction: stringField(n, 'dramatic_function', 'dramaticFunction'),
      privatePressure: stringField(n, 'private_pressure', 'privatePressure'),
      reuseGuidance: stringField(n, 'reuse_guidance', 'reuseGuidance'),
    })),
    arcThreadIds: arcThreads.map((t) => stringField(t, 'id')).filter(Boolean),
    latentArcQuestions: getArray(raw, 'latent_arc_questions', 'latentArcQuestions').map((q) => ({
      id: stringField(q, 'id'),
      question: stringField(q, 'question'),
      whyItMatters: stringField(q, 'why_it_matters', 'whyItMatters'),
      answerImpactAxis: stringField(q, 'answer_impact_axis', 'answerImpactAxis'),
      activationTags: stringArray(q, 'activation_tags', 'activationTags').slice(0, 4),
      status: 'open',
      createdChapter: 1,
    })),
    playerStanceAxes: getArray(raw, 'player_stance_axes', 'playerStanceAxes').map((a) => ({
      id: stringField(a, 'id'),
      axis: stringField(a, 'axis'),
      poleA: stringField(a, 'pole_a', 'poleA'),
      poleB: stringField(a, 'pole_b', 'poleB'),
      signalsA: stringArray(a, 'signals_a', 'signalsA'),
      signalsB: stringArray(a, 'signals_b', 'signalsB'),
      ifAHardens: stringField(a, 'if_a_hardens', 'ifAHardens'),
      ifBHardens: stringField(a, 'if_b_hardens', 'ifBHardens'),
    })),
    chapterFunctionMap: getArray(raw, 'chapter_function_map', 'chapterFunctionMap').map((c) => ({
      chapter: Number(valueField(c, 'chapter') ?? 1) as 1 | 2 | 3 | 4 | 5,
      function: stringField(c, 'function'),
      pressureQuestion: stringField(c, 'pressure_question', 'pressureQuestion'),
      possibleEndStates: stringArray(c, 'possible_end_states', 'possibleEndStates'),
    })),
    possibleEndgames: stringArray(raw, 'possible_endgames', 'possibleEndgames'),
  }
}

export function arcPlanToArcEntity(plan: Sf2ArcPlan): Sf2Arc {
  return {
    id: plan.id,
    title: plan.title,
    category: 'arc',
    status: plan.status,
    chapterCreated: 1,
    retrievalCue: `${plan.scenarioShape.mode}: ${plan.arcQuestion}`,
    threadIds: [...plan.arcThreadIds],
    spansChapters: plan.chapterFunctionMap.length || 5,
    noSingleResolvingAction: true,
    stakesDefinition: plan.coreCrucible,
  }
}

export function durableForceFactionsFromArcPlan(plan: Sf2ArcPlan): Sf2Faction[] {
  return plan.durableForces.map((force) => ({
    id: force.factionId,
    name: force.name,
    stance: 'neutral',
    heat: 'none',
    heatReasons: [],
    ownedThreadIds: [],
    retrievalCue: `${force.agenda}; leverage: ${force.leverage}`,
  }))
}

export function arcThreadsFromArcSetup(
  raw: Record<string, unknown>,
  plan: Sf2ArcPlan
): Sf2Thread[] {
  const forceById = new Map(plan.durableForces.map((force) => [force.id, force]))
  const fallbackForce = plan.durableForces[0]
  return getArray(raw, 'arc_threads', 'arcThreads').map((t) => {
    const id = stringField(t, 'id')
    const ownerForceId = stringField(t, 'owner_force_id', 'ownerForceId')
    const force = forceById.get(ownerForceId) ?? fallbackForce
    const stakeholders = stringArray(t, 'stakeholder_force_ids', 'stakeholderForceIds')
      .map((forceId) => forceById.get(forceId)?.factionId)
      .filter((id): id is string => Boolean(id))
      .map((factionId) => ({ kind: 'faction' as const, id: factionId }))
    return {
      id,
      title: stringField(t, 'title') || id.replace(/^thread_/, '').replace(/_/g, ' '),
      chapterCreated: 1,
      category: 'thread',
      retrievalCue: stringField(t, 'retrieval_cue', 'retrievalCue'),
      status: 'deferred',
      owner: { kind: 'faction', id: force?.factionId ?? 'faction_unknown' },
      stakeholders,
      tension: 0,
      peakTension: 0,
      resolutionCriteria: stringField(t, 'resolution_criteria', 'resolutionCriteria'),
      failureMode: stringField(t, 'failure_mode', 'failureMode'),
      anchoredArcId: plan.id,
      loadBearing: false,
      resolutionGates: [],
      progressEvents: [],
      tensionHistory: [],
    }
  })
}

export function validateArcPlan(plan: Sf2ArcPlan): string[] {
  const errors: string[] = []
  if (!plan.id.trim()) errors.push('id is empty')
  if (!plan.title.trim()) errors.push('title is empty')
  if (!plan.scenarioShape.premise.trim()) errors.push('scenario_shape.premise is empty')
  if (!plan.scenarioShape.whatThisIsNot.trim()) errors.push('scenario_shape.what_this_is_not is empty')
  if (!plan.scenarioShape.selectionRationale.trim()) errors.push('scenario_shape.selection_rationale is empty')
  if (!plan.scenarioShape.rejectedDefaultShape.trim()) errors.push('scenario_shape.rejected_default_shape is empty')
  if (!plan.arcQuestion.trim()) errors.push('arc_question is empty')
  const arcThreadIds = plan.arcThreadIds ?? []
  const latentArcQuestions = plan.latentArcQuestions ?? []
  if (arcThreadIds.length < 1) errors.push('arc_threads needs at least 1')
  if (arcThreadIds.length > 4) errors.push('arc_threads must contain at most 4')
  if (latentArcQuestions.length > 4) errors.push('latent_arc_questions must contain at most 4')
  latentArcQuestions.forEach((question, index) => {
    if (!question.id.trim()) errors.push(`latent_arc_questions[${index}].id is empty`)
    if (!question.question.trim()) errors.push(`latent_arc_questions[${index}].question is empty`)
    if (!question.whyItMatters.trim()) errors.push(`latent_arc_questions[${index}].why_it_matters is empty`)
    if (!question.answerImpactAxis.trim()) errors.push(`latent_arc_questions[${index}].answer_impact_axis is empty`)
    if (looksLikeHiddenAnswer(question.answerImpactAxis)) {
      errors.push(`latent_arc_questions[${index}].answer_impact_axis must describe an impact axis, not a hidden answer`)
    }
  })
  if (plan.playerStanceAxes.length < 3) errors.push('player_stance_axes needs at least 3')
  if (plan.chapterFunctionMap.length !== 5) errors.push('chapter_function_map needs exactly 5 chapters')
  return errors
}

export function validateArcThreads(threads: Sf2Thread[]): string[] {
  const errors: string[] = []
  threads.forEach((thread, index) => {
    if (!thread.id.trim()) errors.push(`arc_threads[${index}].id is empty`)
    if (!thread.title.trim()) errors.push(`arc_threads[${index}].title is empty`)
    if (!thread.retrievalCue.trim()) errors.push(`arc_threads[${index}].retrieval_cue is empty`)
    if (!thread.resolutionCriteria.trim()) errors.push(`arc_threads[${index}].resolution_criteria is empty`)
    if (!thread.failureMode.trim()) errors.push(`arc_threads[${index}].failure_mode is empty`)
    if (!thread.anchoredArcId?.trim()) errors.push(`arc_threads[${index}].anchoredArcId is empty`)
    if (thread.status !== 'deferred') errors.push(`arc_threads[${index}].status must start deferred`)
    if (thread.tension !== 0) errors.push(`arc_threads[${index}].tension must start at 0`)
  })
  return errors
}

function valueField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): unknown {
  if (!obj) return undefined
  return obj[snake] ?? (camel ? obj[camel] : undefined)
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

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'campaign'
}

function factionIdForDurableForce(forceId: string, name: string): string {
  if (forceId.startsWith('faction_')) return forceId
  return `faction_${slug(name || forceId.replace(/^force_/, ''))}`
}

function looksLikeHiddenAnswer(value: string): boolean {
  const lower = value.toLowerCase()
  return /\b(reveals?|turns out|is secretly|was secretly|was in on it|actually|proves that|exposes that)\b/.test(lower)
}
