import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { NARRATOR_TOOL_NAME, REQUEST_ROLL_TOOL_NAME } from '@/lib/sf2/narrator/tools'
import { repairVisibleLeaks, scanDisplayOutput } from '@/lib/sf2/sentinel/display'
import { repairSuggestedActions } from '@/lib/sf2/narrator/suggested-actions'
import {
  buildSf2RollPromptIntentResume,
  buildNarratorTurnContext,
  type Sf2NarratorRollResolution,
  type Sf2NarratorTurnContext,
} from '@/lib/sf2/narrator/turn-context'
import { normalizeSf2SkillKey } from '@/lib/sf2/rollable-skills'
import { reconcileRollModifierWithSocialAdvisories } from '@/lib/sf2/social-modifiers/evaluate'
import { buildMissingNarrateTurnRepairRequest } from '@/lib/sf2/narrator/commit-repair'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import { normalizeAnthropicErrorMessage } from '@/lib/anthropic-error'
import type { Sf2NarratorStreamEvent } from '@/lib/sf2/narrator/stream-protocol'
import type { Sf2State } from '@/lib/sf2/types'
import { isSf2NarrativeTempoMode } from '@/lib/sf2/narrative-tempo'

const NARRATOR_MODEL = process.env.SF2_NARRATOR_MODEL || 'claude-sonnet-4-6'

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
export const maxDuration = 90

const rollResolutionSchema = z.object({
  toolUseId: z.string(),
  skill: z.string(),
  dc: z.number(),
  effectiveDc: z.number().optional(),
  d20: z.number().min(1).max(20).optional(),
  modifier: z.number(),
  total: z.number(),
  result: z.enum(['critical', 'success', 'failure', 'fumble']),
  resolutionKind: z.enum(['rolled', 'trait_auto_success', 'trait_auto_critical']).optional(),
  diceMode: z.enum(['normal', 'advantage', 'disadvantage']).optional(),
  criticalRange: z.number().min(1).max(20).optional(),
  sourceBreakdown: z.array(z.unknown()).optional(),
  selectedRollAction: z.unknown().optional(),
  spentResources: z.array(z.unknown()).optional(),
  modifierType: z.enum(['advantage', 'disadvantage', 'inspiration', 'challenge']).optional(),
  modifierReason: z.string().optional(),
  priorMessages: z.array(z.unknown()),
  originalInput: z.string().optional(),
  currentIntent: z.string().optional(),
  remainingIntents: z.array(z.string()).optional(),
})

const proseFirstSchema = z.object({
  enabled: z.boolean().default(false),
  systemPrompt: z.string().min(1).max(120000),
  systemPromptLabel: z.string().max(200).optional(),
  transcript: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(60000),
  })).default([]),
  recentInventoryChanges: z.array(z.string().max(500)).optional(),
  recentEquipmentChanges: z.array(z.string().max(500)).optional(),
})

const requestSchema = z.object({
  state: z.record(z.unknown()),
  playerInput: z.string().max(8000),
  isInitial: z.boolean().default(false),
  rollResolution: rollResolutionSchema.optional(),
  proseFirst: proseFirstSchema.optional(),
})

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

function bindRequiredRollGateSkill(
  requestedSkill: string,
  turnContext: Sf2NarratorTurnContext
): { skill: string; requestedSkill?: string; intendedSkills?: string[]; skillOverrideReason?: string } {
  const gate = turnContext.requiredRollGate
  if (!gate || gate.source !== 'skill_tag' || gate.skills.length === 0) {
    return { skill: requestedSkill }
  }

  const requestedKey = normalizeSf2SkillKey(requestedSkill)
  const matchingSkill = gate.skills.find((skill) => normalizeSf2SkillKey(skill) === requestedKey)
  if (matchingSkill) {
    return {
      skill: matchingSkill,
      requestedSkill,
      intendedSkills: gate.skills,
    }
  }

  return {
    skill: gate.skills[0],
    requestedSkill,
    intendedSkills: gate.skills,
    skillOverrideReason: `SF2 skill-tag override: Narrator requested ${requestedSkill || '(blank)'} but player tagged ${gate.skills.join(' or ')}.`,
  }
}

function isHardRollGate(gate: Sf2NarratorTurnContext['requiredRollGate']): boolean {
  return gate?.binding === 'hard'
}

function rollGateDiagnosticFields(gate: NonNullable<Sf2NarratorTurnContext['requiredRollGate']>) {
  return {
    required: isHardRollGate(gate),
    binding: gate.binding,
    source: gate.source,
    kind: gate.kind,
    skills: gate.skills,
    reason: gate.reason,
    sourceId: gate.sourceId,
  }
}

function normalizeTempoModeFromToolInput(input: Record<string, unknown>) {
  const raw = input.tempo_mode ?? input.tempoMode
  return isSf2NarrativeTempoMode(raw) ? raw : undefined
}

function dropUndefinedFields<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function stripCacheControlDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripCacheControlDeep(entry)) as T
  }
  if (!value || typeof value !== 'object') return value

  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'cache_control') continue
    next[key] = stripCacheControlDeep(entry)
  }
  return next as T
}

function isAnthropicInternalServerError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) return error.status === 500
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('internal server error') ||
      message.includes('"code":500') ||
      message.includes('"type":"api_error"')
    )
  }
  return false
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
  failedSkill?: string,
  playerInput?: string,
  visibleProse?: string,
  tempoContext?: Pick<Sf2NarratorTurnContext, 'narrativeTempo'>
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
    {
      state,
      failedSkill,
      playerInput,
      visibleProse,
      recommendedTempoMode: tempoContext?.narrativeTempo?.mode,
      sceneExhausted: tempoContext?.narrativeTempo?.sceneExhausted,
    }
  )
  if (repairedActions.notes.length > 0) {
    next.suggested_actions = repairedActions.actions
    recoveryNotes.push(...repairedActions.notes)
  }

  return { input: next, recoveryNotes }
}

async function repairMissingNarrateTurn(args: {
  client: Anthropic
  turnContext: Sf2NarratorTurnContext
  completedContent: Anthropic.Message['content']
  state: Sf2State
  playerInput?: string
}): Promise<{
  input: Record<string, unknown> | null
  usage: Anthropic.Usage | null
  recoveryNotes: string[]
  apiMs: number
}> {
  const { client, turnContext, completedContent, state, playerInput } = args
  const apiTimer = startTimer()
  const repairRequest = buildMissingNarrateTurnRepairRequest({ turnContext, completedContent })
  const repair = await client.messages.create({
    model: NARRATOR_MODEL,
    max_tokens: repairRequest.maxTokens,
    system: repairRequest.system,
    tools: repairRequest.tools,
    tool_choice: repairRequest.toolChoice,
    messages: repairRequest.messages,
  })

  const toolUse = repair.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === 'tool_use' && b.name === NARRATOR_TOOL_NAME
  )
  if (!toolUse) {
    return {
      input: null,
      usage: repair.usage,
      recoveryNotes: [
        `narrate_turn missing; commit repair failed with stop_reason=${repair.stop_reason}`,
      ],
      apiMs: apiTimer.elapsed(),
    }
  }

  const recovered = recoverNarrateTurnInput(
    toolUse.input as Record<string, unknown>,
    state,
    turnContext.failedRollSkill,
    playerInput,
    completedContent
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(''),
    { narrativeTempo: turnContext.narrativeTempo }
  )

  return {
    input: recovered.input,
    usage: repair.usage,
    recoveryNotes: [
      'narrate_turn missing; repaired via commit-only retry against already-streamed prose',
      ...recovered.recoveryNotes,
    ],
    apiMs: apiTimer.elapsed(),
  }
}

export async function POST(req: NextRequest) {
  const requestTimer = startTimer()
  let state: Sf2State
  let playerInput: string
  let isInitial: boolean
  let turnContext: Sf2NarratorTurnContext

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
    const rollResolution = parsed.data.rollResolution as Sf2NarratorRollResolution | undefined
    const turnIndex = state.history.turns.length
    turnContext = buildNarratorTurnContext({
      state,
      playerInput,
      isInitial,
      turnIndex,
      rollResolution,
      proseFirst: parsed.data.proseFirst?.enabled
        ? (({ enabled: _, ...rest }) => rest)(parsed.data.proseFirst)
        : undefined,
    })
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
      if (turnContext.diagnostics.workingSet) {
        send({
          type: 'working_set',
          summary: turnContext.diagnostics.workingSet.summary,
          workingSet: turnContext.diagnostics.workingSet.workingSet,
        })
      }

      // Emit scene bundle build event so the client can persist the new
      // cache on state.world.sceneBundleCache. Only fires when the bundle
      // was rebuilt this turn (scene open, or cache invalidated).
      if (turnContext.diagnostics.sceneBundleBuilt) {
        send({
          type: 'scene_bundle_built',
          sceneId: turnContext.diagnostics.sceneBundleBuilt.sceneId,
          bundleText: turnContext.diagnostics.sceneBundleBuilt.bundleText,
          builtAtTurn: turnContext.diagnostics.sceneBundleBuilt.builtAtTurn,
        })
      }

      // Emit pacing advisory diagnostic. Skip on roll resumption (no fresh pacing computed).
      if (turnContext.diagnostics.pacingAdvisory) {
        send({
          type: 'pacing_advisory',
          ...turnContext.diagnostics.pacingAdvisory,
        })
      }

      if (turnContext.requiredRollGate) {
        send({
          type: 'roll_gate_diagnostic',
          ...rollGateDiagnosticFields(turnContext.requiredRollGate),
          action: 'none',
          repair: 'not_needed',
        })
      }

      const apiTimer = startTimer()
      let ttftMs: number | undefined
      let gatedTextBuffer = ''
      // Captured at finalMessage() resolve so the latency payload reports
      // pure SDK time, not SDK+post-processing.
      let apiMsForLatency: number | null = null
      let apiAttempts = 0
      let visibleTextSent = false
      const providerRetryNotes: string[] = []
      const streamModelAttempt = async (cacheControl: 'cached' | 'uncached') => {
        apiAttempts += 1
        const modelStream = await client.messages.stream({
          model: NARRATOR_MODEL,
          max_tokens: 4096,
          system: cacheControl === 'cached'
            ? turnContext.system
            : stripCacheControlDeep(turnContext.system),
          tools: cacheControl === 'cached'
            ? turnContext.cachedTools
            : stripCacheControlDeep(turnContext.cachedTools),
          // The Narrator owns two tools — request_roll (mid-turn pause) and
          // narrate_turn (final commit) — and the flow assumes mutual
          // exclusion: one or the other per turn. Without this flag, parallel
          // emission would let the model fire both, and our find()-based
          // dispatch silently drops the narrate_turn (request_roll wins
          // ordering). disable_parallel_tool_use makes the contract explicit.
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
          messages: cacheControl === 'cached'
            ? turnContext.messages
            : stripCacheControlDeep(turnContext.messages),
        })

        for await (const event of modelStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text.replace(/<\/s>/g, '')
            if (text) {
              if (ttftMs === undefined) ttftMs = apiTimer.elapsed()
              if (turnContext.requiredRollGate && isHardRollGate(turnContext.requiredRollGate)) {
                gatedTextBuffer += text
              } else {
                visibleTextSent = true
                send({ type: 'text', content: text })
              }
            }
          }
        }

        return modelStream.finalMessage()
      }

      try {
        let completed: Anthropic.Message
        try {
          completed = await streamModelAttempt('cached')
        } catch (err) {
          if (isAnthropicInternalServerError(err) && !visibleTextSent && apiAttempts === 1) {
            const message = normalizeAnthropicErrorMessage(err instanceof Error ? err.message : 'unknown_error')
            providerRetryNotes.push(
              `Anthropic 500 before visible prose; retried once without prompt-cache markers. First error: ${message}`
            )
            console.warn('[sf2/narrator] retrying Anthropic 500 without cache_control', {
              model: NARRATOR_MODEL,
              message,
              turnIndex: state.history.turns.length,
            })
            gatedTextBuffer = ''
            ttftMs = undefined
            completed = await streamModelAttempt('uncached')
          } else {
            throw err
          }
        }
        apiMsForLatency = apiTimer.elapsed()
        const usage = completed.usage as {
          input_tokens: number
          output_tokens: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens?: number
        }
        send({
          type: 'token_usage',
          usage: {
            model: NARRATOR_MODEL,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          },
        })
        if (providerRetryNotes.length > 0) {
          send({
            type: 'narrator_output_recovered',
            recoveryNotes: providerRetryNotes,
            turnIndex: state.history.turns.length,
          })
        }

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
        const proseText = completed.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('')

        // Display sentinel — observe mode. Scan the assembled prose for
        // debug-vocabulary leaks and absent-NPC speech. Findings flow to the
        // client as a `display_sentinel` event for telemetry; nothing is
        // blocked yet (the streaming buffer / cancel / repair pipeline is a
        // separate slice). Skip when this turn is interrupted by a roll
        // request — the prose is partial and the kernel doesn't reflect the
        // post-roll state.
        if (!rollUse && !isHardRollGate(turnContext.requiredRollGate)) {
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
              const findings = scanDisplayOutput(proseText, turnContext.sentinelContext)
              if (findings.length > 0) {
                console.warn('[sf2/narrator] display_sentinel findings', {
                  count: findings.length,
                  types: findings.map((f) => f.type),
                  surfaces: findings.map((f) => f.surface).filter(Boolean),
                  turnIndex: state.history.turns.length,
                })
              }
              const shouldRepairVisibleLeaks = findings.some(
                (f) => f.type === 'roll_value_leak' || f.type === 'suggested_action_leak'
              )
              const repairedProse = shouldRepairVisibleLeaks
                ? repairVisibleLeaks(proseText, findings)
                : proseText
              const didRepair = repairedProse !== proseText
              send({
                type: 'display_sentinel',
                mode: didRepair ? 'enforce' : 'observe',
                repaired: didRepair,
                ...(didRepair ? { repairedProse } : {}),
                findings: findings.map((f) => ({
                  type: f.type,
                  severity: f.severity,
                  surface: f.surface,
                  entityId: f.entityId,
                  evidence: f.evidence,
                  matchStart: f.matchStart,
                  matchEnd: f.matchEnd,
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
          if (turnContext.requiredRollGate) {
            send({
              type: 'roll_gate_diagnostic',
              ...rollGateDiagnosticFields(turnContext.requiredRollGate),
              action: 'request_roll',
              repair: 'narrator_complied',
            })
            if (gatedTextBuffer) {
              send({ type: 'text', content: gatedTextBuffer })
            }
          }
          // Mid-stream interrupt: emit roll_prompt with everything the client
          // needs to resume. priorMessages holds the full conversation up to
          // and including the assistant's tool_use content.
          const input = rollUse.input as {
            skill: string
            dc: number
            why: string
            consequence_on_fail: string
            modifier_type?: 'advantage' | 'disadvantage' | 'challenge'
            modifier_reason?: string
          }
          const skillBinding = bindRequiredRollGateSkill(input.skill, turnContext)
          const rollModifier = reconcileRollModifierWithSocialAdvisories({
            state,
            playerInput: turnContext.intentQueue.current.text || playerInput,
            skill: skillBinding.skill,
            requestedModifierType: input.modifier_type,
            requestedModifierReason: input.modifier_reason,
          })
          if (rollModifier.diagnostics.length > 0) {
            console.warn('[sf2/narrator] social roll modifier reconciliation', {
              diagnostics: rollModifier.diagnostics,
              turnIndex: state.history.turns.length,
              skill: skillBinding.skill,
            })
          }
          const completedContentForResume = completed.content.map((block) => {
            if (block.type !== 'tool_use' || block.id !== rollUse.id) return block
            return {
              ...block,
              input: dropUndefinedFields({
                ...input,
                skill: skillBinding.skill,
                modifier_type: rollModifier.modifierType,
                modifier_reason: rollModifier.modifierReason,
              }),
            }
          })
          const priorMessages: Anthropic.MessageParam[] = [
            ...turnContext.messages,
            { role: 'assistant' as const, content: completedContentForResume },
          ]
          send({
            type: 'roll_prompt',
            toolUseId: rollUse.id,
            skill: skillBinding.skill,
            requestedSkill: skillBinding.requestedSkill,
            intendedSkills: skillBinding.intendedSkills,
            skillOverrideReason: skillBinding.skillOverrideReason,
            dc: input.dc,
            why: input.why,
            consequenceOnFail: input.consequence_on_fail,
            modifierType: rollModifier.modifierType,
            modifierReason: rollModifier.modifierReason,
            priorMessages,
            ...buildSf2RollPromptIntentResume(turnContext.intentQueue),
          })
        } else if (narrateUse) {
          if (turnContext.requiredRollGate && isHardRollGate(turnContext.requiredRollGate)) {
            console.warn('[sf2/narrator] blocked narrate_turn missing required request_roll', {
              gate: turnContext.requiredRollGate,
              turnIndex: state.history.turns.length,
            })
            send({
              type: 'roll_gate_diagnostic',
              ...rollGateDiagnosticFields(turnContext.requiredRollGate),
              action: 'block_narrate_turn',
              repair: 'hard_gate_missing_request_roll',
            })
            send({
              type: 'error',
              message: 'This action needs a roll before it can resolve. Please retry the action.',
            })
            return
          } else if (turnContext.requiredRollGate) {
            console.warn('[sf2/narrator] allowed narrate_turn after missed expected roll advisory', {
              gate: turnContext.requiredRollGate,
              turnIndex: state.history.turns.length,
            })
            send({
              type: 'roll_gate_diagnostic',
              ...rollGateDiagnosticFields(turnContext.requiredRollGate),
              action: 'none',
              repair: 'missed_expected_roll_allowed',
            })
            if (gatedTextBuffer) {
              visibleTextSent = true
              send({ type: 'text', content: gatedTextBuffer })
              gatedTextBuffer = ''
            }
          }
          const recovered = recoverNarrateTurnInput(
            narrateUse.input as Record<string, unknown>,
            state,
            turnContext.failedRollSkill,
            playerInput,
            proseText,
            { narrativeTempo: turnContext.narrativeTempo }
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
          if (turnContext.narrativeTempo) {
            const chosenTempoMode = normalizeTempoModeFromToolInput(recovered.input)
            send({
              type: 'tempo_diagnostic',
              recommendedTempoMode: turnContext.narrativeTempo.mode,
              chosenTempoMode,
              matched: chosenTempoMode === turnContext.narrativeTempo.mode,
              reason: turnContext.narrativeTempo.reason,
              remedy: turnContext.narrativeTempo.remedy,
              requiredDelta: turnContext.narrativeTempo.requiredDelta,
              forbiddenRepeat: turnContext.narrativeTempo.forbiddenRepeat,
              sceneExhausted: turnContext.narrativeTempo.sceneExhausted,
              broadGoal: turnContext.narrativeTempo.broadGoal,
            })
          }
          send({ type: 'narrate_turn', input: recovered.input })
        } else if (completed.stop_reason !== 'max_tokens' && proseText.trim().length > 0) {
          if (turnContext.requiredRollGate && isHardRollGate(turnContext.requiredRollGate)) {
            console.warn('[sf2/narrator] blocked commit repair missing required request_roll', {
              gate: turnContext.requiredRollGate,
              turnIndex: state.history.turns.length,
            })
            send({
              type: 'roll_gate_diagnostic',
              ...rollGateDiagnosticFields(turnContext.requiredRollGate),
              action: 'block_narrate_turn',
              repair: 'hard_gate_missing_request_roll',
            })
            send({
              type: 'error',
              message: 'This action needs a roll before it can resolve. Please retry the action.',
            })
            return
          } else if (turnContext.requiredRollGate) {
            console.warn('[sf2/narrator] allowed commit repair after missed expected roll advisory', {
              gate: turnContext.requiredRollGate,
              turnIndex: state.history.turns.length,
            })
            send({
              type: 'roll_gate_diagnostic',
              ...rollGateDiagnosticFields(turnContext.requiredRollGate),
              action: 'none',
              repair: 'missed_expected_roll_allowed',
            })
            if (gatedTextBuffer) {
              visibleTextSent = true
              send({ type: 'text', content: gatedTextBuffer })
              gatedTextBuffer = ''
            }
          }
          const repaired = await repairMissingNarrateTurn({
            client,
            turnContext,
            completedContent: completed.content,
            state,
            playerInput,
          })
          apiMsForLatency = (apiMsForLatency ?? 0) + repaired.apiMs

          if (repaired.usage) {
            const repairUsage = repaired.usage as {
              input_tokens: number
              output_tokens: number
              cache_creation_input_tokens?: number
              cache_read_input_tokens?: number
            }
            send({
              type: 'token_usage',
              usage: {
                model: NARRATOR_MODEL,
                inputTokens: repairUsage.input_tokens,
                outputTokens: repairUsage.output_tokens,
                cacheWriteTokens: repairUsage.cache_creation_input_tokens ?? 0,
                cacheReadTokens: repairUsage.cache_read_input_tokens ?? 0,
              },
            })
          }

          console.warn('[sf2/narrator] narrate_turn missing; attempted commit repair', {
            repaired: Boolean(repaired.input),
            recoveryNotes: repaired.recoveryNotes,
            turnIndex: state.history.turns.length,
          })
          send({
            type: 'narrator_output_recovered',
            recoveryNotes: repaired.recoveryNotes,
            turnIndex: state.history.turns.length,
          })
          if (repaired.input) {
            if (turnContext.narrativeTempo) {
              const chosenTempoMode = normalizeTempoModeFromToolInput(repaired.input)
              send({
                type: 'tempo_diagnostic',
                recommendedTempoMode: turnContext.narrativeTempo.mode,
                chosenTempoMode,
                matched: chosenTempoMode === turnContext.narrativeTempo.mode,
                reason: turnContext.narrativeTempo.reason,
                remedy: turnContext.narrativeTempo.remedy,
                requiredDelta: turnContext.narrativeTempo.requiredDelta,
                forbiddenRepeat: turnContext.narrativeTempo.forbiddenRepeat,
                sceneExhausted: turnContext.narrativeTempo.sceneExhausted,
                broadGoal: turnContext.narrativeTempo.broadGoal,
              })
            }
            send({ type: 'narrate_turn', input: repaired.input })
          } else {
            send({ type: 'error', message: 'narrate_turn missing and commit repair failed' })
          }
        }
      } catch (err) {
        const message = normalizeAnthropicErrorMessage(err instanceof Error ? err.message : 'unknown_error')
        const status = err instanceof Anthropic.APIError ? err.status : undefined
        console.error('[sf2/narrator] anthropic call failed', {
          model: NARRATOR_MODEL,
          message,
          status,
        })
        send({ type: 'error', message })
      } finally {
        // Emit latency before `done` so the client can correlate the timing
        // event with the rest of the turn payload. apiMsForLatency falls back
        // to total elapsed when the API call threw before finalMessage().
        const totalMs = requestTimer.elapsed()
        const apiMs = apiMsForLatency ?? apiTimer.elapsed()
        send({
          type: 'latency',
          role: 'narrator',
          latency: { totalMs, apiMs, ttftMs, attempts: apiAttempts || undefined },
        })
        send({ type: 'done' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
