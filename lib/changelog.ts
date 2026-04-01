export interface ChangelogEntry {
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-01',
    changes: [
      'Noire genre — a fifth playable genre built around investigation, social leverage, and desperate violence. Five origins (Ex-Cop, Street, Old Money, Veteran, Immigrant), five classes (Private Investigator, Fixer, Bruiser, Grifter, Reporter), Sin City-inspired visuals, and four opening hooks',
      'Case Board — a cross-genre investigation system. Discover clues through conversation, observation, and NPC relationships. Propose connections between evidence to crack the case. Available in all genres (Case Board, Dossier, Codex, Data Cache, Journal)',
      'Inline stat changes — HP, inventory, and world state changes now appear as color-coded tags beneath the GM message that caused them, persisting in your scroll history',
      'Quick actions redesigned — left-aligned vertical layout with subtle borders, replacing the old centered primary-text buttons',
      'Dice rolls persist — roll results now survive page reloads and show their full visual badge when you scroll back',
      'Save system improved — new games auto-save to a slot immediately. No more phantom saves that vanish when loading a different story',
      'Mobile fixes — scene break headers wrap properly on narrow screens, text no longer overflows',
      'Cinematic UI overhaul — all wizard screens rebuilt with typography-led layouts, species portraits with grayscale-to-color transitions, terminal-style dossier preview, and genre-colored accents throughout',
      'New mechanics — contested rolls, passive perception, inspiration, defensive saves, exhaustion, death saves, and a structured fail-forward system',
      'Smarter GM — context-aware prompts (combat rules only during fights), adaptive history window, genre-specific NPC voice guides, and scene-level failure protection',
    ],
  },
  {
    date: '2026-03-30',
    changes: [
      'Cyberpunk Tech Rig — personal neural interface with 5 upgradeable modules and integrity tracking',
      'Advantage & disadvantage — two-dice UI with the kept die highlighted and the discarded one struck through',
      'Auto-retry on overload — countdown timer instead of an error screen',
      'Unique class traits reworked across all genres',
      'World tab restructured with People, Narrative, and Locations subtabs',
    ],
  },
  {
    date: '2026-03-29',
    changes: [
      'Tension clocks — hidden threat tracks with irreversible consequences',
      'NPC disposition system — contacts shift between hostile and trusted based on your actions',
      'Ship progression — hull condition, system upgrades, and combat options',
      'Chapter debrief with tactical and strategic grades',
      'Crew cohesion — hidden relationship tracking shapes NPC behavior',
      'Multi-genre support: Space Opera, Fantasy, Grimdark, and Cyberpunk',
    ],
  },
]
