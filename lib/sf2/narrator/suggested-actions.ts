import type { Sf2NarrativeTempoMode, Sf2State } from '../types'

export type QuickActionCategory = 'direct' | 'observe' | 'pivot_scene' | 'leverage_state' | 'wait'

export interface QuickActionRepairContext {
  state: Sf2State
  failedSkill?: string
  playerInput?: string
  visibleProse?: string
  recommendedTempoMode?: Sf2NarrativeTempoMode
  sceneExhausted?: boolean
}

export interface QuickActionRepairResult {
  actions: string[]
  notes: string[]
}

const FALLBACK_ACTIONS: Array<{ action: string; category: QuickActionCategory }> = [
  { action: 'Examine the scene before responding.', category: 'observe' },
  { action: 'Use the strongest fact already on the table.', category: 'leverage_state' },
  { action: 'Change the venue before pressing further.', category: 'pivot_scene' },
  { action: 'Wait, and let the silence work.', category: 'wait' },
]

const SHIPBOARD_FALLBACK_ACTIONS: Array<{ action: string; category: QuickActionCategory }> = [
  { action: "Check the ship's current position and immediate options from the bridge.", category: 'observe' },
  { action: 'Talk to the on-board crew about the next constraint.', category: 'direct' },
  { action: 'Inspect the passenger and cargo situation from where you are.', category: 'observe' },
  { action: 'Use the strongest fact already on the table.', category: 'leverage_state' },
]

const MACRO_FALLBACK_ACTIONS: Array<{ action: string; category: QuickActionCategory }> = [
  { action: 'Spend time following the known lead until the situation changes.', category: 'pivot_scene' },
  { action: 'Let the named pressure arrive and see who moves first.', category: 'wait' },
  { action: 'Compress the routine steps and push to the next live obstacle.', category: 'leverage_state' },
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
      const key = normalizeActionText(a)
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

  if (context.playerInput?.trim()) {
    for (let i = 0; i < actions.length; i++) {
      if (!repeatsPlayerInput(actions[i], context.playerInput)) continue
      const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)))
      if (replacement) {
        actions[i] = replacement.action
        notes.push('replaced quick action that repeated the player input')
      }
    }
  }

  const visibleProse = buildVisibleProse(context.state, context.visibleProse)
  for (let i = 0; i < actions.length; i++) {
    if (!mentionsUnseenNpc(actions[i], context.state, visibleProse)) continue
    const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)))
    if (replacement) {
      actions[i] = replacement.action
      notes.push('replaced quick action naming an NPC not yet introduced in prose')
    }
  }

  while (actions.length < 3) {
    const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)))
    if (!replacement) break
    actions.push(replacement.action)
    notes.push('filled missing quick action with deterministic fallback')
  }

  let strippedSkillTags = 0
  for (let i = 0; i < actions.length; i++) {
    const normalized = stripTrailingBracketTags(actions[i]).trim()
    if (normalized !== actions[i]) {
      actions[i] = normalized
      strippedSkillTags += 1
    }
  }
  if (strippedSkillTags > 0) {
    notes.push(`stripped ${strippedSkillTags} quick action bracket tag${strippedSkillTags === 1 ? '' : 's'}`)
  }

  if (shouldEnsureMacroAction(context) && !actions.some(isMacroAction)) {
    const replacement = firstUnusedFallback(actions, new Set(categoriesFor(actions)), MACRO_FALLBACK_ACTIONS)
    if (replacement && actions.length > 0) {
      actions[actions.length - 1] = replacement.action
      notes.push('replaced one micro quick action with deterministic tempo fallback')
    }
  }

  return { actions: actions.slice(0, 4), notes }
}

function stripTrailingBracketTags(action: string): string {
  let text = action.trim()
  while (/\s*\[[^\]]+\]\s*$/.test(text)) {
    text = text.replace(/\s*\[[^\]]+\]\s*$/, '').trim()
  }
  return text
}

function shouldEnsureMacroAction(context: QuickActionRepairContext): boolean {
  if (context.sceneExhausted) return true
  const mode = context.recommendedTempoMode
  return Boolean(mode && mode !== 'micro_scene')
}

function isMacroAction(action: string): boolean {
  const lower = action.toLowerCase()
  return /\b(spend (?:the )?(?:next|time|hour|day)|wait (?:to|for|until)|let .+ arrive|follow (?:the|that) lead|move the plan forward|compress|skip ahead|travel to|journey to|return to|go to the next|shift venue|regroup|debrief|recover|downtime)\b/.test(lower)
}

function repeatsPlayerInput(action: string, playerInput: string): boolean {
  const actionText = normalizeActionText(action)
  const inputText = normalizeActionText(playerInput)
  if (!actionText || !inputText) return false
  if (actionText === inputText) return true
  if (actionText.length >= 40 && inputText.includes(actionText)) return true
  if (inputText.length >= 40 && actionText.includes(inputText)) return true
  const actionHead = actionText.split(/\s+/).slice(0, 9).join(' ')
  const inputHead = inputText.split(/\s+/).slice(0, 9).join(' ')
  return actionHead.length >= 36 && inputText.includes(actionHead)
    || inputHead.length >= 36 && actionText.includes(inputHead)
}

function normalizeActionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildVisibleProse(state: Sf2State, visibleProse?: string): string {
  return [
    ...state.history.turns.map((turn) => turn.narratorProse),
    visibleProse ?? '',
  ].join('\n').toLowerCase()
}

function mentionsUnseenNpc(action: string, state: Sf2State, visibleProse: string): boolean {
  const lowerAction = action.toLowerCase()
  for (const npc of Object.values(state.campaign.npcs)) {
    const name = npc.name?.trim()
    if (!name || name.length < 3) continue
    if (!lowerAction.includes(name.toLowerCase())) continue
    if (!visibleProse.includes(name.toLowerCase())) return true
  }
  return false
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
  if (state.meta.genreId !== 'space-opera') return false

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
