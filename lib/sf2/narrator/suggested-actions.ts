import type { Sf2State } from '../types'

export type QuickActionCategory = 'direct' | 'observe' | 'pivot_scene' | 'leverage_state' | 'wait'

export interface QuickActionRepairContext {
  state: Sf2State
  failedSkill?: string
}

export interface QuickActionRepairResult {
  actions: string[]
  notes: string[]
}

const FALLBACK_ACTIONS: Array<{ action: string; category: QuickActionCategory }> = [
  { action: 'Examine the scene before responding. [Perception]', category: 'observe' },
  { action: 'Use the strongest fact already on the table.', category: 'leverage_state' },
  { action: 'Change the venue before pressing further.', category: 'pivot_scene' },
  { action: 'Wait, and let the silence work.', category: 'wait' },
]

const SKILL_KEYWORDS: Record<string, readonly string[]> = {
  intimidation: ['intimidate', 'threaten', 'scare', 'pressure harder', 'force them', 'lean on'],
  persuasion: ['persuade', 'appeal', 'convince', 'reassure', 'soften'],
  deception: ['lie', 'deceive', 'bluff', 'misdirect', 'pretend'],
  insight: ['read ', 'read the', 'sense ', 'judge ', 'tell whether', 'watch their face'],
  investigation: ['search', 'inspect', 'investigate', 'comb through', 'look for'],
  perception: ['scan', 'listen', 'look around', 'watch ', 'notice', 'survey'],
  athletics: ['force', 'break', 'shove', 'lift', 'climb', 'sprint'],
  stealth: ['sneak', 'slip ', 'hide', 'move quietly'],
  'sleight of hand': ['palm', 'pocket', 'slip the', 'lift the', 'swap'],
  history: ['cite', 'recall', 'precedent', 'clause', 'archive'],
}

export function repairSuggestedActions(
  rawActions: string[],
  context: QuickActionRepairContext
): QuickActionRepairResult {
  const notes: string[] = []
  const seen = new Set<string>()
  const actions = rawActions
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
    .filter((a) => {
      const key = a.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 4)

  if (context.failedSkill) {
    const failedSkill = context.failedSkill
    let failedLaneCount = 0
    for (let i = 0; i < actions.length; i++) {
      if (!matchesFailedApproach(actions[i], failedSkill)) continue
      failedLaneCount += 1
      if (failedLaneCount <= 1) continue
      const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)))
      if (replacement) {
        actions[i] = replacement.action
        notes.push(`replaced repeated ${failedSkill} quick action after failed roll`)
      }
    }
  }

  while (actions.length < 3) {
    const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)))
    if (!replacement) break
    actions.push(replacement.action)
    notes.push('filled missing quick action with deterministic fallback')
  }

  if (actions.length >= 3 && new Set(categoriesFor(actions)).size < 3) {
    for (let i = actions.length - 1; i >= 0 && new Set(categoriesFor(actions)).size < 3; i--) {
      const categories = new Set(categoriesFor(actions))
      const replacement = firstUnusedFallback(actions, categories)
      if (!replacement) break
      actions[i] = replacement.action
      notes.push('diversified clustered quick actions')
    }
  }

  return { actions: actions.slice(0, 4), notes }
}

export function classifyQuickAction(action: string): QuickActionCategory {
  const lower = action.toLowerCase()
  if (/\b(wait|pause|let the silence|hold position|do nothing)\b/.test(lower)) return 'wait'
  if (/\b(leave|move|go to|change the venue|step outside|cross to|return to|find another|bring in)\b/.test(lower)) {
    return 'pivot_scene'
  }
  if (/\b(writ|record|document|clause|precedent|authority|credential|leverage|evidence|fact|proof|log)\b/.test(lower)) {
    return 'leverage_state'
  }
  if (/\b(read|watch|listen|scan|inspect|examine|look|study|observe|survey|check)\b/.test(lower)) return 'observe'
  return 'direct'
}

function categoriesFor(actions: string[]): QuickActionCategory[] {
  return actions.map(classifyQuickAction)
}

function matchesFailedApproach(action: string, failedSkill: string): boolean {
  const lower = action.toLowerCase()
  const skill = failedSkill.toLowerCase()
  if (lower.includes(`[${skill}`)) return true
  const keywords = SKILL_KEYWORDS[skill] ?? []
  return keywords.some((keyword) => lower.includes(keyword))
}

function firstUnusedFallback(
  currentActions: string[],
  currentCategories: Set<QuickActionCategory>
): { action: string; category: QuickActionCategory } | null {
  const currentText = new Set(currentActions.map((a) => a.toLowerCase()))
  return (
    FALLBACK_ACTIONS.find(
      (fallback) =>
        !currentCategories.has(fallback.category) &&
        !currentText.has(fallback.action.toLowerCase())
    ) ?? null
  )
}
