import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildSystemPrompt, buildMessagesForClaude, buildInitialMessage } from '@/lib/system-prompt'
import { gameTools } from '@/lib/tools'
import type { GameState, StreamEvent, RollRecord, ToolCallResult } from '@/lib/types'

const client = new Anthropic()

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    message: string
    gameState: GameState
    isMetaQuestion: boolean
    isInitial: boolean
  }

  const { message, gameState, isMetaQuestion, isInitial } = body

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        const systemPrompt = buildSystemPrompt(gameState, isMetaQuestion)
        const actualMessage = isInitial ? buildInitialMessage() : message
        const messages = buildMessagesForClaude(gameState, actualMessage, isMetaQuestion)

        // First Claude call — stream narrative, collect tool calls
        let narrativeText = ''
        const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = []

        const firstStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          tools: gameTools,
          messages,
        })

        // Stream text chunks to client immediately
        for await (const event of firstStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'text', content: event.delta.text })
            narrativeText += event.delta.text
          }
        }

        // Collect all tool calls from the completed message
        const firstMessage = await firstStream.finalMessage()
        for (const block of firstMessage.content) {
          if (block.type === 'tool_use') {
            toolCalls.push({
              name: block.name,
              input: block.input as Record<string, unknown>,
            })
          }
        }

        // Check if a roll was requested
        const rollRequest = toolCalls.find((t) => t.name === 'request_roll')
        let rollRecord: RollRecord | null = null

        if (rollRequest) {
          const input = rollRequest.input as {
            checkType: string
            stat: string
            dc: number
            modifier: number
            reason: string
          }

          // Auto-resolve the roll
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

          // Send roll event to client
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

          // Build tool result for Claude
          const rollResultText =
            result === 'critical'
              ? `Natural 20! Critical success. Total: ${total} vs DC ${input.dc}. Exceptional outcome.`
              : result === 'fumble'
                ? `Natural 1! Fumble. Total: ${total} vs DC ${input.dc}. Failure with complication.`
                : result === 'success'
                  ? `Success. Roll: ${roll} + ${input.modifier} modifier = ${total} vs DC ${input.dc}.`
                  : `Failure. Roll: ${roll} + ${input.modifier} modifier = ${total} vs DC ${input.dc}. Apply the "fail with a cost" rule.`

          // Second call: send roll result and get narrative continuation
          const continuationMessages = [
            ...messages,
            {
              role: 'assistant' as const,
              content: firstMessage.content,
            },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'tool_result' as const,
                  tool_use_id: (firstMessage.content.find((b) => b.type === 'tool_use' && (b as { name: string }).name === 'request_roll') as { id: string })!.id,
                  content: rollResultText,
                },
              ],
            },
          ]

          const secondStream = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            tools: gameTools,
            messages: continuationMessages,
          })

          // Stream continuation narrative
          for await (const event of secondStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              send({ type: 'text', content: event.delta.text })
            }
          }

          // Collect tool calls from continuation (suggest_actions, update_character, etc.)
          const secondMessage = await secondStream.finalMessage()
          for (const block of secondMessage.content) {
            if (block.type === 'tool_use') {
              toolCalls.push({
                name: block.name,
                input: block.input as Record<string, unknown>,
              })
            }
          }
        }

        // Build tool results array (everything except request_roll, which is handled above)
        const toolResults: ToolCallResult[] = toolCalls
          .filter((t) => t.name !== 'request_roll')
          .map((t) => ({ tool: t.name, input: t.input }))

        // If we have a roll record, include it in the tools payload so the client can update rollLog
        if (rollRecord) {
          toolResults.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })
        }

        if (toolResults.length > 0) {
          send({ type: 'tools', results: toolResults })
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
