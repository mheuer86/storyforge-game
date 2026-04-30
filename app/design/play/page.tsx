'use client'

// Static full-shell design preview. Mock data only: no SF2 engine wiring.
// Route: /design/play

import { useMemo, useRef, useState } from 'react'
import {
  Sf2PlayShell,
  type Sf2CloseReadinessView,
  type Sf2PendingCheckView,
  type Sf2RollOutcomeView,
} from '@/components/sf2/play-shell'
import { createInitialSf2State } from '@/lib/sf2/game-data'
import type { Sf2State } from '@/lib/sf2/types'

const MOCK_ACTIONS = [
  'Slice the bay door open before HELIA pings the lock again',
  'Hand-signal Aysu to flank along the cargo line',
  'Hold position and watch the cycle for one more pulse',
  'Burn a Cipher Spike and ghost the door entirely',
]

const MOCK_CHECK: Sf2PendingCheckView = {
  skill: 'Slicing',
  dc: 14,
  why: "Reach into the bay door's handshake chip and feed it the old Cartel cipher.",
  consequenceOnFail: 'HELIA marks your access pattern and advances the sweep clock.',
  modifierType: 'challenge',
  modifierReason: 'HELIA is actively hardening the lock',
}

export default function PlayDesignPreviewPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pendingInput, setPendingInput] = useState('')
  const [rollResult, setRollResult] = useState<Sf2RollOutcomeView | null>(null)
  const state = useMemo(buildMockSf2State, [])
  const pendingCheck = rollResult ? null : MOCK_CHECK
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

  function resolveMockRoll() {
    const d20 = 15
    const modifier = 4
    const effectiveDc = MOCK_CHECK.dc + 2
    setRollResult({
      d20,
      modifier,
      dc: MOCK_CHECK.dc,
      effectiveDc,
      total: d20 + modifier,
      result: d20 + modifier >= effectiveDc ? 'success' : 'failure',
      skill: MOCK_CHECK.skill,
      modifierType: MOCK_CHECK.modifierType,
      modifierReason: MOCK_CHECK.modifierReason,
    })
  }

  return (
    <Sf2PlayShell
      state={state}
      scrollRef={scrollRef}
      prose=""
      suggestedActions={MOCK_ACTIONS}
      pendingInput={pendingInput}
      pendingCheck={pendingCheck}
      rollResult={rollResult}
      inspirationOffer={null}
      rollModifier={4}
      effectiveDc={MOCK_CHECK.dc + 2}
      inspirationRemaining={2}
      isStreaming={false}
      isArchiving={false}
      isGeneratingChapter={false}
      generationElapsed={0}
      busy={false}
      chapterTurnCount={14}
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

function buildMockSf2State(): Sf2State {
  const state = createInitialSf2State({
    campaignId: 'design_preview',
    playerName: 'K. Vess',
    seedId: 'space-opera/human/operative/forty-thousand',
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
      narratorAnnotation: { suggestedActions: MOCK_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
      timestamp: new Date().toISOString(),
    },
    {
      index: 13,
      chapter: 2,
      playerInput: "I take the panel. Old Cartel cipher first - if she's running anything older than the Drift War, it'll bite.",
      narratorProse:
        'Aysu crouches beside the cryo-pods, fingertips on her sidearm, eyes flicking between the handshake panel and the dark slit of the access lift. "Four-point-two seconds," she breathes. "That is the cycle."',
      narratorAnnotation: { suggestedActions: MOCK_ACTIONS } as Sf2State['history']['turns'][number]['narratorAnnotation'],
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
