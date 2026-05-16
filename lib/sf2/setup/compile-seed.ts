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
      'clean exposition about the Hegemony before an NPC or institution makes it matter',
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
      'Synod officials speak in righteous procedure and frame control as care.',
      'House voices speak formally; every courtesy implies rank and leverage.',
      'Imperial officers speak in duty, chain of command, and contained discomfort.',
      'Undrift contacts speak cautiously and specifically because safety is temporary.',
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
      'Route access, docking, permits, reputation, debt, and cargo all become human leverage.',
      'Crew warmth matters because scarcity makes every choice costly.',
      'Law is local, factional, and often weaker than who controls the corridor.',
    ],
    bannedRegisters: [
      'fantasy props such as taverns, coins, nobles, quills, oaths, and spell language',
      'Hegemony-specific Synod, Resonant, tithe, allocation, and Drift doctrine',
      'exposition-dump explanation of the Compact Collapse',
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
      'Station officials speak in berth priority, safety codes, route permission, and liability.',
      'Corporate representatives speak in risk, contract terms, and enforceable debt.',
      'Pirates and collectors stay casual until leverage is established, then become exact.',
      'Crew members use shorthand, practical worry, and warmth under pressure.',
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
      'Collegium scholars speak in careful claims, citations, and reputation management.',
      'Lords and officials turn records into jurisdiction.',
      'Church voices frame dangerous knowledge as custody, heresy, duty, or care.',
      'Common folk describe symptoms and needs before theories.',
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
      'Every system records someone and erases someone else.',
      'Survival means choosing which compromise leaves you enough self to keep moving.',
      'Trust is scarce because surveillance makes loyalty expensive.',
    ],
    bannedRegisters: [
      'fantasy, feudal, or space-opera institutional language',
      'clean heroic prophecy or chosen-one framing',
      'exposition about corporate history before a system or person makes it matter',
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
      'Corporate voices speak in liability, assets, risk, and brand-safe threats.',
      'Fixers speak in partial truths and priced urgency.',
      'Street contacts speak practically; trust is shown through what they risk.',
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
      'Church voices speak in duty, ration, penance, and sanctioned necessity.',
      'Mercenaries speak plainly about price, risk, and who gets left behind.',
      'Civilians speak around fear until trust gives them a reason not to.',
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
      'Police voices mix fatigue, territoriality, and selective legality.',
      'Clients tell the truth in shapes that protect themselves.',
      'Syndicate voices are polite when violence is already implied.',
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
      `The player may not know ${config.name} yet. Teach it through behavior, pressure, and consequences from "${hookTitle}", not through a lore lecture.`,
    avoidEarly: [
      'combat as the opening move unless the authored chapter pressure makes it unavoidable',
      'direct exposition dump before a person, place, or procedure makes the information matter',
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
