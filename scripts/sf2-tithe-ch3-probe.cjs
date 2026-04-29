#!/usr/bin/env node
/**
 * One-off probe: reconstructs the Tithe Playthrough 14 end-of-Ch2 state, runs
 * the chapter-author with the current code (new structural-beat instructions
 * + Phase 1 NPC binding), and diffs the output against the historical Ch3
 * setup that ran in the actual playthrough.
 *
 * Output: _temp - dont commit/tithe-ch3-probe-<timestamp>.md
 *
 * Cost: ~$0.05-0.10 per run on Sonnet 4.5.
 */
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const Anthropic = require('@anthropic-ai/sdk').default

installTsRequire()
loadEnvFromDotenvLocal()

const { compileAuthorInputSeed } = require('../lib/sf2/author/payload.ts')
const { composeSystemBlocks } = require('../lib/sf2/prompt/compose.ts')
const { SF2_BIBLE_HEGEMONY } = require('../lib/sf2/narrator/prompt.ts')
const { AUTHOR_TOOLS, AUTHOR_TOOL_NAME } = require('../lib/sf2/author/tools.ts')
const { SF2_AUTHOR_CORE, SF2_AUTHOR_ROLE, buildAuthorSituation } = require('../lib/sf2/author/prompt.ts')

const SESSION_PATH = '/Users/martin.heuer/Downloads/Playthrough 14/sf2-session-camp_1777310533535-2026-04-27T23-37-10.json'

if (!fs.existsSync(SESSION_PATH)) {
  console.error(`Session not found: ${SESSION_PATH}`)
  process.exit(2)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing. Set it in .env.local or env.')
  process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function main() {
  const session = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'))
  const ch2EndFrame = session.replayFrames[45]
  const ch3OpenFrame = session.replayFrames[46]
  if (!ch2EndFrame || !ch3OpenFrame) throw new Error('Could not locate Ch2/Ch3 boundary frames')

  // Reconstruct the chapter-author input state. Take Ch2-end state (after the
  // last Ch2 turn applied) and force currentChapter back to 2 so the author
  // targets Ch3 as next chapter.
  const state = structuredClone(ch2EndFrame.stateAfter)
  state.meta.currentChapter = 2

  // Synthesize Sf2ChapterMeaning from the session's continuationMoves (the
  // older chapter-meaning surface). The continuationMoves carries the same
  // information in a different shape; this maps it to the Sf2ChapterMeaning
  // fields the chapter-author prompt expects.
  const cont = ch3OpenFrame.stateBefore.chapter.scaffolding.continuationMoves
  if (!cont) throw new Error('No continuationMoves on Ch3 open scaffolding')
  const priorChapterMeaning = {
    chapter: 2,
    situation: cont.priorChapterMeaning,
    tension: cont.largerPatternRevealed,
    ticking: cont.institutionalScaleEscalation?.to ?? '',
    question: cont.plantedMidchapterRevelation?.recontextualizes ?? '',
    closer: cont.worsenedExistingThread?.whyLoadBearingNow ?? '',
    closingResolution: 'costly',
    synthesizedAtTurn: ch2EndFrame.turnIndex,
  }

  const historicalCh3Setup = ch3OpenFrame.stateBefore.chapter.setup
  const historicalCh3Scaffolding = ch3OpenFrame.stateBefore.chapter.scaffolding

  console.log('Probing Ch3 author with new structural-beat instructions...')
  const seed = compileAuthorInputSeed(state, priorChapterMeaning)
  const system = composeSystemBlocks({
    core: SF2_AUTHOR_CORE,
    bible: SF2_BIBLE_HEGEMONY,
    role: SF2_AUTHOR_ROLE,
    situation: buildAuthorSituation(state, priorChapterMeaning),
  }).blocks

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const started = Date.now()
  const response = await client.messages.create({
    model: process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-6',
    max_tokens: Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 6144),
    system,
    tools: [tagTool(AUTHOR_TOOLS[0])],
    tool_choice: { type: 'tool', name: AUTHOR_TOOL_NAME, disable_parallel_tool_use: true },
    messages: [{ role: 'user', content: `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}\n\nEmit \`${AUTHOR_TOOL_NAME}\` now.` }],
  })

  const tool = response.content.find((b) => b.type === 'tool_use' && b.name === AUTHOR_TOOL_NAME)
  if (!tool) {
    console.error('No tool_use in response')
    console.error('Response:', JSON.stringify(response.content, null, 2).slice(0, 2000))
    process.exit(1)
  }
  const cost = usageCost(response.usage)
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`Done in ${elapsed}s (~$${cost.toFixed(4)})`)

  const newCh3 = tool.input
  const report = buildReport(historicalCh3Setup, historicalCh3Scaffolding, newCh3, priorChapterMeaning, { cost, elapsed })

  const outDir = path.resolve(__dirname, '..', '_temp - dont commit')
  fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const reportPath = path.join(outDir, `tithe-ch3-probe-${stamp}.md`)
  fs.writeFileSync(reportPath, report)
  console.log(`\nReport: ${reportPath}`)
}

function buildReport(histSetup, histScaffolding, newCh3, priorMeaning, run) {
  const lines = []
  lines.push('# Tithe Ch3 author probe — historical vs new structural beat')
  lines.push('')
  lines.push(`Generated ${new Date().toISOString()}. Sonnet 4.5. ${run.elapsed}s, ~$${run.cost.toFixed(4)}.`)
  lines.push('')
  lines.push('Probe input: Playthrough 14 end-of-Ch2 state, with priorChapterMeaning derived from the session\'s continuationMoves artifact.')
  lines.push('')
  lines.push('Goal: see whether the new structural-beat directive (Ch3 = PIVOT / midpoint flip) produces a different chapter shape than the historical Ch3 (which felt thematic-grindy in playthrough audit).')
  lines.push('')
  lines.push('---')
  lines.push('')

  lines.push('## Section 1 — Chapter title + arcLink.chapterFunction')
  lines.push('')
  lines.push('### Historical')
  lines.push('```')
  lines.push(`title: ${histSetup.title}`)
  lines.push(`arcLink.chapterFunction: ${histSetup.arcLink?.chapterFunction ?? '(none)'}`)
  lines.push('```')
  lines.push('')
  lines.push('### New')
  lines.push('```')
  lines.push(`title: ${val(newCh3, 'title')}`)
  const newArcLink = val(newCh3, 'arc_link', 'arcLink')
  lines.push(`arcLink.chapterFunction: ${val(newArcLink ?? {}, 'chapter_function', 'chapterFunction') ?? '(none)'}`)
  lines.push('```')
  lines.push('')

  lines.push('## Section 2 — Chapter frame (the core narrative shape)')
  lines.push('')
  lines.push('### Historical')
  lines.push(formatFrame(histSetup.frame))
  lines.push('')
  lines.push('### New')
  lines.push(formatFrame(val(newCh3, 'chapter_frame', 'chapterFrame')))
  lines.push('')

  lines.push('## Section 3 — Opening scene')
  lines.push('')
  lines.push('### Historical')
  lines.push(formatOpeningScene(histSetup.openingSceneSpec))
  lines.push('')
  lines.push('### New')
  lines.push(formatOpeningScene(val(newCh3, 'opening_scene_spec', 'openingSceneSpec')))
  lines.push('')

  lines.push('## Section 4 — Pressure ladder')
  lines.push('')
  lines.push('### Historical')
  lines.push(formatLadder(histSetup.pressureLadder))
  lines.push('')
  lines.push('### New')
  lines.push(formatLadder(val(newCh3, 'pressure_ladder', 'pressureLadder')))
  lines.push('')

  lines.push('## Section 5 — Possible revelations (does Ch3 plant a midpoint flip?)')
  lines.push('')
  lines.push('### Historical')
  lines.push(formatRevelations(histScaffolding?.possibleRevelations))
  lines.push('')
  lines.push('### New')
  lines.push(formatRevelations(val(newCh3, 'possible_revelations', 'possibleRevelations')))
  lines.push('')

  lines.push('## Section 6 — Active threads')
  lines.push('')
  lines.push('### Historical (carried + new in chapter)')
  lines.push(formatThreadIds(histSetup.activeThreadIds, histSetup.spineThreadId, histSetup.loadBearingThreadIds))
  lines.push('')
  lines.push('### New')
  lines.push(formatNewThreads(val(newCh3, 'active_threads', 'activeThreads')))
  lines.push('')

  lines.push('## Section 7 — Reading guide')
  lines.push('')
  lines.push('Reading the diff for whether the new structural-beat instruction landed as PIVOT:')
  lines.push('')
  lines.push('- **Ch3 = PIVOT** means: revelation lands that recontextualizes prior chapters; PC moves from reactive to proactive; stakes invert or escalate; something the PC believed in Ch1-2 turns out to be wrong, costly, or insufficient.')
  lines.push('- Historical Ch3 function was: *"The collection clock cannot be ignored any longer..."* — that\'s rising-action language, not flip-language. Audit caught this as the failure mode.')
  lines.push('- For the new run to read as PIVOT-landed:')
  lines.push('  - `chapter_frame.centralTension` should name something that *reverses* or *recontextualizes*, not just *escalates*')
  lines.push('  - `pressure_question` should be DIFFERENT from Ch1-Ch2\'s, not a sharper version')
  lines.push('  - `possible_revelations` should plant at least one revelation that recontextualizes prior chapters')
  lines.push('  - Pressure ladder should pace toward a flip moment, not a uniform escalation curve')
  lines.push('')
  lines.push('Compare side-by-side. If the new run still reads as "more pressure" rather than "the ground shifts," the prompt addition isn\'t enough — Phase 2 (schema enum + chapter-meaning validation) becomes the next slice.')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Appendix — priorChapterMeaning passed to author')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(priorMeaning, null, 2))
  lines.push('```')

  return lines.join('\n')
}

function formatFrame(f) {
  if (!f) return '(none)'
  const lines = ['```']
  lines.push(`centralTension: ${val(f, 'central_tension', 'centralTension') ?? ''}`)
  lines.push(`chapterScope: ${val(f, 'chapter_scope', 'chapterScope') ?? ''}`)
  lines.push(`objective: ${f.objective ?? ''}`)
  lines.push(`crucible: ${f.crucible ?? ''}`)
  const outcome = val(f, 'outcome_spectrum', 'outcomeSpectrum')
  if (outcome) {
    lines.push('outcomeSpectrum:')
    lines.push(`  clean: ${outcome.clean ?? ''}`)
    lines.push(`  costly: ${outcome.costly ?? ''}`)
    lines.push(`  failure: ${outcome.failure ?? ''}`)
    lines.push(`  catastrophic: ${outcome.catastrophic ?? ''}`)
  }
  lines.push('```')
  return lines.join('\n')
}

function formatOpeningScene(o) {
  if (!o) return '(none)'
  const lines = ['```']
  lines.push(`location: ${o.location ?? ''}`)
  lines.push(`atmosphericCondition: ${val(o, 'atmospheric_condition', 'atmosphericCondition') ?? ''}`)
  lines.push(`initialState: ${val(o, 'initial_state', 'initialState') ?? ''}`)
  lines.push(`firstPlayerFacing: ${val(o, 'first_player_facing', 'firstPlayerFacing') ?? ''}`)
  lines.push(`immediateChoice: ${val(o, 'immediate_choice', 'immediateChoice') ?? ''}`)
  const visible = val(o, 'visible_npc_ids', 'visibleNpcIds') ?? []
  lines.push(`visibleNpcIds: [${visible.join(', ')}]`)
  lines.push('```')
  return lines.join('\n')
}

function formatLadder(l) {
  if (!l || l.length === 0) return '(none)'
  return l.map((s, i) => {
    const id = s.id ?? `step_${i + 1}`
    const sev = s.severity ?? 'standard'
    const pressure = s.pressure ?? ''
    const trigger = val(s, 'trigger_condition', 'triggerCondition') ?? ''
    const effect = val(s, 'narrative_effect', 'narrativeEffect') ?? ''
    return `**${id}** (${sev})\n- pressure: ${pressure}\n- trigger: ${trigger}\n- effect: ${effect}`
  }).join('\n\n')
}

function formatRevelations(r) {
  if (!r || r.length === 0) return '(none planted)'
  return r.map((rev, i) => {
    const id = rev.id ?? `rev_${i + 1}`
    const statement = rev.statement ?? ''
    const heldBy = val(rev, 'held_by', 'heldBy') ?? ''
    const recontextualizes = rev.recontextualizes ?? ''
    return `**${id}**\n- statement: ${statement}\n- heldBy: ${heldBy}\n- recontextualizes: ${recontextualizes}`
  }).join('\n\n')
}

function formatThreadIds(active, spine, loadBearing) {
  const lines = []
  lines.push(`spine: ${spine ?? '(none)'}`)
  lines.push(`load-bearing: [${(loadBearing ?? []).join(', ')}]`)
  lines.push(`active: [${(active ?? []).join(', ')}]`)
  return '```\n' + lines.join('\n') + '\n```'
}

function formatNewThreads(threads) {
  if (!threads || threads.length === 0) return '(none)'
  return threads.map((t) => {
    const id = t.id ?? '(no id)'
    const title = t.title ?? ''
    const question = t.question ?? ''
    const tension = t.tension ?? ''
    const tag = t.is_load_bearing || t.isLoadBearing
      ? '**load-bearing**'
      : t.is_spine || t.isSpine
        ? '**SPINE**'
        : ''
    return `**${id}** ${tag}\n- title: ${title}\n- question: ${question}\n- tension: ${tension}`
  }).join('\n\n')
}

function val(obj, snake, camel) {
  if (!obj || typeof obj !== 'object') return undefined
  return obj[snake] ?? (camel ? obj[camel] : undefined)
}

function tagTool(tool) {
  return { ...tool, cache_control: { type: 'ephemeral' } }
}

function usageCost(usage) {
  const sonnet = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 }
  return ((usage.input_tokens * sonnet.input) +
    (usage.output_tokens * sonnet.output) +
    ((usage.cache_creation_input_tokens ?? 0) * sonnet.cacheWrite) +
    ((usage.cache_read_input_tokens ?? 0) * sonnet.cacheRead)) / 1_000_000
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
