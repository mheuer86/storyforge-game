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

export interface Sf2SeedRegistryEntry {
  id: string
  label: string
  description: string
  seed: AuthorInputSeed
  buildPlayer: (playerName: string) => Sf2Player
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
      'You owe Maren Voss forty thousand credits and she is done being patient. Her collector just docked at the same station you are refueling at, the docking clamps will not release until the port fees clear, and a stranger has offered exactly forty thousand credits to move one passenger and one sealed crate to a system three jumps past the last beacon. No questions. The job needs to leave tonight.',
    crucible:
      'The job solves the immediate debt while creating a more dangerous obligation to a stranger who knows exactly how desperate you are.',
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
      'port fees', 'cargo bay', 'sealed crate', 'passenger manifest', 'station concourse',
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
      'Maren Voss crew',
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
      'Every starting NPC must carry an affiliation that reflects their leverage in the station, ship, debt, cargo, or corridor economy.',
  },
  onboardingRules: {
    playerKnowledgeAssumption:
      'The player does not need a lecture on the galaxy; teach Space Opera through docking clamps, port fees, debt pressure, ship scarcity, and the cost of taking the job.',
    avoidEarly: [
      'combat as the opening move',
      'direct exposition dump about the Compact Collapse',
      'Hegemony bureaucracy, Synod doctrine, Resonants, tithe, or allocation language',
      'opening away from station, ship, debt, or job pressure',
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
      'Human Driftrunner under debt, clamp, collector, passenger, and sealed-crate pressure.',
    seed: SPACE_OPERA_DRIFTRUNNER_AUTHOR_INPUT_SEED,
    buildPlayer: buildDriftrunnerPlayer,
  },
}

export const SF2_BOOTSTRAP_SEED_OPTIONS = [
  SF2_SEED_REGISTRY[DEFAULT_SF2_SEED_ID],
  SF2_SEED_REGISTRY[SPACE_OPERA_DRIFTRUNNER_SEED_ID],
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
