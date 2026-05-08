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
  generic: GENERIC_EXAMPLES,
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
    entityBoundTriggers: [
      'When a Collegium witness refuses a noble patron in front of an heir who can still choose sides.',
      'When the recovered name is spoken where a rival scholar can claim it first.',
      'When an old oath is called in by someone the PC needed to trust.',
    ],
    sceneCoupledTriggers: [
      'When the Seeker reaches the sealed archive door.',
      'When the PC opens the reliquary beside the map table.',
    ],
    pcMisfitChapterRule:
      'A Seeker chapter is dangerous recovery, contested memory, and proof under pressure, not catalogue maintenance.',
    npcWorkedExample: {
      name: 'Elian Voss',
      role: 'Collegium witness',
      body: 'Elian keeps two fingers on the cracked folio and never looks at the page everyone wants named.',
    },
    quickActionExamples: [
      '"Press Elian on who first owned the folio. [Persuasion]"',
      '"Read which scholar avoids the inscription. [Perception]"',
      '"Hold the bridge stones steady while the ward shakes. [Athletics]"',
      '"Recall the treaty name hidden in the margin. [History]"',
    ],
    continuationEscalationExample:
      'Ch1 recovered a fragment; Ch2 names the patron who buried it, strains a scholar who vouched for the PC, and wakes a rival claim to the ruin.',
  },
  cyberpunk: {
    ...GENERIC_EXAMPLES,
    entityBoundTriggers: [
      'When a clinic contact refuses a corp handler in front of a runner who can still sell the trace.',
      'When the stolen biometric key is named where a security contractor can hear.',
      'When a debt broker calls in a favor the crew thought was burned.',
    ],
    sceneCoupledTriggers: [
      'When the runner reaches the service elevator.',
      'When the PC clears the kiosk beside the clinic door.',
    ],
    pcMisfitChapterRule:
      'A street-competent chapter is leverage, trace, debt, and bodily risk, not watching a progress bar finish.',
    npcWorkedExample: {
      name: 'Jax Rill',
      role: 'clinic contact',
      body: 'Jax keeps the med-scanner running loud enough to blur the room mics and answers with his eyes on the exit feed.',
    },
    quickActionExamples: [
      '"Press Jax on who paid for the wipe. [Intimidation]"',
      '"Read the security feed before the loop resets. [Perception]"',
      '"Jam the closing lift doors with your shoulder. [Athletics]"',
      '"Ghost the clinic terminal before the trace pings back. [Stealth]"',
    ],
    continuationEscalationExample:
      'Ch1 exposed a dirty trace; Ch2 names the handler behind it, makes a clinic ally liable, and puts a bounty scanner on the PC.',
  },
  grimdark: {
    ...GENERIC_EXAMPLES,
    entityBoundTriggers: [
      'When a camp surgeon refuses a militia captain in front of a prisoner who can still recant.',
      'When the hidden ration cache is named where a hungry squad can hear.',
      'When a surviving relative demands repayment for a mercy the PC could not afford.',
    ],
    sceneCoupledTriggers: [
      'When the survivor reaches the barricade gate.',
      'When the PC opens the ration crate beside the trench.',
    ],
    pcMisfitChapterRule:
      'A survivor chapter is hunger, blame, custody, and ugly choices, not a ration docket exercise.',
    npcWorkedExample: {
      name: 'Hale Marr',
      role: 'camp surgeon',
      body: 'Hale wipes the same knife clean twice and counts the bandages before he answers.',
    },
    quickActionExamples: [
      '"Press Hale on who was denied treatment. [Intimidation]"',
      '"Read which guard watches the food line too closely. [Perception]"',
      '"Drag the barricade brace back into place. [Athletics]"',
      '"Give up your share before anyone asks."',
    ],
    continuationEscalationExample:
      'Ch1 saved one mouth; Ch2 names who lost rations for it, turns a medic into a liability, and puts a grieving accuser in reach.',
  },
  noire: {
    ...GENERIC_EXAMPLES,
    entityBoundTriggers: [
      'When a lounge singer refuses a precinct fixer in front of a witness who can still change her statement.',
      'When the missing photograph is named where a blackmailer can hear.',
      'When an old client calls in a favor the PC thought died with the case.',
    ],
    sceneCoupledTriggers: [
      'When the detective reaches the back-office door.',
      'When the PC opens the file box beside the bar.',
    ],
    pcMisfitChapterRule:
      'A detective chapter is who lies, pays, threatens, or remembers, not a passive case-file review.',
    npcWorkedExample: {
      name: 'Lena Marr',
      role: 'lounge witness',
      body: 'Lena taps ash into an empty glass and smiles only after the piano stops covering the room.',
    },
    quickActionExamples: [
      '"Press Lena on who paid for the alibi. [Persuasion]"',
      '"Read which table stops talking when the photo appears. [Perception]"',
      '"Force the office window before the siren turns the corner. [Athletics]"',
      '"Let the lie hang until someone needs to fill it."',
    ],
    continuationEscalationExample:
      'Ch1 found the lie; Ch2 names who bought it, turns a witness into a target, and gives the precinct a reason to bury the PC.',
  },
}

export function getSf2GenreExamples(genreId?: string): Sf2GenreExamples {
  return EXAMPLES_BY_GENRE[genreId ?? ''] ?? EXAMPLES_BY_GENRE.hegemony
}
