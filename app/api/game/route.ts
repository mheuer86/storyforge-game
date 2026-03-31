import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buildSystemPrompt, buildMessagesForClaude, buildInitialMessage } from '@/lib/system-prompt'
import { gameTools } from '@/lib/tools'
import type { GameState, StreamEvent, RollRecord, ToolCallResult } from '@/lib/types'

const client = new Anthropic()
const MODEL = process.env.STORYFORGE_MODEL || 'claude-sonnet-4-6'

export const runtime = 'nodejs'
export const maxDuration = 90

const requestSchema = z.object({
  message: z.string().max(2000),
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
  flaggedMessage: z.string().optional(),
  // Phase 2: client-side roll result
  rollResolution: z.object({
    roll: z.number().min(1).max(20),
    check: z.string(),
    stat: z.string(),
    dc: z.number(),
    modifier: z.number(),
    reason: z.string(),
    toolUseId: z.string(),
    pendingMessages: z.array(z.any()),
    advantage: z.enum(['advantage', 'disadvantage']).optional(),
    rawRolls: z.tuple([z.number().min(1).max(20), z.number().min(1).max(20)]).optional(),
  }).optional(),
})

function resolveRoll(roll: number, modifier: number, dc: number): RollRecord['result'] {
  if (roll === 20) return 'critical'
  if (roll === 1) return 'fumble'
  if (roll + modifier >= dc) return 'success'
  return 'failure'
}

function rollResultText(roll: number, modifier: number, dc: number, result: RollRecord['result'], advantage?: 'advantage' | 'disadvantage', rawRolls?: [number, number]): string {
  const total = roll + modifier
  const advNote = advantage && rawRolls ? ` (${advantage}: rolled ${rawRolls[0]} and ${rawRolls[1]}, kept ${roll})` : ''
  if (result === 'critical') return `Natural 20! Critical success${advNote}. Total: ${total} vs DC ${dc}. Exceptional outcome.`
  if (result === 'fumble') return `Natural 1! Fumble${advNote}. Total: ${total} vs DC ${dc}. Failure with complication.`
  if (result === 'success') return `Success${advNote}. Roll: ${roll} + ${modifier} modifier = ${total} vs DC ${dc}.`
  return `Failure${advNote}. Roll: ${roll} + ${modifier} modifier = ${total} vs DC ${dc}. Apply the "fail with a cost" rule.`
}

const RETRY_DELAY_MS = 12_000

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

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, isMetaQuestion, isInitial, rollResolution, isConsistencyCheck, flaggedMessage } = parsed.data
  const gameState = parsed.data.gameState as unknown as GameState

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        const [staticInstructions, dynamicState] = buildSystemPrompt(gameState, isMetaQuestion || !!isConsistencyCheck, isConsistencyCheck ? flaggedMessage : undefined)
        // Two-block system: static instructions are marked cacheable (10% token cost on cache hit);
        // dynamic game state is never cached since it changes every turn.
        const systemPrompt: Anthropic.TextBlockParam[] = [
          { type: 'text', text: staticInstructions, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: dynamicState },
        ]

        // ── Phase 2: client sent a roll result, continue from pending conversation ──
        if (rollResolution) {
          const { roll, dc, modifier, reason, check, stat, pendingMessages, toolUseId, advantage, rawRolls } = rollResolution
          const result = resolveRoll(roll, modifier, dc)
          const total = roll + modifier

          const rollRecord: RollRecord = {
            id: Date.now().toString(),
            check, stat, dc, roll, modifier, total, result, reason,
            timestamp: new Date().toISOString(),
            ...(advantage && { advantage }),
            ...(rawRolls && { rawRolls }),
          }

          const continuationMessages: Anthropic.MessageParam[] = [
            ...(pendingMessages as Anthropic.MessageParam[]),
            {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: toolUseId, content: rollResultText(roll, modifier, dc, result, advantage, rawRolls) }],
            },
          ]

          const clientTools: ToolCallResult[] = []
          let phase2Messages = continuationMessages
          const MAX_ROUNDS = 5

          for (let r = 0; r < MAX_ROUNDS; r++) {
            const s = await client.messages.stream({
              model: MODEL,
              max_tokens: 2048,
              system: systemPrompt,
              tools: gameTools,
              messages: phase2Messages,
            })

            for await (const event of s) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                send({ type: 'text', content: event.delta.text })
              }
            }

            const msg = await s.finalMessage()
            const toolCalls = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

            if (msg.stop_reason !== 'tool_use' || toolCalls.length === 0) break

            const toolResults: Anthropic.ToolResultBlockParam[] = toolCalls.map((tc) => {
              clientTools.push({ tool: tc.name, input: tc.input as Record<string, unknown> })
              return { type: 'tool_result', tool_use_id: tc.id, content: 'OK' }
            })

            phase2Messages = [
              ...phase2Messages,
              { role: 'assistant' as const, content: msg.content },
              { role: 'user' as const, content: toolResults },
            ]
          }

          clientTools.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })
          send({ type: 'tools', results: clientTools })
          send({ type: 'done' })
          controller.close()
          return
        }

        // ── Phase 1: normal turn ──
        const actualMessage = isInitial ? buildInitialMessage(gameState as GameState) : message
        let conversationMessages: Anthropic.MessageParam[] = buildMessagesForClaude(gameState, actualMessage, isMetaQuestion)

        const clientToolResults: ToolCallResult[] = []
        const MAX_TOOL_ROUNDS = 5

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const currentStream = await client.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            tools: gameTools,
            messages: conversationMessages,
          })

          for await (const event of currentStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              send({ type: 'text', content: event.delta.text })
            }
          }

          const completedMessage = await currentStream.finalMessage()
          const roundToolCalls = completedMessage.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

          if (completedMessage.stop_reason !== 'tool_use' || roundToolCalls.length === 0) break

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          let hitRollRequest = false

          for (const tool of roundToolCalls) {
            if (tool.name === 'request_roll') {
              const input = tool.input as { checkType: string; stat: string; dc: number; modifier: number; reason: string; advantage?: 'advantage' | 'disadvantage' }

              // Flush any tools accumulated so far before pausing
              if (clientToolResults.length > 0) {
                send({ type: 'tools', results: clientToolResults })
              }

              // Send roll prompt and let the client roll
              send({
                type: 'roll_prompt',
                check: input.checkType,
                stat: input.stat,
                dc: input.dc,
                modifier: input.modifier,
                reason: input.reason,
                toolUseId: tool.id,
                pendingMessages: [
                  ...conversationMessages,
                  { role: 'assistant' as const, content: completedMessage.content },
                ],
                ...(input.advantage && { advantage: input.advantage }),
              })

              send({ type: 'done' })
              controller.close()
              hitRollRequest = true
              return
            }

            clientToolResults.push({ tool: tool.name, input: tool.input as Record<string, unknown> })
            toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: 'OK' })
          }

          if (hitRollRequest) return

          conversationMessages = [
            ...conversationMessages,
            { role: 'assistant' as const, content: completedMessage.content },
            { role: 'user' as const, content: toolResults },
          ]
        }

        if (clientToolResults.length > 0) {
          send({ type: 'tools', results: clientToolResults })
        }

        send({ type: 'done' })
        controller.close()
      } catch (error) {
        if (isOverloaded(error)) {
          send({ type: 'retrying', delayMs: RETRY_DELAY_MS, reason: 'Claude is taking a break' })
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          try {
            // Rebuild and retry once
            const [staticRetry, dynamicRetry] = buildSystemPrompt(gameState, isMetaQuestion || !!isConsistencyCheck, isConsistencyCheck ? flaggedMessage : undefined)
            const retrySystem: Anthropic.TextBlockParam[] = [
              { type: 'text', text: staticRetry, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: dynamicRetry },
            ]
            const retryMessages = rollResolution
              ? [
                  ...(rollResolution.pendingMessages as Anthropic.MessageParam[]),
                  { role: 'user' as const, content: [{ type: 'tool_result' as const, tool_use_id: rollResolution.toolUseId, content: rollResultText(rollResolution.roll, rollResolution.modifier, rollResolution.dc, resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.dc), rollResolution.advantage, rollResolution.rawRolls) }] },
                ]
              : buildMessagesForClaude(gameState, isInitial ? buildInitialMessage(gameState) : message, isMetaQuestion)

            const retryToolResults: ToolCallResult[] = []
            let retryConv = retryMessages as Anthropic.MessageParam[]

            for (let r = 0; r < 5; r++) {
              const s = await client.messages.stream({
                model: MODEL,
                max_tokens: 2048,
                system: retrySystem,
                tools: gameTools,
                messages: retryConv,
              })

              for await (const event of s) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  send({ type: 'text', content: event.delta.text })
                }
              }

              const msg = await s.finalMessage()
              const toolCalls = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

              if (msg.stop_reason !== 'tool_use' || toolCalls.length === 0) break

              let hitRoll = false
              const toolResults: Anthropic.ToolResultBlockParam[] = []
              for (const tc of toolCalls) {
                if (tc.name === 'request_roll') {
                  const input = tc.input as { checkType: string; stat: string; dc: number; modifier: number; reason: string; advantage?: 'advantage' | 'disadvantage' }
                  if (retryToolResults.length > 0) send({ type: 'tools', results: retryToolResults })
                  send({ type: 'roll_prompt', check: input.checkType, stat: input.stat, dc: input.dc, modifier: input.modifier, reason: input.reason, toolUseId: tc.id, pendingMessages: [...retryConv, { role: 'assistant' as const, content: msg.content }], ...(input.advantage && { advantage: input.advantage }) })
                  send({ type: 'done' })
                  controller.close()
                  hitRoll = true
                  return
                }
                retryToolResults.push({ tool: tc.name, input: tc.input as Record<string, unknown> })
                toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: 'OK' })
              }
              if (hitRoll) return

              retryConv = [...retryConv, { role: 'assistant' as const, content: msg.content }, { role: 'user' as const, content: toolResults }]
            }

            if (rollResolution) {
              const result = resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.dc)
              retryToolResults.push({ tool: '_roll_record', input: { id: Date.now().toString(), check: rollResolution.check, stat: rollResolution.stat ?? '', dc: rollResolution.dc, roll: rollResolution.roll, modifier: rollResolution.modifier, total: rollResolution.roll + rollResolution.modifier, result, reason: rollResolution.reason, timestamp: new Date().toISOString(), ...(rollResolution.advantage && { advantage: rollResolution.advantage }), ...(rollResolution.rawRolls && { rawRolls: rollResolution.rawRolls }) } as unknown as Record<string, unknown> })
            }

            if (retryToolResults.length > 0) send({ type: 'tools', results: retryToolResults })
            send({ type: 'done' })
            controller.close()
          } catch (retryError) {
            const retryMsg = retryError instanceof Error ? retryError.message : 'Unknown error'
            send({ type: 'error', message: retryMsg })
            controller.close()
          }
        } else {
          const message = error instanceof Error ? error.message : 'Unknown error'
          send({ type: 'error', message })
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
