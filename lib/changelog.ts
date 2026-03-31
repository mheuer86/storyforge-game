export interface ChangelogEntry {
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-03-31',
    changes: [
      'World tab restructured — People, Narrative, and Locations subtabs replace the old Now/All toggle for cleaner navigation',
      'Ship/Rig tab now hidden in genres without one (Fantasy, Grimdark)',
      'Typography refresh — Space Grotesk headings for sci-fi genres, Lora Bold for fantasy, genre-colored section labels',
      'Auto-retry on overload — instead of an error, you see a countdown ("Claude is taking a break — retrying in 12s") and it tries again automatically',
      'Unique class traits — 10 traits reworked across all genres: Smuggler\'s Luck, Shadow Step, Diplomatic Immunity, Bardic Echo, Favor Owed, Leverage, Arcane Surge (wild magic), Deep Dive (cyberpsychosis risk), Divine Favor (deity alignment), Bitter Medicine (side effects)',
      'Cyberpunk Solo class replaces Wheelman — CON-primary contract killer with "Dead Man Walking" (ignore one attack\'s damage)',
      'Grimdark Inquisitor class replaces Outrider — INT-primary interrogator with "The Question" (force an NPC to reveal information)',
      'Cyberpunk Tech Rig — personal neural interface with 5 upgradeable modules (Neurofence, Spectra, Redline, Panoptik, Skinweave), integrity mechanic, and chapter-end upgrades',
      'Space Opera visual refresh — Event Horizon palette with deeper navy, brighter cyan, and gold accent',
      'Dice colors fixed — success rolls now show green across all genres instead of using the genre primary color',
      'Origin × class tension — the GM now creates narrative friction from insider/outsider dynamics in your background',
      'Letter spacing fix — quoted text and italic passages no longer run into adjacent paragraphs',
      'Advantage & disadvantage — the GM now mechanically grants advantage (roll 2d20, take higher) or disadvantage (roll 2d20, take lower) based on gear, creative tactics, NPC disposition, crew cohesion, and environmental conditions',
      'Two-dice UI — when advantage or disadvantage is active, two dice animate and the kept die is highlighted while the discarded one is struck through',
    ],
  },
  {
    date: '2026-03-30',
    changes: [
      'GM now requires a dice roll for any social moment where a reasonable NPC could say no — strong arguments lower the DC or grant advantage, but never skip the roll',
      'Quick actions no longer bleed across campaigns when switching stories',
      'Cyberpunk origins reworked — Undercity Born and Syndicate Blood replace Techie and Rogue Runner',
      'Zombie Apocalypse and Post-Atomic Wasteland added to the coming soon genre picker',
    ],
  },
  {
    date: '2026-03-30',
    changes: [
      'Story continuity fixed — save loads now pick up from the right narrative moment instead of jumping to a generic scene',
      'Ship tab text wrapping fixed — long system descriptions and combat options no longer overflow the panel',
      'Reduced API token usage ~20–25% per turn through tool caching, leaner chapter history, and genre-gating unused mechanics',
      'What\'s new section added to the campaign screen',
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
