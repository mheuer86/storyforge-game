#!/usr/bin/env node
// SF2 V1-into-V2 comparative evaluation pack.
// Usage:
//   npm run sf2:merge-eval -- --baseline <baseline.json> --merged <merged.json> [--out <memo.md>]
//
// The script is intentionally artifact-driven: it does not run live model calls.
// Feed it exported baseline and merged SF2 session/replay JSON produced from the
// same setup packets and player inputs. It emits a discussion memo with automatic
// comparability checks, evidence quotes, and the HITL scoring lanes.

const { readFileSync, writeFileSync } = require('node:fs')
const { basename, resolve } = require('node:path')

const SCORE_LANES = [
  'sensory specificity',
  'genre voice',
  'scene momentum',
  'reveal timing',
  'agency',
  'fabricated entities',
  'invalid patches',
  'missed due reveals',
  'restaged milestones',
]

const REQUIRED_HOOKS = [
  { id: 'forty', label: 'Forty Thousand', patterns: [/forty\s+thousand/i, /cantina/i, /space\s+opera/i] },
  { id: 'tithe', label: 'Tithe', patterns: [/\btithe\b/i, /\brenn\b/i, /who\s+is\s+he/i, /hegemony/i] },
]

main()

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.baseline || !args.merged) {
    console.error('Usage: npm run sf2:merge-eval -- --baseline <baseline.json> --merged <merged.json> [--out <memo.md>]')
    process.exit(2)
  }

  const baseline = loadArtifact(args.baseline, 'Baseline')
  const merged = loadArtifact(args.merged, 'Merged SF2')
  const report = renderReport(baseline, merged)

  if (args.out) {
    writeFileSync(resolve(process.cwd(), args.out), report)
    console.log(`Wrote ${args.out}`)
  } else {
    process.stdout.write(report)
  }
}

function loadArtifact(filePath, role) {
  const absolutePath = resolve(process.cwd(), filePath)
  let payload
  try {
    payload = JSON.parse(readFileSync(absolutePath, 'utf8'))
  } catch (error) {
    return {
      role,
      path: absolutePath,
      file: basename(filePath),
      error: error instanceof Error ? error.message : String(error),
      payload: null,
      runs: [],
      turns: [],
      text: '',
    }
  }

  const runs = extractRuns(payload)
  const turns = extractTurns(payload)
  const text = stringifyText(payload)
  return {
    role,
    path: absolutePath,
    file: basename(filePath),
    error: null,
    payload,
    runs,
    turns,
    text,
  }
}

function renderReport(baseline, merged) {
  const lines = []
  lines.push('# SF2 V1-Into-V2 Comparative Evaluation Memo')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## Inputs')
  lines.push('')
  lines.push(`- Baseline: ${baseline.file}${baseline.error ? ` (error: ${baseline.error})` : ''}`)
  lines.push(`- Merged: ${merged.file}${merged.error ? ` (error: ${merged.error})` : ''}`)
  lines.push('- Scope: artifact comparison only; no live Anthropic calls are made by this report script.')
  lines.push('')

  renderComparability(lines, baseline, merged)
  renderHookSections(lines, baseline, merged)
  renderContractAssertions(lines, baseline, merged)
  renderScorecard(lines, baseline, merged)
  renderDiscussionPrompts(lines)

  return `${lines.join('\n')}\n`
}

function renderComparability(lines, baseline, merged) {
  const baselineInputs = extractPlayerInputs(baseline.payload)
  const mergedInputs = extractPlayerInputs(merged.payload)
  const inputMatch = comparableInputs(baselineInputs, mergedInputs)
  const baselineChapters = countChapters(baseline)
  const mergedChapters = countChapters(merged)

  lines.push('## Comparability')
  lines.push('')
  lines.push('| Check | Baseline | Merged | Result |')
  lines.push('| --- | ---: | ---: | --- |')
  lines.push(`| Player inputs found | ${baselineInputs.length} | ${mergedInputs.length} | ${inputMatch ? 'match' : 'review'} |`)
  lines.push(`| Turns found | ${baseline.turns.length} | ${merged.turns.length} | ${baseline.turns.length && merged.turns.length ? 'ok' : 'artifact may be summarized'} |`)
  lines.push(`| Chapters found | ${baselineChapters || 'n/a'} | ${mergedChapters || 'n/a'} | ${mergedChapters >= 2 ? 'Ch1->Ch2 present' : 'needs Ch2 artifact'} |`)
  lines.push('')
  if (!inputMatch) {
    lines.push('- Review note: player input sequences are missing or differ. Treat prose deltas as directional until the runs are regenerated from identical inputs.')
    lines.push('')
  }
}

function renderHookSections(lines, baseline, merged) {
  lines.push('## Evidence By Hook')
  lines.push('')
  for (const hook of REQUIRED_HOOKS) {
    const baselineRuns = findHookRuns(baseline, hook)
    const mergedRuns = findHookRuns(merged, hook)
    lines.push(`### ${hook.label}`)
    lines.push('')
    lines.push(`- Baseline runs found: ${baselineRuns.length || 'none'}`)
    lines.push(`- Merged runs found: ${mergedRuns.length || 'none'}`)
    lines.push(`- Within-chapter depth: ${depthSummary(baselineRuns, mergedRuns)}`)
    lines.push('')
    lines.push('| Run | Evidence quote |')
    lines.push('| --- | --- |')
    for (const run of baselineRuns.slice(0, 2)) {
      lines.push(`| Baseline ${escapeCell(run.label)} | ${quoteCell(bestRunQuote(run))} |`)
    }
    for (const run of mergedRuns.slice(0, 2)) {
      lines.push(`| Merged ${escapeCell(run.label)} | ${quoteCell(bestRunQuote(run))} |`)
    }
    if (baselineRuns.length === 0 && mergedRuns.length === 0) {
      lines.push('| n/a | No hook evidence found in the supplied artifacts. |')
    }
    lines.push('')
  }
}

function renderContractAssertions(lines, baseline, merged) {
  const cashout = scanCashout(merged)
  const atmosphere = scanAtmosphere(merged)
  const continuation = scanContinuation(merged)

  lines.push('## Merge Contract Checks')
  lines.push('')
  lines.push('| Contract | Automatic signal | Result |')
  lines.push('| --- | --- | --- |')
  lines.push(`| Tithe cash-out | ${escapeCell(cashout.signal)} | ${cashout.ok ? 'pass signal' : 'needs artifact/prose review'} |`)
  lines.push(`| Forty Thousand atmosphere | ${escapeCell(atmosphere.signal)} | ${atmosphere.ok ? 'pass signal' : 'needs packet assertion'} |`)
  lines.push(`| Continuation Ch1->Ch2 | ${escapeCell(continuation.signal)} | ${continuation.ok ? 'pass signal' : 'needs close/setup artifact'} |`)
  lines.push('')
}

function renderScorecard(lines, baseline, merged) {
  lines.push('## Scorecard')
  lines.push('')
  lines.push('| Lane | Baseline auto signal | Merged auto signal | Human score | Notes |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const lane of SCORE_LANES) {
    const baseSignal = autoSignalForLane(lane, baseline)
    const mergedSignal = autoSignalForLane(lane, merged)
    lines.push(`| ${lane} | ${escapeCell(baseSignal)} | ${escapeCell(mergedSignal)} |  |  |`)
  }
  lines.push('')
}

function renderDiscussionPrompts(lines) {
  lines.push('## Discussion Notes')
  lines.push('')
  lines.push('- What merged passage should become the benchmark for first-image discipline?')
  lines.push('- Where did Sonnet add texture without slowing the scene?')
  lines.push('- Did any due revelation land too bluntly, or still hide after the player pressed it?')
  lines.push('- Did Chapter 2 open from Chapter 1 consequences instead of restaging Chapter 1 machinery?')
  lines.push('- Are any atmospheric details implying hidden facts rather than visible pressure?')
  lines.push('')
}

function extractRuns(payload) {
  if (!payload || typeof payload !== 'object') return []
  if (payload.runs && typeof payload.runs === 'object') {
    return Object.entries(payload.runs).map(([key, value]) => ({
      label: key,
      payload: value,
      text: stringifyText(value),
      turns: extractTurns(value),
      inputs: extractPlayerInputs(value),
    }))
  }

  const turns = extractTurns(payload)
  return [{
    label: payload.name || payload.summary?.title || 'artifact',
    payload,
    text: stringifyText(payload),
    turns,
    inputs: extractPlayerInputs(payload),
  }]
}

function extractTurns(payload) {
  const candidates = [
    get(payload, ['turns']),
    get(payload, ['history', 'turns']),
    get(payload, ['state', 'history', 'turns']),
    get(payload, ['finalState', 'history', 'turns']),
    get(payload, ['replay', 'turns']),
    get(payload, ['replayFrames']),
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  if (payload && typeof payload === 'object' && payload.input?.narrator) return [payload.input]
  return []
}

function extractPlayerInputs(payload) {
  const values = []
  walk(payload, (key, value) => {
    if (typeof value !== 'string') return
    if (/^(playerInput|player_input|midTurnInput|input)$/i.test(key)) values.push(normalize(value))
  })
  return values.filter(Boolean)
}

function findHookRuns(artifact, hook) {
  return artifact.runs.filter((run) => hook.patterns.some((pattern) => pattern.test(`${run.label}\n${run.text}`)))
}

function bestRunQuote(run) {
  const candidates = []
  walk(run.payload, (key, value) => {
    if (typeof value !== 'string') return
    if (!/(text|prose|output|opening|turn)$/i.test(key)) return
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (cleaned.length >= 60) candidates.push(cleaned)
  })
  candidates.sort((a, b) => scoreQuote(b) - scoreQuote(a))
  return excerpt(candidates[0] || run.text, 260)
}

function scoreQuote(text) {
  const sensory = countMatches(text, /\b(smell|smells|sound|hum|heat|cold|light|flicker|static|oil|dust|metal|air|voice|hands|door|table|clock|registry|manifest)\b/gi)
  const human = countMatches(text, /\b(you|he|she|they|woman|man|child|officer|broker|warden|clerk|elder|voice|hands|eyes)\b/gi)
  return sensory * 2 + human + Math.min(text.length / 80, 5)
}

function depthSummary(baselineRuns, mergedRuns) {
  const baselineDepth = Math.max(0, ...baselineRuns.map((run) => chapterOneDepth(run)))
  const mergedDepth = Math.max(0, ...mergedRuns.map((run) => chapterOneDepth(run)))
  if (baselineDepth >= 8 && mergedDepth >= 8) return `8-12 turn window available (${baselineDepth}/${mergedDepth})`
  return `baseline ${baselineDepth || 'summary-only'}, merged ${mergedDepth || 'summary-only'}`
}

function chapterOneDepth(run) {
  const turns = run.turns.filter((turn) => Number(turn.chapter ?? turn.stateBefore?.meta?.currentChapter ?? 1) === 1)
  if (turns.length > 0) return turns.length
  return countMatches(run.text, /\bturn\b/gi)
}

function scanCashout(artifact) {
  const text = artifact.text
  const hasQuestion = /who\s+is\s+he/i.test(text)
  const hasDue = /"due"\s*:\s*true|due:\s*true|DUE NOW|revelationProgress/i.test(text)
  const hasRenn = /\brenn\b|younger\s+man/i.test(text)
  const hasDeployment = /planted_revelation_deployed|revelationsRevealed|revelation_due_unfulfilled/i.test(text)
  return {
    ok: hasQuestion && hasDue && hasRenn && hasDeployment,
    signal: [
      hasQuestion ? 'player topic present' : 'no topic prompt found',
      hasDue ? 'due signal present' : 'no due signal found',
      hasRenn ? 'Renn/younger man present' : 'Renn evidence absent',
      hasDeployment ? 'deployment/finding signal present' : 'no deployment/finding signal',
    ].join('; '),
  }
}

function scanAtmosphere(artifact) {
  const text = artifact.text
  const details = [
    /\bcantina\b/i,
    /\bfryer|oil|fried\b/i,
    /\bdeparture\s+clock|arrival\s+board\b/i,
    /\bmanifest|seal|cargo|freight\b/i,
    /atmosphericConditions/i,
  ].filter((pattern) => pattern.test(text)).length
  return {
    ok: details >= 3,
    signal: `${details}/5 expected cantina/space-opera atmosphere signals`,
  }
}

function scanContinuation(artifact) {
  const text = artifact.text
  const hasCh2 = /chapter\s*2|currentChapter"\s*:\s*2|Ch2/i.test(text)
  const hasContinuation = /continuation_moves|continuation_dramatic_turn|transition_seed|Chapter 2/i.test(text)
  const validationErrors = countMatches(text, /validationErrors|validation error|missing continuation|opening location must bridge/gi)
  return {
    ok: hasCh2 && hasContinuation && validationErrors === 0,
    signal: `${hasCh2 ? 'Ch2 signal' : 'no Ch2 signal'}; ${hasContinuation ? 'continuation fields present' : 'continuation fields absent'}; ${validationErrors} validation-error markers`,
  }
}

function autoSignalForLane(lane, artifact) {
  const text = artifact.text
  switch (lane) {
    case 'sensory specificity':
      return `${countMatches(text, /\b(smell|smells|sound|hum|heat|cold|light|flicker|static|oil|dust|metal|air)\b/gi)} sensory markers`
    case 'genre voice':
      return `${countMatches(text, /\b(manifest|registry|tithe|cantina|freight|station|shield|noble|warden|customs)\b/gi)} genre markers`
    case 'scene momentum':
      return `${countMatches(text, /\b(says|asks|turns|moves|presses|opens|steps|answers|reaches)\b/gi)} action/dialogue markers`
    case 'reveal timing':
      return `${countMatches(text, /\brevelation|revealed|due|who is he|planted_revelation_deployed\b/gi)} reveal markers`
    case 'agency':
      return `${countMatches(text, /\b(choice|choose|you can|what do you|offer|refuse|accept|press)\b/gi)} agency markers`
    case 'fabricated entities':
      return `${countMatches(text, /\bfabricated|unknown entity|offstage|absent speaker|canonical id\b/gi)} risk markers`
    case 'invalid patches':
      return `${countMatches(text, /\binvalid patch|validationErrors|rejected|deferred|coherenceFindings\b/gi)} validation markers`
    case 'missed due reveals':
      return `${countMatches(text, /revelation_due_unfulfilled|due reveal missed|missed due/gi)} missed-due markers`
    case 'restaged milestones':
      return `${countMatches(text, /restage|do_not_restage|same milestone|opening location must bridge/gi)} restage markers`
    default:
      return 'n/a'
  }
}

function countChapters(artifact) {
  const chapters = new Set()
  for (const turn of artifact.turns) {
    const chapter = turn.chapter ?? turn.stateBefore?.meta?.currentChapter ?? turn.stateAfter?.meta?.currentChapter
    if (chapter) chapters.add(Number(chapter))
  }
  const textChapters = countMatches(artifact.text, /chapter\s*\d+/gi)
  return Math.max(chapters.size, textChapters > 0 ? 1 : 0)
}

function comparableInputs(a, b) {
  if (a.length === 0 || b.length === 0) return false
  const min = Math.min(a.length, b.length)
  const left = a.slice(0, min)
  const right = b.slice(0, min)
  return left.every((value, index) => value === right[index])
}

function stringifyText(value) {
  const parts = []
  walk(value, (key, leaf) => {
    if (typeof leaf !== 'string') return
    if (leaf.length < 3) return
    if (/(api[_-]?key|token|secret|authorization|cookie)/i.test(key)) return
    parts.push(leaf)
  })
  return parts.join('\n')
}

function walk(value, visit, key = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, String(index)))
    return
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) walk(childValue, visit, childKey)
    return
  }
  visit(key, value)
}

function get(value, path) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = current[key]
  }
  return current
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function excerpt(value, maxLength) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}...`
}

function quoteCell(text) {
  const escaped = escapeCell(excerpt(text, 260))
  return escaped ? `"${escaped}"` : '(none)'
}

function escapeCell(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function countMatches(text, pattern) {
  return (String(text || '').match(pattern) || []).length
}

function parseArgs(raw) {
  const args = {}
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i]
    if (arg === '--baseline') args.baseline = raw[++i]
    else if (arg === '--merged') args.merged = raw[++i]
    else if (arg === '--out') args.out = raw[++i]
    else if (!args.baseline) args.baseline = arg
    else if (!args.merged) args.merged = arg
  }
  return args
}
