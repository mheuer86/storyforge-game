import type { GameState, CharacterState, WorldState, ClueConnection } from './types'
import { getGenreConfig, genres as genreList, type Genre, type Species, type CharacterClass } from './genre-config'
import { findNpcIndexByName } from './npc-utils'

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
  // When playbooks exist for this origin, look up the class from there; otherwise fall back to universal classes
  const classPool = (config.playbooks?.[speciesId]) || config.classes
  const selectedClass = classPool.find((c) => c.id === classId)
  const selectedSpecies = config.species.find((s) => s.id === speciesId)

  if (!selectedClass || !selectedSpecies) {
    throw new Error(`Invalid class (${classId}) or species (${speciesId}) for genre ${genre}`)
  }

  // Select opening hook — priority: origin-specific > class-tagged > universal
  const playerClass = selectedClass.name.toLowerCase()
  const hookMatchTags = [playerClass, ...(selectedClass.hookTags || []).map(t => t.toLowerCase())]
  const allHooks = config.openingHooks
  // Origin-specific hooks (highest priority — most specific to this character)
  const originHooks = allHooks.filter(h =>
    typeof h !== 'string' && h.origins && h.origins.some(o => o.toLowerCase() === speciesId.toLowerCase())
  )
  // Class-tagged hooks (exclude origin-locked hooks for other origins)
  const classHooks = allHooks.filter(h => {
    if (typeof h === 'string') return false
    if (h.origins) return false // origin-tagged hooks handled separately
    return h.classes && h.classes.some(c => hookMatchTags.some(tag => tag.includes(c.toLowerCase())))
  })
  const universalHooks = allHooks.filter(h =>
    typeof h === 'string' || (!h.classes && !h.origins)
  )
  // Priority: 80% origin hooks if available, else 70% class hooks, else universal
  const pool = originHooks.length > 0 && Math.random() < 0.8 ? originHooks
    : classHooks.length > 0 && Math.random() < 0.7 ? classHooks
    : universalHooks.length > 0 ? universalHooks : allHooks
  const pickedHook = pool[Math.floor(Math.random() * pool.length)]
  const hookObj = typeof pickedHook === 'string' ? { hook: pickedHook } : pickedHook
  const hookTitle = hookObj.title || config.initialChapterTitle

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
    inspiration: false,
    exhaustion: 0,
  }

  const baseName = pickRandom(config.locationNames)

  const world: WorldState = {
    shipName: baseName,
    currentLocation: {
      name: 'Unknown',
      description: 'Starting location — the GM will establish this.',
    },
    factions: [],
    npcs: [],  // Claude creates named NPCs from origin lore + startingContacts context in first turn
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
    } : genre === 'grimdark' ? {
      hullCondition: -1,  // -1 = no integrity bar (Company uses dimension levels, not a single bar)
      systems: [
        { id: 'strength', name: 'Strength', level: 1, description: 'A handful of fighters, basic arms.' },
        { id: 'morale', name: 'Morale', level: 1, description: 'Fragile. One bad contract from breaking.' },
        { id: 'reputation', name: 'Reputation', level: 1, description: 'Known locally. Nobody special.' },
        { id: 'intelligence', name: 'Intelligence', level: 1, description: 'Rumor and hearsay. No scouts.' },
        { id: 'provisions', name: 'Provisions', level: 1, description: 'A week of supplies. No reserve.' },
      ],
      combatOptions: [],
      upgradeLog: [],
    } : genre === 'epic-scifi' ? (() => {
      const flavor = config.assetFlavors?.[speciesId]
      const systems = flavor
        ? flavor.systems.map(s => ({ ...s }))
        : [
            { id: 'sworn', name: 'Sworn', level: 1, description: '2 guards, basic arms.' },
            { id: 'intelligence', name: 'Intelligence', level: 1, description: 'Local informant network.' },
            { id: 'household', name: 'Household', level: 1, description: 'Basic quarters, one servant.' },
            { id: 'drift_capacity', name: 'Drift Capacity', level: 1, description: 'Access to one Resonant (shared).' },
            { id: 'reputation', name: 'Reputation', level: 1, description: 'Known within your house.' },
          ]
      return {
        hullCondition: -1,  // -1 = no integrity bar (retinue/network/remnant has no hull concept)
        systems,
        combatOptions: [],
        upgradeLog: [],
      }
    })() : null,
    tensionClocks: [],
    currentTime: '',
    notebook: null,
    operationState: null,
    explorationState: null,
    timers: [],
    heat: [],
    ledger: [],
    decisions: [],
  }

  // Pre-populate starting crew with random names from genre pool
  const crewTemplates = (hookObj as { startingCrew?: typeof config.startingCrew }).startingCrew ?? config.startingCrew ?? []
  if (crewTemplates.length > 0 && config.npcNames && config.npcNames.length > 0) {
    const shuffled = [...config.npcNames].sort(() => Math.random() - 0.5)
    world.npcs = crewTemplates.map((tpl, i) => ({
      name: shuffled[i % shuffled.length],
      description: tpl.description,
      lastSeen: `With the ${config.partyBaseName.toLowerCase()}`,
      role: 'crew' as const,
      disposition: tpl.disposition,
      voiceNote: tpl.voiceNote,
    }))
  }

  // Pre-populate starting contacts (noir, cyberpunk, etc.) — same pattern as crew
  const selectedOrigin = config.species.find(o => o.id === speciesId)
  const contactTemplates = selectedOrigin?.startingContacts ?? []
  if (contactTemplates.length > 0 && config.npcNames && config.npcNames.length > 0) {
    const usedNames = new Set(world.npcs.map(n => n.name))
    const available = config.npcNames.filter(n => !usedNames.has(n)).sort(() => Math.random() - 0.5)
    const contactNpcs = contactTemplates.map((tpl, i) => ({
      name: available[i % available.length],
      description: tpl.description,
      lastSeen: 'In the city',
      role: (tpl.npcRole ?? 'contact') as 'crew' | 'contact' | 'npc',
      disposition: tpl.disposition,
      ...(tpl.affiliation && { affiliation: tpl.affiliation }),
    }))
    world.npcs = [...world.npcs, ...contactNpcs]
  }

  // Build initial chapter frame from hook (if provided)
  const initialFrame = hookObj.frame
    ? { objective: hookObj.frame.objective, crucible: hookObj.frame.crucible }
    : null

  // Build initial arc from hook (if provided)
  const initialArcs = hookObj.arc
    ? [{
        id: hookObj.arc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        title: hookObj.arc.name,
        status: 'active' as const,
        episodes: [{
          chapter: 1,
          milestone: hookObj.arc.episode,
          status: 'active' as const,
        }],
      }]
    : []

  return {
    meta: {
      version: '1.0',
      createdAt: now,
      lastSaved: now,
      chapterNumber: 1,
      chapterTitle: hookTitle,
      genre: genre,
      sessionCount: 1,
      selectedHook: hookObj.hook,  // stored so buildInitialMessage can reuse without re-selecting
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
          title: hookTitle,
          status: 'in-progress',
          summary: '',
          keyEvents: [],
        },
      ],
      rollLog: [],
    },
    chapterFrame: initialFrame,
    storySummary: null,
    sceneSummaries: [],
    scopeSignals: 0,
    npcFailures: [],
    counters: {
      ...(hookObj.startingCounters || {}),
      // Two-way counters start at midpoint (Minor House standing)
      ...(speciesId === 'minor-house' && { standing: 5 }),
    },
    rulesWarnings: [],
    pivotalScenes: [],
    rollSequences: [],
    arcs: initialArcs,
  }
}

function deduplicateNpcs(state: GameState): GameState {
  const merged: typeof state.world.npcs = []
  for (const npc of state.world.npcs) {
    const existingIdx = findNpcIndexByName(merged, npc.name)
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
    // Migrate saves that predate notebook
    if (state.world.notebook === undefined) {
      state.world.notebook = null
    }
    // Migrate saves that predate chapterFrame
    if (state.chapterFrame === undefined) {
      state.chapterFrame = null
    }
    // Migrate saves that predate operationState
    if (state.world.operationState === undefined) {
      state.world.operationState = null
    }
    // Migrate saves that predate explorationState
    if (state.world.explorationState === undefined) {
      state.world.explorationState = null
    }
    // Migrate saves that predate timers/heat/ledger
    if (!state.world.timers) state.world.timers = []
    if (!state.world.heat) state.world.heat = []
    if (!state.world.ledger) state.world.ledger = []
    if (!state.world.decisions) state.world.decisions = []
    // Migrate cyberpunk saves that predate the tech rig
    if (state.meta.genre === 'cyberpunk' && !state.world.ship) {
      state.world.ship = {
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
      }
    }
    // Migrate notebook: add IDs to connections, rename clueIds→sourceIds, connected→connectionIds
    if (state.world.notebook) {
      const nb = state.world.notebook
      let migrated = false
      // Migrate connections: add id, sourceIds, tier, tainted
      nb.connections = nb.connections.map((conn) => {
        const c = conn as unknown as Record<string, unknown>
        if (!c.id) {
          migrated = true
          const sourceIds = (c.sourceIds ?? c.clueIds ?? []) as string[]
          const tainted = sourceIds.some(id => {
            const clue = nb.clues.find(cl => cl.id === id)
            return clue?.isRedHerring ?? false
          })
          const rawTitle = c.title as string | undefined
          const rawRevelation = (c.revelation ?? '') as string
          // Generate title from revelation if missing
          const title = rawTitle || (rawRevelation.length > 0 ? rawRevelation.split(/[.!?—]/)[0].trim().slice(0, 60) : 'Connection')
          return {
            id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sourceIds,
            title,
            revelation: rawRevelation,
            tier: 'lead' as const,
            tainted,
            ...(c.status ? { status: c.status as ClueConnection['status'] } : {}),
          }
        }
        // Ensure sourceIds exists (may have clueIds from partial migration)
        if (!c.sourceIds && c.clueIds) {
          migrated = true
          return { ...conn, sourceIds: c.clueIds as string[] }
        }
        // Backfill missing titles on already-migrated connections
        if (!c.title || (c.title as string).trim() === '') {
          migrated = true
          const rev = (c.revelation ?? '') as string
          const title = rev.length > 0 ? rev.split(/[.!?—]/)[0].trim().slice(0, 60) : 'Connection'
          return { ...conn, title }
        }
        return conn
      })
      // Migrate clues: connected→connectionIds
      nb.clues = nb.clues.map((clue) => {
        const c = clue as unknown as Record<string, unknown>
        if (c.connectionIds === undefined) {
          migrated = true
          // Build connectionIds from connections that reference this clue
          const connIds = nb.connections
            .filter(conn => conn.sourceIds.includes(clue.id))
            .map(conn => conn.id)
          return { ...clue, connectionIds: connIds }
        }
        return clue
      })
      if (migrated) {
        state.world.notebook = nb
      }
    }
    // Strip malformed decisions (summary or category missing/undefined) — one-time cleanup
    // for saves that captured the [undefined] "undefined" records pre-validation.
    if (Array.isArray(state.world.decisions)) {
      const validCategories = new Set(['moral', 'tactical', 'strategic', 'relational'])
      const before = state.world.decisions.length
      state.world.decisions = state.world.decisions.filter(d => {
        const summaryValid = typeof d?.summary === 'string' && d.summary.trim().length > 0
        const categoryValid = validCategories.has(d?.category as string)
        return summaryValid && categoryValid
      })
      if (state.world.decisions.length !== before) {
        console.log(`[SF] migrated: stripped ${before - state.world.decisions.length} malformed decision(s)`)
      }
    }
    // Stamp schemaVersion on any save that doesn't have one. Defaults to 1;
    // Stage 2 migration (when it ships) will bump to 2.
    if (state.meta && typeof state.meta.schemaVersion !== 'number') {
      state.meta.schemaVersion = 1
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

  // Mirror auto-save to the matching save slot (by character name + genre)
  for (const slot of [1, 2, 3] as const) {
    const existing = getSaveSlot(slot)
    if (existing && existing.characterName === state.character.name && existing.genre === state.meta.genre) {
      saveToSlot(slot, updated)
      break
    }
  }
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
