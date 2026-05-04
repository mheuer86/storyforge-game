// Storyforge v2 — canonical state and runtime types.
// Parallel track: zero imports from v1 lib/*.

export const SF2_SCHEMA_VERSION = '3.1.0' as const

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
// Single source of truth for the beat tag vocabulary. Used by the type
// alias below AND by the archivist tool schema (lib/sf2/archivist/tools.ts)
// so they cannot drift apart.
// Single source of truth for the transient NPC state vocabulary. Read by the
// cast packet's imperative modulator (lib/sf2/retrieval/packets/cast.ts) and
// written by the archivist via the `temp_load_tag` field. Distinct from
// `tempLoad` (numeric saturation gauge) and from the beat tags below
// (`betrayed` here is the lingering state; `betrayal` in the beat list is the
// action that produced it).
export const SF2_TEMP_LOAD_TAGS = [
  'uneasy_under_scrutiny',
  'vulnerable',
  'betrayed',
  'exhausted',
  'cornered',
] as const
export type Sf2TempLoadTag = (typeof SF2_TEMP_LOAD_TAGS)[number]
export const SF2_EMOTIONAL_BEAT_TAGS = [
  'confession',
  'near_confession',
  'evasion',
  'betrayal',
  'loyalty_test',
  'restraint',
  'turning_point',
  'pivot',
  'breakthrough',
  'vulnerability',
  'cost_accepted',
  'boundary_drawn',
  'intimidation_landed',
  'intimidation_failed',
  'decision_revealed',
  'mask_slipped',
] as const
export type Sf2EmotionalBeatTag = (typeof SF2_EMOTIONAL_BEAT_TAGS)[number]
export type Sf2ArcScenarioMode =
  | 'public_crisis'
  | 'pursuit'
  | 'protection'
  | 'investigation'
  | 'chamber_play'
  | 'revolt'
  | 'extraction'
  | 'superior_fallout'
  | 'underground_network'
  | 'procedural_contest'
  | 'siege'
  | 'other'
export type Sf2RevealContext =
  | 'crisis_of_trust'
  | 'private_pressure'
  | 'documentary_surface'
  | 'confession'
  | 'accusation'
  | 'forced_disclosure'
  | 'inadvertent'

// Document lifecycle. Closed enum + per-type transition map (DOCUMENT_VALID_TRANSITIONS)
// constrains which statuses are reachable for each Sf2DocumentType.
export type Sf2DocumentStatus =
  | 'active'      // in force
  | 'superseded'  // replaced by a successor document or amendment
  | 'revoked'     // explicitly cancelled by issuing authority
  | 'void'        // invalidated (forged, expired, illegitimate, mis-issued)
  | 'resolved'    // concluded its purpose (petitions answered, etc.)

// Closed type taxonomy. Each carries lifecycle semantics — see DOCUMENT_VALID_TRANSITIONS.
// kindLabel on the document carries genre-specific flavor ("writ", "court order",
// "ship manifest", "edict") without locking the schema to one setting.
export type Sf2DocumentType =
  | 'authorization'  // grants permission/license: writ, charter, license, warrant
  | 'directive'      // commands an action: order, decree, summons, mandate
  | 'communication'  // reports/conveys: letter, memo, dispatch, report
  | 'record'         // attests to a fact: receipt, ledger entry, registry, log
  | 'petition'       // requests an action: appeal, plea, motion, request
  | 'notation'       // marginalia, addendum, annotation

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

export interface Sf2ArcPlan {
  id: Sf2EntityId
  status: Sf2ArcStatus
  title: string
  sourceHook: {
    title: string
    premise: string
    objective?: string
    crucible: string
    firstEpisode?: string
  }
  scenarioShape: {
    mode: Sf2ArcScenarioMode
    premise: string
    whyThisRun: string
    whatThisIsNot: string
    selectionRationale: string
    rejectedDefaultShape: string
  }
  arcQuestion: string
  coreCrucible: string
  invariantFacts: string[]
  variableTruthsForThisRun: string[]
  durableForces: Array<{
    id: string
    name: string
    agenda: string
    leverage: string
    fear: string
    pressureStyle: string
  }>
  durableNpcSeeds: Array<{
    id: string
    role: string
    affiliation: string
    dramaticFunction: string
    privatePressure: string
    reuseGuidance: string
  }>
  pressureEngines: Array<{
    id: string
    name: string
    aggregation?: Sf2EngineAggregation
    advancesWhen: string
    slowsWhen: string
    visibleSymptoms: string
  }>
  playerStanceAxes: Array<{
    id: string
    axis: string
    poleA: string
    poleB: string
    signalsA: string[]
    signalsB: string[]
    ifAHardens: string
    ifBHardens: string
  }>
  chapterFunctionMap: Array<{
    chapter: 1 | 2 | 3 | 4 | 5
    function: string
    pressureQuestion: string
    possibleEndStates: string[]
  }>
  possibleEndgames: string[]
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

export type Sf2ThreadResolutionGateStatus = 'open' | 'satisfied' | 'failed' | 'waived'

export interface Sf2ThreadResolutionGate {
  id: Sf2EntityId
  label: string
  condition: string
  required: boolean
  status: Sf2ThreadResolutionGateStatus
  satisfiedTurn?: number
  evidenceQuote?: string
}

export interface Sf2ThreadProgressEvent {
  id: Sf2EntityId
  turn: number
  summary: string
  evidenceQuote?: string
  gateIds?: Sf2EntityId[]
}

export interface Sf2Thread extends Sf2NarrativeEntityBase {
  category: 'thread'
  status: Sf2ThreadStatus
  owner: Sf2OwnerRef
  stakeholders: Sf2OwnerRef[]
  tension: Sf2Tension
  peakTension: Sf2Tension
  resolutionCriteria: string
  failureMode: string
  deterioration?: Sf2Deterioration
  anchoredArcId?: Sf2EntityId
  loadBearing: boolean
  spineForChapter?: Sf2ChapterNumber
  successorToThreadId?: Sf2EntityId
  chapterDriverKind?: Sf2ChapterThreadDriverKind
  resolutionGates: Sf2ThreadResolutionGate[]
  progressEvents: Sf2ThreadProgressEvent[]
  tensionHistory: Array<{ chapter: Sf2ChapterNumber; turn: number; value: Sf2Tension }>
  lastAdvancedTurn?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Pressure engines & chapter pressure runway
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2EngineAggregation = 'max' | 'average' | 'weighted'
export type Sf2EngineStatus = 'active' | 'resolved' | 'dormant'

export interface Sf2EngineRuntime {
  id: Sf2EntityId
  name: string
  status: Sf2EngineStatus
  summary: string
  aggregation: Sf2EngineAggregation
  anchorThreadIds: Sf2EntityId[]
  // Used only when aggregation === 'weighted'. If absent, anchorThreadIds[0]
  // is treated as primary. Set explicitly by arc-author when weighted is
  // chosen so primary doesn't depend on insertion order.
  primaryThreadId?: Sf2EntityId
  value: Sf2Tension
  advancesWhen: string
  slowsWhen: string
  visibleSymptoms: string
  lastUpdatedTurn?: number
  lastUpdatedChapter?: Sf2ChapterNumber
}

export type ThreadRole =
  | 'spine'
  | 'load_bearing'
  | 'active'
  | 'deferred'
  | 'background'
  | 'new'

export type Sf2ChapterThreadDriverKind = 'carry_forward' | 'successor' | 'new_pressure'

export interface Sf2ChapterThreadPressure {
  threadId: Sf2EntityId
  role: ThreadRole
  openingFloor: number
  localEscalation: number
  maxThisChapter: number
  cooledAtOpen: boolean
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

// Participant in an emotional beat. Either a campaign entity id or the
// literal 'pc' string for the player character (who has no entity record).
export type Sf2BeatParticipant = Sf2EntityId | 'pc'

export interface Sf2EmotionalBeat extends Sf2NarrativeEntityBase {
  category: 'emotional_beat'
  text: string
  participants: Sf2BeatParticipant[]
  anchoredTo: Sf2EntityId[]
  emotionalTags: Sf2EmotionalBeatTag[]
  salience: number
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
// Documents (writs, orders, records, petitions — anything with attribution)
// ─────────────────────────────────────────────────────────────────────────────

export interface Sf2DocumentParty {
  role: string             // counter-signer | witness | custodian | recipient | etc.
  entityId: Sf2EntityId    // npc or faction
}

export interface Sf2DocumentRevision {
  atTurn: number
  summary: string          // the new state of the document's terms
  reason: string           // what amended it (verdict, addendum, override)
  changedBy?: Sf2EntityId  // who effected the change, if attributable
}

// Per-type set of valid `toStatus` targets from `active`. Validated in apply-patch.
// authorization/directive can be revoked (issuing authority withdraws); communication
// can't (you can't un-send a letter); records void rather than revoke (a record is
// either correct or false); petitions resolve.
export const DOCUMENT_VALID_TRANSITIONS: Record<Sf2DocumentType, Sf2DocumentStatus[]> = {
  authorization: ['superseded', 'revoked', 'void'],
  directive: ['superseded', 'revoked', 'void'],
  communication: ['superseded', 'void'],
  record: ['void'],
  petition: ['resolved', 'superseded', 'void'],
  notation: ['superseded', 'void'],
}

export interface Sf2Document extends Sf2NarrativeEntityBase {
  category: 'document'
  type: Sf2DocumentType
  kindLabel: string                          // genre-flavor noun: "writ", "transfer order", "court summons"
  status: Sf2DocumentStatus
  // Attribution. filed != signed: a clerk can file a petition signed by a magistrate.
  filedByEntityId?: Sf2EntityId              // who originated/registered it
  signedByEntityId?: Sf2EntityId             // who authorized it
  signedAtTurn?: number
  additionalParties: Sf2DocumentParty[]      // counter-signer, witness, custodian, etc.
  subjectEntityIds: Sf2EntityId[]            // whom/what the document concerns
  authorizes: string                         // one-line: what it permits, commands, attests, requests
  // Drift detection contract: originalSummary is locked at creation, never edited.
  // currentSummary tracks the in-fiction active state. revisions append on amendment.
  // The document_attribution_drift scanner compares prose claims to originalSummary
  // (canonical) and the locked attribution fields above.
  originalSummary: string
  currentSummary: string
  revisions: Sf2DocumentRevision[]
  anchoredTo: Sf2EntityId[]                  // threads (may be empty; floating allowed but flagged)
  accessLevel?: 'public' | 'sealed' | 'classified'  // optional; not load-bearing for drift detection
  clueIds: Sf2EntityId[]                     // cross-ref: clues that record what the PC knows about this document
  turn: number                               // turn of creation
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
  lastUpdatedTurn?: number
}

export type Sf2NpcStatus = 'alive' | 'dead' | 'gone' | 'unknown'
export type Sf2NpcRole = string

export interface Sf2Npc {
  id: Sf2EntityId
  name: string
  affiliation: string
  role: Sf2NpcRole
  status: Sf2NpcStatus
  disposition: Sf2DispositionTier
  identity: Sf2NpcIdentity
  tempLoad?: number
  tempLoadTag?: Sf2TempLoadTag
  agenda?: Sf2NpcAgenda
  // Derived from campaign.threads[].owner for currently unresolved pressure
  // threads. Treat thread.owner as the source of truth.
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
  lastUpdatedTurn?: number
}

export interface Sf2Faction {
  id: Sf2EntityId
  name: string
  stance: Sf2DispositionTier
  heat: Sf2HeatLevel
  heatReasons: string[]
  agenda?: Sf2FactionAgenda
  // Derived from campaign.threads[].owner for currently unresolved pressure
  // threads. Treat thread.owner as the source of truth.
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
  locked?: boolean
  chapterCreated?: Sf2ChapterNumber
}

export interface Sf2SceneSnapshot {
  sceneId: Sf2EntityId
  location: Sf2Location
  presentNpcIds: Sf2EntityId[]
  // Optional: the subset of present NPCs the player is currently addressing or
  // engaged with. When omitted, the SceneKernel falls back to all present NPCs.
  // The (future) SceneKernelPatch reducer narrows this via interlocutorChanges.
  // Phase A: persisted but not auto-mutated; defaulting prevents PRD-style
  // pronoun-substitution drift without forcing every snapshot write to set it.
  currentInterlocutorIds?: Sf2EntityId[]
  timeLabel: string
  established: string[] // things the narration has made explicit in this scene
  // Index into history.turns where this scene started. Used by the Narrator
  // route to filter in-scene turn pairs for message replay. Lives on the
  // snapshot (not the bundle cache) so cache invalidation for off-stage
  // roster/registry deltas does not drop the message-replay window.
  firstTurnIndex: number
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
// Display sentinel — deterministic, pre-display scanner for visible failures
// the Narrator must not ship. PRD Fix 3 + Fix 6. Phase C (this slice) covers
// debug_leak only; absent_speaker / forbidden_target_substitution / etc. are
// added in subsequent phases as the SceneKernel + resolver substrate lands.
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2DisplaySentinelType =
  | 'debug_leak'
  | 'absent_speaker'
  | 'absent_direct_actor'
  | 'unintroduced_entity'
  | 'interlocutor_drift'
  | 'forbidden_target_substitution'
  | 'illegal_location_transition'
  | 'protected_secret_leak'
  | 'narrator_reveal'
  | 'roll_value_leak'
  | 'stage_label_leak'
  | 'disposition_label_leak'
  | 'retrieval_cue_leak'
  | 'npc_title_contamination'

export type Sf2DisplaySentinelSeverity = 'low' | 'medium' | 'hard'

export type Sf2DisplaySentinelAction =
  | 'allow'
  | 'allow_but_quarantine_writes'
  | 'block_and_repair'
  | 'block_and_regenerate'

export interface Sf2DisplaySentinelFinding {
  severity: Sf2DisplaySentinelSeverity
  type: Sf2DisplaySentinelType
  // Entity referenced when the finding concerns a specific NPC/faction.
  entityId?: Sf2EntityId
  // The literal surface form that triggered the finding (e.g. the matched
  // forbidden phrase, the absent NPC's name as it appeared in prose).
  surface?: string
  // Short prose excerpt (≤200 chars) that contains the violation, lifted from
  // the Narrator's output for review and for the repair path's preserve-block.
  evidence: string
  // Character offset of the match start in the original prose. Lets future
  // streaming integration cut the buffer at the violation point.
  matchStart: number
  matchEnd?: number
  recommendedAction: Sf2DisplaySentinelAction
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene kernel — code-owned, derived projection of authoritative local scene
// state. Built fresh each turn from canonical state via buildSceneKernel().
//
// Per the PRD: prose may propose state changes, but prose may not directly
// rewrite the room. Phase A delivers the schema + builder + canonical ID
// enforcement on Narrator's set_scene_snapshot writes. The (future)
// SceneKernelPatch reducer (Phase E) is the only path for the listed
// presentEntityIds / currentInterlocutorIds / location / activeProcedureIds /
// activeCountdowns mutations once enforcement is live.
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2SceneKernelTransitionKind =
  | 'entity_enters'
  | 'entity_exits'
  | 'location_change'
  | 'time_jump'
  | 'procedure_phase_change'

export interface Sf2SceneKernelLegalTransition {
  id: string
  kind: Sf2SceneKernelTransitionKind
  entityId?: Sf2EntityId
  fromLocationId?: Sf2EntityId
  toLocationId?: Sf2EntityId
  condition: string
  requiresVisibleEvidence: boolean
}

export interface Sf2SceneKernelCountdown {
  id: string
  label: string
  remainingMinutes?: number
  deadlineLabel?: string
  stakes: string
}

// activeProcedureIds points to whichever world.* module is active this turn:
// 'combat' | 'operation' | 'exploration'. The PRD's full ProcedureState shape
// (surgery/hack/negotiation/...) is intentionally NOT included until a real
// procedure scenario forces it — we model only what has historically broken.
export interface Sf2SceneKernel {
  sceneId: Sf2EntityId
  chapterNumber: Sf2ChapterNumber

  location: {
    id: Sf2EntityId
    name: string
    containedArea?: string
  }

  time: {
    label: string
    elapsedMinutes?: number
    activeCountdowns: Sf2SceneKernelCountdown[]
  }

  // Cast partition. All four arrays use canonical entity IDs only — display
  // names belong in aliasMap, never in these arrays. Validator enforces this.
  presentEntityIds: Sf2EntityId[]
  currentInterlocutorIds: Sf2EntityId[]   // subset of presentEntityIds
  nearbyEntityIds: Sf2EntityId[]          // present but not actively addressed
  absentEntityIds: Sf2EntityId[]          // explicitly known to be elsewhere
  speakingAllowedEntityIds: Sf2EntityId[] // derived: present ∪ {pc}; sentinel uses this

  activeObjectIds: string[]
  activeProcedureIds: string[]            // 'combat' | 'operation' | 'exploration' | object ids

  currentPhysicalSituation: string        // one-line; what the room looks like right now
  currentDramaticSituation: string        // one-line; what the dramatic pressure is
  lastVisibleState: string                // the last narrator prose tail (~200 chars)

  unresolvedImmediateQuestions: string[]

  forbiddenWithoutTransition: string[]    // declarative defaults; sentinel reads in Phase C
  legalTransitions: Sf2SceneKernelLegalTransition[]

  aliasMap: Record<Sf2EntityId, string[]> // canonical id → display variants

  version: number                         // turn index of derivation; monotonic
  updatedAtTurnId: string                 // turn id of derivation
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-Narrator action resolver — deterministic player-input interpretation
// against the current SceneKernel.
// ─────────────────────────────────────────────────────────────────────────────

export type Sf2ResolvedActionType =
  | 'address_npc'
  | 'question_npc'
  | 'pressure_npc'
  | 'move'
  | 'investigate'
  | 'use_item'
  | 'attack'
  | 'wait'
  | 'other'

export interface Sf2ResolvedReference {
  surface: string
  resolvedToEntityId: Sf2EntityId
  confidence: Sf2PatchConfidence
  basis: string
}

export interface Sf2ResolvedPlayerAction {
  rawInput: string
  actionType: Sf2ResolvedActionType
  targetEntityIds: Sf2EntityId[]
  subjectEntityIds: Sf2EntityId[]
  resolvedReferences: Sf2ResolvedReference[]
  sourceEntityId?: Sf2EntityId
  forbiddenTargetSubstitutions: Sf2EntityId[]
}

export type Sf2TurnResolutionConsequenceKind =
  | 'roll_failure_pressure'
  | 'roll_success_requires_state'
  | 'targeted_action_requires_state'

export interface Sf2TurnResolutionConsequence {
  id: string
  kind: Sf2TurnResolutionConsequenceKind
  rollOutcome?: Sf2RollRecord['outcome']
  skill?: string
  targetEntityIds: Sf2EntityId[]
  targetThreadIds: Sf2EntityId[]
  pressureDelta?: number
  stateMutationObserved: boolean
  note: string
}

export interface Sf2TurnResolutionRecord {
  turnIndex: number
  action: Sf2ResolvedPlayerAction
  targetThreadIds: Sf2EntityId[]
  rollRecords: Sf2RollRecord[]
  consequenceEvents: Sf2TurnResolutionConsequence[]
  driftFindings: Sf2CoherenceFinding[]
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
  severity: 'standard' | 'hard'
  // Threads this step's fire reheats. Authored by chapter-author so that a
  // ladder fire targets specific narrative beats instead of broadcasting
  // pressure across the chapter. Empty/missing falls back to the spine for
  // back-compat with chapters authored before this field existed.
  threadIds?: Sf2EntityId[]
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

export interface Sf2OperationPlan {
  name?: string
  target: string
  approach: string
  fallback: string
  status: 'active' | 'paused' | 'resolved' | 'abandoned'
  lastUpdatedTurn: number
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
  successorThreadIds?: Sf2EntityId[]
  newPressureThreadIds?: Sf2EntityId[]
  editorializedLore: Sf2EditorializedLoreItem[]
  openingSceneSpec: Sf2OpeningSceneSpec
  pressureLadder: Sf2PressureLadderStep[]
  threadPressure: Record<Sf2EntityId, Sf2ChapterThreadPressure>
  threadInitialTensions?: Record<Sf2EntityId, Sf2Tension>
  arcLink?: Sf2ChapterArcLink
  pacingContract?: Sf2ChapterPacingContract
  surfaceThreads: Sf2EntityId[] // GM override (scene-scoped)
  surfaceNpcIds: Sf2EntityId[]
}

// Output 2: system-only scaffolding. Never reaches Narrator raw.
export interface Sf2ChapterSetupScaffolding {
  chapter: Sf2ChapterNumber
  npcHiddenPressures: Record<Sf2EntityId, string>
  antagonistFaces: Sf2AntagonistPossibleFace[]
  possibleRevelations: Sf2PossibleRevelation[]
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
  continuationMoves?: Sf2ChapterContinuationMoves
}

export interface Sf2RevelationHintEvidence {
  // The CONFIGURED phrase that matched (the author's authored hint).
  phraseMatched: string
  // What the archivist actually emitted as the surface form. Preserves
  // visibility into how forgiving the matcher was — needed to calibrate the
  // matching strategy after observation.
  phraseEmitted: string
  turn: number
  proseExcerpt: string
}

export interface Sf2PossibleRevelation {
  id: string
  statement: string
  heldBy: string
  emergenceCondition: string
  recontextualizes: string
  revealed: boolean
  revealedAtTurn?: number
  hintPhrases: string[]
  hintsRequired: number
  hintsDelivered: number
  hintEvidence: Sf2RevelationHintEvidence[]
  validRevealContexts: Sf2RevealContext[]
  invalidRevealContexts?: Sf2RevealContext[]
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

export interface Sf2ChapterArcLink {
  arcId: Sf2EntityId
  chapterFunction: string
  playerStanceRead: string
  pressureEngineIds: string[]
}

export interface Sf2ChapterPacingContract {
  targetTurns: { min: number; max: number }
  chapterQuestion: string
  acceptableResolutions: string[]
  earlyPressure: string
  middlePressure: string
  latePressure: string
  closeWhenAny: string[]
  avoidExtendingFor: string[]
}

export interface Sf2ChapterContinuationMoves {
  priorChapterMeaning: string
  largerPatternRevealed: string
  institutionalScaleEscalation: { from: string; to: string }
  newNamedThreatFromPriorSuccess: { name: string; emergedFrom: string; whyInevitable: string }
  worsenedExistingThread: { threadId: Sf2EntityId; priorSmallDetail: string; whyLoadBearingNow: string }
  plantedMidchapterRevelation: { hiddenStatement: string; recontextualizes: string }
  relationshipDeepeningTarget?: { entityId: Sf2EntityId; pressure: string }
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
  arcVariantSeed?: {
    id?: string
    scenarioBias?: Sf2ArcScenarioMode
    creativeAngle?: string
    avoidModes?: Sf2ArcScenarioMode[]
  }
  // PC capability surface — surfaced to the Author so the chapter's pressure
  // ladder can include steps the PC's natural moves engage. See
  // [[2604270855 Storyforge V2 Playbook Fit]] for design. Only the player's
  // selected playbook profile ships here, not the whole genre table.
  pcCapabilities?: {
    proficiencies: string[]
    traits: Array<{ name: string; description?: string }>
    signatureInventory: Array<{ name: string; description?: string }>
    playbookProfile?: {
      naturalMoves: string[]
      naturalDomains: string[]
    }
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
    voiceNote?: string
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
    initialTension?: number
    successorToThreadId?: string
    driverKind?: Sf2ChapterThreadDriverKind
    resolutionCriteria: string
    resolutionGates?: Sf2ThreadResolutionGate[]
    failureMode: string
    retrievalCue: string
  }>
  pressureLadder: Array<{
    id: string
    pressure: string
    triggerCondition: string
    narrativeEffect: string
    severity?: 'standard' | 'hard'
  }>
  possibleRevelations: Array<{
    id: string
    statement: string
    heldBy: string
    emergenceCondition: string
    recontextualizes: string
    hintPhrases?: string[]
    hintsRequired?: number
    validRevealContexts?: Sf2RevealContext[]
    invalidRevealContexts?: Sf2RevealContext[]
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
  arcLink: Sf2ChapterArcLink
  pacingContract: Sf2ChapterPacingContract
  continuationMoves?: Sf2ChapterContinuationMoves
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
  turnResolution?: Sf2TurnResolutionRecord
  archivistPatchApplied?: Sf2ArchivistPatch
  pacingClassification?: Sf2PacingClassification
  stateDiff?: Sf2TurnDiffEntry[]
  timestamp: string
}

export type Sf2TurnDiffTone = 'loss' | 'gain' | 'change' | 'severe'

export interface Sf2TurnDiffEntry {
  kind:
    | 'hp'
    | 'credits'
    | 'inventory'
    | 'intel'
    | 'npc'
    | 'thread'
    | 'location'
    | 'operation_plan'
    | 'other'
  label: string
  tone: Sf2TurnDiffTone
  entityId?: Sf2EntityId
  from?: string | number
  to?: string | number
  value?: string | number
}

export interface Sf2RollRecord {
  turn: number
  proseOffset?: number
  skill: string
  dc: number
  effectiveDc?: number
  rollResult: number
  rawRolls?: number[]
  modifier: number
  outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure'
  consequenceSummary?: string
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  inspirationSpent?: boolean
  originalRoll?: {
    rollResult: number
    modifier: number
    total: number
    outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure'
  }
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
    | 'document'
  payload: Record<string, unknown> // flat semantic statement; server resolves to typed entity
  confidence: Sf2PatchConfidence
  sourceQuote?: string // phrase from prose supporting this write
}

export interface Sf2ArchivistUpdate {
  entityKind: 'npc' | 'faction' | 'thread' | 'arc' | 'clue' | 'document' | 'operation_plan'
  entityId: Sf2EntityId
  changes: Record<string, unknown>
  confidence: Sf2PatchConfidence
  sourceQuote?: string
}

export interface Sf2ArchivistTransition {
  entityKind: 'thread' | 'decision' | 'promise' | 'clue' | 'arc' | 'document'
  entityId: Sf2EntityId
  toStatus: string
  reason: string
  confidence: Sf2PatchConfidence
}

export interface Sf2ArchivistAttachment {
  kind: 'anchor_decision' | 'anchor_promise' | 'anchor_clue' | 'anchor_thread_to_arc'
  entityId: Sf2EntityId
  threadIds: Sf2EntityId[]
  arcId?: Sf2EntityId
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
    | 'revelation_premature_reveal'
  detail: string
  entityId?: Sf2EntityId
}

export interface Sf2LexiconAddition {
  phrase: string
  register: string
  exampleContext: string
}

export interface Sf2EmotionalBeatAddition {
  text: string
  participants: Sf2EntityId[]
  anchoredTo: Sf2EntityId[]
  emotionalTags: Sf2EmotionalBeatTag[]
  salience: number
}

export interface Sf2RevelationHintDelivered {
  revelationId: string
  phraseMatched: string
  proseExcerpt: string
}

export interface Sf2RevelationRevealed {
  revelationId: string
  context: Sf2RevealContext
  evidenceQuote: string
}

// Archivist's post-turn coherence audit. Soft signal: feeds into the next
// Narrator turn as corrective context; does not block writes or retry.
export type Sf2CoherenceFindingType =
  | 'disposition_incoherence'
  | 'heat_mismatch'
  | 'stale_reentry'
  | 'clue_leak'
  | 'identity_drift'
  | 'state_drift'
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
  | 'revelation_premature_reveal'
  // Prose-level drift on a known Sf2Document: prose attributes the document
  // to a different signer/filer/subject than the canonical record, or claims
  // the document permits/says something different from its originalSummary.
  // Same architectural pattern as pronoun_drift / age_drift but for documents.
  | 'document_attribution_drift'

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
  emotionalBeats?: Sf2EmotionalBeatAddition[]
  revelationHintsDelivered?: Sf2RevelationHintDelivered[]
  revelationsRevealed?: Sf2RevelationRevealed[]
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
  emotionalBeatIds: Sf2EntityId[]
  reasonsByEntityId: Record<Sf2EntityId, string[]>
  computedAtTurn: number
}

export interface Sf2WorkingSetTelemetry {
  turn: number
  chapter: Sf2ChapterNumber
  fullCount: number
  stubCount: number
  excludedCount: number
  fullTokensApprox: number
  stubTokensApprox: number
  // Union of alias matches + role-noun matches. Use the per-confidence
  // arrays below to distinguish how each entity was detected.
  referencedInProse: Sf2EntityId[]
  // Entities matched against `kernel.aliasMap` — a name or alias appeared
  // in prose. High-confidence reference detection.
  referencedByAlias: Sf2EntityId[]
  // Entities matched against role nouns (e.g. "the warden") cross-referenced
  // against present + recently-mentioned entities of that role. Lower
  // confidence than alias matches; bias toward over-flagging divergence so
  // role-only references aren't missed in `excludedButReferenced`.
  referencedByRole: Sf2EntityId[]
  mutatedByArchivist: Sf2EntityId[]
  excludedButReferenced: Sf2EntityId[]
  fullButUnreferenced: Sf2EntityId[]
  stubButMutated: Sf2EntityId[]
  reasonsByEntityId: Record<Sf2EntityId, string[]>
}

export interface Sf2EmotionalBeatPacket {
  beatId: Sf2EntityId
  text: string
  participants: Sf2EntityId[]
  anchoredTo: Sf2EntityId[]
  emotionalTags: Sf2EmotionalBeatTag[]
  salience: number
  turn: number
  chapterCreated: Sf2ChapterNumber
}

export interface Sf2RevelationProgressPacket {
  revelationId: string
  statement: string
  hintsDelivered: number
  hintsRequired: number
  hintPhrases: string[]
  validRevealContexts: Sf2RevealContext[]
  invalidRevealContexts?: Sf2RevealContext[]
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
  tempLoadTag?: Sf2TempLoadTag
  voice: string
  voiceImperative: string
  behavioralContract: string
  // Phase 5 — full behavioral contract, derived per turn from tier + agenda +
  // recent beats + tempLoadTag. Renders alongside `behavioralContract` (kept
  // as a one-line summary for back-compat). Empty array / empty string means
  // "render nothing for this slot," not "no rule."
  defaultPosture: string
  willShare: string[]
  willNot: string[]
  ifPressured: string
  prohibitions: string[]
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
  /** Chapter-effective pressure after opening cooling + local escalation. */
  tension: Sf2Tension
  tensionDelta?: number
  canonicalTension: Sf2Tension
  peakTension?: Sf2Tension
  pressureRole?: ThreadRole
  openingFloor?: Sf2Tension
  localEscalation?: Sf2Tension
  localWhyItMatters: string
  ownerSummary: string
  stakeholderDispositions: Array<{ ownerKind: 'npc' | 'faction'; name: string; disposition: Sf2DispositionTier | Sf2HeatLevel }>
  deterioration?: string // rendered hint only
  anchoredDecisions: Array<{ id: Sf2EntityId; summary: string }>
  anchoredPromises: Array<{ id: Sf2EntityId; obligation: string }>
  anchoredClues: Array<{ id: Sf2EntityId; content: string }>
  resolutionGates: Array<{ id: Sf2EntityId; label: string; condition: string; status: Sf2ThreadResolutionGateStatus }>
  clueTier?: 'lead' | 'evidenced' | 'load_bearing'
}

export interface Sf2ChapterPacket {
  objective: string
  crucible: string
  spineThreadId?: Sf2EntityId
  loadBearingThreadIds: Sf2EntityId[]
  currentPressureFace: string | null
  currentPressureStep?: { pressure: string; narrativeEffect: string }
  firedPressureSteps: Array<{ step: number; firedAtTurn: number; pressure: string }>
  arc?: {
    title: string
    scenario: string
    question: string
    chapterFunction?: string
    activePressureEngines: string[]
  }
  pacingContract?: Sf2ChapterPacingContract
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
  emotionalBeats: Sf2EmotionalBeatPacket[]
  revelationProgress: Sf2RevelationProgressPacket[]
  temporalAnchors: Sf2TemporalAnchorPacket[]
  chapter: Sf2ChapterPacket
  mechanics: Sf2MechanicsPacket
  operationPlan?: Sf2OperationPlan
  recentContext: Sf2RecentContextPacket
  pacing: Sf2PacingAdvisory
  playerInput: {
    text: string
    inferredIntent: string
    resolvedAction?: Sf2ResolvedPlayerAction
  }
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
  seedId?: string
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
  operationPlan?: Sf2OperationPlan
  arcPlan?: Sf2ArcPlan
  arcs: Record<Sf2EntityId, Sf2Arc>
  threads: Record<Sf2EntityId, Sf2Thread>
  engines: Record<Sf2EntityId, Sf2EngineRuntime>
  decisions: Record<Sf2EntityId, Sf2Decision>
  promises: Record<Sf2EntityId, Sf2Promise>
  clues: Record<Sf2EntityId, Sf2Clue>
  beats: Record<Sf2EntityId, Sf2EmotionalBeat>
  temporalAnchors: Record<Sf2EntityId, Sf2TemporalAnchor>
  npcs: Record<Sf2EntityId, Sf2Npc>
  factions: Record<Sf2EntityId, Sf2Faction>
  locations: Record<Sf2EntityId, Sf2Location>
  documents: Record<Sf2EntityId, Sf2Document>
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
  // chain with cache_control. Bundle text contains the off-stage cast roster,
  // so we invalidate it whenever the Archivist changes the registry (new
  // NPC promoted from prose, role/affiliation refined, etc.) — even within
  // the same scene. The replay-window cutoff lives on sceneSnapshot.firstTurnIndex
  // so a roster-only invalidation does not drop in-scene turn pairs.
  sceneBundleCache?: {
    sceneId: Sf2EntityId
    bundleText: string
    builtAtTurn: number
  }
}

export interface Sf2Derived {
  workingSet?: Sf2WorkingSet
  workingSetTelemetry?: Sf2WorkingSetTelemetry[]
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
