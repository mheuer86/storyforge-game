import type { GameState, StreamEvent, ToolCallResult, RollBreakdown, RejectionRecord } from './types'
import { drainDbg, type StatChange } from './tool-processor'
import { runRulesEngine } from './rules-engine'
import { ensureInstrumentation, pushRejection } from './instrumentation'
import { applyInstrumentEvent } from './instrumentation/counters'

// ─── Debug context dedup ─────────────────────────────────────────────
// The static system block is ~2200 tokens and changes only when the
// situation module switches. Emit the full block only on first sight
// and on change; emit a one-liner otherwise so the exported log stays
// readable.
const lastDebugHash = new Map<string, string>()

function fingerprint(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 33) ^ s.charCodeAt(i)
  return (h >>> 0).toString(16).padStart(8, '0')
}

// ─── Parser state: accumulated across stream events ──────────────────

export interface StreamParserState {
  gmText: string
  gameState: GameState
  statChanges: StatChange[]
  lastRollBreakdown?: RollBreakdown
  finalActions: string[]
  sceneEndSummary?: string
  sceneToneSignature?: string
  lastCommitInput?: Record<string, unknown>
}

export function createParserState(initialGameState: GameState): StreamParserState {
  return {
    gmText: '',
    gameState: initialGameState,
    statChanges: [],
    finalActions: [],
  }
}

// ─── Callbacks for React/UI side effects ─────────────────────────────

export interface StreamParserCallbacks {
  onTextUpdate: (gmText: string) => void
  onChapterTitle: (title: string, headerContent: string) => void
  onRollPrompt: (prompt: StreamRollPrompt) => void
  onTokenUsage: (usage: { inputTokens: number; outputTokens: number; cacheWriteTokens: number; cacheReadTokens: number; thinkingBudget?: number }) => void
  onQuickActions: (actions: string[]) => void
  onRollBreakdown: (breakdown: RollBreakdown) => void
  onRetrying: (delayMs: number) => void
  onError: (message: string) => void
  onDone: (finalState: GameState, statChanges: StatChange[], gmText: string, lastCommitInput: Record<string, unknown> | undefined) => void
  onDebug: (message: string) => void
  applyTools: (results: ToolCallResult[], state: GameState, statChanges: StatChange[]) => GameState
}

export interface StreamRollPrompt {
  check: string
  stat: string
  dc: number
  modifier: number
  reason: string
  toolUseId: string
  pendingMessages: unknown[]
  pendingState: GameState
  advantage?: 'advantage' | 'disadvantage'
  contested?: { npcName: string; npcSkill: string; npcModifier: number }
  priorToolResults?: unknown[]
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
}

// ─── Core parser: processes one stream event ─────────────────────────

export function processStreamEvent(
  event: StreamEvent,
  state: StreamParserState,
  gmMsgId: string,
  isMetaQuestion: boolean,
  callbacks: StreamParserCallbacks,
): StreamParserState {
  // Work on a shallow copy so callers see the updated state
  let s = { ...state }

  if (event.type === 'text') {
    s.gmText += event.content
    callbacks.onTextUpdate(s.gmText)
    return s
  }

  if (event.type === 'chapter_title') {
    const title = event.title
    if (title) {
      s.gameState = {
        ...s.gameState,
        meta: { ...s.gameState.meta, chapterTitle: title },
        history: {
          ...s.gameState.history,
          chapters: s.gameState.history.chapters.map((ch, i) =>
            i === s.gameState.history.chapters.length - 1 ? { ...ch, title } : ch
          ),
        },
      }
      const headerContent = `Chapter ${s.gameState.meta.chapterNumber}: ${title}`
      callbacks.onChapterTitle(title, headerContent)
    }
    return s
  }

  if (event.type === 'roll_prompt') {
    callbacks.onRollPrompt({
      check: event.check,
      stat: event.stat,
      dc: event.dc,
      modifier: event.modifier,
      reason: event.reason,
      toolUseId: event.toolUseId,
      pendingMessages: event.pendingMessages,
      pendingState: s.gameState,
      advantage: event.advantage,
      contested: event.contested,
      priorToolResults: event.priorToolResults,
      sides: event.sides,
      rollType: event.rollType,
      damageType: event.damageType,
    })
    return s
  }

  if (event.type === 'token_usage') {
    callbacks.onTokenUsage(event.usage)
    return s
  }

  if (event.type === 'truncation_warning') {
    callbacks.onDebug(
      `⚠ TRUNCATION_WARNING model=${event.model} round=${event.round} output_tokens=${event.outputTokens} tool_use_blocks=${event.toolUseBlocks} has_tools=${event.hasTools}`
    )
    return s
  }

  if (event.type === 'debug_context') {
    const hash = fingerprint(event.content)
    const prior = lastDebugHash.get(event.label)
    if (prior === hash) {
      callbacks.onDebug(`=== ${event.label} unchanged (hash: ${hash}, ~${event.tokenEstimate} tokens) ===`)
    } else {
      lastDebugHash.set(event.label, hash)
      callbacks.onDebug(
        `=== BEGIN ${event.label} (hash: ${hash}, ~${event.tokenEstimate} tokens) ===\n${event.content}\n=== END ${event.label} ===`
      )
    }
    return s
  }

  if (event.type === 'tools') {
    s = processToolsEvent(event, s, callbacks)
    return s
  }

  if (event.type === 'done') {
    s = processDoneEvent(s, gmMsgId, isMetaQuestion, callbacks)
    return s
  }

  if (event.type === 'retrying') {
    callbacks.onRetrying(event.delayMs)
    s.gmText = ''
    return s
  }

  if (event.type === 'error') {
    callbacks.onError(event.message)
    return s
  }

  if (event.type === 'instrument') {
    callbacks.onDebug(event.line)
    ensureInstrumentation(s.gameState)
    // Counter accumulation: WRITE / FIREWALL_OBSERVATION / ENTITY_CREATION /
    // TURN_TIMING payloads bump global and per-genre counters on the session
    // state. Rejection payloads additionally land in the rejection buffer.
    applyInstrumentEvent(s.gameState, event)
    if (event.channel === 'REJECTION_RECORD' && event.payload) {
      pushRejection(s.gameState, event.payload as RejectionRecord)
    }
    return s
  }

  return s
}

// ─── Tools event processing ──────────────────────────────────────────

function processToolsEvent(
  event: StreamEvent & { type: 'tools' },
  state: StreamParserState,
  callbacks: StreamParserCallbacks,
): StreamParserState {
  const s = { ...state }

  const commitTool = event.results.findLast((r) => r.tool === 'commit_turn')
  if (commitTool) {
    s.lastCommitInput = commitTool.input as Record<string, unknown>

    // Debug log commit_turn contents
    const ci = commitTool.input as Record<string, unknown>
    const logParts: string[] = []
    if (ci.world && typeof ci.world === 'object') {
      const w = ci.world as Record<string, unknown>
      if (w.set_location) logParts.push(`set_location=${JSON.stringify(w.set_location)}`)
      if (w.set_scene_snapshot) logParts.push(`snapshot="${w.set_scene_snapshot}"`)
      if (w.add_npcs) logParts.push(`add_npcs=${(w.add_npcs as Array<{name: string}>).map(n => n.name).join(',')}`)
      if (w.update_npcs) logParts.push(`update_npcs=${(w.update_npcs as Array<{name: string}>).map(n => n.name).join(',')}`)
      if (w.disposition_changes) logParts.push(`dispositions=${JSON.stringify(w.disposition_changes)}`)
      if (w.set_exploration) logParts.push('set_exploration=yes')
      if (w.cohesion) logParts.push(`cohesion=${JSON.stringify(w.cohesion)}`)
    }
    if (ci.scene_end) logParts.push(`scene_end=true`)
    if (ci.scene_summary) logParts.push(`scene_summary="${ci.scene_summary}"`)
    if (ci.tone_signature) logParts.push(`tone="${ci.tone_signature}"`)
    if (ci.chapter_frame) logParts.push(`frame=${JSON.stringify(ci.chapter_frame)}`)
    if (ci.signal_close) logParts.push(`signal_close=${JSON.stringify(ci.signal_close)}`)
    if (ci.objective_status) logParts.push(`objective_status=${ci.objective_status}`)
    if (ci.arc_updates) logParts.push(`arc_updates=${JSON.stringify(ci.arc_updates)}`)
    if (ci.character && typeof ci.character === 'object') {
      const ch = ci.character as Record<string, unknown>
      if (ch.hp_delta) logParts.push(`hp_delta=${ch.hp_delta}`)
      if (ch.credits_delta) logParts.push(`credits_delta=${ch.credits_delta}`)
    }
    callbacks.onDebug(`COMMIT_TURN ${logParts.join(' | ')}`)

    // Extract suggested_actions
    const commitInput = commitTool.input as { suggested_actions?: string[] }
    if (commitInput.suggested_actions && commitInput.suggested_actions.length > 0) {
      s.finalActions = commitInput.suggested_actions
      callbacks.onQuickActions(s.finalActions)
    }

    // Extract enemy roll breakdown
    const charInput = commitTool.input as { character?: { roll_breakdown?: RollBreakdown } }
    if (charInput.character?.roll_breakdown) {
      s.lastRollBreakdown = charInput.character.roll_breakdown
    }

    // Extract scene boundary
    const sceneInput = commitTool.input as { scene_end?: boolean; scene_summary?: string; tone_signature?: string; world?: { set_location?: unknown } }
    const hasLocationChange = !!sceneInput.world?.set_location
    const hasSceneEnd = !!sceneInput.scene_end
    if (hasSceneEnd || hasLocationChange) {
      if (sceneInput.scene_summary) {
        s.sceneEndSummary = sceneInput.scene_summary
      } else if (hasLocationChange && !hasSceneEnd) {
        s.sceneEndSummary = '[Scene boundary detected from location change]'
      }
      if (sceneInput.tone_signature) {
        s.sceneToneSignature = sceneInput.tone_signature
      }
    }
  }

  const metaTool = event.results.find((r) => r.tool === 'meta_response')
  if (metaTool) {
    const metaContent = (metaTool.input as { content: string }).content
    if (!s.gmText.trim()) {
      s.gmText = metaContent
    }
    callbacks.onTextUpdate(s.gmText)
  }

  // Apply state changes (excluding meta_response)
  const stateResults = event.results.filter((r) => r.tool !== 'meta_response')
  if (stateResults.length > 0) {
    // Drain any dbg() output emitted during applyTools (handler-level writes:
    // ENTITY_WRITE, STAGE1_*, REFRAME, ARC_CREATE_REJECTED, DECISION_REJECTED, etc.).
    // Drain before + after so messages emitted on other paths (e.g. audit) are
    // also captured, not just those from this apply.
    for (const m of drainDbg()) callbacks.onDebug(m)
    s.gameState = callbacks.applyTools(stateResults, s.gameState, s.statChanges)
    for (const m of drainDbg()) callbacks.onDebug(m)
    delete (s.gameState as GameState & { _sceneBreaks?: string[] })._sceneBreaks

    if (s.statChanges.length > 0) {
      callbacks.onDebug(`STATE_CHANGES ${s.statChanges.map(sc => `[${sc.type}] ${sc.label}`).join(' | ')}`)
    }
    const ss = s.gameState.sceneSummaries ?? []
    if (ss.length > 0) {
      callbacks.onDebug(`SCENE_SUMMARIES count=${ss.length} latest="${ss[ss.length - 1].text.slice(0, 80)}..."`)
    }
    if (s.gameState._pendingSceneSummary) {
      callbacks.onDebug(`⚠ PENDING_SCENE_SUMMARY flag=true (location changed without scene_end)`)
    }
    if (s.gameState._objectiveResolvedAtTurn) {
      const currentTurn = s.gameState.history.messages.filter(m => m.role === 'player').length
      const since = currentTurn - s.gameState._objectiveResolvedAtTurn
      callbacks.onDebug(`CLOSE_STATUS resolved_at_turn=${s.gameState._objectiveResolvedAtTurn} turns_since=${since}`)
    }
    const arcs = s.gameState.arcs ?? []
    if (arcs.length > 0) {
      callbacks.onDebug(`ARCS ${arcs.map(a => `${a.id}[${a.status}]`).join(', ')}`)
    }
  }

  return s
}

// ─── Done event: finalize state ──────────────────────────────────────

function processDoneEvent(
  state: StreamParserState,
  gmMsgId: string,
  isMetaQuestion: boolean,
  callbacks: StreamParserCallbacks,
): StreamParserState {
  const s = { ...state }

  // Quick actions
  if (s.finalActions.length === 0 && !isMetaQuestion) {
    callbacks.onQuickActions([])
    callbacks.onDebug(`⚠ QUICK_ACTIONS none (Claude did not include suggested_actions)`)
  } else if (s.finalActions.length > 0) {
    callbacks.onDebug(`QUICK_ACTIONS [${s.finalActions.join(' | ')}]`)
  }

  // NO_COMMIT_TURN flag
  if (!s.lastCommitInput && !isMetaQuestion) {
    s.gameState = { ...s.gameState, _noCommitLastTurn: true } as GameState & { _noCommitLastTurn?: boolean }
    callbacks.onDebug(`⚠ NO_COMMIT_TURN (narrative only, no state changes)`)
  } else if (s.lastCommitInput) {
    const { _noCommitLastTurn, ...rest } = s.gameState as GameState & { _noCommitLastTurn?: boolean }
    s.gameState = rest as GameState
  }

  // Clear one-shot warning flags on meta after a successful commit_turn so
  // they surface in the next turn's dynamic state exactly once.
  if (s.lastCommitInput) {
    const meta = s.gameState.meta as unknown as Record<string, unknown>
    if (meta._depletedItemUseAttempt) {
      const { _depletedItemUseAttempt, ...restMeta } = meta
      void _depletedItemUseAttempt
      s.gameState = { ...s.gameState, meta: restMeta as unknown as typeof s.gameState.meta }
    }
  }

  // Add GM message to history
  const gmRole = isMetaQuestion ? 'meta-response' : 'gm'
  let finalState: GameState = {
    ...s.gameState,
    history: {
      ...s.gameState.history,
      messages: [
        ...s.gameState.history.messages,
        {
          id: gmMsgId,
          role: gmRole as 'gm' | 'meta-response',
          content: s.gmText,
          timestamp: new Date().toISOString(),
          ...(s.statChanges.length > 0 && { statChanges: s.statChanges }),
          ...(s.lastRollBreakdown && { rollBreakdown: s.lastRollBreakdown }),
        },
      ],
    },
  }

  // Roll breakdown
  if (s.lastRollBreakdown) {
    callbacks.onRollBreakdown(s.lastRollBreakdown)
  }

  // Scene summary
  if (s.sceneEndSummary) {
    const existing = finalState.sceneSummaries ?? []
    const lastScene = existing[existing.length - 1]
    const fromIdx = lastScene ? lastScene.toMessageIndex + 1 : 0
    const toIdx = finalState.history.messages.length - 1
    const sceneNum = (lastScene?.sceneNumber ?? 0) + 1
    finalState.sceneSummaries = [
      ...existing,
      { text: s.sceneEndSummary, sceneNumber: sceneNum, fromMessageIndex: fromIdx, toMessageIndex: toIdx, ...(s.sceneToneSignature && { toneSignature: s.sceneToneSignature }) },
    ]
  }

  // Scope signals
  if (s.lastCommitInput) {
    let signals = 0
    const world = s.lastCommitInput.world as Record<string, unknown> | undefined
    if (world) {
      if (world.set_location) signals++
      const addNpcs = world.add_npcs as unknown[] | undefined
      if (addNpcs && addNpcs.length >= 3) signals++
      const antagonist = world.antagonist as { action?: string } | undefined
      if (antagonist?.action === 'establish') signals++
      const clocks = world.clocks as { action?: string }[] | undefined
      if (clocks?.some(c => c.action === 'establish')) signals++
      if (world.add_timer) signals++
      if (world.set_operation) signals++
    }
    if (signals > 0) {
      finalState.scopeSignals = (finalState.scopeSignals ?? 0) + signals
    }
  }

  // Rules engine
  finalState = runRulesEngine(finalState, s.lastCommitInput ?? null)

  callbacks.onDone(finalState, s.statChanges, s.gmText, s.lastCommitInput)

  s.gameState = finalState
  return s
}
