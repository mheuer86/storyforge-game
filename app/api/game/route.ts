import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buildSystemPrompt, buildClosePrompt, buildAuditPrompt, buildMessagesForClaude, buildInitialMessage } from '@/lib/system-prompt'
import { gameTools, auditTools } from '@/lib/tools'
import { isAuthenticated } from '@/lib/auth'
import type { GameState, StreamEvent, RollRecord, ToolCallResult } from '@/lib/types'

const client = new Anthropic()
const MODEL = process.env.STORYFORGE_MODEL || 'claude-sonnet-4-6'

export const runtime = 'nodejs'
export const maxDuration = 90

const requestSchema = z.object({
  message: z.string().max(8000),
  gameState: z.object({
    meta: z.object({ version: z.string(), chapterNumber: z.number() }).passthrough(),
    character: z.object({ name: z.string(), hp: z.object({ current: z.number(), max: z.number() }) }).passthrough(),
    world: z.object({ currentLocation: z.object({ name: z.string() }).passthrough() }).passthrough(),
    combat: z.object({ active: z.boolean() }).passthrough(),
    history: z.object({ messages: z.array(z.any()) }).passthrough(),
  }),
  isMetaQuestion: z.boolean(),
  isInitial: z.boolean(),
  isConsistencyCheck: z.boolean().optional(),
  isChapterClose: z.boolean().optional(),
  isAudit: z.boolean().optional(),
  flaggedMessage: z.string().optional(),
  rollResolution: z.object({
    roll: z.number().min(1).max(100),
    check: z.string(),
    stat: z.string(),
    dc: z.number(),
    modifier: z.number(),
    reason: z.string(),
    toolUseId: z.string(),
    pendingMessages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.union([z.string(), z.array(z.any())]),
    })),
    advantage: z.enum(['advantage', 'disadvantage']).optional(),
    rawRolls: z.tuple([z.number().min(1).max(20), z.number().min(1).max(20)]).optional(),
    contested: z.object({ npcName: z.string(), npcSkill: z.string(), npcModifier: z.number() }).optional(),
    npcRoll: z.number().min(1).max(20).optional(),
    npcTotal: z.number().optional(),
    priorToolResults: z.array(z.any()).optional(),
    sides: z.number().optional(),
    rollType: z.enum(['check', 'damage', 'healing']).optional(),
    damageType: z.string().optional(),
  }).optional(),
})

function resolveRoll(roll: number, modifier: number, dc: number, rollType?: string): RollRecord['result'] {
  // Damage and healing rolls have no DC/crit/fumble — always "success"
  if (rollType === 'damage' || rollType === 'healing') return 'success'
  if (roll === 20) return 'critical'
  if (roll === 1) return 'fumble'
  if (roll + modifier >= dc) return 'success'
  return 'failure'
}

function rollResultText(roll: number, modifier: number, dc: number, result: RollRecord['result'], advantage?: 'advantage' | 'disadvantage', rawRolls?: [number, number], contested?: { npcName: string; npcSkill: string; npcModifier: number }, npcRoll?: number, npcTotal?: number, rollType?: string, damageType?: string): string {
  const total = roll + modifier
  // Damage and healing rolls — just report the total
  if (rollType === 'damage') {
    return `Damage roll: ${roll} + ${modifier} = ${total}${damageType ? ` ${damageType}` : ''} damage.`
  }
  if (rollType === 'healing') {
    return `Healing roll: ${roll} + ${modifier} = ${total} HP healed.`
  }
  const advNote = advantage && rawRolls ? ` (${advantage}: rolled ${rawRolls[0]} and ${rawRolls[1]}, kept ${roll})` : ''
  const contestedNote = contested && npcRoll !== undefined && npcTotal !== undefined
    ? ` Contested vs ${contested.npcName}'s ${contested.npcSkill}: NPC rolled ${npcRoll} + ${contested.npcModifier} = ${npcTotal}.`
    : ''
  const vsText = contested && npcTotal !== undefined ? `vs ${contested.npcName}'s ${npcTotal}` : `vs DC ${dc}`
  if (result === 'critical') return `Natural 20! Critical success${advNote}.${contestedNote} Total: ${total} ${vsText}. Exceptional outcome.`
  if (result === 'fumble') return `Natural 1! Fumble${advNote}.${contestedNote} Total: ${total} ${vsText}. Failure with complication.`
  if (result === 'success') return `Success${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}.`
  return `Failure${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}. Apply the "fail with a cost" rule.`
}

const RETRY_DELAY_MS = 12_000
const MAX_TOOL_ROUNDS = 8

function isOverloaded(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return error.status === 529 || error.status === 503 || error.status === 502
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('overload') || msg.includes('529') || msg.includes('503')
  }
  return false
}

type SendFn = (event: StreamEvent) => void

interface ToolLoopResult {
  toolResults: ToolCallResult[]
  messages: Anthropic.MessageParam[]
  hitRoll: boolean
}

/**
 * Run the Claude streaming + tool loop. Shared by Phase 1, Phase 2, and retry.
 *
 * When `interceptRolls` is true, a `request_roll` tool call pauses the loop,
 * sends a roll_prompt to the client, and closes the stream (hitRoll = true).
 * When false (Phase 2, after a roll), request_roll is treated like any other tool.
 */
async function runToolLoop(
  systemPrompt: Anthropic.TextBlockParam[],
  initialMessages: Anthropic.MessageParam[],
  send: SendFn,
  interceptRolls: boolean,
  options?: { model?: string; tools?: Anthropic.Tool[] },
): Promise<ToolLoopResult> {
  const toolResults: ToolCallResult[] = []
  let messages = initialMessages

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await client.messages.stream({
      model: options?.model || MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: options?.tools || gameTools,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send({ type: 'text', content: event.delta.text })
      }
    }

    const completed = await stream.finalMessage()
    const toolCalls = completed.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

    if (completed.stop_reason !== 'tool_use' || toolCalls.length === 0) break

    const roundResults: Anthropic.ToolResultBlockParam[] = []

    for (const tc of toolCalls) {
      if (interceptRolls && tc.name === 'request_roll') {
        const input = tc.input as { checkType: string; stat: string; dc: number; modifier: number; reason: string; advantage?: 'advantage' | 'disadvantage'; contested?: { npcName: string; npcSkill: string; npcModifier: number }; sides?: number; rollType?: 'check' | 'damage' | 'healing'; damageType?: string }

        // Flush accumulated tools before pausing for the roll
        if (toolResults.length > 0) {
          send({ type: 'tools', results: toolResults })
        }

        // Build pending messages — include assistant content but NOT partial tool_results yet.
        // The prior tool_results (roundResults) will be merged with the roll result in the continuation.
        const pendingMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: 'assistant' as const, content: completed.content },
        ]
        // Stash prior tool_results so the continuation can merge them with the roll result
        const priorToolResults = [...roundResults]

        send({
          type: 'roll_prompt',
          check: input.checkType,
          stat: input.stat,
          dc: input.dc,
          modifier: input.modifier,
          reason: input.reason,
          toolUseId: tc.id,
          pendingMessages,
          priorToolResults,
          ...(input.advantage && { advantage: input.advantage }),
          ...(input.contested && { contested: input.contested }),
          ...(input.sides && { sides: input.sides }),
          ...(input.rollType && { rollType: input.rollType }),
          ...(input.damageType && { damageType: input.damageType }),
        })

        return { toolResults, messages, hitRoll: true }
      }

      toolResults.push({ tool: tc.name, input: tc.input as Record<string, unknown> })
      roundResults.push({ type: 'tool_result', tool_use_id: tc.id, content: 'OK' })
    }

    messages = [
      ...messages,
      { role: 'assistant' as const, content: completed.content },
      { role: 'user' as const, content: roundResults },
    ]
  }

  return { toolResults, messages, hitRoll: false }
}

function buildSystemBlocks(gameState: GameState, isMetaQuestion: boolean, isConsistencyCheck?: boolean, flaggedMessage?: string): Anthropic.TextBlockParam[] {
  const [staticInstructions, dynamicState] = buildSystemPrompt(gameState, isMetaQuestion || !!isConsistencyCheck, isConsistencyCheck ? flaggedMessage : undefined)
  return [
    { type: 'text', text: staticInstructions, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicState },
  ]
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, isMetaQuestion, isInitial, rollResolution, isConsistencyCheck, isChapterClose, isAudit, flaggedMessage } = parsed.data
  const gameState = parsed.data.gameState as unknown as GameState

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      function finish(toolResults: ToolCallResult[]) {
        if (toolResults.length > 0) send({ type: 'tools', results: toolResults })
        send({ type: 'done' })
        controller.close()
      }

      try {
        const systemPrompt = buildSystemBlocks(gameState, isMetaQuestion, isConsistencyCheck, flaggedMessage)

        if (rollResolution) {
          // ── Phase 2: continue from pending conversation after client roll ──
          const { roll, dc, modifier, reason, check, stat, pendingMessages, toolUseId, advantage, rawRolls, contested, npcRoll, npcTotal, priorToolResults: priorResults, sides, rollType, damageType } = rollResolution
          // For contested rolls, compare player total vs NPC total instead of static DC
          const effectiveDC = npcTotal !== undefined ? npcTotal : dc
          const result = resolveRoll(roll, modifier, effectiveDC, rollType)

          const rollRecord: RollRecord = {
            id: crypto.randomUUID(),
            check, stat, dc, roll, modifier, total: roll + modifier, result, reason,
            timestamp: new Date().toISOString(),
            ...(advantage && { advantage }),
            ...(rawRolls && { rawRolls }),
            ...(contested && { contested }),
            ...(npcRoll !== undefined && { npcRoll, npcTotal }),
            ...(sides && { sides }),
            ...(rollType && { rollType }),
            ...(damageType && { damageType }),
          }

          // Merge any prior tool_results (from tools called before the roll in the same batch) with the roll result
          const isSuccessfulHit = (result === 'success' || result === 'critical') && gameState.combat.active && rollType !== 'damage' && rollType !== 'healing'

          // Auto-chain: after a successful hit, send a damage roll prompt directly to the client
          // without involving Claude. This bypasses the model entirely for damage rolls.
          if (isSuccessfulHit) {
            // Find the weapon in inventory by matching check name
            const weapon = gameState.character.inventory.find(
              (item) => item.damage && item.name.toLowerCase() === check.toLowerCase()
            )
            if (weapon?.damage) {
              // Parse damage string: "1d6", "1d8 energy", "1d6+DEX", "1d10+STR"
              const dmgMatch = weapon.damage.match(/1d(\d+)(?:\+(\w+))?(?:\s+(.+))?/)
              if (dmgMatch) {
                const damageSides = parseInt(dmgMatch[1])
                const statKey = dmgMatch[2] as keyof typeof gameState.character.stats | undefined
                const dmgType = dmgMatch[3] || ''
                const damageMod = statKey && gameState.character.stats[statKey]
                  ? Math.floor((gameState.character.stats[statKey] - 10) / 2)
                  : 0

                // Record the hit roll
                const hitRollResults: ToolCallResult[] = [{ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> }]
                send({ type: 'tools', results: hitRollResults })

                // Send damage roll prompt directly to client — no Claude involved
                send({
                  type: 'roll_prompt',
                  check: weapon.name,
                  stat: statKey || stat,
                  dc: 0,
                  modifier: damageMod,
                  reason: `Damage for ${weapon.name}`,
                  toolUseId: `dmg-auto-${crypto.randomUUID().slice(0, 8)}`,
                  pendingMessages: [
                    ...(pendingMessages as Anthropic.MessageParam[]),
                    { role: 'user', content: [
                      ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
                      { type: 'tool_result' as const, tool_use_id: toolUseId, content: rollResultText(roll, modifier, effectiveDC, result, advantage, rawRolls, contested, npcRoll, npcTotal, rollType, damageType) },
                    ]},
                  ],
                  sides: damageSides,
                  rollType: 'damage',
                  damageType: dmgType,
                })

                send({ type: 'done' })
                controller.close()
                return
              }
            }
          }

          const allToolResults: Anthropic.ToolResultBlockParam[] = [
            ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
            { type: 'tool_result', tool_use_id: toolUseId, content: rollResultText(roll, modifier, effectiveDC, result, advantage, rawRolls, contested, npcRoll, npcTotal, rollType, damageType) },
          ]

          const continuationMessages: Anthropic.MessageParam[] = [
            ...(pendingMessages as Anthropic.MessageParam[]),
            { role: 'user', content: allToolResults },
          ]

          // interceptRolls=true so damage/healing rolls after a hit are interactive too
          const loopResult = await runToolLoop(systemPrompt, continuationMessages, send, true)
          loopResult.toolResults.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })
          finish(loopResult.toolResults)
          return
        }

        // ── Audit: lightweight state hygiene check (Haiku) ──
        if (isAudit) {
          const AUDIT_MODEL = 'claude-haiku-4-5-20251001'
          const [auditInstructions, auditState] = buildAuditPrompt(gameState)
          const auditSystem: Anthropic.TextBlockParam[] = [
            { type: 'text', text: auditInstructions },
            { type: 'text', text: auditState },
          ]
          const auditMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: 'Audit the current game state now.' },
          ]
          const loopResult = await runToolLoop(auditSystem, auditMessages, send, false, { model: AUDIT_MODEL, tools: auditTools })
          finish(loopResult.toolResults)
          return
        }

        // ── Chapter close: dedicated close prompt ──
        if (isChapterClose) {
          const [closeInstructions, closeState] = buildClosePrompt(gameState)
          const closeSystem: Anthropic.TextBlockParam[] = [
            { type: 'text', text: closeInstructions, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: closeState },
          ]
          const closeMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: 'Execute the chapter close sequence now.' },
          ]
          const loopResult = await runToolLoop(closeSystem, closeMessages, send, false)
          finish(loopResult.toolResults)
          return
        }

        // ── Phase 1: normal turn ──
        let actualMessage = message
        if (isInitial) {
          const initialResult = buildInitialMessage(gameState)
          if (typeof initialResult === 'string') {
            actualMessage = initialResult
          } else {
            actualMessage = initialResult.message
            // Send the hook-derived chapter title so the client can update game state
            send({ type: 'chapter_title', title: initialResult.chapterTitle } as unknown as StreamEvent)
          }
        }
        const conversationMessages = buildMessagesForClaude(gameState, actualMessage, isMetaQuestion)

        const loopResult = await runToolLoop(systemPrompt, conversationMessages, send, true)

        if (loopResult.hitRoll) {
          send({ type: 'done' })
          controller.close()
          return
        }

        finish(loopResult.toolResults)
      } catch (error) {
        if (isOverloaded(error)) {
          send({ type: 'retrying', delayMs: RETRY_DELAY_MS, reason: 'Claude is taking a break' })
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          try {
            const retrySystem = buildSystemBlocks(gameState, isMetaQuestion, isConsistencyCheck, flaggedMessage)
            const retryMessages = rollResolution
              ? [
                  ...(rollResolution.pendingMessages as Anthropic.MessageParam[]),
                  { role: 'user' as const, content: [{ type: 'tool_result' as const, tool_use_id: rollResolution.toolUseId, content: rollResultText(rollResolution.roll, rollResolution.modifier, rollResolution.npcTotal ?? rollResolution.dc, resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.npcTotal ?? rollResolution.dc), rollResolution.advantage, rollResolution.rawRolls, rollResolution.contested, rollResolution.npcRoll, rollResolution.npcTotal) }] },
                ]
              : (() => {
                  const retryMsg = isInitial ? buildInitialMessage(gameState) : message
                  return buildMessagesForClaude(gameState, typeof retryMsg === 'string' ? retryMsg : retryMsg.message, isMetaQuestion)
                })()

            const loopResult = await runToolLoop(retrySystem, retryMessages, send, true)

            if (loopResult.hitRoll) {
              send({ type: 'done' })
              controller.close()
              return
            }

            if (rollResolution) {
              const result = resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.dc)
              loopResult.toolResults.push({ tool: '_roll_record', input: { id: crypto.randomUUID(), check: rollResolution.check, stat: rollResolution.stat ?? '', dc: rollResolution.dc, roll: rollResolution.roll, modifier: rollResolution.modifier, total: rollResolution.roll + rollResolution.modifier, result, reason: rollResolution.reason, timestamp: new Date().toISOString(), ...(rollResolution.advantage && { advantage: rollResolution.advantage }), ...(rollResolution.rawRolls && { rawRolls: rollResolution.rawRolls }) } as unknown as Record<string, unknown> })
            }

            finish(loopResult.toolResults)
          } catch (retryError) {
            send({ type: 'error', message: retryError instanceof Error ? retryError.message : 'Unknown error' })
            controller.close()
          }
        } else {
          send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
          controller.close()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
