import type { Species, CharacterClass, GenreConfig } from './index'

// ─── Cold War — Minimal Prototype Config ────────────────────────────
//
// One origin, one playbook, one hook. Enough to create a valid Sf2State
// for the Cardinal prototype brief. The prose-first narrator gets its
// system, stats, and mechanics from the campaign brief, not from here.

const coldWarOrigins: Species[] = [
  {
    id: 'cia',
    name: 'CIA',
    description: 'Agency field operative. You go in. You do the thing. You come out if the plan holds.',
    lore: 'Directorate of Operations. Trained at the Farm, posted through the Cold War\'s active theaters. Official cover at a consulate or embassy, NOC legend for deniable work. Start with one Station asset at Favorable (an established intelligence source you\'ve been running). One local contact at Wary (useful but cautious about association with Americans). Advantage on Tradecraft and Intel checks.',
    behavioralDirective: 'Default register: controlled, reading every environment for exits, surveillance, and the thing that doesn\'t fit. Compartmentalizes by habit — what the asset knows, what the station knows, what Langley knows are three different pictures. NPC reactions: station colleagues assess competence by operational track record; assets assess reliability by whether promises are kept; hostile services assess threat level by how much damage you\'ve done. When narrating interiority: the professional discipline that separates the work from the person doing it, the cost of maintaining that separation, and the growing question of whether the separation was ever real.',
    startingContacts: [
      {
        role: 'Station asset',
        disposition: 'favorable',
        description: 'An established intelligence source. Fourteen months of reliable product. The relationship is professional and the trust is operational.',
        npcRole: 'contact',
      },
      {
        role: 'Local contact',
        disposition: 'wary',
        description: 'Useful for local intelligence and logistics. Cautious about visible association with Americans.',
        npcRole: 'contact',
      },
    ],
  },
]

const coldWarPlaybooks: CharacterClass[] = [
  {
    id: 'field-operative',
    name: 'Field Operative',
    concept: 'The person they send when the work requires presence. Surveillance, dead drops, brush passes, black bag jobs — the physical craft of intelligence.',
    primaryStat: 'DEX',
    proficiencies: ['Tradecraft', 'Fieldcraft', 'Social', 'Intel'],
    stats: { STR: 12, DEX: 16, CON: 13, INT: 15, WIS: 14, CHA: 10 },
    startingInventory: [
      { id: 'walther_ppk', name: 'Walther PPK', description: 'Standard, German-sourced, deniable', quantity: 1, damage: '1d6' },
      { id: 'cover_documents', name: 'Cover Documents', description: 'Official cover and NOC legend documentation', quantity: 1 },
      { id: 'dead_drop_kit', name: 'Dead Drop Kit', description: 'Chalk, containers, signal materials', quantity: 1 },
      { id: 'camera', name: 'Subminiature Camera', description: 'For document photography in denied areas', quantity: 1 },
      { id: 'west_marks', name: 'West German Marks', description: 'Operating funds, clean bills', quantity: 1 },
    ],
    startingCredits: 200,
    startingHp: 10,
    startingAc: 11,
    hitDieAvg: 5,
    trait: {
      name: 'Tradecraft Instinct',
      description: 'Once per chapter, automatically succeed on a Tradecraft check for surveillance detection. The instinct fires before conscious thought — you notice the tail, the wrong car, the repeated face, before you know you\'re looking.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'Berlin is the world\'s most active espionage theater. Every major intelligence service has significant presence. You know the crossing procedures, the safe house locations, the surveillance detection routes through the western sectors. What you don\'t know is why CARDINAL went silent — and something about the station\'s explanation doesn\'t add up.',
    playbookProfile: {
      naturalMoves: ['run SDRs', 'service dead drops', 'elicit information', 'maintain cover under pressure', 'read hostile surveillance'],
      naturalDomains: ['espionage operations', 'asset management', 'institutional tension'],
    },
  },
]

const coldWarConfig: GenreConfig = {
  id: 'cold-war',
  name: 'Cold War',
  tagline: 'No shots fired. Everyone\'s already compromised.',
  available: false,
  species: coldWarOrigins,
  speciesLabel: 'Background',
  classes: coldWarPlaybooks,
  statLabels: {
    hp: 'Condition',
    defense: 'Cover',
    currency: 'Dollars',
    inspiration: 'Tradecraft Reserve',
  },
  theme: {
    logo: '🕵️',
    fontNarrative: 'var(--font-serif)',
    fontHeading: 'var(--font-sans)',
    fontSystem: 'var(--font-mono)',
    background: 'oklch(0.15 0.01 250)',
    foreground: 'oklch(0.85 0.02 200)',
    card: 'oklch(0.18 0.015 250)',
    cardForeground: 'oklch(0.85 0.02 200)',
    primary: 'oklch(0.55 0.12 250)',
    primaryForeground: 'oklch(0.95 0.01 250)',
    secondary: 'oklch(0.25 0.02 250)',
    secondaryForeground: 'oklch(0.75 0.03 200)',
    muted: 'oklch(0.22 0.015 250)',
    mutedForeground: 'oklch(0.55 0.02 200)',
    accent: 'oklch(0.45 0.08 30)',
    accentForeground: 'oklch(0.95 0.01 30)',
    destructive: 'oklch(0.50 0.15 25)',
    border: 'oklch(0.28 0.02 250)',
    input: 'oklch(0.25 0.015 250)',
    ring: 'oklch(0.55 0.12 250)',
    narrative: 'oklch(0.80 0.02 200)',
    meta: 'oklch(0.55 0.02 200)',
    success: 'oklch(0.55 0.10 150)',
    warning: 'oklch(0.60 0.12 80)',
    titleGlow: '0 0 20px oklch(0.55 0.12 250 / 0.3)',
    actionGlow: '0 0 10px oklch(0.55 0.12 250 / 0.2)',
    actionGlowHover: '0 0 15px oklch(0.55 0.12 250 / 0.4)',
    tertiary: 'oklch(0.30 0.02 250)',
    tertiaryForeground: 'oklch(0.65 0.02 200)',
    scrollbarThumb: 'oklch(0.30 0.02 250)',
    scrollbarThumbHover: 'oklch(0.35 0.03 250)',
    backgroundEffect: 'static',
  },
  currencyName: 'dollars',
  currencyAbbrev: '$',
  partyBaseName: 'Safe House',
  settingNoun: 'city',
  systemPromptFlavor: {
    role: 'Cold War intelligence thriller GM in the register of le Carré and The Americans.',
    setting: 'Berlin, October 1983. The coldest year of the Cold War\'s final decade.',
    vocabulary: 'SDR, dead drop, brush pass, asset, cutout, black bag, exfiltration, rolled up, legend, cover integrity.',
    tutorialContext: 'The player is a CIA field operative. Tradecraft has specific steps — don\'t shortcut them.',
  },
  promptSections: {
    role: '',
    setting: '',
    vocabulary: '',
    toneOverride: '',
    assetMechanic: '',
    traitRules: '',
    consumableLabel: '',
    tutorialContext: '',
    npcVoiceGuide: '',
    narrativeCraft: '',
    buildAssetState: null,
    investigationGuide: '',
  },
  companionLabel: 'Assets',
  notebookLabel: 'Case File',
  intelTabLabel: 'Intel',
  intelNotebookLabel: 'Cable Traffic',
  intelOperationLabel: 'Operation',
  explorationLabel: 'Location',
  heatLabel: 'Exposure',
  openingHooks: [
    {
      hook: 'cardinal',
      title: 'Cardinal',
      origins: ['cia'],
      classes: ['field-operative'],
      frame: {
        objective: 'Determine why CARDINAL has missed three dead drops and assess his status before the MIRROR drop tomorrow.',
        crucible: 'The station has a mole, CARDINAL is silent, and the Able Archer exercise in two weeks will make every operation in Berlin exponentially more dangerous.',
      },
    },
  ],
  initialChapterTitle: 'Cold Iron, Cold Council',
  locationNames: [
    'CIA Berlin Station',
    'Checkpoint Charlie',
    'Friedrichstrasse',
    'Karl-Marx-Allee',
    'Schönhauser Allee',
    'Pergamon Museum',
    'Charlottenburg Safe House',
    'Dahlem District',
  ],
  npcNames: [
    'Werner', 'Dieter', 'Klaus', 'Heinrich', 'Friedrich', 'Jürgen', 'Helmut', 'Rolf',
    'Ingrid', 'Brigitte', 'Monika', 'Renate', 'Ursula', 'Gudrun', 'Anneliese', 'Petra',
  ],
}

export default coldWarConfig
