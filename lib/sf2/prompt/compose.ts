// Prompt block composer with cache-breakpoint discipline.
//
// HARD RULE: no per-turn content ever appears above BP3. Dynamic state lives
// in messages, never in system blocks. This is the fix for v1's 55% cache-write
// share.
//
// Four breakpoints (aligned with Anthropic SDK's cache_control ephemeral marker):
//   BP1: tools schema
//   BP2: CORE + BIBLE + ROLE (session-scoped)
//   BP3: SITUATION (chapter-scoped; cached per chapter)
//   BP4: scene packet / dynamic content (uncached; enters as messages)

import type Anthropic from '@anthropic-ai/sdk'

export type SystemBlock = Anthropic.TextBlockParam

export interface ComposedSystemBlocks {
  blocks: SystemBlock[]
}

export interface RoleBlockInputs {
  core: string
  bible: string
  role: string
  situation: string
}

/**
 * Build system blocks for a role with cache_control markers at BP2 and BP3.
 * - BP2 ephemeral marker on the last of (core + bible + role) blocks: this is
 *   the session-scoped prefix — stays warm across turns within a session.
 * - BP3 ephemeral marker on the situation block: chapter-scoped prefix — stays
 *   warm across turns within a chapter.
 *
 * Dynamic per-turn content goes in the messages array on the caller side, NOT
 * here.
 */
export function composeSystemBlocks(inputs: RoleBlockInputs): ComposedSystemBlocks {
  const blocks: SystemBlock[] = []
  blocks.push({ type: 'text', text: inputs.core })
  blocks.push({ type: 'text', text: inputs.bible })
  blocks.push({
    type: 'text',
    text: inputs.role,
    cache_control: { type: 'ephemeral' }, // BP2
  })
  blocks.push({
    type: 'text',
    text: inputs.situation,
    cache_control: { type: 'ephemeral' }, // BP3
  })
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
