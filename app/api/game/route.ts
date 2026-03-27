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
})

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, isMetaQuestion, isInitial } = parsed.data
  const gameState = parsed.data.gameState as unknown as GameState

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        const systemPrompt = buildSystemPrompt(gameState, isMetaQuestion)
        const genre = (gameState.meta?.genre || 'space-opera') as 'space-opera' | 'fantasy'
        const actualMessage = isInitial ? buildInitialMessage(genre) : message
        let conversationMessages: Anthropic.MessageParam[] = buildMessagesForClaude(gameState, actualMessage, isMetaQuestion)

        const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = []
        let rollRecord: RollRecord | null = null
        const MAX_TOOL_ROUNDS = 5

        // Tool-calling loop: Claude may need multiple rounds when it calls tools
        // like update_world before producing narrative text.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const currentStream = await client.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            tools: gameTools,
            messages: conversationMessages,
          })

          // Stream text chunks to client immediately
          for await (const event of currentStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              send({ type: 'text', content: event.delta.text })
            }
          }

          const completedMessage = await currentStream.finalMessage()

          // Collect tool calls from this round
          const roundToolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
          for (const block of completedMessage.content) {
            if (block.type === 'tool_use') {
              roundToolCalls.push({
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
              allToolCalls.push({
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
            }
          }

          // If Claude didn't call any tools, we're done
          if (completedMessage.stop_reason !== 'tool_use' || roundToolCalls.length === 0) {
            break
          }

          // Build tool results for every tool_use in this round
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const tool of roundToolCalls) {
            if (tool.name === 'request_roll') {
              // Auto-resolve the roll
              const input = tool.input as {
                checkType: string
                stat: string
                dc: number
                modifier: number
                reason: string
              }

              const roll = Math.floor(Math.random() * 20) + 1
              const total = roll + input.modifier
              let result: RollRecord['result']
              if (roll === 20) result = 'critical'
              else if (roll === 1) result = 'fumble'
              else if (total >= input.dc) result = 'success'
              else result = 'failure'

              rollRecord = {
                id: Date.now().toString(),
                check: input.checkType,
                stat: input.stat,
                dc: input.dc,
                roll,
                modifier: input.modifier,
                total,
                result,
                reason: input.reason,
                timestamp: new Date().toISOString(),
              }

              send({
                type: 'roll',
                check: input.checkType,
                stat: input.stat,
                dc: input.dc,
                roll,
                modifier: input.modifier,
                total,
                result,
                reason: input.reason,
              })

              const rollResultText =
                result === 'critical'
                  ? `Natural 20! Critical success. Total: ${total} vs DC ${input.dc}. Exceptional outcome.`
                  : result === 'fumble'
                    ? `Natural 1! Fumble. Total: ${total} vs DC ${input.dc}. Failure with complication.`
                    : result === 'success'
                      ? `Success. Roll: ${roll} + ${input.modifier} modifier = ${total} vs DC ${input.dc}.`
                      : `Failure. Roll: ${roll} + ${input.modifier} modifier = ${total} vs DC ${input.dc}. Apply the "fail with a cost" rule.`

              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: rollResultText,
              })
            } else {
              // Acknowledge all other tools so Claude can continue
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: 'OK',
              })
            }
          }

          // Continue conversation with tool results
          conversationMessages = [
            ...conversationMessages,
            { role: 'assistant' as const, content: completedMessage.content },
            { role: 'user' as const, content: toolResults },
          ]
        }

        // Send all collected tool calls to the client for state updates
        const clientToolResults: ToolCallResult[] = allToolCalls
          .filter((t) => t.name !== 'request_roll')
          .map((t) => ({ tool: t.name, input: t.input }))

        if (rollRecord) {
          clientToolResults.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })
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
