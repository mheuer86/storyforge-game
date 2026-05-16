import type Anthropic from '@anthropic-ai/sdk'
import {
  SF2_CORE,
  buildNarratorRole,
  buildNarratorSituation,
  getSf2BibleForGenre,
} from './prompt'
import { NARRATOR_TOOLS } from './tools'
import { composeSystemBlocks, assertNoDynamicLeak } from '../prompt/compose'
import type { Sf2State } from '../types'

export function buildNarratorSystemBlocks(state: Sf2State): Anthropic.TextBlockParam[] {
  const situation = buildNarratorSituation(state)
  const bible = getSf2BibleForGenre(state.meta.genreId)
  const role = buildNarratorRole(state.meta.genreId)
  assertNoDynamicLeak(SF2_CORE, 'CORE')
  assertNoDynamicLeak(bible, 'BIBLE')
  assertNoDynamicLeak(role, 'ROLE')
  assertNoDynamicLeak(situation, 'SITUATION')

  return composeSystemBlocks({
    core: SF2_CORE,
    bible,
    role,
    situation,
  }).blocks
}

export function buildCachedNarratorTools(): Anthropic.Tool[] {
  return NARRATOR_TOOLS.map((tool, index) =>
    index === NARRATOR_TOOLS.length - 1
      ? { ...tool, cache_control: { type: 'ephemeral' as const } }
      : tool
  )
}
