#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = parseArgs(process.argv.slice(2))

if (!args.input || !args.name) {
  console.error([
    'Usage: npm run sf2:fixture -- --input <export.json> --turn <index> --name <fixture-name> [--out <path>]',
    '',
    'Requires a replay-frame export containing frames[] or replayFrames[] with stateBefore/stateAfter.',
    'Legacy session logs that only contain final state.history.turns cannot be transformed safely.',
  ].join('\n'))
  process.exit(2)
}

const inputPath = resolve(process.cwd(), args.input)
const payload = JSON.parse(readFileSync(inputPath, 'utf8'))
const frames = Array.isArray(payload.frames)
  ? payload.frames
  : Array.isArray(payload.replayFrames)
    ? payload.replayFrames
    : null

if (!frames) {
  console.error(
    'Export does not contain frames[] or replayFrames[]. Re-export with "Download replay fixture (.json)" or supply a frame export.'
  )
  process.exit(2)
}

const turnIndex = args.turn === undefined ? frames[0]?.turnIndex : Number(args.turn)
const frame = frames.find((f) => Number(f.turnIndex) === turnIndex)
if (!frame) {
  console.error(`No replay frame found for turnIndex ${turnIndex}. Available: ${frames.map((f) => f.turnIndex).join(', ')}`)
  process.exit(2)
}

if (!frame.stateBefore) {
  console.error(
    `Frame ${turnIndex} has no stateBefore. The transformer will not invent before-state from final session state.`
  )
  process.exit(2)
}

const mechanicalEffects = Array.isArray(frame.mechanicalEffects)
  ? frame.mechanicalEffects
  : extractMechanicalEffects(frame.narrator?.annotation ?? null)

const fixture = {
  schema: 'sf2-replay-fixture/v1',
  name: args.name,
  source: {
    sessionFile: inputPath.split('/').pop(),
    turnIndex,
    exportedAt: payload.exportedAt ?? null,
    campaignId: payload.campaignId ?? payload.state?.meta?.campaignId ?? null,
  },
  input: {
    turnIndex,
    stateBefore: frame.stateBefore,
    playerInput: frame.playerInput ?? '',
    isInitial: Boolean(frame.isInitial),
    narrator: {
      prose: frame.narrator?.prose ?? '',
      annotation: frame.narrator?.annotation ?? null,
      mechanicalEffects,
    },
    archivist: {
      patch: frame.archivist?.patch ?? null,
    },
  },
  expected: {
    presentNpcIdsIncludes: [],
    presentNpcIdsExcludes: [],
    scenePacketCastIncludes: [],
    scenePacketCastExcludes: [],
    npcNamesAbsent: [],
    npcIdsIncludes: [],
    currentSceneId: null,
    currentTimeLabel: null,
    currentLocationId: null,
    sceneBundleCacheCleared: null,
    invariantEventsInclude: [],
    archivistAcceptedRefs: [],
    archivistRejectedRefs: [],
  },
}

const outPath = resolve(
  process.cwd(),
  args.out ?? `fixtures/sf2/replay/${args.name}.json`
)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`Wrote ${outPath}`)

function parseArgs(raw) {
  const parsed = {}
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i]
    if (arg === '--input') parsed.input = raw[++i]
    else if (arg === '--turn') parsed.turn = raw[++i]
    else if (arg === '--name') parsed.name = raw[++i]
    else if (arg === '--out') parsed.out = raw[++i]
    else if (!parsed.input) parsed.input = arg
  }
  return parsed
}

function extractMechanicalEffects(annotation) {
  if (!annotation) return []
  if (Array.isArray(annotation.mechanical_effects)) return annotation.mechanical_effects
  if (Array.isArray(annotation.mechanicalEffects)) return annotation.mechanicalEffects
  return []
}
