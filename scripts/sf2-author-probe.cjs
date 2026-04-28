#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const Anthropic = require('@anthropic-ai/sdk').default

installTsRequire()
loadEnvFromDotenvLocal()

const { createInitialSf2State } = require('../lib/sf2/game-data.ts')
const { compileAuthorInputSeed } = require('../lib/sf2/author/payload.ts')
const { composeSystemBlocks } = require('../lib/sf2/prompt/compose.ts')
const { SF2_BIBLE_HEGEMONY } = require('../lib/sf2/narrator/prompt.ts')
const { ARC_AUTHOR_TOOLS, ARC_AUTHOR_TOOL_NAME } = require('../lib/sf2/arc-author/tools.ts')
const { SF2_ARC_AUTHOR_CORE, SF2_ARC_AUTHOR_ROLE, buildArcAuthorSituation } = require('../lib/sf2/arc-author/prompt.ts')
const { transformArcSetup, validateArcPlan } = require('../lib/sf2/arc-author/transform.ts')
const { AUTHOR_TOOLS, AUTHOR_TOOL_NAME } = require('../lib/sf2/author/tools.ts')
const { SF2_AUTHOR_CORE, SF2_AUTHOR_ROLE, buildAuthorSituation } = require('../lib/sf2/author/prompt.ts')

const target = process.argv[2]
if (!target) {
  console.error('Usage: npm run sf2:author-probe -- <fixture-or-dir> [--runs N] [--write]')
  process.exit(2)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing. Set it in .env.local or env.')
  process.exit(2)
}

const args = parseArgs(process.argv.slice(3))
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const paths = collectJson(path.resolve(process.cwd(), target))
if (paths.length === 0) {
  console.error(`No author fixtures found at ${target}`)
  process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main() {
  let failed = 0
  let totalCost = 0
  for (const fixturePath of paths) {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    const runs = Number(args.runs ?? fixture.runs ?? 1)
    const results = []
    for (let i = 0; i < runs; i += 1) {
      const started = Date.now()
      process.stdout.write(`RUN ${fixture.name} ${i + 1}/${runs} ... `)
      const result = fixture.schema === 'sf2-author-arc-fixture/v1'
        ? await runArcFixture(fixture, i)
        : await runChapterFixture(fixture)
      results.push(result)
      totalCost += result.costUsd
      console.log(`${result.summary} (${Math.round((Date.now() - started) / 1000)}s, ~$${result.costUsd.toFixed(4)})`)
    }
    const failures = assertFixture(fixture, results)
    if (failures.length > 0) {
      failed += 1
      console.log(`FAIL ${fixture.name} (${fixturePath})`)
      failures.forEach((f) => console.log(`  - ${f}`))
      printResultDetails(fixture, results)
    } else {
      const summary = results.map((r) => r.summary).join(' | ')
      console.log(`PASS ${fixture.name} (${runs} run${runs === 1 ? '' : 's'}) — ${summary}`)
    }
    if (args.write) writeGenerated(fixturePath, fixture, results)
  }
  console.log(`\n${paths.length - failed}/${paths.length} author fixtures passed — total cost ~$${totalCost.toFixed(4)}`)
  process.exit(failed === 0 ? 0 : 1)
}

async function runArcFixture(fixture, runIndex) {
  const state = buildState(fixture.input?.state, fixture.input?.statePatch)
  const seed = fixture.input?.seed ?? compileAuthorInputSeed(state, null)
  const variantSeeds = fixture.input?.arcVariantSeeds
  const variantSeed = Array.isArray(variantSeeds)
    ? variantSeeds[runIndex % variantSeeds.length]
    : fixture.input?.arcVariantSeed
  if (variantSeed) seed.arcVariantSeed = variantSeed
  const system = composeSystemBlocks({
    core: SF2_ARC_AUTHOR_CORE,
    bible: SF2_BIBLE_HEGEMONY,
    role: SF2_ARC_AUTHOR_ROLE,
    situation: buildArcAuthorSituation(seed),
  }).blocks
  const response = await client.messages.create({
    model: process.env.SF2_ARC_AUTHOR_MODEL || process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-5-20250929',
    max_tokens: Number(process.env.SF2_ARC_AUTHOR_MAX_TOKENS ?? 8192),
    system,
    tools: [tagTool(ARC_AUTHOR_TOOLS[0])],
    tool_choice: { type: 'tool', name: ARC_AUTHOR_TOOL_NAME, disable_parallel_tool_use: true },
    messages: [{ role: 'user', content: `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}\n\nEmit \`${ARC_AUTHOR_TOOL_NAME}\` now.` }],
  })
  const tool = response.content.find((b) => b.type === 'tool_use' && b.name === ARC_AUTHOR_TOOL_NAME)
  if (!tool) return { raw: null, arcPlan: null, costUsd: usageCost(response.usage), summary: 'no tool_use' }
  const arcPlan = transformArcSetup(tool.input, seed)
  return {
    raw: tool.input,
    arcPlan,
    errors: validateArcPlan(arcPlan),
    costUsd: usageCost(response.usage),
    summary: `${arcPlan.scenarioShape.mode}/${arcPlan.title}`,
  }
}

async function runChapterFixture(fixture) {
  const state = buildState(fixture.input?.state, fixture.input?.statePatch)
  if (fixture.input?.arcPlan) state.campaign.arcPlan = fixture.input.arcPlan
  const priorMeaning = fixture.input?.priorChapterMeaning ?? null
  const seed = compileAuthorInputSeed(state, priorMeaning)
  const system = composeSystemBlocks({
    core: SF2_AUTHOR_CORE,
    bible: SF2_BIBLE_HEGEMONY,
    role: SF2_AUTHOR_ROLE,
    situation: buildAuthorSituation(state, priorMeaning),
  }).blocks
  const response = await client.messages.create({
    model: process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-5-20250929',
    max_tokens: Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 8192),
    system,
    tools: [tagTool(AUTHOR_TOOLS[0])],
    tool_choice: { type: 'tool', name: AUTHOR_TOOL_NAME, disable_parallel_tool_use: true },
    messages: [{ role: 'user', content: `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}\n\nEmit \`${AUTHOR_TOOL_NAME}\` now.` }],
  })
  const tool = response.content.find((b) => b.type === 'tool_use' && b.name === AUTHOR_TOOL_NAME)
  const raw = tool?.input ?? null
  return {
    raw,
    costUsd: usageCost(response.usage),
    summary: raw ? `${get(raw, 'chapter_frame.title') || get(raw, 'chapterFrame.title')}` : 'no tool_use',
  }
}

function assertFixture(fixture, results) {
  const failures = []
  if (results.some((r) => !r.raw)) failures.push('one or more runs produced no tool_use')
  const expected = fixture.expected ?? {}
  if (fixture.schema === 'sf2-author-arc-fixture/v1') {
    const modes = new Set(results.map((r) => r.arcPlan?.scenarioShape?.mode).filter(Boolean))
    if (expected.minDistinctScenarioModes && modes.size < expected.minDistinctScenarioModes) {
      failures.push(`expected at least ${expected.minDistinctScenarioModes} distinct scenario modes, got ${modes.size}`)
    }
    for (const r of results) {
      if ((r.errors ?? []).length > 0) failures.push(`arc validation: ${r.errors.join(', ')}`)
      if (expected.minPressureEngines && (r.arcPlan?.pressureEngines?.length ?? 0) < expected.minPressureEngines) failures.push('too few pressure engines')
      if (expected.minStanceAxes && (r.arcPlan?.playerStanceAxes?.length ?? 0) < expected.minStanceAxes) failures.push('too few stance axes')
      if (expected.chapterFunctionCount && (r.arcPlan?.chapterFunctionMap?.length ?? 0) !== expected.chapterFunctionCount) failures.push('wrong chapter function count')
    }
  } else {
    for (const r of results) {
      const raw = r.raw ?? {}
      if (expected.continuationMovesRequired && !value(raw, 'continuation_moves', 'continuationMoves')) failures.push('missing continuation_moves')
      const visible = value(value(raw, 'opening_scene_spec', 'openingSceneSpec') ?? {}, 'visible_npc_ids', 'visibleNpcIds') ?? []
      if (expected.visibleNpcCountMax && Array.isArray(visible) && visible.length > expected.visibleNpcCountMax) failures.push(`too many visible NPCs (${visible.length})`)
      const target = value(value(raw, 'pacing_contract', 'pacingContract') ?? {}, 'target_turns', 'targetTurns') ?? {}
      if (expected.pacingTarget && (target.min !== expected.pacingTarget.min || target.max !== expected.pacingTarget.max)) failures.push('pacing target mismatch')
    }
  }
  for (const absent of expected.textAbsent ?? []) {
    const text = JSON.stringify(results.map((r) => r.raw)).toLowerCase()
    if (text.includes(absent.toLowerCase())) failures.push(`output unexpectedly includes "${absent}"`)
  }
  return [...new Set(failures)]
}

function printResultDetails(fixture, results) {
  if (fixture.schema === 'sf2-author-arc-fixture/v1') {
    results.forEach((r, i) => {
      const plan = r.arcPlan
      if (!plan) {
        console.log(`  run ${i + 1}: no arc plan`)
        return
      }
      console.log(
        `  run ${i + 1}: mode=${plan.scenarioShape.mode}; chapters=${plan.chapterFunctionMap.length}; title=${plan.title}`
      )
      if (plan.scenarioShape.whatThisIsNot) {
        console.log(`    not: ${plan.scenarioShape.whatThisIsNot}`)
      }
      if (plan.scenarioShape.selectionRationale) {
        console.log(`    why: ${plan.scenarioShape.selectionRationale}`)
      }
      if (plan.scenarioShape.rejectedDefaultShape) {
        console.log(`    rejected default: ${plan.scenarioShape.rejectedDefaultShape}`)
      }
      if ((r.errors ?? []).length > 0) {
        console.log(`    validation: ${r.errors.join(', ')}`)
      }
    })
    return
  }

  results.forEach((r, i) => {
    const raw = r.raw ?? {}
    const pacing = value(raw, 'pacing_contract', 'pacingContract') ?? {}
    const target = value(pacing, 'target_turns', 'targetTurns') ?? {}
    const arcLink = value(raw, 'arc_link', 'arcLink') ?? {}
    console.log(
      `  run ${i + 1}: title=${r.summary}; chapterFunction=${value(arcLink, 'chapter_function', 'chapterFunction') ?? ''}; pacing=${target.min ?? '?'}-${target.max ?? '?'}`
    )
  })
}

function buildState(state, patch) {
  const base = state ?? createInitialSf2State({ campaignId: 'author_probe', playerName: 'Ren' })
  return deepMerge(structuredClone(base), patch ?? {})
}

function value(obj, snake, camel) {
  if (!obj || typeof obj !== 'object') return undefined
  return obj[snake] ?? obj[camel]
}

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => value(acc, key, key), obj)
}

function deepMerge(target, patch) {
  for (const [key, val] of Object.entries(patch)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && target[key] && typeof target[key] === 'object') {
      deepMerge(target[key], val)
    } else {
      target[key] = val
    }
  }
  return target
}

function usageCost(usage) {
  const sonnet = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }
  return ((usage.input_tokens * sonnet.input) +
    (usage.output_tokens * sonnet.output) +
    ((usage.cache_creation_input_tokens ?? 0) * sonnet.cacheWrite) +
    ((usage.cache_read_input_tokens ?? 0) * sonnet.cacheRead)) / 1_000_000
}

function tagTool(tool) {
  return { ...tool, cache_control: { type: 'ephemeral' } }
}

function collectJson(target) {
  if (!fs.existsSync(target)) return []
  const stat = fs.statSync(target)
  if (stat.isFile()) return target.endsWith('.json') ? [target] : []
  return fs.readdirSync(target).flatMap((entry) => collectJson(path.resolve(target, entry))).sort()
}

function writeGenerated(fixturePath, fixture, results) {
  const outDir = path.resolve(path.dirname(fixturePath), '..', 'generated')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, `${fixture.name}.generated.json`), `${JSON.stringify({ fixture: fixture.name, results }, null, 2)}\n`)
}

function parseArgs(raw) {
  const args = {}
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === '--runs') args.runs = Number(raw[++i])
    else if (raw[i] === '--write') args.write = true
  }
  return args
}

function loadEnvFromDotenvLocal() {
  const p = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function installTsRequire() {
  require.extensions['.ts'] = function loadTs(module, filename) {
    const source = fs.readFileSync(filename, 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText
    return module._compile(output, filename)
  }
  const original = Module._resolveFilename
  Module._resolveFilename = function resolveTs(request, parent, isMain, options) {
    if (request.startsWith('@/')) request = path.join(process.cwd(), request.slice(2))
    try {
      return original.call(this, request, parent, isMain, options)
    } catch (err) {
      if (request.startsWith('.') || request.startsWith('/')) {
        const base = request.startsWith('/') ? request : path.resolve(path.dirname(parent.filename), request)
        for (const candidate of [base + '.ts', path.join(base, 'index.ts')]) {
          if (fs.existsSync(candidate)) return candidate
        }
      }
      throw err
    }
  }
}
