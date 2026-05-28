import {
  createInitialSf2State,
  SPACE_OPERA_DRIFTRUNNER_SEED_ID,
} from '@/lib/sf2/game-data'
import {
  listSf2SetupHooks,
  listSf2SetupOrigins,
  listSf2SetupPlaybooks,
} from '@/lib/sf2/setup/options'
import type { Sf2HandoverCompileResult, Sf2HandoverDocuments } from '@/lib/sf2/handover/types'
import type { Sf2RollRecord, Sf2State } from '@/lib/sf2/types'

export interface Sf2PrototypeBriefMeta {
  id: string
  genre: string
  hook: string
  title: string
  premise: string
  toneReference: string
  supported?: boolean
  unsupportedReason?: string
}

export interface Sf2PrototypeBrief extends Sf2PrototypeBriefMeta {
  brief: string
}

export type Sf2PrototypeSpeaker = 'player' | 'narrator' | 'system'

export interface Sf2PrototypeTranscriptRoll extends Sf2RollRecord {
  why?: string
  consequenceOnFail?: string
}

export interface Sf2PrototypeTranscriptEntry {
  id: string
  speaker: Sf2PrototypeSpeaker
  content: string
  at: string
  turn: number
  chapter: number
  rolls?: Sf2PrototypeTranscriptRoll[]
}

export interface Sf2PrototypeMechanicalSnapshot {
  turn: number
  chapter: number
  hp: string
  ac: number
  inspiration: number
  stats: Record<string, number | string>
  inventory: string[]
  clocks: Array<{ name: string; value: number; max: number }>
  location: string
  npcs: string[]
}

export interface Sf2PrototypeArchivistOutput {
  turn: number
  replay: unknown
}

export interface Sf2PrototypeDiagnosticEntry {
  kind: string
  at: number
  data: unknown
}

export interface Sf2PrototypeSession {
  brief: Sf2PrototypeBrief
  state: Sf2State
  chapterSystemPrompt: string
  systemPromptLabel: string
  transcript: Sf2PrototypeTranscriptEntry[]
  prose: string
  snapshots: Sf2PrototypeMechanicalSnapshot[]
  archivistOutputs: Sf2PrototypeArchivistOutput[]
  diagnostics: Sf2PrototypeDiagnosticEntry[]
  suggestedActions: string[]
  handoverDocuments?: Sf2HandoverDocuments
  lastHandoverResult?: Sf2HandoverCompileResult
  currentTurn: number
  chapter: number
  lastError?: string
}

interface PrototypeStateSource {
  seedId?: string
  setup?: {
    genreId: string
    originId: string
    playbookId: string
    hookTitle: string
  }
}

const PROTOTYPE_STATE_SOURCES: Record<string, PrototypeStateSource> = {
  'space-opera:forty-thousand': {
    seedId: SPACE_OPERA_DRIFTRUNNER_SEED_ID,
  },
  'fantasy:covenant': {
    setup: {
      genreId: 'fantasy',
      originId: 'human',
      playbookId: 'seeker',
      hookTitle: 'The Second Library',
    },
  },
  'grimdark:pale-flame': {
    setup: {
      genreId: 'grimdark',
      originId: 'pale-flame',
      playbookId: 'inquisitor',
      hookTitle: "The Heretic's Daughter",
    },
  },
  'epic-scifi:hegemony-seeker': {
    setup: {
      genreId: 'epic-scifi',
      originId: 'synod',
      playbookId: 'seeker',
      hookTitle: 'The Allocation',
    },
  },
  'cyberpunk:chrome': {
    setup: {
      genreId: 'cyberpunk',
      originId: 'ripperdoc',
      playbookId: 'street-doc',
      hookTitle: 'The Fourteen-Year-Old',
    },
  },
  'noire:sable': {
    setup: {
      genreId: 'noire',
      originId: 'criminal',
      playbookId: 'fixer-lawyer',
      hookTitle: 'Old Debts',
    },
  },
  'cold-war:cardinal': {
    setup: {
      genreId: 'cold-war',
      originId: 'cia',
      playbookId: 'field-operative',
      hookTitle: 'Cardinal',
    },
  },
}

export function listSf2PrototypeBriefs(catalog: Sf2PrototypeBrief[]): Sf2PrototypeBriefMeta[] {
  return catalog.map(({ brief: _brief, ...meta }) => {
    const support = getSf2PrototypeBriefSupport(meta)
    return { ...meta, ...support }
  })
}

export function getSf2PrototypeBrief(catalog: Sf2PrototypeBrief[], id: string): Sf2PrototypeBrief | null {
  return catalog.find((brief) => brief.id === id) ?? null
}

export function getSf2PrototypeBriefSupport(
  brief: Pick<Sf2PrototypeBriefMeta, 'id' | 'genre'>
): { supported: boolean; unsupportedReason?: string } {
  if (!PROTOTYPE_STATE_SOURCES[brief.id]) {
    return {
      supported: false,
      unsupportedReason: brief.genre === 'cold-war'
        ? 'Cold War is still a registry-only brief; SF2 has no playable state config for it yet.'
        : 'No prototype state mapping exists for this brief yet.',
    }
  }

  try {
    buildPrototypeSetupSelection(PROTOTYPE_STATE_SOURCES[brief.id])
    return { supported: true }
  } catch (error) {
    return {
      supported: false,
      unsupportedReason: error instanceof Error ? error.message : 'Prototype state setup failed.',
    }
  }
}

export function createSf2PrototypeSession(
  catalog: Sf2PrototypeBrief[],
  briefId: string,
  now = new Date()
): Sf2PrototypeSession {
  const brief = getSf2PrototypeBrief(catalog, briefId)
  if (!brief) {
    throw new Error(`Cannot start unknown SF2 prototype brief: ${briefId}`)
  }

  const source = PROTOTYPE_STATE_SOURCES[brief.id]
  if (!source) {
    throw new Error(getSf2PrototypeBriefSupport(brief).unsupportedReason)
  }

  const state = hydratePrototypeChapterState(
    createInitialSf2State({
      campaignId: `sf2_prototype_${brief.id.replace(/[^a-z0-9]+/gi, '_')}_${now.getTime()}`,
      playerName: 'Prototype PC',
      seedId: source.seedId,
      setupSelection: source.seedId ? undefined : buildPrototypeSetupSelection(source),
    }),
    brief,
    now
  )

  return {
    brief,
    state,
    chapterSystemPrompt: brief.brief,
    systemPromptLabel: `${brief.title} · Chapter 1 Brief`,
    transcript: [],
    prose: '',
    snapshots: [buildPrototypeMechanicalSnapshot(state, 0)],
    archivistOutputs: [],
    diagnostics: [{
      kind: 'prototype_state_created',
      at: now.getTime(),
      data: {
        briefId: brief.id,
        genre: state.meta.genreId,
        seedId: state.meta.seedId,
        setupSelection: state.meta.setupSelection,
      },
    }],
    suggestedActions: [],
    currentTurn: 0,
    chapter: state.meta.currentChapter,
  }
}

export function appendSf2PrototypeCommittedTurn(input: {
  session: Sf2PrototypeSession
  stateAfter: Sf2State
  turnIndex: number
  nextTurnIndex: number
  playerInput: string
  narratorProse: string
  rollRecords?: Sf2PrototypeTranscriptRoll[]
  archivistReplay: unknown
  suggestedActions: string[]
  diagnostics: Sf2PrototypeDiagnosticEntry[]
  now?: Date
}): Sf2PrototypeSession {
  const now = input.now ?? new Date()
  const at = now.toISOString()
  const transcriptAdditions: Sf2PrototypeTranscriptEntry[] = []
  const cleanInput = input.playerInput.trim()

  if (cleanInput) {
    transcriptAdditions.push({
      id: `p${input.turnIndex}`,
      speaker: 'player',
      content: cleanInput,
      at,
      turn: input.turnIndex,
      chapter: input.stateAfter.meta.currentChapter,
    })
  }

  transcriptAdditions.push({
    id: `n${input.turnIndex}`,
    speaker: 'narrator',
    content: input.narratorProse,
    at,
    turn: input.turnIndex,
    chapter: input.stateAfter.meta.currentChapter,
    rolls: input.rollRecords?.length ? input.rollRecords : undefined,
  })

  return {
    ...input.session,
    state: input.stateAfter,
    transcript: [...input.session.transcript, ...transcriptAdditions],
    prose: appendProseBlock(input.session.prose, cleanInput, input.narratorProse),
    snapshots: [
      ...input.session.snapshots,
      buildPrototypeMechanicalSnapshot(input.stateAfter, input.nextTurnIndex),
    ],
    archivistOutputs: [
      ...input.session.archivistOutputs,
      { turn: input.turnIndex, replay: input.archivistReplay },
    ],
    diagnostics: [...input.session.diagnostics, ...input.diagnostics],
    suggestedActions: input.suggestedActions,
    currentTurn: input.nextTurnIndex,
    chapter: input.stateAfter.meta.currentChapter,
    lastError: undefined,
  }
}

export function markSf2PrototypeError(
  session: Sf2PrototypeSession,
  message: string,
  diagnostics: Sf2PrototypeDiagnosticEntry[] = []
): Sf2PrototypeSession {
  return {
    ...session,
    diagnostics: [
      ...session.diagnostics,
      ...diagnostics,
      { kind: 'prototype_error', at: Date.now(), data: message },
    ],
    lastError: message,
  }
}

export function toProseFirstTranscript(
  session: Sf2PrototypeSession
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return session.transcript
    .filter((entry) => entry.speaker === 'player' || entry.speaker === 'narrator')
    .map((entry) => ({
      role: entry.speaker === 'player' ? 'user' : 'assistant',
      content: entry.content,
    }))
}

export function buildSf2PrototypeHandoverRequest(session: Sf2PrototypeSession) {
  const state = session.state
  return {
    transcript: session.transcript.map((entry) => ({
      role: entry.speaker === 'player' ? 'player' as const : entry.speaker === 'narrator' ? 'narrator' as const : 'system' as const,
      content: entry.content,
      turn: entry.turn,
      chapter: entry.chapter,
      timestamp: entry.at,
    })),
    mechanicalState: buildPrototypeMechanicalStateForHandover(state),
    currentBrief: session.brief.brief,
    sessionBrief: session.handoverDocuments?.sessionBrief,
    previousGmMemory: session.handoverDocuments?.gmMemory,
    miniDebriefs: state.chapter.sceneSummaries.slice(-6).map((summary) => ({
      title: summary.sceneId,
      content: summary.summary,
      scene: summary.sceneId,
    })),
    campaignName: session.brief.title,
    chapterNumber: state.meta.currentChapter,
    model: 'claude-haiku-4-5-20251001',
  }
}

export function buildSf2PrototypeFallbackHandoverDocuments(
  session: Sf2PrototypeSession,
  reason: string
): Sf2HandoverDocuments {
  const state = session.state
  const transcript = session.transcript
    .map((entry) => `- CH${entry.chapter} T${entry.turn} ${entry.speaker}: ${entry.content}`)
    .join('\n')
  const npcs = Object.values(state.campaign.npcs)
    .map((npc) => `- ${npc.name}: ${npc.role}; ${npc.disposition}; ${npc.retrievalCue}`)
  const threads = Object.values(state.campaign.threads)
    .map((thread) => `- ${thread.title}: ${thread.status}, tension ${thread.tension}/10; ${thread.retrievalCue}`)
  const recentRolls = state.history.rollLog.slice(-8)
    .map((roll) => `- T${roll.turn} ${roll.skill}: ${roll.total} vs DC ${roll.effectiveDc ?? roll.dc} (${roll.outcome})`)

  return {
    sessionBrief: [
      `# ${session.brief.title} — Chapter ${state.meta.currentChapter + 1} Session Brief`,
      '',
      `Fallback compiled from actual prototype play because the handover compiler did not complete: ${reason}`,
      '',
      '## Campaign Premise',
      session.brief.premise,
      '',
      '## Continuation Mandate',
      'Open from the current situation, preserve every established fact below, and continue asking only the next necessary character-creation question until the protagonist is playable.',
      '',
      '## Recent Transcript',
      transcript || '- No transcript entries recorded.',
      '',
      '## Current Scene',
      `- Location: ${state.world.currentLocation.name || 'Unknown'}`,
      `- Time: ${state.world.currentTimeLabel || state.meta.currentTimeLabel || 'Unknown'}`,
      `- Established: ${(state.world.sceneSnapshot.established ?? []).join('; ') || 'none'}`,
    ].join('\n'),
    gmMemory: [
      `# ${session.brief.title} — GM Memory`,
      '',
      '## Player Character',
      `- Name: ${state.player.name}`,
      `- Origin/playbook: ${state.player.origin.name} ${state.player.class.name}`,
      `- HP/AC: ${state.player.hp.current}/${state.player.hp.max}, AC ${state.player.ac}`,
      `- Inventory: ${state.player.inventory.map((item) => `${item.name} x${item.qty}`).join(', ') || 'none'}`,
      '',
      '## NPCs',
      ...(npcs.length ? npcs : ['- None recorded yet.']),
      '',
      '## Threads And Pressure',
      ...(threads.length ? threads : ['- No durable threads recorded yet.']),
    ].join('\n'),
    quickReference: [
      `# ${session.brief.title} — Quick Reference`,
      '',
      `- Chapter to open: ${state.meta.currentChapter + 1}`,
      `- Current turn count: ${state.history.turns.length}`,
      `- Current location: ${state.world.currentLocation.name || 'Unknown'}`,
      `- Visible NPCs: ${state.world.sceneSnapshot.presentNpcIds.map((id) => state.campaign.npcs[id]?.name ?? id).join(', ') || 'none'}`,
      `- Suggested next move: continue from the most recent unanswered setup question or immediate scene pressure.`,
      '',
      '## Recent Rolls',
      ...(recentRolls.length ? recentRolls : ['- No rolls recorded yet.']),
    ].join('\n'),
  }
}

export function continueSf2PrototypeWithHandover(
  session: Sf2PrototypeSession,
  documents: Sf2HandoverDocuments,
  now = new Date()
): Sf2PrototypeSession {
  const nextState = structuredClone(session.state)
  const nextChapter = nextState.meta.currentChapter + 1
  const sceneId = `scene_${nextChapter}_1`
  const title = `Chapter ${nextChapter}: ${session.brief.title}`
  const updatedAt = now.toISOString()

  nextState.meta.currentChapter = nextChapter
  nextState.meta.currentSceneId = sceneId
  nextState.meta.currentTimeLabel = `Chapter ${nextChapter} opening`
  nextState.meta.updatedAt = updatedAt
  nextState.chapter.number = nextChapter
  nextState.chapter.title = title
  nextState.chapter.currentSceneId = sceneId
  nextState.chapter.setup.chapter = nextChapter
  nextState.chapter.setup.title = title
  nextState.chapter.setup.frame.title = title
  nextState.chapter.setup.frame.premise = `Continuation from Chapter ${nextChapter - 1}.`
  nextState.chapter.setup.frame.activePressure = 'Use the compiled handover documents as the authoritative continuation brief.'
  nextState.chapter.setup.frame.centralTension = session.brief.premise
  nextState.chapter.setup.frame.objective = 'Open the next chapter from the handover and put the player back into a live scene.'
  nextState.chapter.setup.frame.crucible = session.brief.premise
  nextState.chapter.setup.openingSceneSpec = {
    ...nextState.chapter.setup.openingSceneSpec,
    location: nextState.world.currentLocation.name || 'Continuation scene',
    atmosphericCondition: 'Consequences from the prior chapter are present.',
    initialState: 'The next chapter opens from the compiled handover.',
    firstPlayerFacing: 'Re-establish the situation and present the first actionable pressure.',
    noStartingCombat: true,
  }
  nextState.chapter.artifacts.opening = {
    sceneIntent: 'Continue from handover',
    openingPressure: session.brief.premise,
    chapterObjective: nextState.chapter.setup.frame.objective,
    chapterCrucible: nextState.chapter.setup.frame.crucible,
    visibleNpcIds: nextState.world.sceneSnapshot.presentNpcIds,
    visibleThreadIds: nextState.chapter.setup.activeThreadIds,
    loreForOpening: [],
    sceneWarnings: [],
  }
  nextState.world.sceneSnapshot = {
    ...nextState.world.sceneSnapshot,
    sceneId,
    firstTurnIndex: nextState.history.turns.length,
    established: [
      `Chapter ${nextChapter} begins from compiled handover documents.`,
      ...(nextState.world.sceneSnapshot.established ?? []).slice(-4),
    ],
  }
  nextState.history.recentTurns = nextState.history.turns.slice(-6)

  return {
    ...session,
    state: nextState,
    chapterSystemPrompt: renderHandoverSystemPrompt(documents),
    systemPromptLabel: `${session.brief.title} · Chapter ${nextChapter} Handover`,
    transcript: [],
    prose: `${session.prose.trim()}\n\n---\n\nChapter ${nextChapter} handover compiled. Opening continuation...`.trim(),
    snapshots: [
      ...session.snapshots,
      buildPrototypeMechanicalSnapshot(nextState, session.currentTurn),
    ],
    diagnostics: [
      ...session.diagnostics,
      {
        kind: 'handover_applied',
        at: now.getTime(),
        data: {
          chapter: nextChapter,
          sessionBriefBytes: documents.sessionBrief.length,
          gmMemoryBytes: documents.gmMemory.length,
          quickReferenceBytes: documents.quickReference.length,
        },
      },
    ],
    handoverDocuments: documents,
    suggestedActions: [],
    chapter: nextChapter,
    lastError: undefined,
  }
}

export function exportSf2PrototypeArtifact(session: Sf2PrototypeSession) {
  const fallbackHandoverDocuments = buildSf2PrototypeFallbackHandoverDocuments(
    session,
    'export requested before chapter handover compilation'
  )
  const handoverDocuments: Sf2HandoverDocuments = {
    sessionBrief: session.handoverDocuments?.sessionBrief?.trim() || fallbackHandoverDocuments.sessionBrief,
    gmMemory: session.handoverDocuments?.gmMemory?.trim() || fallbackHandoverDocuments.gmMemory,
    quickReference: session.handoverDocuments?.quickReference?.trim() || fallbackHandoverDocuments.quickReference,
  }

  return {
    kind: 'sf2-prose-first-prototype',
    exportedAt: new Date().toISOString(),
    brief: session.brief,
    chapter: session.chapter,
    transcript: session.transcript,
    currentState: session.state,
    mechanicalSnapshots: session.snapshots,
    archivistOutputs: session.archivistOutputs,
    diagnostics: session.diagnostics,
    handoverDocuments,
    lastHandoverResult: session.lastHandoverResult,
  }
}

function buildPrototypeSetupSelection(source: PrototypeStateSource) {
  if (source.seedId) return undefined
  if (!source.setup) throw new Error('Prototype state source is missing setup metadata.')

  const origins = listSf2SetupOrigins(source.setup.genreId)
  if (!origins.some((origin) => origin.id === source.setup!.originId)) {
    throw new Error(`No selectable origin ${source.setup.originId} for ${source.setup.genreId}.`)
  }

  const playbooks = listSf2SetupPlaybooks(source.setup.genreId, source.setup.originId)
  if (!playbooks.some((playbook) => playbook.id === source.setup!.playbookId)) {
    throw new Error(`No selectable playbook ${source.setup.playbookId} for ${source.setup.genreId}/${source.setup.originId}.`)
  }

  const hooks = listSf2SetupHooks(source.setup.genreId, source.setup.originId, source.setup.playbookId)
  const hook = hooks.find((candidate) => candidate.title === source.setup!.hookTitle) ?? hooks[0]
  if (!hook) {
    throw new Error(`No opening hook for ${source.setup.genreId}/${source.setup.originId}/${source.setup.playbookId}.`)
  }

  return {
    genreId: source.setup.genreId,
    originId: source.setup.originId,
    playbookId: source.setup.playbookId,
    hookId: hook.id,
    characterName: 'Prototype PC',
  }
}

function hydratePrototypeChapterState(
  state: Sf2State,
  brief: Sf2PrototypeBrief,
  now: Date
): Sf2State {
  const next = structuredClone(state)
  const sceneId = 'scene_1_1'
  const updatedAt = now.toISOString()

  next.meta.updatedAt = updatedAt
  next.meta.currentSceneId = sceneId
  next.meta.currentTimeLabel = 'Campaign opening'
  next.chapter.number = 1
  next.chapter.title = brief.title
  next.chapter.currentSceneId = sceneId
  next.chapter.setup.chapter = 1
  next.chapter.setup.title = brief.title
  next.chapter.setup.frame = {
    ...next.chapter.setup.frame,
    title: brief.title,
    premise: brief.premise,
    activePressure: brief.toneReference,
    centralTension: brief.premise,
    objective: 'Ask the embedded character creation questions one at a time, then open the first live scene.',
    crucible: brief.premise,
    outcomeSpectrum: {
      clean: 'The PC enters the opening pressure with clear leverage.',
      costly: 'The PC enters with a complication or debt already visible.',
      failure: 'The first pressure claims leverage over the PC.',
      catastrophic: 'The opening pressure escalates before the PC understands the board.',
    },
  }
  next.chapter.setup.openingSceneSpec = {
    location: 'Character creation',
    atmosphericCondition: brief.toneReference,
    initialState: 'The Narrator is establishing the protagonist through the campaign brief questions.',
    firstPlayerFacing: 'Ask the next unanswered setup question or open the first scene once setup is complete.',
    noStartingCombat: true,
  }
  next.chapter.artifacts.opening = {
    sceneIntent: 'Prose-first character creation and opening scene',
    openingPressure: brief.premise,
    chapterObjective: next.chapter.setup.frame.objective,
    chapterCrucible: next.chapter.setup.frame.crucible,
    visibleNpcIds: [],
    visibleThreadIds: [],
    loreForOpening: [],
    sceneWarnings: [],
  }
  next.world.currentLocation = {
    id: 'loc_prototype_opening',
    name: 'Character creation',
    description: 'The campaign is still forming around the protagonist before the first scene lands.',
  }
  next.world.currentTimeLabel = 'Campaign opening'
  next.world.sceneSnapshot = {
    sceneId,
    location: next.world.currentLocation,
    presentNpcIds: [],
    timeLabel: 'Campaign opening',
    established: [
      `Campaign brief: ${brief.title}`,
      `Premise: ${brief.premise}`,
    ],
    firstTurnIndex: 0,
  }

  return next
}

function buildPrototypeMechanicalSnapshot(state: Sf2State, turn: number): Sf2PrototypeMechanicalSnapshot {
  const clocks = Object.values(state.campaign.threads)
    .filter((thread) => thread.status === 'active')
    .sort((a, b) => b.tension - a.tension)
    .slice(0, 8)
    .map((thread) => ({
      name: thread.title,
      value: thread.tension,
      max: 10,
    }))

  return {
    turn,
    chapter: state.meta.currentChapter,
    hp: `${state.player.hp.current}/${state.player.hp.max}`,
    ac: state.player.ac,
    inspiration: state.player.inspiration,
    stats: state.player.stats,
    inventory: state.player.inventory.map((item) => `${item.name}${item.qty > 1 ? ` x${item.qty}` : ''}`),
    clocks,
    location: state.world.currentLocation.name || 'Unknown',
    npcs: Object.values(state.campaign.npcs).map((npc) => npc.name).slice(0, 12),
  }
}

function buildPrototypeMechanicalStateForHandover(state: Sf2State) {
  return {
    chapter: state.meta.currentChapter,
    turn: state.history.turns.length,
    character: {
      name: state.player.name,
      origin: state.player.origin,
      class: state.player.class,
      hp: state.player.hp,
      ac: state.player.ac,
      stats: state.player.stats,
      proficiencies: state.player.proficiencies,
      traits: state.player.traits,
    },
    inventory: state.player.inventory,
    wounds: {
      exhaustion: state.player.exhaustion,
      tempModifiers: state.player.tempModifiers,
    },
    rolls: state.history.rollLog.slice(-20),
    clocks: Object.values(state.campaign.threads)
      .filter((thread) => thread.status === 'active')
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        tension: thread.tension,
        owner: thread.owner,
        status: thread.status,
      })),
    state: {
      meta: state.meta,
      location: state.world.currentLocation,
      sceneSnapshot: state.world.sceneSnapshot,
      chapter: {
        number: state.chapter.number,
        title: state.chapter.title,
        frame: state.chapter.setup.frame,
        activeThreadIds: state.chapter.setup.activeThreadIds,
        pressureLadder: state.chapter.setup.pressureLadder,
      },
      npcs: Object.values(state.campaign.npcs),
      factions: Object.values(state.campaign.factions),
      decisions: Object.values(state.campaign.decisions),
      promises: Object.values(state.campaign.promises),
      clues: Object.values(state.campaign.clues),
    },
  }
}

function renderHandoverSystemPrompt(documents: Sf2HandoverDocuments): string {
  return [
    '# Chapter Continuation Handover',
    'Use these compiled documents as the private GM prep for the next chapter. Do not quote them directly to the player.',
    '',
    '## Session Brief',
    documents.sessionBrief,
    '',
    '## GM Memory',
    documents.gmMemory,
    '',
    '## Quick Reference',
    documents.quickReference,
  ].join('\n')
}

function appendProseBlock(existing: string, playerInput: string, narratorProse: string): string {
  return [
    existing.trim(),
    playerInput ? `> ${playerInput}` : '',
    narratorProse.trim(),
  ].filter(Boolean).join('\n\n')
}
