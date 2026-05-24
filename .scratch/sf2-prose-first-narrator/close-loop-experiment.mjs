#!/usr/bin/env node

/**
 * Prose-first close-loop experiment harness.
 *
 * Usage:
 *   node .scratch/sf2-prose-first-narrator/close-loop-experiment.mjs --export <path> --dry-run
 *   node .scratch/sf2-prose-first-narrator/close-loop-experiment.mjs --export <path> --compare v0,v1,v2,v3,v4
 */

import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractCloseLoopProbes, renderSnapshotText } from './close-loop/extract-probes.mjs'
import { buildCloseLoopProtocol, listCloseLoopVariants, VARIANTS } from './close-loop/variants.mjs'

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
    description: 'Commit the turn once narrative prose is complete. Call exactly once at the end of every complete turn.',
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
            signals_true: {
              type: 'array',
              items: { type: 'string' },
            },
            never_close_mid_active: {
              type: 'array',
              items: { type: 'string' },
            },
            next_required_delta: { type: 'string' },
            should_not_do_next: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
      required: ['suggested_actions'],
    },
  },
]

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

if (args.listVariants) {
  for (const variant of listCloseLoopVariants()) {
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
  const { probes, summary } = extractCloseLoopProbes(args.exportPath, { probeIds })
  const selectedProbes = filterProbes(probes, args.probeMode)

  console.log('=== CLOSE-LOOP PROBE EXTRACTION ===')
  console.log(`Export: ${args.exportPath}`)
  console.log(`Brief: ${summary.briefId}`)
  console.log(`Transcript: ${summary.playerTurns} player turns / ${summary.narratorTurns} narrator turns / chapter ${summary.chapter}`)
  console.log(`Extracted probes: ${selectedProbes.length}`)
  console.log(`Expected breakdown: ${JSON.stringify(summary.expectedBreakdown)}`)

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
    console.log(`\n--- Variant ${variantKey}: ${VARIANTS[variantKey]?.label ?? 'unknown'} ---`)

    for (const probe of selectedProbes) {
      process.stdout.write(`  ${probe.id} (${probe.expected})... `)

      try {
        const result = await runProbe(client, probe, variantKey, args.model)
        const score = scoreCloseLoopResult(probe, result)
        results.push({ variantKey, probe, result, score })
        console.log(`${score.pass ? 'PASS' : 'FAIL'} ${score.reason}`)

        if (args.verbose && result.prose) {
          console.log(indent(result.prose.slice(0, 600), '    '))
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
  }

  const outDir = args.out ?? DEFAULT_OUT
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-close-loop-experiment.json`)
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
  const protocol = buildCloseLoopProtocol(variantKey, probe.advisory)
  const system = [{
    type: 'text',
    text: [`# ${probe.briefTitle ?? probe.briefId ?? 'Campaign brief'}`, probe.briefText, protocol].join('\n\n'),
  }]

  const messages = probe.transcript.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))

  messages.push({
    role: 'user',
    content: `<mechanical-snapshot>\n${renderSnapshotText(probe.mechanicalSnapshot)}\n</mechanical-snapshot>\n\n${probe.playerInput}`,
  })

  const response = await client.messages.create({
    model,
    max_tokens: 2200,
    system,
    tools: EXPERIMENT_TOOLS,
    messages,
  })

  return analyzeResponse(response)
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
        chapterStatus = block.input.chapter_status ?? null
      }
    }
  }

  return {
    calledRequestRoll,
    calledNarrateTurn,
    roll,
    prose: prose.trim(),
    suggestedActions,
    pivotSignaled: Boolean(authorialMoves?.pivot_signaled),
    chapterStatus,
    closedOrReframed: Boolean(authorialMoves?.pivot_signaled) ||
      ['closed', 'reframed'].includes(chapterStatus?.phase) ||
      Boolean(chapterStatus?.close_candidate && /close|reframe|chapter/i.test(chapterStatus?.next_required_delta ?? '')),
    stopReason: response.stop_reason,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
    },
  }
}

function scoreCloseLoopResult(probe, result) {
  if (result.error) return { pass: false, reason: result.error }

  const phase = result.chapterStatus?.phase
  const isCloseCandidate = Boolean(result.chapterStatus?.close_candidate) || phase === 'close_candidate'
  const isClosedOrReframed = result.closedOrReframed
  const actionText = result.suggestedActions.join(' ')
  const actionSuggestsClose = /close chapter|chapter 2|reframe|handover|depart|undock|leave gannett/i.test(actionText)

  if (probe.expected === 'no_close') {
    const pass = !result.pivotSignaled && !['close_candidate', 'closed', 'reframed'].includes(phase)
    return {
      pass,
      reason: pass ? 'kept chapter open' : `premature close signal (${phase ?? 'pivot'})`,
    }
  }

  if (probe.expected === 'compress') {
    const opensNewSideLoop = /investigate the tipster|find another job|return to the board|ask more around the station/i.test(actionText)
    const pass = !result.pivotSignaled && !opensNewSideLoop
    return {
      pass,
      reason: pass ? 'kept moving toward decision without premature close' : 'premature close or side-loop actions',
    }
  }

  if (probe.expected === 'close_candidate') {
    const pass = isCloseCandidate || isClosedOrReframed || actionSuggestsClose
    return {
      pass,
      reason: pass
        ? `recognized close pressure (${phase ?? (result.pivotSignaled ? 'pivot' : 'suggested action')})`
        : 'did not recognize close candidate',
    }
  }

  if (probe.expected === 'must_close_or_reframe') {
    const pass = isClosedOrReframed || phase === 'close_candidate'
    return {
      pass,
      reason: pass
        ? `respected boundary (${phase ?? 'pivot'})`
        : 'continued old chapter across hard scope boundary',
    }
  }

  return { pass: false, reason: `unknown expectation ${probe.expected}` }
}

function printDryRun(probes, verbose) {
  console.log('\n=== DRY RUN PROBES ===\n')
  for (const probe of probes) {
    console.log(`${probe.id} | turn ${probe.turn} | ${probe.expected}`)
    console.log(`  ${probe.label}`)
    console.log(`  rationale: ${probe.rationale}`)
    console.log(`  player: ${oneLine(probe.playerInput).slice(0, 180)}`)
    console.log(`  advisory: ${oneLine(probe.advisory).slice(0, 220)}`)
    console.log(`  transcript depth: ${probe.transcript.length} messages`)
    if (verbose) {
      console.log(`  actual narrator: ${oneLine(probe.actualNarratorOutput).slice(0, 400)}`)
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
    console.log(`${variantKey} (${VARIANTS[variantKey]?.label ?? 'unknown'}): ${passed}/${entries.length} passed`)
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
  if (parsedArgs.variant === 'all') return Object.keys(VARIANTS)
  return [parsedArgs.variant ?? 'v0']
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
  console.log(`Close-loop experiment harness

Usage:
  node .scratch/sf2-prose-first-narrator/close-loop-experiment.mjs --export <path> [options]

Options:
  --export <path>        Prose-first prototype export JSON.
  --dry-run              Extract and print probes without model calls.
  --variant <key>        Run one variant. Default: v0. Use "all" for all variants.
  --compare <keys>       Comma-separated variants, e.g. v0,v1,v2,v3,v4.
  --probe-mode <mode>    all | positive | negative. Default: all.
  --probes <ids>         Comma-separated probe ids.
  --model <model>        Model for live calls. Default: ${DEFAULT_MODEL}.
  --out <dir>            Results directory.
  --verbose              Print more transcript/prose detail.
  --list-variants        Show variants.

Variants:
${listCloseLoopVariants().map((variant) => `  ${variant.key}: ${variant.label}`).join('\n')}
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
