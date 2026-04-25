// Dynamic antagonist face evaluation.
// Pure function, runs post-turn. The active face of opposition is runtime
// state, not authored destiny — it shifts based on player alignment signals.

import type {
  Sf2AntagonistFace,
  Sf2ChapterRuntime,
  Sf2State,
} from '../types'

const RECENT_WINDOW = 6 // turns of recent history to consider
const ALIGNMENT_SCORE_PER_TURN_MATCH = 2
const ALIGNMENT_SCORE_PER_DECISION = 3
const FACE_CHANGE_HYSTERESIS = 2 // new face must beat current face by this margin

export interface FaceShift {
  fromId: string
  toId: string
  reason: string
  scores: Record<string, number>
}

export interface FaceEvaluationResult {
  face: Sf2AntagonistFace
  shift: FaceShift | null
}

/**
 * Evaluate which antagonist face should be primary given recent play signals.
 * Uses substring matching between `becomesPrimaryWhen` conditions and player
 * input / recent decisions. This is intentionally coarse; Stage 5+ tuning can
 * sharpen the scoring function with tagged keywords or embeddings.
 */
export function evaluateCurrentPrimaryFace(
  chapter: Sf2ChapterRuntime,
  state: Sf2State
): FaceEvaluationResult {
  const current = chapter.setup.antagonistField.currentPrimaryFace
  const candidates = chapter.scaffolding.antagonistFaces
  if (candidates.length <= 1) {
    return { face: current, shift: null }
  }

  const scores = new Map<string, number>()
  for (const face of candidates) {
    scores.set(face.id, face.active ? 1 : 0) // small incumbency bonus
  }

  const recent = state.history.turns.slice(-RECENT_WINDOW)

  // Signal 1: player input keyword matches
  for (const turn of recent) {
    const text = turn.playerInput.toLowerCase()
    if (!text) continue
    for (const face of candidates) {
      if (conditionMatches(text, face.becomesPrimaryWhen)) {
        scores.set(
          face.id,
          (scores.get(face.id) ?? 0) + ALIGNMENT_SCORE_PER_TURN_MATCH
        )
      }
    }
  }

  // Signal 2: active decision alignment
  for (const decision of Object.values(state.campaign.decisions)) {
    if (decision.status !== 'active' || !decision.madeByPC) continue
    const text = decision.summary.toLowerCase()
    for (const face of candidates) {
      if (conditionMatches(text, face.becomesPrimaryWhen)) {
        scores.set(
          face.id,
          (scores.get(face.id) ?? 0) + ALIGNMENT_SCORE_PER_DECISION
        )
      }
    }
  }

  // Signal 3: narrator annotation hinted_entities of recent prose can reference
  // entities whose affiliation maps to a faction the face represents. For MVP
  // we skip; it's covered indirectly by player input matches.

  // Pick highest-scoring face, require hysteresis to flip away from current.
  const currentScore = scores.get(current.id) ?? 0
  let topId = current.id
  let topScore = currentScore
  for (const [id, score] of scores) {
    if (id === current.id) continue
    if (score > topScore + FACE_CHANGE_HYSTERESIS) {
      topId = id
      topScore = score
    }
  }

  if (topId === current.id) {
    return { face: current, shift: null }
  }

  const nextFace = candidates.find((f) => f.id === topId)
  if (!nextFace) return { face: current, shift: null }

  return {
    face: {
      id: nextFace.id,
      name: nextFace.name,
      role: nextFace.role,
      pressureStyle: nextFace.pressureStyle,
    },
    shift: {
      fromId: current.id,
      toId: nextFace.id,
      reason: `alignment signals shifted: ${Array.from(scores.entries())
        .map(([id, s]) => `${id}:${s}`)
        .join(', ')}`,
      scores: Object.fromEntries(scores),
    },
  }
}

// Substring match on lowercased condition keywords. The condition is natural
// language (e.g. "player sides with the settlement"). We extract content words
// and check for presence in the text. Good enough for MVP; Stage 5+ can add
// keyword tagging directly in the condition field.
function conditionMatches(text: string, condition: string): boolean {
  const words = condition
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  if (words.length === 0) return false
  // Require at least 2 content words to intersect (reduces false positives).
  let hits = 0
  for (const w of words) {
    if (text.includes(w)) hits += 1
  }
  return hits >= 2
}

const STOPWORDS = new Set([
  'player',
  'the',
  'with',
  'that',
  'this',
  'from',
  'into',
  'over',
  'when',
  'they',
  'them',
  'their',
  'there',
  'these',
  'those',
  'what',
  'which',
  'about',
  'something',
  'anyone',
  'would',
  'could',
  'should',
  'after',
  'before',
  'become',
  'becomes',
])
