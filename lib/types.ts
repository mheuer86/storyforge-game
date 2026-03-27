// Full game state types for Storyforge V1

export interface StatBlock {
  STR: number
  DEX: number
  CON: number
  INT: number
  WIS: number
  CHA: number
}

export interface InventoryItem {
  id: string
  name: string
  description: string
  quantity: number
  damage?: string
  effect?: string
  charges?: number
  maxCharges?: number
}

export interface TempModifier {
  id: string
  name: string
  stat: keyof StatBlock | 'AC' | 'attack' | 'all'
  value: number
  duration: string
}

export interface Trait {
  name: string
  description: string
  usesPerDay: number
  usesRemaining: number
}

export interface CharacterState {
  name: string
  species: string
  class: string
  level: number
  hp: { current: number; max: number }
  ac: number
  credits: number
  stats: StatBlock
  proficiencies: string[]
  proficiencyBonus: number
  inventory: InventoryItem[]
  tempModifiers: TempModifier[]
  traits: Trait[]
}

export interface Faction {
  name: string
  stance: string
}

export interface NPC {
  name: string
  description: string
  lastSeen: string
  relationship?: string
}

export interface Thread {
  id: string
  title: string
  status: string
  deteriorating: boolean
}

export interface Promise {
  id: string
  to: string
  what: string
  status: 'open' | 'fulfilled' | 'broken'
}

export interface WorldState {
  shipName: string
  currentLocation: { name: string; description: string }
  factions: Faction[]
  npcs: NPC[]
  threads: Thread[]
  promises: Promise[]
}

export interface Enemy {
  id: string
  name: string
  hp: { current: number; max: number }
  ac: number
  attackBonus: number
  damage: string
  description?: string
}

export interface CombatState {
  active: boolean
  round: number
  enemies: Enemy[]
  log: string[]
}

export interface ChatMessage {
  id: string
  role: 'gm' | 'player' | 'meta-question' | 'meta-response'
  content: string
  timestamp: string
}

export interface RollRecord {
  id: string
  check: string
  stat: string
  dc: number
  roll: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  reason: string
  timestamp: string
}

export interface Chapter {
  number: number
  title: string
  status: 'complete' | 'in-progress'
  summary: string
  keyEvents: string[]
}

export interface HistoryState {
  messages: ChatMessage[]
  chapters: Chapter[]
  rollLog: RollRecord[]
}

export interface MetaState {
  version: string
  createdAt: string
  lastSaved: string
  chapterNumber: number
  chapterTitle: string
  genre: string
  sessionCount: number
}

export interface GameState {
  meta: MetaState
  character: CharacterState
  world: WorldState
  combat: CombatState
  history: HistoryState
}

// API streaming event types
export type StreamEvent =
  | { type: 'text'; content: string }
  | {
      type: 'roll'
      check: string
      stat: string
      dc: number
      roll: number
      modifier: number
      total: number
      result: 'critical' | 'success' | 'failure' | 'fumble'
      reason: string
    }
  | { type: 'tools'; results: ToolCallResult[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface ToolCallResult {
  tool: string
  input: Record<string, unknown>
}

// Tool input types
export interface UpdateCharacterInput {
  hpChange?: number
  hpSet?: number
  creditsChange?: number
  inventoryAdd?: InventoryItem[]
  inventoryRemove?: string[]
  tempModifierAdd?: TempModifier
  tempModifierRemove?: string
  traitUpdate?: { name: string; usesRemaining: number }
}

export interface RequestRollInput {
  checkType: string
  stat: keyof StatBlock
  dc: number
  modifier: number
  reason: string
}

export interface StartCombatInput {
  enemies: Enemy[]
  description: string
}

export interface SuggestActionsInput {
  actions: string[]
}

export interface MetaResponseInput {
  content: string
}
