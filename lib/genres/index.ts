import type { InventoryItem, Trait, ShipState } from '../types'

import spaceOperaConfig from './space-opera'
import fantasyConfig from './fantasy'
import cyberpunkConfig from './cyberpunk'
import grimdarkConfig from './grimdark'
import noireConfig from './noire'
import epicSciFiConfig from './epic-scifi'

// ─── Genre Config Interfaces ────────────────────────────────────────

export type Genre = 'space-opera' | 'fantasy' | 'grimdark' | 'cyberpunk' | 'noire' | 'epic-scifi' | 'western' | 'zombie' | 'wasteland' | 'cold-war'

export interface Species {
  id: string
  name: string
  description: string
  lore: string
}

export interface CharacterClass {
  id: string
  name: string
  concept: string
  primaryStat: string
  proficiencies: string[]
  stats: {
    STR: number
    DEX: number
    CON: number
    INT: number
    WIS: number
    CHA: number
  }
  startingInventory: InventoryItem[]
  startingCredits: number
  startingHp: number
  startingAc: number
  hitDieAvg: number  // average HP gained per level (before CON mod). Tanks: 6, mixed: 5, faces/casters: 4
  trait: Trait
}

export interface GenreTheme {
  logo: string
  fontNarrative: string
  fontHeading: string
  fontSystem: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  narrative: string
  meta: string
  success: string
  warning: string
  titleGlow: string
  actionGlow: string
  actionGlowHover: string
  tertiary: string
  tertiaryForeground: string
  scrollbarThumb: string
  scrollbarThumbHover: string
  backgroundEffect: 'starfield' | 'mist' | 'static' | 'drift'
  fontScale?: number  // multiplier for base font sizes — 1.0 is default, 0.9 = 90%
}

export interface GenreConfig {
  id: Genre
  name: string
  tagline: string
  available: boolean
  species: Species[]
  speciesLabel: string
  classes: CharacterClass[]
  theme: GenreTheme
  currencyName: string
  currencyAbbrev: string
  partyBaseName: string
  settingNoun: string
  systemPromptFlavor: {
    role: string
    setting: string
    vocabulary: string
    tutorialContext: string
  }
  promptSections: {
    role: string
    setting: string
    vocabulary: string
    toneOverride: string
    assetMechanic: string
    traitRules: string
    consumableLabel: string
    tutorialContext: string
    npcVoiceGuide: string
    buildAssetState: ((ship: ShipState, shipName: string) => string) | null
    investigationGuide: string
  }
  notebookLabel: string
  intelTabLabel: string
  intelNotebookLabel: string
  intelOperationLabel: string
  explorationLabel: string
  openingHooks: (string | { hook: string; title?: string; classes?: string[] })[]
  initialChapterTitle: string
  locationNames: string[]
}

// ─── Stubs ──────────────────────────────────────────────────────────

function makeStub(
  id: Genre,
  name: string,
  tagline: string,
  currencyName: string,
  currencyAbbrev: string,
  partyBaseName: string,
): GenreConfig {
  return {
    id,
    name,
    tagline,
    available: false,
    species: [],
    speciesLabel: 'Origin',
    classes: [],
    theme: { ...spaceOperaConfig.theme },
    currencyName,
    currencyAbbrev,
    partyBaseName,
    settingNoun: 'world',
    systemPromptFlavor: { role: '', setting: '', vocabulary: '', tutorialContext: '' },
    promptSections: { role: '', setting: '', vocabulary: '', toneOverride: '', assetMechanic: '', traitRules: '', consumableLabel: '', tutorialContext: '', npcVoiceGuide: '', buildAssetState: null, investigationGuide: '' },
    notebookLabel: 'Notebook',
    intelTabLabel: 'Intel',
    intelNotebookLabel: 'Evidence',
    intelOperationLabel: 'Operation',
    explorationLabel: 'Location',
    openingHooks: [],
    initialChapterTitle: 'New Horizons',
    locationNames: ['Base'],
  }
}

const westernConfig     = makeStub('western',       'Western',       'The frontier doesn\'t ask where you came from.',                 'dollars', '$',   'Camp')
const zombieConfig      = makeStub('zombie',        'Zombie Apocalypse', 'The dead keep moving. The living keep making it worse.',    'supplies', 'sup', 'Enclave')
const wastelandConfig   = makeStub('wasteland',     'Post-Atomic Wasteland', 'The bombs fell. Something stranger rose in their place.', 'caps',    'ƈ',   'Settlement')
const coldWarConfig     = makeStub('cold-war',      'Cold War',      'No shots fired. Everyone\'s already compromised.',              'dollars', '$',   'Safe House')

// ─── Registry ───────────────────────────────────────────────────────

const genreConfigs: Record<string, GenreConfig> = {
  'space-opera':  spaceOperaConfig,
  'fantasy':      fantasyConfig,
  'grimdark':     grimdarkConfig,
  'cyberpunk':    cyberpunkConfig,
  'noire':        noireConfig,
  'epic-scifi':   epicSciFiConfig,
  'western':      westernConfig,
  'zombie':       zombieConfig,
  'wasteland':    wastelandConfig,
  'cold-war':     coldWarConfig,
}

export const genres: { id: Genre; name: string; available: boolean }[] = [
  { id: 'space-opera',  name: 'Space Opera',   available: true  },
  { id: 'fantasy',      name: 'Fantasy',        available: true  },
  { id: 'grimdark',     name: 'Grimdark',       available: true  },
  { id: 'cyberpunk',    name: 'Cyberpunk',      available: true  },
  { id: 'noire',        name: 'Noir',           available: true  },
  { id: 'epic-scifi',   name: 'Epic Sci-Fi',    available: true  },
  { id: 'western',      name: 'Western',        available: false },
  { id: 'zombie',       name: 'Zombie Apocalypse',      available: false },
  { id: 'wasteland',    name: 'Post-Atomic Wasteland',  available: false },
  { id: 'cold-war',     name: 'Cold War',       available: false },
]

export function getGenreConfig(genre: Genre): GenreConfig {
  const config = genreConfigs[genre]
  if (!config) throw new Error(`Unknown genre: ${genre}`)
  return config
}

export function applyGenreTheme(genre: Genre): void {
  const theme = getGenreConfig(genre).theme
  const root = document.documentElement
  const bodyEl = document.body

  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--foreground', theme.foreground)
  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--card-foreground', theme.cardForeground)
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-foreground', theme.primaryForeground)
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--muted-foreground', theme.mutedForeground)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-foreground', theme.accentForeground)
  root.style.setProperty('--destructive', theme.destructive)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--input', theme.input)
  root.style.setProperty('--ring', theme.ring)
  root.style.setProperty('--narrative', theme.narrative)
  root.style.setProperty('--meta', theme.meta)
  root.style.setProperty('--success', theme.success)
  root.style.setProperty('--warning', theme.warning)
  root.style.setProperty('--title-glow', theme.titleGlow)
  root.style.setProperty('--action-glow', theme.actionGlow)
  root.style.setProperty('--action-glow-hover', theme.actionGlowHover)
  root.style.setProperty('--scrollbar-thumb', theme.scrollbarThumb)
  root.style.setProperty('--scrollbar-thumb-hover', theme.scrollbarThumbHover)
  root.style.setProperty('--tertiary', theme.tertiary)
  root.style.setProperty('--tertiary-foreground', theme.tertiaryForeground)
  bodyEl.style.setProperty('--font-narrative', theme.fontNarrative)
  bodyEl.style.setProperty('--font-heading', theme.fontHeading)
  bodyEl.style.setProperty('--font-system', theme.fontSystem)
  bodyEl.style.setProperty('--font-scale', String(theme.fontScale ?? 1))
  root.dataset.genre = genre

  // Background effects are handled purely by CSS via [data-genre] selectors
  // in globals.css — no JavaScript toggling needed
}
