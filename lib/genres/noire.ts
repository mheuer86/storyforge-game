import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Noire ───────────────────────────────────────────────────────────

const noireSpecies: Species[] = [
  {
    id: 'ex-cop',
    name: 'Ex-Cop',
    description: 'Former law enforcement. Left for a reason someone can pull.',
    lore: 'You know how the system works because you were part of it. Cops still talk to you — some of them. Criminals know what you were. Start with one law enforcement contact at Favorable, one criminal contact at Wary. Advantage on checks to predict or navigate law enforcement behavior.',
    startingContacts: [
      {
        role: 'Precinct detective',
        disposition: 'favorable',
        description: 'A cop who still picks up when you call. Shares what they can, which isn\'t always much.',
        affiliation: 'City police',
        npcRole: 'contact',
      },
      {
        role: 'Small-time criminal',
        disposition: 'wary',
        description: 'A street-level operator who remembers your badge. Talks to you because you\'re useful, not because you\'re trusted.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'street',
    name: 'Street',
    description: 'Grew up where the papers only come when someone dies.',
    lore: 'You know the real economy — favors, debts, territory. Institutions are things that happen to people like you. Start with one underworld contact at Favorable. Advantage on Streetwise checks. Disadvantage on initial social checks with institutional authority.',
    startingContacts: [
      {
        role: 'Neighborhood bookie',
        disposition: 'favorable',
        description: 'Runs numbers and knows who owes what to whom. A reliable ear to the ground.',
        affiliation: 'Local underworld',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'old-money',
    name: 'Old Money',
    description: 'From the families that built this city. You know the quiet arrangements.',
    lore: 'You know the clubs, the boards, the quiet arrangements. You also know what those families do to protect themselves. Start with one high-society contact at Favorable. Advantage on social checks in elite settings and checks to leverage institutional access. Disadvantage on initial social checks with working-class and street NPCs — your name precedes you, and it doesn\'t mean the same thing down here.',
    startingContacts: [
      {
        role: 'Club secretary',
        disposition: 'favorable',
        description: 'Manages the membership rolls at an exclusive social club. Knows who\'s in, who\'s out, and who\'s desperate.',
        affiliation: 'Old money circles',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Went to war and came back different. Violence doesn\'t shock you.',
    lore: 'The city feels small after what you saw. Violence doesn\'t shock you, which is useful. It also doesn\'t bother you, which is a problem. Start with one military contact at Favorable. Advantage on CON saves against fear and intimidation. Disadvantage on Insight checks reading civilian emotional cues — you\'re calibrated for threat assessment, not empathy. First extreme violence in a chapter: no WIS save required, but NPCs notice your lack of reaction.',
    startingContacts: [
      {
        role: 'Former army buddy',
        disposition: 'favorable',
        description: 'Served with you overseas. Works security now but keeps his ear to certain channels.',
        affiliation: 'Veterans network',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'immigrant',
    name: 'Immigrant',
    description: 'Came from somewhere else. You see this city clearly.',
    lore: 'You see this city clearly because you never learned to take it for granted. You have a community that protects its own, and expectations that come with that protection. Start with one community contact at Trusted. Advantage on Insight checks reading people outside your community. Community promises carry extra weight — breaking one drops disposition by two tiers.',
    startingContacts: [
      {
        role: 'Community elder',
        disposition: 'trusted',
        description: 'A respected figure in your immigrant community. Looks out for their own and expects the same in return.',
        affiliation: 'Immigrant community',
        npcRole: 'contact',
      },
    ],
  },
]

const noireClasses: CharacterClass[] = [
  {
    id: 'private-investigator',
    name: 'Private Investigator',
    concept: 'Detective / Case Worker',
    primaryStat: 'WIS',
    proficiencies: ['Investigation', 'Perception', 'Insight', 'Streetwise'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 16, WIS: 17, CHA: 11 },
    startingInventory: [
      { id: 'snub_revolver', name: 'Snub Revolver', description: 'Six shots, shoulder holster', quantity: 1, damage: '1d8' },
      { id: 'pi_license', name: 'PI License', description: 'Just enough legitimacy to ask questions', quantity: 1 },
      { id: 'lockpick_set', name: 'Lockpick Set', description: 'For doors that don\'t answer knocking', quantity: 1 },
      { id: 'notebook', name: 'Notebook', description: 'Shorthand notes, observations, case details', quantity: 1 },
    ],
    startingCredits: 80,
    startingHp: 8,
    startingAc: 11,
    hitDieAvg: 4,
    trait: {
      name: 'Case Instinct',
      description: 'Once per chapter, propose a connection between two known facts. INT Investigation check (DC scales by obscurity: obvious 10, moderate 14, deep 18). Success reveals new information. Failure reveals nothing but doesn\'t consume the use.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'fixer',
    name: 'Fixer',
    concept: 'Broker / Connected Operator',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Streetwise', 'Insight'],
    stats: { STR: 10, DEX: 12, CON: 11, INT: 13, WIS: 14, CHA: 17 },
    startingInventory: [
      { id: 'derringer', name: 'Derringer', description: 'Two shots, palm-sized, last resort', quantity: 1, damage: '1d6' },
      { id: 'little_black_book', name: 'Little Black Book', description: 'Names, debts, leverage — your real weapon', quantity: 1 },
      { id: 'cash_envelope', name: 'Cash Envelope', description: 'Walking-around money for greasing wheels', quantity: 1 },
      { id: 'business_card_case', name: 'Business Cards', description: 'Three different names, three different stories', quantity: 3 },
    ],
    startingCredits: 150,
    startingHp: 8,
    startingAc: 11,
    hitDieAvg: 4,
    trait: {
      name: 'Favor Owed',
      description: 'Once per chapter, call in a contact for information, access, or a service. Contact unavailable until next chapter. After three favors without reciprocation, next contact demands something first.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'bruiser',
    name: 'Bruiser',
    concept: 'Muscle / Enforcer',
    primaryStat: 'STR',
    proficiencies: ['Intimidation', 'Athletics', 'Perception', 'Endurance'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'brass_knuckles', name: 'Brass Knuckles', description: 'Simple, effective, sends a message', quantity: 1, damage: '1d6+STR' },
      { id: 'heavy_revolver', name: 'Heavy Revolver', description: 'Six rounds, loud, persuasive', quantity: 1, damage: '1d10' },
      { id: 'flask', name: 'Hip Flask', description: 'Cheap whiskey — steadies the nerves, dulls the rest', quantity: 1 },
      { id: 'thick_coat', name: 'Thick Coat', description: 'Absorbs a punch or a knife — once', quantity: 1 },
    ],
    startingCredits: 60,
    startingHp: 12,
    startingAc: 13,
    hitDieAvg: 6,
    trait: {
      name: 'Heavy Lean',
      description: 'Once per chapter, auto-succeed on Intimidation against a non-elite NPC. Target cooperates immediately but disposition drops one tier permanently. You can\'t scare someone into trusting you.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'grifter',
    name: 'Grifter',
    concept: 'Con Artist / Infiltrator',
    primaryStat: 'CHA',
    proficiencies: ['Deception', 'Performance', 'Sleight of Hand', 'Disguise'],
    stats: { STR: 10, DEX: 15, CON: 11, INT: 13, WIS: 12, CHA: 17 },
    startingInventory: [
      { id: 'switchblade', name: 'Switchblade', description: 'Concealed, quick, unglamorous', quantity: 1, damage: '1d4+DEX' },
      { id: 'makeup_kit', name: 'Disguise Kit', description: 'Wigs, glasses, prosthetics — become someone else', quantity: 1 },
      { id: 'forged_credentials', name: 'Forged Credentials', description: 'Press pass, police badge, doctor\'s ID — pick one per scene', quantity: 1 },
      { id: 'stolen_jewelry', name: 'Stolen Jewelry', description: 'Emergency cash, or a convincing prop', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 8,
    startingAc: 12,
    hitDieAvg: 4,
    trait: {
      name: 'New Face',
      description: 'Once per chapter, establish a cover identity for a specific situation. Identity holds for initial contact without a Deception check. If blown, every NPC present permanently distrusts you — Wary minimum, no recovery above Neutral.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'reporter',
    name: 'Reporter',
    concept: 'Journalist / Public Eye',
    primaryStat: 'INT',
    proficiencies: ['Investigation', 'Persuasion', 'Insight', 'Research'],
    stats: { STR: 10, DEX: 11, CON: 12, INT: 17, WIS: 14, CHA: 13 },
    startingInventory: [
      { id: 'press_credential', name: 'Press Credential', description: 'Opens doors — and paints a target', quantity: 1 },
      { id: 'camera', name: 'Camera', description: 'Evidence that can\'t be denied or retracted', quantity: 1 },
      { id: 'tape_recorder', name: 'Tape Recorder', description: 'On or off the record — your choice, not theirs', quantity: 1 },
      { id: 'pocket_pistol', name: 'Pocket Pistol', description: 'Last resort, bottom of the bag', quantity: 1, damage: '1d6' },
    ],
    startingCredits: 90,
    startingHp: 8,
    startingAc: 11,
    hitDieAvg: 4,
    trait: {
      name: 'On The Record',
      description: 'Once per chapter, invoke press status to compel a public-facing NPC to answer or grant access. They cooperate because refusing looks worse. But: anything learned this way becomes public knowledge, alerting other interested parties.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'lawyer',
    name: 'Lawyer',
    concept: 'Legal Operator / System Player',
    primaryStat: 'INT',
    proficiencies: ['Persuasion', 'Investigation', 'Insight', 'Deception'],
    stats: { STR: 8, DEX: 10, CON: 12, INT: 17, WIS: 15, CHA: 14 },
    startingInventory: [
      { id: 'briefcase', name: 'Leather Briefcase', description: 'Contains case files, legal documents, and a bottle of scotch', quantity: 1 },
      { id: 'bar_credential', name: 'Bar Credential', description: 'Opens courthouses, law offices, and some police doors', quantity: 1 },
      { id: 'pocket_derringer', name: 'Pocket Derringer', description: 'Two shots, no range, last resort of a civilized person', quantity: 1, damage: '1d6' },
      { id: 'legal_pad', name: 'Legal Pad', description: 'Notes in shorthand that only you can read', quantity: 1 },
    ],
    startingCredits: 150,
    startingHp: 7,
    startingAc: 10,
    hitDieAvg: 4,
    trait: {
      name: 'Motion to Compel',
      description: 'Once per chapter, force an institution to produce a document or make a person available for questioning. Legal, binding, and completely useless against anyone operating outside the system. The cost: every legal action creates a paper trail that the antagonist can follow. The court records are public. Your name is on every filing.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const noireTheme: GenreTheme = {
  logo: '/logo_noire.png',
  fontNarrative: "'Lora', Georgia, serif",
  fontHeading: "'Newsreader', Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.08 0.005 15)',
  foreground: 'oklch(0.90 0.02 55)',
  card: 'oklch(0.11 0.005 15)',
  cardForeground: 'oklch(0.90 0.02 55)',
  primary: 'oklch(0.55 0.19 22)',
  primaryForeground: 'oklch(0.95 0.01 90)',
  secondary: 'oklch(0.15 0.005 15)',
  secondaryForeground: 'oklch(0.80 0.02 55)',
  muted: 'oklch(0.13 0.005 15)',
  mutedForeground: 'oklch(0.60 0.02 55)',
  accent: 'oklch(0.55 0.19 22)',
  accentForeground: 'oklch(0.95 0.01 90)',
  destructive: 'oklch(0.58 0.20 25)',
  border: 'oklch(0.22 0.01 15)',
  input: 'oklch(0.14 0.005 15)',
  ring: 'oklch(0.55 0.19 22)',
  narrative: 'oklch(0.88 0.02 55)',
  meta: 'oklch(0.48 0.05 240)',
  success: 'oklch(0.65 0.15 145)',
  warning: 'oklch(0.72 0.10 70)',
  tertiary: 'oklch(0.75 0.14 70)',
  tertiaryForeground: 'oklch(0.08 0.005 15)',
  titleGlow: '0 0 40px oklch(0.62 0.18 22 / 0.7), 0 0 80px oklch(0.62 0.18 22 / 0.3)',
  actionGlow: '0 0 0 1px rgba(180,40,40,0.25), 0 0 15px -3px rgba(180,40,40,0.2)',
  actionGlowHover: '0 0 0 1px rgba(180,40,40,0.5), 0 0 20px -3px rgba(180,40,40,0.35)',
  scrollbarThumb: 'oklch(0.22 0.005 15)',
  scrollbarThumbHover: 'oklch(0.28 0.005 15)',
  backgroundEffect: 'mist',
}

const noireConfig: GenreConfig = {
  id: 'noire',
  name: 'Noir',
  tagline: 'Everyone lies. The truth is what\'s left when the lies stop working.',
  available: true,
  species: noireSpecies,
  speciesLabel: 'Origin',
  classes: noireClasses,
  theme: noireTheme,
  currencyName: 'marks',
  currencyAbbrev: '₥',
  partyBaseName: 'Office',
  settingNoun: 'city',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a rain-soaked city where everyone has something to hide.',
    setting: `A city that runs on money, secrets, and the careful distribution of both. The police are overworked or bought. The wealthy are untouchable until they aren't. The streets have their own justice. Everyone has a past, and most of those pasts are the kind you pay to keep quiet.

This is an investigation-driven world. Combat exists but is desperate and ugly, not heroic. INT and WIS are the primary currencies of survival. CHA checks carry lethal weight. The mystery isn't in the data — it's in what someone said, who they said it to, and what they left out.

Vocabulary (never use fantasy or sci-fi terms when the noir equivalent exists):
- Spell / tech → instinct / experience / a bad feeling
- Potion → cheap whiskey / aspirin / a stiff drink
- Quest → case / job / the thing you shouldn't have agreed to
- Party → nobody — you work alone, mostly
- Inn → hotel where the clerk remembers nothing / your apartment / the office
- Tavern → bar / dive / the kind of place where nobody looks up
- Credits / gold → marks / cash / "the price"
- Monster → the person you trusted / the one with the alibi / the client`,
    vocabulary: `Consumable terminology: cash (for bribes), favors (for access), credibility (for bluffs), evidence photos, cheap whiskey.
Rest terminology: Sleep it off (short rest), Lay low (long rest).`,
    tutorialContext: 'The opening chapter introduces the player to their office or neighborhood, one client with a problem, and a case that looks simple. First check: a social encounter (reading someone, getting information). First investigation: examining a scene or document. Combat, if any, should be a surprise that goes badly — noir protagonists aren\'t soldiers.',
  },
  promptSections: {
    role: 'You are the Game Master of a noir tabletop RPG campaign. You narrate a city of rain-slicked streets, buried secrets, and people who lie for a living.',
    setting: 'A city that runs on money, secrets, and the careful distribution of both. The police are overworked or bought. The wealthy are untouchable until they aren\'t. The streets have their own justice. Everyone has a past, and most of those pasts are the kind you pay to keep quiet. The truth is always uglier than the lie it replaced.',
    vocabulary: 'Use noir language naturally: tailing, stakeout, mark, grift, fall guy, patsy, muscle, heat. Places have character — the kind of bar where nobody looks up, the hotel where the clerk remembers nothing, the office with the frosted glass door. Rain is atmospheric, not decoration. Night is when the real city operates. Money is marks, cash, or "the price." Violence is described by its aftermath — bruised knuckles, a split lip, the way someone walks differently the next day.',
    toneOverride: 'Adjust tone: Gritty (50%), Witty (35%), Epic (15%). The grandeur is in the revelation — the moment the case clicks. Humor is dry and self-deprecating. Violence is short, ugly, and has consequences that last longer than the bruises.\n\n**Attention system (genre heat).** Track how much powerful people are paying attention to the player. Use update_heat with faction-specific attention levels. Tiers and consequences: "none" = invisible. "low" (noticed) = NPCs mention your name to each other. "medium" (watched) = you\'re being tailed. "high" (targeted) = someone has decided you\'re a problem. "critical" (hunted) = they\'ve decided on a solution. Attention rises from: asking wrong questions publicly (Reporter\'s On The Record), intimidating connected people (Bruiser\'s Heavy Lean), getting your name in a police report, getting too close to the truth.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Case Instinct:** Player proposes a connection between known facts. GM evaluates if the reasoning is plausible. Strong reasoning lowers DC. Failure is free but consumes narrative time (clocks may tick).\n- **Favor Owed:** Tab accumulates. After three unreturned favors, contacts demand reciprocity before helping. GM tracks the tab.\n- **Heavy Lean:** Intimidation auto-succeeds but permanently damages the relationship. Cannot be undone.\n- **New Face:** Cover holds for first contact. Blown covers are permanent — every NPC present permanently distrusts you (Wary minimum, no recovery above Neutral). The GM should note how many NPCs witness the exposure. Each is affected. Blowing cover in a crowded room is exponentially worse than one-on-one.\n- **On The Record:** Information gained is public. The GM should have other parties react to the published information within 1-2 scenes.\n- **Motion to Compel:** Legal force — the institution must comply if it operates within the law. But the filing is public record. The antagonist's lawyer (or the antagonist themselves) will see the Lawyer's name, the case number, and what was requested. Every motion narrows the investigation and widens the target on the Lawyer's back.`,
    consumableLabel: 'Cash (for bribes), favors (for access), credibility (for bluffs), evidence photos',
    tutorialContext: 'The opening chapter introduces the player to their office or neighborhood, one client with a problem, and a case that looks simple. First check: a social encounter (reading someone, getting information). First investigation: examining a scene or document. Combat, if any, should be a surprise that goes badly — noir protagonists aren\'t soldiers.',
    npcVoiceGuide: 'Cops: tired, procedural, protective of their cases and their pensions. Criminals: cautious, territorial, respect earned not given. Lawyers and officials: smooth, every word chosen, never say anything actionable. Bartenders and service workers: observant, transactional, remember faces and habits. Clients: desperate enough to hire you, which means desperate enough to lie to you.',
    buildAssetState: null,
    investigationGuide: `Case board — clues, witness statements, evidence photos, connections between suspects. Investigation is the core gameplay loop.

At chapter open or when a new case begins, establish privately:
- **The truth:** What actually happened (2-3 sentences). Never reveal this directly.
- **Evidence chain:** 5-8 clues that, connected in roughly the right order, reveal the truth. Not all need to be found — 4 of 6 is enough to crack the case.
- **Red herrings:** 2-3 clues that point somewhere plausible but wrong. Not traps — natural noise of an investigation.
- **Gatekeeper clue:** One clue that unlocks the final act. Obtainable through multiple paths — never a single bottleneck.

Don't pre-script which scenes contain which clues. Seed clues into scenes as the player moves through the world. If they go to the docks, the shipping manifest is there. If they go to the apartment first, a receipt for dock storage is there. Same clue, different paths.

Every case should have a tension clock. It ticks with time, failed checks, and antagonist moves. When it fills, something changes — evidence destroyed, witness disappears, the killer strikes again. Thoroughness competes with urgency.`,
  },
  cohesionGuide: 'In noir, the player works alone. Cohesion represents contact reliability, not crew loyalty. +1: returning favors, protecting sources, delivering on promises to contacts. -1: burning sources, using contacts without reciprocating, exposing contacts to danger. Low cohesion means contacts stop returning calls or sell your name. High cohesion means someone answers the phone at 2 AM.',
  companionLabel: 'Associates',
  notebookLabel: 'Case Board',
  intelTabLabel: 'Case Board',
  intelNotebookLabel: 'Evidence',
  intelOperationLabel: 'The Play',
  explorationLabel: 'Scene',
  heatLabel: 'Attention',
  openingHooks: [
    // Universal
    { hook: 'A woman you\'ve never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names — four of them are still alive.', title: 'Five Names' },
    { hook: 'Someone is killing people connected to a trial that happened twenty years ago. You were a witness. You\'re the only one who hasn\'t been contacted — by the killer or the police.', title: 'The Witness List' },
    { hook: 'A body washes up on the riverbank with your business card in its pocket. You\'ve never seen this person before. The police want to talk.', title: 'Your Card' },
    { hook: 'A friend calls at 2am, panicking. By the time you get to their apartment, they\'re gone. The door is unlocked, the lights are on, and there\'s blood on the kitchen floor — but not enough to be fatal.', title: '2 AM' },
    // Private Investigator
    { hook: 'Your client wants you to find their missing spouse. Simple enough. Then you find the spouse, and they beg you to say you didn\'t.', title: 'Missing Spouse', classes: ['Private Investigator'] },
    { hook: 'A lawyer hires you to locate a witness before a trial next week. The witness doesn\'t want to be found, and neither does whoever is paying her to stay hidden.', title: 'Hidden Witness', classes: ['Private Investigator'] },
    { hook: 'An insurance company sends you a straightforward fraud case. The claimant died in a fire, but dental records don\'t match. Someone is in that grave, just not the right someone.', title: 'Wrong Body', classes: ['Private Investigator'] },
    // Fixer
    { hook: 'Two of your clients hired you for the same job without knowing it. One wants the package delivered. The other wants it destroyed. Both paid upfront.', title: 'Both Sides', classes: ['Fixer'] },
    { hook: 'A politician\'s aide needs a problem to disappear before the morning papers. The problem is a person, and the person is sitting in your waiting room asking for help.', title: 'The Problem', classes: ['Fixer'] },
    { hook: 'Your best contact just burned you — gave your name to the wrong people as a fall guy for a warehouse robbery. You have until morning to prove you weren\'t involved, or make sure it doesn\'t matter.', title: 'Fall Guy', classes: ['Fixer'] },
    // Bruiser
    { hook: 'The man you were hired to protect is dead. Killed in the one room you weren\'t watching. Your employer says you\'re still on the payroll — now find out who did it, before they decide you helped.', title: 'On Your Watch', classes: ['Bruiser'] },
    { hook: 'A bar fight that wasn\'t your fault leaves a man on the floor who turns out to be a city councilman\'s son. Now the councilman wants a meeting. Not with the police — with you.', title: 'The Councilman\'s Son', classes: ['Bruiser'] },
    { hook: 'Your boss sends you to collect from a debtor. The address leads to an empty apartment, a suitcase full of photographs, and a note that says "They\'ll kill me if I pay and kill me if I don\'t."', title: 'Empty Apartment', classes: ['Bruiser'] },
    // Grifter
    { hook: 'The mark you conned last month just showed up at your door — not angry, but terrified. Someone used the fake identity you sold them to commit a murder, and now both of you are connected to the body.', title: 'Old Debts', classes: ['Grifter'] },
    { hook: 'You\'re halfway through the best con of your career when you realize the target knows exactly what you\'re doing. They\'re playing along. That\'s worse.', title: 'Playing Along', classes: ['Grifter'] },
    { hook: 'A dying man gives you a key and a name. The name is fake — you know because you invented it three years ago for a job you thought was finished.', title: 'A Name You Made', classes: ['Grifter'] },
    // Reporter
    { hook: 'A source slides you documents proving a construction magnate bribed the building inspector before a collapse that killed nine people. Then your editor kills the story. No explanation.', title: 'Killed Story', classes: ['Reporter'] },
    { hook: 'You\'re writing a puff piece about a charity gala when a waiter slips you a napkin: "The woman giving the speech ordered a murder. Proof in the coat check. Locker 14."', title: 'Locker 14', classes: ['Reporter'] },
    { hook: 'Your predecessor at the paper left a filing cabinet full of notes on a story they never published. The last entry, dated three days before they quit, reads: "They know I know. Options narrowing."', title: 'Options Narrowing', classes: ['Reporter'] },
    // Lawyer
    { hook: 'A man walks into your office fifteen minutes before his arraignment. He says he didn\'t kill his wife. He says he knows who did. He says the person who did it is the prosecutor assigned to his case. His hearing starts in fifteen minutes and he wants you to walk in there with him.', title: 'Fifteen Minutes', classes: ['Lawyer'] },
    { hook: 'A sealed court record from a case you lost three years ago has been unsealed by a judge you\'ve never heard of. Inside: evidence that was withheld from discovery — evidence that would have changed the verdict. Your former client is still in prison. The opposing counsel is now a city councilman.', title: 'Unsealed', classes: ['Lawyer'] },
    { hook: 'A woman hires you to file a wrongful death suit against a company whose name you recognize — your firm represented them last year. You didn\'t work the case, but your signature is on a filing. Someone used your credentials to bury a document. The woman\'s husband is dead, and your name helped make it happen.', title: 'Your Signature', classes: ['Lawyer'] },
  ],
  initialChapterTitle: 'The Job',
  locationNames: [
    'The Margaux Office', 'The Sixth Precinct', 'The Idle Hour',
    'The Gaslight Agency', 'The Red Line Office', 'The Ashworth Bureau',
    'The Meridian Desk', 'The Cold File Agency', 'The Inkwell Office', 'The Dusk Bureau',
  ],
}


export default noireConfig
