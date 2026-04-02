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

export interface SkillPoints {
  available: number
  log: string[]
}

export interface CharacterState {
  name: string
  species: string
  class: string
  gender: 'he' | 'she' | 'they'
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
  skillPoints: SkillPoints
  inspiration: boolean
  exhaustion: number  // 0-6
}

export interface Faction {
  name: string
  stance: string
}

export type DispositionTier = 'hostile' | 'wary' | 'neutral' | 'favorable' | 'trusted'

export interface NPC {
  name: string
  description: string
  lastSeen: string
  relationship?: string
  role?: 'crew' | 'contact' | 'npc'
  subtype?: 'person' | 'vessel' | 'installation'  // vessels/installations shown separately from characters
  vulnerability?: string  // what hits this companion harder (used internally by cohesion system)
  disposition?: DispositionTier  // hidden relationship tier for contacts/npcs; never shown to player
  affiliation?: string  // faction or group name — used to group NPCs in the UI
  status?: 'active' | 'dead' | 'defeated' | 'gone'  // gone = left the story permanently
}

export interface CohesionLogEntry {
  chapterNumber: number
  companionName: string  // specific companion name, or 'crew' for general
  change: number  // +1 or -1
  reason: string
  timestamp: string
}

export interface CrewCohesion {
  score: number  // 1-5
  log: CohesionLogEntry[]
}

export interface ShipSystem {
  id: string
  name: string
  level: number  // 1-3
  description: string
}

export interface ShipState {
  hullCondition: number  // 0-100
  systems: ShipSystem[]
  combatOptions: string[]
  upgradeLog: string[]
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
  status: 'open' | 'strained' | 'fulfilled' | 'broken'
}

export interface AntagonistMove {
  chapterNumber: number
  description: string
  timestamp: string
}

export interface Antagonist {
  name: string
  description: string
  agenda: string
  movedThisChapter: boolean
  moves: AntagonistMove[]
  status?: 'active' | 'defeated' | 'dead' | 'fled'
}

export interface TensionClock {
  id: string
  name: string
  maxSegments: 4 | 6
  filled: number
  status: 'active' | 'triggered' | 'resolved'
  triggerEffect: string
}

export interface Clue {
  id: string
  title?: string  // short descriptive label (e.g. "Betting Slip", "Pawn Receipt")
  content: string
  source: string
  tags: string[]
  discoveredChapter: number
  connected: string[]
  isRedHerring: boolean
  status?: 'active' | 'solved' | 'archived'  // solved = resolved/explained, archived = no longer relevant
}

export interface ClueConnection {
  clueIds: string[]
  title: string  // descriptive summary of what the connection means (e.g. "Financial Desperation")
  revelation: string
  status?: 'active' | 'solved' | 'archived'
}

export interface Notebook {
  activeThreadTitle: string
  clues: Clue[]
  connections: ClueConnection[]
}

export interface WorldState {
  shipName: string
  currentLocation: { name: string; description: string }
  factions: Faction[]
  npcs: NPC[]
  threads: Thread[]
  promises: Promise[]
  antagonist: Antagonist | null
  crewCohesion: CrewCohesion
  ship: ShipState | null
  tensionClocks: TensionClock[]
  currentTime: string  // narrative timeline e.g. "Day 3, evening" or "Late afternoon"
  notebook: Notebook | null
  sceneSnapshot?: string  // persistent spatial/situational context: who is where, injuries, environment state
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

export interface RollDisplayData {
  check: string
  dc: number
  roll: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  reason: string
  advantage?: 'advantage' | 'disadvantage'
  rawRolls?: [number, number]
  contested?: { npcName: string; npcSkill: string; npcModifier: number }
  npcRoll?: number
  npcTotal?: number
  isOriginal?: boolean  // true = this was the original roll before an inspiration reroll (shown dimmed)
}

export interface ChatMessage {
  id: string
  role: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll' | 'scene-break'
  content: string
  timestamp: string
  rollData?: RollDisplayData
  statChanges?: { type: 'gain' | 'loss' | 'new' | 'neutral'; label: string }[]
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
  advantage?: 'advantage' | 'disadvantage'
  rawRolls?: [number, number]
  contested?: ContestedRollInfo
  npcRoll?: number
  npcTotal?: number
}

export interface ChapterDebrief {
  tactical: string      // letter grade or short rating
  strategic: string     // letter grade or short rating
  luckyBreaks: string[]
  costsPaid: string[]
  promisesKept: string[]
  promisesBroken: string[]
}

export interface Chapter {
  number: number
  title: string
  status: 'complete' | 'in-progress'
  summary: string
  keyEvents: string[]
  debrief?: ChapterDebrief
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
      type: 'roll_prompt'
      check: string
      stat: string
      dc: number
      modifier: number
      reason: string
      toolUseId: string
      pendingMessages: unknown[]
      advantage?: 'advantage' | 'disadvantage'
      contested?: ContestedRollInfo
      priorToolResults?: unknown[]
    }
  | { type: 'tools'; results: ToolCallResult[] }
  | { type: 'done' }
  | { type: 'retrying'; delayMs: number; reason: string }
  | { type: 'error'; message: string }

export interface RollResolution {
  roll: number
  check: string
  stat: string
  dc: number
  modifier: number
  reason: string
  toolUseId: string
  pendingMessages: unknown[]
  advantage?: 'advantage' | 'disadvantage'
  rawRolls?: [number, number]
  contested?: ContestedRollInfo
  npcRoll?: number
  npcTotal?: number
  priorToolResults?: unknown[]
}

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
  levelUp?: { newLevel: number; hpIncrease: number; newProficiencyBonus?: number }
  statIncrease?: { stat: string; amount: number }[]
  exhaustionChange?: number  // +1 to add, -1 to remove a level
  addProficiency?: string
  upgradeToExpertise?: string
  spendInspiration?: boolean
}

export interface ContestedRollInfo {
  npcName: string
  npcSkill: string
  npcModifier: number
}

export interface RequestRollInput {
  checkType: string
  stat: keyof StatBlock
  dc: number
  modifier: number
  reason: string
  advantage?: 'advantage' | 'disadvantage'
  contested?: ContestedRollInfo
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

export interface UpdateCohesionInput {
  direction: 1 | 0 | -1
  reason: string
  companionName?: string
}

export interface UpdateShipInput {
  hullConditionChange?: number
  upgradeSystem?: { id: string; newLevel: number; description: string }
  addCombatOption?: string
  upgradeLogEntry?: string
}
