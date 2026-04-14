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
export const DISPOSITION_TIERS: readonly DispositionTier[] = ['hostile', 'wary', 'neutral', 'favorable', 'trusted'] as const

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
  voiceNote?: string      // speech rhythm: "Short sentences. Grunts. Mechanical metaphors."
  combatTier?: 1 | 2 | 3 | 4 | 5  // stat derivation tier, set once per NPC
  combatNotes?: string    // fighting style: "tactical, focuses fire, won't fight alone"
  tempLoad?: TempLoadEntry[]  // what this crew member is carrying (stress, trauma, unresolved promises)
  signatureLines?: string[]   // 2-4 preserved exact quotes that capture this NPC's voice at pivotal moments
}

export interface TempLoadEntry {
  description: string
  severity: 'mild' | 'moderate' | 'severe'
  acquired: string  // when/where: "Ch 2, Athex-7" or "Pinnacle infiltration"
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

export interface Decision {
  id: string
  summary: string           // "Trust Voss despite the forged credentials"
  context: string           // "Confrontation in the docking bay — Voss couldn't explain the forgery"
  category: 'moral' | 'tactical' | 'strategic' | 'relational'
  status: 'active' | 'superseded' | 'abandoned' | 'spent'
  reason?: string           // Why it was superseded/abandoned
  chapter: number           // When it was made
  witnessed?: boolean       // True when PC directly witnessed the human cost — narrative currency
  spentOn?: string          // What the witness mark was spent on (e.g. "Defied Synod Seeker Voss")
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

export interface Assessment {
  claim: string           // "Carren talks if it serves her"
  skill: string           // "WIS Insight"
  result: number          // 18
  confidence: 'low' | 'moderate' | 'high'
  rolled: boolean         // false = unrolled assessment, flagged in state
}

export interface OperationObjective {
  text: string
  status: 'active' | 'completed' | 'failed'
}

export interface OperationState {
  name: string            // "Pinnacle Strike" / "The Waterfront Sting"
  phase: 'planning' | 'pre-insertion' | 'active' | 'extraction' | 'complete'
  objectives: OperationObjective[]  // ordered priority stack
  tacticalFacts: string[] // key details informing decisions
  assetConstraints: string[] // what each unit can/cannot do
  abortConditions: string[]
  signals: string[]       // who signals what and how
  assessments: Assessment[]
}

export interface Clue {
  id: string
  title?: string  // short descriptive label (e.g. "Betting Slip", "Pawn Receipt")
  content: string
  source: string
  tags: string[]
  discoveredChapter: number
  connectionIds: string[]  // IDs of connections this clue participates in
  isRedHerring: boolean
  status?: 'active' | 'solved' | 'archived'  // solved = resolved/explained, archived = no longer relevant
  /** @deprecated Use connectionIds. Kept for migration compatibility. */
  connected?: string[]
}

export type ConnectionTier = 'lead' | 'enriched' | 'breakthrough'

export interface ClueConnection {
  id: string
  sourceIds: string[]  // clue IDs or connection IDs
  title: string  // descriptive summary of what the connection means (e.g. "Financial Desperation")
  revelation: string
  tier: ConnectionTier  // derived: clue+clue=lead, lead+lead=breakthrough, etc.
  tainted: boolean  // true if any source has isRedHerring — hidden from player, visible to GM
  status?: 'active' | 'solved' | 'archived' | 'disproven'
  /** @deprecated Use sourceIds. Kept for migration compatibility. */
  clueIds?: string[]
}

export interface Notebook {
  activeThreadTitle: string
  clues: Clue[]
  connections: ClueConnection[]
}

export interface ExplorationState {
  facilityName: string      // "Pinnacle Station" / "Ruins of Kal'Theros"
  status: string            // "hostile, cipher disrupted" / "unexplored, dark"
  hostile: boolean           // true = infiltration rules, false = social rules with spatial tracking
  explored: { name: string; notes: string }[]
  current: { name: string; description: string }
  unexplored: { name: string; hints: string }[]
  resources: { name: string; current: string }[]
  alertLevel?: string       // narrative description of facility awareness
}

export interface Timer {
  id: string
  description: string      // "Renn trigger package ready"
  deadline: string          // "Day 27, 0600"
  status: 'active' | 'expired' | 'completed'
}

export interface HeatTracker {
  faction: string           // "Helix" / "Vasek"
  level: 'none' | 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]         // ["Pinnacle breach", "Carren flag"]
}

export interface LedgerEntry {
  amount: number            // negative = spending, positive = earning
  description: string       // "Kaelish Gold for Patel"
  day: string               // "Day 24"
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
  operationState: OperationState | null  // multi-phase plan persistence
  explorationState: ExplorationState | null  // spatial exploration tracking
  timers: Timer[]               // hard calendar deadlines
  heat: HeatTracker[]           // aggregate exposure per faction
  ledger: LedgerEntry[]         // recent transaction history
  decisions: Decision[]          // non-operational player choices that persist across history window
}

export interface CombatAbility {
  name: string            // "Mind Blast"
  effect: string          // "INT save DC 16 or stunned 1 round"
  range?: string          // "30ft cone" / "melee"
  cooldown?: string       // "recharge on 5-6" / "1/encounter"
}

export interface CombatPosition {
  entity: string          // "Rix" / "Mind Flayer" / "Pit trap"
  position: string        // "center, behind pillar (half cover)"
  status?: string         // "stunned round 2 of 3"
}

export interface CombatSpatialState {
  environment: string     // "Chamber 40x30ft, pillar center, pit south"
  positions: CombatPosition[]
  exits: string[]         // "East door (locked, Thrall B adjacent)"
}

export interface Enemy {
  id: string
  name: string
  hp: { current: number; max: number }
  ac: number
  attackBonus: number
  damage: string
  description?: string
  abilities?: CombatAbility[]
}

export interface CombatState {
  active: boolean
  round: number
  enemies: Enemy[]
  log: string[]
  spatialState?: CombatSpatialState
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
  sides?: number        // die sides (6, 8, 10, 12, 20); default 20
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string   // e.g. "energy", "fire", "slashing", "HP"
}

export interface ChatMessage {
  id: string
  role: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll' | 'scene-break'
  content: string
  timestamp: string
  rollData?: RollDisplayData
  statChanges?: { type: 'gain' | 'loss' | 'new' | 'neutral'; label: string }[]
  rollBreakdown?: RollBreakdown
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
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
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
  messages?: ChatMessage[]  // archived chat messages for completed chapters
  sceneSummaries?: SceneSummary[]  // preserved for cross-chapter memory (active arcs only)
  outcomeTier?: 'clean' | 'costly' | 'failure' | 'catastrophic'  // which outcome tier was reached
}

export interface OutcomeSpectrum {
  clean: string
  costly: string
  failure: string
  catastrophic: string
}

export interface ChapterFrame {
  objective: string
  crucible: string
  refined?: boolean  // true after one mid-chapter refinement has been applied
  outcomeSpectrum?: OutcomeSpectrum
}

export interface CloseData {
  completedChapterNumber: number
  completedChapterTitle: string
  nextChapterTitle: string
  resolutionMet: string
  forwardHook: string
  keyEvents: string[]
  levelUp: { oldLevel: number; newLevel: number; hpIncrease: number; oldHpMax: number; newHpMax: number; newProficiencyBonus?: number }
  skillPointsAwarded: string[]  // proficiency names added
  debrief: ChapterDebrief | null
  nextFrame: ChapterFrame | null
}

export interface HistoryState {
  messages: ChatMessage[]
  chapters: Chapter[]
  rollLog: RollRecord[]
}

export interface StorySummary {
  text: string            // 200-300 token narrative summary
  upToMessageIndex: number // messages[0..N] that were summarized
  turn: number            // player turn count when generated
}

export interface NpcFailure {
  npcName: string          // NPC name (from contested roll or check context)
  approach: string         // skill used (e.g. "Deception", "Intimidation")
  failures: number         // count of failures with this approach
  closed: boolean          // true when 3+ failures — approach is burned
}

export interface SceneSummary {
  text: string              // 2-4 sentence scene summary
  sceneNumber: number       // chapter-scoped (resets on chapter close)
  fromMessageIndex: number  // first message index in this scene
  toMessageIndex: number    // last message index in this scene
  toneSignature?: string    // 1-2 words: "quiet tension", "earned release", "accumulated dread"
}

export interface MetaState {
  version: string
  createdAt: string
  lastSaved: string
  chapterNumber: number
  chapterTitle: string
  genre: string
  sessionCount: number
  selectedHook?: string       // opening hook text, stored so buildInitialMessage doesn't re-select
  closeReady?: boolean
  closeReason?: string
  selfAssessment?: string
  chapterClosed?: boolean
  closeData?: CloseData
}

export interface GameState {
  meta: MetaState
  character: CharacterState
  world: WorldState
  combat: CombatState
  history: HistoryState
  chapterFrame: ChapterFrame | null
  storySummary: StorySummary | null  // legacy, kept for backward compat
  sceneSummaries: SceneSummary[]
  scopeSignals: number              // chapter-scoped scope signal count for pacing
  npcFailures: NpcFailure[]         // per-NPC per-approach failure tracking
  counters: Record<string, number>  // persistent genre counters (drift_exposure, corruption, etc.) — survive chapter close
  rulesWarnings: string[]           // injected by rules engine each turn, reset before next turn
  pivotalScenes: PivotalScene[]     // permanent, never rotated — chapter-defining moments with longer summaries
  rollSequences: RollSequence[]     // detected roll patterns (consecutive failures, breakthroughs)
  _pendingSceneSummary?: boolean    // true when set_location fired without scene_end — reminds Claude next turn
  _objectiveResolvedAtTurn?: number  // turn number when objective_status flipped to resolved/failed — drives close timing
  arcs: StoryArc[]                 // multi-chapter narrative arcs with episode milestones
}

export interface StoryArc {
  id: string              // snake_case, e.g. "expose_coll"
  title: string           // "Expose Coll before the hearing"
  status: 'active' | 'resolved' | 'abandoned'
  episodes: Episode[]
  outcomeSpectrum?: OutcomeSpectrum  // arc-level outcome tiers
}

export interface Episode {
  chapter: number         // which chapter this episode belongs to
  milestone: string       // "Find out who accused Maret and why"
  status: 'pending' | 'active' | 'complete'
  summary?: string        // arc-scoped: what this episode achieved toward the arc goal (1-2 sentences)
  outcomeTier?: 'clean' | 'costly' | 'failure' | 'catastrophic'  // which tier was reached
}

export interface PivotalScene {
  text: string        // ~300 token scene summary preserving specific imagery and callbacks
  chapter: number
  title: string       // short label: "The Caerun Corridor", "The Holding Room"
}

export interface RollSequence {
  description: string  // "5 consecutive failures against Caerun/Deception, released on nat 20 Persuasion"
  turns: string        // "Turns 15-20"
  chapter: number
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
      sides?: number
      rollType?: 'check' | 'damage' | 'healing'
      damageType?: string
    }
  | { type: 'tools'; results: ToolCallResult[] }
  | { type: 'chapter_title'; title: string }
  | { type: 'done' }
  | { type: 'retrying'; delayMs: number; reason: string }
  | { type: 'error'; message: string }
  | { type: 'token_usage'; usage: TokenUsage }

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

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
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
}

export interface ToolCallResult {
  tool: string
  input: Record<string, unknown>
}

export interface RollBreakdown {
  label: string       // e.g. "Guard Attack"
  dice: string        // e.g. "1d8+2"
  roll: number        // raw die result
  modifier: number    // total modifier applied
  total: number       // roll + modifier
  damageType?: string // e.g. "energy", "fire"
  sides?: number      // die sides (6, 8, 10, 12, 20)
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
  rollBreakdown?: RollBreakdown
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
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
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
