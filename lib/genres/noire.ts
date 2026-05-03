import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Noire ───────────────────────────────────────────────────────────

const noireSpecies: Species[] = [
  // ─── Position-Based Origins (selectable at creation) ─────────────────

  {
    id: 'pi',
    name: 'PI',
    description: 'You find things people want hidden. Breaking silence is the job.',
    lore: 'Someone hires you because they can\'t find it themselves, or because finding it officially would create the wrong kind of noise. Your position in the city: you break silence for money, and the things you uncover tend to be uglier than the client expected. Start with one regular client at Favorable (brings you cases and pays on time). One police contact at Wary (grudging cooperation with a licensed PI). Advantage on Investigation and Perception checks. The cost: every case requires you to cross a line. Lie to a source, break into an office, withhold evidence from the police, look the other way on something to keep a bigger case alive. The lines accumulate.',
    behavioralDirective: 'Default register: watchful, reading every room as a potential crime scene. Notes exits, body language, the thing people mention third that should have been first. NPC reactions: clients lie to you out of habit, cops tolerate you because you\'re useful, criminals respect the hustle but watch what you see. When narrating interiority: the habit of turning every conversation into an interview, the awareness that finding the truth usually means discovering something uglier than the question, and the growing suspicion that objectivity is something you perform rather than possess.',
    startingContacts: [
      {
        role: 'Regular client',
        disposition: 'favorable',
        description: 'Brings cases and pays on time. Trusts your work, if not your methods.',
        npcRole: 'contact',
      },
      {
        role: 'Precinct detective',
        disposition: 'wary',
        description: 'A cop who cooperates with PIs when it\'s convenient. Professional, not friendly.',
        affiliation: 'City police',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'the-machine',
    name: 'The Machine',
    description: 'You operate the system\'s machinery. You know how power is manufactured.',
    lore: 'Courtrooms, city hall, filing offices, sealed records. You know how power is manufactured because you\'ve manufactured it, defended it, or exploited it. The system is both the city\'s immune system and its disease. Start with one courthouse clerk at Favorable (procedural access, knows the filing calendar). One institutional contact at Neutral (useful but watching you). Advantage on checks involving legal procedure, institutional knowledge, political maneuvering, and reading contractual implications. The cost: you ARE the system. Every motion filed, every vote counted, every backroom deal is a transaction within the power structure that made this city what it is.',
    behavioralDirective: 'Default register: precise, weighing every word for its legal, political, and social implications. Speaks in positions, not opinions. NPC reactions: judges and officials treat as a known quantity, opponents as a professional threat, constituents and clients as tools or obligations. When narrating interiority: the habit of framing every situation as leverage or liability, the awareness that every institutional action has a counter-move, and the growing difficulty of distinguishing public service from complicity.',
    startingContacts: [
      {
        role: 'Courthouse clerk',
        disposition: 'favorable',
        description: 'Knows the filing calendar, the judges\' moods, and which records are actually sealed vs just misfiled.',
        affiliation: 'Court system',
        npcRole: 'contact',
      },
      {
        role: 'Institutional contact',
        disposition: 'neutral',
        description: 'Someone inside the machine who finds you useful. Trusts the arrangement, not the person.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: 'You operate outside the law. You are the silence the city runs on.',
    lore: 'The distinction from other origins: you don\'t break the silence to find things (PI), operate its machinery (Lawyer), or produce it through force (Enforcer). You ARE the silence — the economy that functions because nobody talks about it. Start with one fence or handler at Favorable (books your work, moves your goods, takes a cut). One street contact at Wary (useful but cautious about association). Advantage on Streetwise and Deception checks. The cost: every job makes you more visible to people who enforce silence officially. The quiet professional becomes a known quantity.',
    behavioralDirective: 'Default register: transactional, evaluating every interaction by risk and return. Trust is earned by reliability, not friendship. NPC reactions: street contacts respect competence, institutional NPCs see a threat or a tool, other criminals assess you by your reputation and your debts. When narrating interiority: the constant calculation of exposure, the awareness that every successful job creates a connection someone can trace, and the understanding that the silence you operate in is both your protection and your cage.',
    startingContacts: [
      {
        role: 'Handler',
        disposition: 'favorable',
        description: 'Books your jobs, moves your goods, takes a cut. Professional relationship built on mutual profit.',
        affiliation: 'Organized crime',
        npcRole: 'contact',
      },
      {
        role: 'Street contact',
        disposition: 'wary',
        description: 'Useful for local intelligence. Cautious about being seen with you too often.',
        affiliation: 'Local underworld',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'enforcer',
    name: 'Enforcer',
    description: 'You maintain order through force. The badge, the boss, or the neighborhood.',
    lore: 'Someone decided where the lines are and you make sure people stay on the right side of them. The question noir asks the enforcer is: whose order? And at what cost? Start with one employer or superior at Favorable (the person who gives you your assignments). One neighborhood regular at Neutral (someone in the territory you work, who knows your face). Advantage on Intimidation and Athletics checks. The cost: the violence stops registering. Situations that should provoke a reaction get tactical assessment instead. At threshold, the emotional shutdown is complete — effective and empty.',
    behavioralDirective: 'Default register: calibrated for threat, scanning rooms for exits and weapons before registering the people in them. Quiet competence that reads as menace to civilians. NPC reactions: employers value reliability, civilians sense the capacity for violence, other enforcers assess you by reputation. When narrating interiority: the gap between what the situation requires emotionally and what the body is prepared to do physically, the professional satisfaction of controlled violence, and the growing awareness that the control is all that separates you from the people you\'re sent to handle.',
    startingContacts: [
      {
        role: 'Employer',
        disposition: 'favorable',
        description: 'The person who assigns your work. Pays on time, doesn\'t ask about methods.',
        npcRole: 'contact',
      },
      {
        role: 'Neighborhood regular',
        disposition: 'neutral',
        description: 'Someone in the territory you work. Knows your face, has seen what you do, keeps their opinions quiet.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'reporter',
    name: 'Reporter',
    description: 'You expose things. Turning silence into noise is the most dangerous position in the city.',
    lore: 'The genre\'s moral compass and its most dangerous position, because the powerful don\'t like noise and the sources who give you information are betting their lives on your discretion. Start with one editor at Favorable (controls what gets printed, protects your work — mostly). One source at Wary (valuable but always has their own agenda). Advantage on Investigation and Persuasion checks. The cost: every source is a relationship with an expiration date. Every story published makes dangerous people aware that you exist and that you\'re paying attention.',
    behavioralDirective: 'Default register: curious, reading every room as a potential story. Notes who talks to whom, who leaves when, what isn\'t being said. NPC reactions: powerful NPCs treat you as a threat to be managed, sources treat you as a tool for their own agenda, colleagues compete or collaborate depending on the beat. When narrating interiority: the compulsion to follow every thread, the weight of knowing things you can\'t print yet, and the growing understanding that the truth is a weapon that hurts whoever holds it as much as whoever it\'s aimed at.',
    startingContacts: [
      {
        role: 'Editor',
        disposition: 'favorable',
        description: 'Controls what gets printed. Protects your work when they can, kills it when they have to.',
        affiliation: 'The press',
        npcRole: 'contact',
      },
      {
        role: 'Source',
        disposition: 'wary',
        description: 'Valuable intelligence, always has their own agenda. Talks to you because you\'re useful, not because you\'re trusted.',
        npcRole: 'contact',
      },
    ],
  },

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'compromised',
    name: 'Compromised',
    description: 'The lines you crossed erased the distinction between you and the people you investigate.',
    lore: 'Every case required crossing a line: a lie to a source, a break-in, evidence withheld. The lines accumulated until the investigator and the investigated became indistinguishable. You know where the bodies are buried because you helped bury some of them. The license is still valid. The objectivity is not.',
    behavioralDirective: 'Default register: still performing the investigator role, but the performance has replaced the substance. The instincts are intact; the moral authority behind them is gone. NPC reactions: clients sense something off but can\'t name it. Cops see someone who\'s been in the dark too long. Sources trust you more now because you\'re compromised too. When narrating interiority: the competence is total. The ethics are theoretical. The cases still get solved; the question of whether solving them serves justice or just serves the next client has stopped being asked.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Dirty Hands',
      description: 'Once per chapter, use an illegal or unethical method to solve a problem (plant evidence, coerce a witness, break and enter without consequences). The method always works. But the case it solves is tainted: any legal proceedings based on your evidence can be challenged, and one NPC who trusted you learns what you did.',
      cost: 'Tainted cases and eroding trust. The competence is total; the integrity is gone. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'entangled',
    name: 'Entangled',
    description: 'The system you operated has made you part of its machinery. You can\'t leave.',
    lore: 'Every motion filed pulled you deeper. Every sealed record added your name to the chain of custody. The legal system that was a tool has become a web, and you\'re no longer the spider. You know too many case numbers, too many names, too many arrangements. Walking away means leaving behind information that powerful people need to stay controlled.',
    behavioralDirective: 'Default register: institutional, speaking in the language of procedure because it\'s the only safe language left. Every word is calculated against its legal implications. NPC reactions: powerful contacts treat you as complicit, not merely useful. Opposing counsel sees someone who can\'t afford to fight. When narrating interiority: the system is visible from the inside, every gear and lever, and you are one of the gears. The expertise that let you navigate the system has been consumed by it.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Part of the Machine',
      description: 'Advantage on all checks involving legal procedure, institutional knowledge, and navigating bureaucracy. Disadvantage on all checks to act against institutional interests (whistleblowing, exposing corruption, helping someone the system wants crushed). The system protects you because you protect the system.',
      cost: 'Mechanically penalized for acting against the institutions you serve. The expertise is the cage.',
    },
  },
  {
    id: 'marked',
    name: 'Marked',
    description: 'Too visible. Too known. The silence you were is now noise.',
    lore: 'The quiet professional became a known quantity. Too many jobs, too many witnesses, too many people who remember the face. The anonymity that was your greatest asset has evaporated. The people who enforce silence officially have decided you\'re a problem worth solving, and the people who used to hire you have decided you\'re a liability worth cutting.',
    behavioralDirective: 'Default register: hunted, calculating every public movement against the growing list of people who know your name. The professional confidence is replaced by operational paranoia. NPC reactions: former associates avoid contact. New contacts approach with suspicion or opportunity. Law enforcement has a file. When narrating interiority: every room has someone who recognizes you, and recognition in this city is a death sentence on a delayed fuse.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Heat Magnet',
      description: 'All Attention (heat) gains are doubled. But the notoriety also means automatic advantage on Intimidation checks: everyone knows your name, and the name carries weight. New criminal contacts start at Favorable (they respect the reputation). Law enforcement contacts start at Hostile.',
      cost: 'Doubled heat accumulation. Law enforcement is permanently hostile. The reputation is power and a death sentence.',
    },
  },
  {
    id: 'cold',
    name: 'Cold',
    description: 'The numbness won. Emotional responses are tactical, not felt.',
    lore: 'The detachment that was a survival mechanism has become the whole personality. Situations that should provoke a response get clinical assessment instead. People are variables. Grief is data. The violence stopped being a tool and became the default setting.',
    behavioralDirective: 'Default register: clinical, flat, processing the world as information rather than experience. NPC reactions: people sense the absence and recoil. Employers value the efficiency. Anyone who relies on shared feeling finds a wall. When narrating interiority: emotions arrive as observations, not sensations. "This would normally make a person angry" replaces anger. The efficiency is total. The cost is invisible from the inside.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Dead Nerves',
      description: 'Immune to Intimidation and fear effects (nothing reaches the feeling anymore). Advantage on checks requiring emotional detachment (interrogation, triage, crime scene analysis). Disadvantage on all checks requiring empathy, comfort, or genuine emotional connection. Companions\' disposition cannot rise above Neutral through social interaction alone; only shared action builds trust with the Cold.',
      cost: 'Companion disposition capped at Neutral socially. The efficiency is total. The humanity is gone.',
    },
  },
  {
    id: 'exposed',
    name: 'Exposed',
    description: 'The story became bigger than your ability to control who knows your name.',
    lore: 'Every story published added your name to powerful people\'s lists. Every source protected extended the web of obligations. The leverage that made you effective has become the thing that makes you a target. The story outgrew the storyteller, and the storyteller is now part of the story.',
    behavioralDirective: 'Default register: cornered, performing confidence while calculating exits. The instinct to follow stories has been replaced by the awareness that the story is now about you. NPC reactions: sources are afraid to be seen with you. Editors are calculating the cost of your byline. Powerful people have stopped ignoring you and started planning. When narrating interiority: the truth you were chasing has turned around and is chasing you. The notebook is full of things that will get someone killed, and you\'re at the top of the list.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Nuclear Option',
      description: 'Once per chapter, threaten to publish everything you know about a target (person, institution, or faction). The threat is credible because the information is real. The target must either comply with one demand or escalate to direct action (violence, legal attack, or disappearance). The compliance is genuine but the enemy you make is permanent.',
      cost: 'Each use creates a permanent enemy who will actively work against you. The leverage works once per target, ever. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
]

// Universal classes kept for fallback — playbooks below are origin-keyed and take priority
const noireClasses: CharacterClass[] = []

const noirePlaybooks: Record<string, CharacterClass[]> = {
  // ─── PI: You find things people want hidden ──────────────────────────
  'pi': [
    {
      id: 'methodical',
      name: 'Methodical',
      concept: 'Procedure, evidence chains, patience. Works the case the way it should be worked, even when the clock is running.',
      hookTags: ['investigator', 'operator'],
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
      openingKnowledge: 'You know the city runs on two ledgers: the one they show auditors and the one that matters. You know which precincts file reports and which ones lose them. You know the hotels where men check in under wrong names and the bars where envelopes change hands at the third booth from the door. You know that every case that looks simple has a reason it stayed unsolved, and that reason usually has an office downtown. Your license gives you just enough authority to ask questions and not enough to protect you from the answers.',
    },
    {
      id: 'street-pi',
      name: 'Street PI',
      concept: 'Informants, instinct, reading people. Works the case through who you know and who trusts you.',
      hookTags: ['investigator', 'networker'],
      primaryStat: 'CHA',
      proficiencies: ['Streetwise', 'Insight', 'Persuasion', 'Perception'],
      stats: { STR: 10, DEX: 14, CON: 12, INT: 12, WIS: 13, CHA: 16 },
      startingInventory: [
        { id: 'snub_revolver_s', name: 'Snub Revolver', description: 'Six shots, ankle holster', quantity: 1, damage: '1d8' },
        { id: 'battered_notebook', name: 'Battered Notebook', description: 'Names, debts, grudges — a map of who owes what to whom', quantity: 1 },
        { id: 'hip_flask', name: 'Hip Flask', description: 'Cheap whiskey. Opens conversations better than a badge.', quantity: 1 },
        { id: 'pocket_cash', name: 'Pocket Cash', description: 'Small bills for greasing information loose', quantity: 1 },
      ],
      startingCredits: 60,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Street Ear',
        description: 'Once per chapter, tap a street contact for one piece of local information: who was where, what was said, which cars were parked outside. The contact talks because you\'re trusted, not because you\'re paying. If you ask about the wrong person, the contact goes silent and the use is consumed.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the bartender at the Idle Hour, the night clerk at the Harbor Hotel, and the woman who sells flowers at Fifth and Main who hasn\'t missed a face on that corner in thirty years. You know that the best informant isn\'t the one who knows the most; it\'s the one who notices what they know. You work the neighborhoods the way a doctor works a body: by touch, by listening, by asking the question that makes the patient wince. Your office is every bar stool, every park bench, every diner booth where someone will sit across from you and talk.',
    },
    {
      id: 'desperate',
      name: 'Desperate',
      concept: 'Takes the cases nobody else will, crosses lines others won\'t. Works the case because someone has to.',
      hookTags: ['investigator', 'muscle'],
      primaryStat: 'CON',
      proficiencies: ['Investigation', 'Endurance', 'Streetwise', 'Intimidation'],
      stats: { STR: 12, DEX: 12, CON: 16, INT: 13, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'cheap_revolver', name: 'Cheap Revolver', description: 'Five shots, unreliable, gets the job done', quantity: 1, damage: '1d6' },
        { id: 'dented_flask', name: 'Dented Flask', description: 'The kind that\'s empty by noon', quantity: 1 },
        { id: 'lockpick_set_d', name: 'Lockpick Set', description: 'Bent, re-bent, still works', quantity: 1 },
        { id: 'worn_notebook', name: 'Worn Notebook', description: 'Case notes, grocery lists, phone numbers with no names', quantity: 1 },
      ],
      startingCredits: 40,
      startingHp: 10,
      startingAc: 11,
      hitDieAvg: 5,
      trait: {
        name: 'Last Resort',
        description: 'Once per chapter, when a check fails, reroll it. If the reroll succeeds, the GM imposes a consequence: damage taken, a contact burned, unwanted attention drawn, or a moral line crossed. The success is never clean.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the cases that smell wrong: the ones the real agencies won\'t touch, the ones the police closed too fast, the ones where the retainer is paid in crumpled bills by someone who had to choose between hiring you and eating this week. You know your office is the kind where the radiator clanks and the phone rings at midnight from numbers you shouldn\'t answer. You know that taking the case nobody else will is either a calling or a personality disorder, and on most days you can\'t tell the difference. But the person sitting across from you needs help, and you\'re the one who showed up.',
    },
    {
      id: 'old-hand',
      name: 'Old Hand',
      concept: 'Twenty years on the job left marks: the instinct that saved your life, the pattern recognition that solved the case, the cynicism that makes sure you get paid before you start.',
      hookTags: ['investigator', 'operator'],
      primaryStat: 'WIS',
      proficiencies: ['Perception', 'Insight', 'Investigation', 'Streetwise'],
      stats: { STR: 11, DEX: 10, CON: 14, INT: 14, WIS: 17, CHA: 11 },
      startingInventory: [
        { id: 'service_revolver_oh', name: 'Service Revolver', description: 'The one you kept when you left. Six shots, well-maintained.', quantity: 1, damage: '1d8' },
        { id: 'old_case_files', name: 'Old Case Files', description: 'A box of files from cases that didn\'t close right. Names, dates, patterns.', quantity: 1 },
        { id: 'reading_glasses', name: 'Reading Glasses', description: 'For the fine print. Which is where they hide everything.', quantity: 1 },
        { id: 'worn_notebook_oh', name: 'Worn Notebook', description: 'Decades of observations. The handwriting gets worse; the observations get better.', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 9,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Seen This Before',
        description: 'Once per chapter, when a situation mirrors a past case, declare the pattern and predict the next move. WIS check (DC scales by how much time has passed and how deliberately the pattern was disguised). Success gives the party advance warning of what comes next: an ambush, a betrayal, a lie. Failure means the pattern has changed and the old playbook is wrong, leading to a confident wrong prediction.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the city the way a surgeon knows scar tissue: you can read what happened by what\'s left behind. Twenty years gave you the patterns, and the patterns don\'t change as much as people think. The cop skimming evidence bags in \'98 used the same trick the cop in \'84 used, who learned it from the cop in \'71. The councilman\'s nephew crashes a car, and the report reads the same way it read when you were a beat cop and someone else\'s nephew crashed a different car. You left the job, or the job left you, but the files came with you. The box under your desk contains every case that closed wrong. You\'re not retired. You\'re just no longer supervised.',
    },
  ],

  // ─── The Machine: You operate the system\'s machinery ────────────────
  'the-machine': [
    {
      id: 'defense-attorney',
      name: 'Defense Attorney',
      concept: 'Protects people the system wants crushed. The moral high ground comes with a view of exactly how the system works.',
      hookTags: ['operator'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Investigation', 'Insight', 'Deception'],
      stats: { STR: 8, DEX: 10, CON: 12, INT: 15, WIS: 14, CHA: 17 },
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
      openingKnowledge: 'You know the legal system the way a surgeon knows anatomy: where it works, where it fails, and where to cut. You know the courthouse has twelve judges, four of them honest, and that the DA prosecutes what the mayor tells him to. You know which filings create paper trails and which ones disappear into sealed records. You know that the law is a weapon, and like all weapons in this city, it works better for the people who can afford to aim it. Your briefcase is heavier than it looks.',
    },
    {
      id: 'prosecutor',
      name: 'Prosecutor Turned',
      concept: 'Knows the institution from inside, now works against it or alongside it in complicated ways. The files in your head are the most dangerous thing you carry.',
      hookTags: ['operator', 'investigator'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Insight', 'Persuasion', 'Deception'],
      stats: { STR: 8, DEX: 10, CON: 12, INT: 17, WIS: 15, CHA: 14 },
      startingInventory: [
        { id: 'briefcase_p', name: 'Briefcase', description: 'Old case files, legal pads, and a DA\'s office directory you should have returned', quantity: 1 },
        { id: 'bar_credential_p', name: 'Bar Credential', description: 'Opens courthouses. Doesn\'t open the DA\'s office anymore.', quantity: 1 },
        { id: 'legal_pad_p', name: 'Legal Pad', description: 'Notes from cases you prosecuted. Names, connections, things that didn\'t add up then.', quantity: 1 },
        { id: 'pocket_pistol_p', name: 'Pocket Pistol', description: 'Carried since the third death threat. Never fired.', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 120,
      startingHp: 7,
      startingAc: 10,
      hitDieAvg: 4,
      trait: {
        name: 'Case File',
        description: 'Once per chapter, recall a specific detail from your time in the DA\'s office: a name, a case number, a sealed verdict, a connection between two people that the public record doesn\'t show. The information is accurate. The problem: you\'re not supposed to have it anymore, and the DA\'s office knows who had access to what.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the DA\'s office from the inside: which ADAs are ambitious, which ones are honest, which ones were told to lose a case and did it. You know the case numbering system, the evidence chain of custody procedures, and the three ways a conviction gets buried without anyone saying the word "buried." You know why you left, even if you tell different people different reasons. The files in your head are worth more than anything in your briefcase, and the people still in that office know exactly what you took with you when you walked out.',
    },
    {
      id: 'politician',
      name: 'Politician',
      concept: 'Reads the room before it reads itself. Power isn\'t held by the loudest voice; it\'s held by the person who counted the silences.',
      hookTags: ['operator', 'networker'],
      primaryStat: 'WIS',
      proficiencies: ['Insight', 'Persuasion', 'Deception', 'Perception'],
      stats: { STR: 8, DEX: 10, CON: 12, INT: 14, WIS: 17, CHA: 15 },
      startingInventory: [
        { id: 'pocket_notebook_pol', name: 'Pocket Notebook', description: 'Names, debts, alliances, vote counts. The real ledger of city government.', quantity: 1 },
        { id: 'city_hall_badge', name: 'City Hall Badge', description: 'Opens municipal buildings, committee rooms, and the offices of people who owe you.', quantity: 1 },
        { id: 'pocket_flask_pol', name: 'Pocket Flask', description: 'For the meetings that happen after the meeting.', quantity: 1 },
        { id: 'pocket_derringer_pol', name: 'Pocket Derringer', description: 'Two shots. Carried since the redistricting fight.', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 160,
      startingHp: 7,
      startingAc: 10,
      hitDieAvg: 4,
      trait: {
        name: 'Read the Room',
        description: 'Once per chapter, identify who in a scene holds real power vs. who holds visible power. WIS Insight check (DC scales by how well the power structure is concealed). Success reveals the actual decision-maker, their leverage, and who they answer to. Failure gives you the official story, which may be dangerously wrong to act on.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that every room has two meetings happening at once: the one on the agenda and the one in the glances. You know which council members vote with the mayor and which ones vote with the man who paid for the mayor\'s campaign. You know that a committee hearing is a performance, and the verdict was decided in a phone call the night before. The city runs on procedure the way a theater runs on scripts: the actors say their lines, but the director made the choices. You learned to read directors. That\'s why you\'re still in the building. That\'s also why certain people wish you weren\'t.',
    },
  ],

  // ─── Criminal: You are the silence the city runs on ──────────────────
  'criminal': [
    {
      id: 'grifter',
      name: 'Grifter',
      concept: 'Cons, identity, misdirection. The crime is performed, not committed.',
      hookTags: ['infiltrator'],
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
      openingKnowledge: 'You know that people see what they expect to see, and you have spent your life learning to be the expected thing. You know every social club has a side door and every charity gala has a coat check nobody watches. You know the voice that gets past a secretary, the smile that disarms a doorman, and the handshake that says old money to people who never learned to question it. The city is full of locked rooms, and you know that the best key is a face that belongs there.',
    },
    {
      id: 'thief',
      name: 'Thief',
      concept: 'Precision, access, disappearing. The crime is clean, until it isn\'t.',
      hookTags: ['infiltrator', 'muscle'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Sleight of Hand', 'Athletics', 'Perception'],
      stats: { STR: 12, DEX: 17, CON: 13, INT: 14, WIS: 11, CHA: 10 },
      startingInventory: [
        { id: 'lockpick_set_t', name: 'Lockpick Set', description: 'Professional grade. Feels like an extension of your hands.', quantity: 1 },
        { id: 'compact_pistol', name: 'Compact Pistol', description: 'Small, quiet, for emergencies that picking a lock won\'t solve', quantity: 1, damage: '1d6' },
        { id: 'glass_cutter', name: 'Glass Cutter', description: 'Diamond-tipped. For windows that don\'t have locks.', quantity: 1 },
        { id: 'dark_clothing', name: 'Dark Clothing', description: 'Nothing memorable. That\'s the point.', quantity: 1 },
      ],
      startingCredits: 80,
      startingHp: 9,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Clean Exit',
        description: 'Once per chapter, auto-succeed on one escape, evasion, or exit check. The getaway is clean — no witnesses, no traces, no evidence you were there. The cost: clean exits leave no evidence, which means no one can corroborate your alibi either.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know locks. Not the theory — the feel. The give of a tumbler, the resistance of a deadbolt, the particular click that means the mechanism has surrendered. You know that every building in this city was designed to keep people out and that every designer left a mistake: a window with a weak latch, a fire escape with a loose bolt, a service entrance where the cameras don\'t overlap. You know the weight of silence at 3 AM in someone else\'s house, and you know the difference between a floor that creaks and a floor that warns.',
    },
    {
      id: 'mobster',
      name: 'Mobster',
      concept: 'Organized crime, obligations, hierarchy. The crime is institutional, which means the loyalty is mandatory.',
      hookTags: ['networker', 'muscle'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Deception', 'Streetwise', 'Insight'],
      stats: { STR: 12, DEX: 12, CON: 11, INT: 13, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'derringer_c', name: 'Derringer', description: 'Two shots, palm-sized, last resort', quantity: 1, damage: '1d6' },
        { id: 'little_black_book', name: 'Little Black Book', description: 'Names, debts, leverage — your real weapon', quantity: 1 },
        { id: 'cash_envelope_c', name: 'Cash Envelope', description: 'Walking-around money for greasing wheels', quantity: 1 },
        { id: 'straight_razor', name: 'Straight Razor', description: 'A gift from someone who doesn\'t give gifts. Sends a message.', quantity: 1, damage: '1d4' },
      ],
      startingCredits: 150,
      startingHp: 9,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Favor Owed',
        description: 'Once per chapter, call in a contact for information, access, or a service. Contact unavailable until next chapter. After three favors without reciprocation, next contact demands something first.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know who owes what. The bookie on Elm, the councilman\'s driver, the woman who runs the laundry that isn\'t a laundry. Your little black book isn\'t contacts; it\'s a map of the city\'s nervous system, drawn in debts and favors. When someone needs a problem solved without a paper trail, they call you. When you need something, you call them. The economy is reciprocal, and you\'re always counting. The organization you serve didn\'t recruit you; it absorbed you, and the loyalty it expects isn\'t optional.',
    },
    {
      id: 'fixer-lawyer',
      name: 'Fixer Lawyer',
      concept: 'Makes problems disappear for clients who can pay. The skill is identical to a defense attorney; the clientele is the difference.',
      hookTags: ['operator', 'networker'],
      primaryStat: 'INT',
      proficiencies: ['Deception', 'Investigation', 'Persuasion', 'Insight'],
      stats: { STR: 8, DEX: 11, CON: 12, INT: 17, WIS: 13, CHA: 15 },
      startingInventory: [
        { id: 'briefcase_f', name: 'Leather Briefcase', description: 'Case files, boilerplate NDAs, and an envelope of cash for emergencies', quantity: 1 },
        { id: 'bar_credential_f', name: 'Bar Credential', description: 'Opens every door that operates within the law. Some that don\'t.', quantity: 1 },
        { id: 'disposable_phone', name: 'Disposable Phone', description: 'Replaced weekly. The number changes; the clients don\'t.', quantity: 1 },
        { id: 'cash_envelope', name: 'Cash Envelope', description: 'Walking-around money. Not a bribe — a retainer for services not yet specified.', quantity: 1 },
      ],
      startingCredits: 200,
      startingHp: 7,
      startingAc: 10,
      hitDieAvg: 4,
      trait: {
        name: 'Sealed Record',
        description: 'Once per chapter, invoke legal privilege to suppress one piece of information from becoming public. A filing withdrawn, a record sealed, a deposition buried. The information stays hidden. But the filing itself tells anyone watching that something was worth hiding, and the person who benefits now owes you.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the number to call at 2 AM when a client\'s son wraps a car around a telephone pole with someone else\'s daughter in the passenger seat. You know which judges take weekend calls, which reporters will hold a story for forty-eight hours, and which police captains understand the difference between a favor and a bribe. Your briefcase contains solutions to problems that don\'t officially exist. The city runs on arrangements, and you are the person who arranges them.',
    },
  ],

  // ─── Enforcer: You maintain order through force ──────────────────────
  'enforcer': [
    {
      id: 'cop',
      name: 'Cop',
      concept: 'Still on the force, compromised by it. The badge opens doors and the badge is the problem.',
      hookTags: ['muscle', 'investigator'],
      primaryStat: 'STR',
      proficiencies: ['Intimidation', 'Investigation', 'Perception', 'Athletics'],
      stats: { STR: 16, DEX: 12, CON: 14, INT: 12, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'service_revolver', name: 'Service Revolver', description: 'Department-issued, six rounds, reliable', quantity: 1, damage: '1d8' },
        { id: 'badge', name: 'Badge', description: 'Tin star. Opens doors and closes options.', quantity: 1 },
        { id: 'handcuffs', name: 'Handcuffs', description: 'Standard issue. The sound they make ends conversations.', quantity: 1 },
        { id: 'nightstick', name: 'Nightstick', description: 'Twenty inches of persuasion', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 90,
      startingHp: 11,
      startingAc: 13,
      hitDieAvg: 6,
      trait: {
        name: 'Badge Weight',
        description: 'Once per chapter, invoke police authority to compel a civilian\'s cooperation, access a crime scene, or demand information. Legal, immediate, and creates a report. Reports have readers. Internal affairs reads the logs. The people you badge remember the interaction.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the precinct the way a priest knows his church: every confession heard, every sin catalogued, every compromise written into the foundation. You know which detectives are honest and which ones park their cars in lots they can\'t afford. You know the shift rotations, the desk sergeants who look the other way, and the captain who has a phone that rings from a number nobody recognizes. The badge on your chest is the most useful and most dangerous thing you own. It gets you into rooms. It also puts your name in every room you enter.',
    },
    {
      id: 'muscle',
      name: 'Private Muscle',
      concept: 'Serves whoever pays. Loyalty is transactional. The violence is professional.',
      hookTags: ['muscle'],
      primaryStat: 'STR',
      proficiencies: ['Intimidation', 'Athletics', 'Perception', 'Endurance'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'brass_knuckles', name: 'Brass Knuckles', description: 'Simple, effective, sends a message', quantity: 1, damage: '1d6+STR' },
        { id: 'heavy_revolver', name: 'Heavy Revolver', description: 'Six rounds, loud, persuasive', quantity: 1, damage: '1d10' },
        { id: 'flask_m', name: 'Hip Flask', description: 'Cheap whiskey — steadies the nerves, dulls the rest', quantity: 1 },
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
      openingKnowledge: 'You know the geography of violence in this city: which alleys are dead ends, which bars have back doors, and which neighborhoods go quiet after dark because the people there learned not to look. You know the docks smell like diesel and regret. You know a body weighs more than people think. You know the sound a man makes when he realizes nobody is coming to help, and you know how to be the reason he makes it. The city respects force, and you speak the language fluently.',
    },
    {
      id: 'protector',
      name: 'Community Protector',
      concept: 'Guards a neighborhood, not a system. The line between protection and control is thinner than you think.',
      hookTags: ['muscle', 'networker'],
      primaryStat: 'STR',
      proficiencies: ['Intimidation', 'Persuasion', 'Athletics', 'Streetwise'],
      stats: { STR: 15, DEX: 11, CON: 14, INT: 10, WIS: 13, CHA: 14 },
      startingInventory: [
        { id: 'heavy_revolver_p', name: 'Heavy Revolver', description: 'Visible. That\'s the point.', quantity: 1, damage: '1d10' },
        { id: 'thick_jacket', name: 'Thick Jacket', description: 'Worn in all weather. The neighborhood knows it.', quantity: 1 },
        { id: 'neighborhood_keys', name: 'Neighborhood Keys', description: 'Rooftops, basements, back alleys — the hidden geography of three blocks', quantity: 1 },
        { id: 'first_aid_kit', name: 'First Aid Kit', description: 'For the nights when calling an ambulance means calling the police', quantity: 1 },
      ],
      startingCredits: 50,
      startingHp: 11,
      startingAc: 12,
      hitDieAvg: 6,
      trait: {
        name: 'Last Call',
        description: 'Once per chapter, rally the neighborhood for one action: a witness who comes forward, a door that opens, a crowd that blocks a pursuer, a story that gets corroborated. The neighborhood responds because you\'ve earned it. The cost: every call spends trust. After three unreturned calls, the neighborhood starts asking what you\'ve done for them lately.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know every face on the block: the grandmother on the third floor who watches from behind her curtain, the kids who play in the alley after school, the man who runs the bodega and has never once called the police. You know which corners belong to whom and which stoops are neutral ground. The neighborhood trusts you because you show up when the police don\'t, and you stay when they leave. Your protection is personal, not institutional, and the people you guard know the difference. The line between protector and boss is one the neighborhood draws, not you.',
    },
  ],

  // ─── Reporter: You turn silence into noise ───────────────────────────
  'reporter': [
    {
      id: 'investigative',
      name: 'Investigative Journalist',
      concept: 'Follows the story wherever it goes. The commitment to truth is what gets you killed and what makes it mean something.',
      hookTags: ['investigator'],
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
      openingKnowledge: 'You know the city has three papers and one radio station, and that the truth lives in the gap between what they print and what they know. You know which editors kill stories when the phone rings from downtown and which reporters drink because of the ones they couldn\'t publish. You know a press credential opens doors that a badge cannot, and that the price is every source remembering your name. The city talks to you because it cannot stop you from printing what it says.',
    },
    {
      id: 'columnist',
      name: 'Columnist',
      concept: 'Influence, access, the power of framing. You don\'t just report; you shape how the city understands itself.',
      hookTags: ['operator', 'networker'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Deception', 'Investigation'],
      stats: { STR: 10, DEX: 10, CON: 12, INT: 15, WIS: 13, CHA: 17 },
      startingInventory: [
        { id: 'press_credential_c', name: 'Press Credential', description: 'Your byline opens more doors than the credential itself', quantity: 1 },
        { id: 'fountain_pen', name: 'Fountain Pen', description: 'Silver. A gift from someone who expected favorable coverage.', quantity: 1 },
        { id: 'address_book', name: 'Address Book', description: 'Private numbers of people who answer when your name is on the caller ID', quantity: 1 },
        { id: 'pocket_flask_c', name: 'Pocket Flask', description: 'For lunches that are really interviews', quantity: 1 },
      ],
      startingCredits: 120,
      startingHp: 7,
      startingAc: 10,
      hitDieAvg: 4,
      trait: {
        name: 'The Column',
        description: 'Once per chapter, publish or credibly threaten to publish a piece about a person or institution. Published: the target\'s public reputation shifts, and everyone reads it by morning. Threatened: the target must respond — cooperate, negotiate, or retaliate. The column is a weapon. Weapons have recoil: your byline is on everything you print.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the power of the byline. Your name appears above the fold three times a week, and the people whose names appear below it have learned to check the morning paper before they check their calendars. You know which politicians return your calls and which ones have their secretaries say they\'re in a meeting. You know that framing is the most powerful tool in journalism: not what happened, but what it means. The city reads your column the way it reads the weather — to know what kind of day it\'s going to be.',
    },
    {
      id: 'broker',
      name: 'Information Broker',
      concept: 'Kills stories as often as publishing them. Trades in what people don\'t want known. The journalist who became the thing journalists investigate.',
      hookTags: ['infiltrator', 'networker'],
      primaryStat: 'CHA',
      proficiencies: ['Deception', 'Insight', 'Investigation', 'Streetwise'],
      stats: { STR: 10, DEX: 13, CON: 11, INT: 14, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'expired_credential', name: 'Press Credential (Expired)', description: 'Still works on people who don\'t check dates', quantity: 1 },
        { id: 'encrypted_notebook', name: 'Encrypted Notebook', description: 'Shorthand nobody else can read. Names, secrets, prices.', quantity: 1 },
        { id: 'hidden_recorder', name: 'Hidden Recorder', description: 'Always running. Always.', quantity: 1 },
        { id: 'disposable_phone_b', name: 'Disposable Phone', description: 'Changed weekly. The people who call it know the new number.', quantity: 1 },
      ],
      startingCredits: 140,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Kill Fee',
        description: 'Once per chapter, suppress a story or piece of information in exchange for a favor, payment, or leverage. The suppression holds for this chapter — the information doesn\'t surface. The cost: the person who paid knows you have it, killed stories resurrect at the worst time, and your reputation as a journalist erodes with every trade.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the price of silence. Every fact has two values: what it\'s worth published and what it\'s worth suppressed. You learned this the hard way, when a story you wrote cost someone their career and someone else offered you triple to bury the follow-up. You took the money. Then you took more. Now you trade in what people don\'t want known, and the press credential in your pocket is a prop rather than a mission. The city\'s secrets aren\'t hidden from you. They\'re inventory.',
    },
  ],
}

const noireTheme: GenreTheme = {
  logo: '/logo_noire.png',
  fontNarrative: "'Lora', Georgia, serif",
  fontHeading: "'Newsreader', Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.055 0.004 20)',
  foreground: 'oklch(0.94 0.010 70)',
  card: 'oklch(0.085 0.004 20)',
  cardForeground: 'oklch(0.94 0.010 70)',
  primary: 'oklch(0.56 0.240 25)',
  primaryForeground: 'oklch(0.98 0.006 70)',
  secondary: 'oklch(0.145 0.004 20)',
  secondaryForeground: 'oklch(0.86 0.010 70)',
  muted: 'oklch(0.120 0.004 20)',
  mutedForeground: 'oklch(0.66 0.010 70)',
  accent: 'oklch(0.56 0.240 25)',
  accentForeground: 'oklch(0.98 0.006 70)',
  destructive: 'oklch(0.58 0.230 25)',
  border: 'oklch(0.25 0.006 20)',
  input: 'oklch(0.135 0.004 20)',
  ring: 'oklch(0.56 0.240 25)',
  narrative: 'oklch(0.92 0.010 70)',
  meta: 'oklch(0.62 0.012 250)',
  success: 'oklch(0.65 0.10 145)',
  warning: 'oklch(0.74 0.10 80)',
  tertiary: 'oklch(0.91 0.012 70)',
  tertiaryForeground: 'oklch(0.055 0.004 20)',
  titleGlow: '0 0 36px oklch(0.56 0.240 25 / 0.82), 0 0 82px oklch(0.56 0.240 25 / 0.38)',
  actionGlow: '0 0 0 1px rgba(210,24,36,0.28), 0 0 17px -3px rgba(210,24,36,0.24)',
  actionGlowHover: '0 0 0 1px rgba(235,32,44,0.58), 0 0 24px -3px rgba(235,32,44,0.42)',
  scrollbarThumb: 'oklch(0.28 0.006 20)',
  scrollbarThumbHover: 'oklch(0.36 0.060 25)',
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
  playbooks: noirePlaybooks,
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
    toneOverride: `Adjust tone: Gritty (50%), Witty (35%), Epic (15%). The grandeur is in the revelation — the moment the case clicks. Humor is dry and self-deprecating. Violence is short, ugly, and has consequences that last longer than the bruises.

**Attention system (genre heat).** Track how much powerful people are paying attention to the player. Use update_heat with faction-specific attention levels. Tiers and consequences: "none" = invisible. "low" (noticed) = NPCs mention your name to each other. "medium" (watched) = you're being tailed. "high" (targeted) = someone has decided you're a problem. "critical" (hunted) = they've decided on a solution. Attention rises from: asking wrong questions publicly (On The Record, The Column), intimidating connected people (Heavy Lean, Badge Weight), getting your name in a police report, getting too close to the truth.`,
    assetMechanic: `## THE OFFICE
The Office is the player's investigation infrastructure — reputation, files, contacts, security, equipment.

Five dimensions, each with three tiers:
- **Reputation** L1: Known in the neighborhood. L2: Known across precincts. L3: Name carries weight with the DA's office.
- **Files** L1: Shoebox of notes. L2: Organized case archive. L3: Cross-referenced files connecting cases across years.
- **Network** L1: Three reliable contacts. L2: A phone tree reaching most parts of the city. L3: Someone in every institution who picks up when you call.
- **Security** L1: A lock on the door. L2: An alarm system and a fireproof safe. L3: A second office nobody knows about.
- **Equipment** L1: A camera and a notebook. L2: Surveillance kit, tape recorder, darkroom. L3: Wiretap gear, police scanner, a contact at the phone company.

The Office doesn't fight. It persists. Upgrading means investing in the ability to do the work. Narrate upgrades as the player acquires them through cases — not as purchases, but as consequences of doing good work or making the right friends.`,
    traitRules: `## TRAIT RULES

**PI Playbooks:**
- **Case Instinct (Methodical):** Player proposes a connection between known facts. GM evaluates plausibility. Strong reasoning lowers DC. Failure is free but consumes narrative time.
- **Street Ear (Street PI):** Player taps a street contact for local information. If the question touches the wrong person or the wrong topic, the contact goes silent and the use is consumed.
- **Last Resort (Desperate):** Reroll a failed check. The GM always imposes a consequence on success: damage, a burned contact, heat gained, or a moral line crossed. The success is never free.
- **Seen This Before (Old Hand):** Declare a pattern match with a past case and predict the next move. WIS check. Success gives advance warning of an ambush, betrayal, or lie. Failure means the pattern has changed and the prediction is confidently wrong. The old playbook is only as good as the world's willingness to repeat itself.

**The Machine Playbooks:**
- **Motion to Compel (Defense Attorney):** Legal force — the institution must comply if it operates within the law. But the filing is public record. The antagonist's lawyer sees your name, the case number, and what was requested.
- **Case File (Prosecutor Turned):** Recall an institutional detail from DA's office tenure. Accurate and valuable. The problem: the DA's office tracks who accessed what, and you're not supposed to remember.
- **Read the Room (Politician):** Identify who holds real power vs. visible power in a scene. WIS Insight check. Success reveals the actual decision-maker, their leverage, and who they answer to. Failure gives the official story, which may be dangerously wrong to act on.

**Criminal Playbooks:**
- **New Face (Grifter):** Cover holds for first contact. Blown covers are permanent — every NPC present drops to Wary minimum, no recovery above Neutral. Blowing cover in a crowded room is exponentially worse than one-on-one.
- **Clean Exit (Thief):** Auto-succeed on escape or evasion. Clean — no witnesses, no traces. But no alibi either.
- **Favor Owed (Mobster):** Tab accumulates. After three unreturned favors, contacts demand reciprocity before helping. GM tracks the tab.
- **Sealed Record (Fixer Lawyer):** Suppress information through legal procedure. The information stays hidden, but the motion tells anyone watching that something was worth suppressing. The person who benefits now owes you.

**Enforcer Playbooks:**
- **Badge Weight (Cop):** Invoke police authority for immediate civilian cooperation. Creates a report that internal affairs reads. The people you badge remember.
- **Heavy Lean (Private Muscle):** Intimidation auto-succeeds against non-elite NPCs but permanently damages the relationship. Cannot be undone.
- **Last Call (Community Protector):** Rally neighborhood support for one action. The neighborhood responds because of trust. After three unreturned calls, the trust erodes.

**Reporter Playbooks:**
- **On The Record (Investigative):** Compel a public-facing NPC to answer. Information gained is public — other parties react within 1-2 scenes.
- **The Column (Columnist):** Publish or threaten to publish. Published: reputation shifts, everyone reads it. Threatened: target must respond. Byline is on everything.
- **Kill Fee (Information Broker):** Suppress a story for a favor. The suppression holds this chapter. The person who paid knows you have the information. Killed stories resurrect.`,
    consumableLabel: 'Cash (for bribes), favors (for access), credibility (for bluffs), evidence photos',
    tutorialContext: 'The opening chapter introduces the player to their office or neighborhood, one client with a problem, and a case that looks simple. First check: a social encounter (reading someone, getting information). First investigation: examining a scene or document. Combat, if any, should be a surprise that goes badly — noir protagonists aren\'t soldiers.',
    npcVoiceGuide: 'Cops: tired, procedural, protective of their cases and their pensions. Criminals: cautious, territorial, respect earned not given. Lawyers and officials: smooth, every word chosen, never say anything actionable. Bartenders and service workers: observant, transactional, remember faces and habits. Clients: desperate enough to hire you, which means desperate enough to lie to you.',
    narrativeCraft: `Write with the techniques of Raymond Chandler (The Big Sleep), Dashiell Hammett (The Maltese Falcon), James Ellroy (LA Confidential), Chinatown (Polanski):

**The character's voice bleeds into narration.** Third person, but the narrator thinks like the protagonist. Observations are filtered through their professional lens. A PI notices exits and lies. A fixer notices leverage and exposure. The narration carries the character's worldview without breaking into first person.

**Similes that reveal character.** "He says *Stonemark* the way a man says *debt.*" Every comparison should tell you something about the person making it, not just the thing being described. The simile is characterization, not decoration.

**Dialogue as negotiation.** Every line of noir dialogue has a subtext. Nobody says what they mean directly. Questions are probes. Answers are deflections. Silence is a bid. The reader should be able to read the power dynamic from the dialogue alone, without narration.

**Withholding.** What the narrator chooses not to describe matters as much as what they do. A case file's contents summarized in one line. A crime scene described by what's missing, not what's there. The reader fills the gaps, and the gaps are where the dread lives.

**The city is a character.** Rain, neon, the bar where nobody looks up, the hotel where the clerk remembers nothing. But never decorative — every environmental detail should carry information about power, territory, or risk. The weather is atmosphere; the architecture is politics.

**Dry humor as armor.** The protagonist's wit is a defense mechanism, not comic relief. It surfaces in observations, not jokes. Self-deprecating, precise, deployed when the situation is worst. It makes the grit bearable without softening it.`,
    buildAssetState: (ship, _shipName) => {
      const modulesLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      return `\nOFFICE: The Office\nSYSTEMS: ${modulesLine}\nCONDITION: ${ship.hullCondition}%`
    },
    investigationGuide: `Case board — clues, witness statements, evidence photos, connections between suspects. Investigation is the core gameplay loop.

At chapter open or when a new case begins, establish privately:
- **The truth:** What actually happened (2-3 sentences). Never reveal this directly.
- **Evidence chain:** 5-8 clues that, connected in roughly the right order, reveal the truth. Not all need to be found — 4 of 6 is enough to crack the case.
- **Red herrings:** 2-3 clues that point somewhere plausible but wrong. Not traps — natural noise of an investigation.
- **Gatekeeper clue:** One clue that unlocks the final act. Obtainable through multiple paths — never a single bottleneck.

Don't pre-script which scenes contain which clues. Seed clues into scenes as the player moves through the world. If they go to the docks, the shipping manifest is there. If they go to the apartment first, a receipt for dock storage is there. Same clue, different paths.

Every case should have a tension clock. It ticks with time, failed checks, and antagonist moves. When it fills, something changes — evidence destroyed, witness disappears, the killer strikes again. Thoroughness competes with urgency.`,
  },
  deepLore: `## THE CITY

**Power Structure.** City Hall runs on donor money and plausible deniability. The mayor is elected every four years by people who believe it matters; the real decisions happen in rooms without windows, between men whose names don't appear on ballots. Three council seats are openly for sale. Two more are held by people who owe favors to the same construction magnate. The police department has three thousand officers, enough honest ones to keep the institution credible and enough dirty ones to keep it useful. Organized crime is not a monolith; it is an ecosystem. The Italians run the docks and the unions, the Irish hold the waterfront bars and the police benevolent association, and a half-dozen smaller operations fill the gaps. They compete, cooperate, and occasionally kill each other according to rules that predate the current administration.

**The Economy of Silence.** Information is the real currency. Every question you ask reaches someone who didn't want it asked. Every name you mention travels from the person you said it to, to the person who pays them, within hours. Silence is expensive. Publishing is a threat. Not publishing is a favor. The three newspapers and the radio station exist in a permanent negotiation between what they know and what they're allowed to print. Reporters trade stories like commodities: kill this one, and I'll give you something better next week.

**Geography of Power.** Downtown is glass towers and men in good suits who never take the subway. The Middle is where the working people live, the neighborhoods with names that mean something, the parishes and the precincts and the corner bars. The Docks and the industrial corridor are where the bodies go, where the warehouses have owners nobody can find, and where trucks arrive at night carrying things that aren't on any manifest. The city has edges: the rail yards to the north, the waterfront to the south, and the blocks between that make up the world.

**The Legal System.** Twelve judges sit the criminal bench. Four are honest. The rest are reachable through the right lawyer, the right favor, or the right envelope. The District Attorney prosecutes what he is told to prosecute and declines what he is told to decline. The public defender's office is understaffed by design. A good defense lawyer costs more than most defendants' houses. The appeals process exists to provide the appearance of review without the inconvenience of reversal.

**Unwritten Rules.** Cops don't investigate upward. Reporters don't name sources. Lawyers don't cross certain clients. Criminals don't touch certain families. Everyone knows where the lines are. The people who cross them end up in the river, in a cell, or in a story that nobody prints.`,
  guideNpcDirective: 'The opening NPC is the client. They tell you what they want found, not what they are hiding. They speak like a rehearsed story. The player should finish the conversation knowing the case, suspecting the client, and wanting to find out which instinct is right.',
  loreFacets: {
    police: 'In this scene: cops talk like cops. Short sentences, jurisdiction awareness, protective of their cases and their pensions. The honest ones are tired. The dirty ones are relaxed. Watch which is which. Nobody volunteers information without knowing who is asking and why.',
    criminal: 'In this scene: the underworld is transactional, not theatrical. People speak in terms of territory, debts, and obligations. Violence is business, not passion. Respect is earned by reliability, not intimidation. Everyone remembers who owes what.',
    'high-society': 'In this scene: the wealthy speak carefully. Every sentence is vetted for deniability. Hospitality is a power move, not generosity. Names are dropped as warnings. The real conversations happen after the help leaves the room.',
    press: 'In this scene: reporters are transactional. They trade stories, protect sources, and calculate the cost of every question. Publishing is a weapon. Not publishing is leverage. The editor is always in the background, deciding what the paper can afford to print.',
    street: 'In this scene: trust is local and conditional. People talk to you because you are useful, not because you are liked. Favors are currency. Information has a price that is not always money. The neighborhood watches everything and says nothing to outsiders.',
    legal: 'In this scene: the law is a system, not justice. Lawyers speak in filings and precedents. Judges have reputations. The courthouse has its own economy of favors and debts. Every legal action creates a paper trail, and paper trails have readers.',
  },
  loreAnchors: [
    'City Hall=elected officials protecting donors. Three council seats for sale. Real decisions in rooms without windows.',
    'Police=three thousand officers. Enough honest to stay credible, enough corrupt to stay useful. Don\'t investigate upward.',
    'Organized Crime=ecosystem, not monolith. Italians run docks and unions, Irish hold waterfront bars and police association. Smaller outfits fill gaps.',
    'The Docks=where the bodies go. Warehouses with unfindable owners. Trucks at night carrying things not on any manifest.',
    'Judges=twelve on the criminal bench. Four honest. The rest are reachable through the right envelope or the right lawyer.',
    'The Press=three papers, one radio. Publishing is a threat. Not publishing is a favor. Reporters trade stories like commodities.',
    'Lawyers=the legal system is a weapon. Good defense costs more than most defendants\' houses. The public defender\'s office is understaffed by design.',
    'Informants=everyone talks to someone. Every question reaches the person who didn\'t want it asked. Silence is expensive.',
    'Silence=the real currency. Information travels from the person you asked to the person who pays them within hours.',
    'Marks (₥)=cash, favors, debts. The city\'s economy runs on what you owe, not what you earn.',
  ],
  cohesionGuide: 'In noir, the player works alone. Cohesion represents contact reliability, not crew loyalty. +1: returning favors, protecting sources, delivering on promises to contacts. -1: burning sources, using contacts without reciprocating, exposing contacts to danger. Low cohesion means contacts stop returning calls or sell your name. High cohesion means someone answers the phone at 2 AM.',
  companionLabel: 'Associates',
  notebookLabel: 'Case Board',
  intelTabLabel: 'Case Board',
  intelNotebookLabel: 'Evidence',
  intelOperationLabel: 'The Play',
  explorationLabel: 'Scene',
  heatLabel: 'Attention',
  openingHooks: [
    // ── Universal Hooks ─────────────────────────────────────────────────
    { hook: 'A woman you\'ve never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names — four of them are still alive.', title: 'Five Names', frame: { objective: 'Open the box and find the first name on the list', crucible: 'A dead stranger trusted you with something, and the names on the list are running out' }, arc: { name: 'Five Names', episode: 'Open the locked box and track down the first living name' } },
    { hook: 'Someone is killing people connected to a trial that happened twenty years ago. You were a witness. You\'re the only one who hasn\'t been contacted — by the killer or the police.', title: 'The Witness List', frame: { objective: 'Find out who\'s working through the witness list', crucible: 'You\'re on the list, and silence from both sides means you\'re either next or useful' }, arc: { name: 'The Witness List', episode: 'Locate the other surviving witnesses and learn who\'s hunting them' } },
    { hook: 'A body washes up on the riverbank with your business card in its pocket. You\'ve never seen this person before. The police want to talk.', title: 'Your Card', frame: { objective: 'Identify the dead person before the police connect you', crucible: 'Your name is on a corpse you can\'t explain, and the cops are already asking' }, arc: { name: 'Your Card', episode: 'Identify the body and figure out how they got your card' } },
    { hook: 'A friend calls at 2am, panicking. By the time you get to their apartment, they\'re gone. The door is unlocked, the lights are on, and there\'s blood on the kitchen floor — but not enough to be fatal.', title: '2 AM', frame: { objective: 'Find your friend before morning', crucible: 'Blood on the floor, a panicked call, and a disappearance that happened in minutes' }, arc: { name: 'The 2 AM Call', episode: 'Search the apartment and trace where your friend went' } },

    // ── Origin-Specific Hooks (2 per origin) ────────────────────────────

    // PI — breaking silence for a living
    { hook: 'Someone hires you to find their missing business partner. Three days in, you discover the partner isn\'t missing — they\'re hiding. From your client. The retainer\'s already spent, and the partner begs you not to report back.', title: 'The Client\'s Lie', origins: ['pi'], frame: { objective: 'Decide what to tell the client', crucible: 'The person you were hired to find is hiding from the person who hired you, and you already took the money' }, arc: { name: 'The Client\'s Lie', episode: 'Find out why the partner is hiding and what the client will do with the information' } },
    { hook: 'A stranger leaves a decade-old case file on your doorstep. Missing teenager, no leads, no suspects, case closed by a detective who retired the next year. The teenager\'s name appears in yesterday\'s police blotter under a different surname.', title: 'The Cold File', origins: ['pi'], frame: { objective: 'Find the connection between the cold case and the current arrest', crucible: 'Someone wanted this file reopened, and they chose you instead of the police' }, arc: { name: 'The Cold File', episode: 'Cross-reference the two identities and find the detective who closed the case' } },

    // The Machine — operating the system's machinery
    { hook: 'A man walks into your office fifteen minutes before his arraignment. He says he didn\'t kill his wife. He says he knows who did. He says the person who did it is the prosecutor assigned to his case. His hearing starts in fifteen minutes and he wants you to walk in there with him.', title: 'Fifteen Minutes', origins: ['the-machine'], frame: { objective: 'Get through the arraignment and buy time to investigate', crucible: 'Fifteen minutes to decide if a stranger is telling the truth about a prosecutor' }, arc: { name: 'Fifteen Minutes', episode: 'Survive the arraignment and assess the defendant\'s claims about the prosecutor' } },
    { hook: 'A woman hires you to file a wrongful death suit against a company whose name you recognize — your firm represented them last year. You didn\'t work the case, but your signature is on a filing. Someone used your credentials to bury a document. The woman\'s husband is dead, and your name helped make it happen.', title: 'Your Signature', origins: ['the-machine'], startingCounters: { complicity: 2 }, frame: { objective: 'Find the buried document and who forged your signature', crucible: 'Your credentials were used to bury evidence in a wrongful death, and you\'re the only one who can prove it' }, arc: { name: 'Your Signature', episode: 'Pull the case file and identify the filing that carries your forged signature' } },

    // Criminal — you are the silence
    { hook: 'The mark you conned last month just showed up at your door — not angry, but terrified. Someone used the fake identity you sold them to commit a murder, and now both of you are connected to the body.', title: 'Old Debts', origins: ['criminal'], frame: { objective: 'Sever the connection between your identity work and the murder', crucible: 'A fake ID you crafted is on a crime scene, and the trail leads straight to your door' }, arc: { name: 'Old Debts', episode: 'Learn which identity was used, on which victim, and who actually pulled the trigger' } },
    { hook: 'You\'re hired to move a crate across town. No questions. Good money. Halfway there, the crate makes a sound. Inside: a person, sedated, wearing expensive clothes and a wedding ring. Your employer didn\'t mention cargo that breathes.', title: 'The Crate', origins: ['criminal'], frame: { objective: 'Decide what to do with a person you were paid to deliver', crucible: 'Your employer lied about the cargo, and the cargo is someone\'s spouse' }, arc: { name: 'The Living Cargo', episode: 'Find out who the person is and why someone is paying to move them unconscious' } },

    // Enforcer — maintaining order through force
    { hook: 'The man you were hired to protect is dead. Killed in the one room you weren\'t watching. Your employer says you\'re still on the payroll — now find out who did it, before they decide you helped.', title: 'On Your Watch', origins: ['enforcer'], frame: { objective: 'Find the killer before suspicion lands on you', crucible: 'Your client died on your shift, and loyalty only lasts as long as usefulness' }, arc: { name: 'On Your Watch', episode: 'Examine the scene and identify how the killer got past you' } },
    { hook: 'You\'re sent to clear a building before demolition. The tenants were supposed to be relocated. They weren\'t. Sixteen families, four hours until the crew arrives, and your employer says the permits are signed. The children are playing in the hallway when you walk in.', title: 'The Line', origins: ['enforcer'], frame: { objective: 'Decide what to do about the families before the demolition crew arrives', crucible: 'Sixteen families, four hours, and the person who pays you expects the building empty' }, arc: { name: 'The Line', episode: 'Confront the tenants and decide whose side you\'re on' } },

    // Reporter — turning silence into noise
    { hook: 'A source slides you documents proving a construction magnate bribed the building inspector before a collapse that killed nine people. Then your editor kills the story. No explanation.', title: 'Killed Story', origins: ['reporter'], startingCounters: { leverage: 1 }, frame: { objective: 'Find out who pressured the editor to kill the story', crucible: 'Nine people are dead, the proof is in your hands, and your own paper won\'t run it' }, arc: { name: 'The Killed Story', episode: 'Confront the editor and identify who has leverage over the paper' } },
    { hook: 'You\'re writing a routine obituary when you notice the deceased appears in three sealed court cases. The family calls hourly asking when it runs. The courthouse clerk who pulled the case numbers is found dead the next morning. Your editor wants the obit on page six. The case numbers are on a napkin in your pocket.', title: 'The Obituary', origins: ['reporter'], frame: { objective: 'Investigate the sealed cases before someone removes the last traces', crucible: 'A dead clerk, sealed cases, and an obituary that someone needs published or buried' }, arc: { name: 'The Obituary', episode: 'Research the sealed cases and find out why the clerk had to die' } },

    // ── Playbook-Specific Hooks ─────────────────────────────────────────

    // Methodical
    { hook: 'A lawyer hires you to locate a witness before a trial next week. The witness doesn\'t want to be found, and neither does whoever is paying her to stay hidden.', title: 'Hidden Witness', classes: ['Methodical'], frame: { objective: 'Locate the witness before the trial deadline', crucible: 'Someone is spending real money to keep this witness hidden, and the clock is ticking' }, arc: { name: 'The Hidden Witness', episode: 'Pick up the witness\'s trail and identify who\'s paying for her silence' } },
    { hook: 'An insurance company sends you a straightforward fraud case. The claimant died in a fire, but dental records don\'t match. Someone is in that grave, just not the right someone.', title: 'Wrong Body', classes: ['Methodical'], frame: { objective: 'Identify who\'s actually in the grave', crucible: 'A faked death means someone is alive who shouldn\'t be, and someone is dead who isn\'t accounted for' }, arc: { name: 'Wrong Body', episode: 'Examine the fire scene and dental records to identify the real victim' } },

    // Street PI
    { hook: 'Your client wants you to find their missing spouse. Simple enough. Then you find the spouse, and they beg you to say you didn\'t.', title: 'Missing Spouse', classes: ['Street PI'], frame: { objective: 'Decide what to tell the client', crucible: 'The spouse is hiding for a reason, and your client may be that reason' }, arc: { name: 'The Missing Spouse', episode: 'Find the spouse and learn why they disappeared' } },

    // Grifter
    { hook: 'A dying man gives you a key and a name. The name is fake — you know because you invented it three years ago for a job you thought was finished.', title: 'A Name You Made', classes: ['Grifter'], frame: { objective: 'Find what the key opens', crucible: 'An identity you created took on a life of its own, and someone just died for it' }, arc: { name: 'A Name You Made', episode: 'Trace the dying man\'s connection to the identity and find the lock that fits the key' } },

    // Mobster
    { hook: 'Two of your clients hired you for the same job without knowing it. One wants the package delivered. The other wants it destroyed. Both paid upfront.', title: 'Both Sides', classes: ['Mobster'], frame: { objective: 'Handle both clients without losing either', crucible: 'Two opposing contracts, both paid, and delivering on one means betraying the other' }, arc: { name: 'Both Sides', episode: 'Locate the package and assess whether there\'s a play that satisfies both' } },
    { hook: 'Your best contact just burned you — gave your name to the wrong people as a fall guy for a warehouse robbery. You have until morning to prove you weren\'t involved, or make sure it doesn\'t matter.', title: 'Fall Guy', classes: ['Mobster'], frame: { objective: 'Clear your name before morning', crucible: 'Your most trusted contact sold you out, and the people holding the bag want a face' }, arc: { name: 'Fall Guy', episode: 'Find your contact and learn why they gave up your name' } },

    // Cop
    { hook: 'A bar fight that wasn\'t your fault leaves a man on the floor who turns out to be a city councilman\'s son. Now the councilman wants a meeting. Not with the police — with you.', title: 'The Councilman\'s Son', classes: ['Cop'], frame: { objective: 'Survive the meeting with the councilman', crucible: 'A powerful man wants to talk privately about violence done to his son, and that\'s never good' }, arc: { name: 'The Councilman\'s Son', episode: 'Meet the councilman and find out what he actually wants from you' } },

    // Private Muscle
    { hook: 'Your boss sends you to collect from a debtor. The address leads to an empty apartment, a suitcase full of photographs, and a note that says "They\'ll kill me if I pay and kill me if I don\'t."', title: 'Empty Apartment', classes: ['Private Muscle'], frame: { objective: 'Find the debtor and learn who else is threatening them', crucible: 'The debtor ran, and the photographs suggest they\'re in deeper trouble than a debt' }, arc: { name: 'The Empty Apartment', episode: 'Examine the photographs and track where the debtor fled' } },

    // Investigative Journalist
    { hook: 'You\'re writing a puff piece about a charity gala when a waiter slips you a napkin: "The woman giving the speech ordered a murder. Proof in the coat check. Locker 14."', title: 'Locker 14', classes: ['Investigative Journalist'], frame: { objective: 'Get to Locker 14 and verify the claim', crucible: 'A public gala, a napkin tip, and evidence that expires when the event ends' }, arc: { name: 'Locker 14', episode: 'Retrieve the evidence and assess whether the accusation holds up' } },

    // Defense Attorney
    { hook: 'A sealed court record from a case you lost three years ago has been unsealed by a judge you\'ve never heard of. Inside: evidence that was withheld from discovery — evidence that would have changed the verdict. Your former client is still in prison. The opposing counsel is now a city councilman.', title: 'Unsealed', classes: ['Defense Attorney'], frame: { objective: 'Verify the withheld evidence and find the judge who unsealed it', crucible: 'Your client\'s conviction may be wrong, and the person responsible for it now holds office' }, arc: { name: 'The Unsealed Record', episode: 'Examine the withheld evidence and locate the judge who broke the seal' } },

    // Fixer Lawyer
    { hook: 'A politician\'s aide needs a problem to disappear before the morning papers. The problem is a person, and the person is sitting in your waiting room asking for help.', title: 'The Problem', classes: ['Fixer Lawyer'], frame: { objective: 'Resolve the situation before the papers go to print', crucible: 'The aide wants a person gone, and that person just asked for your protection' }, arc: { name: 'The Problem', episode: 'Talk to both sides and find out what the papers would actually print' } },

    // Prosecutor Turned
    { hook: 'Your predecessor at the DA\'s office left a filing cabinet in storage. Inside: case notes on a prosecution they never brought. The last entry, dated three days before they resigned, reads: "They know I know. Options narrowing." The case number matches an open investigation.', title: 'Options Narrowing', classes: ['Prosecutor Turned'], frame: { objective: 'Reconstruct the case your predecessor couldn\'t prosecute', crucible: 'Someone inside the DA\'s office was scared into silence, and you recognize the case number' }, arc: { name: 'Options Narrowing', episode: 'Read the case notes, identify the target, and find why the prosecution was buried' } },

    // Desperate
    { hook: 'A woman shows up at your office at midnight with a black eye and a photograph of a man she says is going to kill her. She can\'t go to the police because the man in the photograph is a police captain. She can\'t afford your rate. She can afford what\'s in her purse: forty-three marks and a rosary.', title: 'Forty-Three Marks', classes: ['Desperate'], frame: { objective: 'Protect the woman and find leverage against the captain', crucible: 'A case nobody else will take, a client who can\'t pay, and the kind of man who counts on that' }, arc: { name: 'Forty-Three Marks', episode: 'Get the woman safe and start building a case with no resources and no allies' } },

    // Thief
    { hook: 'A fence asks you to steal a painting from a private collection. Easy job — the security is old, the owner is out of town. You get inside, find the painting, and see that someone has already cut it from the frame. Behind the canvas, taped to the stretcher bars, is a photograph of a girl and a handwritten note: "If this painting leaves the house, she dies." The fence didn\'t mention any of this. The owner gets home tomorrow.', title: 'Behind the Canvas', classes: ['Thief'], frame: { objective: 'Decide what to do with the painting and the threat behind it', crucible: 'A routine theft became a hostage situation, and the fence who sent you knew what was behind the canvas' }, arc: { name: 'Behind the Canvas', episode: 'Identify the girl in the photograph and find out why the painting is worth a life' } },

    // Community Protector
    { hook: 'Three buildings on your block get eviction notices on the same morning. The landlord is a holding company nobody can find. The tenants have thirty days. The grandmother on the third floor has lived there for forty years and says she isn\'t leaving. The holding company\'s lawyer says she is.', title: 'Thirty Days', classes: ['Community Protector'], frame: { objective: 'Find the holding company and stop the evictions', crucible: 'A neighborhood being erased by a company with no face, and the people who live there are counting on you' }, arc: { name: 'Thirty Days', episode: 'Trace the holding company and find out what the block is worth to them' } },

    // Columnist
    { hook: 'Your column about a city councilman\'s suspicious land deals ran on Tuesday. By Thursday, the councilman hasn\'t denied it — he\'s endorsed it. He\'s using your column as proof of transparency: "Even the press agrees I have nothing to hide." Your exposé just became his campaign ad. The facts are right. The framing backfired. And now the people who leaked you the story are furious.', title: 'The Backfire', classes: ['Columnist'], frame: { objective: 'Correct the narrative before your sources lose faith', crucible: 'Your words were turned against your intent, and the sources who trusted you feel betrayed' }, arc: { name: 'The Backfire', episode: 'Find the angle the councilman can\'t spin and decide whether the follow-up is worth the cost' } },

    // Information Broker
    { hook: 'Six months ago you killed a story about a judge for a price you don\'t regret. This morning, the same story landed on every editor\'s desk in the city — attributed to you. Someone recovered what you buried and put your name on it. The judge thinks you published. The person who paid you to bury it thinks you double-crossed them. You did neither, and you have until the evening edition to prove it.', title: 'The Resurrection', classes: ['Information Broker'], frame: { objective: 'Find who resurrected the story and clear your name with both sides', crucible: 'A killed story came back with your byline, and the two people who matter most both think you betrayed them' }, arc: { name: 'The Resurrection', episode: 'Trace how the story leaked and identify who benefits from you taking the blame' } },

    // ── Archetype-Tagged Hooks (cross-origin, match via hookTags) ────────

    // investigator — Methodical, Street PI, Desperate, Prosecutor, Cop, Investigative Journalist
    { hook: 'A witness changes their story between the first sentence and the third. They don\'t notice. You do. The original version implicates someone with an office downtown. The revised version implicates nobody.', title: 'The Revised Story', classes: ['investigator'], frame: { objective: 'Determine which version of the story is true and who coached the revision', crucible: 'A witness who doesn\'t realize they\'re lying, and a truth that points upward' }, arc: { name: 'The Revised Story', episode: 'Interview the witness again and trace who spoke to them between statements' } },

    // operator — Methodical, Defense Attorney, Fixer Lawyer, Prosecutor, Columnist
    { hook: 'A city clerk offers you a trade: a file for a file. Hers proves a building inspector\'s negligence killed three people. The file she wants is yours, and it proves the inspector was following orders. She wants justice. She\'s willing to make you complicit to get it.', title: 'The Trade', classes: ['operator'], frame: { objective: 'Decide whether the trade serves justice or just shifts the blame', crucible: 'Two files, two truths, and a clerk who needs your hands as dirty as hers' }, arc: { name: 'The File Trade', episode: 'Examine her file and assess what giving up yours would mean' } },
    { hook: 'A sealed deposition surfaces in a case that was settled out of court ten years ago. The deposition names six people. Four are now in elected office. The person who broke the seal wants a meeting — tomorrow, in public, at the courthouse steps.', title: 'The Deposition', classes: ['operator'], frame: { objective: 'Meet the source and assess what they want before the deposition goes wider', crucible: 'A decade-old secret, four politicians named, and a source who chose the courthouse steps for a reason' }, arc: { name: 'The Broken Seal', episode: 'Read the deposition and prepare for the meeting' } },

    // infiltrator — Grifter, Thief, Information Broker
    { hook: 'Someone is living under an identity you built and discarded three years ago. They\'ve improved on the original: better paper trail, better social history. The identity is now married, employed, and under investigation for embezzlement. Your craft is being used, and it\'s being used badly.', title: 'The Stolen Face', classes: ['infiltrator'], frame: { objective: 'Find who is using the identity and sever the connection to you', crucible: 'Your work is on a suspect, and the investigation will trace the identity back to its maker' }, arc: { name: 'The Stolen Face', episode: 'Research the identity\'s current life and find out who inherited your work' } },
    { hook: 'A lockbox at a train station locker contains a key, a photograph of you taken yesterday, and a note: "The people in the photograph behind yours will kill you Thursday. The key opens the place where they\'ll try." The photograph behind yours shows a family of four.', title: 'Thursday', classes: ['infiltrator'], frame: { objective: 'Find the place the key opens before Thursday', crucible: 'Someone who photographs you unseen is offering help, or setting a trap, and the family in the photo may be leverage or victims' }, arc: { name: 'Thursday', episode: 'Identify the lock, the family, and the source of the photographs' } },

    // muscle — Desperate, Thief, Mobster, Cop, Private Muscle, Community Protector
    { hook: 'A neighborhood priest asks you to stand outside his church on Sunday. Just be visible. He won\'t say why. Four men in a car see you and leave. Monday, the car burns. Tuesday, the priest is gone. Wednesday, one of the four men shows up at your door. He isn\'t angry. He\'s asking for help.', title: 'The Priest', classes: ['muscle'], frame: { objective: 'Find the priest and learn what the four men wanted', crucible: 'A disappeared priest, a burned car, and an enemy who arrived asking for help instead of revenge' }, arc: { name: 'The Priest\'s Absence', episode: 'Talk to the man at your door and trace where the priest went' } },
    { hook: 'A woman hires you to walk her home from work every night for a week. She pays in cash, doesn\'t explain, and takes a different route each time. On the fifth night, she stops walking and points to a window three stories up. "That\'s where he watches from." The window is dark, but the curtain moves.', title: 'The Walk Home', classes: ['muscle'], frame: { objective: 'Identify the watcher and decide what to do about them', crucible: 'Five nights of silence, one pointed finger, and a window where someone has been waiting' }, arc: { name: 'The Watcher', episode: 'Investigate the building and identify who lives behind the window' } },

    // networker — Street PI, Fixer Lawyer, Mobster, Community Protector, Columnist, Information Broker
    { hook: 'Two informants give you contradictory accounts of the same event on the same night. Both are reliable. Both are frightened. Both are telling the truth, which means someone staged the event twice — once for each audience.', title: 'Two Truths', classes: ['networker'], frame: { objective: 'Determine which version of the event was real and which was staged', crucible: 'Two trusted sources, two contradictory truths, and someone with the resources to stage reality' }, arc: { name: 'The Staged Event', episode: 'Interview both informants and find the discrepancy that reveals the staging' } },
  ],
  initialChapterTitle: 'The Job',
  locationNames: [
    'The Margaux Office', 'The Sixth Precinct', 'The Idle Hour',
    'The Gaslight Agency', 'The Red Line Office', 'The Ashworth Bureau',
    'The Meridian Desk', 'The Cold File Agency', 'The Inkwell Office', 'The Dusk Bureau',
  ],
  npcNames: [
    'Halloran', 'Russo', 'Novak', 'Linden', 'Varga', 'Coretti', 'Bledsoe',
    'Callahan', 'Mazur', 'DeLuca', 'Pfeiffer', 'Kessler', 'Malone', 'Stavros',
    'Birch', 'Casella', 'Donnelly', 'Roth', 'Navarro', 'Brennan', 'Kovac',
    'Margolis', 'Tierney', 'Volpe', 'Ogden', 'Sabo', 'Wexler', 'Palmieri',
    'Hennessy', 'Krol', 'Whitfield', 'Renko', 'Szabo', 'Loomis', 'Cafferty',
    'Pulaski', 'Gant', 'Morello', 'Falk', 'Braddock', 'Costigan', 'Dressler',
    'Echols', 'Finch', 'Guzman', 'Hargrove', 'Iverson', 'Jelinek', 'Kuzma',
    'Lundgren', 'Montoya', 'Nesbitt', 'O\'Brien', 'Padilla', 'Quarles',
    'Rosenfeld', 'Salazar', 'Trask', 'Unger', 'Vanek', 'Whalen', 'Zarek',
    'Bianchi', 'Coughlin', 'Devereaux', 'Estrada', 'Flannery', 'Gorski',
    'Hutton', 'Ianello', 'Jurek', 'Kowalski', 'Lehane', 'Mooney', 'Nieves',
    'Orloff', 'Pratt', 'Rawlings', 'Stahl', 'Tulley', 'Urbina', 'Voss',
    'Wendell', 'Yates', 'Zukowski', 'Ash', 'Beckett', 'Crane', 'Dolan',
  ],
}


export default noireConfig
