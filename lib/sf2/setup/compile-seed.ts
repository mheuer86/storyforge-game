import {
  getGenreConfig,
  type CharacterClass,
  type Genre,
  type GenreConfig,
  type OpeningHookObject,
} from '../../genre-config'
import type { AuthorInputSeed, Sf2Player } from '../types'
import {
  createSf2SetupSelectionId,
  getSf2SetupHook,
  getSf2SetupHookId,
  getSf2SetupOrigin,
  getSf2SetupPlaybook,
} from './options'
import {
  clampSf2SetupCalibrationAnswers,
  renderSf2SetupCalibrationSummary,
} from './calibration'
import type { Sf2SetupSelection } from './types'

type SetupRulesAdapter = {
  institutionalForces: string[]
  socialPressures: string[]
  bannedRegisters: string[]
  likelyAffiliations: string[]
  factionVoiceRules: string[]
  vocabulary: string[]
  tonePrinciples?: string[]
}

const SETUP_RULES_BY_GENRE: Partial<Record<Genre, SetupRulesAdapter>> = {
  'epic-scifi': {
    institutionalForces: [
      'The Synod controls Resonant supply, doctrine, testing, and acceptable truth.',
      'The Great Houses turn allocation, marriage, service, and exemption into power.',
      'Imperial authority protects order by making moral injury procedural.',
      'The Undrift survive through hidden records, suppressants, couriers, and risky trust.',
    ],
    socialPressures: [
      'Compliance often sounds like care.',
      'Every benefit from Drift infrastructure has a human cost somewhere.',
      'Ordinary people are pressured by institutions they did not build.',
      'Silence, omission, and reframing are survival tools.',
    ],
    bannedRegisters: [
      'casual space-opera slang that breaks feudal-imperial tone',
      'generic cyberpunk corps, netruns, drones, and neon street language',
      'opaque Hegemony terms introduced without enough context to act',
    ],
    likelyAffiliations: [
      'The Synod',
      'a Great House',
      'Imperial Service',
      'The Undrift',
      'frontier settlement leadership',
      'retainers or sworn personnel',
    ],
    factionVoiceRules: [
      'Synod officials sound righteous and procedural because a specific family, Resonant, or subordinate is being controlled in the name of care.',
      'House voices speak formally; every courtesy protects rank, threatens a rival, or tests what someone will sacrifice for leverage.',
      'Imperial officers speak in duty-first compression, but their discomfort shows around the person who pays for the order.',
      'Undrift contacts speak cautiously and specifically because trust is earned by the extraction, warning, or name they risk giving.',
    ],
    vocabulary: [
      'Synod', 'Resonant', 'tithe', 'allocation', 'mandate', 'Conclave',
      'Undrift', 'Dimming', 'Ashen Wards', 'Drift', 'writs',
    ],
  },
  'space-opera': {
    institutionalForces: [
      'Compact Remnants cling to legitimacy and surviving beacon infrastructure.',
      'Corporate Blocs price access, repairs, labor, and protection as contracts.',
      'Pirate Fleets control frontier routes through tolls, reputation, and selective violence.',
      'Frontier settlements survive through salvage, mutual aid, and uncertain supply ships.',
      'Rogue AIs occupy abandoned infrastructure with motives nobody can fully price.',
    ],
    socialPressures: [
      'A ship is a closed economy of fuel, parts, food, ammo, morale, and trust.',
      'Route access, docking, permits, reputation, debt, and cargo matter because someone can use them to help, trap, shame, or abandon a person.',
      'Crew warmth matters because scarcity makes every choice costly.',
      'Law is local, factional, and often weaker than who controls the corridor.',
    ],
    bannedRegisters: [
      'fantasy props such as taverns, coins, nobles, quills, oaths, and spell language',
      'Hegemony-specific Synod, Resonant, tithe, allocation, and Drift doctrine',
      'opaque Compact history references without actionable context',
    ],
    likelyAffiliations: [
      'station-route authority',
      'Corporate Bloc',
      'Compact Remnant',
      'Pirate Fleet',
      'frontier settlement',
      'independent ship crew',
      'back-channel broker',
    ],
    factionVoiceRules: [
      'Station hands and dock bosses are tired, competent, opinionated people who decide who gets helped, delayed, or cut loose.',
      'Corporate representatives sound smooth and transactional, but fear travels through them from bosses, margins, and enforceable debt.',
      'Pirates and collectors stay casual until leverage is established, then become exact.',
      'Remnant officers carry the cadence of a law that used to mean something; the dangerous ones still believe it should.',
      'Crew members use shorthand, practical worry, dark humor, and warmth under pressure.',
      'Back-channel brokers say less than they know and price information by urgency, but loyalties surface under enough heat.',
    ],
    vocabulary: [
      'Compact', 'Fracture', 'beacon corridors', 'Corporate Bloc', 'Compact Remnant',
      'Pirate Fleet', 'frontier settlement', 'Rogue AI', 'fuel reserves', 'back channel',
    ],
  },
  fantasy: {
    institutionalForces: [
      'The Collegium preserves knowledge it can no longer fully explain.',
      'The Five Kingdoms turn old treaties, roads, archives, and borders into leverage.',
      'Churches and lords claim custody when knowledge threatens authority.',
      'Ancient ruins still act on the world even when nobody living understands them.',
    ],
    socialPressures: [
      'Knowledge is leverage, inheritance, danger, and proof at once.',
      'Magic is echo rather than abundance; using it has bodily cost.',
      'Common folk need practical answers while institutions argue over names and rights.',
      'The past is active pressure, not scenery.',
    ],
    bannedRegisters: [
      'sci-fi and cyberpunk terms such as credits, stations, corps, net, drones, or data packets',
      'Hegemony-specific Synod, Resonant, tithe, allocation, and Drift doctrine',
      'clean prophecy language that removes mud, fatigue, politics, and institutional cost',
    ],
    likelyAffiliations: [
      'The Collegium',
      'kingdom archive',
      'local lordship',
      'church office',
      'ruin expedition',
      'merchant patron',
      'family or heir tied to the hook',
    ],
    factionVoiceRules: [
      'Collegium scholars are precise, frustrated, and haunted by the gap between what the archive says and what someone needs now.',
      'Lords and officials speak with inherited authority; every sentence defends a claim over a person, place, or relic.',
      'Church voices frame dangerous knowledge as custody, heresy, duty, or care because someone may be harmed by knowing it.',
      'Expedition workers are practical, superstitious, and attentive to hazards that scholars prefer to name later.',
      'Common folk want the old thing made safe before scholars finish arguing over what to call it.',
    ],
    vocabulary: [
      'Collegium', 'Accord of Thorns', 'Five Kingdoms', 'Sundering', 'ruin',
      'inscription', 'reliquary', 'ward', 'scroll', 'codex', 'gold',
    ],
  },
  cyberpunk: {
    institutionalForces: [
      'Megacorps own infrastructure, debt, security, housing, and identity layers.',
      'Street networks survive by trading favors, anonymity, and dangerous access.',
      'Data brokers, fixers, and private security turn secrets into pressure.',
    ],
    socialPressures: [
      'Every system leaves one person exposed while making another person disappear from accountability.',
      'Survival means choosing which compromise leaves you enough self to keep moving.',
      'Trust is scarce because surveillance makes loyalty expensive.',
      'Technology is intimate: chrome, heat, debt, attention, addiction, and identity erosion show up on bodies.',
    ],
    bannedRegisters: [
      'fantasy, feudal, or space-opera institutional language',
      'clean heroic prophecy or chosen-one framing',
      'opaque corporate-history references before a system or person makes them actionable',
    ],
    likelyAffiliations: [
      'megacorp division',
      'street crew',
      'private security contractor',
      'data broker',
      'clinic or black-market vendor',
      'city authority',
    ],
    factionVoiceRules: [
      'Corporate reps are smooth and careful; junior ones fear their bosses, senior ones fear their margins, and threats arrive as consequences.',
      'Fixers sound relaxed while pricing urgency; their calm is professional, not proof they are neutral.',
      'Gang crews are territorial, practical, and suspicious of outside attention because loyalty is local structure, not ideology.',
      'Private security are bored professionals until someone triggers the contract, then efficient and impersonal.',
      'Netrunners speak in twitchy shorthand because part of their attention is always somewhere the room cannot see.',
      'Residents speak with the anger of people whose power, locks, and lives are collateral.',
    ],
    vocabulary: ['corp', 'arcology', 'net', 'ICE', 'black clinic', 'credstick', 'drone', 'augment'],
  },
  grimdark: {
    institutionalForces: [
      'The Church, warlords, mercenary captains, and starving settlements all sell survival as duty.',
      'Provision, medicine, maps, and shelter are moral pressure surfaces.',
      'Old violence keeps collecting interest through hunger, debt, and fear.',
    ],
    socialPressures: [
      'Mercy costs resources someone else expected to use.',
      'Promises matter because institutions rarely do.',
      'Hope is dangerous when someone can weaponize it.',
    ],
    bannedRegisters: [
      'clean high-fantasy heroism',
      'space-opera technology language',
      'quippy banter that makes brutality feel weightless',
    ],
    likelyAffiliations: [
      'Church provision office',
      'mercenary company',
      'village council',
      'warlord retinue',
      'black-market quartermaster',
      'refugee band',
    ],
    factionVoiceRules: [
      'Church officials speak in doctrine, custody, contamination, and mercy with teeth because someone is hungry, blamed, or exposed.',
      'House agents speak in obligation, reputation, leverage, and old debts that land on living bodies.',
      'Mercenaries count food, distance, wounds, and odds before ideals.',
      'Oathless contacts are direct, transactional, and alert to betrayal.',
      'Common folk speak from hunger first and politics second.',
    ],
    vocabulary: ['tithe', 'relic', 'rations', 'provisions', 'writ', 'oath', 'company', 'ash'],
  },
  noire: {
    institutionalForces: [
      'Police, city hall, newspapers, unions, syndicates, and old money all protect versions of truth.',
      'Records, favors, debts, photographs, and alibis decide who can be hurt safely.',
      'Respectability is a weapon when the city wants a case buried.',
    ],
    socialPressures: [
      'Everyone needs something, and most people have already paid too much.',
      'The truth is useful only if someone can survive it becoming public.',
      'Personal compromise is more dangerous than a locked door.',
    ],
    bannedRegisters: [
      'fantasy, space-opera, cyberpunk, or supernatural spectacle unless state establishes it',
      'clean procedural certainty',
      'goofy detective parody',
    ],
    likelyAffiliations: [
      'police department',
      'city hall',
      'newspaper office',
      'private client',
      'union hall',
      'crime syndicate',
      'old-money family',
    ],
    factionVoiceRules: [
      'Police voices mix fatigue, territoriality, and selective legality around the person they can still hurt or protect.',
      'Clients tell the truth in shapes that protect themselves and reveal what they are most afraid to lose.',
      'Syndicate voices are polite when violence is already implied; the courtesy is for witnesses, not mercy.',
      'Reporters, clerks, and union people speak around what they know until the cost of silence changes.',
    ],
    vocabulary: ['case file', 'precinct', 'ledger', 'alibi', 'wire', 'union', 'syndicate', 'rain'],
  },
}

type StartingInventoryItem = CharacterClass['startingInventory'][number]

function clampList(items: string[], max: number): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, max)
}

function deriveTitle(config: GenreConfig, hook: OpeningHookObject): string {
  const title = hook.title?.trim()
  if (title) return title
  return config.initialChapterTitle || hook.hook.split(/[.!?]/)[0]?.slice(0, 80) || 'Opening Pressure'
}

function deriveCrucible(hook: OpeningHookObject): string {
  if (hook.frame?.crucible.trim()) return hook.frame.crucible.trim()
  const firstSentence = hook.hook.split(/[.!?]/).map((part) => part.trim()).find(Boolean)
  return firstSentence
    ? `The opening pressure forces a costly choice around this fact: ${firstSentence}.`
    : 'The opening pressure forces a costly choice before the situation can stay stable.'
}

function compileSettingSummary(
  config: GenreConfig,
  originName: string,
  playbookName: string,
  hook: OpeningHookObject
): string {
  const deepLoreSummary = config.deepLore
    ? config.deepLore.replace(/#+\s*/g, '').replace(/\s+/g, ' ').slice(0, 900)
    : config.promptSections.setting
  return [
    config.systemPromptFlavor.setting.split('\n\n')[0],
    deepLoreSummary,
    `The player is a ${originName} ${playbookName}; the opening hook pressures that identity through "${deriveTitle(config, hook)}".`,
  ].join(' ')
}

function extractVocabulary(config: GenreConfig, adapter: SetupRulesAdapter): string[] {
  const anchorTerms = (config.loreAnchors ?? [])
    .map((anchor) => anchor.split('=')[0])
    .filter(Boolean)
  const promptTerms = config.promptSections.vocabulary
    .split(/[,.\n:;()/-]+/)
    .map((term) => term.trim())
    .filter((term) => /^[A-Za-z][A-Za-z ]{2,28}$/.test(term))
  return clampList([...adapter.vocabulary, ...anchorTerms, ...promptTerms], 32)
}

function buildWorldRules(
  config: GenreConfig,
  originName: string,
  playbookName: string,
  hook: OpeningHookObject
): AuthorInputSeed['worldRules'] {
  const adapter = SETUP_RULES_BY_GENRE[config.id] ?? SETUP_RULES_BY_GENRE['space-opera']!
  return {
    settingSummary: compileSettingSummary(config, originName, playbookName, hook),
    institutionalForces: clampList(adapter.institutionalForces, 8),
    socialPressures: clampList(adapter.socialPressures, 8),
    bannedRegisters: clampList(adapter.bannedRegisters, 6),
    vocabulary: extractVocabulary(config, adapter),
  }
}

function buildToneRules(config: GenreConfig): AuthorInputSeed['toneRules'] {
  const adapter = SETUP_RULES_BY_GENRE[config.id]
  return {
    toneMix: config.promptSections.toneOverride,
    narrativePrinciples: clampList([
      ...(adapter?.tonePrinciples ?? []),
      ...config.promptSections.narrativeCraft
        .split('\n\n')
        .map((block) => block.replace(/\*\*/g, '').split('\n')[0])
        .filter((line) => line.length > 20),
    ], 8),
  }
}

function buildNpcRules(config: GenreConfig): AuthorInputSeed['npcRules'] {
  const adapter = SETUP_RULES_BY_GENRE[config.id] ?? SETUP_RULES_BY_GENRE['space-opera']!
  return {
    likelyAffiliations: clampList(adapter.likelyAffiliations, 10),
    factionVoiceRules: clampList(adapter.factionVoiceRules, 8),
    affiliationRequirement:
      `Every starting NPC must carry an affiliation grounded in ${config.name}'s institutions, hook pressure, or the PC's origin/playbook leverage.`,
  }
}

function buildOnboardingRules(config: GenreConfig, hookTitle: string): AuthorInputSeed['onboardingRules'] {
  return {
    playerKnowledgeAssumption:
      `The player may not know ${config.name} yet. Give enough direct context, behavior, pressure, and consequence from "${hookTitle}" that the first choice is intelligible.`,
    avoidEarly: [
      'combat as the opening move unless the authored chapter pressure makes it unavoidable',
      'assuming the player already understands setting terms, institutions, or why the PC is involved',
      `generic opening beats detached from ${config.name}'s genre pressure`,
    ],
  }
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

function signatureInventory(
  playbook: CharacterClass
): NonNullable<AuthorInputSeed['pcCapabilities']>['signatureInventory'] {
  return playbook.startingInventory
    .filter((item) =>
      Boolean(item.damage || item.effect || item.charges) ||
      /badge|cash|credential|deck|file|journal|kit|ledger|license|map|notebook|seal|tools|writ/i.test(item.name)
    )
    .slice(0, 5)
    .map((item) => ({ name: item.name, description: item.description }))
}

function compilePcCapabilities(playbook: CharacterClass): AuthorInputSeed['pcCapabilities'] {
  return {
    proficiencies: [...playbook.proficiencies],
    traits: [{ name: playbook.trait.name, description: playbook.trait.description }],
    signatureInventory: signatureInventory(playbook),
    ...(playbook.openingKnowledge ? { openingKnowledge: playbook.openingKnowledge } : {}),
    playbookProfile: playbook.playbookProfile,
  }
}

function resolveSetup(selection: Sf2SetupSelection): {
  config: GenreConfig
  originName: string
  playbook: CharacterClass
  hook: OpeningHookObject
} {
  const config = getGenreConfig(selection.genreId as Genre)
  const origin = getSf2SetupOrigin(config, selection.originId)
  const playbook = getSf2SetupPlaybook(config, origin.id, selection.playbookId)
  const hook = getSf2SetupHook(config, origin.id, playbook, selection.hookId)
  return { config, originName: origin.name, playbook, hook }
}

export function compileSf2SetupSeed(selection: Sf2SetupSelection): AuthorInputSeed {
  const { config, originName, playbook, hook } = resolveSetup(selection)
  const title = deriveTitle(config, hook)
  const calibrationAnswers = clampSf2SetupCalibrationAnswers(selection.calibrationAnswers)
  const calibrationSummary = renderSf2SetupCalibrationSummary(calibrationAnswers)
  return {
    genreId: config.id,
    genreName: config.name,
    originId: selection.originId,
    originName,
    playbookId: playbook.id,
    playbookName: playbook.name,
    hook: {
      title,
      premise: hook.hook,
      crucible: deriveCrucible(hook),
      ...(hook.frame?.objective ? { objective: hook.frame.objective } : {}),
      ...(hook.arc?.name ? { arcName: hook.arc.name } : {}),
      ...(hook.arc?.episode ? { firstEpisode: hook.arc.episode } : {}),
    },
    worldRules: buildWorldRules(config, originName, playbook.name, hook),
    toneRules: buildToneRules(config),
    npcRules: buildNpcRules(config),
    onboardingRules: buildOnboardingRules(config, title),
    pcCapabilities: compilePcCapabilities(playbook),
    ...(calibrationAnswers.length > 0 && calibrationSummary
      ? {
          playerCalibration: {
            answers: calibrationAnswers,
            summary: calibrationSummary,
          },
        }
      : {}),
  }
}

export function buildSf2PlayerFromSetupSelection(
  selection: Sf2SetupSelection,
  playerName: string
): Sf2Player {
  const { originName, playbook } = resolveSetup(selection)
  const traitUses = playbook.trait.usesPerDay

  return {
    name: playerName,
    species: originName,
    origin: { id: selection.originId, name: originName },
    class: { id: playbook.id, name: playbook.name },
    level: 1,
    hp: { current: playbook.startingHp, max: playbook.startingHp },
    ac: playbook.startingAc,
    credits: playbook.startingCredits,
    stats: { ...playbook.stats },
    proficiencies: [...playbook.proficiencies],
    inventory: playbook.startingInventory.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      qty: item.quantity,
      tags: tagsForStartingItem(item),
      damage: item.damage,
      effect: item.effect,
      charges: item.charges,
      maxCharges: item.maxCharges,
    })),
    traits: [
      {
        id: playbook.trait.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        name: playbook.trait.name,
        description: playbook.trait.description,
        uses: { current: playbook.trait.usesRemaining ?? traitUses, max: traitUses },
      },
    ],
    tempModifiers: [],
    inspiration: 0,
    exhaustion: 0,
  }
}

export function describeSf2SetupSelection(selection: Sf2SetupSelection): {
  seedId: string
  hookTitle: string
  hookId: string
} {
  const { config, hook } = resolveSetup(selection)
  return {
    seedId: createSf2SetupSelectionId(selection),
    hookTitle: deriveTitle(config, hook),
    hookId: getSf2SetupHookId(config, hook),
  }
}
