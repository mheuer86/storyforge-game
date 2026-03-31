import type { GameState, CharacterState, WorldState } from './types'
import { getGenreConfig, genres as genreList, type Genre, type Species, type CharacterClass } from './genre-config'

// Re-export types and data from genre-config so existing imports still work
export type { Genre, Species, CharacterClass } from './genre-config'
export { genres, getGenreConfig, applyGenreTheme } from './genre-config'

export const STORAGE_KEY = 'storyforge_gamestate'

// Default to space-opera for backward compatibility
export const species: Species[] = getGenreConfig('space-opera').species
export const characterClasses: CharacterClass[] = getGenreConfig('space-opera').classes

export function getSpeciesForGenre(genre: Genre): Species[] {
  return getGenreConfig(genre).species
}

export function getClassesForGenre(genre: Genre): CharacterClass[] {
  return getGenreConfig(genre).classes
}

export function getStatModifier(value: number): number {
  return Math.floor((value - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2
  if (level <= 8) return 3
  if (level <= 12) return 4
  return 5
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function createInitialGameState(
  characterName: string,
  speciesId: string,
  classId: string,
  genre: Genre = 'space-opera',
  gender: 'he' | 'she' | 'they' = 'they',
): GameState {
  const config = getGenreConfig(genre)
  const selectedClass = config.classes.find((c) => c.id === classId)
  const selectedSpecies = config.species.find((s) => s.id === speciesId)

  if (!selectedClass || !selectedSpecies) {
    throw new Error(`Invalid class (${classId}) or species (${speciesId}) for genre ${genre}`)
  }

  const now = new Date().toISOString()

  const character: CharacterState = {
    name: characterName,
    species: selectedSpecies.name,
    class: selectedClass.name,
    gender,
    level: 1,
    hp: { current: selectedClass.startingHp, max: selectedClass.startingHp },
    ac: selectedClass.startingAc,
    credits: selectedClass.startingCredits,
    stats: { ...selectedClass.stats },
    proficiencies: [...selectedClass.proficiencies],
    proficiencyBonus: getProficiencyBonus(1),
    inventory: selectedClass.startingInventory.map((item) => ({ ...item })),
    tempModifiers: [],
    traits: [{ ...selectedClass.trait }],
    skillPoints: { available: 0, log: [] },
  }

  const baseName = pickRandom(config.locationNames)

  const world: WorldState = {
    shipName: baseName,
    currentLocation: {
      name: 'Unknown',
      description: 'Starting location — the GM will establish this.',
    },
    factions: [],
    npcs: [],
    threads: [],
    promises: [],
    antagonist: null,
    crewCohesion: { score: 3, log: [] },
    ship: genre === 'space-opera' ? {
      hullCondition: 100,
      systems: [
        { id: 'engines', name: 'Engines', level: 1, description: 'Standard sublight drive. No piloting bonus.' },
        { id: 'weapons', name: 'Weapons', level: 1, description: '1d8 ship attack.' },
        { id: 'shields', name: 'Shields', level: 1, description: 'Standard deflectors. No damage reduction.' },
        { id: 'sensors', name: 'Sensors', level: 1, description: 'Short-range passive scan.' },
        { id: 'crew_quarters', name: 'Crew Quarters', level: 1, description: 'Functional. No cohesion bonus.' },
      ],
      combatOptions: [],
      upgradeLog: [],
    } : genre === 'cyberpunk' ? {
      hullCondition: 100,
      systems: [
        { id: 'neurofence', name: 'Neurofence', level: 1, description: 'Basic intrusion detection.' },
        { id: 'spectra', name: 'Spectra', level: 1, description: 'Passive ECM, reduces electronic signature.' },
        { id: 'redline', name: 'Redline', level: 1, description: 'Boost one ability check per chapter (risk of burnout).' },
        { id: 'panoptik', name: 'Panoptik', level: 1, description: 'Detect armed hostiles and surveillance in area.' },
        { id: 'skinweave', name: 'Skinweave', level: 1, description: 'Basic identity bypass for low-security.' },
      ],
      combatOptions: [],
      upgradeLog: [],
    } : null,
    tensionClocks: [],
  }

  return {
    meta: {
      version: '1.0',
      createdAt: now,
      lastSaved: now,
      chapterNumber: 1,
      chapterTitle: config.initialChapterTitle,
      genre: genre,
      sessionCount: 1,
    },
    character,
    world,
    combat: {
      active: false,
      round: 0,
      enemies: [],
      log: [],
    },
    history: {
      messages: [],
      chapters: [
        {
          number: 1,
          title: config.initialChapterTitle,
          status: 'in-progress',
          summary: '',
          keyEvents: [],
        },
      ],
      rollLog: [],
    },
  }
}

function deduplicateNpcs(state: GameState): GameState {
  const merged: typeof state.world.npcs = []
  for (const npc of state.world.npcs) {
    const nameLower = npc.name.toLowerCase()
    const existingIdx = merged.findIndex((x) => {
      const xLower = x.name.toLowerCase()
      return xLower === nameLower || xLower.startsWith(nameLower) || nameLower.startsWith(xLower)
    })
    if (existingIdx >= 0) {
      const existing = merged[existingIdx]
      const canonical = existing.name.length <= npc.name.length ? existing.name : npc.name
      merged[existingIdx] = { ...existing, ...npc, name: canonical }
    } else {
      merged.push(npc)
    }
  }
  if (merged.length === state.world.npcs.length) return state
  return { ...state, world: { ...state.world, npcs: merged } }
}

export function loadGameState(): GameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as GameState
    // Migrate saves that predate skillPoints
    if (!state.character.skillPoints) {
      state.character.skillPoints = { available: 0, log: [] }
    }
    // Migrate saves that predate tensionClocks
    if (!state.world.tensionClocks) {
      state.world.tensionClocks = []
    }
    const cleaned = deduplicateNpcs(state)
    // Persist the cleanup immediately if anything changed
    if (cleaned !== state) saveGameState(cleaned)
    return cleaned
  } catch {
    return null
  }
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return
  const updated = { ...state, meta: { ...state.meta, lastSaved: new Date().toISOString() } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearGameState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(QUICK_ACTIONS_KEY)
}

const QUICK_ACTIONS_KEY = 'storyforge_quickactions'

export function loadQuickActions(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUICK_ACTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveQuickActions(actions: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(actions))
}

// ── Manual save slots ────────────────────────────────────────────────────────

const SAVE_SLOT_KEY = (slot: 1 | 2 | 3) => `storyforge_save_${slot}`

export interface SaveSlotData {
  slot: 1 | 2 | 3
  savedAt: string
  characterName: string
  characterClass: string
  genre: string
  chapterNumber: number
  chapterTitle: string
  gameState: GameState
}

export function getSaveSlot(slot: 1 | 2 | 3): SaveSlotData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEY(slot))
    return raw ? (JSON.parse(raw) as SaveSlotData) : null
  } catch {
    return null
  }
}

export function saveToSlot(slot: 1 | 2 | 3, state: GameState): void {
  if (typeof window === 'undefined') return
  const data: SaveSlotData = {
    slot,
    savedAt: new Date().toISOString(),
    characterName: state.character.name,
    characterClass: state.character.class,
    genre: state.meta.genre,
    chapterNumber: state.meta.chapterNumber,
    chapterTitle: state.meta.chapterTitle,
    gameState: state,
  }
  localStorage.setItem(SAVE_SLOT_KEY(slot), JSON.stringify(data))
}

// Legacy type kept for UI component compatibility
export interface ChatMessage {
  id: string
  type: 'gm' | 'player' | 'meta-question' | 'meta-response'
  content: string
  timestamp: Date
}
