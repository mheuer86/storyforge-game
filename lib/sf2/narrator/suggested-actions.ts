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

const SHIPBOARD_FALLBACK_ACTIONS: Array<{ action: string; category: QuickActionCategory }> = [
  { action: "Check the ship's current position and immediate options from the bridge.", category: 'observe' },
  { action: 'Talk to the on-board crew about the next constraint.', category: 'direct' },
  { action: 'Inspect the passenger and cargo situation from where you are. [Perception]', category: 'observe' },
  { action: 'Use the strongest fact already on the table.', category: 'leverage_state' },
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

  if (hasDepartureContinuityLock(context.state)) {
    for (let i = 0; i < actions.length; i++) {
      if (!isStaleDepartedLocationAction(actions[i])) continue
      const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)), SHIPBOARD_FALLBACK_ACTIONS)
      if (replacement) {
        actions[i] = replacement.action
        notes.push('replaced stale-location quick action after departure')
      }
    }
  }

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
  currentCategories: Set<QuickActionCategory>,
  fallbackActions: Array<{ action: string; category: QuickActionCategory }> = FALLBACK_ACTIONS
): { action: string; category: QuickActionCategory } | null {
  const currentText = new Set(currentActions.map((a) => a.toLowerCase()))
  return (
    fallbackActions.find(
      (fallback) =>
        !currentCategories.has(fallback.category) &&
        !currentText.has(fallback.action.toLowerCase())
    ) ??
    fallbackActions.find((fallback) => !currentText.has(fallback.action.toLowerCase())) ??
    null
  )
}

function hasDepartureContinuityLock(state: Sf2State): boolean {
  const recentSceneText = [
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...(state.world.sceneSnapshot?.established ?? []),
    ...(state.chapter.sceneSummaries ?? []).slice(-2).map((s) => s.summary),
  ].join(' ').toLowerCase()

  return /\b(departed|undocked|cleared (?:the )?(?:station|departure envelope|clamps)|burned clear|open corridor|deep passage|trajectory|transit)\b/.test(recentSceneText) &&
    !/\b(on the clamps|still on the clamps|docked against|in port)\b/.test(recentSceneText)
}

function isStaleDepartedLocationAction(action: string): boolean {
  const lower = action.toLowerCase()
  return (
    /\b(?:return to|go to|head to|find|reach)\b.*\b(?:concourse|sable reach|station)\b/.test(lower) ||
    /\b(?:compliance sweep|cargo[- ]bay inspection|dock crew|port authority official|departure window|shift-change)\b/.test(lower) ||
    /\b(?:inspectors?|clamps?)\b/.test(lower)
  )
}
