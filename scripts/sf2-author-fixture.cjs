#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const args = parseArgs(process.argv.slice(2))
if (!args.kind || !args.out) {
  console.error('Usage: npm run sf2:author-fixture -- --kind arc|chapter --out <path> [--name fixture-name]')
  process.exit(2)
}

const name = args.name ?? `${args.kind}-fixture`
const fixture = args.kind === 'arc'
  ? {
      schema: 'sf2-author-arc-fixture/v1',
      name,
      input: {
        statePreset: 'initial',
        arcVariantSeeds: [
          {
            id: 'variant-1',
            scenarioBias: 'protection',
            creativeAngle: 'Name the pressure angle for this run.',
            avoidModes: ['investigation', 'chamber_play'],
          },
        ],
      },
      expected: {
        minPressureEngines: 3,
        minStanceAxes: 3,
        chapterFunctionCount: 5,
        textAbsent: [],
      },
    }
  : {
      schema: 'sf2-author-chapter-fixture/v1',
      name,
      input: { statePreset: 'initial', targetChapter: 1 },
      expected: {
        visibleNpcCountMax: 2,
        pacingTarget: { min: 18, max: 25 },
        textAbsent: [],
      },
    }

const out = path.resolve(process.cwd(), args.out)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`Wrote ${out}`)

function parseArgs(raw) {
  const parsed = {}
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === '--kind') parsed.kind = raw[++i]
    else if (raw[i] === '--out') parsed.out = raw[++i]
    else if (raw[i] === '--name') parsed.name = raw[++i]
  }
  return parsed
}
