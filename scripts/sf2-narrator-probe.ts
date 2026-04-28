import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NARRATOR_TOOLS } from '../lib/sf2/narrator/tools'
import {
  SF2_BIBLE_HEGEMONY,
  SF2_CORE,
  SF2_NARRATOR_ROLE,
  buildNarratorSituation,
} from '../lib/sf2/narrator/prompt'
import { composeSystemBlocks } from '../lib/sf2/prompt/compose'
import {
  buildScenePacket,
  renderPerTurnDelta,
  renderSceneBundle,
} from '../lib/sf2/retrieval/scene-packet'
import { SF2_SCHEMA_VERSION, type Sf2State } from '../lib/sf2/types'

interface ReplayLikeFixture {
  schema: 'sf2-replay-fixture/v1'
  name: string
  input: {
    stateBefore?: Sf2State
    stateBeforePreset?: 'minimal'
    stateBeforePatch?: Record<string, unknown>
    playerInput: string
    isInitial?: boolean
  }
  expected?: {
    narratorProbe?: {
      textIncludes?: string[]
      textAbsent?: string[]
      toolSuggestedActionsAbsent?: string[]
    }
  }
}

const NARRATOR_MODEL = process.env.SF2_NARRATOR_MODEL || 'claude-haiku-4-5-20251001'
const HAIKU_PRICING = { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 }

async function main(): Promise<void> {
  loadEnvFromDotenvLocal()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing. Set it in .env.local or env.')
    process.exit(2)
  }
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: npm run sf2:narrator-probe -- <replay-fixture.json>')
    process.exit(2)
  }
  const path = resolve(process.cwd(), target)
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as ReplayLikeFixture
  const state = buildStateBefore(fixture)
  const playerInput = fixture.input.playerInput
  const isInitial = Boolean(fixture.input.isInitial)
  const turnIndex = state.history.turns.length

  const { packet, advisoryText } = buildScenePacket(state, playerInput, turnIndex)
  const system = composeSystemBlocks({
    core: SF2_CORE,
    bible: SF2_BIBLE_HEGEMONY,
    role: SF2_NARRATOR_ROLE,
    situation: buildNarratorSituation(state),
  }).blocks
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: renderSceneBundle(packet, state) },
    {
      role: 'user',
      content: renderPerTurnDelta(packet, {
        advisoryText,
        isInitial,
        playerInput,
        withheldPremiseFacts: isInitial ? state.chapter.artifacts.opening.withheldPremiseFacts : undefined,
      }),
    },
  ]

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: NARRATOR_MODEL,
    max_tokens: 1400,
    system,
    tools: NARRATOR_TOOLS,
    messages,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
  const toolInput = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    ?.input as Record<string, unknown> | undefined
  const suggested = Array.isArray(toolInput?.suggested_actions)
    ? (toolInput.suggested_actions as unknown[]).map(String).join('\n')
    : ''

  const failures: string[] = []
  const expected = fixture.expected?.narratorProbe
  for (const want of expected?.textIncludes ?? []) {
    if (!text.toLowerCase().includes(want.toLowerCase())) failures.push(`text missing "${want}"`)
  }
  for (const absent of expected?.textAbsent ?? []) {
    if (text.toLowerCase().includes(absent.toLowerCase())) failures.push(`text unexpectedly includes "${absent}"`)
  }
  for (const absent of expected?.toolSuggestedActionsAbsent ?? []) {
    if (suggested.toLowerCase().includes(absent.toLowerCase())) {
      failures.push(`suggested_actions unexpectedly include "${absent}"`)
    }
  }

  const usage = response.usage
  const costUsd =
    (usage.input_tokens * HAIKU_PRICING.input +
      usage.output_tokens * HAIKU_PRICING.output +
      (usage.cache_creation_input_tokens ?? 0) * HAIKU_PRICING.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * HAIKU_PRICING.cacheRead) /
    1_000_000

  if (failures.length > 0) {
    console.log(`FAIL ${fixture.name}`)
    for (const failure of failures) console.log(`  - ${failure}`)
    console.log('\nNarrator text:\n' + text)
    process.exit(1)
  }
  console.log(`PASS ${fixture.name} — $${costUsd.toFixed(4)}`)
  console.log(text.slice(0, 700))
}

function buildStateBefore(fixture: ReplayLikeFixture): Sf2State {
  if (fixture.input.stateBefore) return fixture.input.stateBefore
  if (fixture.input.stateBeforePreset === 'minimal') {
    return deepMerge(createMinimalState(), fixture.input.stateBeforePatch ?? {}) as Sf2State
  }
  throw new Error('fixture needs stateBefore or stateBeforePreset')
}

function createMinimalState(): Sf2State {
  const now = '2026-04-25T00:00:00.000Z'
  const location = {
    id: 'scene_intake',
    name: 'Intake Hall',
    description: 'A narrow public intake hall with old counters and tired lights.',
    atmosphericConditions: ['stale air'],
  }
  return {
    meta: {
      campaignId: 'narrator_probe',
      createdAt: now,
      updatedAt: now,
      schemaVersion: SF2_SCHEMA_VERSION,
      genreId: 'hegemony',
      playbookId: 'seeker',
      originId: 'frontier',
      currentChapter: 1,
      currentSceneId: location.id,
      currentTimeLabel: 'morning',
    },
    campaign: {
      arcs: {},
      threads: {
        thread_spine: {
          id: 'thread_spine',
          title: 'The intake problem',
          chapterCreated: 1,
          category: 'thread',
          status: 'active',
          owner: { kind: 'faction', id: 'faction_registry' },
          stakeholders: [],
          tension: 5,
          peakTension: 5,
          resolutionCriteria: 'The immediate intake problem is resolved.',
          failureMode: 'The intake problem escalates.',
          retrievalCue: 'The public-facing pressure in the current chapter.',
          loadBearing: true,
          spineForChapter: 1,
          tensionHistory: [],
        },
      },
      engines: {},
      decisions: {},
      promises: {},
      clues: {},
      beats: {},
      temporalAnchors: {},
      documents: {},
      npcs: {},
      factions: {
        faction_registry: {
          id: 'faction_registry',
          name: 'Registry',
          stance: 'neutral',
          heat: 'none',
          heatReasons: [],
          ownedThreadIds: ['thread_spine'],
          retrievalCue: 'Local administrative pressure.',
        },
      },
      locations: { [location.id]: location },
      floatingClueIds: [],
      pivotalSceneIds: [],
      lexicon: [],
    },
    player: {
      name: 'Replay Seeker',
      species: 'Human',
      origin: { id: 'frontier', name: 'Frontier' },
      class: { id: 'seeker', name: 'Seeker' },
      level: 1,
      hp: { current: 10, max: 10 },
      ac: 12,
      credits: 0,
      stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      proficiencies: [],
      inventory: [],
      traits: [],
      tempModifiers: [],
      inspiration: 0,
      exhaustion: 0,
    },
    chapter: {
      number: 1,
      title: 'Replay Chapter',
      setup: {
        chapter: 1,
        title: 'Replay Chapter',
        frame: {
          title: 'Replay Chapter',
          premise: 'A contained replay fixture.',
          activePressure: 'Administrative pressure.',
          centralTension: 'Whether the scene remains coherent.',
          chapterScope: 'One scene.',
          objective: 'Keep the local truth stable.',
          crucible: 'A continuity-sensitive exchange.',
          outcomeSpectrum: {
            clean: 'Continuity holds.',
            costly: 'Continuity holds with friction.',
            failure: 'Continuity drifts.',
            catastrophic: 'Continuity collapses.',
          },
        },
        antagonistField: {
          sourceSystem: 'fixture',
          corePressure: 'Local confusion',
          defaultFace: { id: 'faction_registry', name: 'Registry', role: 'Institution', pressureStyle: 'Procedural drag' },
          currentPrimaryFace: { id: 'faction_registry', name: 'Registry', role: 'Institution', pressureStyle: 'Procedural drag' },
          escalationLogic: 'Escalate only when the fixture says so.',
        },
        startingNpcIds: [],
        activeThreadIds: ['thread_spine'],
        spineThreadId: 'thread_spine',
        loadBearingThreadIds: ['thread_spine'],
        carriedThreadIds: [],
        editorializedLore: [],
        openingSceneSpec: {
          location: location.name,
          atmosphericCondition: 'stale air',
          initialState: 'The replay begins.',
          firstPlayerFacing: 'The scene waits.',
          immediateChoice: 'Act.',
          noStartingCombat: true,
          noExpositionDump: true,
          visibleNpcIds: [],
        },
        pressureLadder: [],
        threadPressure: {},
        surfaceThreads: [],
        surfaceNpcIds: [],
      },
      scaffolding: { chapter: 1, npcHiddenPressures: {}, antagonistFaces: [], possibleRevelations: [], moralFaultLines: [], escalationOptions: [] },
      artifacts: { opening: { sceneIntent: 'Verify deterministic resolver behavior.', openingPressure: 'Continuity pressure.', chapterObjective: 'Keep the local truth stable.', chapterCrucible: 'A continuity-sensitive exchange.', visibleNpcIds: [], visibleThreadIds: ['thread_spine'], loreForOpening: [], sceneWarnings: [] } },
      sceneSummaries: [],
      currentSceneId: location.id,
    },
    world: {
      currentLocation: location,
      sceneSnapshot: { sceneId: location.id, location, presentNpcIds: [], timeLabel: 'morning', established: ['The replay begins in the intake hall.'], firstTurnIndex: 0 },
      currentTimeLabel: 'morning',
    },
    history: { turns: [], rollLog: [], recentTurns: [] },
    derived: {},
  }
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base
  if (!isRecord(base) || !isRecord(patch)) return patch ?? base
  const next: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    next[key] = key in next ? deepMerge(next[key], value) : value
  }
  return next
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function loadEnvFromDotenvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
