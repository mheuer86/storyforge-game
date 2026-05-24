#!/usr/bin/env node

/**
 * Follow-up harness for optimizing v4 close-loop execution.
 *
 * Usage:
 *   node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs --export <path> --dry-run
 *   node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs --export <path> --compare v4,v4a,v4b,v4c,v4d
 */

import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderSnapshotText } from './close-loop/extract-probes.mjs'
import { extractV4OptimizationProbes } from './close-loop/extract-v4-optimization-probes.mjs'
import {
  buildV4OptimizationProtocol,
  listV4OptimizationVariants,
  V4_OPTIMIZATION_VARIANTS,
} from './close-loop/v4-optimization-variants.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_OUT = path.join(repoRoot, '.scratch/sf2-prose-first-narrator/close-loop/results')
const DEFAULT_MODEL = 'claude-sonnet-4-6'

const EXPERIMENT_TOOLS = [
  {
    name: 'request_roll',
    description: 'Pause narration mid-turn and request a d20 skill check. Call this before narrate_turn at the moment of uncertainty. State stakes in prose first, then stop.',
    input_schema: {
      type: 'object',
      properties: {
        skill: { type: 'string' },
        dc: { type: 'number' },
        why: { type: 'string' },
        consequence_on_fail: { type: 'string' },
        modifier_type: { type: 'string', enum: ['advantage', 'disadvantage', 'challenge'] },
        modifier_reason: { type: 'string' },
      },
      required: ['skill', 'dc', 'why', 'consequence_on_fail'],
    },
  },
  {
    name: 'narrate_turn',
    description: 'Commit the turn once narrative prose is complete. Call exactly once at the end of every complete non-roll turn.',
    input_schema: {
      type: 'object',
      properties: {
        suggested_actions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exactly 3-4 grounded quick actions for the next player input.',
        },
        mechanical_effects: {
          type: 'array',
          items: { type: 'object' },
        },
        authorial_moves: {
          type: 'object',
          properties: {
            pivot_signaled: { type: 'boolean' },
          },
        },
        chapter_status: {
          type: 'object',
          description: 'Hidden experiment-only chapter-loop diagnostics. Do not mention this in player-facing prose.',
          properties: {
            phase: {
              type: 'string',
              enum: ['opening', 'pressure', 'decision', 'aftermath', 'close_candidate', 'closed', 'reframed'],
            },
            foreground_question: { type: 'string' },
            answered: { type: 'boolean' },
            close_candidate: { type: 'boolean' },
            close_intent: {
              type: 'string',
              enum: ['none', 'continue_pressure', 'close_after_current_exchange', 'close_this_turn', 'reframe_this_turn'],
            },
            handover_ready: { type: 'boolean' },
            signals_true: {
              type: 'array',
              items: { type: 'string' },
            },
            never_close_mid_active: {
              type: 'array',
              items: { type: 'string' },
            },
            active_blockers: {
              type: 'array',
              items: { type: 'string' },
            },
            next_required_delta: { type: 'string' },
            should_not_do_next: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
      required: ['suggested_actions', 'chapter_status'],
    },
  },
]

const NARRATE_TURN_TOOL = EXPERIMENT_TOOLS.find((tool) => tool.name === 'narrate_turn')

const CONTROLLER_POLICIES = {
  v4d_completion_retry: {
    completionRetry: true,
  },
  v4d_fact_retry: {
    factLockRetry: true,
  },
  v4d_controller: {
    completionRetry: true,
    schemaRetry: true,
    factLockRetry: true,
  },
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

if (args.listVariants) {
  for (const variant of listV4OptimizationVariants()) {
    console.log(`${variant.key}: ${variant.label}`)
  }
  process.exit(0)
}

if (!args.exportPath) {
  console.error('Error: --export <path> is required. Use --help for usage.')
  process.exit(1)
}

async function main() {
  const probeIds = args.probes ? args.probes.split(',').map((id) => id.trim()).filter(Boolean) : undefined
  const { probes, summary } = extractV4OptimizationProbes(args.exportPath, { probeIds })
  const selectedProbes = filterProbes(probes, args.probeMode)

  console.log('=== V4 CLOSE-LOOP OPTIMIZATION PROBE EXTRACTION ===')
  console.log(`Export: ${args.exportPath}`)
  console.log(`Brief: ${summary.briefId}`)
  console.log(`Transcript: ${summary.playerTurns} player turns / ${summary.narratorTurns} narrator turns / chapter ${summary.chapter}`)
  console.log(`Extracted probes: ${selectedProbes.length}`)
  console.log(`Expected breakdown: ${JSON.stringify(selectedProbes.reduce((acc, probe) => {
    acc[probe.expected] = (acc[probe.expected] ?? 0) + 1
    return acc
  }, {}))}`)

  if (args.dryRun) {
    printDryRun(selectedProbes, args.verbose)
    return
  }

  const variantKeys = resolveVariantKeys(args)
  const client = new Anthropic()
  const results = []

  console.log(`Variants: ${variantKeys.join(', ')}`)
  console.log(`Model: ${args.model}`)
  console.log(`API calls: ${variantKeys.length * selectedProbes.length}`)

  for (const variantKey of variantKeys) {
    console.log(`\n--- Variant ${variantKey}: ${V4_OPTIMIZATION_VARIANTS[variantKey]?.label ?? 'unknown'} ---`)

    for (const probe of selectedProbes) {
      process.stdout.write(`  ${probe.id} (${probe.expected})... `)

      try {
        const result = await runProbe(client, probe, variantKey, args.model)
        const score = scoreV4OptimizationResult(probe, result)
        results.push({ variantKey, probe, result, score })
        console.log(`${score.pass ? 'PASS' : 'FAIL'} ${score.reason}`)

        if (args.verbose && result.prose) {
          console.log(indent(result.prose.slice(0, 700), '    '))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        results.push({
          variantKey,
          probe,
          result: { error: message },
          score: { pass: false, reason: `error: ${message}` },
        })
        console.log(`ERROR ${message}`)
      }

      await sleep(500)
    }
  }

  if (variantKeys.length > 1) {
    printComparison(results, variantKeys, selectedProbes)
    printMetricSummary(results, variantKeys)
  }

  const outDir = args.out ?? DEFAULT_OUT
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-v4-close-loop-optimization.json`)
  writeFileSync(outPath, JSON.stringify({
    exportPath: args.exportPath,
    model: args.model,
    variantKeys,
    summary,
    results: results.map((entry) => ({
      variant: entry.variantKey,
      probe: {
        id: entry.probe.id,
        turn: entry.probe.turn,
        expected: entry.probe.expected,
        label: entry.probe.label,
      },
      score: entry.score,
      result: entry.result,
    })),
  }, null, 2) + '\n')

  console.log(`\nResults saved to: ${outPath}`)
}

async function runProbe(client, probe, variantKey, model) {
  const policy = CONTROLLER_POLICIES[variantKey] ?? {}
  const attempts = []

  let result = await requestProbeTurn(client, probe, variantKey, model)
  attempts.push(describeAttempt('initial', result))

  if (policy.factLockRetry && needsFactLockRetry(probe, result)) {
    result = await requestProbeTurn(client, probe, variantKey, model, buildFactLockCorrection(probe, result))
    attempts.push(describeAttempt('fact_lock_retry', result))
  }

  if (policy.schemaRetry && needsSchemaRetry(result)) {
    result = await requestMetadataRepair(client, probe, variantKey, model, result, 'schema_repair')
    attempts.push(describeAttempt('schema_repair', result))
  }

  if (policy.completionRetry && needsCompletionRetry(result)) {
    result = await requestMetadataRepair(client, probe, variantKey, model, result, 'completion_retry')
    attempts.push(describeAttempt('completion_retry', result))
  }

  result.controller = {
    policy,
    attempts,
  }

  return result
}

async function requestProbeTurn(client, probe, variantKey, model, correction = '') {
  const protocol = buildCloseLoopProtocolWithCorrection(variantKey, probe.advisory, correction)
  const system = [{
    type: 'text',
    text: [`# ${probe.briefTitle ?? probe.briefId ?? 'Campaign brief'}`, probe.briefText, protocol].join('\n\n'),
  }]

  const messages = buildProbeMessages(probe)

  const response = await client.messages.create({
    model,
    max_tokens: 2400,
    system,
    tools: EXPERIMENT_TOOLS,
    tool_choice: { type: 'auto', disable_parallel_tool_use: true },
    messages,
  })

  return analyzeResponse(response)
}

async function requestMetadataRepair(client, probe, variantKey, model, priorResult, repairKind) {
  if (!NARRATE_TURN_TOOL) throw new Error('narrate_turn tool definition missing')

  const correction = buildMetadataRepairCorrection(probe, priorResult, repairKind)
  const protocol = buildCloseLoopProtocolWithCorrection(variantKey, probe.advisory, correction)
  const system = [{
    type: 'text',
    text: [`# ${probe.briefTitle ?? probe.briefId ?? 'Campaign brief'}`, probe.briefText, protocol].join('\n\n'),
  }]

  const messages = buildProbeMessages(probe)
  messages.push({
    role: 'assistant',
    content: priorResult.prose || '[Prior attempt emitted no player-facing prose.]',
  })
  messages.push({
    role: 'user',
    content: [
      '<controller-repair>',
      correction,
      '',
      'Do not add, revise, or continue player-facing prose. Call narrate_turn exactly once with corrected hidden metadata and suggested actions for the prose already written.',
      '</controller-repair>',
    ].join('\n'),
  })

  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system,
    tools: [NARRATE_TURN_TOOL],
    tool_choice: { type: 'tool', name: 'narrate_turn', disable_parallel_tool_use: true },
    messages,
  })

  const repair = analyzeResponse(response)

  return {
    ...priorResult,
    calledNarrateTurn: repair.calledNarrateTurn,
    toolComplete: priorResult.calledRequestRoll || repair.calledNarrateTurn,
    suggestedActions: repair.suggestedActions,
    pivotSignaled: repair.pivotSignaled,
    chapterStatus: repair.chapterStatus,
    closedOrReframed: repair.closedOrReframed,
    stopReason: repair.stopReason,
    usage: combineUsage(priorResult.usage, repair.usage),
    metadataRepair: {
      kind: repairKind,
      proseFromPriorAttempt: true,
    },
  }
}

function buildCloseLoopProtocolWithCorrection(variantKey, advisory, correction = '') {
  return [
    buildV4OptimizationProtocol(variantKey, advisory),
    correction ? `## Controller correction for this retry\n\n${correction}` : '',
  ].filter(Boolean).join('\n\n')
}

function buildProbeMessages(probe) {
  const messages = probe.transcript.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))

  messages.push({
    role: 'user',
    content: `<mechanical-snapshot>\n${renderSnapshotText(probe.mechanicalSnapshot)}\n</mechanical-snapshot>\n\n${probe.playerInput}`,
  })

  return messages
}

function analyzeResponse(response) {
  let prose = ''
  let calledRequestRoll = false
  let calledNarrateTurn = false
  let roll = null
  let suggestedActions = []
  let authorialMoves = {}
  let chapterStatus = null

  for (const block of response.content) {
    if (block.type === 'text') {
      prose += block.text
    }
    if (block.type === 'tool_use') {
      if (block.name === 'request_roll') {
        calledRequestRoll = true
        roll = block.input
      }
      if (block.name === 'narrate_turn') {
        calledNarrateTurn = true
        suggestedActions = block.input.suggested_actions ?? []
        authorialMoves = block.input.authorial_moves ?? {}
        chapterStatus = normalizeChapterStatus(block.input.chapter_status ?? null)
      }
    }
  }

  const phase = chapterStatus?.phase

  return {
    calledRequestRoll,
    calledNarrateTurn,
    toolComplete: calledRequestRoll || calledNarrateTurn,
    roll,
    prose: prose.trim(),
    suggestedActions,
    pivotSignaled: Boolean(authorialMoves?.pivot_signaled),
    chapterStatus,
    closedOrReframed: Boolean(authorialMoves?.pivot_signaled) ||
      ['closed', 'reframed'].includes(phase),
    stopReason: response.stop_reason,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
    },
  }
}

function normalizeChapterStatus(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    const parsed = JSON.parse(value)
    return parsed.chapter_status ?? parsed
  } catch {
    return {
      phase: undefined,
      reason: value,
    }
  }
}

function recoverMalformedChapterStatus(result) {
  const recovered = { ...result }
  const status = recovered.chapterStatus
  if (!status || typeof status.reason !== 'string') return recovered

  const reason = status.reason.trim()
  if (!reason.includes('"phase"') && !reason.includes('authorial_moves')) return recovered

  let parsed = null
  try {
    parsed = JSON.parse(reason)
  } catch {
    const objectMatch = reason.match(/^\s*(\{[\s\S]*?\})\s*,\s*"authorial_moves"/)
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[1])
      } catch {
        parsed = null
      }
    }
  }

  if (parsed) {
    const nestedStatus = parsed.chapter_status ?? parsed
    if (nestedStatus && typeof nestedStatus === 'object') {
      recovered.chapterStatus = { ...status, ...nestedStatus, malformed_nested_status: true }
    }
    if (parsed.authorial_moves?.pivot_signaled) {
      recovered.pivotSignaled = true
    }
  } else {
    const phaseMatch = reason.match(/"phase"\s*:\s*"([^"]+)"/)
    if (phaseMatch) {
      recovered.chapterStatus = {
        ...status,
        phase: status.phase ?? phaseMatch[1],
        malformed_nested_status: true,
      }
    }
    if (/"pivot_signaled"\s*:\s*true/.test(reason)) {
      recovered.pivotSignaled = true
    }
  }

  recovered.closedOrReframed = Boolean(recovered.pivotSignaled) ||
    ['closed', 'reframed'].includes(recovered.chapterStatus?.phase)

  return recovered
}

function needsCompletionRetry(result) {
  return !result.calledRequestRoll && !result.calledNarrateTurn
}

function needsSchemaRetry(result) {
  if (!result.calledNarrateTurn) return false
  const recovered = recoverMalformedChapterStatus(result)
  if (recovered.chapterStatus?.malformed_nested_status) return true
  if (!recovered.chapterStatus?.phase) return true
  return false
}

function needsFactLockRetry(probe, result) {
  if (probe.expected !== 'compress_no_future') return false

  const recovered = recoverMalformedChapterStatus(result)
  const phase = recovered.chapterStatus?.phase

  return recovered.pivotSignaled ||
    recovered.closedOrReframed ||
    phase === 'close_candidate' ||
    Boolean(recovered.chapterStatus?.close_candidate) ||
    hasFutureFactLeak(probe, recovered)
}

function buildFactLockCorrection(probe, result) {
  const recovered = recoverMalformedChapterStatus(result)
  const status = recovered.chapterStatus
  const claimedSignals = Array.isArray(status?.signals_true)
    ? status.signals_true.map((signal) => `- ${signal}`).join('\n')
    : '- none'

  return [
    'The previous attempt is invalid because it closed, marked close_candidate, or counted future facts as already done.',
    '',
    'Code-owned fact lock for this turn:',
    '- Done: Davan/Kes arrangement is sealed by the handshake.',
    '- In flight: Rix is heading to the Pressure Seal to negotiate or accept the broker job.',
    '- Not done: broker deal signed, lien cleared, marker pulled, cargo loaded, ship unclamped, departure authorized, Davan/Kes aboard.',
    '',
    'Hard requirements for the retry:',
    '- Do not close, reframe, or mark close_candidate.',
    '- Set authorial_moves.pivot_signaled to false.',
    '- Use phase "pressure" or "decision", not "close_candidate", "closed", or "reframed".',
    '- chapter_status.signals_true must not mention any Not done fact.',
    '- Move decisively toward the broker decision without adding unrelated side loops.',
    '',
    'Invalid claimed signals from the previous attempt:',
    claimedSignals,
  ].join('\n')
}

function buildMetadataRepairCorrection(probe, priorResult, repairKind) {
  const recovered = recoverMalformedChapterStatus(priorResult)

  if (repairKind === 'schema_repair') {
    return [
      'The previous attempt called narrate_turn with malformed chapter_status.',
      'Do not put JSON inside chapter_status.reason.',
      'Fill the chapter_status object fields directly: phase, foreground_question, answered, close_candidate, close_intent, handover_ready, signals_true, never_close_mid_active, active_blockers, next_required_delta, should_not_do_next, reason.',
      'Preserve the same chapter judgment unless it contradicted the code-owned advisory.',
      `Recovered previous phase: ${recovered.chapterStatus?.phase ?? 'unknown'}.`,
      `Recovered previous pivot: ${recovered.pivotSignaled ? 'true' : 'false'}.`,
    ].join('\n')
  }

  return [
    'The previous attempt ended without narrate_turn.',
    'The player-facing prose is accepted for this repair pass; only hidden turn completion is missing.',
    'Call narrate_turn now with chapter_status based on the prose already written and the code-owned advisory.',
    `Probe expectation: ${probe.expected}.`,
    `Probe advisory: ${probe.advisory}`,
  ].join('\n')
}

function describeAttempt(kind, result) {
  const recovered = recoverMalformedChapterStatus(result)
  return {
    kind,
    toolComplete: recovered.toolComplete,
    calledRequestRoll: recovered.calledRequestRoll,
    calledNarrateTurn: recovered.calledNarrateTurn,
    pivotSignaled: recovered.pivotSignaled,
    phase: recovered.chapterStatus?.phase ?? null,
    malformedNestedStatus: Boolean(recovered.chapterStatus?.malformed_nested_status),
    stopReason: recovered.stopReason,
  }
}

function combineUsage(first, second) {
  if (!first) return second
  if (!second) return first

  return {
    input: (first.input ?? 0) + (second.input ?? 0),
    output: (first.output ?? 0) + (second.output ?? 0),
    cacheWrite: (first.cacheWrite ?? 0) + (second.cacheWrite ?? 0),
    cacheRead: (first.cacheRead ?? 0) + (second.cacheRead ?? 0),
  }
}

function scoreV4OptimizationResult(probe, result) {
  if (result.error) return { pass: false, reason: result.error }

  result = recoverMalformedChapterStatus(result)

  const phase = result.chapterStatus?.phase
  const isCloseCandidate = Boolean(result.chapterStatus?.close_candidate) || phase === 'close_candidate'
  const isClosedOrReframed = result.closedOrReframed
  const actionText = result.suggestedActions.join(' ')
  const actionSuggestsClose = /close chapter|chapter 2|reframe|handover|depart|undock|leave gannett/i.test(actionText)
  const futureFactLeak = hasFutureFactLeak(probe, result)
  const toolComplete = result.toolComplete

  if (probe.expected === 'no_close') {
    const pass = toolComplete && !result.pivotSignaled && !['close_candidate', 'closed', 'reframed'].includes(phase)
    return {
      pass,
      reason: pass
        ? 'kept chapter open with complete tool contract'
        : explainFailure({ toolComplete, phase, pivot: result.pivotSignaled }, 'premature close or missing narrate_turn'),
      metrics: baseMetrics(result, { futureFactLeak }),
    }
  }

  if (probe.expected === 'compress_no_future') {
    const opensNewSideLoop = /investigate the tipster|find another job|return to the board|ask more around the station/i.test(actionText)
    const pass = !result.pivotSignaled && !futureFactLeak && !opensNewSideLoop
    return {
      pass,
      reason: pass
        ? 'compressed toward broker decision without future-fact close'
        : explainFailure({ futureFactLeak, opensNewSideLoop, pivot: result.pivotSignaled }, 'premature close, side loop, or future-fact leak'),
      metrics: baseMetrics(result, { futureFactLeak, opensNewSideLoop }),
    }
  }

  if (probe.expected === 'close_candidate_or_plan') {
    const pass = toolComplete && !futureFactLeak && (isCloseCandidate || isClosedOrReframed || actionSuggestsClose)
    return {
      pass,
      reason: pass
        ? `recognized close pressure (${phase ?? (result.pivotSignaled ? 'pivot' : 'suggested action')})`
        : explainFailure({ toolComplete, futureFactLeak, phase, pivot: result.pivotSignaled }, 'did not produce close candidate or close plan'),
      metrics: baseMetrics(result, { futureFactLeak }),
    }
  }

  if (probe.expected === 'active_revelation_defer') {
    const blocked = statusIndicatesActiveBlocker(result.chapterStatus)
    const pass = toolComplete && !result.pivotSignaled && !isClosedOrReframed && blocked
    return {
      pass,
      reason: pass
        ? 'deferred close because active revelation/NPC exchange is still live'
        : explainFailure({ toolComplete, phase, pivot: result.pivotSignaled, blocked }, 'failed active-scene deferral'),
      metrics: baseMetrics(result, { activeBlockerDetected: blocked }),
    }
  }

  if (probe.expected === 'hard_boundary_strict') {
    const pass = toolComplete && isClosedOrReframed && ['closed', 'reframed'].includes(phase)
    return {
      pass,
      reason: pass
        ? `closed or reframed hard boundary (${phase})`
        : explainFailure({ toolComplete, phase, pivot: result.pivotSignaled }, 'failed strict hard boundary'),
      metrics: baseMetrics(result),
    }
  }

  if (probe.expected === 'close_candidate') {
    const pass = toolComplete && (isCloseCandidate || isClosedOrReframed || actionSuggestsClose)
    return {
      pass,
      reason: pass
        ? `recognized close pressure (${phase ?? (result.pivotSignaled ? 'pivot' : 'suggested action')})`
        : 'did not recognize close candidate',
      metrics: baseMetrics(result),
    }
  }

  return {
    pass: false,
    reason: `unknown expectation ${probe.expected}`,
    metrics: baseMetrics(result),
  }
}

function baseMetrics(result, extra = {}) {
  return {
    toolComplete: result.toolComplete,
    calledRequestRoll: result.calledRequestRoll,
    calledNarrateTurn: result.calledNarrateTurn,
    pivotSignaled: result.pivotSignaled,
    phase: result.chapterStatus?.phase ?? null,
    malformedNestedStatus: Boolean(result.chapterStatus?.malformed_nested_status),
    controllerRetryCount: result.controller?.attempts?.length ? result.controller.attempts.length - 1 : 0,
    ...extra,
  }
}

function hasFutureFactLeak(probe, result) {
  if (probe.expected !== 'compress_no_future') return false

  const status = result.chapterStatus
  const signals = Array.isArray(status?.signals_true) ? status.signals_true.join(' ') : ''
  const doneReason = extractDoneReason(status?.reason)
  const closeClaimText = [
    status?.phase,
    status?.foreground_question,
    status?.answered ? 'answered' : '',
    signals,
    doneReason,
  ].join(' ')

  return /broker deal signed|deal signed|contract signed|lien cleared|marker cleared|marker release|ship unclamped|departure authorized|cargo loaded|lien resolved|debt deferred|debt cleared|berth hold lifted|broker deal|marker pulled/i.test(closeClaimText)
}

function extractDoneReason(reason) {
  if (!reason) return ''

  const text = String(reason)
  const doneMatch = text.match(/\bDone:\s*([\s\S]*?)(?:\bIn flight:|\bNot done:|\bNarrative judgment:|\bTechnical judgment:|$)/i)
  if (doneMatch) return doneMatch[1]

  return text
}

function statusIndicatesActiveBlocker(status) {
  if (!status) return false

  const blockers = [
    ...(Array.isArray(status.never_close_mid_active) ? status.never_close_mid_active : []),
    ...(Array.isArray(status.never_close_mid) ? status.never_close_mid : []),
    ...(Array.isArray(status.active_blockers) ? status.active_blockers : []),
  ].join(' ')

  const text = [
    blockers,
    status.close_intent,
    status.next_required_delta,
    status.should_not_do_next,
    status.reason,
  ].join(' ')

  return /active|block|Slink|NPC|revelation|answer|question|exchange|data chip|evidence/i.test(text)
}

function explainFailure(values, fallback) {
  const parts = Object.entries(values)
    .map(([key, value]) => `${key}=${value ?? 'null'}`)
    .join(' ')
  return parts ? `${fallback} (${parts})` : fallback
}

function printDryRun(probes, verbose) {
  console.log('\n=== DRY RUN PROBES ===\n')
  for (const probe of probes) {
    console.log(`${probe.id} | turn ${probe.turn} | ${probe.expected}`)
    console.log(`  ${probe.label}`)
    console.log(`  rationale: ${probe.rationale}`)
    console.log(`  player: ${oneLine(probe.playerInput).slice(0, 180)}`)
    console.log(`  advisory: ${oneLine(probe.advisory).slice(0, 260)}`)
    console.log(`  transcript depth: ${probe.transcript.length} messages`)
    if (verbose) {
      console.log(`  actual narrator: ${oneLine(probe.actualNarratorOutput).slice(0, 420)}`)
    }
    console.log()
  }
}

function printComparison(results, variantKeys, probes) {
  console.log('\n=== COMPARISON ===\n')
  console.log(['Probe', 'Expected', ...variantKeys].join('\t'))
  console.log(['---', '---', ...variantKeys.map(() => '---')].join('\t'))

  for (const probe of probes) {
    const row = [probe.id, probe.expected]
    for (const variantKey of variantKeys) {
      const entry = results.find((result) => result.variantKey === variantKey && result.probe.id === probe.id)
      row.push(entry?.score?.pass ? 'PASS' : 'FAIL')
    }
    console.log(row.join('\t'))
  }

  console.log('\n=== VARIANT SUMMARY ===\n')
  for (const variantKey of variantKeys) {
    const entries = results.filter((entry) => entry.variantKey === variantKey)
    const passed = entries.filter((entry) => entry.score.pass).length
    console.log(`${variantKey} (${V4_OPTIMIZATION_VARIANTS[variantKey]?.label ?? 'unknown'}): ${passed}/${entries.length} passed`)
  }
}

function printMetricSummary(results, variantKeys) {
  console.log('\n=== EXECUTION METRICS ===\n')
  console.log(['Variant', 'Tool complete', 'Rolls', 'Pivots', 'Future fact leaks', 'Active blocker marks', 'Malformed status', 'Controller retries'].join('\t'))
  console.log(['---', '---', '---', '---', '---', '---', '---', '---'].join('\t'))

  for (const variantKey of variantKeys) {
    const entries = results.filter((entry) => entry.variantKey === variantKey)
    const metrics = entries.map((entry) => entry.score.metrics ?? {})
    const toolComplete = metrics.filter((metric) => metric.toolComplete).length
    const rolls = metrics.filter((metric) => metric.calledRequestRoll).length
    const pivots = metrics.filter((metric) => metric.pivotSignaled).length
    const leaks = metrics.filter((metric) => metric.futureFactLeak).length
    const blockers = metrics.filter((metric) => metric.activeBlockerDetected).length
    const malformed = metrics.filter((metric) => metric.malformedNestedStatus).length
    const retries = metrics.reduce((sum, metric) => sum + (metric.controllerRetryCount ?? 0), 0)
    console.log([variantKey, `${toolComplete}/${entries.length}`, rolls, pivots, leaks, blockers, malformed, retries].join('\t'))
  }
}

function filterProbes(probes, mode) {
  if (!mode || mode === 'all') return probes
  if (mode === 'positive') return probes.filter((probe) => probe.kind === 'positive')
  if (mode === 'negative') return probes.filter((probe) => probe.kind === 'negative')
  return probes
}

function resolveVariantKeys(parsedArgs) {
  if (parsedArgs.compare) return parsedArgs.compare.split(',').map((key) => key.trim()).filter(Boolean)
  if (parsedArgs.variant === 'all') return Object.keys(V4_OPTIMIZATION_VARIANTS)
  return [parsedArgs.variant ?? 'v4']
}

function parseArgs(raw) {
  const parsed = {
    exportPath: undefined,
    variant: undefined,
    compare: undefined,
    probes: undefined,
    probeMode: 'all',
    dryRun: false,
    verbose: false,
    model: DEFAULT_MODEL,
    out: undefined,
    help: false,
    listVariants: false,
  }

  for (let index = 0; index < raw.length; index++) {
    const arg = raw[index]
    if (arg === '--export') parsed.exportPath = raw[++index]
    else if (arg === '--variant') parsed.variant = raw[++index]
    else if (arg === '--compare') parsed.compare = raw[++index]
    else if (arg === '--probes') parsed.probes = raw[++index]
    else if (arg === '--probe-mode') parsed.probeMode = raw[++index]
    else if (arg === '--dry-run') parsed.dryRun = true
    else if (arg === '--verbose') parsed.verbose = true
    else if (arg === '--model') parsed.model = raw[++index]
    else if (arg === '--out') parsed.out = raw[++index]
    else if (arg === '--list-variants') parsed.listVariants = true
    else if (arg === '--help' || arg === '-h') parsed.help = true
  }

  return parsed
}

function printHelp() {
  console.log(`V4 close-loop optimization harness

Usage:
  node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs --export <path> [options]

Options:
  --export <path>        Prose-first prototype export JSON.
  --dry-run              Extract and print probes without model calls.
  --variant <key>        Run one variant. Default: v4. Use "all" for all variants.
  --compare <keys>       Comma-separated variants, e.g. v4,v4a,v4b,v4c,v4d.
  --probe-mode <mode>    all | positive | negative. Default: all.
  --probes <ids>         Comma-separated probe ids.
  --model <model>        Model for live calls. Default: ${DEFAULT_MODEL}.
  --out <dir>            Results directory.
  --verbose              Print more transcript/prose detail.
  --list-variants        Show variants.

Variants:
${listV4OptimizationVariants().map((variant) => `  ${variant.key}: ${variant.label}`).join('\n')}
`)
}

function oneLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function indent(value, prefix) {
  return String(value).split('\n').map((line) => `${prefix}${line}`).join('\n')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
