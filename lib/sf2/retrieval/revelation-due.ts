import type {
  Sf2PossibleRevelation,
  Sf2RevealContext,
  Sf2State,
} from '../types'

export interface Sf2RevelationDueEvaluation {
  due: boolean
  dueReason: string
  matchedTopicKey?: string
  inferredContexts: Sf2RevealContext[]
}

const WORD_BOUNDARY_RE = /[\s"'“”‘’.,!?;:()[\]{}<>/\\|*_+=`~@#$%^&-]+/g
const GENERIC_HELD_BY = new Set(['unknown', 'someone', 'an npc', 'a faction', 'the antagonist'])

export function normalizeRevelationTopic(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(WORD_BOUNDARY_RE, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function evaluateRevelationDue(
  state: Sf2State,
  revelation: Sf2PossibleRevelation,
  playerInput: string,
  turnIndex: number
): Sf2RevelationDueEvaluation {
  if (revelation.revealed) {
    return { due: false, dueReason: 'already revealed', inferredContexts: [] }
  }

  const normalizedInput = normalizeRevelationTopic(playerInput)
  const inferredContexts = inferRevealContexts(playerInput)
  const match = findTopicMatch(state, revelation, normalizedInput)
  const cash = revelation.cashConditions
  const blockingReasons: string[] = []

  if (cash?.minTurn !== undefined && turnIndex < cash.minTurn) {
    blockingReasons.push(`turn ${turnIndex} before minTurn ${cash.minTurn}`)
  }

  if (cash?.minTension) {
    const thread = state.campaign.threads[cash.minTension.threadId]
    const tension = thread?.tension ?? 0
    if (tension < cash.minTension.value) {
      blockingReasons.push(
        `${cash.minTension.threadId} tension ${tension}/10 below ${cash.minTension.value}/10`
      )
    }
  }

  if (cash?.requiresContext && cash.requiresContext.length > 0) {
    const required = new Set(cash.requiresContext)
    if (!inferredContexts.some((context) => required.has(context))) {
      blockingReasons.push(`requires context ${cash.requiresContext.join(', ')}`)
    }
  }

  const invalidContexts = new Set(revelation.invalidRevealContexts ?? [])
  const invalidMatched = inferredContexts.find((context) => invalidContexts.has(context))
  if (invalidMatched) {
    blockingReasons.push(`invalid context ${invalidMatched}`)
  }

  const validContexts = new Set(revelation.validRevealContexts ?? [])
  if (validContexts.size > 0 && inferredContexts.length > 0) {
    const validMatched = inferredContexts.some((context) => validContexts.has(context))
    if (!validMatched) {
      blockingReasons.push(`outside valid contexts ${Array.from(validContexts).join(', ')}`)
    }
  }

  if (cash?.playerPressesTopic && !match) {
    blockingReasons.push('player did not press a configured topic key')
  }

  if (blockingReasons.length > 0) {
    return {
      due: false,
      dueReason: `blocked: ${blockingReasons.join('; ')}`,
      inferredContexts,
    }
  }

  const hintsRequired = revelation.hintsRequired ?? 0
  const hintsDelivered = revelation.hintsDelivered ?? 0
  const hintGateActive = hintsRequired > 0 || (revelation.hintPhrases ?? []).length > 0
  const hintsSatisfied = !hintGateActive || hintsDelivered >= hintsRequired

  if (cash) {
    const activeCashCondition =
      cash.playerPressesTopic ||
      cash.minTurn !== undefined ||
      cash.minTension !== undefined ||
      (cash.requiresContext?.length ?? 0) > 0

    if (activeCashCondition) {
      if (cash.playerPressesTopic && match) {
        return {
          due: true,
          dueReason: `player pressed topic "${match}"`,
          matchedTopicKey: match,
          inferredContexts,
        }
      }
      if (!cash.playerPressesTopic && hintsSatisfied) {
        return {
          due: true,
          dueReason: 'cash conditions satisfied',
          matchedTopicKey: match,
          inferredContexts,
        }
      }
    }
  }

  if (match && hintsSatisfied) {
    return {
      due: true,
      dueReason: `topic matched "${match}" with reveal gates satisfied`,
      matchedTopicKey: match,
      inferredContexts,
    }
  }

  const hintStatus = hintGateActive
    ? `${hintsDelivered}/${hintsRequired} hints delivered`
    : 'no topic match'
  return {
    due: false,
    dueReason: match ? `topic matched "${match}" but ${hintStatus}` : 'not due',
    matchedTopicKey: match,
    inferredContexts,
  }
}

export function inferRevealContexts(playerInput: string): Sf2RevealContext[] {
  const text = playerInput.toLowerCase()
  const contexts: Sf2RevealContext[] = []
  if (/\b(accuse|accusation|blame|you did|you knew|liar|betray|betrayed)\b/.test(text)) {
    contexts.push('accusation')
  }
  if (/\b(record|records|file|files|document|documents|log|logs|manifest|papers|writ|registry)\b/.test(text)) {
    contexts.push('documentary_surface')
  }
  if (/\b(confess|confession|admit|tell me the truth|truth)\b/.test(text)) {
    contexts.push('confession')
  }
  if (/\b(demand|force|press|push|threaten|corner)\b/.test(text)) {
    contexts.push('forced_disclosure')
  }
  if (/\b(trust|trusted|lie|lied|loyal|loyalty|why should i believe)\b/.test(text)) {
    contexts.push('crisis_of_trust')
  }
  if (/\b(who|why|what|which|where|how)\b/.test(text) || contexts.length === 0) {
    contexts.push('private_pressure')
  }
  return Array.from(new Set(contexts))
}

function findTopicMatch(
  state: Sf2State,
  revelation: Sf2PossibleRevelation,
  normalizedInput: string
): string | undefined {
  if (!normalizedInput) return undefined
  for (const topic of buildTopicCandidates(state, revelation)) {
    const normalizedTopic = normalizeRevelationTopic(topic)
    if (!normalizedTopic || normalizedTopic.length < 2) continue
    if (
      normalizedInput.includes(normalizedTopic) ||
      (normalizedInput.length >= 4 && normalizedTopic.includes(normalizedInput))
    ) {
      return topic
    }
  }
  return undefined
}

function buildTopicCandidates(state: Sf2State, revelation: Sf2PossibleRevelation): string[] {
  const candidates = new Set<string>()
  for (const key of revelation.playerTopicKeys ?? []) {
    candidates.add(key)
    addEntityAliases(state, key, candidates)
  }

  const heldBy = revelation.heldBy?.trim()
  if (heldBy && !GENERIC_HELD_BY.has(heldBy.toLowerCase())) {
    candidates.add(heldBy)
    addEntityAliases(state, heldBy, candidates)
  }

  return Array.from(candidates)
}

function addEntityAliases(state: Sf2State, raw: string, candidates: Set<string>): void {
  const needle = normalizeRevelationTopic(raw)
  if (!needle) return

  for (const npc of Object.values(state.campaign.npcs ?? {})) {
    const names = [npc.id, npc.name]
    if (names.some((name) => normalizeRevelationTopic(name) === needle)) {
      for (const name of names) candidates.add(name)
    }
  }

  for (const faction of Object.values(state.campaign.factions ?? {})) {
    const names = [faction.id, faction.name]
    if (names.some((name) => normalizeRevelationTopic(name) === needle)) {
      for (const name of names) candidates.add(name)
    }
  }

  for (const location of Object.values(state.campaign.locations ?? {})) {
    const names = [location.id, location.name, ...(location.aliases ?? [])]
    if (names.some((name) => normalizeRevelationTopic(name) === needle)) {
      for (const name of names) candidates.add(name)
    }
  }
}

export const __sf2RevelationDueTestHooks = {
  normalizeRevelationTopic,
  inferRevealContexts,
  evaluateRevelationDue,
}
