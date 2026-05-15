export interface Sf2GenreExamples {
  entityBoundTriggers: [string, string, string]
  sceneCoupledTriggers: [string, string]
  pcMisfitChapterRule: string
  npcWorkedExample: { name: string; role: string; body: string }
  quickActionExamples: string[]
  continuationEscalationExample: string
}

export interface Sf2GenreNarrativeProfile {
  id: string
  bible: string
  examples: Sf2GenreExamples
}
