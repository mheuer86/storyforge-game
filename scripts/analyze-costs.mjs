#!/usr/bin/env node
// Aggregates token + cost from Storyforge CSV exports.
// Prices (Sonnet 4.6, USD per 1M tokens):
//   input = $3, output = $15, cache_write = $3.75 (1.25x), cache_read = $0.30 (0.1x)
// Haiku (if extractor downshifts later): input $1, output $5, cache_write $1.25, cache_read $0.10

import fs from 'node:fs'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('usage: node analyze-costs.mjs <csv> [<csv> ...]')
  process.exit(1)
}

const PRICE_INPUT = 3
const PRICE_OUTPUT = 15
const PRICE_CACHE_WRITE = 3.75
const PRICE_CACHE_READ = 0.30

function tokensOf(row) {
  return {
    input: Number(row[1]) || 0,
    output: Number(row[2]) || 0,
    write: Number(row[3]) || 0,
    read: Number(row[4]) || 0,
  }
}

function costOf(t) {
  return (
    (t.input * PRICE_INPUT + t.output * PRICE_OUTPUT + t.write * PRICE_CACHE_WRITE + t.read * PRICE_CACHE_READ)
    / 1_000_000
  )
}

function parseCsv(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split('\n')
  const header = lines[0].split(',')
  return lines.slice(1).map(l => l.split(','))
}

// Read all files; the largest is the cumulative run
const all = files.map(f => ({ path: f, rows: parseCsv(f) }))
all.sort((a, b) => a.rows.length - b.rows.length)
const cumulative = all[all.length - 1]

console.log('='.repeat(80))
console.log('Storyforge cost + token analysis')
console.log('='.repeat(80))
console.log(`Cumulative log: ${cumulative.path} (${cumulative.rows.length} API calls)`)
console.log('')

// Derive per-chapter deltas by subtracting row counts
const chapters = all.map((f, i) => {
  const name = f.path.match(/Chapter\s*(\d+)/)?.[1] ?? String(i + 1)
  const prevCount = i === 0 ? 0 : all[i - 1].rows.length
  const rows = f.rows.slice(prevCount)  // rows unique to this chapter
  return { name, rows, callCount: rows.length }
})

// Sum helpers
function sumTokens(rows) {
  const t = { input: 0, output: 0, write: 0, read: 0 }
  for (const r of rows) {
    const row = tokensOf(r)
    t.input += row.input; t.output += row.output; t.write += row.write; t.read += row.read
  }
  return t
}

// Per-chapter breakdown
console.log('Per-chapter token + cost breakdown')
console.log('-'.repeat(80))
console.log('Chapter  Calls   Input       Output    Cache-W     Cache-R     $ total')
console.log('-'.repeat(80))
let totalCost = 0
for (const ch of chapters) {
  const t = sumTokens(ch.rows)
  const cost = costOf(t)
  totalCost += cost
  console.log(
    `  ${ch.name.padEnd(5)}  ${String(ch.callCount).padStart(5)}  ${String(t.input).padStart(10)}  ${String(t.output).padStart(9)}  ${String(t.write).padStart(10)}  ${String(t.read).padStart(10)}  $${cost.toFixed(4)}`
  )
}
console.log('-'.repeat(80))
const totalT = sumTokens(cumulative.rows)
console.log(
  `  TOTAL  ${String(cumulative.rows.length).padStart(5)}  ${String(totalT.input).padStart(10)}  ${String(totalT.output).padStart(9)}  ${String(totalT.write).padStart(10)}  ${String(totalT.read).padStart(10)}  $${totalCost.toFixed(4)}`
)
console.log('')

// Cache effectiveness
console.log('Cache effectiveness (cumulative)')
console.log('-'.repeat(80))
const totalContextInput = totalT.input + totalT.write + totalT.read
const hitRate = totalContextInput === 0 ? 0 : (totalT.read / totalContextInput) * 100
const writeRate = totalContextInput === 0 ? 0 : (totalT.write / totalContextInput) * 100
console.log(`Total context tokens ingested:  ${totalContextInput.toLocaleString()}`)
console.log(`  of which cache-read (hits):   ${totalT.read.toLocaleString()}  (${hitRate.toFixed(1)}%)`)
console.log(`  of which cache-write (misses):${totalT.write.toLocaleString()}  (${writeRate.toFixed(1)}%)`)
console.log(`  of which fresh input:         ${totalT.input.toLocaleString()}  (${((totalT.input / totalContextInput) * 100).toFixed(1)}%)`)
console.log('')

// Cost breakdown by component
console.log('Cost breakdown (cumulative)')
console.log('-'.repeat(80))
const cInput = totalT.input * PRICE_INPUT / 1_000_000
const cOutput = totalT.output * PRICE_OUTPUT / 1_000_000
const cWrite = totalT.write * PRICE_CACHE_WRITE / 1_000_000
const cRead = totalT.read * PRICE_CACHE_READ / 1_000_000
console.log(`Fresh input        $${cInput.toFixed(4)}  (${((cInput / totalCost) * 100).toFixed(1)}%)`)
console.log(`Output             $${cOutput.toFixed(4)}  (${((cOutput / totalCost) * 100).toFixed(1)}%)`)
console.log(`Cache write (miss) $${cWrite.toFixed(4)}  (${((cWrite / totalCost) * 100).toFixed(1)}%)`)
console.log(`Cache read (hit)   $${cRead.toFixed(4)}  (${((cRead / totalCost) * 100).toFixed(1)}%)`)
console.log(`Total              $${totalCost.toFixed(4)}`)
console.log('')

// Per-call averages
console.log('Per-API-call averages (cumulative)')
console.log('-'.repeat(80))
const n = cumulative.rows.length
console.log(`Input   avg: ${Math.round(totalT.input / n).toLocaleString()}  tokens/call`)
console.log(`Output  avg: ${Math.round(totalT.output / n).toLocaleString()}  tokens/call`)
console.log(`Write   avg: ${Math.round(totalT.write / n).toLocaleString()}  tokens/call`)
console.log(`Read    avg: ${Math.round(totalT.read / n).toLocaleString()}  tokens/call`)
console.log(`Cost    avg: $${(totalCost / n).toFixed(4)}/call`)
console.log('')

// Highest-cost individual calls
console.log('Top 5 most expensive individual API calls')
console.log('-'.repeat(80))
const withCost = cumulative.rows.map(r => {
  const t = tokensOf(r)
  return { t, cost: costOf(t), ts: r[0] }
})
withCost.sort((a, b) => b.cost - a.cost)
for (const e of withCost.slice(0, 5)) {
  console.log(`  $${e.cost.toFixed(4)}  ts=${e.ts}  in=${e.t.input}  out=${e.t.output}  write=${e.t.write}  read=${e.t.read}`)
}
console.log('')

// Detect calls with cache_write > 20k (suggests full cold-prefix re-writes)
const coldWrites = cumulative.rows.filter(r => Number(r[3]) > 20000)
console.log(`Cold-prefix re-writes (cache_write > 20k tokens): ${coldWrites.length} / ${n} calls`)
console.log(`  → every such call wrote a fresh ~25k static block instead of hitting cache`)
console.log('')

// Distribution of call types by output length (rough turn vs extractor vs close)
const brackets = [
  [0, 100, 'meta / empty'],
  [100, 500, 'tool-only follow-up'],
  [500, 2000, 'narrative turn'],
  [2000, 5000, 'long narrative / close phase'],
  [5000, 99999, 'setup agent / heavy'],
]
console.log('Call-size distribution (by output tokens)')
console.log('-'.repeat(80))
for (const [lo, hi, label] of brackets) {
  const bucket = cumulative.rows.filter(r => {
    const o = Number(r[2]) || 0
    return o >= lo && o < hi
  })
  const t = sumTokens(bucket)
  const cost = costOf(t)
  console.log(`  ${label.padEnd(34)} ${String(bucket.length).padStart(4)} calls   $${cost.toFixed(4)}`)
}
