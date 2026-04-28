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
} from '@/lib/sf2/retrieval/scene-packet'
import { buildSceneKernel } from '@/lib/sf2/scene-kernel/build'
import { scanDisplayOutput } from '@/lib/sf2/sentinel/display'
import { buildMessagesForNarrator } from '@/lib/sf2/narrator/messages'
import { repairSuggestedActions } from '@/lib/sf2/narrator/suggested-actions'
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
      base +
      'Success. Narrate the outcome. The PC accomplishes the stated intent and their position visibly improves. You may attach small friction, exposure, or a future cost, but do not turn success into a miss, wrong belief, closed door, or pure delay.'
    )
  }
  return (
    base +
    `Failure — the stated goal is not achieved in the way the player intended; the scene advances through consequence. Pick one pattern: backfire, escalation, or hard block with cost, but do not write those labels in prose. Both halves required: intended goal not achieved AND the scene moves forward through new pressure. Failure is redirection with cost, not a dead end. If this is the second failure against the same door/NPC/document/barrier, do not ask the player to keep retrying the same obstacle; change the situation, reveal the next pressure-bearing route, or have the world move. Do NOT write this as partial success or "success with cost" — that is a different outcome tier. FORBIDDEN: narrator-reveal ("you don't notice…"), meta-commentary on the miss, invention of new facts, hidden-camera narration about unseen actors. Commit to the false reality from inside the PC's POV.`
  )
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
  | {
      type: 'working_set'
      summary: { full: string[]; stub: string[]; excluded: number; reasons: Record<string, string[]> }
      workingSet: ReturnType<typeof buildScenePacket>['workingSet']
    }
  | { type: 'pacing_advisory'; tripped: boolean; reactivityRatio: number; reactivityTripped: boolean; sceneLinkTripped: boolean; stagnantThreadIds: string[]; arcDormantIds: string[] }
  | { type: 'scene_bundle_built'; sceneId: string; bundleText: string; builtAtTurn: number }
  | { type: 'token_usage'; usage: { inputTokens: number; outputTokens: number; cacheWriteTokens: number; cacheReadTokens: number } }
  | { type: 'truncation_warning'; outputTokens: number }
  | {
      // Display sentinel — observe mode. Emitted after the Narrator finishes
      // producing prose. Findings are advisory only in this slice; the
      // streaming buffer / cancel / repair path is a separate slice. Client
      // logs these for telemetry; future enforcement will read the same
      // stream of findings.
      type: 'display_sentinel'
      mode: 'observe' | 'enforce'
      findings: Array<{
        type: string
        severity: string
        surface?: string
        entityId?: string
        evidence: string
        matchStart: number
        recommendedAction: string
      }>
    }
  | {
      // Observation-only signal that the Narrator emitted non-narrative output
      // (meta-question, system-reference, or out-of-character clarification
      // request). No retry, no block — telemetry for tuning the eventual
      // recovery path. See scene-bundle-cache-preserves-replay-window fixture
      // for the failure shape this signal was added to surface.
      type: 'narrator_meta_observed'
      pattern: string
      snippet: string
      turnIndex: number
    }
  | {
      // Salvage signal: narrate_turn input was malformed or missing required
      // fields, and the route recovered values from alt-keys, prior turn, or
      // defaults. recoveryNotes lists what was fixed. Cheaper than retry; see
      // playthrough 7 turns 6+8 for the failure shapes (missing
      // suggested_actions; hinted_entities-as-XML-wrapper).
      type: 'narrator_output_recovered'
      recoveryNotes: string[]
      turnIndex: number
    }
  | { type: 'error'; message: string }
  | { type: 'done' }

// Observation-only meta-question detector. Fires when the Narrator's prose
// opens with a GM-meta voice or references system-internal vocabulary. Both
// signals are forbidden by the system prompt for in-fiction prose, so a hit
// here means the Narrator broke character — usually because upstream context
// (cache, scene snapshot, delta) was malformed.
const META_OPENERS = /^\s*(I need|I cannot|I can't|I don't have|I'll need|Could you clarify|Wait,? before|Let me clarify|Before I continue)/i
const SYSTEM_VOCAB = /\b(CONTINUATION mode|ESTABLISHMENT mode|the delta shows|prior prose|scene packet|per-turn delta)\b/
function detectNarratorMetaQuestion(prose: string): { pattern: string; snippet: string } | null {
  if (META_OPENERS.test(prose)) return { pattern: 'meta_opener', snippet: prose.slice(0, 200) }
  if (SYSTEM_VOCAB.test(prose)) {
    const match = prose.match(SYSTEM_VOCAB)
    return { pattern: `system_vocab:${match?.[0] ?? 'unknown'}`, snippet: prose.slice(0, 200) }
  }
  return null
}

// Salvage layer for malformed/incomplete narrate_turn tool input. Two failure
// shapes observed in playthrough 7:
//   - turn 6: hinted_entities arrived as a literal string containing
//     `<parameter name="...">` XML wrapper (Anthropic tool-use parsing leak),
//     and suggested_actions came back undefined entirely
//   - turn 8: suggested_actions simply missing while the rest of the input
//     was well-shaped
// Both produced empty action arrays after route normalization, so the UI
// rendered "no actions." Recovery is much cheaper than retry: try alt-key
// variants first, then carry-forward from the prior turn's annotation.
// Returns the (possibly-spliced) input plus recovery notes for telemetry.
function recoverNarrateTurnInput(
  raw: Record<string, unknown>,
  state: Sf2State,
  failedSkill?: string
): { input: Record<string, unknown>; recoveryNotes: string[] } {
  const recoveryNotes: string[] = []
  const next = { ...raw }

  // Recover suggested_actions if missing/empty/wrong-shape.
  const sa = next.suggested_actions ?? next.suggestedActions
  const isValidArray = Array.isArray(sa) && sa.length > 0 && sa.every((s) => typeof s === 'string' && s.trim().length > 0)

  if (!isValidArray) {
    // 1. Alt-key already covered above (suggestedActions camelCase). If we got
    //    here, neither shape held substantive content.
    // 2. Carry-forward from the prior turn's annotation. The prior turn's
    //    suggestions still describe action affordances against the same scene
    //    (off-stage NPCs may have shifted, but most actions are about the
    //    on-stage cast and the chapter's persistent threads).
    const priorTurn = state.history.turns.at(-1)
    const priorActions = priorTurn?.narratorAnnotation?.suggestedActions
    if (Array.isArray(priorActions) && priorActions.length >= 3) {
      next.suggested_actions = priorActions.slice(0, 4)
      recoveryNotes.push(
        `suggested_actions missing/empty; carried forward ${(next.suggested_actions as string[]).length} actions from prior turn`
      )
    } else {
      // 3. No prior turn (chapter open) or prior had no actions either. Synth
      //    minimal defaults from the scene snapshot. Player can still type
      //    free-text; just no quick-action buttons.
      const presentNpcId = state.world.sceneSnapshot.presentNpcIds[0]
      const npc = presentNpcId ? state.campaign.npcs[presentNpcId] : undefined
      const npcName = npc?.name
      const defaults = npcName
        ? [
            `Address ${npcName} directly.`,
            'Examine the scene before responding.',
            'Wait for the moment to develop.',
          ]
        : [
            'Examine the scene before responding.',
            'Speak first.',
            'Wait for the moment to develop.',
          ]
      next.suggested_actions = defaults
      recoveryNotes.push(
        'suggested_actions missing/empty; no prior turn to carry forward — synthesized minimal defaults'
      )
    }
  } else if (next.suggested_actions === undefined && next.suggestedActions !== undefined) {
    // Pure alt-key recovery: model used camelCase, copy under canonical key.
    next.suggested_actions = next.suggestedActions
    recoveryNotes.push('suggested_actions was under camelCase suggestedActions; normalized to canonical key')
  }

  // Recover hinted_entities when it arrived as a string (XML-wrapper leak).
  // The downstream Archivist normalizes hinted_entities loosely; if it's
  // a string we lose the structured fields entirely. Replace with an empty
  // object — Archivist handles missing hints fine, this is just a containment
  // measure to avoid the malformed string poisoning state.
  if (typeof next.hinted_entities === 'string' || typeof next.hintedEntities === 'string') {
    const orig = String(next.hinted_entities ?? next.hintedEntities ?? '').slice(0, 80)
    next.hinted_entities = {}
    recoveryNotes.push(
      `hinted_entities arrived as string (likely tool-use XML-wrapper leak), replaced with empty object. Original: ${orig}…`
    )
  }

  const repairedActions = repairSuggestedActions(
    Array.isArray(next.suggested_actions) ? (next.suggested_actions as string[]) : [],
    { state, failedSkill }
  )
  if (repairedActions.notes.length > 0) {
    next.suggested_actions = repairedActions.actions
    recoveryNotes.push(...repairedActions.notes)
  }

  return { input: next, recoveryNotes }
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
  let failedRollSkill: string | undefined
  let bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
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
    failedRollSkill =
      rollResolution && (rollResolution.result === 'failure' || rollResolution.result === 'fumble')
        ? rollResolution.skill
        : undefined

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
        emotionalBeatIds: [],
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
          workingSet,
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
          // The Narrator owns two tools — request_roll (mid-turn pause) and
          // narrate_turn (final commit) — and the flow assumes mutual
          // exclusion: one or the other per turn. Without this flag, parallel
          // emission would let the model fire both, and our find()-based
          // dispatch silently drops the narrate_turn (request_roll wins
          // ordering). disable_parallel_tool_use makes the contract explicit.
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
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

        // Display sentinel — observe mode. Scan the assembled prose for
        // debug-vocabulary leaks and absent-NPC speech. Findings flow to the
        // client as a `display_sentinel` event for telemetry; nothing is
        // blocked yet (the streaming buffer / cancel / repair pipeline is a
        // separate slice). Skip when this turn is interrupted by a roll
        // request — the prose is partial and the kernel doesn't reflect the
        // post-roll state.
        if (!rollUse) {
          const proseText = completed.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('')
          if (proseText.trim().length > 0) {
            const metaHit = detectNarratorMetaQuestion(proseText)
            if (metaHit) {
              console.warn('[sf2/narrator] meta_question_observed', {
                pattern: metaHit.pattern,
                turnIndex: state.history.turns.length,
                snippet: metaHit.snippet,
              })
              send({
                type: 'narrator_meta_observed',
                pattern: metaHit.pattern,
                snippet: metaHit.snippet,
                turnIndex: state.history.turns.length,
              })
            }
            try {
              const kernel = buildSceneKernel(state)
              const findings = scanDisplayOutput(proseText, {
                action: 'allow_but_quarantine_writes',
                campaign: state.campaign,
                absentSpeakers: {
                  absentEntityIds: kernel.absentEntityIds,
                  aliasMap: kernel.aliasMap,
                },
              })
              if (findings.length > 0) {
                console.warn('[sf2/narrator] display_sentinel findings', {
                  count: findings.length,
                  types: findings.map((f) => f.type),
                  surfaces: findings.map((f) => f.surface).filter(Boolean),
                  turnIndex: state.history.turns.length,
                })
              }
              send({
                type: 'display_sentinel',
                mode: 'observe',
                findings: findings.map((f) => ({
                  type: f.type,
                  severity: f.severity,
                  surface: f.surface,
                  entityId: f.entityId,
                  evidence: f.evidence,
                  matchStart: f.matchStart,
                  recommendedAction: f.recommendedAction,
                })),
              })
            } catch (err) {
              // Sentinel must never break the response — log and continue.
              console.error('[sf2/narrator] display_sentinel failed', err)
            }
          }
        }

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
          const recovered = recoverNarrateTurnInput(
            narrateUse.input as Record<string, unknown>,
            state,
            failedRollSkill
          )
          if (recovered.recoveryNotes.length > 0) {
            console.warn('[sf2/narrator] narrate_turn input recovered', {
              recoveryNotes: recovered.recoveryNotes,
              turnIndex: state.history.turns.length,
            })
            send({
              type: 'narrator_output_recovered',
              recoveryNotes: recovered.recoveryNotes,
              turnIndex: state.history.turns.length,
            })
          }
          send({ type: 'narrate_turn', input: recovered.input })
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
