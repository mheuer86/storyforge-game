import type {
  Sf2ChapterTensionScoreLine,
  Sf2EngineRuntime,
  Sf2EntityId,
  Sf2Faction,
  Sf2Npc,
  Sf2State,
  Sf2Thread,
} from '../sf2/types'
import { readSf2bObjectiveGate } from './objective-gate'

const MAX_RECENT_TURNS = 3
const MAX_LIVE_NPCS = 5
const MAX_PRESSURES = 4
const MAX_FACTS = 8
const MAX_TEXT = 220

export interface Sf2bNarratorKernelInput {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
}

export interface Sf2bNarratorKernelDiagnostics {
  campaignId: string
  sceneId: string
  turnIndex: number
  included: {
    recentTurns: number
    liveNpcs: number
    activePressures: number
    hardFacts: number
    hardConstraints: number
  }
  omitted: {
    npcCount: number
    threadCount: number
    clueCount: number
    documentCount: number
  }
  approxChars: number
}

export interface Sf2bNarratorKernel {
  text: string
  diagnostics: Sf2bNarratorKernelDiagnostics
}

export function buildSf2bNarratorKernel(input: Sf2bNarratorKernelInput): Sf2bNarratorKernel {
  const { state, playerInput, isInitial, turnIndex } = input
  const liveNpcs = selectLiveNpcs(state)
  const activePressures = selectActivePressures(state)
  const tensionLines = selectTensionLines(state)
  const objectiveGate = readSf2bObjectiveGate(state)
  const hardFacts = selectHardFacts(state)
  const hardConstraints = selectHardConstraints(state)
  const recentTurns = state.history.turns.slice(-MAX_RECENT_TURNS)
  const lines: string[] = []

  lines.push('## SF2B dramatic brief')
  lines.push(`- Mode: ${isInitial ? 'chapter opening' : 'turn continuation'}`)
  lines.push(`- Turn: ${turnIndex}`)
  lines.push(`- Player input: ${clip(playerInput, 500) || '(initial scene)'}`)

  lines.push('\n### What this chapter wants')
  lines.push(`- Chapter: ${state.chapter.number} - ${state.chapter.title}`)
  lines.push(`- Objective: ${clip(state.chapter.setup.frame.objective)}`)
  lines.push(`- Crucible: ${clip(state.chapter.setup.frame.crucible)}`)
  const opening = state.chapter.artifacts.opening
  if (opening.sceneIntent) lines.push(`- Opening intent: ${clip(opening.sceneIntent)}`)
  if (state.campaign.arcPlan) {
    lines.push(`- Arc question: ${clip(state.campaign.arcPlan.arcQuestion)}`)
    lines.push(`- This run: ${clip(state.campaign.arcPlan.scenarioShape.whyThisRun)}`)
  }
  const pacing = state.chapter.setup.pacingContract
  if (pacing) {
    lines.push(`- Chapter question: ${clip(pacing.chapterQuestion)}`)
    lines.push(`- Likely close vectors: ${pacing.closeWhenAny.slice(0, 3).map((s) => clip(s, 120)).join(' | ')}`)
  }
  if (objectiveGate.directive) {
    lines.push(`- Close/reframe pressure: ${clip(objectiveGate.directive, 260)}`)
  }

  lines.push('\n### What is true now')
  lines.push(`- Scene: ${state.world.sceneSnapshot.sceneId}`)
  lines.push(`- Location: ${state.world.currentLocation.name} - ${clip(state.world.currentLocation.description)}`)
  lines.push(`- Time: ${state.world.currentTimeLabel}`)
  appendBounded(lines, state.world.currentLocation.atmosphericConditions, 'Atmosphere', 4)
  appendBounded(lines, state.world.sceneSnapshot.established, 'Established on-screen', MAX_FACTS)
  appendBounded(lines, hardFacts, 'Hard facts to preserve', MAX_FACTS)

  lines.push('\n### PC anchors')
  lines.push(
    `- ${state.player.name}, ${state.player.origin.name} ${state.player.class.name}, level ${state.player.level}; HP ${state.player.hp.current}/${state.player.hp.max}; AC ${state.player.ac}; credits ${state.player.credits}; inspiration ${state.player.inspiration}; exhaustion ${state.player.exhaustion}`
  )
  appendBounded(lines, state.player.proficiencies, 'Proficiencies', 8)
  appendBounded(lines, state.player.inventory.map((i) => `${i.name}${i.qty !== 1 ? ` x${i.qty}` : ''}`), 'Inventory', 8)
  appendBounded(lines, state.player.tempModifiers.map((m) => `${m.source}: ${m.effect}`), 'Temporary modifiers', 4)

  lines.push('\n### Recent beat rhythm')
  if (recentTurns.length === 0) {
    lines.push('- No prior turns in this campaign.')
  } else {
    for (const turn of recentTurns) {
      lines.push(`- T${turn.index} player: ${clip(turn.playerInput, 180)}`)
      lines.push(`  narrator: ${clip(turn.narratorProse, 260)}`)
    }
  }

  lines.push('\n### People and forces in reach')
  if (liveNpcs.length === 0) {
    lines.push('- No named NPC is currently on-stage.')
  } else {
    for (const npc of liveNpcs) {
      lines.push(renderNpcLine(npc, state))
    }
  }
  const liveFactionLines = selectLiveFactions(state, activePressures)
  appendBounded(lines, liveFactionLines, 'Relevant factions', 3)

  lines.push('\n### Pressure to keep alive')
  if (objectiveGate.reframeCandidate && objectiveGate.foregroundAnswered) {
    lines.push(`- Reframe candidate: ${objectiveGate.reframeCandidate.title} (${objectiveGate.reframeCandidate.threadId}) — ${clip(objectiveGate.reframeCandidate.reason, 160)}`)
  }
  appendBounded(lines, tensionLines.map(renderTensionLine), 'Tension surfaces (private)', 3)
  if (activePressures.length === 0) {
    lines.push('- No active pressure selected; let the hook and current scene create immediate resistance.')
  } else {
    for (const pressure of activePressures) lines.push(`- ${pressure}`)
  }

  lines.push('\n### Continuity covenant (private)')
  for (const constraint of hardConstraints) lines.push(`- ${constraint}`)

  lines.push('\n### Prose craft')
  lines.push('- Strong genre voice, sensory specificity, organic pacing, and meaningful player agency.')
  lines.push('- Make the brief invisible: do not sound like a state renderer, checklist, packet reader, or diagnostics panel.')
  lines.push('- Limited PC POV only. No hidden-camera narration, no offscreen intent, no debug labels, and no raw roll math in prose.')
  lines.push('- Preserve hard state exactly, but let scene movement feel authored around pressure, choice, and consequence.')

  const text = lines.join('\n')
  return {
    text,
    diagnostics: {
      campaignId: state.meta.campaignId,
      sceneId: state.world.sceneSnapshot.sceneId,
      turnIndex,
      included: {
        recentTurns: recentTurns.length,
        liveNpcs: liveNpcs.length,
        activePressures: activePressures.length,
        hardFacts: hardFacts.length,
        hardConstraints: hardConstraints.length,
      },
      omitted: {
        npcCount: Math.max(0, Object.keys(state.campaign.npcs).length - liveNpcs.length),
        threadCount: Math.max(0, Object.keys(state.campaign.threads).length - activePressures.length),
        clueCount: Object.keys(state.campaign.clues).length,
        documentCount: Object.keys(state.campaign.documents).length,
      },
      approxChars: text.length,
    },
  }
}

function selectLiveNpcs(state: Sf2State): Sf2Npc[] {
  const ids = state.world.sceneSnapshot.currentInterlocutorIds?.length
    ? state.world.sceneSnapshot.currentInterlocutorIds
    : state.world.sceneSnapshot.presentNpcIds
  return ids
    .map((id) => state.campaign.npcs[id])
    .filter((npc): npc is Sf2Npc => Boolean(npc) && npc.status !== 'dead')
    .slice(0, MAX_LIVE_NPCS)
}

function selectActivePressures(state: Sf2State): string[] {
  const threads = Object.values(state.campaign.threads)
    .filter((thread) => thread.status === 'active')
    .sort(compareThreadsForKernel)
    .slice(0, MAX_PRESSURES)
    .map((thread) => renderThreadPressure(thread, state))

  const engines = Object.values(state.campaign.engines)
    .filter((engine) => engine.status === 'active')
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(0, MAX_PRESSURES - threads.length))
    .map(renderEnginePressure)

  return [...threads, ...engines].slice(0, MAX_PRESSURES)
}

function selectTensionLines(state: Sf2State): Sf2ChapterTensionScoreLine[] {
  const lines = state.chapter.setup.tensionScore ?? []
  if (lines.length === 0) return []

  const foreground = lines.find((line) => line.role === 'foreground_objective')
  const undertow = lines
    .filter((line) => line !== foreground)
    .sort(compareTensionLines)
    .slice(0, foreground ? 2 : 3)

  return [
    ...(foreground ? [foreground] : []),
    ...undertow,
  ].slice(0, 3)
}

function compareTensionLines(a: Sf2ChapterTensionScoreLine, b: Sf2ChapterTensionScoreLine): number {
  const role = tensionRoleRank(b.role) - tensionRoleRank(a.role)
  if (role !== 0) return role
  return Number(Boolean(b.carried)) - Number(Boolean(a.carried))
}

function tensionRoleRank(role: Sf2ChapterTensionScoreLine['role']): number {
  if (role === 'relational_social_pressure') return 4
  if (role === 'shadow_faction_pressure') return 3
  if (role === 'cargo_system_pressure') return 2
  if (role === 'environmental_pressure') return 1
  return 0
}

function renderTensionLine(line: Sf2ChapterTensionScoreLine): string {
  const source = line.sourceThreadId ?? line.sourceEntityId ?? 'unanchored'
  return `${line.role} (${source}) ${clip(line.pressure, 120)}; surface ${clip(line.proseSurface, 120)}; advances ${clip(line.advancesWhen, 90)}; resolves/reframes ${clip(line.resolvesOrReframesWhen, 90)}`
}

function compareThreadsForKernel(a: Sf2Thread, b: Sf2Thread): number {
  const aLoad = a.loadBearing ? 1 : 0
  const bLoad = b.loadBearing ? 1 : 0
  if (aLoad !== bLoad) return bLoad - aLoad
  const aSpine = a.spineForChapter ? 1 : 0
  const bSpine = b.spineForChapter ? 1 : 0
  if (aSpine !== bSpine) return bSpine - aSpine
  return b.tension - a.tension
}

function renderThreadPressure(thread: Sf2Thread, state: Sf2State): string {
  const owner = renderOwner(thread.owner, state)
  const deterioration = thread.deterioration ? `; deterioration ${renderDeterioration(thread.deterioration)}` : ''
  return `${thread.title} (${thread.id}) ${thread.tension}/10; owner ${owner}; ${clip(thread.retrievalCue)}${deterioration}`
}

function renderEnginePressure(engine: Sf2EngineRuntime): string {
  return `${engine.name} (${engine.id}) ${engine.value}/10; symptom ${clip(engine.visibleSymptoms)}`
}

function selectHardFacts(state: Sf2State): string[] {
  return [
    ...state.world.sceneSnapshot.established,
    ...(state.campaign.arcPlan?.invariantFacts ?? []),
  ].slice(0, MAX_FACTS)
}

function selectHardConstraints(state: Sf2State): string[] {
  const constraints = [
    `Campaign id ${state.meta.campaignId}; schema ${state.meta.schemaVersion}; genre ${state.meta.genreId}.`,
    `Current location is ${state.world.currentLocation.id}; do not move scenes unless the fiction earns an observable transition.`,
    'Do not invent parallel NPCs, factions, documents, promises, or debts when an existing entity fits.',
    'No full graph dump, long clue inventory, gate list, dormant arc telemetry, or pressure-engine internals in prose.',
  ]
  if (state.world.currentLocation.locked) constraints.push('Current location is locked.')
  if (state.campaign.pendingRecoveryNotes?.length) {
    constraints.push(`Recovery note: ${clip(state.campaign.pendingRecoveryNotes[0])}`)
  }
  if (state.campaign.pendingCoherenceNotes?.length) {
    constraints.push(`Coherence note: ${clip(state.campaign.pendingCoherenceNotes[0])}`)
  }
  return constraints
}

function selectLiveFactions(state: Sf2State, pressureLines: string[]): string[] {
  const pressureText = pressureLines.join(' ')
  return Object.values(state.campaign.factions)
    .filter((faction) => pressureText.includes(faction.id) || faction.heat === 'high' || faction.heat === 'boiling')
    .slice(0, 3)
    .map((faction) => renderFactionLine(faction))
}

function renderNpcLine(npc: Sf2Npc, state: Sf2State): string {
  const addressed = state.world.sceneSnapshot.currentInterlocutorIds?.includes(npc.id)
    ? '; current interlocutor'
    : ''
  const tag = npc.tempLoadTag ? `; state ${npc.tempLoadTag}` : ''
  const agenda = npc.agenda?.currentMove ? `; current move ${clip(npc.agenda.currentMove, 120)}` : ''
  return `- ${npc.name} (${npc.id}) - ${npc.affiliation}, ${npc.role}, ${npc.disposition}${addressed}${tag}; voice ${clip(npc.identity.voice.note, 120)}${agenda}`
}

function renderFactionLine(faction: Sf2Faction): string {
  const agenda = faction.agenda?.currentMove ? `; move ${clip(faction.agenda.currentMove, 100)}` : ''
  return `${faction.name} (${faction.id}) stance ${faction.stance}, heat ${faction.heat}${agenda}`
}

function renderOwner(owner: { kind: 'npc' | 'faction'; id: Sf2EntityId }, state: Sf2State): string {
  if (owner.kind === 'npc') {
    const npc = state.campaign.npcs[owner.id]
    return npc ? `${npc.name} (${owner.id})` : owner.id
  }
  const faction = state.campaign.factions[owner.id]
  return faction ? `${faction.name} (${owner.id})` : owner.id
}

function renderDeterioration(d: Sf2Thread['deterioration']): string {
  if (!d) return ''
  if (d.kind === 'clock') return `${d.filled}/${d.segments}`
  return d.deadline
}

function appendBounded(lines: string[], values: string[] | undefined, label: string, max: number): void {
  const clean = (values ?? []).map((v) => clip(v)).filter(Boolean)
  if (clean.length === 0) return
  lines.push(`- ${label}: ${clean.slice(0, max).join(' | ')}${clean.length > max ? ` | ...${clean.length - max} more omitted` : ''}`)
}

function clip(value: string, max = MAX_TEXT): string {
  const singleLine = value.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= max) return singleLine
  return `${singleLine.slice(0, max - 1)}...`
}
