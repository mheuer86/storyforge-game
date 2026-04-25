#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = process.argv[2] ?? 'fixtures/sf2/replay'
const paths = collectJson(resolve(process.cwd(), target))

if (paths.length === 0) {
  console.error(`No fixture JSON files found at ${target}`)
  process.exit(2)
}

let beforeTotal = 0
let afterTotal = 0
for (const path of paths) {
  const before = statSync(path).size
  const fixture = JSON.parse(readFileSync(path, 'utf8'))
  if (fixture.schema !== 'sf2-replay-fixture/v1' || !fixture.input?.stateBefore) continue
  compactFixture(fixture)
  writeFileSync(path, `${JSON.stringify(fixture, null, 2)}\n`)
  const after = statSync(path).size
  beforeTotal += before
  afterTotal += after
  console.log(`${path}: ${formatBytes(before)} -> ${formatBytes(after)}`)
}

console.log(`Total: ${formatBytes(beforeTotal)} -> ${formatBytes(afterTotal)}`)

function collectJson(path) {
  if (!existsSync(path)) return []
  const stat = statSync(path)
  if (stat.isFile()) return path.endsWith('.json') ? [path] : []
  return readdirSync(path)
    .flatMap((entry) => collectJson(resolve(path, entry)))
    .sort()
}

function compactFixture(fixture) {
  const input = fixture.input
  const state = input.stateBefore
  if (typeof input.turnIndex !== 'number') {
    input.turnIndex = Number(fixture.source?.turnIndex ?? state.history?.turns?.length ?? 0)
  }

  compactHistory(state.history)
  compactSceneBundle(state.world)
  delete state.derived?.workingSet
  delete state.derived?.pacing

  fixture.compaction = {
    kind: 'sf2-replay-compact/v1',
    history: 'keeps turn rows but truncates prior prose and removes raw narrator annotations',
    sceneBundle: 'preserves cache identity metadata, truncates bundleText',
  }
}

function compactHistory(history) {
  if (!history) return
  const turns = Array.isArray(history.turns) ? history.turns : []
  const keepFullFrom = Math.max(0, turns.length - 3)
  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i]
    if (!turn || typeof turn !== 'object') continue
    delete turn.narratorAnnotationRaw
    if (turn.narratorAnnotation?.mechanicalEffects?.length === 0) {
      delete turn.narratorAnnotation.mechanicalEffects
    }
    if (i < keepFullFrom) {
      turn.playerInput = truncate(turn.playerInput, 180)
      turn.narratorProse = truncate(turn.narratorProse, 260)
      delete turn.narratorAnnotation
      delete turn.archivistPatchApplied
    } else {
      turn.playerInput = truncate(turn.playerInput, 500)
      turn.narratorProse = truncate(turn.narratorProse, 1200)
      if (turn.archivistPatchApplied) delete turn.archivistPatchApplied
    }
  }
  history.recentTurns = turns.slice(-6)
}

function compactSceneBundle(world) {
  const cache = world?.sceneBundleCache
  if (!cache || typeof cache.bundleText !== 'string') return
  cache.bundleText = truncate(cache.bundleText, 500)
}

function truncate(value, max) {
  if (typeof value !== 'string' || value.length <= max) return value
  return `${value.slice(0, max).trimEnd()}... [fixture-truncated]`
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}
