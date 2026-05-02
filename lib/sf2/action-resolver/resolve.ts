import { buildSceneKernel } from '../scene-kernel/build'
import {
  escapeRegExp,
  findAliasSurface,
} from '../resolution/entity-references'
import type {
  Sf2EntityId,
  Sf2Npc,
  Sf2ResolvedActionType,
  Sf2ResolvedPlayerAction,
  Sf2ResolvedReference,
  Sf2SceneKernel,
  Sf2State,
} from '../types'

const PRONOUN_SURFACES: Record<string, Sf2Npc['identity']['pronoun']> = {
  she: 'she/her',
  her: 'she/her',
  hers: 'she/her',
  he: 'he/him',
  him: 'he/him',
  his: 'he/him',
  they: 'they/them',
  them: 'they/them',
  their: 'they/them',
  theirs: 'they/them',
}

const PRESSURE_TERMS = [
  'press',
  'push',
  'threaten',
  'intimidate',
  'challenge',
  'confront',
  'force',
  'demand',
]
const QUESTION_TERMS = ['ask', 'question', 'where', 'why', 'what', 'when', 'who', 'how']
const ADDRESS_TERMS = ['tell', 'say', 'answer', 'reply', 'speak', 'warn', 'order']

export function resolvePlayerAction(state: Sf2State, rawInput: string): Sf2ResolvedPlayerAction {
  const kernel = buildSceneKernel(state)
  const input = rawInput.trim()
  const actionType = inferActionType(input)
  const resolvedReferences: Sf2ResolvedReference[] = []
  const targets = new Set<Sf2EntityId>()
  const subjects = new Set<Sf2EntityId>()

  const pronounRef = resolvePronounReference(state, kernel, input)
  if (pronounRef) {
    resolvedReferences.push(pronounRef)
    targets.add(pronounRef.resolvedToEntityId)
  }

  for (const ref of resolveNamedReferences(state, kernel, input)) {
    resolvedReferences.push(ref)
    if (targets.size > 0 && !targets.has(ref.resolvedToEntityId)) {
      subjects.add(ref.resolvedToEntityId)
    } else {
      targets.add(ref.resolvedToEntityId)
    }
  }

  const targetEntityIds = [...targets]
  return {
    rawInput,
    actionType,
    targetEntityIds,
    subjectEntityIds: [...subjects],
    resolvedReferences,
    sourceEntityId: 'pc',
    forbiddenTargetSubstitutions: buildForbiddenSubstitutions(kernel, targetEntityIds),
  }
}

function inferActionType(input: string): Sf2ResolvedActionType {
  const lower = input.toLowerCase()
  if (/\b(wait|pause|hold)\b/.test(lower)) return 'wait'
  if (/\b(go|move|walk|run|follow|leave|enter|approach)\b/.test(lower)) return 'move'
  if (/\b(search|inspect|investigate|look|read|examine|study)\b/.test(lower)) return 'investigate'
  if (/\b(use|activate|draw|take|open)\b/.test(lower)) return 'use_item'
  if (/\b(attack|strike|shoot|stab|hit)\b/.test(lower)) return 'attack'
  if (PRESSURE_TERMS.some((term) => new RegExp(`\\b${term}\\b`).test(lower))) return 'pressure_npc'
  if (QUESTION_TERMS.some((term) => new RegExp(`\\b${term}\\b`).test(lower))) return 'question_npc'
  if (ADDRESS_TERMS.some((term) => new RegExp(`\\b${term}\\b`).test(lower))) return 'address_npc'
  return 'other'
}

function resolveNamedReferences(
  state: Sf2State,
  kernel: Sf2SceneKernel,
  input: string
): Sf2ResolvedReference[] {
  const refs: Sf2ResolvedReference[] = []
  const seen = new Set<string>()
  for (const id of kernel.presentEntityIds) {
    const aliases = kernel.aliasMap[id] ?? []
    for (const alias of aliases) {
      const match = findAliasSurface(input, alias)
      if (!match || seen.has(id)) continue
      refs.push({
        surface: match,
        resolvedToEntityId: id,
        confidence: 'high',
        basis: 'explicit name/alias in present scene',
      })
      seen.add(id)
    }
  }

  if (refs.length > 0) return refs

  for (const id of kernel.absentEntityIds) {
    const aliases = kernel.aliasMap[id] ?? []
    for (const alias of aliases) {
      const match = findAliasSurface(input, alias)
      if (!match || seen.has(id)) continue
      refs.push({
        surface: match,
        resolvedToEntityId: id,
        confidence: 'medium',
        basis: 'explicit name/alias off-stage; requires narrated transition before direct interaction',
      })
      seen.add(id)
    }
  }
  return refs
}

function resolvePronounReference(
  state: Sf2State,
  kernel: Sf2SceneKernel,
  input: string
): Sf2ResolvedReference | null {
  const pronoun = findPronoun(input)
  if (!pronoun) return null

  const wanted = PRONOUN_SURFACES[pronoun.toLowerCase()]
  if (!wanted) return null

  const current = kernel.currentInterlocutorIds.filter((id) => npcMatchesPronoun(state, id, wanted))
  if (current.length === 1) {
    return {
      surface: pronoun,
      resolvedToEntityId: current[0],
      confidence: 'high',
      basis: 'pronoun matched currentInterlocutorIds',
    }
  }

  const lastSpeaker = inferLastSpeaker(state, kernel)
  if (lastSpeaker && npcMatchesPronoun(state, lastSpeaker, wanted)) {
    return {
      surface: pronoun,
      resolvedToEntityId: lastSpeaker,
      confidence: 'medium',
      basis: 'pronoun matched last visible speaker',
    }
  }

  const present = kernel.presentEntityIds.filter((id) => npcMatchesPronoun(state, id, wanted))
  if (present.length === 1) {
    return {
      surface: pronoun,
      resolvedToEntityId: present[0],
      confidence: 'medium',
      basis: 'pronoun uniquely matched presentEntityIds',
    }
  }

  const nearby = kernel.nearbyEntityIds.filter((id) => npcMatchesPronoun(state, id, wanted))
  if (nearby.length === 1) {
    return {
      surface: pronoun,
      resolvedToEntityId: nearby[0],
      confidence: 'low',
      basis: 'pronoun matched nearbyEntityIds',
    }
  }

  return null
}

function findPronoun(input: string): string | null {
  const match = input.match(/\b(she|her|hers|he|him|his|they|them|their|theirs)\b/i)
  return match?.[0] ?? null
}

function npcMatchesPronoun(
  state: Sf2State,
  id: string,
  pronoun: Sf2Npc['identity']['pronoun']
): boolean {
  const npc = state.campaign.npcs[id]
  return Boolean(npc && npc.identity.pronoun === pronoun)
}

function inferLastSpeaker(state: Sf2State, kernel: Sf2SceneKernel): string | null {
  const prose = state.history.turns.at(-1)?.narratorProse ?? ''
  if (!prose.trim()) return null

  let best: { id: string; index: number } | null = null
  for (const id of kernel.presentEntityIds) {
    const aliases = kernel.aliasMap[id] ?? []
    for (const alias of aliases) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b\\s+(?:says|asks|replies|answers|tells|whispers|murmurs|mutters|states|declares|adds|remarks|demands|presses|responds)\\b`, 'gi')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(prose))) {
        if (!best || match.index > best.index) best = { id, index: match.index }
      }
    }
  }
  return best?.id ?? null
}

function buildForbiddenSubstitutions(
  kernel: Sf2SceneKernel,
  targetEntityIds: string[]
): string[] {
  const forbidden = new Set<string>(kernel.absentEntityIds)
  if (targetEntityIds.length > 0) {
    for (const id of kernel.presentEntityIds) {
      if (!targetEntityIds.includes(id)) forbidden.add(id)
    }
  }
  return [...forbidden]
}
