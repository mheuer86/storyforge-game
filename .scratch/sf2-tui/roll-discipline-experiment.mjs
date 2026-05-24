#!/usr/bin/env node

/**
 * Roll discipline experiment harness.
 *
 * Takes a real playthrough export, extracts test scenarios where roll gates fired,
 * and replays each scenario through the live narrator API with swappable protocol
 * variants. Compares whether the narrator calls request_roll across variants.
 *
 * Usage:
 *   node .scratch/sf2-tui/roll-discipline-experiment.mjs --export <path> [options]
 *
 * Options:
 *   --export <path>       Path to playthrough export JSON (required)
 *   --variant <name>      Protocol variant to test (default: v0). Use 'all' for all.
 *   --scenarios <spec>    'all', 'missed-only', 'rolled-only', or comma-separated turn numbers
 *   --dry-run             Extract and display scenarios without calling the API
 *   --compare <v0,v1,...> Run multiple variants and produce comparison table
 *   --model <model>       Model to use (default: claude-sonnet-4-6)
 *   --out <dir>           Output directory (default: .scratch/sf2-tui/roll-discipline/results)
 *   --verbose             Show full narrator output, not just first 200 chars
 *   --brief-override <path> Replace the brief text in all scenarios (test stat naming impact)
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractScenarios, renderSnapshotText } from './roll-discipline/extract-scenarios.mjs'
import { buildFullProtocol, listVariants, VARIANTS } from './roll-discipline/protocol-variants.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_OUT = path.join(repoRoot, '.scratch/sf2-tui/roll-discipline/results')
const DEFAULT_MODEL = 'claude-sonnet-4-6'

// --- CLI parsing ---

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`
Roll discipline experiment harness

Usage:
  node .scratch/sf2-tui/roll-discipline-experiment.mjs --export <path> [options]

Options:
  --export <path>       Path to playthrough export JSON (required)
  --variant <name>      Protocol variant (default: v0). Use 'all' for all variants.
  --scenarios <spec>    'all' | 'missed-only' | 'rolled-only' | comma-separated turns
  --dry-run             Show scenarios without calling API
  --compare <v0,v1,...> Compare specific variants side-by-side
  --model <model>       Model (default: ${DEFAULT_MODEL})
  --out <dir>           Output directory
  --verbose             Full narrator output in display
  --brief-override <p>  Replace brief text in all scenarios (test stat naming)
  --list-variants       Show available protocol variants and exit

Available protocol variants:
${listVariants().map((v) => `  ${v.key}: ${v.label}`).join('\n')}
`)
  process.exit(0)
}

if (args.listVariants) {
  console.log('Available protocol variants:')
  for (const v of listVariants()) {
    console.log(`  ${v.key}: ${v.label}`)
  }
  process.exit(0)
}

if (!args.export) {
  console.error('Error: --export <path> is required. Use --help for usage.')
  process.exit(1)
}

// --- Narrator tools (same as production, minus caching) ---

const NARRATOR_TOOLS = [
  {
    name: 'request_roll',
    description: 'Pause narration mid-turn and request a d20 skill check. Call this INSIDE a turn, BEFORE narrate_turn, at the moment of uncertainty. Narrate up to the moment of action (setup, tension, what the PC is attempting), then call request_roll. STOP narrating — the stream pauses.',
    input_schema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill or ability name (e.g. "Insight", "Investigation", "Persuasion", "Stealth").' },
        dc: { type: 'number', description: 'Difficulty class 5-25.' },
        why: { type: 'string', description: 'One-sentence reason this check is required.' },
        consequence_on_fail: { type: 'string', description: 'What fails forward on a miss.' },
        modifier_type: { type: 'string', enum: ['advantage', 'disadvantage', 'challenge'], description: 'Optional positioning modifier.' },
        modifier_reason: { type: 'string', description: 'Why the modifier applies.' },
      },
      required: ['skill', 'dc', 'why', 'consequence_on_fail'],
    },
  },
  {
    name: 'narrate_turn',
    description: 'Commit the turn once narrative prose is complete. Call ONCE at the end of every turn.',
    input_schema: {
      type: 'object',
      properties: {
        suggested_actions: {
          type: 'array',
          description: 'Exactly 3-4 quick actions for the next player input.',
          items: { type: 'string' },
        },
        mechanical_effects: {
          type: 'array',
          description: 'Player-visible mechanical effects.',
          items: { type: 'object' },
        },
      },
      required: ['suggested_actions'],
    },
  },
]

// --- Main ---

async function main() {
  const { scenarios, summary } = extractScenarios(args.export)

  // Apply brief override if specified
  if (args.briefOverride) {
    const overrideText = readFileSync(args.briefOverride, 'utf8')
    const overrideLabel = path.basename(args.briefOverride, path.extname(args.briefOverride))
    for (const s of scenarios) {
      s.briefText = overrideText
    }
    console.log(`Brief override: ${args.briefOverride} (${overrideLabel})`)
  }

  console.log('=== SCENARIO EXTRACTION ===')
  console.log(`Export: ${args.export}`)
  console.log(`Total turns: ${summary.totalTurns}`)
  console.log(`Test scenarios extracted: ${summary.totalScenarios}`)
  console.log(`  Missed rolls (gate expected, narrator skipped): ${summary.missedRolls}`)
  console.log(`  Actual rolls (narrator called request_roll): ${summary.actualRolls}`)
  console.log(`  Gate kinds: ${JSON.stringify(summary.gateKindBreakdown)}`)
  console.log()

  // Filter scenarios
  const filtered = filterScenarios(scenarios, args.scenarios)
  console.log(`Scenarios to test: ${filtered.length}`)

  if (args.dryRun) {
    printDryRun(filtered, args.verbose)
    return
  }

  // Determine which variants to run
  const variantKeys = resolveVariantKeys(args)

  console.log(`Variants to test: ${variantKeys.join(', ')}`)
  console.log(`Model: ${args.model}`)
  console.log(`Total API calls: ${filtered.length * variantKeys.length}`)
  console.log()

  const client = new Anthropic()
  const results = []

  for (const variantKey of variantKeys) {
    const protocol = buildFullProtocol(variantKey)
    console.log(`\n--- Running variant: ${variantKey} (${VARIANTS[variantKey].label}) ---\n`)

    for (const scenario of filtered) {
      process.stdout.write(`  Turn ${scenario.turnIndex} (${scenario.groundTruth.gateKind})... `)

      try {
        const result = await runScenario(client, scenario, protocol, args.model)
        results.push({ variantKey, scenario, result })

        const rolled = result.calledRequestRoll ? 'ROLLED' : 'NO ROLL'
        const match = result.calledRequestRoll === scenario.groundTruth.narratorActuallyRolled ? '=' : '≠'
        const vsGate = scenario.groundTruth.gateBinding !== 'none'
          ? (result.calledRequestRoll ? '✓' : '✗')
          : (result.calledRequestRoll ? '+' : '·')

        console.log(`${rolled} ${vsGate} [${match} baseline] ${result.rollSkill ?? ''} ${result.rollDc ? 'DC ' + result.rollDc : ''}`)

        if (args.verbose && result.proseBeforeRoll) {
          console.log(`    prose: ${result.proseBeforeRoll.substring(0, 300)}`)
        }
      } catch (err) {
        console.log(`ERROR: ${err.message}`)
        results.push({ variantKey, scenario, result: { error: err.message } })
      }

      // Brief pause between API calls
      await sleep(500)
    }
  }

  // Print comparison table
  if (variantKeys.length > 1) {
    printComparison(results, variantKeys, filtered)
  }

  // Save results
  const outDir = args.out ?? DEFAULT_OUT
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-experiment.json`)
  writeFileSync(outPath, JSON.stringify({
    exportPath: args.export,
    model: args.model,
    variantKeys,
    summary,
    results: results.map((r) => ({
      variant: r.variantKey,
      turn: r.scenario.turnIndex,
      groundTruth: r.scenario.groundTruth,
      result: r.result,
    })),
  }, null, 2) + '\n')
  console.log(`\nResults saved to: ${outPath}`)
}

// --- Run a single scenario through the narrator API ---

async function runScenario(client, scenario, protocol, model) {
  // Build system prompt: brief + protocol
  const briefLabel = scenario.briefId ?? 'Campaign brief'
  const stablePrefix = `# ${briefLabel}\n\n${scenario.briefText}\n\n${protocol}`

  const system = [{ type: 'text', text: stablePrefix }]

  // Build messages: transcript prefix + current turn with snapshot
  const messages = scenario.transcript.map((t) => ({
    role: t.role,
    content: t.content,
  }))

  // Current turn: prepend mechanical snapshot
  const snapshotText = renderSnapshotText(scenario.mechanicalSnapshot)
  const currentContent = `<mechanical-snapshot>\n${snapshotText}\n</mechanical-snapshot>\n\n${scenario.playerInput}`
  messages.push({ role: 'user', content: currentContent })

  // Call the API
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    tools: NARRATOR_TOOLS,
    messages,
  })

  // Analyze the response
  return analyzeNarratorResponse(response)
}

function analyzeNarratorResponse(response) {
  let calledRequestRoll = false
  let calledNarrateTurn = false
  let rollSkill = null
  let rollDc = null
  let rollWhy = null
  let rollConsequence = null
  let rollModifier = null
  let proseBeforeRoll = ''
  let suggestedActions = []
  let totalProse = ''

  for (const block of response.content) {
    if (block.type === 'text') {
      totalProse += block.text
      if (!calledRequestRoll) {
        proseBeforeRoll += block.text
      }
    }
    if (block.type === 'tool_use') {
      if (block.name === 'request_roll') {
        calledRequestRoll = true
        rollSkill = block.input.skill
        rollDc = block.input.dc
        rollWhy = block.input.why
        rollConsequence = block.input.consequence_on_fail
        rollModifier = block.input.modifier_type
          ? { type: block.input.modifier_type, reason: block.input.modifier_reason }
          : null
      }
      if (block.name === 'narrate_turn') {
        calledNarrateTurn = true
        suggestedActions = block.input.suggested_actions ?? []
      }
    }
  }

  return {
    calledRequestRoll,
    calledNarrateTurn,
    rollSkill,
    rollDc,
    rollWhy,
    rollConsequence,
    rollModifier,
    proseBeforeRoll: proseBeforeRoll.trim(),
    suggestedActions,
    totalProseLength: totalProse.length,
    stopReason: response.stop_reason,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheWrite: response.usage.cache_creation_input_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
    },
  }
}

// --- Display ---

function printDryRun(scenarios, verbose) {
  console.log('\n=== DRY RUN — SCENARIOS ===\n')
  for (const s of scenarios) {
    const gt = s.groundTruth
    const rolled = gt.narratorActuallyRolled ? 'ROLLED' : 'NO ROLL'
    const rollInfo = gt.rollData
      ? ` → ${gt.rollData.skill} DC ${gt.rollData.dc} = ${gt.rollData.result}`
      : ''

    console.log(`Turn ${s.turnIndex} | gate: ${gt.gateKind} (${gt.gateBinding}) | actual: ${rolled}${rollInfo}`)
    console.log(`  player: ${s.playerInput.substring(0, 120)}`)
    console.log(`  gate reason: ${gt.gateReason}`)
    console.log(`  gate skills: ${gt.gateSkills.join(', ')}`)
    console.log(`  transcript depth: ${s.transcript.length} messages`)

    if (verbose && s.actualNarratorOutput) {
      console.log(`  narrator (first 300): ${s.actualNarratorOutput.substring(0, 300)}`)
    }
    console.log()
  }
}

function printComparison(results, variantKeys, scenarios) {
  console.log('\n=== COMPARISON TABLE ===\n')

  // Header
  const header = ['Turn', 'Gate', 'Binding', 'Ground Truth', ...variantKeys]
  console.log(header.join('\t'))
  console.log(header.map(() => '---').join('\t'))

  for (const scenario of scenarios) {
    const gt = scenario.groundTruth
    const gtLabel = gt.narratorActuallyRolled ? 'ROLLED' : 'MISSED'

    const row = [
      scenario.turnIndex,
      gt.gateKind.replace('npc_information', 'npc_info').replace('investigation_search', 'invest'),
      gt.gateBinding,
      gtLabel,
    ]

    for (const vk of variantKeys) {
      const r = results.find((res) => res.variantKey === vk && res.scenario.turnIndex === scenario.turnIndex)
      if (!r || r.result.error) {
        row.push('ERR')
      } else {
        const rolled = r.result.calledRequestRoll
        const skill = r.result.rollSkill ?? ''
        row.push(rolled ? `✓ ${skill}` : '✗')
      }
    }

    console.log(row.join('\t'))
  }

  // Summary per variant
  console.log('\n=== VARIANT SUMMARY ===\n')
  for (const vk of variantKeys) {
    const variantResults = results.filter((r) => r.variantKey === vk && !r.result.error)
    const total = variantResults.length
    const rolled = variantResults.filter((r) => r.result.calledRequestRoll).length

    // Precision against gate expectations
    const gatedScenarios = variantResults.filter((r) => r.scenario.groundTruth.gateBinding !== 'none')
    const gatedRolled = gatedScenarios.filter((r) => r.result.calledRequestRoll).length

    // False positives (rolled when no gate fired)
    const nonGated = variantResults.filter((r) => r.scenario.groundTruth.gateBinding === 'none')
    const falsePositives = nonGated.filter((r) => r.result.calledRequestRoll).length

    console.log(`${vk} (${VARIANTS[vk].label}):`)
    console.log(`  Total: ${rolled}/${total} rolled (${Math.round(rolled / total * 100)}%)`)
    console.log(`  Gate compliance: ${gatedRolled}/${gatedScenarios.length} (${gatedScenarios.length ? Math.round(gatedRolled / gatedScenarios.length * 100) : 0}%)`)
    console.log(`  False positives: ${falsePositives}/${nonGated.length}`)
    console.log()
  }
}

// --- Utilities ---

function filterScenarios(scenarios, spec) {
  if (!spec || spec === 'all') return scenarios
  if (spec === 'missed-only') return scenarios.filter((s) => !s.groundTruth.narratorActuallyRolled && s.groundTruth.gateBinding !== 'none')
  if (spec === 'rolled-only') return scenarios.filter((s) => s.groundTruth.narratorActuallyRolled)
  // Comma-separated turn numbers
  const turns = spec.split(',').map((t) => Number(t.trim())).filter((t) => !isNaN(t))
  return scenarios.filter((s) => turns.includes(s.turnIndex))
}

function resolveVariantKeys(parsedArgs) {
  if (parsedArgs.compare) {
    return parsedArgs.compare.split(',').map((v) => v.trim())
  }
  if (parsedArgs.variant === 'all') {
    return Object.keys(VARIANTS)
  }
  return [parsedArgs.variant ?? 'v0']
}

function parseArgs(raw) {
  const parsed = {
    export: undefined,
    variant: undefined,
    scenarios: undefined,
    dryRun: false,
    compare: undefined,
    model: DEFAULT_MODEL,
    out: undefined,
    verbose: false,
    help: false,
    listVariants: false,
  }
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i]
    if (arg === '--export') parsed.export = raw[++i]
    else if (arg === '--variant') parsed.variant = raw[++i]
    else if (arg === '--scenarios') parsed.scenarios = raw[++i]
    else if (arg === '--dry-run') parsed.dryRun = true
    else if (arg === '--compare') parsed.compare = raw[++i]
    else if (arg === '--model') parsed.model = raw[++i]
    else if (arg === '--out') parsed.out = raw[++i]
    else if (arg === '--verbose') parsed.verbose = true
    else if (arg === '--help' || arg === '-h') parsed.help = true
    else if (arg === '--list-variants') parsed.listVariants = true
    else if (arg === '--brief-override') parsed.briefOverride = raw[++i]
  }
  return parsed
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
