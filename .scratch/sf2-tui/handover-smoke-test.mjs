#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const brief = await readFile(path.join(repoRoot, 'content/sf2/campaign-briefs/grimdark/pale-flame.md'), 'utf8')

const payload = {
  transcript: [
    { role: 'narrator', content: 'The council chamber smells of cold stone and old smoke. Three figures wait at the far end of a warped oak table. The Pale Flame banner — a white fire on black — hangs behind them, moth-eaten at the edges. Commander Varek does not rise. He says: "You are the one they sent." It is not a question. He slides a folded letter across the table. "The Heretic\'s Daughter was seen three days ago in the Ash March. The Inquisition wants her found. We want her found first." He lets that land. "Questions, or do you already know what you\'re walking into?"', turn: 0, chapter: 1 },
    { role: 'player', content: 'Luther picks up the letter, reads it slowly, then folds it back. "I know what I\'m walking into. What I don\'t know is why the Inquisition hasn\'t found her themselves. Three days is a long time for people who burn villages to make a point." He looks at Varek. "What aren\'t you telling me?"', turn: 1, chapter: 1 },
    { role: 'narrator', content: 'Varek\'s jaw tightens. The woman to his left — Sister Maren, Pale Flame intelligence — answers instead. "The Inquisition sent a Seeker. Harren Gault. Experienced. Thorough." She pauses. "He stopped reporting two days ago." That changes the arithmetic. A missing Inquisition Seeker means either the daughter is more dangerous than advertised, or someone in the Ash March doesn\'t want her found by anyone. Or both. Varek finally speaks again. "You leave at dawn. Take the north road through the Char. If Gault is dead, find out why before you find the girl." Sister Maren slides a leather satchel forward: a map, a coin purse, and a sealed writ bearing the Pale Flame sigil.', turn: 2, chapter: 1 },
    { role: 'player', content: 'Luther takes the satchel. "And if the Inquisition gets to her first?" He already knows the answer but wants to hear them say it.', turn: 3, chapter: 1 },
    { role: 'narrator', content: '"Then we will need a different kind of solution," Varek says, and the temperature in the room drops by a degree. He stands. The meeting is over. Outside, the courtyard is grey with pre-dawn mist. Luther\'s horse — a rough-coated bay gelding with a notched ear — is already saddled. The north gate is open. The road into the Ash March is a dark line between burnt fields. No one wishes him luck.', turn: 4, chapter: 1 },
  ],
  mechanicalState: {
    chapter: 1,
    player: {
      name: 'Luther',
      origin: 'Pale Flame',
      playbook: 'Inquisitor',
      hp: { current: 12, max: 12 },
      ac: 14,
      stats: { str: 10, dex: 13, con: 12, int: 14, wis: 15, cha: 11 },
      wounds: [],
      inventory: [
        { name: 'Sealed writ', qty: 1 },
        { name: 'Map of the Ash March', qty: 1 },
        { name: 'Coin purse', qty: 1 },
        { name: 'Shortsword', qty: 1 },
      ],
      inspiration: 0,
    },
    clocks: [
      { name: 'Inquisition Arrival', value: 2, max: 6 },
      { name: 'The Daughter Moves', value: 1, max: 4 },
    ],
    npcs: [
      { name: 'Commander Varek', disposition: 'cold, transactional' },
      { name: 'Sister Maren', disposition: 'measured, withholds' },
      { name: 'Harren Gault', disposition: 'missing, presumed threat' },
    ],
    threads: [
      { title: 'Find the Heretic\'s Daughter', status: 'active', tension: 4 },
      { title: 'Locate missing Seeker Gault', status: 'active', tension: 6 },
    ],
    location: 'North gate, departing for the Ash March',
  },
  currentBrief: brief,
  campaignName: 'The Pale Flame',
  chapterNumber: 1,
}

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
const apiKey = process.env.ANTHROPIC_API_KEY || ''

console.log('Sending handover compile request...')
console.log(`Brief size: ${brief.length} chars`)
console.log(`Transcript entries: ${payload.transcript.length}`)
const start = Date.now()

try {
  const res = await fetch(`${baseUrl}/api/sf2/handover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-anthropic-key': apiKey } : {}),
    },
    body: JSON.stringify(payload),
  })

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nHTTP ${res.status} — ${elapsed}s wall clock`)

  const result = await res.json()

  if (result.ok) {
    console.log(`\nCompiler succeeded (model: ${result.model})`)
    console.log(`API latency: ${result.latency?.apiMs}ms`)
    console.log(`Total latency: ${result.latency?.totalMs}ms`)
    console.log(`Tokens — in: ${result.usage?.inputTokens}, out: ${result.usage?.outputTokens}, cache write: ${result.usage?.cacheWriteTokens}, cache read: ${result.usage?.cacheReadTokens}`)
    console.log(`\nSession Brief: ${result.documents.sessionBrief.length} chars`)
    console.log(`GM Memory: ${result.documents.gmMemory.length} chars`)
    console.log(`Quick Reference: ${result.documents.quickReference.length} chars`)
    console.log(`Total output: ${result.documents.sessionBrief.length + result.documents.gmMemory.length + result.documents.quickReference.length} chars`)
    if (result.diagnostics?.length) {
      console.log(`\nDiagnostics:`)
      for (const d of result.diagnostics) console.log(`  [${d.severity}] ${d.code}: ${d.message}`)
    }
    const runDir = path.join(repoRoot, '.scratch/sf2-tui/handover-smoke-runs', new Date().toISOString().replace(/[:.]/g, '-'))
    await mkdir(runDir, { recursive: true })
    await writeFile(path.join(runDir, 'session-brief.md'), result.documents.sessionBrief)
    await writeFile(path.join(runDir, 'gm-memory.md'), result.documents.gmMemory)
    await writeFile(path.join(runDir, 'quick-reference.md'), result.documents.quickReference)
    await writeFile(path.join(runDir, 'result.json'), JSON.stringify(result, null, 2))
    console.log(`\nFull documents written to ${runDir}`)
  } else {
    console.log(`\nCompiler FAILED: ${result.error}`)
    console.log(`Message: ${result.message}`)
    console.log(`Model: ${result.model}`)
    if (result.latency) console.log(`Latency: ${JSON.stringify(result.latency)}`)
    if (result.diagnostics?.length) {
      console.log(`Diagnostics:`)
      for (const d of result.diagnostics) console.log(`  [${d.severity}] ${d.code}: ${d.message}`)
    }
  }
} catch (err) {
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.error(`\nRequest failed after ${elapsed}s: ${err.message}`)
}
