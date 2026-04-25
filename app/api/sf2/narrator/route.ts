import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { NARRATOR_TOOLS, NARRATOR_TOOL_NAME, REQUEST_ROLL_TOOL_NAME } from '@/lib/sf2/narrator/tools'
import {
  SF2_CORE,
  SF2_BIBLE_HEGEMONY,
  SF2_NARRATOR_ROLE,
  buildNarratorSituation,
} from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { computePacingAdvisory } from '@/lib/sf2/pacing/signals'
import {
  buildScenePacket,
  renderPerTurnDelta,
  renderSceneBundle,
} from '@/lib/sf2/retrieval/scene-packet'
import type { Sf2State } from '@/lib/sf2/types'

const NARRATOR_MODEL = process.env.SF2_NARRATOR_MODEL || 'claude-haiku-4-5-20251001'

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

function rollResultMessage(resolution: {
  skill: string
  dc: number
  d20: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
}): string {
  const { skill, dc, d20, modifier, total, result } = resolution
  const base = `Roll result — ${skill} vs DC ${dc}: rolled d20=${d20} + ${modifier} = ${total}. `
  if (result === 'critical') {
    return (
      base +
      'Natural 20. Critical success. Narrate an exceptional outcome that pays off beyond the baseline.'
    )
  }
  if (result === 'fumble') {
    return (
      base +
      'Natural 1. Critical failure. The attempt fails AND a specific thing breaks AND the consequence cascades into a second bad outcome. Compress backfire + escalation + block in one beat. Do NOT render as partial success.'
    )
  }
  if (result === 'success') {
    return (
      base + 'Success. Narrate the outcome. The PC accomplishes what they attempted, cleanly or with small friction as the scene suggests.'
    )
  }
  return (
    base +
    `Failure — the stated goal is not achieved in the way the player intended; the scene advances through consequence. Pick one pattern: (1) THE BACKFIRE — the attempt produced the opposite of its aim (tried to calm, provoked; tried to read, revealed self); (2) THE ESCALATION — the world saw the attempt and levels up (wary → hostile, passive → active, heat rises); (3) THE HARD BLOCK + COST — the path closes AND a specific thing gets worse. Both halves required: intended goal not achieved AND the scene moves forward through new pressure. Failure is redirection with cost, not a dead end. Do NOT write this as partial success or "success with cost" — that is a different outcome tier. FORBIDDEN: narrator-reveal ("you don't notice…"), meta-commentary on the miss, invention of new facts. Commit to the false reality from inside the PC's POV.`
  )
}

function buildRoleAliasBlock(state: Sf2State, playerInput: string): string {
  const input = playerInput.toLowerCase()
  if (!input.trim()) return ''

  const roleTerms = [
    'elder',
    'retainer',
    'assessor',
    'compliance',
    'factor',
    'contact',
    'warden',
    'parent',
    'sibling',
    'survivor',
    'clerk',
    'aide',
  ]
  const requested = roleTerms.filter((term) => input.includes(term))
  if (requested.length === 0) return ''

  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  const candidates = Object.values(state.campaign.npcs)
    .filter((npc) => !present.has(npc.id))
    .filter((npc) => npc.status === 'alive' || npc.status === 'unknown')
    .filter((npc) => {
      const haystack = `${npc.name} ${npc.role} ${npc.affiliation} ${npc.retrievalCue}`.toLowerCase()
      return requested.some((term) => haystack.includes(term))
    })
    .slice(0, 6)

  if (candidates.length === 0) return ''
  return `\n\n---\n\n### Private role lookup (never mention)\nThe player input names a role that matches authored/off-stage NPCs. If the scene needs that role, use the existing id/name below instead of inventing a parallel character.\n${candidates.map((n) => `- ${n.id}: ${n.name} — ${n.affiliation} · ${n.role} — ${n.retrievalCue}`).join('\n')}`
}

export const runtime = 'nodejs'
export const maxDuration = 90

const rollResolutionSchema = z.object({
  toolUseId: z.string(),
  skill: z.string(),
  dc: z.number(),
  d20: z.number().min(1).max(20),
  modifier: z.number(),
  total: z.number(),
  result: z.enum(['critical', 'success', 'failure', 'fumble']),
  priorMessages: z.array(z.unknown()),
})

const requestSchema = z.object({
  state: z.record(z.unknown()),
  playerInput: z.string().max(8000),
  isInitial: z.boolean().default(false),
  rollResolution: rollResolutionSchema.optional(),
})

type Sf2NarratorStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'narrate_turn'; input: Record<string, unknown> }
  | {
      type: 'roll_prompt'
      toolUseId: string
      skill: string
      dc: number
      why: string
      consequenceOnFail: string
      priorMessages: unknown[]
    }
  | { type: 'working_set'; summary: { full: string[]; stub: string[]; excluded: number; reasons: Record<string, string[]> } }
  | { type: 'pacing_advisory'; tripped: boolean; reactivityRatio: number; reactivityTripped: boolean; sceneLinkTripped: boolean; stagnantThreadIds: string[]; arcDormantIds: string[] }
  | { type: 'scene_bundle_built'; sceneId: string; bundleText: string; builtAtTurn: number; firstTurnIndex: number }
  | { type: 'token_usage'; usage: { inputTokens: number; outputTokens: number; cacheWriteTokens: number; cacheReadTokens: number } }
  | { type: 'truncation_warning'; outputTokens: number }
  | { type: 'error'; message: string }
  | { type: 'done' }

// Build messages array as a scene-bounded conversation.
//
// Layout:
//   [0] user    scene bundle (pre-fetch) · cache_control=ephemeral  ← BP3
//   [1..N]     alternating {user: playerInput, assistant: prose}
//               for each turn in this scene's history. The last assistant
//               message carries cache_control=ephemeral                ← BP4
//   [N+1] user  current-turn delta (mutable state + recovery notes +
//               player input + write directive)
//
// Scene bundle is built once per scene (detected by sceneBundleCache.sceneId
// matching currentSceneId) and re-used across the scene's turns. When it
// rebuilds, we surface it via a scene_bundle_built SSE event so the client
// can persist it.
function buildMessagesForNarrator(
  state: Sf2State,
  playerInput: string,
  isInitial: boolean,
  turnIndex: number
): {
  messages: Anthropic.MessageParam[]
  workingSet: ReturnType<typeof buildScenePacket>['workingSet']
  advisoryText: string
  bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
    firstTurnIndex: number
  } | null
} {
  const { packet, workingSet, advisoryText } = buildScenePacket(state, playerInput, turnIndex)

  const currentSceneId = state.world.sceneSnapshot.sceneId
  const cached = state.world.sceneBundleCache
  const cacheValid = cached && cached.sceneId === currentSceneId

  let bundleText: string
  let firstTurnIndex: number
  let bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
    firstTurnIndex: number
  } | null = null

  if (cacheValid) {
    bundleText = cached.bundleText
    firstTurnIndex = cached.firstTurnIndex
  } else {
    bundleText = renderSceneBundle(packet, state)
    firstTurnIndex = state.history.turns.length
    bundleRebuilt = {
      sceneId: currentSceneId,
      bundleText,
      builtAtTurn: turnIndex,
      firstTurnIndex,
    }
  }

  // Replay in-scene turn pairs from history. turnIndex is monotonic across
  // chapters (P1#2 fix), so filter by >= firstTurnIndex.
  const sceneTurns = state.history.turns.filter((t) => t.index >= firstTurnIndex)
  const turnPairs: Anthropic.MessageParam[] = []
  for (const t of sceneTurns) {
    if (t.playerInput) {
      turnPairs.push({ role: 'user' as const, content: t.playerInput })
    }
    if (t.narratorProse) {
      turnPairs.push({ role: 'assistant' as const, content: t.narratorProse })
    }
  }

  // Recovery notes from prior turn's Archivist — single-use.
  const recoveryNotes = state.campaign.pendingRecoveryNotes ?? []
  const recoveryBlock = recoveryNotes.length
    ? `\n\n---\n\n### Private re-establishment notes (never mention)\nThese notes are system-private continuity context. Do NOT quote, paraphrase, acknowledge, or narrate them. Do not say you are correcting or re-establishing anything. If a note names a fact that still matters, weave that fact concretely into this turn's prose so it grounds on the graph — but do so silently, as if writing the scene fresh.\n${recoveryNotes.map((n) => `- ${n}`).join('\n')}`
    : ''

  // Coherence notes from prior turn's Archivist — single-use.
  // Each entry is pre-formatted as: [severity] type (state_reference): suggested note
  const coherenceNotes = state.campaign.pendingCoherenceNotes ?? []
  const coherenceBlock = coherenceNotes.length
    ? `\n\n---\n\n### Private continuity notes (never mention)\nThese notes are system-private continuity context. Do NOT quote, paraphrase, acknowledge, or narrate them. Do not say you are correcting anything. Continue the scene naturally from the last visible prose, using the notes only to avoid repeating the mismatch.\n${coherenceNotes.map((n) => `- ${n}`).join('\n')}`
    : ''
  const roleAliasBlock = buildRoleAliasBlock(state, playerInput)

  const openingSeed = state.chapter.artifacts.opening
  const perTurnDeltaText = renderPerTurnDelta(packet, {
    advisoryText,
    isInitial,
    playerInput,
    withheldPremiseFacts: isInitial ? openingSeed?.withheldPremiseFacts : undefined,
  }) + roleAliasBlock + recoveryBlock + coherenceBlock

  // Cache marker strategy:
  //   Anthropic allows at most 4 cache_control markers per request. We already
  //   spend 3 on BP1 (last tool) + BP2 (system CORE/BIBLE/ROLE) + BP3
  //   (system SITUATION). That leaves exactly ONE message-level marker.
  //
  //   If the scene has prior assistant turns, place it on the last assistant
  //   message — that single marker's cache prefix already covers the bundle
  //   AND all prior-in-scene turn pairs. It advances each turn and amortizes.
  //
  //   If the scene has no assistant turns yet (first turn of the scene), place
  //   it on the bundle — at least the bundle's tokens get cached before the
  //   delta body is added.
  const hasPriorAssistant = turnPairs.some((m) => m.role === 'assistant')

  const bundleMessage: Anthropic.MessageParam = hasPriorAssistant
    ? { role: 'user', content: bundleText }
    : {
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text: bundleText,
            cache_control: { type: 'ephemeral' as const },
          },
        ],
      }

  const messages: Anthropic.MessageParam[] = [
    bundleMessage,
    ...turnPairs,
    { role: 'user', content: perTurnDeltaText },
  ]

  // When there are prior assistant turns, mark the latest one — its cached
  // prefix covers everything before it, including the bundle.
  if (hasPriorAssistant) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const m = messages[i]
        if (typeof m.content === 'string') {
          messages[i] = {
            role: 'assistant',
            content: [
              {
                type: 'text' as const,
                text: m.content,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          }
        }
        break
      }
    }
  }

  return { messages, workingSet, advisoryText, bundleRebuilt }
}

export async function POST(req: NextRequest) {
  let state: Sf2State
  let playerInput: string
  let isInitial: boolean
  let system: Anthropic.TextBlockParam[]
  let messages: Anthropic.MessageParam[]
  let cachedTools: Anthropic.Tool[]
  let workingSet: ReturnType<typeof buildScenePacket>['workingSet']
  let pacingForEvent: ReturnType<typeof computePacingAdvisory> | null = null
  let bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
    firstTurnIndex: number
  } | null = null

  try {
    const body = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'invalid_request', detail: parsed.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    state = parsed.data.state as unknown as Sf2State
    playerInput = parsed.data.playerInput
    isInitial = parsed.data.isInitial
    const rollResolution = parsed.data.rollResolution

    // Compose cached system blocks (BP2 + BP3). Assert no dynamic leaks.
    const situation = buildNarratorSituation(state)
    assertNoDynamicLeak(SF2_CORE, 'CORE')
    assertNoDynamicLeak(SF2_BIBLE_HEGEMONY, 'BIBLE')
    assertNoDynamicLeak(SF2_NARRATOR_ROLE, 'ROLE')
    assertNoDynamicLeak(situation, 'SITUATION')

    const composed = composeSystemBlocks({
      core: SF2_CORE,
      bible: SF2_BIBLE_HEGEMONY,
      role: SF2_NARRATOR_ROLE,
      situation,
    })
    system = composed.blocks

    const turnIndex = state.history.turns.length
    if (rollResolution) {
      messages = [
        ...(rollResolution.priorMessages as Anthropic.MessageParam[]),
        {
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: rollResolution.toolUseId,
              content: rollResultMessage(rollResolution),
            },
          ],
        },
      ]
      workingSet = {
        fullEntityIds: [],
        stubEntityIds: [],
        excludedEntityIds: [],
        reasonsByEntityId: {},
        computedAtTurn: turnIndex,
      }
      pacingForEvent = null
    } else {
      const built = buildMessagesForNarrator(state, playerInput, isInitial, turnIndex)
      messages = built.messages
      workingSet = built.workingSet
      bundleRebuilt = built.bundleRebuilt
      pacingForEvent = computePacingAdvisory(state)
    }

    cachedTools = NARRATOR_TOOLS.map((t, i) =>
      i === NARRATOR_TOOLS.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' as const } }
        : t
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[sf2/narrator] setup failed', { message, stack })
    return new Response(
      JSON.stringify({ error: 'narrator_setup_failed', message, stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const client = resolveClient(req)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: Sf2NarratorStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(evt) + '\n'))
      }

      // Emit working-set diagnostic up front for the debug panel.
      // Skip on roll resumption — working set was computed pre-pause and isn't
      // recomputed; emitting empty arrays is noise.
      if (workingSet.fullEntityIds.length > 0 || workingSet.stubEntityIds.length > 0) {
        send({
          type: 'working_set',
          summary: {
            full: workingSet.fullEntityIds,
            stub: workingSet.stubEntityIds,
            excluded: workingSet.excludedEntityIds.length,
            reasons: workingSet.reasonsByEntityId,
          },
        })
      }

      // Emit scene bundle build event so the client can persist the new
      // cache on state.world.sceneBundleCache. Only fires when the bundle
      // was rebuilt this turn (scene open, or cache invalidated).
      if (bundleRebuilt) {
        send({
          type: 'scene_bundle_built',
          sceneId: bundleRebuilt.sceneId,
          bundleText: bundleRebuilt.bundleText,
          builtAtTurn: bundleRebuilt.builtAtTurn,
          firstTurnIndex: bundleRebuilt.firstTurnIndex,
        })
      }

      // Emit pacing advisory diagnostic. Skip on roll resumption (no fresh pacing computed).
      if (pacingForEvent) {
        const tripped =
          pacingForEvent.reactivityTripped ||
          pacingForEvent.sceneLinkTripped ||
          pacingForEvent.stagnantThreadIds.length > 0 ||
          pacingForEvent.arcDormantIds.length > 0
        send({
          type: 'pacing_advisory',
          tripped,
          reactivityRatio: pacingForEvent.reactivityRatio,
          reactivityTripped: pacingForEvent.reactivityTripped,
          sceneLinkTripped: pacingForEvent.sceneLinkTripped,
          stagnantThreadIds: pacingForEvent.stagnantThreadIds,
          arcDormantIds: pacingForEvent.arcDormantIds,
        })
      }

      try {
        const modelStream = await client.messages.stream({
          model: NARRATOR_MODEL,
          max_tokens: 4096,
          system,
          tools: cachedTools,
          messages,
        })

        for await (const event of modelStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text.replace(/<\/s>/g, '')
            if (text) send({ type: 'text', content: text })
          }
        }

        const completed = await modelStream.finalMessage()
        const usage = completed.usage as {
          input_tokens: number
          output_tokens: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
        }
        send({
          type: 'token_usage',
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          },
        })

        if (completed.stop_reason === 'max_tokens') {
          send({ type: 'truncation_warning', outputTokens: usage.output_tokens })
        }

        const rollUse = completed.content.find(
          (b): b is Anthropic.ToolUseBlock =>
            b.type === 'tool_use' && b.name === REQUEST_ROLL_TOOL_NAME
        )
        const narrateUse = completed.content.find(
          (b): b is Anthropic.ToolUseBlock =>
            b.type === 'tool_use' && b.name === NARRATOR_TOOL_NAME
        )

        if (rollUse) {
          // Mid-stream interrupt: emit roll_prompt with everything the client
          // needs to resume. priorMessages holds the full conversation up to
          // and including the assistant's tool_use content.
          const input = rollUse.input as {
            skill: string
            dc: number
            why: string
            consequence_on_fail: string
          }
          const priorMessages: Anthropic.MessageParam[] = [
            ...messages,
            { role: 'assistant' as const, content: completed.content },
          ]
          send({
            type: 'roll_prompt',
            toolUseId: rollUse.id,
            skill: input.skill,
            dc: input.dc,
            why: input.why,
            consequenceOnFail: input.consequence_on_fail,
            priorMessages,
          })
        } else if (narrateUse) {
          send({ type: 'narrate_turn', input: narrateUse.input as Record<string, unknown> })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown_error'
        const status = err instanceof Anthropic.APIError ? err.status : undefined
        console.error('[sf2/narrator] anthropic call failed', {
          model: NARRATOR_MODEL,
          message,
          status,
        })
        send({ type: 'error', message })
      } finally {
        send({ type: 'done' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
