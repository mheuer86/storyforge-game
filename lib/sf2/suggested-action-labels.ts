export function stripSuggestedActionBracketTags(action: string): string {
  let text = action.trim()
  while (/\s*\[[^\]]+\]\s*$/.test(text)) {
    text = text.replace(/\s*\[[^\]]+\]\s*$/, '').trim()
  }
  return text
}

export function normalizeSuggestedActionLabels(actions: readonly string[] | undefined): string[] {
  if (!Array.isArray(actions)) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const action of actions) {
    const text = stripSuggestedActionBracketTags(action).trim()
    if (!text) continue
    const key = text.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(text)
  }
  return normalized
}
