import type { AuthorInputSeed, Sf2Arc, Sf2ArcPlan } from '../types'
import { ENGINE_AGGREGATION_DEFAULT } from '../pressure/constants'

export function transformArcSetup(raw: Record<string, unknown>, seed: AuthorInputSeed): Sf2ArcPlan {
  const source = getObject(raw, 'source_hook', 'sourceHook')
  const scenario = getObject(raw, 'scenario_shape', 'scenarioShape')

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
    durableForces: getArray(raw, 'durable_forces', 'durableForces').map((f) => ({
      id: stringField(f, 'id'),
      name: stringField(f, 'name'),
      agenda: stringField(f, 'agenda'),
      leverage: stringField(f, 'leverage'),
      fear: stringField(f, 'fear'),
      pressureStyle: stringField(f, 'pressure_style', 'pressureStyle'),
    })),
    durableNpcSeeds: getArray(raw, 'durable_npc_seeds', 'durableNpcSeeds').map((n) => ({
      id: stringField(n, 'id'),
      role: stringField(n, 'role'),
      affiliation: stringField(n, 'affiliation'),
      dramaticFunction: stringField(n, 'dramatic_function', 'dramaticFunction'),
      privatePressure: stringField(n, 'private_pressure', 'privatePressure'),
      reuseGuidance: stringField(n, 'reuse_guidance', 'reuseGuidance'),
    })),
    pressureEngines: getArray(raw, 'pressure_engines', 'pressureEngines').map((e) => ({
      id: stringField(e, 'id'),
      name: stringField(e, 'name'),
      aggregation: normalizeAggregation(stringField(e, 'aggregation')),
      advancesWhen: stringField(e, 'advances_when', 'advancesWhen'),
      slowsWhen: stringField(e, 'slows_when', 'slowsWhen'),
      visibleSymptoms: stringField(e, 'visible_symptoms', 'visibleSymptoms'),
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

function normalizeAggregation(raw: string): Sf2ArcPlan['pressureEngines'][number]['aggregation'] {
  return raw === 'average' || raw === 'weighted' || raw === 'max'
    ? raw
    : ENGINE_AGGREGATION_DEFAULT
}

export function arcPlanToArcEntity(plan: Sf2ArcPlan): Sf2Arc {
  return {
    id: plan.id,
    title: plan.title,
    category: 'arc',
    status: plan.status,
    chapterCreated: 1,
    retrievalCue: `${plan.scenarioShape.mode}: ${plan.arcQuestion}`,
    threadIds: [],
    spansChapters: plan.chapterFunctionMap.length || 5,
    noSingleResolvingAction: true,
    stakesDefinition: plan.coreCrucible,
  }
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
  if (plan.pressureEngines.length < 3) errors.push('pressure_engines needs at least 3')
  if (plan.playerStanceAxes.length < 3) errors.push('player_stance_axes needs at least 3')
  if (plan.chapterFunctionMap.length !== 5) errors.push('chapter_function_map needs exactly 5 chapters')
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
