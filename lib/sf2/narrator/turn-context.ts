import type Anthropic from '@anthropic-ai/sdk'
import {
  SF2_CORE,
  SF2_NARRATOR_ROLE,
  buildNarratorSituation,
  getSf2BibleForGenre,
} from './prompt'
import { buildMessagesForNarrator } from './messages'
import { NARRATOR_TOOLS } from './tools'
import { computePacingAdvisory } from '../pacing/signals'
import { composeSystemBlocks, assertNoDynamicLeak } from '../prompt/compose'
import { buildSceneKernel } from '../scene-kernel/build'
import type { ScanDisplayOutputOptions } from '../sentinel/display'
import type { Sf2State, Sf2WorkingSet } from '../types'

export interface Sf2NarratorRollResolution {
  toolUseId: string
  skill: string
  dc: number
  effectiveDc?: number
  d20: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  priorMessages: unknown[]
}

export interface Sf2NarratorWorkingSetEventPayload {
  summary: {
    full: string[]
    stub: string[]
    excluded: number
    reasons: Record<string, string[]>
  }
  workingSet: Sf2WorkingSet
}

export interface Sf2NarratorPacingEventPayload {
  tripped: boolean
  reactivityRatio: number
  reactivityTripped: boolean
  sceneLinkTripped: boolean
  stagnantThreadIds: string[]
  arcDormantIds: string[]
}

export interface Sf2NarratorSceneBundleEventPayload {
  sceneId: string
  bundleText: string
  builtAtTurn: number
}

export interface Sf2NarratorTurnContext {
  mode: 'normal' | 'roll_resume'
  system: Anthropic.TextBlockParam[]
  messages: Anthropic.MessageParam[]
  cachedTools: Anthropic.Tool[]
  diagnostics: {
    workingSet: Sf2NarratorWorkingSetEventPayload | null
    sceneBundleBuilt: Sf2NarratorSceneBundleEventPayload | null
    pacingAdvisory: Sf2NarratorPacingEventPayload | null
  }
  sentinelContext: ScanDisplayOutputOptions
  failedRollSkill?: string
  replayMetadata: {
    turnIndex: number
    messageCount: number
    assistantMessageCount: number
    sceneBundleRebuilt: boolean
    workingSetComputed: boolean
  }
}

export function buildNarratorTurnContext(input: {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  rollResolution?: Sf2NarratorRollResolution
}): Sf2NarratorTurnContext {
  const { state, playerInput, isInitial, turnIndex, rollResolution } = input
  const system = buildNarratorSystemBlocks(state)
  const cachedTools = buildCachedNarratorTools()
  const sentinelContext = buildNarratorSentinelContext(state)
  const failedRollSkill =
    rollResolution && (rollResolution.result === 'failure' || rollResolution.result === 'fumble')
      ? rollResolution.skill
      : undefined

  if (rollResolution) {
    const messages = buildRollResumeMessages(rollResolution)
    return {
      mode: 'roll_resume',
      system,
      messages,
      cachedTools,
      diagnostics: {
        workingSet: null,
        sceneBundleBuilt: null,
        pacingAdvisory: null,
      },
      sentinelContext,
      failedRollSkill,
      replayMetadata: buildReplayMetadata('roll_resume', turnIndex, messages, null, null),
    }
  }

  const built = buildMessagesForNarrator(state, playerInput, isInitial, turnIndex)
  const pacing = computePacingAdvisory(state)
  const messages = built.messages

  return {
    mode: 'normal',
    system,
    messages,
    cachedTools,
    diagnostics: {
      workingSet: buildWorkingSetEventPayload(built.workingSet),
      sceneBundleBuilt: built.bundleRebuilt,
      pacingAdvisory: buildPacingEventPayload(pacing),
    },
    sentinelContext,
    failedRollSkill,
    replayMetadata: buildReplayMetadata('normal', turnIndex, messages, built.workingSet, built.bundleRebuilt),
  }
}

export function rollResultMessage(resolution: Omit<Sf2NarratorRollResolution, 'priorMessages' | 'toolUseId'>): string {
  const { skill, dc, effectiveDc, d20, modifier, total, result, modifierType, modifierReason } = resolution
  const dcText = effectiveDc && effectiveDc !== dc ? `DC ${effectiveDc} (base ${dc})` : `DC ${dc}`
  const modifierText = modifierType
    ? ` Modifier: ${modifierType}${modifierReason ? ` (${modifierReason})` : ''}.`
    : ''
  const base = `Roll result — ${skill} vs ${dcText}: rolled d20=${d20} + ${modifier} = ${total}.${modifierText} `
  if (result === 'critical') {
    return (
      base +
      'Natural 20. Critical success. Narrate an exceptional outcome that pays off beyond the baseline.'
    )
  }
  if (result === 'fumble') {
    return (
      base +
      'Natural 1. Critical failure. The attempt fails AND a specific thing breaks AND the consequence cascades into a second bad outcome. Compress backfire + escalation + block in one beat. Do NOT render as partial success.'
    )
  }
  if (result === 'success') {
    return (
      base +
      'Success. Narrate the outcome. The PC accomplishes the stated intent and their position visibly improves. You may attach small friction, exposure, or a future cost, but do not turn success into a miss, wrong belief, closed door, or pure delay.'
    )
  }
  return (
    base +
    `Failure — the stated goal is not achieved in the way the player intended; the scene advances through consequence. Pick one pattern: backfire, escalation, or hard block with cost, but do not write those labels in prose. Both halves required: intended goal not achieved AND the scene moves forward through new pressure. Failure is redirection with cost, not a dead end. If this is the second failure against the same door/NPC/document/barrier, do not ask the player to keep retrying the same obstacle; change the situation, reveal the next pressure-bearing route, or have the world move. Do NOT write this as partial success or "success with cost" — that is a different outcome tier. FORBIDDEN: narrator-reveal ("you don't notice…"), hindsight grading ("you didn't catch the seam", "that detail should have opened a door"), meta-commentary on the miss, invention of new facts, hidden-camera narration about unseen actors. Commit to the false reality from inside the PC's POV.`
  )
}

function buildNarratorSystemBlocks(state: Sf2State): Anthropic.TextBlockParam[] {
  const situation = buildNarratorSituation(state)
  const bible = getSf2BibleForGenre(state.meta.genreId)
  assertNoDynamicLeak(SF2_CORE, 'CORE')
  assertNoDynamicLeak(bible, 'BIBLE')
  assertNoDynamicLeak(SF2_NARRATOR_ROLE, 'ROLE')
  assertNoDynamicLeak(situation, 'SITUATION')

  return composeSystemBlocks({
    core: SF2_CORE,
    bible,
    role: SF2_NARRATOR_ROLE,
    situation,
  }).blocks
}

function buildCachedNarratorTools(): Anthropic.Tool[] {
  return NARRATOR_TOOLS.map((tool, index) =>
    index === NARRATOR_TOOLS.length - 1
      ? { ...tool, cache_control: { type: 'ephemeral' as const } }
      : tool
  )
}

function buildRollResumeMessages(rollResolution: Sf2NarratorRollResolution): Anthropic.MessageParam[] {
  return [
    ...(rollResolution.priorMessages as Anthropic.MessageParam[]),
    {
      role: 'user',
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: rollResolution.toolUseId,
          content: rollResultMessage(rollResolution),
        },
      ],
    },
  ]
}

function buildWorkingSetEventPayload(workingSet: Sf2WorkingSet): Sf2NarratorWorkingSetEventPayload | null {
  if (workingSet.fullEntityIds.length === 0 && workingSet.stubEntityIds.length === 0) {
    return null
  }
  return {
    summary: {
      full: workingSet.fullEntityIds,
      stub: workingSet.stubEntityIds,
      excluded: workingSet.excludedEntityIds.length,
      reasons: workingSet.reasonsByEntityId,
    },
    workingSet,
  }
}

function buildPacingEventPayload(
  pacing: ReturnType<typeof computePacingAdvisory>
): Sf2NarratorPacingEventPayload {
  return {
    tripped:
      pacing.reactivityTripped ||
      pacing.sceneLinkTripped ||
      pacing.stagnantThreadIds.length > 0 ||
      pacing.arcDormantIds.length > 0,
    reactivityRatio: pacing.reactivityRatio,
    reactivityTripped: pacing.reactivityTripped,
    sceneLinkTripped: pacing.sceneLinkTripped,
    stagnantThreadIds: pacing.stagnantThreadIds,
    arcDormantIds: pacing.arcDormantIds,
  }
}

function buildNarratorSentinelContext(state: Sf2State): ScanDisplayOutputOptions {
  const kernel = buildSceneKernel(state)
  return {
    action: 'allow_but_quarantine_writes',
    campaign: state.campaign,
    locationContinuity: {
      recentSceneText: buildLocationContinuityText(state),
    },
    absentSpeakers: {
      absentEntityIds: kernel.absentEntityIds,
      aliasMap: kernel.aliasMap,
    },
  }
}

function buildLocationContinuityText(state: Sf2State): string {
  return [
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...(state.world.sceneSnapshot?.established ?? []),
    ...(state.chapter.sceneSummaries ?? []).slice(-2).map((s) => s.summary),
  ].join(' ')
}

function buildReplayMetadata(
  mode: Sf2NarratorTurnContext['mode'],
  turnIndex: number,
  messages: Anthropic.MessageParam[],
  workingSet: Sf2WorkingSet | null,
  sceneBundleBuilt: Sf2NarratorSceneBundleEventPayload | null
): Sf2NarratorTurnContext['replayMetadata'] {
  return {
    turnIndex,
    messageCount: messages.length,
    assistantMessageCount: messages.filter((message) => message.role === 'assistant').length,
    sceneBundleRebuilt: Boolean(sceneBundleBuilt),
    workingSetComputed: mode === 'normal' && Boolean(workingSet),
  }
}
