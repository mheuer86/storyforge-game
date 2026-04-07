export interface ChangelogEntry {
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-07',
    changes: [
      'V1.5 Engine — the GM now completes each turn in a single response instead of chaining multiple tool calls. Dramatically faster, dramatically cheaper. What used to take 3-6 API calls now takes 1',
      'Scene memory — when you move to a new location or a scene concludes, the GM writes a summary that captures what happened, what changed, and the emotional tone. Earlier scenes compress into these summaries so the GM always knows the story arc without re-reading everything',
      'Pacing engine — a hidden system tracks narrative structure (setup, development, crucible, resolution) and nudges the GM to keep chapters tight. Chapters target 12-18 turns instead of sprawling to 40+',
      'Rules engine — persistent counters track genre-specific consequences across chapters. Corruption darkens the Hexblade\'s world. Drift Exposure draws the Synod\'s attention. Chrome Stress erodes empathy. Favor Balance strains contacts. These aren\'t warnings — they change the world state directly',
      'Crew load — each companion now carries psychological weight from the campaign. Unresolved promises, witnessed trauma, operational stress. The system detects when someone is approaching their breaking point',
      'NPC memory — the GM preserves signature quotes from important NPCs and marks pivotal scenes that survive compression. When an NPC references something from three chapters ago, it\'s because the system kept that moment alive',
      'Grimdark Company — a five-dimension mercenary band (Strength, Morale, Reputation, Intelligence, Provisions) that degrades between chapters without maintenance',
      'Fantasy overhaul — new thesis: "the world is forgetting itself." Rewritten classes (Spell Archaeologist, Wilderness Interpreter, Shadow Walker, Divine Vessel), traits with narrative costs, investigation as archaeology',
      'New origin: Spent Resonant (Epic Sci-Fi) — a hard-mode origin. Officially dead. Unofficially, still capable. Every use of your abilities makes your classification retroactively fraudulent',
      'New class: Lawyer (Noir) — Motion to Compel forces institutions to produce documents. The cost: every legal action creates a paper trail the antagonist can follow',
      'Genre refinements — trait costs across all genres (every ability now has a price), expanded investigation guides, genre-specific crew dynamics, origin-specific starting liabilities, and 10+ new opening hooks',
      'Attention system (Noir) — a genre-specific heat tracker: none → noticed → watched → targeted → hunted',
      'Save protection — loading a different campaign now auto-backs up your current game first',
    ],
  },
  {
    date: '2026-04-03',
    changes: [
      'Chapter Frame — the GM now silently plans each chapter with an objective and crucible. Your mission appears in the character sheet so you always know what you\'re working toward',
      'Chapter Close — when the story reaches its turning point, a Close Chapter button appears. The GM wraps up, you choose when to close, and a dedicated close sequence handles level-ups, skill points, and a full analytical debrief',
      'End-of-chapter overlay — a proper curtain call. Level progression, new proficiencies, a six-section debrief that names the roll that defined your chapter, and a preview of what\'s next. All in one card',
      'Clean chapter starts — clicking Start Next Chapter archives your conversation and opens a fresh page with a chapter header. Old chapters are preserved in history',
      'Slash commands — type / for structured GM instructions. /challenge forces a mechanical moment, /inspect actively searches, /roll requests a specific check, /use activates an item, /connect proposes evidence links. Arrow keys navigate, Enter selects',
      'Evidence connections — a Connect button in the notebook closes the sidebar and pre-fills /connect so you can name the clues to link',
      'The dice got real — enemies now fight to win, violence has proportional consequences, and at least one NPC per chapter will pick a fight. A five-tier threat system keeps enemy stats consistent, and each genre shapes how its antagonist operates',
      'Scene headings — locations and time now appear as the first line the GM writes, not as a header that pops in after the narrative starts',
      'Loading animation — the chapter close sequence shows a step-by-step progress card while the GM works through the audit, level-up, and debrief',
    ],
  },
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
