import {
  parseSf2NarratorStreamEvent,
  type Sf2NarratorRollPromptEvent,
} from '@/lib/sf2/narrator/stream-protocol'
import { extractAnthropicErrorMessage } from '@/lib/anthropic-error'
import type { DebugEntry, TokenUsage } from '@/lib/sf2/diagnostics-store'
import type { Sf2TurnPipelineEvent } from '@/lib/sf2/runtime/turn-pipeline'
import { applySf2RollResourceSpends } from '@/lib/sf2/rolls/resolve'
import type {
  Sf2RollDiceMode,
  Sf2RollResolutionKind,
  Sf2RollResourceSpend,
  Sf2RollSourceBreakdown,
  Sf2SelectedRollAction,
  Sf2State,
  Sf2WorkingSet,
} from '@/lib/sf2/types'

export interface Sf2ClientPendingCheck {
  toolUseId: string
  skill: string
  dc: number
  why: string
  consequenceOnFail: string
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
  priorMessages: unknown[]
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

export interface Sf2ClientRollOutcome {
  d20?: number
  rawRolls?: number[]
  modifier: number
  total: number
  dc: number
  effectiveDc?: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  resolutionKind?: Sf2RollResolutionKind
  diceMode?: Sf2RollDiceMode
  criticalRange?: number
  sourceBreakdown?: Sf2RollSourceBreakdown[]
  selectedRollAction?: Sf2SelectedRollAction
  spentResources?: Sf2RollResourceSpend[]
  skill?: string
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  inspirationSpent?: boolean
  originalRoll?: Sf2ClientRollOutcome
}

export interface Sf2ClientLiveRollView {
  id: string
  proseOffset: number
  check: {
    skill: string
    dc: number
    why: string
    consequenceOnFail: string
    modifierType?: 'advantage' | 'disadvantage' | 'challenge'
    modifierReason?: string
  }
  outcome?: Sf2ClientRollOutcome
}

export interface RunSf2ClientNarratorTurnInput {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  fetchNarrator: (body: unknown) => Promise<Response>
  requestRoll: (prompt: Sf2ClientPendingCheck) => Promise<Sf2ClientRollOutcome>
  effects: {
    onStreamingChange: (streaming: boolean) => void
    onProse: (prose: string) => void
    onSuggestedActions: (actions: string[]) => void
    onPendingCheck: (prompt: Sf2ClientPendingCheck | null) => void
    onRollResult: (outcome: Sf2ClientRollOutcome | null) => void
    onLiveRollAdded: (roll: Sf2ClientLiveRollView) => void
    onInspirationOffer: (outcome: Sf2ClientRollOutcome | null) => void
    onResetPendingInspirationSpend: () => void
    onAnnotation?: (annotation: Record<string, unknown>) => void
    onNarratorUsage: (usage: TokenUsage) => void
    onDiagnostic: (entry: DebugEntry) => void
  }
}

export interface RunSf2ClientNarratorTurnResult {
  completed: boolean
  prose: string
  annotation: Record<string, unknown> | null
  errorMessage?: string
  bundleBuilt: Sf2State['world']['sceneBundleCache'] | null
  rollRecords: Sf2State['history']['rollLog']
  sentinelEvents: Sf2TurnPipelineEvent[]
  workingSet: Sf2WorkingSet | null
}

type RollResolution = {
  toolUseId: string
  skill: string
  dc: number
  effectiveDc?: number
  d20?: number
  modifier: number
  total: number
  result: Sf2ClientRollOutcome['result']
  resolutionKind?: Sf2RollResolutionKind
  diceMode?: Sf2RollDiceMode
  criticalRange?: number
  sourceBreakdown?: Sf2RollSourceBreakdown[]
  selectedRollAction?: Sf2SelectedRollAction
  spentResources?: Sf2RollResourceSpend[]
  modifierType?: Sf2ClientRollOutcome['modifierType']
  modifierReason?: string
  priorMessages: unknown[]
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

function rollOutcomeForLog(result: Sf2ClientRollOutcome['result']) {
  if (result === 'critical') return 'critical_success'
  if (result === 'fumble') return 'critical_failure'
  return result
}

function rollFailureSummary(result: Sf2ClientRollOutcome['result'], consequenceOnFail: string): string | undefined {
  if (result !== 'failure' && result !== 'fumble') return undefined
  const trimmed = consequenceOnFail.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function formatNarratorHttpError(status: number, body: unknown): string {
  const bodyMessage = extractAnthropicErrorMessage(body)
  return bodyMessage ? `HTTP ${status}: ${bodyMessage}` : `HTTP ${status}`
}

export async function runSf2ClientNarratorTurn(
  input: RunSf2ClientNarratorTurnInput
): Promise<RunSf2ClientNarratorTurnResult> {
  const { effects, isInitial, playerInput, turnIndex } = input
  let currentState = input.state

  effects.onStreamingChange(true)
  effects.onProse('')
  effects.onSuggestedActions([])
  effects.onPendingCheck(null)
  effects.onRollResult(null)
  effects.onInspirationOffer(null)
  effects.onResetPendingInspirationSpend()

  let proseAccum = ''
  let annotation: Record<string, unknown> | null = null
  let rollResolution: RollResolution | null = null
  let bundleBuilt: Sf2State['world']['sceneBundleCache'] | null = null
  let turnWorkingSet: Sf2WorkingSet | null = null
  const rollRecords: Sf2State['history']['rollLog'] = []
  const turnSentinelEvents: Sf2TurnPipelineEvent[] = []

  try {
    while (true) {
      const body = rollResolution
        ? {
            state: currentState,
            playerInput: isInitial ? '' : playerInput,
            isInitial: false,
            rollResolution,
          }
        : {
            state: currentState,
            playerInput: isInitial ? '' : playerInput,
            isInitial,
          }

      const res = await input.fetchNarrator(body)

      if (!res.ok || !res.body) {
        let errorBody: unknown = null
        try { errorBody = await res.json() } catch {
          try { errorBody = await res.text() } catch {}
        }
        effects.onDiagnostic({ kind: 'error', at: Date.now(), data: { status: res.status, source: 'narrator', body: errorBody } })
        return {
          completed: false,
          prose: proseAccum,
          annotation,
          errorMessage: formatNarratorHttpError(res.status, errorBody),
          bundleBuilt,
          rollRecords,
          sentinelEvents: turnSentinelEvents,
          workingSet: turnWorkingSet,
        }
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sawRollPrompt: Sf2NarratorRollPromptEvent | null = null
      let sawNarrateTurn = false
      let sawStreamError = false
      let streamErrorMessage: string | undefined

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let decoded: unknown
          try { decoded = JSON.parse(line) } catch { continue }
          const event = parseSf2NarratorStreamEvent(decoded)
          if (!event) continue
          switch (event.type) {
            case 'text': {
              proseAccum += event.content
              effects.onProse(proseAccum)
              break
            }
            case 'roll_prompt': {
              sawRollPrompt = event
              break
            }
            case 'narrate_turn': {
              annotation = event.input
              sawNarrateTurn = true
              effects.onDiagnostic({ kind: 'narrate_turn', at: Date.now(), data: annotation })
              effects.onSuggestedActions((annotation?.suggested_actions as string[] | undefined) ?? [])
              effects.onAnnotation?.(annotation)
              break
            }
            case 'token_usage': {
              effects.onNarratorUsage(event.usage)
              effects.onDiagnostic({ kind: 'token_usage', at: Date.now(), data: { role: 'narrator', ...event.usage } })
              break
            }
            case 'latency': {
              effects.onDiagnostic({ kind: 'latency', at: Date.now(), data: { role: event.role, ...event.latency } })
              break
            }
            case 'working_set':
              turnWorkingSet = event.workingSet
              effects.onDiagnostic({ kind: 'working_set', at: Date.now(), data: event.summary })
              break
            case 'scene_bundle_built': {
              const built = {
                sceneId: event.sceneId,
                bundleText: event.bundleText,
                builtAtTurn: event.builtAtTurn,
              }
              bundleBuilt = built
              effects.onDiagnostic({
                kind: 'scene_bundle_built',
                at: Date.now(),
                data: {
                  sceneId: built.sceneId,
                  builtAtTurn: built.builtAtTurn,
                  bundleBytes: built.bundleText.length,
                },
              })
              break
            }
            case 'pacing_advisory':
              effects.onDiagnostic({ kind: 'pacing_advisory', at: Date.now(), data: event })
              break
            case 'narrator_meta_observed':
              effects.onDiagnostic({
                kind: 'narrator_meta_observed',
                at: Date.now(),
                data: {
                  pattern: String(event.pattern ?? ''),
                  snippet: event.snippet,
                  turnIndex: event.turnIndex,
                },
              })
              break
            case 'narrator_output_recovered':
              effects.onDiagnostic({
                kind: 'narrator_output_recovered',
                at: Date.now(),
                data: {
                  recoveryNotes: event.recoveryNotes,
                  turnIndex: event.turnIndex,
                },
              })
              break
            case 'truncation_warning':
              effects.onDiagnostic({ kind: 'truncation', at: Date.now(), data: event })
              break
            case 'display_sentinel': {
              const findings = event.findings
              const mode = event.mode
              const repaired = event.repaired
              if (repaired && typeof event.repairedProse === 'string') {
                proseAccum = event.repairedProse
                effects.onProse(proseAccum)
              }
              const entry: Sf2TurnPipelineEvent = {
                kind: 'display_sentinel',
                at: Date.now(),
                data: { mode, repaired, findings, findingCount: findings.length },
              }
              turnSentinelEvents.push(entry)
              effects.onDiagnostic(entry)
              break
            }
            case 'error':
              sawStreamError = true
              streamErrorMessage = event.message
              effects.onDiagnostic({ kind: 'error', at: Date.now(), data: streamErrorMessage })
              break
            case 'done':
              break
          }
        }
      }

      if (sawStreamError) {
        return {
          completed: false,
          prose: proseAccum,
          annotation,
          errorMessage: streamErrorMessage,
          bundleBuilt,
          rollRecords,
          sentinelEvents: turnSentinelEvents,
          workingSet: turnWorkingSet,
        }
      }

      if (sawRollPrompt) {
        const rollId = sawRollPrompt.toolUseId || `roll_${turnIndex}_${rollRecords.length}`
        const proseOffset = proseAccum.length
        effects.onRollResult(null)
        effects.onPendingCheck(sawRollPrompt)
        effects.onLiveRollAdded({
          id: rollId,
          proseOffset,
          check: {
            skill: sawRollPrompt.skill,
            dc: sawRollPrompt.dc,
            why: sawRollPrompt.why,
            consequenceOnFail: sawRollPrompt.consequenceOnFail,
            modifierType: sawRollPrompt.modifierType,
            modifierReason: sawRollPrompt.modifierReason,
          },
        })
        const outcome = await input.requestRoll(sawRollPrompt)
        effects.onPendingCheck(null)
        effects.onRollResult(outcome)
        if (outcome.inspirationSpent) {
          currentState = structuredClone(currentState)
          currentState.player.inspiration = Math.max(0, currentState.player.inspiration - 1)
        }
        if (outcome.spentResources && outcome.spentResources.length > 0) {
          currentState = applySf2RollResourceSpends(currentState, outcome.spentResources)
        }
        effects.onDiagnostic({
          kind: 'roll',
          at: Date.now(),
          data: {
            ...outcome,
            skill: sawRollPrompt.skill,
            dc: sawRollPrompt.dc,
            why: sawRollPrompt.why,
            consequenceOnFail: sawRollPrompt.consequenceOnFail,
            requestedSkill: sawRollPrompt.requestedSkill,
            intendedSkills: sawRollPrompt.intendedSkills,
            skillOverrideReason: sawRollPrompt.skillOverrideReason,
            turnIndex,
          },
        })
        rollRecords.push({
          turn: turnIndex,
          proseOffset,
          skill: sawRollPrompt.skill,
          intendedSkill: sawRollPrompt.intendedSkills?.[0],
          intendedSkills: sawRollPrompt.intendedSkills,
          requestedSkill: sawRollPrompt.requestedSkill,
          skillOverrideReason: sawRollPrompt.skillOverrideReason,
          dc: sawRollPrompt.dc,
          effectiveDc: outcome.effectiveDc,
          rollResult: outcome.d20,
          rawRolls: outcome.rawRolls,
          modifier: outcome.modifier,
          total: outcome.total,
          outcome: rollOutcomeForLog(outcome.result),
          resolutionKind: outcome.resolutionKind,
          diceMode: outcome.diceMode,
          criticalRange: outcome.criticalRange,
          sourceBreakdown: outcome.sourceBreakdown,
          selectedRollAction: outcome.selectedRollAction,
          spentResources: outcome.spentResources,
          consequenceSummary: rollFailureSummary(outcome.result, sawRollPrompt.consequenceOnFail),
          modifierType: outcome.modifierType,
          modifierReason: outcome.modifierReason,
          inspirationSpent: outcome.inspirationSpent,
          originalRoll: outcome.originalRoll && outcome.originalRoll.d20 !== undefined
            ? {
                rollResult: outcome.originalRoll.d20,
                modifier: outcome.originalRoll.modifier,
                total: outcome.originalRoll.total,
                outcome: rollOutcomeForLog(outcome.originalRoll.result),
              }
            : undefined,
        })

        rollResolution = {
          toolUseId: sawRollPrompt.toolUseId,
          skill: sawRollPrompt.skill,
          dc: sawRollPrompt.dc,
          effectiveDc: outcome.effectiveDc,
          d20: outcome.d20,
          modifier: outcome.modifier,
          total: outcome.total,
          result: outcome.result,
          resolutionKind: outcome.resolutionKind,
          diceMode: outcome.diceMode,
          criticalRange: outcome.criticalRange,
          sourceBreakdown: outcome.sourceBreakdown,
          selectedRollAction: outcome.selectedRollAction,
          spentResources: outcome.spentResources,
          modifierType: outcome.modifierType,
          modifierReason: outcome.modifierReason,
          priorMessages: sawRollPrompt.priorMessages,
          originalInput: sawRollPrompt.originalInput,
          currentIntent: sawRollPrompt.currentIntent,
          remainingIntents: sawRollPrompt.remainingIntents,
        }
        continue
      }

      if (sawNarrateTurn) break

      effects.onDiagnostic({
        kind: 'error',
        at: Date.now(),
        data: {
          source: 'narrator',
          message: 'stream ended before narrate_turn; turn was not committed',
        },
      })
      return {
        completed: false,
        prose: proseAccum,
        annotation,
        errorMessage: 'stream ended before narrate_turn; turn was not committed',
        bundleBuilt,
        rollRecords,
        sentinelEvents: turnSentinelEvents,
        workingSet: turnWorkingSet,
      }
    }

    return {
      completed: true,
      prose: proseAccum,
      annotation,
      bundleBuilt,
      rollRecords,
      sentinelEvents: turnSentinelEvents,
      workingSet: turnWorkingSet,
    }
  } finally {
    effects.onStreamingChange(false)
  }
}
