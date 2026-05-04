import type { Sf2EntityId, Sf2State, Sf2TurnRecord } from '../sf2/types'

export type Sf2bRepeatedBeatAction =
  | 'escalate'
  | 'compress'
  | 'force_choice'
  | 'time_cut'
  | 'close_vector'

export interface Sf2bRepeatedBeatEvidence {
  turn: number
  source: 'player_input' | 'narrator_prose' | 'thread_state' | 'progress_event'
  excerpt: string
  threadId?: Sf2EntityId
}

export interface Sf2bRepeatedBeatPredicate {
  key: string
  label: string
  family: 'clamp' | 'hold' | 'release' | 'waiting' | 'thread_status'
  count: number
  distinctTurns: number[]
  threadIds: Sf2EntityId[]
  evidence: Sf2bRepeatedBeatEvidence[]
}

export interface Sf2bRepeatedBeatAdvisory {
  triggered: boolean
  severity: 'none' | 'watch' | 'intervene'
  reason: string
  predicates: Sf2bRepeatedBeatPredicate[]
  actionOptions: Sf2bRepeatedBeatAction[]
  recommendedAction?: Sf2bRepeatedBeatAction
}

export interface Sf2bRepeatedBeatOptions {
  recentTurns?: Sf2TurnRecord[]
  windowTurns?: number
  minDistinctTurns?: number
  maxEvidencePerPredicate?: number
}

interface PredicateSeed {
  key: string
  label: string
  family: Sf2bRepeatedBeatPredicate['family']
  evidence: Sf2bRepeatedBeatEvidence
}

const DEFAULT_WINDOW_TURNS = 6
const DEFAULT_MIN_DISTINCT_TURNS = 3
const DEFAULT_MAX_EVIDENCE = 4

const BEAT_PATTERNS: Array<{
  family: Sf2bRepeatedBeatPredicate['family']
  label: string
  regex: RegExp
}> = [
  { family: 'clamp', label: 'clamped pressure', regex: /\b(clamp(?:ed|s|ing)?|pin(?:ned|s|ning)?|lock(?:ed|s|ing)? down|hem(?:med|s|ming)? in)\b/i },
  { family: 'hold', label: 'held position', regex: /\b(hold(?:s|ing)?|held|hold steady|stay(?:s|ing)? put|keeps? (?:still|position|watch))\b/i },
  { family: 'release', label: 'withheld release', regex: /\b(release(?:d|s|ing)?|let(?:s|ting)? go|relent(?:s|ed|ing)?|stand(?:s|ing)? down|back(?:s|ed|ing)? off)\b/i },
  { family: 'waiting', label: 'waiting beat', regex: /\b(wait(?:s|ed|ing)?|pause(?:s|d)?|still waiting|no one moves|nothing changes|silence stretches|holds? breath)\b/i },
  { family: 'thread_status', label: 'unresolved status', regex: /\b(unresolved|still open|remains open|no closer|not yet settled|status quo|same question|same pressure)\b/i },
]

const SUBJECT_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'but',
  'or',
  'to',
  'of',
  'in',
  'on',
  'at',
  'with',
  'for',
  'from',
  'that',
  'this',
  'it',
  'its',
  'their',
  'his',
  'her',
  'your',
  'you',
])

export function detectRepeatedBeatAdvisory(
  state: Sf2State,
  options: Sf2bRepeatedBeatOptions = {}
): Sf2bRepeatedBeatAdvisory {
  const windowTurns = options.windowTurns ?? DEFAULT_WINDOW_TURNS
  const minDistinctTurns = options.minDistinctTurns ?? DEFAULT_MIN_DISTINCT_TURNS
  const maxEvidence = options.maxEvidencePerPredicate ?? DEFAULT_MAX_EVIDENCE
  const sourceTurns = options.recentTurns ?? (
    state.history.recentTurns?.length ? state.history.recentTurns : state.history.turns
  )
  const recentTurns = sourceTurns.slice(-windowTurns)
  const seeds: PredicateSeed[] = []

  for (const turn of recentTurns) {
    seeds.push(...extractTextPredicates(turn.playerInput, turn.index, 'player_input'))
    seeds.push(...extractTextPredicates(turn.narratorProse, turn.index, 'narrator_prose'))

    // Do not seed from active thread recurrence. Continuity is not stagnation;
    // only repeated predicates in prose/input can trigger, and only when the
    // same window lacks material state or consequence movement.
  }

  for (const thread of Object.values(state.campaign.threads)) {
    if (thread.status !== 'active') continue
    for (const event of thread.progressEvents.slice(-windowTurns)) {
      seeds.push(...extractTextPredicates(event.summary, event.turn, 'progress_event', thread.id))
    }
  }

  const grouped = new Map<string, PredicateSeed[]>()
  for (const seed of seeds) {
    const bucket = grouped.get(seed.key) ?? []
    bucket.push(seed)
    grouped.set(seed.key, bucket)
  }

  const predicates = Array.from(grouped.values())
    .map((bucket) => toPredicate(bucket, maxEvidence))
    .filter((predicate) => predicate.distinctTurns.length >= minDistinctTurns)
    .filter((predicate) => isStagnantPredicate(predicate, state, recentTurns))
    .sort((a, b) => b.distinctTurns.length - a.distinctTurns.length || a.key.localeCompare(b.key))

  if (predicates.length === 0) {
    return {
      triggered: false,
      severity: 'none',
      reason: `No repeated unresolved beat appeared across ${recentTurns.length} recent turns.`,
      predicates: [],
      actionOptions: [],
    }
  }

  const strongest = predicates[0]
  const severity = strongest.distinctTurns.length >= minDistinctTurns + 1 ? 'intervene' : 'watch'
  const actionOptions = chooseActions(predicates)
  return {
    triggered: true,
    severity,
    reason: `${strongest.label} recurred across ${strongest.distinctTurns.length} distinct turns.`,
    predicates,
    actionOptions,
    recommendedAction: actionOptions[0],
  }
}

function extractTextPredicates(
  text: string | undefined,
  turn: number,
  source: Sf2bRepeatedBeatEvidence['source'],
  threadId?: Sf2EntityId
): PredicateSeed[] {
  if (!text) return []
  const sentences = splitSentences(text)
  const seeds: PredicateSeed[] = []

  for (const sentence of sentences) {
    for (const pattern of BEAT_PATTERNS) {
      if (!pattern.regex.test(sentence)) continue
      const subject = extractSubjectKey(sentence)
      seeds.push({
        key: `${pattern.family}:${subject}`,
        label: subject === 'general' ? pattern.label : `${pattern.label}: ${subject}`,
        family: pattern.family,
        evidence: {
          turn,
          source,
          excerpt: compact(sentence, 220),
          threadId,
        },
      })
    }
  }

  return seeds
}

function toPredicate(
  bucket: PredicateSeed[],
  maxEvidence: number
): Sf2bRepeatedBeatPredicate {
  const first = bucket[0]
  const turns = Array.from(new Set(bucket.map((seed) => seed.evidence.turn))).sort((a, b) => a - b)
  const threadIds = Array.from(
    new Set(bucket.map((seed) => seed.evidence.threadId).filter((id): id is string => Boolean(id)))
  ).sort()

  return {
    key: first.key,
    label: first.label,
    family: first.family,
    count: bucket.length,
    distinctTurns: turns,
    threadIds,
    evidence: bucket
      .map((seed) => seed.evidence)
      .sort((a, b) => a.turn - b.turn || a.source.localeCompare(b.source))
      .slice(0, maxEvidence),
  }
}

function isStagnantPredicate(
  predicate: Sf2bRepeatedBeatPredicate,
  state: Sf2State,
  recentTurns: Sf2TurnRecord[]
): boolean {
  const firstTurn = predicate.distinctTurns[0]
  const lastTurn = predicate.distinctTurns[predicate.distinctTurns.length - 1]
  const relatedThreadIds = predicate.threadIds.length > 0
    ? predicate.threadIds
    : inferThreadIdsFromTurns(state, recentTurns, firstTurn, lastTurn)

  return !hasMaterialProgress({
    state,
    recentTurns,
    firstTurn,
    lastTurn,
    relatedThreadIds,
  })
}

function hasMaterialProgress(input: {
  state: Sf2State
  recentTurns: Sf2TurnRecord[]
  firstTurn: number
  lastTurn: number
  relatedThreadIds: Sf2EntityId[]
}): boolean {
  const { state, recentTurns, firstTurn, lastTurn, relatedThreadIds } = input
  const turnsInRange = recentTurns.filter((turn) => turn.index >= firstTurn && turn.index <= lastTurn)

  for (const turn of turnsInRange) {
    if (turn.turnResolution?.rollRecords.length || turn.turnResolution?.consequenceEvents.length) {
      return true
    }
    if (turn.stateDiff?.some((diff) => diff.kind === 'thread' || diff.kind === 'location')) {
      return true
    }
    if (turn.narratorAnnotation?.mechanicalEffects.some((effect) =>
      effect.kind === 'set_location' ||
      effect.kind === 'scene_end' ||
      effect.kind === 'set_scene_snapshot'
    )) {
      return true
    }
    if (turn.archivistPatchApplied && patchHasMaterialMovement(turn.archivistPatchApplied)) {
      return true
    }
  }

  for (const threadId of relatedThreadIds) {
    const thread = state.campaign.threads[threadId]
    if (!thread) continue
    if (thread.progressEvents.some((event) => event.turn >= firstTurn && event.turn <= lastTurn)) {
      return true
    }
    const tensionValues = thread.tensionHistory
      .filter((entry) => entry.turn >= firstTurn && entry.turn <= lastTurn)
      .map((entry) => entry.value)
    if (new Set(tensionValues).size > 1) return true
  }

  return false
}

function inferThreadIdsFromTurns(
  state: Sf2State,
  recentTurns: Sf2TurnRecord[],
  firstTurn: number,
  lastTurn: number
): Sf2EntityId[] {
  const threadIds = new Set<Sf2EntityId>()
  for (const turn of recentTurns) {
    if (turn.index < firstTurn || turn.index > lastTurn) continue
    for (const threadId of turn.narratorAnnotation?.hintedEntities.threadsTouched ?? []) {
      if (state.campaign.threads[threadId]?.status === 'active') threadIds.add(threadId)
    }
    for (const threadId of turn.turnResolution?.targetThreadIds ?? []) {
      if (state.campaign.threads[threadId]) threadIds.add(threadId)
    }
  }
  return [...threadIds]
}

function patchHasMaterialMovement(patch: Sf2TurnRecord['archivistPatchApplied']): boolean {
  if (!patch) return false
  return Boolean(
    patch.creates?.length ||
    patch.updates?.length ||
    patch.transitions?.length ||
    patch.attachments?.length ||
    patch.sceneResult ||
    patch.revelationHintsDelivered?.length ||
    patch.revelationsRevealed?.length ||
    patch.ladderFires?.length
  )
}

function chooseActions(predicates: Sf2bRepeatedBeatPredicate[]): Sf2bRepeatedBeatAction[] {
  const families = new Set(predicates.map((predicate) => predicate.family))
  const actions: Sf2bRepeatedBeatAction[] = []

  if (families.has('thread_status')) actions.push('close_vector')
  if (families.has('clamp') || families.has('hold')) actions.push('escalate')
  if (families.has('waiting')) actions.push('time_cut')
  if (families.has('release')) actions.push('force_choice')
  actions.push('compress')

  return Array.from(new Set(actions))
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function extractSubjectKey(sentence: string): string {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !SUBJECT_STOPWORDS.has(word))
    .slice(0, 6)

  if (words.length === 0) return 'general'
  return normalizeKey(words.join(' '))
}

function normalizeKey(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ')

  return normalized || 'general'
}

function compact(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}…`
}
