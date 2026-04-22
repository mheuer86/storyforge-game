// Group C: reference integrity. Writes whose anchored_to or relevant_npcs
// point to entities that don't exist in state. signal_close gating lives
// here too — closing a chapter with no frame or too few turns is a
// reference-integrity violation in spirit (the closing event has no anchor).

import type { FirewallRule } from '../../firewall'
import type { FirewallResult, GameState } from '../../types'

const nonEmptyArray = (v: unknown): v is unknown[] =>
  Array.isArray(v) && v.length > 0

// Collect all IDs we consider valid anchor targets: threads + arcs.
function collectAnchorIds(state: GameState): Set<string> {
  const ids = new Set<string>()
  for (const t of state.world?.threads ?? []) if (t.id) ids.add(t.id)
  for (const a of state.arcs ?? []) if (a.id) ids.add(a.id)
  return ids
}

function npcNameSet(state: GameState): Set<string> {
  return new Set((state.world?.npcs ?? []).map(n => n.name.trim().toLowerCase()))
}

const anchorsApply = new Set(['thread_create', 'decision_create', 'promise_create', 'clue_create'])

const anchorReferenceMissing: FirewallRule = {
  id: 'anchor_reference_missing',
  appliesTo: (w) => anchorsApply.has(w.type),
  check: (w, state): FirewallResult | null => {
    const input = w.input as Record<string, unknown>
    if (!nonEmptyArray(input.anchored_to)) return null
    const valid = collectAnchorIds(state)
    const bad = (input.anchored_to as unknown[]).filter(
      id => typeof id !== 'string' || !valid.has(id),
    )
    if (bad.length === 0) return null
    return {
      ruleId: 'anchor_reference_missing',
      severity: 'block',
      rejectedField: 'anchored_to',
      suggestion: `Referenced entity does not exist in state (missing: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ', ...' : ''}) — create it first or correct the reference`,
      payloadExcerpt: input,
    }
  },
}

const threadNpcReferenceMissing: FirewallRule = {
  id: 'thread_npc_reference_missing',
  appliesTo: (w) => w.type === 'thread_create',
  check: (w, state): FirewallResult | null => {
    const t = w.input as Record<string, unknown>
    if (!nonEmptyArray(t.relevant_npcs)) return null
    const known = npcNameSet(state)
    const bad = (t.relevant_npcs as unknown[]).filter(
      n => typeof n !== 'string' || !known.has(n.trim().toLowerCase()),
    )
    if (bad.length === 0) return null
    return {
      ruleId: 'thread_npc_reference_missing',
      severity: 'block',
      rejectedField: 'relevant_npcs',
      suggestion: `relevant_npcs references unknown character(s): ${bad.slice(0, 3).join(', ')} — add them to NPC state first`,
      payloadExcerpt: t,
    }
  },
}

// Turn count within the current chapter: approximated by counting player
// messages since the current chapter's startMessageIndex, if present. Falls
// back to total player messages.
function turnsInCurrentChapter(state: GameState): number {
  const history = state.history
  if (!history) return 0
  const currentChapterNumber = state.meta.chapterNumber
  const currentChapter = history.chapters?.find(c => c.number === currentChapterNumber)
  const startIdx = (currentChapter as { startMessageIndex?: number } | undefined)?.startMessageIndex ?? 0
  return history.messages.slice(startIdx).filter(m => m.role === 'player').length
}

const signalClosePremature: FirewallRule = {
  id: 'signal_close_premature',
  appliesTo: (w) => w.type === 'signal_close',
  check: (w, state): FirewallResult | null => {
    const reasons: string[] = []
    if (!state.chapterFrame) reasons.push('no chapter_frame set')
    const turns = turnsInCurrentChapter(state)
    const MIN = 3
    if (turns < MIN) reasons.push(`chapter has only ${turns} player turns (min ${MIN})`)
    if (reasons.length === 0) return null
    return {
      ruleId: 'signal_close_premature',
      severity: 'block',
      rejectedField: null,
      suggestion: `signal_close rejected — ${reasons.join('; ')}. Establish a chapter_frame and allow the chapter to develop before signaling close`,
      payloadExcerpt: w.input,
    }
  },
}

export const GROUP_C_RULES: FirewallRule[] = [
  anchorReferenceMissing,
  threadNpcReferenceMissing,
  signalClosePremature,
]
