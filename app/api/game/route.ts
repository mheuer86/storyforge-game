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

const ROLL_REMINDER_FAILURE = ' FAILURE. The attempt happened; the world registered the push. Narrate what the world did in RESPONSE to the attempt — not what the character missed. Three patterns, preferred order: (1) THE COMPROMISE — a third outcome neither full success nor full failure would produce (NPC half-agrees, door opens partway, request carries a condition). (2) THE COST — task succeeds, character pays in a different currency (information delivered but relationship cools, door opens but reputation notices, standing shifts). (3) THE GAP — character gets most of what they needed but misses one specific piece (a named hole that drives the next action). FORBIDDEN: narrator-reveal ("you don\'t notice that...", "the superintendent made a phone call you didn\'t see"), meta-commentary on the miss ("what you don\'t yet see is...", "the seed you don\'t plant..."), invention of names/facts/connections not established in narrative (a failed check cannot produce NEW information — only a response from the world to the attempt). TEST: after narrating, does the player know something the CHARACTER doesn\'t? If yes, rewrite. Commit to the false reality from inside the character\'s perspective. For Insight/Perception: reads wrongly OR notices nothing; no "what they missed" sidebars. For Investigation: plausible wrong answer treated as true — add a clue with is_red_herring: true; never label it "false" or "misleading" in-narrative. For Persuasion vs hostile: appears to comply, may act against offscreen. For Combat: position changes, not "you miss." Then call commit_turn with ONLY the state changes caused by this failure. Do NOT re-send inventory_use, credits_delta, or other changes from the pre-roll commit_turn — those were already applied.'

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
      max_tokens: options?.maxTokens ?? 6144,
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

    // Truncation surfaces as stop_reason='max_tokens'. The loop breaks on
    // stop_reason !== 'tool_use' below, so truncated tool calls look identical
    // to normal completion in the token_usage event. Emit an explicit signal.
    if (completed.stop_reason === 'max_tokens') {
      send({
        type: 'truncation_warning',
        outputTokens: usage.output_tokens,
        toolUseBlocks: toolCalls.length,
        round,
        hasTools: cachedTools.length > 0,
        model: options?.model || MODEL,
      })
      // Recovery: if this is round 0 of a normal turn (tools available, not in a
      // rolled close phase) and we produced no usable tool output, replay the
      // round once at a higher cap. Better than a hung UI.
      const callerMax = options?.maxTokens ?? 6144
      const canRetry = round === 0 && callerMax < 16_000 && cachedTools.length > 0 && toolCalls.length <= 1
      if (canRetry) {
        const retryStream = await client.messages.stream({
          model: options?.model || MODEL,
          max_tokens: 16_000,
          system: systemPrompt,
          tools: cachedTools,
          messages,
          ...(thinkingBudget > 0 && {
            thinking: { type: 'enabled' as const, budget_tokens: thinkingBudget },
            temperature: 1,
          }),
        })
        for await (const event of retryStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text.replace(/<\/s>/g, '')
            if (text) send({ type: 'text', content: text })
          }
        }
        const retryCompleted = await retryStream.finalMessage()
        const retryUsage = retryCompleted.usage as { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
        send({ type: 'token_usage', usage: {
          inputTokens: retryUsage.input_tokens,
          outputTokens: retryUsage.output_tokens,
          cacheWriteTokens: retryUsage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: retryUsage.cache_read_input_tokens ?? 0,
        }})
        const retryToolCalls = retryCompleted.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        // Overwrite the truncated frame with the retry outcome so the loop below uses it
        Object.assign(completed, retryCompleted)
        toolCalls.length = 0
        toolCalls.push(...retryToolCalls)
        if (retryCompleted.stop_reason === 'max_tokens') {
          send({
            type: 'truncation_warning',
            outputTokens: retryUsage.output_tokens,
            toolUseBlocks: retryToolCalls.length,
            round,
            hasTools: cachedTools.length > 0,
            model: options?.model || MODEL,
          })
        }
      }
    }

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
  const [core, situation, dynamicState] = buildSystemPrompt(gameState, isMetaQuestion || !!isConsistencyCheck, isConsistencyCheck ? flaggedMessage : undefined, currentMessage)
  // Two cache breakpoints: one after core (always stable), one after situation
  // (stable within a context). Anthropic caches the prefix through each
  // breakpoint, so the longest matching prefix hits on each call. When the
  // situation module is unchanged turn-to-turn (common case), the full
  // [core + situation] prefix hits. When context flips, [core] still hits and
  // only situation writes fresh. Dynamic block always writes fresh.
  return [
    { type: 'text', text: core, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: situation, cache_control: { type: 'ephemeral' } },
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
          { role: 'user', content: 'You did not include suggested_actions in your commit_turn. Call commit_turn now with ONLY suggested_actions (3-4 options takeable from the PC\'s current position in the current scene — check SCENE and LOCATION in game state; do not suggest calling NPCs the PC is already with, or going to locations not yet introduced). No other fields needed.' },
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

        // Emit the static + situation + dynamic system blocks for the debug log
        // export. Three blocks total: core (cached), situation (static content
        // that varies with context), dynamic (per-turn state). Labels let the
        // debug log distinguish them cleanly.
        const blockLabels = ['SYSTEM_CORE', 'SYSTEM_SITUATION', 'SYSTEM_DYNAMIC']
        systemPrompt.forEach((block, i) => {
          const label = blockLabels[i] ?? (block.cache_control ? 'SYSTEM_STATIC' : 'SYSTEM_DYNAMIC')
          send({
            type: 'debug_context',
            label,
            content: block.text,
            tokenEstimate: Math.ceil(block.text.length / 4),
          })
        })

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

          // Guard against pre/post-roll narration duplication. Claude's last
          // assistant message already contains the pre-roll setup prose; the
          // continuation must pick up AFTER that moment, not re-emit it.
          const continuationNote = ' CONTINUATION: your pre-roll narration above ended at the moment of the attempt. Pick up from there — narrate only the outcome of the roll and what follows. Do NOT repeat or paraphrase any prose already emitted in your previous message.'

          // For auto-chained damage/healing rolls, the toolUseId was generated client-side
          // and has no matching tool_use in Claude's messages. Send as text instead of tool_result.
          const isAutoChained = toolUseId.startsWith('dmg-auto-')
          const resultContent: Anthropic.ContentBlockParam[] = isAutoChained
            ? [
                ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
                { type: 'text' as const, text: resultText + alreadyAppliedNote + continuationNote },
              ]
            : [
                ...((priorResults as Anthropic.ToolResultBlockParam[]) ?? []),
                { type: 'tool_result' as const, tool_use_id: toolUseId, content: resultText + alreadyAppliedNote + continuationNote },
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

          // Emit audit blocks for the debug log export.
          const playerTurns = gameState.history.messages.filter(m => m.role === 'player').length
          send({
            type: 'debug_context',
            label: 'AUDIT_START',
            content: `Audit fired. chapter=${gameState.meta.chapterNumber} player_turn=${playerTurns}`,
            tokenEstimate: 0,
          })
          send({
            type: 'debug_context',
            label: 'AUDIT_SYSTEM_STATIC',
            content: auditInstructions,
            tokenEstimate: Math.ceil(auditInstructions.length / 4),
          })
          send({
            type: 'debug_context',
            label: 'AUDIT_SYSTEM_DYNAMIC',
            content: auditState,
            tokenEstimate: Math.ceil(auditState.length / 4),
          })

          const auditSystem: Anthropic.TextBlockParam[] = [
            { type: 'text', text: auditInstructions },
            { type: 'text', text: auditState },
          ]
          const auditMessages: Anthropic.MessageParam[] = [
            { role: 'user', content: 'Audit the current game state now.' },
          ]
          const loopResult = await runToolLoop(auditSystem, auditMessages, send, false, { model: AUDIT_MODEL, tools: auditTools, maxRounds: 1 })

          // Emit audit result summary for the debug log.
          const toolNames = loopResult.toolResults.map(r => r.tool)
          const commitInput = loopResult.toolResults.find(r => r.tool === 'commit_turn')?.input as Record<string, unknown> | undefined
          const correctionFields = commitInput ? Object.keys(commitInput) : []
          send({
            type: 'debug_context',
            label: 'AUDIT_RESULT',
            content: `tools_called=${toolNames.join(',') || 'none'} correction_fields=${correctionFields.join(',') || 'none'}\n${JSON.stringify(commitInput ?? {}, null, 2)}`,
            tokenEstimate: 0,
          })

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

## OPERATIONAL EXTRACTIONS (priority-tier, state-dense)

**Operation objectives** — If an active operation is in state, compare its objectives against the narrative. When the narrative describes completing, failing, or clearly advancing an objective, emit update_objective with the correct status. Do not invent objectives — only update ones that exist in operationState.objectives.

**Operation phase transitions** — Active operations flow planning → active → extraction → complete/failed. Emit a phase update when the narrative clearly signals the shift (plan approved → "go", objectives met → extraction begins, exfil complete → complete, catastrophic failure → failed). Do not promote phases on ambiguous beats.

**Exploration state** — When an active explorationState exists and the narrative enters, explores, or leaves an area, update explored / current / unexplored accordingly. Move the named area from unexplored → current on entry, and from current → explored on exit. If the narrative describes the facility's alert level changing (silent → alerted → locked down), update it.

**Ship / asset updates** — Hull damage taken or repaired, system damage (shields, weapons, drives) flipping between operational and damaged, and newly acquired upgrades or assets should all be emitted. Check current ship/asset state before writing — only report deltas.

**Tactical facts** — When the narrative confirms a new fact about an active operation (exact enemy count, patrol timing, door code, interior layout), append it to tacticalFacts. These are facts the PC now knows for planning; do not append rumors or speculation.

## CONTEXTUAL EXTRACTIONS (require conversation history)

**Threads** — Did an existing thread advance? Check active threads in state and compare. Did a NEW storyline emerge from this turn's events? Add it. Threads that were mentioned but unchanged do NOT need updating. When adding a new thread, populate Stage 1 fields when they can be inferred from the narrative: owner (the NPC name or faction driving it — not "unknown"), resolution_criteria (what would resolve it), failure_mode (what happens if ignored), relevant_npcs (secondary NPCs whose presence surfaces it), and retrieval_cue (when this thread becomes worth pulling back into a scene — e.g., "every scene at the courthouse reads through this"). If you cannot infer a field, omit it; missing values are logged for measurement.

**Promises** — Did the PC commit to something, or fulfill/break a prior commitment? Check active promises in state. When adding a new promise, populate anchored_to with the thread ID(s) or arc ID(s) this commitment locks into shape, and retrieval_cue (when the promise should surface). Missing values are logged.

**Decisions** — Did the PC make a choice that closes off alternatives? (alliances, accusations, commitments, moral choices) These are player-driven, not GM-driven. When adding a new decision, populate anchored_to with the thread ID(s) or arc ID(s) this choice constrains, and retrieval_cue (what future scene should recall this). Missing values are logged.

**Retrieval cues on new entities (NPCs, clues, factions, arcs).** When writing a new entity, also provide retrieval_cue — one short line naming when this entity becomes relevant in a future scene. Not a description or title, a salience pointer ("knows the Maren case", "holds access to the Synod archive"). Missing values are logged as STAGE2_CUE_MISS.

**Clocks** — Should a tension clock tick? Check active clocks — if the narrative describes progress or setback toward a clock's trigger, advance it.

**Signal close** — Compare the chapter frame objective against what happened. If the objective is clearly resolved or failed by this turn's events, include signal_close with a reason.

**Reframe detection** — If the prior chapter objective resolved AND this turn establishes a new crucible of a DIFFERENT kind (different type of pressure, not a continuation of the same investigation), emit \`reframe\` with new_objective, new_crucible, and reason. Criterion: the chapter's central question has changed shape. If the narrative continues the same investigation in more detail, do NOT reframe. Reframe is an alternative to signal_close for when the chapter has room left to run but its center of pressure has moved. One reframe per chapter is the expected ceiling.

**Do NOT create arcs eagerly.** Arcs require the retrospective judgment of "this will span multiple chapters and define campaign-level stakes." That judgment is usually only possible at chapter close. When in doubt, create a thread instead. A thread can be promoted to an arc later if it turns out to span chapters with no single resolution. An arc cannot easily be downgraded to a thread without breaking the arc/episode structure. If you DO emit arc_updates.create_arc, it must include spans_chapters >= 3, a stakes_definition (what this defines about the character's stance, distinct from the title), and 2-4 episodes. The handler rejects arcs that fail these gates.

## RULES
- Extract ONLY what is stated or clearly implied. Do NOT invent events or infer beyond what the text supports.
- When in doubt about a disposition shift, include it — false negatives are worse than false positives here.
- If the narrative describes any state change covered above, emit commit_turn. Err toward emitting when uncertain — false positives are recoverable, false negatives are not.

## ANTI-INVENTION (critical)

"Clearly implied" is a narrow standard. It means the text contains enough for a reader to conclude the fact without leaping. It does NOT mean the text suggests a theme that the fact would fit. Examples:

**Narrative says:** "The ledger shows a consulting fee line item, dated six weeks before the collapse."
- ✅ STATED / CLEARLY IMPLIED: a payment was made to someone as a consulting fee; the timing is six weeks before the collapse.
- ❌ INVENTED: the specific amount "$40,000" — the text does not state an amount. Do NOT put a number in the clue content.

**Narrative says:** "Nine people died in the collapse."
- ✅ STATED: nine fatalities.
- ❌ INVENTED: "Voss attended the memorial" — the text mentions neither a memorial nor Voss attending one.

**Narrative says:** Carla cannot place a name to the silent partner behind the holding company. She sits with her working theory.
- ✅ STATED: the silent partner's identity is unknown to Carla.
- ❌ INVENTED: "Morello" as a specific name — if the narrative did not introduce that name in-scene, the extractor CANNOT surface it. Names, numbers, and connections appear in state ONLY after the narrative has introduced them.

**Rule:** If the fact requires filling in a blank (a specific number, a specific name, a specific connection the text did not draw), it's invention. Omit it. The prose can be evocative and atmospheric without the extractor inventing concrete specifics to match.

**Test before emitting any fact:** Can you quote the phrase from the narrative that states or clearly implies this fact? If no, do not emit it.` },
          ]
          const loopResult = await runToolLoop(extractSystem, extractMessages, send, false, { model: MODEL, tools: auditTools, maxRounds: 1, maxTokens: 8192 })
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
