export const RETRIEVAL_CUE_MAX_WORDS = 12
export const RETRIEVAL_CUE_MAX_CHARS = 96

export function compactRetrievalCue(value: unknown, fallback?: unknown): string {
  const source = coerceCueSource(value) || coerceCueSource(fallback)
  if (!source) return ''

  let cue = firstPunchyClause(source)
  const words = cue.split(/\s+/).filter(Boolean)
  if (words.length > RETRIEVAL_CUE_MAX_WORDS) {
    cue = words.slice(0, RETRIEVAL_CUE_MAX_WORDS).join(' ')
  }
  if (cue.length > RETRIEVAL_CUE_MAX_CHARS) {
    const clipped = cue
      .slice(0, RETRIEVAL_CUE_MAX_CHARS)
      .replace(/\s+\S*$/, '')
      .trim()
    cue = clipped || cue.slice(0, RETRIEVAL_CUE_MAX_CHARS).trim()
  }
  return cue.replace(/[\s,;:.!?-]+$/, '').trim()
}

export function mergeRetrievalCue(existing: unknown, proposed: unknown, fallback?: unknown): string {
  const existingRaw = coerceCueSource(existing)
  const existingCue = compactRetrievalCue(existingRaw)
  const proposedCue = compactRetrievalCue(proposed, fallback)

  if (!existingCue) return proposedCue
  if (!proposedCue) return existingCue
  if (existingRaw && existingRaw !== existingCue) return proposedCue
  return existingCue
}

export function countRetrievalCueWords(value: unknown): number {
  const cue = coerceCueSource(value)
  if (!cue) return 0
  return cue.split(/\s+/).filter(Boolean).length
}

function firstPunchyClause(source: string): string {
  const sentenceParts = source.split(/[.!?]\s+/)
  const firstSentence = sentenceParts[0]?.trim() || source
  const sentence = sentenceParts.length > 1 && countRetrievalCueWords(firstSentence) <= 1
    ? source
    : firstSentence
  const delimiterPattern = /[,;:]|\s[-\u2013\u2014]\s/g
  let match: RegExpExecArray | null
  while ((match = delimiterPattern.exec(sentence))) {
    const clause = sentence.slice(0, match.index).trim()
    if (countRetrievalCueWords(clause) >= 4) return clause
  }
  return sentence
}

function coerceCueSource(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}
