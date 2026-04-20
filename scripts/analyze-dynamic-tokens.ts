#!/usr/bin/env bun
// Analyze dynamic-block token growth from an exported debug log.
// Usage: bun scripts/analyze-dynamic-tokens.ts path/to/storyforge-debug-YYYY-MM-DD.txt
//
// Parses SYSTEM_DYNAMIC block emissions and charts per-turn token counts,
// grouped by chapter. Used for Stage 2.5 attention budget measurement.
// Target: dynamic block < 1800 tokens at chapter 4.

import { readFileSync } from 'fs'

const TARGET = 1800

interface DynamicEmission {
  tokens: number
  chapter: number | null
  turn: number
  unchanged: boolean
}

function parse(log: string): DynamicEmission[] {
  const lines = log.split('\n')
  const emissions: DynamicEmission[] = []
  let i = 0
  let turnIdx = 0

  while (i < lines.length) {
    const line = lines[i]

    const unchanged = line.match(/=== SYSTEM_DYNAMIC unchanged \(hash: [^,]+, ~(\d+) tokens\) ===/)
    if (unchanged) {
      turnIdx++
      emissions.push({ tokens: parseInt(unchanged[1]), chapter: null, turn: turnIdx, unchanged: true })
      i++
      continue
    }

    const begin = line.match(/=== BEGIN SYSTEM_DYNAMIC \(hash: [^,]+, ~(\d+) tokens\) ===/)
    if (begin) {
      const tokens = parseInt(begin[1])
      let chapter: number | null = null
      // Walk forward until END SYSTEM_DYNAMIC, looking for CHAPTER N: line
      let j = i + 1
      while (j < lines.length && !lines[j].startsWith('=== END SYSTEM_DYNAMIC')) {
        const chMatch = lines[j].match(/^CHAPTER (\d+):/)
        if (chMatch) { chapter = parseInt(chMatch[1]); break }
        j++
      }
      turnIdx++
      emissions.push({ tokens, chapter, turn: turnIdx, unchanged: false })
      // Skip ahead to end marker
      while (j < lines.length && !lines[j].startsWith('=== END SYSTEM_DYNAMIC')) j++
      i = j + 1
      continue
    }

    i++
  }

  // Propagate chapter forward for unchanged emissions (no chapter line because content skipped)
  let lastChapter: number | null = null
  for (const e of emissions) {
    if (e.chapter != null) lastChapter = e.chapter
    else e.chapter = lastChapter
  }

  return emissions
}

function groupByChapter(es: DynamicEmission[]): Map<number, number[]> {
  const m = new Map<number, number[]>()
  for (const e of es) {
    if (e.chapter == null) continue
    const arr = m.get(e.chapter) ?? []
    arr.push(e.tokens)
    m.set(e.chapter, arr)
  }
  return m
}

function stats(ns: number[]) {
  if (ns.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p90: 0 }
  const sorted = [...ns].sort((a, b) => a - b)
  const mean = ns.reduce((a, b) => a + b, 0) / ns.length
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  return { min: sorted[0], max: sorted[sorted.length - 1], mean: Math.round(mean), p50: q(0.5), p90: q(0.9) }
}

function sparkline(ns: number[], max: number): string {
  const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  return ns.map(n => bars[Math.min(bars.length - 1, Math.floor((n / max) * (bars.length - 1)))]).join('')
}

// ── main ──
const file = process.argv[2]
if (!file) {
  console.error('Usage: bun scripts/analyze-dynamic-tokens.ts <debug-log.txt>')
  process.exit(1)
}
const log = readFileSync(file, 'utf-8')
const emissions = parse(log)

console.log(`\n=== SYSTEM_DYNAMIC analysis: ${file} ===`)
console.log(`Total emissions: ${emissions.length} (${emissions.filter(e => e.unchanged).length} unchanged)\n`)

const byCh = groupByChapter(emissions)
const chapters = [...byCh.keys()].sort((a, b) => a - b)

const globalMax = Math.max(...emissions.map(e => e.tokens), TARGET)

console.log('Per-chapter stats (tokens):')
console.log('chapter | turns | min  | mean | p50  | p90  | max  | vs 1800 | trend')
console.log('--------|-------|------|------|------|------|------|---------|' + '-'.repeat(20))
for (const ch of chapters) {
  const ns = byCh.get(ch)!
  const s = stats(ns)
  const gapMax = s.max - TARGET
  const vs = gapMax > 0 ? `+${gapMax} over` : `${TARGET - s.max} under`
  const trend = sparkline(ns, globalMax)
  console.log(
    `  ${String(ch).padStart(3)}   | ${String(ns.length).padStart(4)}  | ${String(s.min).padStart(4)} | ${String(s.mean).padStart(4)} | ${String(s.p50).padStart(4)} | ${String(s.p90).padStart(4)} | ${String(s.max).padStart(4)} | ${vs.padStart(8)} | ${trend}`
  )
}

console.log(`\nTarget: dynamic block < ${TARGET} tokens at chapter 4`)
const ch4 = byCh.get(4)
if (ch4 && ch4.length > 0) {
  const s = stats(ch4)
  const verdict = s.p90 <= TARGET
    ? `✓ PASS — ch4 p90 is ${s.p90}, under target by ${TARGET - s.p90}`
    : `✗ FAIL — ch4 p90 is ${s.p90}, over target by ${s.p90 - TARGET}`
  console.log(verdict)
  console.log(`  Implication: ${s.p90 <= TARGET ? 'Stage 3 refactor is premature. Consider lighter alternatives.' : 'Stage 3 refactor is justified by data.'}`)
} else {
  console.log('(No chapter 4 data in this log yet.)')
}
