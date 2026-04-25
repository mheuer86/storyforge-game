// Storyforge v2 — canonical state and runtime types.
// Parallel track: zero imports from v1 lib/*.

export const SF2_SCHEMA_VERSION = '3.0.0' as const

// ─────────────────────────────────────────────────────────────────────────────
// Primitive aliases
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2EntityId = string
export type Sf2ChapterNumber = number
export type Sf2Tension = number // 0-10
export type Sf2DispositionTier =
  | 'hostile'
  | 'wary'
  | 'neutral'
  | 'favorable'
  | 'trusted'
export type Sf2ThreadStatus =
  | 'active'
  | 'resolved_clean'
  | 'resolved_costly'
  | 'resolved_failure'
  | 'resolved_catastrophic'
  | 'abandoned'
  | 'deferred'
export type Sf2DecisionStatus = 'active' | 'paid' | 'invalidated'
export type Sf2PromiseStatus = 'active' | 'kept' | 'broken' | 'released'
export type Sf2ClueStatus = 'floating' | 'attached' | 'consumed'
export type Sf2ArcStatus = 'active' | 'resolved' | 'abandoned'

// ─────────────────────────────────────────────────────────────────────────────
// Shared anchor-entity contract
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2NarrativeEntityBase {
  id: Sf2EntityId
  title: string
  chapterCreated: Sf2ChapterNumber
  retrievalCue: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Arcs
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2Arc extends Sf2NarrativeEntityBase {
  category: 'arc'
  status: Sf2ArcStatus
  threadIds: Sf2EntityId[]
  spansChapters: number
  noSingleResolvingAction: true
  stakesDefinition: string
  outcomeSpectrum?: Sf2OutcomeSpectrum
  resolvedInChapter?: Sf2ChapterNumber
}

// ─────────────────────────────────────────────────────────────────────────────
// Threads
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2OwnerRef {
  kind: 'npc' | 'faction'
  id: Sf2EntityId
}

export interface Sf2Clock {
  kind: 'clock'
  segments: number
  filled: number
}

export interface Sf2Timer {
  kind: 'timer'
  deadline: string
}

export type Sf2Deterioration = Sf2Clock | Sf2Timer

export interface Sf2Thread extends Sf2NarrativeEntityBase {
  category: 'thread'
  status: Sf2ThreadStatus
  owner: Sf2OwnerRef
  stakeholders: Sf2OwnerRef[]
  tension: Sf2Tension
  resolutionCriteria: string
  failureMode: string
  deterioration?: Sf2Deterioration
  anchoredArcId?: Sf2EntityId
  loadBearing: boolean
  spineForChapter?: Sf2ChapterNumber
  tensionHistory: Array<{ chapter: Sf2ChapterNumber; turn: number; value: Sf2Tension }>
  lastAdvancedTurn?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Decisions, promises, clues
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2Decision extends Sf2NarrativeEntityBase {
  category: 'decision'
  status: Sf2DecisionStatus
  anchoredTo: Sf2EntityId[] // threads; required non-empty
  summary: string
  madeByPC: boolean
  turn: number
}

export interface Sf2Promise extends Sf2NarrativeEntityBase {
  category: 'promise'
  status: Sf2PromiseStatus
  anchoredTo: Sf2EntityId[] // threads; required non-empty
  owner: Sf2OwnerRef // to whom the promise is made
  obligation: string
  turn: number
}

export interface Sf2Clue extends Sf2NarrativeEntityBase {
  category: 'clue'
  status: Sf2ClueStatus
  anchoredTo: Sf2EntityId[] // threads; may be empty (floating)
  content: string
  discoveredInScene?: Sf2EntityId
  turn: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Temporal anchors
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2TemporalAnchorKind =
  | 'deadline'
  | 'timestamp'
  | 'duration'
  | 'sequence'
  | 'recurrence'
export type Sf2TemporalAnchorStatus = 'active' | 'elapsed' | 'resolved' | 'superseded'

export interface Sf2TemporalAnchor extends Sf2NarrativeEntityBase {
  category: 'temporal_anchor'
  kind: Sf2TemporalAnchorKind
  status: Sf2TemporalAnchorStatus
  label: string
  anchorText: string
  anchoredTo: Sf2EntityId[]
  turn: number
}

// ─────────────────────────────────────────────────────────────────────────────
// NPCs
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2PronounAnchor = 'she/her' | 'he/him' | 'they/them' | 'other'

export interface Sf2NpcIdentity {
  keyFacts: string[] // immutable; max 3
  pronoun?: Sf2PronounAnchor // anchored once established
  age?: string // anchored once established; exact age or compact age band
  voice: { note: string; register: string }
  relations: Array<{ toId: Sf2EntityId; kind: string; strength: number }>
  vulnerability?: string
}

export interface Sf2NpcAgenda {
  pursuing: string
  methods: string[]
  currentMove: string
  blockedBy?: string
}

export type Sf2NpcStatus = 'alive' | 'dead' | 'gone' | 'unknown'
export type Sf2NpcRole = 'crew' | 'contact' | 'npc'

export interface Sf2Npc {
  id: Sf2EntityId
  name: string
  affiliation: string
  role: Sf2NpcRole
  status: Sf2NpcStatus
  disposition: Sf2DispositionTier
  identity: Sf2NpcIdentity
  tempLoad?: number
  agenda?: Sf2NpcAgenda
  ownedThreadIds: Sf2EntityId[]
  retrievalCue: string
  chapterCreated: Sf2ChapterNumber
  lastSeenTurn?: number
  signatureLines: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Factions
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2HeatLevel = 'none' | 'low' | 'medium' | 'high' | 'boiling'

export interface Sf2FactionAgenda {
  pursuing: string
  methods: string[]
  currentMove: string
  blockedBy?: string
}

export interface Sf2Faction {
  id: Sf2EntityId
  name: string
  stance: Sf2DispositionTier
  heat: Sf2HeatLevel
  heatReasons: string[]
  agenda?: Sf2FactionAgenda
  ownedThreadIds: Sf2EntityId[]
  retrievalCue: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene state
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2Location {
  id: Sf2EntityId
  name: string
  description: string
  atmosphericConditions?: string[]
}

export interface Sf2SceneSnapshot {
  sceneId: Sf2EntityId
  location: Sf2Location
  presentNpcIds: Sf2EntityId[]
  timeLabel: string
  established: string[] // things the narration has made explicit in this scene
}

export interface Sf2SceneSummary {
  sceneId: Sf2EntityId
  chapter: Sf2ChapterNumber
  summary: string
  leadsTo:
    | 'unanswered_question'
    | 'kinetic_carry'
    | 'relational_tension'
    | 'unpaid_promise'
    | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter state (runtime + scaffolding + opening seed)
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2OutcomeSpectrum {
  clean: string
  costly: string
  failure: string
  catastrophic: string
}

export interface Sf2ChapterFrame {
  title: string
  premise: string
  activePressure: string
  centralTension: string
  chapterScope: string
  objective: string
  crucible: string
  outcomeSpectrum: Sf2OutcomeSpectrum
}

export interface Sf2AntagonistFace {
  id: string
  name: string
  role: string
  pressureStyle: string
}

export interface Sf2AntagonistPossibleFace extends Sf2AntagonistFace {
  becomesPrimaryWhen: string
  active: boolean
}

export interface Sf2AntagonistField {
  sourceSystem: string
  corePressure: string
  defaultFace: Sf2AntagonistFace
  currentPrimaryFace: Sf2AntagonistFace
  escalationLogic: string
}

export interface Sf2PressureLadderStep {
  id: string
  pressure: string
  triggerCondition: string
  narrativeEffect: string
  fired: boolean
  firedAtTurn?: number
}

export interface Sf2EditorializedLoreItem {
  item: string
  relevanceNow: string
  deliveryMethod: string
}

export interface Sf2OpeningSceneSpec {
  location: string
  atmosphericCondition: string
  initialState: string
  firstPlayerFacing: string
  immediateChoice: string
  noStartingCombat: boolean
  noExpositionDump: boolean
  // NPCs visible in the opening prose. A subset of startingNPCs (1-2 is the
  // target). Other startingNPCs exist in the chapter but are off-stage at
  // opening — they arrive, get referenced secondhand, or are discovered
  // later. If empty/omitted, transform falls back to all startingNPCs
  // (legacy behavior, produces the convened-room default).
  visibleNpcIds?: Sf2EntityId[]
  // Canonical premise facts the Author is DELIBERATELY withholding from the
  // opening prose. Held back so the player discovers them through play.
  // Opening prose must not state these facts even though they are true in
  // state. They emerge through play — question, contradiction, investigation,
  // NPC slip.
  withheldPremiseFacts?: string[]
}

// Output 1: persisted, retrieval-facing
export interface Sf2ChapterSetupRuntimeState {
  chapter: Sf2ChapterNumber
  title: string
  frame: Sf2ChapterFrame
  antagonistField: Sf2AntagonistField
  startingNpcIds: Sf2EntityId[]
  activeThreadIds: Sf2EntityId[]
  spineThreadId?: Sf2EntityId
  loadBearingThreadIds: Sf2EntityId[]
  carriedThreadIds: Sf2EntityId[]
  editorializedLore: Sf2EditorializedLoreItem[]
  openingSceneSpec: Sf2OpeningSceneSpec
  pressureLadder: Sf2PressureLadderStep[]
  surfaceThreads: Sf2EntityId[] // GM override (scene-scoped)
  surfaceNpcIds: Sf2EntityId[]
}

// Output 2: system-only scaffolding. Never reaches Narrator raw.
export interface Sf2ChapterSetupScaffolding {
  chapter: Sf2ChapterNumber
  npcHiddenPressures: Record<Sf2EntityId, string>
  antagonistFaces: Sf2AntagonistPossibleFace[]
  possibleRevelations: Array<{
    id: string
    statement: string
    heldBy: string
    emergenceCondition: string
    recontextualizes: string
    revealed: boolean
    revealedAtTurn?: number
  }>
  moralFaultLines: Array<{
    id: string
    tension: string
    sideA: string
    sideB: string
    whyItHurts: string
  }>
  escalationOptions: Array<{
    id: string
    type: 'bureaucratic' | 'social' | 'institutional' | 'physical'
    condition: string
    consequence: string
    used: boolean
    usedAtTurn?: number
  }>
}

// Output 3: Narrator-facing seed for the first scene only
export interface Sf2OpeningScenePacketSeed {
  sceneIntent: string
  openingPressure: string
  chapterObjective: string
  chapterCrucible: string
  visibleNpcIds: Sf2EntityId[]
  visibleThreadIds: Sf2EntityId[]
  loreForOpening: Array<{ item: string; renderedHint: string }>
  sceneWarnings: string[]
  // Canonical facts held off-page at opening — Narrator must not state them
  // in the first-turn prose.
  withheldPremiseFacts?: string[]
}

// Per-chapter retrospective close artifact
export interface Sf2ChapterMeaning {
  chapter: Sf2ChapterNumber
  situation: string
  tension: string
  ticking: string
  question: string
  closer: string
  closingResolution: 'clean' | 'costly' | 'failure' | 'catastrophic' | 'unresolved'
  synthesizedAtTurn: number
}

export interface Sf2ChapterArtifacts {
  opening: Sf2OpeningScenePacketSeed
  meaning?: Sf2ChapterMeaning
}

// ─────────────────────────────────────────────────────────────────────────────
// Author output (what the Author model emits as JSON)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthorInputSeed {
  genreId: string
  genreName: string
  playbookId: string
  playbookName: string
  originId: string
  originName: string
  hook: {
    title: string
    premise: string
    crucible: string
    // Fields below are optional by design — they represent scene-level
    // decisions that belong to the Author, not the seed. Present only when
    // Ch2+ derivation has specific continuity signals to pass forward.
    objective?: string
    arcName?: string
    firstEpisode?: string
  }
  worldRules: {
    settingSummary: string
    institutionalForces: string[]
    socialPressures: string[]
    bannedRegisters: string[]
    vocabulary: string[]
  }
  toneRules: { toneMix: string; narrativePrinciples: string[] }
  npcRules: {
    likelyAffiliations: string[]
    factionVoiceRules: string[]
    affiliationRequirement: string
  }
  onboardingRules: {
    playerKnowledgeAssumption: string
    avoidEarly: string[]
    // Fields below are optional — they are Author-derived scene decisions,
    // not seed prescriptions. Present only when explicitly carried from
    // Ch2+ continuity logic.
    mustIntroduce?: string[]
    firstCheckStyle?: string
    firstMoralWeight?: string
  }
}

export interface AuthorChapterSetupV2 {
  chapterFrame: Sf2ChapterFrame
  antagonistField: {
    sourceSystem: string
    corePressure: string
    defaultFace: { name: string; role: string; pressureStyle: string }
    possibleFaces: Array<{
      id: string
      name: string
      role: string
      becomesPrimaryWhen: string
      pressureStyle: string
    }>
    escalationLogic: string
  }
  startingNPCs: Array<{
    id: string
    name: string
    affiliation: string
    role: string
    voiceRegister: string
    dramaticFunction: string
    hiddenPressure: string
    retrievalCue: string
    initialDisposition: Sf2DispositionTier
    dispositionReason: string
  }>
  activeThreads: Array<{
    id: string
    title: string
    question: string
    ownerHint: string
    tension: number
    resolutionCriteria: string
    failureMode: string
    retrievalCue: string
  }>
  pressureLadder: Array<{
    id: string
    pressure: string
    triggerCondition: string
    narrativeEffect: string
  }>
  possibleRevelations: Array<{
    id: string
    statement: string
    heldBy: string
    emergenceCondition: string
    recontextualizes: string
  }>
  moralFaultLines: Array<{
    id: string
    tension: string
    sideA: string
    sideB: string
    whyItHurts: string
  }>
  escalationOptions: Array<{
    id: string
    type: 'bureaucratic' | 'social' | 'institutional' | 'physical'
    condition: string
    consequence: string
  }>
  editorializedLore: Array<{ item: string; relevanceNow: string; deliveryMethod: string }>
  openingSceneSpec: Sf2OpeningSceneSpec
  // Optional: transitions to apply to existing campaign threads at chapter open.
  // Used by the Author to close stale threads whose resolutionCriteria was met
  // in the prior chapter's prose but wasn't transitioned by the Archivist.
  threadTransitions?: Array<{
    id: string
    toStatus: Sf2ThreadStatus
    reason: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Player character
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2Player {
  name: string
  species: string
  origin: { id: string; name: string }
  class: { id: string; name: string }
  level: number
  hp: { current: number; max: number }
  ac: number
  credits: number
  stats: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number }
  proficiencies: string[]
  inventory: Array<{ name: string; qty: number; tags?: string[] }>
  traits: Array<{ name: string; uses?: { current: number; max: number } }>
  tempModifiers: Array<{ source: string; effect: string; expiresAtTurn?: number }>
  inspiration: number
  exhaustion: number
}

// ─────────────────────────────────────────────────────────────────────────────
// History / events
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2TurnRecord {
  index: number
  chapter: Sf2ChapterNumber
  playerInput: string
  narratorProse: string
  narratorAnnotation?: Sf2NarratorAnnotation
  // Raw Narrator tool-call input (snake_case, pre-normalization). Preserved
  // for audit/retrieval only — downstream code uses narratorAnnotation. The
  // normalized form zeros mechanical_effects; keeping the raw lets session
  // log review see what scene snapshots / hp deltas / scene_end signals the
  // Narrator actually emitted.
  narratorAnnotationRaw?: Record<string, unknown>
  archivistPatchApplied?: Sf2ArchivistPatch
  pacingClassification?: Sf2PacingClassification
  timestamp: string
}

export interface Sf2RollRecord {
  turn: number
  skill: string
  dc: number
  rollResult: number
  modifier: number
  outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure'
  consequenceSummary?: string
}

export interface Sf2History {
  turns: Sf2TurnRecord[] // full ring; scene packet pulls a short tail
  rollLog: Sf2RollRecord[]
  recentTurns: Sf2TurnRecord[] // bounded tail, derived but persisted for quick access
}

// ─────────────────────────────────────────────────────────────────────────────
// Narrator annotation (compact hint for Archivist; never authoritative memory)
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2PendingCheck {
  skill: string
  dc: number
  why: string
  consequenceOnFail: string
}

export interface Sf2NarratorAnnotation {
  pendingCheck?: Sf2PendingCheck
  mechanicalEffects: Array<
    | { kind: 'hp_delta'; value: number; reason: string }
    | { kind: 'credits_delta'; value: number; reason: string }
    | { kind: 'inventory_use'; item: string; reason: string }
    | { kind: 'set_location'; locationId: Sf2EntityId }
    | { kind: 'scene_end'; leadsTo: Sf2SceneSummary['leadsTo']; summary: string }
    | { kind: 'set_scene_snapshot'; snapshot: Sf2SceneSnapshot }
  >
  hintedEntities: {
    npcsMentioned: Sf2EntityId[]
    threadsTouched: Sf2EntityId[]
    decisionsImplied: string[] // free-text hints the Archivist can promote
    promisesImplied: string[]
    cluesDropped: string[]
  }
  authorialMoves: {
    plantedRevelationDeployed?: string // revelation id
    witnessMarkSurfaced?: string
    pivotSignaled?: boolean
  }
  suggestedActions: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Archivist patch (extract_turn output)
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2PatchConfidence = 'high' | 'medium' | 'low'

export interface Sf2ArchivistCreate {
  kind:
    | 'npc'
    | 'faction'
    | 'thread'
    | 'decision'
    | 'promise'
    | 'clue'
    | 'arc'
    | 'location'
    | 'temporal_anchor'
  payload: Record<string, unknown> // flat semantic statement; server resolves to typed entity
  confidence: Sf2PatchConfidence
  sourceQuote?: string // phrase from prose supporting this write
}

export interface Sf2ArchivistUpdate {
  entityKind: 'npc' | 'faction' | 'thread' | 'arc' | 'clue'
  entityId: Sf2EntityId
  changes: Record<string, unknown>
  confidence: Sf2PatchConfidence
  sourceQuote?: string
}

export interface Sf2ArchivistTransition {
  entityKind: 'thread' | 'decision' | 'promise' | 'clue' | 'arc'
  entityId: Sf2EntityId
  toStatus: string
  reason: string
  confidence: Sf2PatchConfidence
}

export interface Sf2ArchivistAttachment {
  kind: 'anchor_decision' | 'anchor_promise' | 'anchor_clue'
  entityId: Sf2EntityId
  threadIds: Sf2EntityId[]
  confidence: Sf2PatchConfidence
}

export interface Sf2PacingClassification {
  worldInitiated: boolean
  sceneEndLeadsTo: Sf2SceneSummary['leadsTo'] | 'not_applicable'
  tensionDeltasByThreadId: Record<Sf2EntityId, number>
}

export interface Sf2ArchivistFlag {
  kind:
    | 'npc_teleport'
    | 'anchor_reference_missing'
    | 'identity_drift'
    | 'protected_field_write'
    | 'contradiction'
    | 'annotation_mismatch_claims'
    | 'annotation_mismatch_shown'
  detail: string
  entityId?: Sf2EntityId
}

export interface Sf2LexiconAddition {
  phrase: string
  register: string
  exampleContext: string
}

// Archivist's post-turn coherence audit. Soft signal: feeds into the next
// Narrator turn as corrective context; does not block writes or retry.
export type Sf2CoherenceFindingType =
  | 'disposition_incoherence'
  | 'heat_mismatch'
  | 'stale_reentry'
  | 'clue_leak'
  | 'identity_drift'
  | 'npc_fabrication'
  // Prose-level drift detected by scanning the Narrator's prose against
  // canonical state. The Archivist scans NPC name/alias usage near pronouns
  // and ages; mismatches with locked state fields fire these.
  | 'pronoun_drift'
  | 'age_drift'
  // Surfaced from apply-patch outcomes per turn — a write that referenced a
  // thread/decision/clue id that didn't resolve. Already counted in
  // summary.anchorMisses; surfaced as a per-write finding so the per-turn
  // debug stream has evidence quotes and IDs.
  | 'anchor_miss'

export interface Sf2CoherenceFinding {
  type: Sf2CoherenceFindingType
  severity: 'low' | 'medium' | 'high'
  evidenceQuote: string
  stateReference: string // entity id or fact key the prose contradicted
  suggestedNote: string // ≤20 words, framed for next Narrator turn
}

export interface Sf2ArchivistPatch {
  turnIndex: number
  creates: Sf2ArchivistCreate[]
  updates: Sf2ArchivistUpdate[]
  transitions: Sf2ArchivistTransition[]
  attachments: Sf2ArchivistAttachment[]
  sceneResult?: Sf2SceneSummary
  pacingClassification: Sf2PacingClassification
  flags: Sf2ArchivistFlag[]
  lexiconAdditions?: Sf2LexiconAddition[]
  ladderFires?: string[]
  coherenceFindings?: Sf2CoherenceFinding[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval: working set + scene packet
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2WorkingSet {
  fullEntityIds: Sf2EntityId[]
  stubEntityIds: Sf2EntityId[]
  excludedEntityIds: Sf2EntityId[]
  reasonsByEntityId: Record<Sf2EntityId, string[]>
  computedAtTurn: number
}

export interface Sf2SceneLocationPacket {
  id: Sf2EntityId
  name: string
  description: string
  atmosphericConditions: string[]
}

export interface Sf2PresentCastPacket {
  npcId: Sf2EntityId
  name: string
  affiliation: string
  pronoun?: Sf2PronounAnchor
  age?: string
  disposition: Sf2DispositionTier
  voice: string
  currentRead: string
  relationToPlayer: string
  activePressure: string
  // Turns since the NPC was last on-stage, based on lastSeenTurn. Undefined for
  // brand-new NPCs this turn. Used by Narrator to flag dormant NPCs that need
  // re-establishment when the PC re-encounters them.
  turnsAbsent?: number
}

export interface Sf2ThreadPacket {
  threadId: Sf2EntityId
  title: string
  status: Sf2ThreadStatus
  tension: Sf2Tension
  localWhyItMatters: string
  ownerSummary: string
  stakeholderDispositions: Array<{ ownerKind: 'npc' | 'faction'; name: string; disposition: Sf2DispositionTier | Sf2HeatLevel }>
  deterioration?: string // rendered hint only
  anchoredDecisions: Array<{ id: Sf2EntityId; summary: string }>
  anchoredPromises: Array<{ id: Sf2EntityId; obligation: string }>
  anchoredClues: Array<{ id: Sf2EntityId; content: string }>
}

export interface Sf2ChapterPacket {
  objective: string
  crucible: string
  spineThreadId?: Sf2EntityId
  loadBearingThreadIds: Sf2EntityId[]
  currentPressureFace: string | null
  currentPressureStep?: { pressure: string; narrativeEffect: string }
}

export interface Sf2TemporalAnchorPacket {
  anchorId: Sf2EntityId
  kind: Sf2TemporalAnchorKind
  label: string
  anchorText: string
  status: Sf2TemporalAnchorStatus
  anchoredTo: Sf2EntityId[]
}

export interface Sf2MechanicsPacket {
  activeModules: Array<
    | { kind: 'combat'; roundsElapsed: number; enemies: Array<{ name: string; hp: number; ac: number }> }
    | { kind: 'operation'; phase: string; status: string }
    | { kind: 'exploration'; area: string; progress: string }
    | { kind: 'investigation'; clueCount: number; openLeads: string[] }
  >
  pendingCheck?: Sf2PendingCheck
  rollGate?: { skill: string; dc: number }
}

export interface Sf2RecentContextPacket {
  lastThreeTurns: Array<{ index: number; playerInput: string; narratorProse: string }>
  lastSceneSummary?: Sf2SceneSummary
}

export interface Sf2PacingAdvisory {
  reactivityRatio: number
  reactivityTripped: boolean
  sceneLinkStatus: 'forward_hook' | 'clean_closure' | 'insufficient_data'
  sceneLinkTripped: boolean
  stagnantThreadIds: Sf2EntityId[]
  arcDormantIds: Sf2EntityId[]
}

export interface Sf2NarratorScenePacket {
  scene: {
    sceneId: Sf2EntityId
    chapterNumber: Sf2ChapterNumber
    chapterTitle: string
    location: Sf2SceneLocationPacket
    timeLabel: string
    sceneIntent: string
  }
  player: Sf2PlayerPacket
  cast: Sf2PresentCastPacket[]
  tensions: Sf2ThreadPacket[]
  temporalAnchors: Sf2TemporalAnchorPacket[]
  chapter: Sf2ChapterPacket
  mechanics: Sf2MechanicsPacket
  recentContext: Sf2RecentContextPacket
  pacing: Sf2PacingAdvisory
  playerInput: { text: string; inferredIntent: string }
}

export interface Sf2PlayerPacket {
  name: string
  levelHp: string // "L3 · 18/24 HP"
  ac: number
  credits: number
  inspiration: number
  exhaustion: number
  activeTraits: Array<{ name: string; usesRemaining?: number }>
  tempModifiers: string[]
  className: string
  originName: string
  statModifiers: Array<{ stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'; mod: number }>
  proficiencies: string[]
  proficiencyBonus: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign meta
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2CampaignMeta {
  campaignId: string
  createdAt: string
  updatedAt: string
  schemaVersion: typeof SF2_SCHEMA_VERSION
  genreId: string
  playbookId: string
  originId: string
  currentChapter: Sf2ChapterNumber
  currentSceneId: Sf2EntityId
  currentTimeLabel: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Root state
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2LexiconEntry {
  phrase: string
  register: string // one-line note on what register this phrase carries
  exampleContext: string // a one-line phrase from prose where it appeared
  capturedAtTurn: number
  capturedInChapter: Sf2ChapterNumber
}

export interface Sf2Campaign {
  arcs: Record<Sf2EntityId, Sf2Arc>
  threads: Record<Sf2EntityId, Sf2Thread>
  decisions: Record<Sf2EntityId, Sf2Decision>
  promises: Record<Sf2EntityId, Sf2Promise>
  clues: Record<Sf2EntityId, Sf2Clue>
  temporalAnchors: Record<Sf2EntityId, Sf2TemporalAnchor>
  npcs: Record<Sf2EntityId, Sf2Npc>
  factions: Record<Sf2EntityId, Sf2Faction>
  locations: Record<Sf2EntityId, Sf2Location>
  floatingClueIds: Sf2EntityId[]
  pivotalSceneIds: Sf2EntityId[]
  lexicon: Sf2LexiconEntry[]
  // Writes the Archivist logged at low confidence (not applied). Surfaced to
  // the Narrator on the NEXT turn as "re-establish if still relevant" cues,
  // then cleared. The recovery path the v2 design calls load-bearing for
  // anchor-miss handling.
  pendingRecoveryNotes?: string[]
  // Archivist coherence findings from the prior turn, pre-formatted for the
  // Narrator. Single-use: Narrator reads them as corrective context on the
  // next turn, then route clears them. The raw structured findings live in
  // the debug stream; this is the Narrator-facing surface only.
  pendingCoherenceNotes?: string[]
}

export interface Sf2ChapterRuntime {
  number: Sf2ChapterNumber
  title: string
  setup: Sf2ChapterSetupRuntimeState
  scaffolding: Sf2ChapterSetupScaffolding
  artifacts: Sf2ChapterArtifacts
  sceneSummaries: Sf2SceneSummary[]
  currentSceneId: Sf2EntityId
}

export interface Sf2World {
  currentLocation: Sf2Location
  sceneSnapshot: Sf2SceneSnapshot
  currentTimeLabel: string
  combat?: {
    active: boolean
    round: number
    enemies: Array<{ name: string; hp: number; ac: number; abilities?: string[] }>
  }
  operation?: { phase: string; status: string }
  exploration?: { area: string; progress: string }
  // Scene-scoped pre-fetch: built once at scene open, carried in the message
  // chain with cache_control. Stays stable within a scene; cleared on
  // currentSceneId change or explicit scene_end. firstTurnIndex marks the
  // cutoff for replaying scene-local turn pairs from history.turns.
  sceneBundleCache?: {
    sceneId: Sf2EntityId
    bundleText: string
    builtAtTurn: number
    firstTurnIndex: number
  }
}

export interface Sf2Derived {
  workingSet?: Sf2WorkingSet
  pacing?: Sf2PacingAdvisory
  cohesion?: number // derived: average(crew dispositions) clamped 1-5
}

export interface Sf2State {
  meta: Sf2CampaignMeta
  campaign: Sf2Campaign
  player: Sf2Player
  chapter: Sf2ChapterRuntime
  world: Sf2World
  history: Sf2History
  derived: Sf2Derived
}

// ─────────────────────────────────────────────────────────────────────────────
// Firewall actor contract
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2Actor = 'narrator' | 'archivist' | 'author' | 'code' | 'unknown'

export type Sf2WriteKind =
  // Narrator-owned
  | 'hp_delta'
  | 'credits_delta'
  | 'inventory_use'
  | 'combat'
  | 'set_location'
  | 'scene_end'
  | 'set_scene_snapshot'
  | 'pending_check'
  | 'suggested_actions'
  | 'narrator_annotation'
  // Archivist-owned
  | 'create_entity'
  | 'update_entity'
  | 'entity_transition'
  | 'anchor_attachment'
  | 'pacing_classification'
  | 'drift_flag'
  // Author-owned (chapter boundary only)
  | 'chapter_setup'
  | 'chapter_meaning'
  // Code-owned
  | 'face_shift'
  | 'ladder_fire'
  | 'working_set_compute'
  | 'cohesion_recompute'

export interface Sf2ObservedWrite {
  actor: Sf2Actor
  kind: Sf2WriteKind
  turnIndex: number
  chapter: Sf2ChapterNumber
  entityId?: Sf2EntityId
  payload?: Record<string, unknown>
  timestamp: string
}
