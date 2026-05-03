'use client'

// Static full-shell design preview. Mock data only: no SF2 engine wiring.
// Route: /design/play

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Sf2PlayShell,
  type Sf2CloseReadinessView,
  type Sf2PendingCheckView,
  type Sf2RollOutcomeView,
} from '@/components/sf2/play-shell'
import {
  createInitialSf2State,
  DEFAULT_SF2_SEED_ID,
  SPACE_OPERA_DRIFTRUNNER_SEED_ID,
} from '@/lib/sf2/game-data'
import { chapterPressureRuntime } from '@/lib/sf2/pressure/runtime'
import type { Sf2State } from '@/lib/sf2/types'

type PreviewGenre = 'space-opera' | 'epic-scifi'

interface MockPreview {
  state: Sf2State
  actions: string[]
  pendingCheck: Sf2PendingCheckView
  rollModifier: number
  effectiveDc: number
}

const SPACE_OPERA_ACTIONS = [
  'Slice the bay door open before HELIA pings the lock again [Slicing]',
  'Hand-signal Aysu to flank along the cargo line [Tactics]',
  'Hold position and watch the cycle for one more pulse [Perception]',
  'Burn a Cipher Spike and ghost the door entirely [Stealth]',
]

const SPACE_OPERA_CHECK: Sf2PendingCheckView = {
  skill: 'Slicing',
  dc: 14,
  why: "Reach into the bay door's handshake chip and feed it the old Cartel cipher.",
  consequenceOnFail: 'HELIA marks your access pattern and advances the sweep clock.',
  modifierType: 'challenge',
  modifierReason: 'HELIA is actively hardening the lock',
}

const EPIC_SCIFI_ACTIONS = [
  'Demand the Synod ledger under Warden seal [Authority]',
  'Signal Oren to bar the side aisle [Command]',
  'Ask Mara which names vanished between ledgers [Insight]',
  'Spend a quarantine writ to delay the selection [Authority]',
]

const EPIC_SCIFI_CHECK: Sf2PendingCheckView = {
  skill: 'Authority',
  dc: 15,
  why: 'Read the Synod seal before the Prefect closes the tithe ledger.',
  consequenceOnFail: 'The Prefect records your challenge as procedural obstruction and advances compliance.',
  modifierType: 'challenge',
  modifierReason: 'The hall is packed with Synod witnesses',
}

export default function PlayDesignPreviewPage() {
  return (
    <Suspense fallback={null}>
      <PlayDesignPreviewContent />
    </Suspense>
  )
}

function PlayDesignPreviewContent() {
  const searchParams = useSearchParams()
  const previewGenre = parsePreviewGenre(searchParams.get('genre'))
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pendingInput, setPendingInput] = useState('')
  const [rollResult, setRollResult] = useState<Sf2RollOutcomeView | null>(null)
  const preview = useMemo(() => buildMockPreview(previewGenre), [previewGenre])
  const pressureProjection = useMemo(
    () => chapterPressureRuntime.project(preview.state, { pivotSignaled: false }),
    [preview.state]
  )
  const pendingCheck = rollResult ? null : preview.pendingCheck
  const closeReadiness: Sf2CloseReadinessView = {
    closeReady: false,
    chapterPivotSignaled: false,
    spineResolved: false,
    stalledFallback: false,
    ladderFiredCount: 2,
    ladderStepCount: 4,
    spineTension: 6,
    successorRequired: false,
  }

  useEffect(() => {
    setRollResult(null)
  }, [previewGenre])

  function resolveMockRoll() {
    const d20 = 15
    const modifier = preview.rollModifier
    const effectiveDc = preview.effectiveDc
    setRollResult({
      d20,
      modifier,
      dc: preview.pendingCheck.dc,
      effectiveDc,
      total: d20 + modifier,
      result: d20 + modifier >= effectiveDc ? 'success' : 'failure',
      skill: preview.pendingCheck.skill,
      modifierType: preview.pendingCheck.modifierType,
      modifierReason: preview.pendingCheck.modifierReason,
    })
  }

  return (
    <Sf2PlayShell
      state={preview.state}
      scrollRef={scrollRef}
      prose=""
      turnCommitError={null}
      activePlayerInput=""
      liveRolls={pendingCheck ? [{
        id: 'preview-roll',
        proseOffset: 0,
        check: pendingCheck,
        outcome: rollResult ?? undefined,
      }] : []}
      suggestedActions={preview.actions}
      pendingInput={pendingInput}
      pendingCheck={pendingCheck}
      rollResult={rollResult}
      inspirationOffer={null}
      rollModifier={preview.rollModifier}
      effectiveDc={preview.effectiveDc}
      inspirationRemaining={2}
      isStreaming={false}
      isArchiving={false}
      isGeneratingChapter={false}
      generationElapsed={0}
      busy={false}
      chapterTurnCount={14}
      pressureProjection={pressureProjection}
      closeReadiness={closeReadiness}
      campaignStats={{ npcs: 4, threads: 4, decisions: 3, promises: 1, clues: 10 }}
      sessionSummary={null}
      debug={[]}
      lastNarratorUsage={null}
      lastArchivistUsage={null}
      onPendingInputChange={setPendingInput}
      onSendTurn={() => {}}
      onResolvePendingCheck={resolveMockRoll}
      onSpendInspiration={() => {}}
      onDeclineInspiration={() => {}}
      onCloseChapter={() => {}}
      onResetCampaign={() => {}}
      onDownloadSessionLog={() => {}}
      onDownloadReplayFixture={() => {}}
    />
  )
}

function parsePreviewGenre(value: string | null): PreviewGenre {
  return value === 'epic-scifi' ? 'epic-scifi' : 'space-opera'
}

function buildMockPreview(genre: PreviewGenre): MockPreview {
  if (genre === 'epic-scifi') {
    const state = buildEpicSciFiMockSf2State()
    return {
      state,
      actions: EPIC_SCIFI_ACTIONS,
      pendingCheck: EPIC_SCIFI_CHECK,
      rollModifier: 3,
      effectiveDc: EPIC_SCIFI_CHECK.dc + 2,
    }
  }

  const state = buildSpaceOperaMockSf2State()
  return {
    state,
    actions: SPACE_OPERA_ACTIONS,
    pendingCheck: SPACE_OPERA_CHECK,
    rollModifier: 4,
    effectiveDc: SPACE_OPERA_CHECK.dc + 2,
  }
}

function buildSpaceOperaMockSf2State(): Sf2State {
  const state = createInitialSf2State({
    campaignId: 'design_preview',
    playerName: 'K. Vess',
    seedId: SPACE_OPERA_DRIFTRUNNER_SEED_ID,
  })

  state.meta.currentChapter = 2
  state.meta.genreId = 'space-opera'
  state.player.level = 4
  state.player.hp = { current: 24, max: 30 }
  state.player.ac = 12
  state.player.credits = 180
  state.player.inspiration = 2
  state.player.class = { id: 'voidwright', name: 'Voidwright' }
  state.player.origin = { id: 'ex-cartel', name: 'ex-Cartel' }
  state.player.inventory = [
    { name: 'Pulse Cutter', qty: 1, tags: ['limited'] },
    { name: 'Memetic Dampener', qty: 1 },
    { name: 'Stim - Tier 2', qty: 2 },
    { name: 'Cipher Spike', qty: 1, tags: ['live'] },
  ]
  state.campaign.operationPlan = {
    name: 'Breach Obelisk Core',
    target: 'Breach Obelisk Core',
    approach: 'Slice Bay-3 with the old Cartel cipher, advance up Lift A',
    fallback: 'Pull back to Maintenance Corridor and hard-burn the lift',
    status: 'active',
    lastUpdatedTurn: 13,
  }

  state.chapter = {
    ...state.chapter,
    number: 2,
    title: 'The Quiet Mutiny',
    setup: {
      ...state.chapter.setup,
      chapter: 2,
      title: 'The Quiet Mutiny',
      frame: {
        title: 'The Quiet Mutiny',
        premise: 'HELIA has locked down Obelisk-9 while rescue windows collapse.',
        activePressure: 'HELIA hardens the station against rescue.',
        centralTension: 'Every access attempt teaches the station how to stop you.',
        chapterScope: 'Reach Engineering before the sweep isolates the hostages.',
        objective: 'Breach Obelisk Core',
        crucible: 'Choose speed, stealth, or resource burn before the next sweep.',
        outcomeSpectrum: {
          clean: 'Reach Engineering unnoticed.',
          costly: 'Reach Engineering marked by HELIA.',
          failure: 'Lose the lift route.',
          catastrophic: 'HELIA isolates the hostages.',
        },
      },
      antagonistField: {
        sourceSystem: 'HELIA',
        corePressure: 'The station AI adapts to rescue attempts.',
        defaultFace: { id: 'helia', name: 'HELIA', role: 'station intelligence', pressureStyle: 'predictive lockout' },
        currentPrimaryFace: { id: 'helia', name: 'HELIA', role: 'station intelligence', pressureStyle: 'predictive lockout' },
        escalationLogic: 'Each noisy move narrows the available routes.',
      },
      activeThreadIds: ['thread_intake', 'thread_helia', 'thread_cartel', 'thread_cargo'],
      loadBearingThreadIds: ['thread_intake'],
      surfaceThreads: ['thread_intake', 'thread_helia', 'thread_cartel', 'thread_cargo'],
      surfaceNpcIds: ['npc_aysu', 'npc_helia', 'npc_tessil', 'npc_vance'],
      pressureLadder: [
        { id: 'step_1', pressure: 'HELIA sweep marks the bay.', triggerCondition: 'Failed stealth', narrativeEffect: 'Sensor awareness rises.', severity: 'standard', fired: true, firedAtTurn: 11 },
        { id: 'step_2', pressure: 'HELIA tightens the Bay-3 lock handshake.', triggerCondition: 'Door access detected', narrativeEffect: 'Slicing DC rises.', severity: 'standard', fired: true, firedAtTurn: 13 },
        { id: 'step_3', pressure: 'The lift route burns hot.', triggerCondition: 'Delay or loud breach', narrativeEffect: 'Fallback narrows.', severity: 'hard', fired: false },
        { id: 'step_4', pressure: 'Engineering bulkheads seal.', triggerCondition: 'Third noisy move', narrativeEffect: 'Hostages become isolated.', severity: 'hard', fired: false },
      ],
      threadPressure: {
        thread_intake: { threadId: 'thread_intake', role: 'spine', openingFloor: 4, localEscalation: 2, maxThisChapter: 7, cooledAtOpen: false },
      },
    },
  }

  state.world.currentLocation = {
    id: 'loc_hangar_bay_3',
    name: 'Hangar Bay 3',
    description: 'Emergency lume strips pulse a slow blue across cryo-pods and cargo shadows.',
    atmosphericConditions: ['gravity nominal', 'blue sweep cycle'],
    chapterCreated: 2,
  }
  state.campaign.locations = {
    loc_hangar_bay_3: state.world.currentLocation,
    loc_maintenance_corridor: {
      id: 'loc_maintenance_corridor',
      name: 'Maintenance Corridor',
      description: 'A fallback crawlway behind coolant ribs and old hazard paint.',
      atmosphericConditions: ['coolant vapor', 'manual locks only'],
      chapterCreated: 2,
    },
    loc_lift_a: {
      id: 'loc_lift_a',
      name: 'Lift A',
      description: 'A vertical route toward Engineering currently held behind a pressure door.',
      atmosphericConditions: ['lock handshake pending', 'motor heat rising'],
      locked: true,
      chapterCreated: 2,
    },
  }
  state.world.sceneSnapshot = {
    sceneId: 'scene_2_1',
    location: state.world.currentLocation,
    presentNpcIds: ['npc_aysu', 'npc_tessil'],
    currentInterlocutorIds: ['npc_aysu'],
    timeLabel: 'Gravity nominal / four-point-two second sweep cycle',
    established: [
      'The bay door accepts an old Cartel handshake.',
      'HELIA pulses on a 4.2 second cycle.',
      'Lift A is locked behind the next pressure door.',
    ],
    firstTurnIndex: 10,
  }

  state.campaign.npcs = {
    npc_aysu: npc('npc_aysu', 'CDR. Aysu', 'Compact Navy', 'favorable', ['thread_intake']),
    npc_helia: npc('npc_helia', 'HELIA', 'Obelisk-9 Core', 'hostile', ['thread_helia']),
    npc_tessil: npc('npc_tessil', 'Tessil-3', 'cargo deck', 'neutral', []),
    npc_vance: npc('npc_vance', 'Vance Echo', 'Cartel trace', 'hostile', ['thread_cartel']),
  }
  state.campaign.threads = {
    thread_intake: thread('thread_intake', 'The Intake Problem', 'npc_aysu', 6, true),
    thread_helia: thread('thread_helia', "HELIA's Decay", 'npc_helia', 5, false),
    thread_cartel: thread('thread_cartel', 'Cartel Fallout', 'npc_vance', 3, false),
    thread_cargo: thread('thread_cargo', 'The Missing Cargo', 'npc_tessil', 2, false),
  }
  state.campaign.clues = {
    clue_lockout: clue('clue_lockout', 'Bay-3 lockout uses a Cartel handshake.', ['thread_intake'], 13),
    clue_hostages: clue('clue_hostages', 'Hostages cluster near Engineering behind a load-bearing coolant spine.', ['thread_intake'], 13),
    clue_cycle: clue('clue_cycle', 'HELIA pulses on a 4.2 second cycle.', ['thread_helia'], 12),
    clue_cipher: clue('clue_cipher', 'Old Drift War ciphers still pass through the outer lift.', ['thread_cartel'], 11),
    clue_pod: clue('clue_pod', "One pod's manifest serial does not match.", ['thread_cargo'], 10),
  }

  state.history.turns = [
    {
      index: 10,
      chapter: 2,
      playerInput: 'I try to ghost across the open stripe before the sweep turns back.',
      narratorProse:
        "The floor light snaps white under Vess's boot. Somewhere inside the lift casing, a relay clicks awake, and the door remembers there is someone here to measure.",
      timestamp: new Date().toISOString(),
    },
    {
      index: 12,
      chapter: 2,
      playerInput: "I let Tessil take the lead and watch for the first place HELIA's cycle repeats.",
      narratorProse:
        'The repeat comes as a blue stutter across the bay doors: four beats, a silent gap, then the lock panel wakes just long enough to accept a handshake. Old Cartel work, hidden under station paint.',
      narratorAnnotation: { suggestedActions: SPACE_OPERA_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
      stateDiff: [
        { kind: 'intel', label: '+Intel', tone: 'gain', entityId: 'clue_cycle', value: 1 },
        { kind: 'npc', label: 'CDR. Aysu +1', tone: 'gain', entityId: 'npc_aysu', from: 'neutral', to: 'favorable', value: 1 },
      ],
      timestamp: new Date().toISOString(),
    },
    {
      index: 13,
      chapter: 2,
      playerInput: "I take the panel. Old Cartel cipher first - if she's running anything older than the Drift War, it'll bite.",
      narratorProse:
        'Aysu crouches beside the cryo-pods, fingertips on her sidearm, eyes flicking between the handshake panel and the dark slit of the access lift. "Four-point-two seconds," she breathes. "That is the cycle."',
      narratorAnnotation: { suggestedActions: SPACE_OPERA_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
      stateDiff: [
        { kind: 'credits', label: 'CRED -25', tone: 'loss', from: 205, to: 180, value: -25 },
        { kind: 'inventory', label: 'Stim - Tier 2 3->2', tone: 'loss', from: 3, to: 2, value: -1 },
        { kind: 'thread', label: 'HELIA Decay +1', tone: 'loss', entityId: 'thread_helia', from: 4, to: 5, value: 1 },
      ],
      timestamp: new Date().toISOString(),
    },
  ]
  state.history.rollLog = [
    { turn: 10, skill: 'Stealth', dc: 14, rollResult: 4, modifier: 2, outcome: 'failure', consequenceSummary: 'HELIA marks the access pattern.' },
    { turn: 12, skill: 'Perception', dc: 13, rollResult: 12, modifier: 3, outcome: 'success', consequenceSummary: 'The pulse cycle becomes readable.' },
  ]
  state.history.recentTurns = state.history.turns

  return state
}

function buildEpicSciFiMockSf2State(): Sf2State {
  const state = createInitialSf2State({
    campaignId: 'design_preview_epic_scifi',
    playerName: 'M. Vale',
    seedId: DEFAULT_SF2_SEED_ID,
  })

  state.meta.currentChapter = 2
  state.meta.genreId = 'epic-scifi'
  state.player.level = 4
  state.player.hp = { current: 22, max: 28 }
  state.player.ac = 15
  state.player.credits = 175
  state.player.inspiration = 2
  state.player.class = { id: 'warden', name: 'Warden' }
  state.player.origin = { id: 'imperial-service', name: 'Imperial Service' }
  state.player.inventory = [
    { name: 'Seal of Office', qty: 1, tags: ['signature'] },
    { name: 'Drift Suppressor', qty: 1 },
    { name: 'Quarantine Writ', qty: 1, tags: ['limited'] },
    { name: 'Witness Ledger', qty: 1, tags: ['live'] },
  ]
  state.campaign.operationPlan = {
    name: 'Audit Tithe Ledger',
    target: 'The Tithe Ledger',
    approach: 'Invoke Warden seal, compare Synod intake rolls against the village census',
    fallback: 'Delay selection under quarantine writ and move Mara through the chapel archive',
    status: 'active',
    lastUpdatedTurn: 13,
  }

  state.chapter = {
    ...state.chapter,
    number: 2,
    title: 'The Ledger That Breathes',
    setup: {
      ...state.chapter.setup,
      chapter: 2,
      title: 'The Ledger That Breathes',
      frame: {
        title: 'The Ledger That Breathes',
        premise: 'The Synod sealed a frontier tithe hall after the Resonant count came up short.',
        activePressure: 'Prefect Ianthe converts every objection into compliance language.',
        centralTension: 'Every delay protects a child while making your authority easier to prosecute.',
        chapterScope: 'Expose the missing names before the selection bell ends.',
        objective: 'Audit Tithe Ledger',
        crucible: 'Choose procedure, witness testimony, or open defiance before the ledger closes.',
        outcomeSpectrum: {
          clean: 'Freeze the tithe without exposing Mara.',
          costly: 'Delay the tithe while drawing Synod scrutiny.',
          failure: 'Lose access to the witness ledger.',
          catastrophic: 'The Synod selects replacement children.',
        },
      },
      antagonistField: {
        sourceSystem: 'The Synod',
        corePressure: 'Compliance procedures turn human exceptions into inventory gaps.',
        defaultFace: { id: 'prefect_ianthe', name: 'Prefect Ianthe', role: 'Synod prefect', pressureStyle: 'procedural sanctimony' },
        currentPrimaryFace: { id: 'prefect_ianthe', name: 'Prefect Ianthe', role: 'Synod prefect', pressureStyle: 'procedural sanctimony' },
        escalationLogic: 'Each public objection becomes another cited violation.',
      },
      activeThreadIds: ['thread_tithe', 'thread_mara', 'thread_synod', 'thread_house'],
      loadBearingThreadIds: ['thread_tithe'],
      surfaceThreads: ['thread_tithe', 'thread_mara', 'thread_synod', 'thread_house'],
      surfaceNpcIds: ['npc_mara', 'npc_ianthe', 'npc_oren', 'npc_halvek'],
      pressureLadder: [
        { id: 'step_1', pressure: 'The Synod records your objection as irregular.', triggerCondition: 'Failed authority check', narrativeEffect: 'Procedural heat rises.', severity: 'standard', fired: true, firedAtTurn: 11 },
        { id: 'step_2', pressure: 'Prefect Ianthe orders the tithe ledger sealed.', triggerCondition: 'Ledger challenge detected', narrativeEffect: 'Audit DC rises.', severity: 'standard', fired: true, firedAtTurn: 13 },
        { id: 'step_3', pressure: 'House Vael disavows the delay.', triggerCondition: 'Public confrontation', narrativeEffect: 'Political cover narrows.', severity: 'hard', fired: false },
        { id: 'step_4', pressure: 'The selection bell authorizes replacements.', triggerCondition: 'Third procedural delay', narrativeEffect: 'Children are taken into Synod custody.', severity: 'hard', fired: false },
      ],
      threadPressure: {
        thread_tithe: { threadId: 'thread_tithe', role: 'spine', openingFloor: 4, localEscalation: 2, maxThisChapter: 7, cooledAtOpen: false },
      },
    },
  }

  state.world.currentLocation = {
    id: 'loc_tithe_hall',
    name: 'Tithe Hall',
    description: 'Gold leaf flakes from the vaulted intake hall while the selection bell waits above the doors.',
    atmosphericConditions: ['incense and hot glass', 'Synod seal active'],
    chapterCreated: 2,
  }
  state.campaign.locations = {
    loc_tithe_hall: state.world.currentLocation,
    loc_chapel_archive: {
      id: 'loc_chapel_archive',
      name: 'Chapel Archive',
      description: 'A narrow records chamber where old oaths sleep under wax and dust.',
      atmosphericConditions: ['sealed stacks', 'candle smoke'],
      locked: true,
      chapterCreated: 2,
    },
    loc_ashen_annex: {
      id: 'loc_ashen_annex',
      name: 'Ashen Annex',
      description: 'A rear ward where failed candidates are counted softly and moved quickly.',
      atmosphericConditions: ['muted prayers', 'white linen screens'],
      chapterCreated: 2,
    },
  }
  state.world.sceneSnapshot = {
    sceneId: 'scene_2_1',
    location: state.world.currentLocation,
    presentNpcIds: ['npc_mara', 'npc_oren'],
    currentInterlocutorIds: ['npc_mara'],
    timeLabel: 'Selection bell pending / Synod seal still warm',
    established: [
      'The tithe ledger contains one page in a different hand.',
      'Prefect Ianthe can close the record by bell order.',
      'The chapel archive is locked behind a Synod wax seal.',
    ],
    firstTurnIndex: 10,
  }

  state.campaign.npcs = {
    npc_mara: npc('npc_mara', 'Mara Tollen', 'Frontier clerk', 'favorable', ['thread_tithe', 'thread_mara']),
    npc_ianthe: npc('npc_ianthe', 'Prefect Ianthe', 'The Synod', 'hostile', ['thread_synod']),
    npc_oren: npc('npc_oren', 'Retainer Oren', 'Imperial Service', 'neutral', []),
    npc_halvek: npc('npc_halvek', 'Canon Halvek', 'House Vael', 'wary', ['thread_house']),
  }
  state.campaign.threads = {
    thread_tithe: thread('thread_tithe', 'The Tithe Shortfall', 'npc_mara', 6, true),
    thread_mara: thread('thread_mara', "Mara's Omission", 'npc_mara', 4, false),
    thread_synod: thread('thread_synod', 'Synod Compliance', 'npc_ianthe', 5, false),
    thread_house: thread('thread_house', 'House Vael Liability', 'npc_halvek', 3, false),
  }
  state.campaign.clues = {
    clue_missing_page: clue('clue_missing_page', 'The tithe ledger contains one page in a different hand.', ['thread_tithe'], 13),
    clue_replacements: clue('clue_replacements', 'Replacement children are already listed in the annex schedule.', ['thread_tithe'], 13),
    clue_mara_names: clue('clue_mara_names', 'Mara removed two names after the Ashen Ward transfer.', ['thread_mara'], 12),
    clue_seal: clue('clue_seal', 'The Synod wax seal was impressed before the census was complete.', ['thread_synod'], 11),
    clue_vael: clue('clue_vael', 'House Vael signed the exemption before the shortfall was announced.', ['thread_house'], 10),
  }

  state.history.turns = [
    {
      index: 10,
      chapter: 2,
      playerInput: 'I step between the Prefect and the intake line before the seal cools.',
      narratorProse:
        'The intake hall goes quiet by degrees: first the clerks, then the retainers, then the families who have learned that silence is safer than hope.',
      timestamp: new Date().toISOString(),
    },
    {
      index: 12,
      chapter: 2,
      playerInput: 'I ask Mara to show me the copy she hid before the Synod bell rang.',
      narratorProse:
        'Mara opens the witness ledger with both hands. The paper is cheap, the ink uneven, the names unmistakably alive.',
      narratorAnnotation: { suggestedActions: EPIC_SCIFI_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
      stateDiff: [
        { kind: 'intel', label: '+Intel', tone: 'gain', entityId: 'clue_mara_names', value: 1 },
        { kind: 'npc', label: 'Mara Tollen +1', tone: 'gain', entityId: 'npc_mara', from: 'neutral', to: 'favorable', value: 1 },
      ],
      timestamp: new Date().toISOString(),
    },
    {
      index: 13,
      chapter: 2,
      playerInput: 'I put my seal on the lectern and buy one procedural hour with a quarantine writ.',
      narratorProse:
        'The writ lands with a soft click. Prefect Ianthe reads it once, then again, as if obedience might appear between the clauses if she is patient enough.',
      narratorAnnotation: { suggestedActions: EPIC_SCIFI_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
      stateDiff: [
        { kind: 'credits', label: 'WRIT -25', tone: 'loss', from: 200, to: 175, value: -25 },
        { kind: 'inventory', label: 'Quarantine Writ 2->1', tone: 'loss', from: 2, to: 1, value: -1 },
        { kind: 'thread', label: 'Synod Compliance +1', tone: 'loss', entityId: 'thread_synod', from: 4, to: 5, value: 1 },
      ],
      timestamp: new Date().toISOString(),
    },
  ]
  state.history.rollLog = [
    { turn: 10, skill: 'Authority', dc: 14, rollResult: 5, modifier: 2, outcome: 'failure', consequenceSummary: 'The Synod logs the objection as irregular.' },
    { turn: 12, skill: 'Insight', dc: 13, rollResult: 13, modifier: 3, outcome: 'success', consequenceSummary: 'The changed page becomes legible.' },
  ]
  state.history.recentTurns = state.history.turns

  return state
}

function npc(
  id: string,
  name: string,
  affiliation: string,
  disposition: Sf2State['campaign']['npcs'][string]['disposition'],
  ownedThreadIds: string[],
): Sf2State['campaign']['npcs'][string] {
  return {
    id,
    name,
    affiliation,
    role: 'npc',
    status: 'alive',
    disposition,
    identity: {
      keyFacts: [`${name} is active in the current pressure field.`],
      voice: { note: 'terse and practical', register: 'operational' },
      relations: [],
    },
    ownedThreadIds,
    retrievalCue: `${name} matters when the current access problem is in focus.`,
    chapterCreated: 2,
    lastSeenTurn: 13,
    signatureLines: [],
  }
}

function thread(
  id: string,
  title: string,
  ownerId: string,
  tension: number,
  loadBearing: boolean,
): Sf2State['campaign']['threads'][string] {
  return {
    id,
    title,
    category: 'thread',
    chapterCreated: 2,
    retrievalCue: `${title} should surface when the bay access problem advances.`,
    status: 'active',
    owner: { kind: 'npc', id: ownerId },
    stakeholders: [],
    tension,
    peakTension: tension,
    resolutionCriteria: 'Resolve the immediate pressure in play.',
    failureMode: 'The pressure gets worse and costs the PC leverage.',
    anchoredArcId: 'arc_obelisk',
    loadBearing,
    spineForChapter: loadBearing ? 2 : undefined,
    tensionHistory: [{ chapter: 2, turn: 13, value: tension }],
  }
}

function clue(
  id: string,
  content: string,
  anchoredTo: string[],
  turn: number,
): Sf2State['campaign']['clues'][string] {
  return {
    id,
    title: content.slice(0, 42),
    category: 'clue',
    chapterCreated: 2,
    retrievalCue: content,
    status: 'attached',
    anchoredTo,
    content,
    discoveredInScene: 'scene_2_1',
    turn,
  }
}
