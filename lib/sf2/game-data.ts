// Sf2 state factory. Creates an empty Chapter-1 placeholder that the Author
// endpoint fills on first "Begin the opening" click. The chapter is detected as
// unauthored by `state.chapter.title === ''`; the client gates the Narrator
// call on Author-for-Ch1 having run successfully.
//
// The default AuthorInputSeed is the Warden / Imperial Service / "The Tithe"
// seed from the Codex validation example. Additional experimental seeds live in
// the registry below and are selected only at campaign creation.

import type {
  AuthorInputSeed,
  Sf2ChapterRuntime,
  Sf2Player,
  Sf2State,
} from './types'
import { SF2_SCHEMA_VERSION } from './types'
import { getGenreConfig, type CharacterClass, type Genre } from '../genre-config'

export interface NewCampaignInputs {
  campaignId: string
  playerName: string
  seedId?: string
}

// Warden / Imperial Service base stats per lib/genres/epic-scifi.ts.
const WARDEN_STATS = { STR: 17, DEX: 12, CON: 15, INT: 11, WIS: 12, CHA: 10 }
const WARDEN_STARTING_HP = 14
const WARDEN_STARTING_AC = 14
const STARTING_CREDITS = 200

export const DEFAULT_SF2_SEED_ID = 'epic-scifi/warden/the-tithe'
export const SPACE_OPERA_DRIFTRUNNER_SEED_ID = 'space-opera/human/operative/forty-thousand'
export const FANTASY_SEEKER_SEED_ID = 'fantasy/human/seeker/the-second-library'
export const CYBERPUNK_NETRUNNER_SEED_ID = 'cyberpunk/operative/netrunner/blackout'
export const GRIMDARK_SCAVENGER_SEED_ID = 'grimdark/oathless/scavenger/the-cache'
export const NOIRE_METHODICAL_SEED_ID = 'noire/pi/methodical/five-names'

export interface Sf2SeedRegistryEntry {
  id: string
  label: string
  description: string
  seed: AuthorInputSeed
  buildPlayer: (playerName: string) => Sf2Player
}

type StartingInventoryItem = CharacterClass['startingInventory'][number]

function getPlaybookForSeed(seed: Pick<AuthorInputSeed, 'genreId' | 'originId' | 'playbookId' | 'playbookName'>): CharacterClass {
  const config = getGenreConfig(seed.genreId as Genre)
  const playbooks = config.playbooks?.[seed.originId] ?? config.classes
  const playbook = playbooks.find((candidate) =>
    candidate.id === seed.playbookId || candidate.name === seed.playbookName
  )
  if (!playbook) {
    throw new Error(`No SF2 playbook found for ${seed.genreId}/${seed.originId}/${seed.playbookId}`)
  }
  return playbook
}

function tagsForStartingItem(item: StartingInventoryItem): string[] | undefined {
  const tags = [
    item.damage ? 'weapon' : null,
    item.effect || item.charges ? 'consumable' : null,
    /badge|cash|credential|deck|file|journal|kit|ledger|license|map|notebook|seal|tools|writ/i.test(item.name)
      ? 'signature'
      : null,
  ].filter((tag): tag is string => Boolean(tag))

  return tags.length > 0 ? Array.from(new Set(tags)) : undefined
}

function buildPlayerFromSeed(seed: AuthorInputSeed, playerName: string): Sf2Player {
  const playbook = getPlaybookForSeed(seed)
  const traitUses = playbook.trait.usesPerDay

  return {
    name: playerName,
    species: seed.originName,
    origin: { id: seed.originId, name: seed.originName },
    class: { id: seed.playbookId, name: seed.playbookName },
    level: 1,
    hp: { current: playbook.startingHp, max: playbook.startingHp },
    ac: playbook.startingAc,
    credits: playbook.startingCredits,
    stats: { ...playbook.stats },
    proficiencies: [...playbook.proficiencies],
    inventory: playbook.startingInventory.map((item) => ({
      name: item.name,
      qty: item.quantity,
      tags: tagsForStartingItem(item),
    })),
    traits: [
      {
        name: playbook.trait.name,
        uses: { current: playbook.trait.usesRemaining ?? traitUses, max: traitUses },
      },
    ],
    tempModifiers: [],
    inspiration: 0,
    exhaustion: 0,
  }
}

export function createInitialSf2State(inputs: NewCampaignInputs): Sf2State {
  const now = new Date().toISOString()
  const seedEntry = getSf2SeedById(inputs.seedId)
  const seed = seedEntry.seed
  const player = seedEntry.buildPlayer(inputs.playerName)

  // Empty chapter placeholder. The Author fills this on the first Begin click.
  // Title === '' signals unauthored; the client fires Author-for-Ch1 before
  // the Narrator opens the scene.
  const emptyChapter: Sf2ChapterRuntime = {
    number: 1,
    title: '',
    setup: {
      chapter: 1,
      title: '',
      frame: {
        title: '',
        premise: '',
        activePressure: '',
        centralTension: '',
        chapterScope: '',
        objective: '',
        crucible: '',
        outcomeSpectrum: { clean: '', costly: '', failure: '', catastrophic: '' },
      },
      antagonistField: {
        sourceSystem: '',
        corePressure: '',
        defaultFace: { id: '', name: '', role: '', pressureStyle: '' },
        currentPrimaryFace: { id: '', name: '', role: '', pressureStyle: '' },
        escalationLogic: '',
      },
      startingNpcIds: [],
      activeThreadIds: [],
      loadBearingThreadIds: [],
      carriedThreadIds: [],
      editorializedLore: [],
      openingSceneSpec: {
        location: '',
        atmosphericCondition: '',
        initialState: '',
        firstPlayerFacing: '',
        immediateChoice: '',
        noStartingCombat: true,
        noExpositionDump: true,
      },
      pressureLadder: [],
      threadPressure: {},
      arcLink: undefined,
      pacingContract: undefined,
      surfaceThreads: [],
      surfaceNpcIds: [],
    },
    scaffolding: {
      chapter: 1,
      npcHiddenPressures: {},
      antagonistFaces: [],
      possibleRevelations: [],
      moralFaultLines: [],
      escalationOptions: [],
    },
    artifacts: {
      opening: {
        sceneIntent: '',
        openingPressure: '',
        chapterObjective: '',
        chapterCrucible: '',
        visibleNpcIds: [],
        visibleThreadIds: [],
        loreForOpening: [],
        sceneWarnings: [],
      },
    },
    sceneSummaries: [],
    currentSceneId: 'scene_1_1',
  }

  return {
    meta: {
      campaignId: inputs.campaignId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SF2_SCHEMA_VERSION,
      seedId: seedEntry.id,
      genreId: seed.genreId,
      playbookId: seed.playbookId,
      originId: seed.originId,
      currentChapter: 1,
      currentSceneId: 'scene_1_1',
      currentTimeLabel: '',
    },
    player,
    campaign: {
      arcPlan: undefined,
      arcs: {},
      threads: {},
      engines: {},
      decisions: {},
      promises: {},
      clues: {},
      beats: {},
      temporalAnchors: {},
      npcs: {},
      factions: {},
      locations: {},
      documents: {},
      floatingClueIds: [],
      pivotalSceneIds: [],
      lexicon: [],
    },
    chapter: emptyChapter,
    // `loc_pending` is a placeholder. The Author endpoint replaces it on first
    // chapter generation. The client gates the Narrator on isChapterAuthored()
    // so nothing should index location.id === 'loc_pending' before that runs.
    // If new code paths ever read pre-author location, treat 'loc_pending' as
    // the unauthored sentinel and short-circuit.
    world: {
      currentLocation: {
        id: 'loc_pending',
        name: '',
        description: '',
      },
      sceneSnapshot: {
        sceneId: 'scene_1_1',
        location: { id: 'loc_pending', name: '', description: '' },
        presentNpcIds: [],
        timeLabel: '',
        established: [],
        firstTurnIndex: 0,
      },
      currentTimeLabel: '',
    },
    history: { turns: [], rollLog: [], recentTurns: [] },
    derived: {},
  }
}

// Predicate: has Chapter 1 been authored yet? Client gates the Narrator call
// on this being true.
export function isChapterAuthored(state: Sf2State): boolean {
  return state.chapter.title.length > 0 && state.chapter.setup.frame.title.length > 0
}

export function isArcAuthored(state: Sf2State): boolean {
  return Boolean(state.campaign.arcPlan?.id && state.campaign.arcPlan?.status === 'active')
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical AuthorInputSeed — Warden / Imperial Service / "The Tithe"
// Direct lift from the Codex validation example. The Author consumes this on
// Ch1 setup; Ch2+ derive a morphed seed from state via compileAuthorInputSeed.
// ─────────────────────────────────────────────────────────────────────────────

export const CAMPAIGN_INITIAL_SEED: AuthorInputSeed = {
  genreId: 'epic-scifi',
  genreName: 'The Hegemony',
  playbookId: 'warden',
  playbookName: 'Warden',
  originId: 'imperial-service',
  originName: 'Imperial Service',
  // Hook is the pressure only. objective/arcName/firstEpisode are Author
  // decisions — the Author chooses the Ch1 frame from this pressure; passing
  // a pre-authored first beat collapses every Ch1 to the same tableau.
  hook: {
    title: 'The Tithe',
    premise:
      'A frontier settlement is short on its annual Resonant tithe. The Synod does not care why. If the tithe is not met, replacement children will be selected.',
    crucible: 'The Synod will take children if the numbers are not met.',
  },
  worldRules: {
    settingSummary:
      'A thousand-year interstellar empire held together by human fuel. Resonants attune to the Drift, powering FTL, shields, and weapons. They are identified as children, taken by the Synod, and deployed as infrastructure. Their power is immense and their status is property. Houses compete for Resonant allocation. The Synod controls supply and enforces doctrine. The Throne balances both. The Undrift survive in hiding. Everyone is complicit; nobody is clean. The player is inside this machine.',
    institutionalForces: [
      'The Synod controls Resonant supply and enforces doctrine.',
      'The Great Houses compete for allocation, privilege, and exemption.',
      'The Throne balances Houses and Synod rather than abolishing either.',
      'Resonants are treated as infrastructure inside the system\'s logic.',
      'Administrative language is routinely used to make violence sound procedural.',
    ],
    socialPressures: [
      'Political and bureaucratic failures are as dangerous as physical failures.',
      'Ordinary people live under inherited institutional pressure they did not create.',
      'Compliance is framed as care.',
      'Silence, omission, and reframing are normal tools of survival.',
    ],
    bannedRegisters: [
      'space opera slang such as credits, mercs, beacon, hyperspace',
      'casual modern sci-fi banter that breaks feudal-imperial tone',
      'exposition-dump explanation of the setting',
    ],
    vocabulary: [
      'house', 'sworn', 'tithe', 'allocation', 'mandate', 'Conclave', 'dispensation',
      'heresy', 'compliance', 'Drift lanes', 'attunement arrays', 'shield lattice',
      'transit authority', 'writs', 'retainers', 'conscripts', 'tinctures',
      'drift suppressants', 'stimulants',
    ],
  },
  toneRules: {
    toneMix:
      'Gritty 40%, Epic 40%, Witty 20% - grand but grounded. Humor is dry and usually masks something worse.',
    narrativePrinciples: [
      'Institutional weight should be felt in speech, process, and omission.',
      'Use bureaucratic language as horror.',
      'Alternate long sentences that compress time with short sentences that stop it.',
      'Center small, specific human courage against overwhelming systems.',
      'Let details echo across scenes with changed meaning.',
      'Treat history as active pressure, not inert backstory.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'The Synod',
      'House authority',
      'Imperial Service',
      'The Undrift',
      'frontier settlement leadership',
      'retainers or sworn personnel',
    ],
    factionVoiceRules: [
      'House nobility speaks formally and strategically; every sentence is a move.',
      'Synod officials speak righteously and procedurally, framing control as care.',
      'Imperial officers speak clipped, duty-first language and dislike ambiguity.',
      'Undrift contacts speak cautiously and specifically; trust is earned in action.',
      'Retainers are loyal but not voiceless; they will speak plainly when asked.',
      'Resonants who speak freely are tired, precise, and burdened by what they know.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that reflects their institutional location so they can be grouped and retrieved correctly.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player does not know this world yet and should learn it through behavior, procedure, and observable pressure.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the setting',
      'free-floating lore not anchored to an NPC or institutional behavior',
      'making the world feel cleanly divided into innocent and guilty parties',
    ],
    // mustIntroduce / firstCheckStyle / firstMoralWeight removed by design.
    // They were over-specifying scene-level decisions the Author should make.
    // The Author's prompt carries equivalent soft guidance; `avoidEarly`
    // preserves the guardrails that actually matter.
  },
}

export const SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED: AuthorInputSeed = {
  genreId: 'space-opera',
  genreName: 'Space Opera',
  playbookId: 'operative',
  playbookName: 'Driftrunner',
  originId: 'human',
  originName: 'Human',
  hook: {
    title: 'Forty Thousand',
    premise:
      'Your ship is trapped at a station until forty thousand credits of leverage clears. The cause might be debt, lien, bounty, missing fee, crew obligation, bad paperwork, or damaged reputation; the person or faction holding it is not fixed. A back-channel offer arrives for exactly forty thousand credits and can get you moving tonight, but the job carries an undisclosed passenger, cargo, route, or faction claim. Keep the number fixed; author who is owed, why, who pays, what they want moved, and where the route leads differently for this run.',
    crucible:
      'Forty thousand credits can buy immediate freedom only by creating a larger obligation to someone who knows exactly which exit the Driftrunner needs.',
  },
  worldRules: {
    settingSummary:
      'The Compact of Two Hundred Systems collapsed through infrastructure rot: beacon corridors failed, communication protocols fragmented, and distant systems learned that law only reaches as far as fuel, ships, and enforcement. Remnant authorities, Corporate Blocs, Pirate Fleets, frontier settlements, and Rogue AIs now compete over the corridors, stations, and ships that still connect civilization. The player is a human Driftrunner working the back channels of a galaxy where every route has a price.',
    institutionalForces: [
      'Compact Remnants cling to legitimacy and core-system infrastructure, issuing laws fewer people obey each year.',
      'Corporate Blocs operate purchased infrastructure for profit and treat favors, docking, repairs, and protection as contract surfaces.',
      'Pirate Fleets control frontier routes through reputation, tolls, and selective violence.',
      'Frontier settlements survive on mutual aid, salvage, and uncertain supply ships.',
      'Rogue AIs occupy abandoned stations and network nodes with motives no faction can reliably read.',
    ],
    socialPressures: [
      'A ship is a closed economy of fuel, parts, food, ammo, morale, and trust.',
      'Station politics are personal because everyone needs something before the clamps release.',
      'The thing holding a ship can be debt, lien, bounty, permit hold, crew obligation, or damaged reputation.',
      'Crew warmth matters most when scarcity makes every choice costly.',
      'Law is local, factional, and often less binding than reputation.',
    ],
    bannedRegisters: [
      'fantasy or feudal props such as houses, sworn retainers, taverns, coins, quills, or noble court language',
      'Hegemony-specific terms such as Synod, Resonant, tithe, allocation, mandate, Conclave, Undrift, attunement arrays, or shield lattice',
      'exposition-dump explanation of the Compact Collapse',
    ],
    vocabulary: [
      'Compact', 'Fracture', 'beacon corridors', 'last beacon', 'docking clamps',
      'port fees', 'cargo bay', 'sealed cargo', 'transit manifest', 'station concourse',
      'Corporate Bloc', 'Compact Remnant', 'Pirate Fleet', 'frontier settlement',
      'Rogue AI', 'fuel reserves', 'shipboard trust', 'customs scan', 'back channel',
    ],
  },
  toneRules: {
    toneMix:
      'Gritty 40%, Epic 35%, Witty 25% - danger with lived-in ship warmth, dry station humor, and personal stakes inside galactic decay.',
    narrativePrinciples: [
      'Show scale through human-sized details: one customs officer, one locked clamp, one crew member watching the fuel gauge.',
      'Make ships and stations feel lived-in, worn, repaired, and socially dense.',
      'Use competence as characterization: piloting, hacking, stealth, and back-channel navigation reveal who the Driftrunner is.',
      'Keep politics personal; galactic instability matters because it decides whether the ship can leave tonight.',
      'Balance danger with crew warmth and practical wit.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'station port authority',
      'creditor or collector network',
      'customs or lien office',
      'Corporate Bloc',
      'Compact Remnant',
      'Pirate Fleet',
      'frontier settlement',
      'independent ship crew',
      'back-channel broker',
    ],
    factionVoiceRules: [
      'Station officials speak in fees, safety codes, queue priority, and clamp status.',
      'Corporate representatives speak in risk, contract terms, and liability.',
      'Pirates and collectors speak casually until leverage is established, then become exact.',
      'Remnant officers sound official even when their authority is thin.',
      'Crew members use shorthand, practical worry, and warmth under pressure.',
      'Back-channel brokers say less than they know and price information by urgency.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that reflects their leverage in the station, ship, obligation, cargo, job, or corridor economy.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player does not need a lecture on the galaxy; teach Space Opera through docking clamps, port fees, exit pressure, ship scarcity, and the cost of taking the job.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the Compact Collapse',
      'Hegemony bureaucracy, Synod doctrine, Resonants, tithe, or allocation language',
      'opening away from station, ship, exit pressure, or job pressure',
    ],
  },
}

export const FANTASY_SEEKER_AUTHOR_INPUT_SEED: AuthorInputSeed = {
  genreId: 'fantasy',
  genreName: 'Fantasy',
  playbookId: 'seeker',
  playbookName: 'Seeker',
  originId: 'human',
  originName: 'Human',
  hook: {
    title: 'The Second Library',
    premise:
      'A scholar at the Collegium dies under suspicious circumstances. Her last research notes describe a place she calls the second library and write about it as if you have already been there together. You have never met her. Keep the dead scholar, impossible shared history, and hidden library fixed; author the scholar, death, notes, first clue, and what the library truly is differently for this run.',
    crucible:
      'A dead scholar knew your name and tied you to a lost place you cannot remember, and every institution that wants the notes has a different reason to keep the library buried.',
  },
  worldRules: {
    settingSummary:
      'The Five Kingdoms still stand and the Accord of Thorns still holds on paper, but the world is forgetting itself. Ancient ruins, dead languages, failing magic, disputed treaties, and Collegium catalogues with dangerous gaps make knowledge a political force. The player is a human Seeker trained to recover fragments from ruins and libraries before institutions, heirs, churches, or desperate locals turn them into weapons.',
    institutionalForces: [
      'The Collegium studies lost knowledge, protects its reputation, and hides failures behind catalogue language.',
      'The Five Kingdoms rely on treaties and records few living scholars fully understand.',
      'Churches and local lords claim relics when knowledge threatens authority.',
      'Dragonkin oral memory preserves fragments that written institutions mistrust.',
      'Ancient ruins still function even when no one alive understands their purpose.',
    ],
    socialPressures: [
      'Knowledge is leverage, inheritance, danger, and proof all at once.',
      'Magic is echo rather than abundance; using it carries cost, fatigue, and risk.',
      'Common folk need practical answers while scholars argue about names and dates.',
      'Old institutions protect archives as fiercely as borders.',
      'The past is active pressure, not scenery.',
    ],
    bannedRegisters: [
      'sci-fi and cyberpunk terms such as credits, stations, corps, net, drones, scanners, or data packets',
      'Hegemony-specific terms such as Synod, Resonant, tithe, allocation, mandate, Conclave, or Drift lanes',
      'clean high-fantasy prophecy language that removes mud, cost, and institutional pressure',
    ],
    vocabulary: [
      'Collegium', 'Accord of Thorns', 'Five Kingdoms', 'Sundering', 'second library',
      'catalogue gap', 'ruin', 'inscription', 'reliquary', 'ward', 'scroll', 'codex',
      'oath', 'charter', 'dispel scroll', 'cartographer\'s kit', 'lantern', 'gold',
    ],
  },
  toneRules: {
    toneMix:
      'Epic 60%, Gritty 30%, Witty 10% - ancient wonder grounded by mud, fatigue, sharp scholarship, and the politics of who gets to name the truth.',
    narrativePrinciples: [
      'Make ancient things physical: stone that does not weather, ink that refuses to fade, doors with no locks.',
      'Use scholarship as action, not exposition; deciphering should change leverage in the scene.',
      'Let institutions speak through records, seals, catalogue terms, and guarded omissions.',
      'Keep magic costly and embodied.',
      'Make the player learn the world through traces, behavior, and contested evidence.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'The Collegium',
      'kingdom archive',
      'local lordship',
      'church office',
      'ruin expedition',
      'Dragonkin memory-keeper',
      'merchant patron',
      'family or heir tied to the scholar',
    ],
    factionVoiceRules: [
      'Collegium scholars speak in cautious claims, citations, and reputation management.',
      'Lords and officials turn records into jurisdiction.',
      'Church voices frame dangerous knowledge as custody, heresy, or care.',
      'Expedition workers are practical, superstitious, and attentive to hazard.',
      'Dragonkin memory-keepers speak from inherited fragments, not institutional proof.',
      'Common folk want the old thing made safe before scholars name it.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that shows who can claim, suppress, publish, sell, or fear the second library.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player does not need a lecture on the Sundering; teach Fantasy through records, ruins, institutional claims, bodily magic costs, and the dead scholar\'s impossible familiarity.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the Five Kingdoms or the Sundering',
      'fixing the scholar\'s name, murder method, or first clue across runs',
      'making the second library a simple building with a simple map',
    ],
  },
}

export const CYBERPUNK_NETRUNNER_AUTHOR_INPUT_SEED: AuthorInputSeed = {
  genreId: 'cyberpunk',
  genreName: 'Cyberpunk',
  playbookId: 'netrunner',
  playbookName: 'Netrunner',
  originId: 'operative',
  originName: 'Operative',
  hook: {
    title: 'Blackout',
    premise:
      'The city goes dark. Not a power failure, but a targeted blackout in a six-block radius. In the silence, a voice on every local channel says your name. Keep the blackout, six-block radius, local-channel broadcast, and your name as the fixed pressure; author the neighborhood, source, payload, motive, and faction reach differently for this run.',
    crucible:
      'Someone with the power to blind six blocks can put your name into every ear, and the city will treat the question of why as a market opportunity before it treats it as a warning.',
  },
  worldRules: {
    settingSummary:
      'A vertical megacity owned by megacorporations, private security, fixers, gangs, and infrastructure monopolies. The Net is a parallel city with locks, predators, ghosts, and paid doors. The player is a freelance Netrunner whose body may be in a chair while their name moves through cameras, emergency channels, access logs, and rumor markets.',
    institutionalForces: [
      'Megacorporations own infrastructure, media, medicine, housing, and private force.',
      'Fixers broker talent, secrets, and survival through debts that compound.',
      'Gangs and neighborhood crews control street-level territory.',
      'NCPD and private security respond according to contracts, liability, and optics.',
      'Rogue AIs and netrunner collectives occupy systems the corps pretend are empty.',
    ],
    socialPressures: [
      'Privacy is a commodity and most people cannot afford it.',
      'Every hack creates a trace, a favor, a log gap, or a future debt.',
      'Street trust and corporate access rarely survive the same decision.',
      'The city notices patterns faster than people do.',
      'Technology is intimate: chrome, neural stress, heat, addiction, and identity erosion.',
    ],
    bannedRegisters: [
      'fantasy language such as taverns, scrolls, spells, gold, kings, ruins, or noble courts',
      'Hegemony-specific terms such as Synod, Resonant, tithe, allocation, mandate, Conclave, or Drift lanes',
      'space-opera travel language such as beacon corridors, docking clamps, jump routes, or frontier settlements',
    ],
    vocabulary: [
      'blackout', 'six-block radius', 'local channel', 'Net', 'ICE', 'daemon',
      'quickhack', 'chrome', 'fixer', 'corpo', 'NCPD', 'private security',
      'access log', 'camera loop', 'signal trace', 'neural deck', 'eddies',
    ],
  },
  toneRules: {
    toneMix:
      'Gritty 50%, Witty 30%, Epic 20% - neon pressure, dry survival humor, and big systemic violence felt through one room losing power.',
    narrativePrinciples: [
      'Show the city as infrastructure with motives: locks, cameras, elevators, feeds, blackout grids.',
      'Use competence as characterization: tracing, spoofing, reading architecture, and choosing which trace to leave.',
      'Keep body and Net connected; neural strain and meat-space vulnerability matter.',
      'Make every faction response transactional.',
      'Let humor come from exhaustion, professionalism, and bad odds.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'fixer network',
      'corporate infrastructure division',
      'private security',
      'gang crew',
      'netrunner collective',
      'local resident network',
      'NCPD',
      'Rogue AI trace',
    ],
    factionVoiceRules: [
      'Corporate reps speak in risk, liability, asset control, and brand damage.',
      'Fixers sound relaxed while pricing urgency.',
      'Gang crews speak territorial, practical, and suspicious of outside attention.',
      'Private security speaks in protocols, perimeters, and escalation tiers.',
      'Netrunners use precise technical shorthand and watch every log gap.',
      'Residents speak with the anger of people whose power, locks, and lives are collateral.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that explains their relationship to the blackout, the broadcast, the grid, the trace, or the price of information.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player can learn Cyberpunk through blackout symptoms, surveillance gaps, fixer warnings, grid behavior, and the cost of tracing their own name.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the megacity or corporate order',
      'fixing the corporation, AI, or caller as the same culprit each run',
      'turning the hook into a generic corp heist before the broadcast pressure lands',
    ],
  },
}

export const GRIMDARK_SCAVENGER_AUTHOR_INPUT_SEED: AuthorInputSeed = {
  genreId: 'grimdark',
  genreName: 'Grimdark',
  playbookId: 'scavenger',
  playbookName: 'Scavenger',
  originId: 'oathless',
  originName: 'The Oathless',
  hook: {
    title: 'The Cache',
    premise:
      'A dying Scavenger from a rival outfit gets a map into your hands. It points to a supply cache buried under a Church waystation, enough provisions to keep a company alive for a month. She says the Church killed her crew for finding it and that something else is buried there. Keep the rival Scavenger, map, cache, Church waystation, and patrol window fixed; author who she was, how she reaches you, what else is buried, and which faction moves first differently for this run.',
    crucible:
      'The cache can keep people alive, but taking it means trespassing under Church authority and learning what the Church was willing to kill to keep buried.',
  },
  worldRules: {
    settingSummary:
      'The Shattered Provinces are ruled by houses, Church authority, mercenary contracts, inherited grudges, and hunger. The Wasting spreads through land and bodies while institutions argue over doctrine, ownership, and liability. The player is Oathless: useful because they are sworn to no one, vulnerable because no one is bound to protect them.',
    institutionalForces: [
      'The Pale Flame Church controls doctrine, waystations, quarantine, and what counts as heresy.',
      'Great houses turn oaths, contracts, trade, and bloodline memory into power.',
      'Mercenary companies survive on provisions, reputation, and ugly terms.',
      'The Oathless move between institutions because none can fully claim them.',
      'The Wasting makes every delay, burial, and ration political.',
    ],
    socialPressures: [
      'Food and medicine are moral pressure, not background supplies.',
      'An oath protects and cages; refusing one frees and isolates.',
      'Contracts and doctrine can make cruelty sound lawful.',
      'The dead still impose obligations through maps, debts, and unfinished warnings.',
      'No faction is clean, but some choices still matter.',
    ],
    bannedRegisters: [
      'sci-fi and cyberpunk terms such as credits, corps, scanners, drones, stations, or data',
      'clean heroic fantasy where virtue is obvious and institutions are simple villains',
      'Hegemony-specific terms such as Synod, Resonant, tithe, allocation, mandate, Conclave, or Drift lanes',
    ],
    vocabulary: [
      'Shattered Provinces', 'Oathless', 'Pale Flame', 'Church waystation', 'Wasting',
      'company', 'contract', 'provisions', 'patrol window', 'sealed cache', 'map',
      'house seal', 'crossroads', 'field dressing', 'heresy', 'buried evidence',
    ],
  },
  toneRules: {
    toneMix:
      'Gritty 60%, Epic 25%, Witty 15% - hunger, ash, hard competence, and dry fatalism around choices that still matter.',
    narrativePrinciples: [
      'Make scarcity concrete: provisions, wounds, weather, distance, witnesses, light.',
      'Use institutional language as pressure: contract, warrant, doctrine, custody, quarantine.',
      'Keep violence ugly and consequential rather than glorious.',
      'Let moral choices stay sharp without making factions cartoonishly pure or evil.',
      'Treat the map as an obligation from the dead, not just a treasure lead.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'Pale Flame Church',
      'Church waystation staff',
      'rival scavenger outfit',
      'Oathless underworld',
      'mercenary company',
      'local village',
      'house agent',
      'Wasting-zone survivor',
    ],
    factionVoiceRules: [
      'Church officials speak in doctrine, custody, contamination, and mercy with teeth.',
      'House agents speak in obligation, reputation, leverage, and old debts.',
      'Mercenaries count food, distance, wounds, and odds before ideals.',
      'Oathless contacts are direct, transactional, and alert to betrayal.',
      'Common folk speak from hunger first and politics second.',
      'Rival scavengers respect competence but assume everyone is holding something back.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that explains what they need from the cache, the waystation, the map, the Church secret, or the player\'s Oathless status.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player should learn Grimdark through hunger, Church procedure, house leverage, map pressure, and the risks of being useful but unsworn.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the Shattered Provinces',
      'fixing the crossroads inn, dead Scavenger name, or contents of the cache across runs',
      'making the Church secret a simple treasure reveal',
    ],
  },
}

export const NOIRE_METHODICAL_AUTHOR_INPUT_SEED: AuthorInputSeed = {
  genreId: 'noire',
  genreName: 'Noir',
  playbookId: 'methodical',
  playbookName: 'Methodical',
  originId: 'pi',
  originName: 'PI',
  hook: {
    title: 'Five Names',
    premise:
      'A woman you have never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names; four of them are still alive. Keep the dead stranger, will, locked box, five names, and four living names fixed; author who she was, why she chose you, what the first name means, and which city institution reacts first differently for this run.',
    crucible:
      'A dead stranger trusted you with a box, the list is already losing names, and every answer you find can make you responsible for the next one.',
  },
  worldRules: {
    settingSummary:
      'A rain-soaked city runs on money, secrets, police files, favors, court records, union ledgers, back rooms, and the people paid to look away. The player is a Methodical PI: procedure, evidence chains, patience, and the bad habit of finding the uglier truth behind the simple case.',
    institutionalForces: [
      'Police precincts are overworked, bought, or protecting old casework.',
      'City hall, courts, unions, and business offices bury decisions in records.',
      'Criminal crews control blocks through favors, fear, and who owes whom.',
      'The wealthy stay untouchable by making other people touch the evidence.',
      'Neighborhood witnesses survive by remembering selectively.',
    ],
    socialPressures: [
      'Everyone lies for a reason; the reason matters as much as the lie.',
      'Evidence creates attention as soon as someone knows it exists.',
      'Money, favors, and reputation are all currencies with interest.',
      'Violence is short, ugly, and followed by paperwork or silence.',
      'The truth usually makes the client look smaller, not cleaner.',
    ],
    bannedRegisters: [
      'fantasy or sci-fi language such as spells, relics, stations, corps, scanners, drones, or credits',
      'Hegemony-specific terms such as Synod, Resonant, tithe, allocation, mandate, Conclave, or Drift lanes',
      'superhero detective certainty; noir evidence is partial, social, and dangerous',
    ],
    vocabulary: [
      'case', 'will', 'locked box', 'five names', 'four alive', 'precinct',
      'business card', 'case file', 'stakeout', 'tail', 'mark', 'fall guy',
      'heat', 'retainer', 'marks', 'frosted glass', 'rain', 'alibi',
    ],
  },
  toneRules: {
    toneMix:
      'Gritty 50%, Witty 35%, Epic 15% - dry observation, human rot, procedural patience, and the small grandeur of a revelation landing.',
    narrativePrinciples: [
      'Use the city as a pressure system: weather, files, phones, precincts, hotels, bars, offices.',
      'Make lies specific and human; no one lies generically.',
      'Let evidence change who is watching the player.',
      'Keep violence brief and consequential.',
      'Use dry wit as defense, not decoration.',
    ],
  },
  npcRules: {
    likelyAffiliations: [
      'police precinct',
      'law office',
      'city hall',
      'business office',
      'criminal crew',
      'hotel or bar staff',
      'neighborhood witness',
      'family tied to the dead woman',
    ],
    factionVoiceRules: [
      'Cops are tired, procedural, territorial, and protective of their case files.',
      'Lawyers and officials speak smoothly and avoid anything actionable.',
      'Criminals are cautious, territorial, and attentive to what the player knows.',
      'Service workers remember faces and habits but sell memory carefully.',
      'Clients are desperate enough to hire the player and desperate enough to lie.',
      'Wealthy voices treat consequences as a staffing problem.',
    ],
    affiliationRequirement:
      'Every starting NPC must carry an affiliation that explains their relationship to the will, the box, the list, the dead woman, or the institution that wants the case quiet.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player should learn Noir through the office, the box, the will, hesitant witnesses, procedural evidence, and attention from people who preferred the list stay closed.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the city',
      'fixing the dead woman, the first living name, or the box contents across runs',
      'solving why the player was chosen in the opening scene',
    ],
  },
}

function buildWardenPlayer(playerName: string): Sf2Player {
  return {
    name: playerName,
    species: 'Human',
    origin: { id: CAMPAIGN_INITIAL_SEED.originId, name: CAMPAIGN_INITIAL_SEED.originName },
    class: { id: CAMPAIGN_INITIAL_SEED.playbookId, name: CAMPAIGN_INITIAL_SEED.playbookName },
    level: 1,
    hp: { current: WARDEN_STARTING_HP, max: WARDEN_STARTING_HP },
    ac: WARDEN_STARTING_AC,
    credits: STARTING_CREDITS,
    stats: WARDEN_STATS,
    proficiencies: ['Athletics', 'Intimidation', 'Perception', 'Heavy Weapons'],
    inventory: [
      { name: 'Imperial writ of authority', qty: 1, tags: ['credential'] },
      { name: 'Warden sidearm', qty: 1, tags: ['weapon'] },
      { name: 'Heavy pattern blade', qty: 1, tags: ['weapon'] },
      { name: 'Compliance cord', qty: 2, tags: ['restraint'] },
    ],
    traits: [
      { name: 'Martial Authority', uses: { current: 2, max: 2 } },
    ],
    tempModifiers: [],
    inspiration: 0,
    exhaustion: 0,
  }
}

function buildDriftrunnerPlayer(playerName: string): Sf2Player {
  return {
    name: playerName,
    species: 'Human',
    origin: {
      id: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED.originId,
      name: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED.originName,
    },
    class: {
      id: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED.playbookId,
      name: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED.playbookName,
    },
    level: 1,
    hp: { current: 9, max: 9 },
    ac: 15,
    credits: 120,
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    proficiencies: ['Stealth', 'Sleight of Hand', 'Piloting', 'Hacking'],
    inventory: [
      { name: 'Pulse Pistol', qty: 1, tags: ['weapon'] },
      { name: 'Vibro-Knife', qty: 1, tags: ['weapon'] },
      { name: 'Holo-Cloak', qty: 1, tags: ['signature', 'stealth'] },
      { name: 'Lockbreaker Kit', qty: 1, tags: ['signature', 'tool'] },
    ],
    traits: [
      { name: 'Smuggler\'s Luck', uses: { current: 1, max: 1 } },
    ],
    tempModifiers: [],
    inspiration: 0,
    exhaustion: 0,
  }
}

export const SF2_SEED_REGISTRY: Record<string, Sf2SeedRegistryEntry> = {
  [DEFAULT_SF2_SEED_ID]: {
    id: DEFAULT_SF2_SEED_ID,
    label: 'Epic Sci-Fi · Warden · The Tithe',
    description:
      'Imperial Service Warden inside Hegemony tithe pressure; the original v2 validation seed.',
    seed: CAMPAIGN_INITIAL_SEED,
    buildPlayer: buildWardenPlayer,
  },
  [SPACE_OPERA_DRIFTRUNNER_SEED_ID]: {
    id: SPACE_OPERA_DRIFTRUNNER_SEED_ID,
    label: 'Space Opera · Driftrunner · Forty Thousand',
    description:
      'Human Driftrunner under a fixed forty-thousand-credit exit pressure and a suspicious paid route.',
    seed: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED,
    buildPlayer: buildDriftrunnerPlayer,
  },
  [FANTASY_SEEKER_SEED_ID]: {
    id: FANTASY_SEEKER_SEED_ID,
    label: 'Fantasy · Seeker · The Second Library',
    description:
      'Human Seeker pulled into a dead scholar\'s impossible notes and a library that may not be a place.',
    seed: FANTASY_SEEKER_AUTHOR_INPUT_SEED,
    buildPlayer: (playerName) => buildPlayerFromSeed(FANTASY_SEEKER_AUTHOR_INPUT_SEED, playerName),
  },
  [CYBERPUNK_NETRUNNER_SEED_ID]: {
    id: CYBERPUNK_NETRUNNER_SEED_ID,
    label: 'Cyberpunk · Netrunner · Blackout',
    description:
      'Operative Netrunner named by a six-block blackout broadcast that someone powerful can already hear.',
    seed: CYBERPUNK_NETRUNNER_AUTHOR_INPUT_SEED,
    buildPlayer: (playerName) => buildPlayerFromSeed(CYBERPUNK_NETRUNNER_AUTHOR_INPUT_SEED, playerName),
  },
  [GRIMDARK_SCAVENGER_SEED_ID]: {
    id: GRIMDARK_SCAVENGER_SEED_ID,
    label: 'Grimdark · Scavenger · The Cache',
    description:
      'Oathless Scavenger with a dead rival\'s map to Church provisions and whatever else was buried.',
    seed: GRIMDARK_SCAVENGER_AUTHOR_INPUT_SEED,
    buildPlayer: (playerName) => buildPlayerFromSeed(GRIMDARK_SCAVENGER_AUTHOR_INPUT_SEED, playerName),
  },
  [NOIRE_METHODICAL_SEED_ID]: {
    id: NOIRE_METHODICAL_SEED_ID,
    label: 'Noir · Methodical PI · Five Names',
    description:
      'Methodical PI inherits a locked box and a list of five names from a woman they never met.',
    seed: NOIRE_METHODICAL_AUTHOR_INPUT_SEED,
    buildPlayer: (playerName) => buildPlayerFromSeed(NOIRE_METHODICAL_AUTHOR_INPUT_SEED, playerName),
  },
}

export const SF2_BOOTSTRAP_SEED_OPTIONS = [
  SF2_SEED_REGISTRY[DEFAULT_SF2_SEED_ID],
  SF2_SEED_REGISTRY[SPACE_OPERA_DRIFTRUNNER_SEED_ID],
  SF2_SEED_REGISTRY[FANTASY_SEEKER_SEED_ID],
  SF2_SEED_REGISTRY[CYBERPUNK_NETRUNNER_SEED_ID],
  SF2_SEED_REGISTRY[GRIMDARK_SCAVENGER_SEED_ID],
  SF2_SEED_REGISTRY[NOIRE_METHODICAL_SEED_ID],
]

export function getSf2SeedById(seedId?: string): Sf2SeedRegistryEntry {
  return (seedId ? SF2_SEED_REGISTRY[seedId] : undefined) ?? SF2_SEED_REGISTRY[DEFAULT_SF2_SEED_ID]
}

export function getSf2SeedForState(state: Pick<Sf2State, 'meta'> | null | undefined): Sf2SeedRegistryEntry {
  if (!state) return SF2_SEED_REGISTRY[DEFAULT_SF2_SEED_ID]
  const byId = getSf2SeedById(state.meta.seedId)
  if (state.meta.seedId && byId.id === state.meta.seedId) return byId

  const byMeta = SF2_BOOTSTRAP_SEED_OPTIONS.find((entry) =>
    entry.seed.genreId === state.meta.genreId
    && entry.seed.originId === state.meta.originId
    && entry.seed.playbookId === state.meta.playbookId
  )
  return byMeta ?? SF2_SEED_REGISTRY[DEFAULT_SF2_SEED_ID]
}

// Back-compat alias — old code may still import the Synod Seeker name.
export const SYNOD_SEEKER_AUTHOR_INPUT_SEED = CAMPAIGN_INITIAL_SEED
