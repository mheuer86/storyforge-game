import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buildSystemPrompt, buildMessagesForClaude, buildInitialMessage } from '@/lib/system-prompt'
import { gameTools } from '@/lib/tools'
import type { GameState, StreamEvent, RollRecord, ToolCallResult } from '@/lib/types'

const client = new Anthropic()
const MODEL = process.env.STORYFORGE_MODEL || 'claude-sonnet-4-6'

export const runtime = 'nodejs'
export const maxDuration = 60

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
  }).optional(),
})

function resolveRoll(roll: number, modifier: number, dc: number): RollRecord['result'] {
  if (roll === 20) return 'critical'
  if (roll === 1) return 'fumble'
  if (roll + modifier >= dc) return 'success'
  return 'failure'
}

function rollResultText(roll: number, modifier: number, dc: number, result: RollRecord['result']): string {
  const total = roll + modifier
  if (result === 'critical') return `Natural 20! Critical success. Total: ${total} vs DC ${dc}. Exceptional outcome.`
  if (result === 'fumble') return `Natural 1! Fumble. Total: ${total} vs DC ${dc}. Failure with complication.`
  if (result === 'success') return `Success. Roll: ${roll} + ${modifier} modifier = ${total} vs DC ${dc}.`
  return `Failure. Roll: ${roll} + ${modifier} modifier = ${total} vs DC ${dc}. Apply the "fail with a cost" rule.`
}

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, isMetaQuestion, isInitial, rollResolution } = parsed.data
  const gameState = parsed.data.gameState as unknown as GameState

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        const systemPrompt = buildSystemPrompt(gameState, isMetaQuestion)

        // ── Phase 2: client sent a roll result, continue from pending conversation ──
        if (rollResolution) {
          const { roll, dc, modifier, reason, check, stat, pendingMessages, toolUseId } = rollResolution
          const result = resolveRoll(roll, modifier, dc)
          const total = roll + modifier

          const rollRecord: RollRecord = {
            id: Date.now().toString(),
            check, stat, dc, roll, modifier, total, result, reason,
            timestamp: new Date().toISOString(),
          }

          const continuationMessages: Anthropic.MessageParam[] = [
            ...(pendingMessages as Anthropic.MessageParam[]),
            {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: toolUseId, content: rollResultText(roll, modifier, dc, result) }],
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
        const genre = (gameState.meta?.genre || 'space-opera') as 'space-opera' | 'fantasy'
        const actualMessage = isInitial ? buildInitialMessage(genre) : message
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
              const input = tool.input as { checkType: string; stat: string; dc: number; modifier: number; reason: string }

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
        const message = error instanceof Error ? error.message : 'Unknown error'
        send({ type: 'error', message })
        controller.close()
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
