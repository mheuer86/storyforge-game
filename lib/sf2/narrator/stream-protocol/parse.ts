import type {
  Sf2NarratorDisplaySentinelEvent,
  Sf2NarratorRollGateRepair,
  Sf2NarratorWorkingSetEvent,
  Sf2NarratorRollModifierType,
  Sf2NarratorStreamEvent,
} from './events'
import { normalizeAnthropicErrorMessage } from '@/lib/anthropic-error'
import type { Sf2NarrativeTempoMode, Sf2WorkingSet } from '@/lib/sf2/types'
import { isSf2NarrativeTempoMode } from '@/lib/sf2/narrative-tempo'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringArray(value: unknown, dropEmpty = false): string[] {
  if (!Array.isArray(value)) return []
  const mapped = value.map(String)
  return dropEmpty ? mapped.filter(Boolean) : mapped
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeRollModifierType(value: unknown): Sf2NarratorRollModifierType | undefined {
  return value === 'advantage' || value === 'disadvantage' || value === 'challenge'
    ? value
    : undefined
}

function normalizeTempoMode(value: unknown): Sf2NarrativeTempoMode | undefined {
  return isSf2NarrativeTempoMode(value) ? value : undefined
}

function normalizeRollGateRepair(value: unknown): Sf2NarratorRollGateRepair | undefined {
  return value === 'not_needed' ||
    value === 'narrator_complied' ||
    value === 'blocked_missing_request_roll' ||
    value === 'missed_expected_roll_allowed' ||
    value === 'hard_gate_missing_request_roll'
    ? value
    : undefined
}

function normalizeDisplaySentinelFindings(value: unknown): Sf2NarratorDisplaySentinelEvent['findings'] {
  if (!Array.isArray(value)) return []
  return value as Sf2NarratorDisplaySentinelEvent['findings']
}

// Browser-facing stream normalizer. These defaults intentionally mirror the
// old app/play/v2/page.tsx switch defaults: malformed fields are softened,
// unknown event types return null, and invalid JSON remains the caller's job
// so line-level parse failures can still be ignored without ending the stream.
export function parseSf2NarratorStreamEvent(value: unknown): Sf2NarratorStreamEvent | null {
  if (!isRecord(value)) return null

  switch (value.type) {
    case 'text':
      return { type: 'text', content: String(value.content ?? '') }

    case 'roll_prompt':
      return {
        type: 'roll_prompt',
        toolUseId: String(value.toolUseId ?? ''),
        skill: String(value.skill ?? ''),
        requestedSkill: optionalString(value.requestedSkill),
        intendedSkills: stringArray(value.intendedSkills, true),
        skillOverrideReason: optionalString(value.skillOverrideReason),
        dc: Number(value.dc ?? 15),
        why: String(value.why ?? ''),
        consequenceOnFail: String(value.consequenceOnFail ?? ''),
        modifierType: normalizeRollModifierType(value.modifierType),
        modifierReason: optionalString(value.modifierReason),
        priorMessages: Array.isArray(value.priorMessages) ? value.priorMessages : [],
        originalInput: optionalString(value.originalInput),
        currentIntent: optionalString(value.currentIntent),
        remainingIntents: Array.isArray(value.remainingIntents)
          ? value.remainingIntents.map(String)
          : undefined,
      }

    case 'narrate_turn':
      return {
        type: 'narrate_turn',
        input: isRecord(value.input) ? value.input : {},
      }

    case 'working_set':
      return {
        type: 'working_set',
        summary: isRecord(value.summary)
          ? value.summary as Sf2NarratorWorkingSetEvent['summary']
          : { full: [], stub: [], excluded: 0, reasons: {} },
        workingSet: (value.workingSet as Sf2WorkingSet | undefined) ?? null,
      }

    case 'pacing_advisory':
      return {
        type: 'pacing_advisory',
        tripped: value.tripped === true,
        reactivityRatio: Number(value.reactivityRatio ?? 0),
        reactivityTripped: value.reactivityTripped === true,
        sceneLinkTripped: value.sceneLinkTripped === true,
        stagnantThreadIds: stringArray(value.stagnantThreadIds),
        arcDormantIds: stringArray(value.arcDormantIds),
        recommendedTempoMode: normalizeTempoMode(value.recommendedTempoMode),
        requiredDelta: optionalString(value.requiredDelta),
        forbiddenRepeat: optionalString(value.forbiddenRepeat),
      }

    case 'scene_bundle_built':
      return {
        type: 'scene_bundle_built',
        sceneId: String(value.sceneId ?? ''),
        bundleText: String(value.bundleText ?? ''),
        builtAtTurn: Number(value.builtAtTurn ?? 0),
      }

    case 'token_usage':
      return {
        type: 'token_usage',
        usage: isRecord(value.usage)
          ? {
              model: String(value.usage.model ?? ''),
              inputTokens: Number(value.usage.inputTokens ?? 0),
              outputTokens: Number(value.usage.outputTokens ?? 0),
              cacheWriteTokens: Number(value.usage.cacheWriteTokens ?? 0),
              cacheReadTokens: Number(value.usage.cacheReadTokens ?? 0),
            }
          : { model: '', inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 },
      }

    case 'latency':
      return {
        type: 'latency',
        role: 'narrator',
        latency: isRecord(value.latency)
          ? {
              totalMs: Number(value.latency.totalMs ?? 0),
              apiMs: Number(value.latency.apiMs ?? 0),
              ttftMs: value.latency.ttftMs === undefined ? undefined : Number(value.latency.ttftMs),
              attempts: value.latency.attempts === undefined ? undefined : Number(value.latency.attempts),
            }
          : { totalMs: 0, apiMs: 0 },
      }

    case 'truncation_warning':
      return { type: 'truncation_warning', outputTokens: Number(value.outputTokens ?? 0) }

    case 'roll_gate_diagnostic':
      return {
        type: 'roll_gate_diagnostic',
        required: value.required === true,
        binding: optionalString(value.binding),
        source: optionalString(value.source),
        kind: optionalString(value.kind),
        skills: Array.isArray(value.skills) ? value.skills.map(String) : undefined,
        reason: optionalString(value.reason),
        sourceId: optionalString(value.sourceId),
        action:
          value.action === 'request_roll' || value.action === 'block_narrate_turn'
            ? value.action
            : 'none',
        repair: normalizeRollGateRepair(value.repair),
      }

    case 'tempo_diagnostic':
      return {
        type: 'tempo_diagnostic',
        recommendedTempoMode: normalizeTempoMode(value.recommendedTempoMode) ?? 'micro_scene',
        chosenTempoMode: normalizeTempoMode(value.chosenTempoMode),
        matched: value.matched === true,
        reason: String(value.reason ?? ''),
        remedy: String(value.remedy ?? ''),
        requiredDelta: optionalString(value.requiredDelta),
        forbiddenRepeat: optionalString(value.forbiddenRepeat),
        sceneExhausted: value.sceneExhausted === true,
        broadGoal: value.broadGoal === true,
      }

    case 'prose_first_close_loop':
      return {
        type: 'prose_first_close_loop',
        input: (isRecord(value.input) ? value.input : {}) as never,
        advisory: (isRecord(value.advisory) ? value.advisory : {}) as never,
      }

    case 'display_sentinel': {
      const mode = String(value.mode ?? 'observe')
      const repaired = value.repaired === true
        || (value.repaired === undefined && mode === 'enforce' && typeof value.repairedProse === 'string')
      return {
        type: 'display_sentinel',
        mode,
        repaired,
        repairedProse: optionalString(value.repairedProse),
        findings: normalizeDisplaySentinelFindings(value.findings),
      }
    }

    case 'narrator_meta_observed':
      return {
        type: 'narrator_meta_observed',
        pattern: String(value.pattern ?? ''),
        snippet: String(value.snippet ?? ''),
        turnIndex: Number(value.turnIndex ?? 0),
      }

    case 'narrator_output_recovered':
      return {
        type: 'narrator_output_recovered',
        recoveryNotes: stringArray(value.recoveryNotes),
        turnIndex: Number(value.turnIndex ?? 0),
      }

    case 'error':
      return {
        type: 'error',
        message: normalizeAnthropicErrorMessage(String(value.message ?? 'Narrator stream failed')),
      }

    case 'done':
      return { type: 'done' }

    default:
      return null
  }
}
