#!/usr/bin/env node
// Lightweight A/B report skeleton for exported SF2 session/replay artifacts.
// Usage: node scripts/sf2b-eval-report.cjs <artifact-a.json> [artifact-b.json ...]

const { readFileSync } = require('node:fs')
const { basename } = require('node:path')

const paths = process.argv.slice(2)

if (paths.length === 0) {
  console.error('Usage: node scripts/sf2b-eval-report.cjs <artifact-a.json> [artifact-b.json ...]')
  process.exit(2)
}

const artifacts = paths.map((path, index) => loadArtifact(path, index))

console.log('# SF2B Hook-Driven Spike Eval Report')
console.log()
console.log(`Artifacts: ${artifacts.map((artifact) => artifact.label).join(' vs ')}`)
console.log()
printOverview(artifacts)
printSection('Prose', artifacts, proseNotes)
printSection('Pacing', artifacts, pacingNotes)
printSection('Roll Consequence', artifacts, rollConsequenceNotes)
printSection('State Coherence', artifacts, stateCoherenceNotes)
printSection('Chapter 2 Hook', artifacts, chapterTwoHookNotes)
printSection('Structure Visibility', artifacts, structureVisibilityNotes)
printSection('Hard Failures', artifacts, hardFailureNotes)

function loadArtifact(path, index) {
  let payload
  try {
    payload = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return {
      label: labelFor(index, path),
      path,
      error: `Failed to read or parse JSON: ${error.message}`,
      payload: null,
      state: null,
      turns: [],
      summary: null,
      debug: [],
    }
  }

  const state = payload.state || payload.finalState || payload.initialState || null
  const turns =
    arrayAt(payload, ['turns']) ||
    arrayAt(payload, ['history', 'turns']) ||
    arrayAt(state, ['history', 'turns']) ||
    arrayAt(payload, ['replay', 'turns']) ||
    []

  return {
    label: labelFor(index, path),
    path,
    error: null,
    payload,
    state,
    turns,
    summary: payload.summary || null,
    debug: Array.isArray(payload.debug) ? payload.debug : [],
  }
}

function printOverview(artifacts) {
  console.log('## Overview')
  console.log()
  console.log('| Run | File | Chapters | Turns | Genre | Notes |')
  console.log('| --- | --- | ---: | ---: | --- | --- |')
  for (const artifact of artifacts) {
    const state = artifact.state
    const chapters = artifact.summary?.chapters || state?.meta?.currentChapter || chapterCount(artifact.turns) || ''
    const turns = artifact.summary?.totalTurns || artifact.turns.length || state?.history?.turns?.length || ''
    const genre = artifact.summary?.genreId || state?.meta?.genreId || ''
    const notes = artifact.error ? artifact.error : ''
    console.log(`| ${artifact.label} | ${basename(artifact.path)} | ${chapters} | ${turns} | ${genre} | ${escapeCell(notes)} |`)
  }
  console.log()
}

function printSection(title, artifacts, noteBuilder) {
  console.log(`## ${title}`)
  console.log()
  for (const artifact of artifacts) {
    console.log(`### ${artifact.label}`)
    if (artifact.error) {
      console.log(`- Hard failure: ${artifact.error}`)
      console.log()
      continue
    }
    const notes = noteBuilder(artifact)
    for (const note of notes) {
      console.log(`- ${note}`)
    }
    console.log('- Human rating:')
    console.log('- Evidence:')
    console.log('- Delta vs baseline:')
    console.log()
  }
}

function proseNotes(artifact) {
  const last = lastTurn(artifact)
  return [
    `Last prose excerpt: ${excerpt(last?.narratorProse || last?.prose || '', 220) || '(none found)'}`,
    `Narrator turns found: ${artifact.turns.filter((turn) => turn.narratorProse || turn.prose).length}`,
  ]
}

function pacingNotes(artifact) {
  const state = artifact.state
  const activeThreads = Object.values(state?.campaign?.threads || {}).filter((thread) => thread.status === 'active')
  const sceneEnds = artifact.turns.filter((turn) =>
    JSON.stringify(turn.narratorAnnotation || turn.annotation || {}).includes('scene_end')
  )
  return [
    `Active unresolved threads at export: ${activeThreads.length}`,
    `Scene-end annotations observed: ${sceneEnds.length}`,
    `Pacing advisories in summary/debug: ${artifact.summary?.pacing?.advisoriesFired ?? countDebugKind(artifact, 'pacing')}`,
  ]
}

function rollConsequenceNotes(artifact) {
  const stateRolls = arrayAt(artifact.state, ['history', 'rollLog']) || []
  const turnRolls = artifact.turns.flatMap((turn) => turn.turnResolution?.rollRecords || [])
  const rolls = stateRolls.length > 0 ? stateRolls : turnRolls
  const withConsequence = rolls.filter((roll) => roll.consequenceSummary).length
  return [
    `Rolls observed: ${rolls.length}`,
    `Rolls with consequence summaries: ${withConsequence}`,
  ]
}

function stateCoherenceNotes(artifact) {
  const summary = artifact.summary
  const rejected = summary?.archivist?.rejected
  const deferred = summary?.archivist?.deferred
  const findings = artifact.turns.flatMap((turn) => turn.turnResolution?.driftFindings || [])
  return [
    `Archivist rejected/deferred writes: ${rejected ?? 'n/a'} / ${deferred ?? 'n/a'}`,
    `Turn-resolution drift findings observed: ${findings.length}`,
  ]
}

function chapterTwoHookNotes(artifact) {
  const ch2Turns = artifact.turns.filter((turn) => turn.chapter === 2)
  const first = ch2Turns[0]
  const setup = artifact.state?.chapter?.setup
  return [
    `Chapter 2 turns found: ${ch2Turns.length}`,
    `Current chapter title/setup: ${setup?.title || artifact.state?.chapter?.title || '(none found)'}`,
    `First Chapter 2 excerpt: ${excerpt(first?.narratorProse || '', 220) || '(none found)'}`,
  ]
}

function structureVisibilityNotes(artifact) {
  const prose = artifact.turns.map((turn) => turn.narratorProse || '').join('\n')
  const visibleMarkers = [
    /\bchapter\b/i,
    /\bscene\b/i,
    /\broll\b/i,
    /\bdc\s*\d+/i,
    /\bthread\b/i,
    /\barchivist\b/i,
    /\bauthor\b/i,
  ].filter((regex) => regex.test(prose)).length
  return [
    `Visible structure marker families detected in prose: ${visibleMarkers}`,
    'Check whether mechanical scaffolding is helpful UI texture or leaked internals.',
  ]
}

function hardFailureNotes(artifact) {
  const failures = []
  if (!artifact.state) failures.push('No state object found.')
  if (artifact.turns.length === 0) failures.push('No turns found.')
  failures.push(...artifact.debug.filter((event) => /error|failure/i.test(event.kind || '')).map((event) => `Debug ${event.kind}`))
  if (failures.length === 0) return ['No automatic hard failures detected by this skeleton.']
  return failures
}

function labelFor(index, path) {
  return `${String.fromCharCode(65 + index)} (${basename(path)})`
}

function arrayAt(root, path) {
  let value = root
  for (const key of path) {
    if (!value || typeof value !== 'object') return null
    value = value[key]
  }
  return Array.isArray(value) ? value : null
}

function lastTurn(artifact) {
  return artifact.turns[artifact.turns.length - 1]
}

function chapterCount(turns) {
  return new Set(turns.map((turn) => turn.chapter).filter(Boolean)).size
}

function countDebugKind(artifact, kind) {
  return artifact.debug.filter((event) => event.kind === kind).length
}

function excerpt(text, maxLength) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1).trim()}…`
}

function escapeCell(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}
