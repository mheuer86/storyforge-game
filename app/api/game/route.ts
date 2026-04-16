import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buildSystemPrompt, buildClosePrompt, buildClosePhasePrompt, buildAuditPrompt, buildExtractionPrompt, buildMessagesForClaude, buildInitialMessage, buildChapter1SetupPrompt } from '@/lib/system-prompt'
import { gameTools, auditTools, metaTools, setupTools } from '@/lib/tools'
import { isAuthenticated } from '@/lib/auth'
import { getGenreConfig, type Genre } from '@/lib/genre-config'
import type { GameState, StreamEvent, RollRecord, ToolCallResult } from '@/lib/types'

let client: Anthropic = new Anthropic()
const MODEL = process.env.STORYFORGE_MODEL || 'claude-sonnet-4-6'
const THINKING_BUDGET = parseInt(process.env.STORYFORGE_THINKING_BUDGET || '0', 10) // 0 = disabled, e.g. 8000 for extended thinking

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
  closePhase: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  isChapter1Setup: z.boolean().optional(),
  isAudit: z.boolean().optional(),
  isSummarize: z.boolean().optional(),
  isShadowExtraction: z.boolean().optional(),
  narrativeText: z.string().max(8000).optional(),
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
  rollFirstResult: z.object({
    roll: z.number().min(1).max(20),
    check: z.string(),
    stat: z.string(),
    dc: z.number(),
    modifier: z.number(),
    reason: z.string(),
    result: z.enum(['critical', 'success', 'failure', 'fumble']),
    total: z.number(),
    advantage: z.enum(['advantage', 'disadvantage']).optional(),
    rawRolls: z.tuple([z.number().min(1).max(20), z.number().min(1).max(20)]).optional(),
    contested: z.object({ npcName: z.string(), npcSkill: z.string(), npcModifier: z.number() }).optional(),
    npcRoll: z.number().min(1).max(20).optional(),
    npcTotal: z.number().optional(),
  }).optional(),
})

function resolveRoll(roll: number, modifier: number, dc: number, rollType?: string): RollRecord['result'] {
  if (rollType === 'damage' || rollType === 'healing') return 'success'
  if (roll === 20) return 'critical'
  if (roll === 1) return 'fumble'
  if (roll + modifier >= dc) return 'success'
  return 'failure'
}

const ROLL_REMINDER_SUCCESS = ' Narrate the outcome, then call commit_turn with ONLY the state changes caused by this roll result (e.g. hp_delta from damage). Do NOT re-send inventory_use, credits_delta, or other changes from the pre-roll commit_turn — those were already applied.'

const ROLL_REMINDER_FAILURE = ' This is a FAILURE. Apply the FAIL FORWARD rules from the system prompt. The character does NOT learn what they were trying to learn. Commit to the false reality — narrate from inside the character\'s perspective as if what they perceive is true. Never step outside to signal the deception ("what you don\'t see", "what they buried", "you\'re wrong"). Plant one small, missable seed detail for later discovery. End with the character acting on the false belief. For Insight/Perception/Investigation failures, choose the outcome that fits: (A) RED HERRING — wrong conclusion believed as fact. Add a clue with a confident title, set is_red_herring: true. (B) NO READ — the character cannot get a read. No clue. "Her expression is unreadable." (C) AMBIGUOUS SIGNAL — notices something, cannot interpret it. No clue, but plant a seed. Never reveal the truth. Never label a clue as "false" or "misleading." For Persuasion/other failures: the approach fails and something gets worse (disposition drop, closed door, time lost, complication). The NPC may appear to comply but act against the character offscreen. Then call commit_turn with ONLY the state changes caused by this failure. Do NOT re-send inventory_use, credits_delta, or other changes from the pre-roll commit_turn — those were already applied.'

function rollResultText(roll: number, modifier: number, dc: number, result: RollRecord['result'], advantage?: 'advantage' | 'disadvantage', rawRolls?: [number, number], contested?: { npcName: string; npcSkill: string; npcModifier: number }, npcRoll?: number, npcTotal?: number, rollType?: string, damageType?: string): string {
  const total = roll + modifier
  if (rollType === 'damage') {
    return `Damage roll: ${roll} + ${modifier} = ${total}${damageType ? ` ${damageType}` : ''} damage.${ROLL_REMINDER_SUCCESS}`
  }
  if (rollType === 'healing') {
    return `Healing roll: ${roll} + ${modifier} = ${total} HP healed.${ROLL_REMINDER_SUCCESS}`
  }
  const advNote = advantage && rawRolls ? ` (${advantage}: rolled ${rawRolls[0]} and ${rawRolls[1]}, kept ${roll})` : ''
  const contestedNote = contested && npcRoll !== undefined && npcTotal !== undefined
    ? ` Contested vs ${contested.npcName}'s ${contested.npcSkill}: NPC rolled ${npcRoll} + ${contested.npcModifier} = ${npcTotal}.`
    : ''
  const vsText = contested && npcTotal !== undefined ? `vs ${contested.npcName}'s ${npcTotal}` : `vs DC ${dc}`
  if (result === 'critical') return `Natural 20! Critical success${advNote}.${contestedNote} Total: ${total} ${vsText}. Exceptional outcome.${ROLL_REMINDER_SUCCESS}`
  if (result === 'fumble') return `Natural 1! Fumble${advNote}.${contestedNote} Total: ${total} ${vsText}. Failure with complication.${ROLL_REMINDER_FAILURE}`
  if (result === 'success') return `Success${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}.${ROLL_REMINDER_SUCCESS}`
  return `Failure${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}. Apply the "fail with a cost" rule.${ROLL_REMINDER_FAILURE}`
}

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [5_000, 10_000, 20_000] // exponential backoff

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
 * Run the Claude streaming + tool loop.
 *
 * With commit_turn, this is typically single-pass:
 * 1. Stream narrative text
 * 2. Receive commit_turn tool call
 * 3. Extract results, check for pending_check
 * 4. Done
 *
 * Multi-round is still supported for the close sequence (which may need
 * multiple commit_turn calls for audit + close + level-up + debrief).
 */
async function runToolLoop(
  systemPrompt: Anthropic.TextBlockParam[],
  initialMessages: Anthropic.MessageParam[],
  send: SendFn,
  interceptRolls: boolean,
  options?: { model?: string; tools?: Anthropic.Tool[]; maxRounds?: number; maxTokens?: number; thinkingBudget?: number },
): Promise<ToolLoopResult> {
  const toolResults: ToolCallResult[] = []
  let messages = initialMessages

  const toolsToSend = options?.tools || gameTools
  const cachedTools = toolsToSend.map((t, i) =>
    i === toolsToSend.length - 1
      ? { ...t, cache_control: { type: 'ephemeral' as const } }
      : t
  )

  const rounds = options?.maxRounds ?? 2
  for (let round = 0; round < rounds; round++) {
    const thinkingBudget = options?.thinkingBudget || 0
    const stream = await client.messages.stream({
      model: options?.model || MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      system: systemPrompt,
      tools: cachedTools,
      messages,
      ...(thinkingBudget > 0 && {
        thinking: { type: 'enabled' as const, budget_tokens: thinkingBudget },
        temperature: 1, // required when thinking is enabled
      }),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        // Strip model artifacts that can leak through streaming
        const text = event.delta.text.replace(/<\/s>/g, '')
        if (text) send({ type: 'text', content: text })
      }
    }

    const completed = await stream.finalMessage()

    const usage = completed.usage as { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
    send({ type: 'token_usage', usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      ...(thinkingBudget > 0 && { thinkingBudget }),
    }})

    const toolCalls = completed.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

    if (completed.stop_reason !== 'tool_use' || toolCalls.length === 0) break

    const roundResults: Anthropic.ToolResultBlockParam[] = []

    for (const tc of toolCalls) {
      // ── pending_check interception: pause for player roll ──
      if (interceptRolls && tc.name === 'commit_turn') {
        const input = tc.input as Record<string, unknown>
        const pendingCheck = input.pending_check as {
          skill: string; stat: string; dc: number; modifier: number; reason: string;
          advantage?: boolean; disadvantage?: boolean;
          contested?: { npc_name: string; npc_skill: string; npc_modifier: number };
          sides?: number; roll_type?: 'check' | 'damage' | 'healing'; damage_type?: string;
        } | undefined

        if (pendingCheck) {
          // Apply the commit_turn (minus pending_check) as state changes that already happened
          toolResults.push({ tool: 'commit_turn', input: tc.input as Record<string, unknown> })

          // Flush accumulated tools before pausing for the roll
          if (toolResults.length > 0) {
            send({ type: 'tools', results: toolResults })
          }

          // Map advantage/disadvantage booleans to the enum the client expects
          const advEnum = pendingCheck.advantage ? 'advantage' : pendingCheck.disadvantage ? 'disadvantage' : undefined

          const pendingMessages: Anthropic.MessageParam[] = [
            ...messages,
            { role: 'assistant' as const, content: completed.content },
          ]
          const priorToolResults = [...roundResults]

          send({
            type: 'roll_prompt',
            check: pendingCheck.skill,
            stat: pendingCheck.stat,
            dc: pendingCheck.dc,
            modifier: pendingCheck.modifier,
            reason: pendingCheck.reason,
            toolUseId: tc.id,
            pendingMessages,
            priorToolResults,
            ...(advEnum && { advantage: advEnum }),
            ...(pendingCheck.contested && {
              contested: {
                npcName: pendingCheck.contested.npc_name,
                npcSkill: pendingCheck.contested.npc_skill,
                npcModifier: pendingCheck.contested.npc_modifier,
              },
            }),
            ...(pendingCheck.sides && { sides: pendingCheck.sides }),
            ...(pendingCheck.roll_type && { rollType: pendingCheck.roll_type }),
            ...(pendingCheck.damage_type && { damageType: pendingCheck.damage_type }),
          })

          return { toolResults, messages, hitRoll: true }
        }
      }

      // Normal tool result (commit_turn without pending_check, or meta_response)
      toolResults.push({ tool: tc.name, input: tc.input as Record<string, unknown> })
      roundResults.push({ type: 'tool_result', tool_use_id: tc.id, content: 'OK' })
    }

    // commit_turn is terminal — one call per turn. Break unless in close sequence.
    const hasCommitTurn = toolCalls.some(tc => tc.name === 'commit_turn')
    if (hasCommitTurn && rounds <= 2) break

    messages = [
      ...messages,
      { role: 'assistant' as const, content: completed.content },
      { role: 'user' as const, content: roundResults },
    ]
  }

  return { toolResults, messages, hitRoll: false }
}

function buildSystemBlocks(gameState: GameState, isMetaQuestion: boolean, isConsistencyCheck?: boolean, flaggedMessage?: string, currentMessage?: string): Anthropic.TextBlockParam[] {
  const [staticInstructions, dynamicState] = buildSystemPrompt(gameState, isMetaQuestion || !!isConsistencyCheck, isConsistencyCheck ? flaggedMessage : undefined, currentMessage)
  return [
    { type: 'text', text: staticInstructions, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicState },
  ]
}

export async function POST(req: NextRequest) {
  // BYOK: client can provide their own API key via header
  const byokKey = req.headers.get('x-anthropic-key')
  const isByok = !!byokKey

  // If no BYOK key, require server auth (demo mode with passphrase)
  if (!isByok && !(await isAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Provide an API key or enter the access code.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Set client: use player's key if BYOK, otherwise server key
  client = isByok ? new Anthropic({ apiKey: byokKey }) : new Anthropic()

  const parsed = requestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { message, isMetaQuestion, isInitial, rollResolution, rollFirstResult, isConsistencyCheck, isChapterClose, closePhase, isChapter1Setup, isAudit, isSummarize, isShadowExtraction, narrativeText, flaggedMessage } = parsed.data
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

      // Follow-up helper: if commit_turn is missing suggested_actions, ask Claude
      // for just the actions before sending 'done'. Fires inside the loading state
      // so the player sees no gap between narrative and action buttons.
      async function ensureActions(
        loopResult: ToolLoopResult,
        systemPrompt: Anthropic.TextBlockParam[],
        tools: Anthropic.Tool[],
      ) {
        const commitResult = loopResult.toolResults.find(r => r.tool === 'commit_turn')
        const actions = (commitResult?.input as { suggested_actions?: string[] } | undefined)?.suggested_actions
        if (actions && actions.length > 0) return

        const followUpMessages: Anthropic.MessageParam[] = [
          ...loopResult.messages,
          { role: 'user', content: 'You did not include suggested_actions in your commit_turn. Call commit_turn now with ONLY suggested_actions (3-4 contextual options for the player based on the current scene). No other fields needed.' },
        ]
        const noop = () => {}  // suppress text streaming — this is a tool-only follow-up
        const followUp = await runToolLoop(systemPrompt, followUpMessages, noop, false, { tools, maxRounds: 1 })
        const followUpCommit = followUp.toolResults.find(r => r.tool === 'commit_turn')
        const followUpActions = (followUpCommit?.input as { suggested_actions?: string[] } | undefined)?.suggested_actions
        if (followUpActions && followUpActions.length > 0) {
          if (commitResult) {
            (commitResult.input as Record<string, unknown>).suggested_actions = followUpActions
          } else {
            loopResult.toolResults.push({ tool: 'commit_turn', input: { suggested_actions: followUpActions } })
          }
        }
      }

      // Select tools: meta gets meta_response only, everything else gets commit_turn + meta_response
      const contextTools = isMetaQuestion ? metaTools : gameTools

      try {
        const systemPrompt = buildSystemBlocks(gameState, isMetaQuestion, isConsistencyCheck, flaggedMessage, message)

        if (rollResolution) {
          // ── Phase 2: continue from pending conversation after client roll ──
          const { roll, dc, modifier, reason, check, stat, pendingMessages, toolUseId, advantage, rawRolls, contested, npcRoll, npcTotal, priorToolResults: priorResults, sides, rollType, damageType } = rollResolution
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

          const isSuccessfulHit = (result === 'success' || result === 'critical') && gameState.combat.active && rollType !== 'damage' && rollType !== 'healing'

          // Auto-chain: after a successful hit, send a damage roll prompt directly
          if (isSuccessfulHit) {
            const weapon = gameState.character.inventory.find(
              (item) => item.damage && item.name.toLowerCase() === check.toLowerCase()
            )
            if (weapon?.damage) {
              const dmgMatch = weapon.damage.match(/1d(\d+)(?:\+(\w+))?(?:\s+(.+))?/)
              if (dmgMatch) {
                const damageSides = parseInt(dmgMatch[1])
                const statKey = dmgMatch[2] as keyof typeof gameState.character.stats | undefined
                const dmgType = dmgMatch[3] || ''
                const damageMod = statKey && gameState.character.stats[statKey]
                  ? Math.floor((gameState.character.stats[statKey] - 10) / 2)
                  : 0

                const hitRollResults: ToolCallResult[] = [{ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> }]
                send({ type: 'tools', results: hitRollResults })

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

          const resultText = rollResultText(roll, modifier, effectiveDC, result, advantage, rawRolls, contested, npcRoll, npcTotal, rollType, damageType)

          // Build a reminder of what the pre-roll commit_turn already applied,
          // so Claude doesn't re-send the same state changes after the roll.
          let alreadyAppliedNote = ''
          const lastAssistantMsg = (pendingMessages as Anthropic.MessageParam[]).findLast(m => m.role === 'assistant')
          if (lastAssistantMsg && Array.isArray(lastAssistantMsg.content)) {
            const commitBlock = (lastAssistantMsg.content as Anthropic.ContentBlock[]).find(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'commit_turn'
            )
            if (commitBlock) {
              const ci = commitBlock.input as Record<string, unknown>
              const applied: string[] = []
              if (ci.inventory_use) applied.push(`inventory_use (${(ci.inventory_use as { id: string }).id})`)
              if (ci.credits_delta) applied.push(`credits_delta (${ci.credits_delta})`)
              if (ci.add_ledger_entry) applied.push('add_ledger_entry')
              if (ci.trait_update) applied.push('trait_update')
              if (applied.length > 0) {
                alreadyAppliedNote = ` ALREADY APPLIED from your pre-roll commit_turn: ${applied.join(', ')}. Do NOT re-send these.`
              }
            }
          }

          // For auto-chained damage/healing rolls, the toolUseId was generated client-side
          // and has no matching tool_use in Claude's messages. Send as text instead of tool_result.
          const isAutoChained = toolUseId.startsWith('dmg-auto-')
          const resultContent: Anthropic.ContentBlockParam[] = isAutoChained
            ? [
                ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
                { type: 'text' as const, text: resultText + alreadyAppliedNote },
              ]
            : [
                ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
                { type: 'tool_result' as const, tool_use_id: toolUseId, content: resultText + alreadyAppliedNote },
              ]

          const continuationMessages: Anthropic.MessageParam[] = [
            ...(pendingMessages as Anthropic.MessageParam[]),
            { role: 'user', content: resultContent },
          ]

          const loopResult = await runToolLoop(systemPrompt, continuationMessages, send, true, { thinkingBudget: THINKING_BUDGET })
          loopResult.toolResults.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })
          await ensureActions(loopResult, systemPrompt, contextTools)
          finish(loopResult.toolResults)
          return
        }

        // ── Roll-first: client derived the check, player already rolled, GM narrates the full scene ──
        if (rollFirstResult) {
          const { roll, dc, modifier, check, stat, result, total, reason, advantage, rawRolls, contested, npcRoll, npcTotal } = rollFirstResult

          const rollRecord: RollRecord = {
            id: crypto.randomUUID(),
            check, stat, dc, roll, modifier, total, result, reason,
            timestamp: new Date().toISOString(),
            ...(advantage && { advantage }),
            ...(rawRolls && { rawRolls }),
            ...(contested && { contested }),
            ...(npcRoll !== undefined && { npcRoll, npcTotal }),
          }

          // Build the roll result text (same format as rollResolution)
          const advNote = advantage && rawRolls ? ` (${advantage}: rolled ${rawRolls[0]} and ${rawRolls[1]}, kept ${roll})` : ''
          const contestedNote = contested && npcRoll !== undefined && npcTotal !== undefined
            ? ` Contested: ${contested.npcName}'s ${contested.npcSkill} ${npcRoll} + ${contested.npcModifier} = ${npcTotal}.` : ''
          const vsText = contested && npcTotal !== undefined ? `vs ${contested.npcName}'s ${npcTotal}` : `vs DC ${dc}`
          const resultText = result === 'critical' ? `Natural 20! Critical success${advNote}.${contestedNote} Total: ${total} ${vsText}. Exceptional outcome.`
            : result === 'fumble' ? `Natural 1! Fumble${advNote}.${contestedNote} Total: ${total} ${vsText}. Failure with complication.`
            : result === 'success' ? `Success${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}.`
            : `Failure${advNote}.${contestedNote} Roll: ${roll} + ${modifier} modifier = ${total} ${vsText}. Apply the "fail with a cost" rule.`
          const reminder = (result === 'success' || result === 'critical') ? ROLL_REMINDER_SUCCESS : ROLL_REMINDER_FAILURE

          // Build conversation with roll result embedded in the player's turn
          const conversationMessages = buildMessagesForClaude(gameState, message, false)
          // Replace the last user message with one that includes the roll result
          const lastMsgIdx = conversationMessages.length - 1
          const playerMsg = typeof conversationMessages[lastMsgIdx]?.content === 'string'
            ? conversationMessages[lastMsgIdx].content as string : message
          conversationMessages[lastMsgIdx] = {
            role: 'user',
            content: `${playerMsg}\n\n[ROLL RESULT: ${check} (${stat}) — ${resultText}${reminder}]\n\nNarrate the full scene including the attempt and its outcome in one continuous narrative.`,
          }

          const loopResult = await runToolLoop(systemPrompt, conversationMessages, send, true, { tools: contextTools, thinkingBudget: THINKING_BUDGET })
          loopResult.toolResults.push({ tool: '_roll_record', input: rollRecord as unknown as Record<string, unknown> })

          // Handle chained rolls (e.g. damage after a combat hit)
          if (loopResult.hitRoll) {
            send({ type: 'done' })
            controller.close()
            return
          }

          await ensureActions(loopResult, systemPrompt, contextTools)
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
          const loopResult = await runToolLoop(auditSystem, auditMessages, send, false, { model: AUDIT_MODEL, tools: auditTools, maxRounds: 1 })
          finish(loopResult.toolResults)
          return
        }

        // ── Shadow extraction: background extraction for quality validation ──
        // Uses the GM's full system prompt (cached) + conversation history (cached)
        // + GM narrative as assistant turn + extraction instruction as final user turn.
        // This gives the extractor full context for scene boundaries, disposition arcs, etc.
        if (isShadowExtraction && narrativeText) {
          // Reuse the GM's system prompt — will hit prompt cache from the recent GM call
          const extractSystem = buildSystemBlocks(gameState, false)

          // Rebuild conversation history (same as GM saw), then append GM's response + extraction instruction
          const historyMessages = buildMessagesForClaude(gameState, message, false)
          const extractMessages: Anthropic.MessageParam[] = [
            ...historyMessages,
            { role: 'assistant', content: narrativeText },
            { role: 'user', content: `[EXTRACTION MODE] You are now the state extractor. Read your narrative above and the full conversation history. Extract every state change into a single commit_turn call. Output ONLY a commit_turn tool call — no narrative text. Do NOT include suggested_actions or pending_check.

## PRIORITY EXTRACTIONS (most commonly missed)

**Scene snapshot** — ALWAYS update set_scene_snapshot. Describe who is present, where they are spatially, and what just changed. Compare against the last snapshot in state — if anything moved, update it.

**NPC updates** — If ANY named NPC spoke, moved, reacted, or revealed information this turn, emit update_npcs for them. Update last_seen to their current location. Add key_facts for anchoring details (relationships revealed, secrets shared, abilities demonstrated). Add signature_lines for memorable quotes.

**Disposition changes** — Read dialogue tone against the conversation arc. If an NPC was resistant and is now cooperating, or was friendly and is now hostile, emit disposition_changes. Compare their behavior THIS turn against their behavior 2-3 turns ago — the shift may be gradual.

**Scene boundaries** — ONLY include scene_end: true when BOTH conditions are met: (a) The location name changed OR the set of present characters changed substantially (someone arrived or left, not just repositioned within the scene), AND (b) at least 3 player turns have passed since the last scene_end in the conversation history. Check the scene summaries in state — aim for roughly 1 summary per 5-8 turns. Do NOT fire scene_end for movement within the same location, minor cast adjustments, or back-to-back turns. When you do fire scene_end, include a scene_summary (2-4 sentences covering the scene that just ended) and set_location if the location name changed.

**Time tracking** — If the narrative indicates time passing (dawn→morning, "an hour later", "by nightfall"), include set_current_time.

## CONTEXTUAL EXTRACTIONS (require conversation history)

**Threads** — Did an existing thread advance? Check active threads in state and compare. Did a NEW storyline emerge from this turn's events? Add it. Threads that were mentioned but unchanged do NOT need updating.

**Promises** — Did the PC commit to something, or fulfill/break a prior commitment? Check active promises in state.

**Decisions** — Did the PC make a choice that closes off alternatives? (alliances, accusations, commitments, moral choices) These are player-driven, not GM-driven.

**Clocks** — Should a tension clock tick? Check active clocks — if the narrative describes progress or setback toward a clock's trigger, advance it.

**Signal close** — Compare the chapter frame objective against what happened. If the objective is clearly resolved or failed by this turn's events, include signal_close with a reason.

## RULES
- Extract ONLY what is stated or clearly implied. Do NOT invent events or infer beyond what the text supports.
- When in doubt about a disposition shift, include it — false negatives are worse than false positives here.
- If nothing changed this turn, output nothing (no tool call needed).` },
          ]
          const loopResult = await runToolLoop(extractSystem, extractMessages, send, false, { model: MODEL, tools: auditTools, maxRounds: 1 })
          finish(loopResult.toolResults)
          return
        }

        // ── Summarize: Haiku generates a "story so far" summary ──
        if (isSummarize) {
          const SUMMARIZE_MODEL = 'claude-haiku-4-5-20251001'
          const msgs = gameState.history.messages
          const messageBlock = msgs
            .map((m) => `[${m.role}] ${m.content.slice(0, 300)}`)
            .join('\n')
          const summarizeSystem: Anthropic.TextBlockParam[] = [{
            type: 'text',
            text: `You are a story summarizer for a ${getGenreConfig((gameState.meta.genre || 'space-opera') as Genre).name} RPG. Produce a concise narrative summary of what has happened so far in this chapter. Include: key events in order, important NPCs encountered, decisions made, unresolved threads, and current situation. Write in past tense, third person. 200-300 words maximum. No meta-commentary — just the story facts.`,
          }]
          const summarizeMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: `Summarize this chapter so far:\n\n${messageBlock}` },
          ]
          const summarizeStream = await client.messages.stream({
            model: SUMMARIZE_MODEL,
            max_tokens: 512,
            system: summarizeSystem,
            messages: summarizeMessages,
          })
          let summaryText = ''
          for await (const event of summarizeStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              summaryText += event.delta.text
            }
          }
          const completed = await summarizeStream.finalMessage()
          const usage = completed.usage as { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
          send({ type: 'token_usage', usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          }})
          send({ type: 'tools', results: [{ tool: '_story_summary', input: { text: summaryText, upToMessageIndex: msgs.length - 1, turn: msgs.filter(m => m.role === 'player').length } }] })
          send({ type: 'done' })
          controller.close()
          return
        }

        // ── Chapter close: Haiku for phase 1, Sonnet for phases 2-3 (debrief + curation) ──
        if (isChapterClose) {
          const phase = closePhase ?? 1
          const CLOSE_MODEL = MODEL // All close phases use Sonnet — Haiku misjudges outcome tiers
          const [phaseInstructions, phaseState] = buildClosePhasePrompt(gameState, phase as 1 | 2 | 3)
          const phaseSystem: Anthropic.TextBlockParam[] = [
            { type: 'text', text: phaseInstructions },
            { type: 'text', text: phaseState },
          ]
          const phaseMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: `Execute close phase ${phase} now.` },
          ]


          const loopResult = await runToolLoop(phaseSystem, phaseMessages, send, false, { model: CLOSE_MODEL, maxRounds: 2 })
          finish(loopResult.toolResults)
          return
        }

        // ── Chapter 1 setup: pre-narration state population ──
        if (isChapter1Setup) {
          const [setupInstructions, setupState] = buildChapter1SetupPrompt(gameState)
          const setupSystem: Anthropic.TextBlockParam[] = [
            { type: 'text', text: setupInstructions },
            { type: 'text', text: setupState },
          ]
          const setupMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: 'Execute chapter setup now.' },
          ]

          const loopResult = await runToolLoop(setupSystem, setupMessages, send, false, { model: MODEL, tools: setupTools, maxRounds: 1, maxTokens: 4096 })
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
            send({ type: 'chapter_title', title: initialResult.chapterTitle })
          }
        }
        const conversationMessages = buildMessagesForClaude(gameState, actualMessage, isMetaQuestion)

        // Normal turns: 2 rounds max. Narrative + commit_turn should be 1 round.
        // 2 gives headroom if Claude doesn't include everything in one call.
        const loopResult = await runToolLoop(systemPrompt, conversationMessages, send, true, { tools: contextTools, thinkingBudget: THINKING_BUDGET })

        if (loopResult.hitRoll) {
          send({ type: 'done' })
          controller.close()
          return
        }

        if (!isMetaQuestion) await ensureActions(loopResult, systemPrompt, contextTools)

        finish(loopResult.toolResults)
      } catch (error) {
        if (!isOverloaded(error)) {
          send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
          controller.close()
          return
        }

        let succeeded = false
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const delayMs = RETRY_DELAYS_MS[attempt]
          send({ type: 'retrying', delayMs, reason: `Claude is taking a break (attempt ${attempt + 1}/${MAX_RETRIES})` })
          await new Promise((resolve) => setTimeout(resolve, delayMs))

          try {
            const retrySystem = buildSystemBlocks(gameState, isMetaQuestion, isConsistencyCheck, flaggedMessage, message)
            const retryMessages = rollResolution
              ? [
                  ...(rollResolution.pendingMessages as Anthropic.MessageParam[]),
                  { role: 'user' as const, content: [{ type: 'tool_result' as const, tool_use_id: rollResolution.toolUseId, content: rollResultText(rollResolution.roll, rollResolution.modifier, rollResolution.npcTotal ?? rollResolution.dc, resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.npcTotal ?? rollResolution.dc), rollResolution.advantage, rollResolution.rawRolls, rollResolution.contested, rollResolution.npcRoll, rollResolution.npcTotal) }] },
                ]
              : (() => {
                  const retryMsg = isInitial ? buildInitialMessage(gameState) : message
                  return buildMessagesForClaude(gameState, typeof retryMsg === 'string' ? retryMsg : retryMsg.message, isMetaQuestion)
                })()

            const retryTools = isMetaQuestion ? metaTools : gameTools
            const loopResult = await runToolLoop(retrySystem, retryMessages, send, true, { tools: retryTools, thinkingBudget: THINKING_BUDGET })

            if (loopResult.hitRoll) {
              send({ type: 'done' })
              controller.close()
              return
            }

            if (rollResolution) {
              const result = resolveRoll(rollResolution.roll, rollResolution.modifier, rollResolution.dc)
              loopResult.toolResults.push({ tool: '_roll_record', input: { id: crypto.randomUUID(), check: rollResolution.check, stat: rollResolution.stat ?? '', dc: rollResolution.dc, roll: rollResolution.roll, modifier: rollResolution.modifier, total: rollResolution.roll + rollResolution.modifier, result, reason: rollResolution.reason, timestamp: new Date().toISOString(), ...(rollResolution.advantage && { advantage: rollResolution.advantage }), ...(rollResolution.rawRolls && { rawRolls: rollResolution.rawRolls }) } as unknown as Record<string, unknown> })
            }

            if (!isMetaQuestion) await ensureActions(loopResult, retrySystem, retryTools)
            finish(loopResult.toolResults)
            succeeded = true
            break
          } catch (retryError) {
            if (!isOverloaded(retryError) || attempt === MAX_RETRIES - 1) {
              send({ type: 'error', message: retryError instanceof Error ? retryError.message : 'Unknown error' })
              controller.close()
              return
            }
            // Otherwise loop continues to next attempt
          }
        }
        if (!succeeded) {
          send({ type: 'error', message: 'Claude is overloaded. Please try again later.' })
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
