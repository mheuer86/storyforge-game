export interface Sf2ArcProcedureEvalInput {
  seed: string
  scenarioShape: string
  durableForces: string[]
  arcThreads?: string[]
  pressureEngines?: string[]
  stanceAxes: string[]
  chapterFunctions: string[]
  possibleEndgames: string[]
  alternateStanceNotes: string[]
  nonOperationSeed?: boolean
  operationForced?: boolean
}

export interface Sf2ArcProcedureEvalResult {
  seed: string
  verdict: 'pass' | 'fail'
  checklist: Record<string, boolean>
  reauthorNotes: string[]
}

export function evaluateProcedureArcPassBar(input: Sf2ArcProcedureEvalInput): Sf2ArcProcedureEvalResult {
  const arcThreads = input.arcThreads ?? input.pressureEngines ?? []
  const checklist = {
    durableForcesNamed: input.durableForces.length > 0 && arcThreads.length > 0,
    stanceAxesSufficient: input.stanceAxes.length >= 2,
    endgamesSufficient: uniqueStrings(input.possibleEndgames).length >= 3,
    chapterFunctionsArePressureJobs: input.chapterFunctions.length > 0 && input.chapterFunctions.every(isPressureJob),
    alternateStanceValid: input.alternateStanceNotes.length > 0,
    nonOperationSeedNotForced: !input.nonOperationSeed || !input.operationForced,
    arcThreadCoverage: hasProcedurePressureCoverage(arcThreads),
  }
  const reauthorNotes = Object.entries(checklist)
    .filter(([, ok]) => !ok)
    .map(([key]) => reauthorNoteFor(key))
  return {
    seed: input.seed,
    verdict: reauthorNotes.length === 0 ? 'pass' : 'fail',
    checklist,
    reauthorNotes,
  }
}

function isPressureJob(value: string): boolean {
  const normalized = value.toLowerCase()
  if (/\b(get hired|meet with|go to|fight at|infiltrate the|hack the)\b/.test(normalized)) return false
  return /\b(introduce|raise|test|force|surface|complicate|reframe|escalate|resolve)\b/.test(normalized)
}

function hasProcedurePressureCoverage(engines: string[]): boolean {
  const text = engines.join(' ').toLowerCase()
  return (
    /\b(deadline|window|timer|clock)\b/.test(text) &&
    /\b(surveillance|scrutiny|exposure|trace|watch)\b/.test(text) &&
    /\b(military|guard|force|patrol|armed)\b/.test(text) &&
    /\b(trust|inclusion|kinship|crew|belonging)\b/.test(text)
  )
}

function reauthorNoteFor(key: string): string {
  switch (key) {
    case 'durableForcesNamed':
      return 'Name durable forces and arc threads instead of scene itinerary.'
    case 'stanceAxesSufficient':
      return 'Add at least two player stance axes.'
    case 'endgamesSufficient':
      return 'Describe at least three plausible endgames.'
    case 'chapterFunctionsArePressureJobs':
      return 'Rewrite chapter functions as pressure jobs, not fixed scenes.'
    case 'alternateStanceValid':
      return 'Show the arc remains valid under alternate player stances.'
    case 'nonOperationSeedNotForced':
      return 'Do not force non-operation seeds into mission planning.'
    case 'arcThreadCoverage':
      return 'Cover deadline, surveillance/exposure, military escalation, and trust/inclusion risk.'
    default:
      return `Re-author failed pass-bar item: ${key}.`
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
