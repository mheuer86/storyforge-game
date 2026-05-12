// Prompt block composer with cache-prefix discipline.
//
// HARD RULE: no per-turn content ever appears above a cache breakpoint.
// Dynamic state lives below cached prefixes, usually in messages; when it must
// stay at system priority, place it after the last system cache marker.
//
// System breakpoints (aligned with Anthropic SDK's cache_control ephemeral marker):
//   BP1: CORE + BIBLE (bytewise-identical shared prefix + genre bible)
//   BP2: ROLE / stable chapter addendum (role-scoped or chapter-scoped)
//   BP3: dynamic content (uncached; enters as messages)

import type Anthropic from '@anthropic-ai/sdk'

export type SystemBlock = Anthropic.TextBlockParam

export interface ComposedSystemBlocks {
  blocks: SystemBlock[]
}

export interface RoleBlockInputs {
  core: string
  bible: string
  role: string
  situation?: string
  // Set false when situation contains live state but must remain a system
  // instruction for priority. It will sit after the role cache marker uncached.
  cacheSituation?: boolean
}

/**
 * Build system blocks for a role with cache_control markers after BIBLE and
 * after the role-specific stable addendum/situation.
 * - First marker on BIBLE: shared prefix across roles for the same genre.
 * - Second marker on the last stable role block: role or chapter prefix.
 *   Callers can pass cacheSituation=false to keep a dynamic situation as an
 *   uncached system block after the role marker.
 *
 * Dynamic per-turn content usually goes in the messages array on the caller
 * side. If a caller passes cacheSituation=false, that situation must be below
 * the cached role marker.
 */
export function composeSystemBlocks(inputs: RoleBlockInputs): ComposedSystemBlocks {
  const blocks: SystemBlock[] = []
  const hasSituation = Boolean(inputs.situation?.trim())
  const cacheSituation = hasSituation && inputs.cacheSituation !== false

  blocks.push({ type: 'text', text: inputs.core })
  blocks.push({
    type: 'text',
    text: inputs.bible,
    cache_control: { type: 'ephemeral' }, // BP1
  })
  blocks.push({
    type: 'text',
    text: inputs.role,
    cache_control: cacheSituation ? undefined : { type: 'ephemeral' }, // BP2
  })
  if (hasSituation) {
    blocks.push({
      type: 'text',
      text: inputs.situation!,
      ...(cacheSituation ? { cache_control: { type: 'ephemeral' as const } } : {}),
    })
  }
  return { blocks }
}

/**
 * Diagnostic: assert no dynamic markers in a block's text. Fails loud in dev.
 * Catches accidental leaks of per-turn content into the BP2/BP3 prefix.
 */
// Patterns for dynamic content that MUST NOT land in cached system blocks.
// These target turn-scoped state (HP, credits, player input, scene snapshot).
// Note: we intentionally do NOT match bare "turn N" — authored pressure-ladder
// trigger conditions legitimately reference turn numbers ("fires after turn 4").
const DYNAMIC_LEAK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^## CURRENT TURN/im, label: 'current turn header' },
  { pattern: /^PLAYER INPUT:/im, label: 'player input block' },
  { pattern: /HP \d+\/\d+/, label: 'player HP readout' },
  { pattern: /^CREDITS: \d+/im, label: 'player credits readout' },
]

export function assertNoDynamicLeak(text: string, label: string): void {
  for (const { pattern, label: reason } of DYNAMIC_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(
        `[sf2/prompt] dynamic content leaked into ${label} — matched "${reason}" (${pattern}). ` +
          `Per-turn state must live in messages, never in cached system blocks.`
      )
    }
  }
}
