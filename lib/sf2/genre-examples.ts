export interface Sf2GenreExamples {
  entityBoundTriggers: [string, string, string]
  sceneCoupledTriggers: [string, string]
  pcMisfitChapterRule: string
  npcWorkedExample: { name: string; role: string; body: string }
  quickActionExamples: string[]
  continuationEscalationExample: string
}

const GENERIC_EXAMPLES: Sf2GenreExamples = {
  entityBoundTriggers: [
    'When a trusted NPC refuses another NPC in front of a witness who can still choose sides.',
    'When the protected secret is named aloud where a hostile faction representative can hear.',
    'When a third party calls in a debt the PC owed and forgot.',
  ],
  sceneCoupledTriggers: [
    'When the PC blocks an exit from the record room.',
    'When the PC uses the terminal beside the door.',
  ],
  pcMisfitChapterRule:
    'Build the chapter around what the PC can do; do not turn a capable role into a passive procedure reader.',
  npcWorkedExample: {
    name: 'Mira Vale',
    role: 'local witness',
    body: 'Mira keeps one hand on the chair back and answers only after checking who else can hear.',
  },
  quickActionExamples: [
    '"Press Mira on who benefits from her silence. [Persuasion]"',
    '"Track the witness who keeps watching the exit. [Perception]"',
    '"Step between the witness and the enforcer. [Athletics]"',
    '"Let the silence make the liar fill it."',
  ],
  continuationEscalationExample:
    'A prior rumor becomes a named hidden party with a reason to act; a trusted contact now risks standing by helping; a hunter gains the PC’s trail.',
}

const EXAMPLES_BY_GENRE: Record<string, Sf2GenreExamples> = {
  hegemony: {
    ...GENERIC_EXAMPLES,
    entityBoundTriggers: [
      'When a retainer refuses a House officer in front of a witness who can still choose sides.',
      'When a Resonant name is spoken where a Synod loyalist can hear.',
      'When a rival House calls in an old oath the PC thought was settled.',
    ],
    sceneCoupledTriggers: [
      'When the Warden blocks an exit from the record room.',
      'When the Warden reaches the desk with the writ.',
    ],
    pcMisfitChapterRule:
      'A Warden chapter is inter-faction confrontation and oath pressure, not reading records until compliance happens.',
    npcWorkedExample: {
      name: 'Mareth Vos',
      role: 'House retainer',
      body: 'Mareth bows correctly, but his eyes stay on the servant who will pay if the wording changes.',
    },
    quickActionExamples: [
      '"Press Mareth on who pays for the amended writ. [Intimidation]"',
      '"Read which servant everyone avoids naming. [Perception]"',
      '"Put your oath-body between the Synod aide and the witness. [Athletics]"',
      '"Cite the dispensation clause and watch who flinches. [History]"',
    ],
  },
  'space-opera': {
    ...GENERIC_EXAMPLES,
    entityBoundTriggers: [
      'When a crew member refuses a broker in front of someone who can sell the route.',
      'When the cargo’s real owner is named where a Remnant officer can hear.',
      'When an old contact calls in a debt the crew cannot pay quietly.',
    ],
    sceneCoupledTriggers: [
      'When the pilot reaches the docking bay hatch.',
      'When the PC clears the terminal beside the berth.',
    ],
    pcMisfitChapterRule:
      'A Driftrunner chapter is route leverage, crew trust, and dangerous favors, not a queue for departure forms.',
    npcWorkedExample: {
      name: 'Nara Quell',
      role: 'back-channel broker',
      body: 'Nara smiles like the price is funny and keeps her thumb over the name on the route chit.',
    },
    quickActionExamples: [
      '"Press Nara on who really bought the route. [Persuasion]"',
      '"Watch the dock crew before you name your ship. [Perception]"',
      '"Force the stuck cargo clamp before security turns. [Athletics]"',
      '"Slip the route chit under your sleeve. [Sleight of Hand]"',
    ],
    continuationEscalationExample:
      'Ch1 surfaced a bad route; Ch2 names the hidden fleet buyer, exposes a mole in the crew channel, and gives a hunter the transponder trail.',
  },
  fantasy: {
    ...GENERIC_EXAMPLES,
    pcMisfitChapterRule:
      'A Seeker chapter is dangerous recovery, contested memory, and proof under pressure, not catalogue maintenance.',
  },
  cyberpunk: {
    ...GENERIC_EXAMPLES,
    pcMisfitChapterRule:
      'A street-competent chapter is leverage, trace, debt, and bodily risk, not watching a progress bar finish.',
  },
  grimdark: {
    ...GENERIC_EXAMPLES,
    pcMisfitChapterRule:
      'A survivor chapter is hunger, blame, custody, and ugly choices, not a ration docket exercise.',
  },
  noire: {
    ...GENERIC_EXAMPLES,
    pcMisfitChapterRule:
      'A detective chapter is who lies, pays, threatens, or remembers, not a passive case-file review.',
  },
}

export function getSf2GenreExamples(genreId?: string): Sf2GenreExamples {
  return EXAMPLES_BY_GENRE[genreId ?? ''] ?? EXAMPLES_BY_GENRE.hegemony
}
