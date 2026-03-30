export interface ChangelogEntry {
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-03-30',
    changes: [
      'Story continuity fixed on save load — opening scene now picks up from the right narrative moment',
      'Ship tab text wrapping fixed',
      'Reduced API token usage ~20–25% per turn',
    ],
  },
  {
    date: '2026-03-29',
    changes: [
      'Tension clocks added — hidden threat tracks that fire irreversible consequences when full',
      'NPC disposition system — contacts shift between hostile, wary, neutral, favorable, and trusted based on your actions',
      'Save load no longer restarts from Chapter 1',
      'Ships and stations now display separately from characters in the World tab',
      'Connection errors show a retry button instead of a dead screen',
    ],
  },
  {
    date: '2026-03-28',
    changes: [
      'Chapter debrief: tactical and strategic grades after each chapter close',
      'Crew cohesion: hidden relationship tracking shapes NPC behavior and roll bonuses',
      'Ship progression: hull condition, system upgrades, and combat options',
      'Consistency challenge: flag a GM response to trigger a factual review',
      'Hidden difficulty adaptation — the GM eases checks after streaks of failures and escalates after streaks of successes',
      'Multi-genre support: Space Opera and Fantasy, each with distinct tone, vocabulary, and mechanics',
    ],
  },
]
