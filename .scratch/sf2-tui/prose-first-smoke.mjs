#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outRoot = path.join(repoRoot, '.scratch/sf2-tui/prose-first-runs')
const briefCatalog = [
  {
    id: 'space-opera:forty-thousand',
    genre: 'space-opera',
    hook: 'forty-thousand',
    title: 'Forty Thousand',
    contentPath: 'content/sf2/campaign-briefs/space-opera/forty-thousand.md',
  },
  {
    id: 'grimdark:pale-flame',
    genre: 'grimdark',
    hook: 'pale-flame',
    title: 'The Pale Flame',
    contentPath: 'content/sf2/campaign-briefs/grimdark/pale-flame.md',
  },
  {
    id: 'epic-scifi:hegemony-seeker',
    genre: 'epic-scifi',
    hook: 'hegemony-seeker',
    title: 'The Hegemony',
    contentPath: 'content/sf2/campaign-briefs/epic-scifi/hegemony-seeker.md',
  },
  {
    id: 'cyberpunk:chrome',
    genre: 'cyberpunk',
    hook: 'chrome',
    title: 'Chrome',
    contentPath: 'content/sf2/campaign-briefs/cyberpunk/chrome.md',
  },
  {
    id: 'noire:sable',
    genre: 'noire',
    hook: 'sable',
    title: 'Sable',
    contentPath: 'content/sf2/campaign-briefs/noire/sable.md',
  },
  {
    id: 'fantasy:covenant',
    genre: 'fantasy',
    hook: 'covenant',
    title: 'The Covenant',
    contentPath: 'content/sf2/campaign-briefs/fantasy/covenant.md',
  },
  {
    id: 'cold-war:cardinal',
    genre: 'cold-war',
    hook: 'cardinal',
    title: 'Cardinal',
    contentPath: 'content/sf2/campaign-briefs/cold-war/cardinal.md',
  },
]

const handoverExamples = {
  'grimdark:pale-flame': {
    basePath: 'content/sf2/handover-examples/grimdark/pale-flame',
    chapter: 2,
  },
}

const args = parseArgs(process.argv.slice(2))
const selected = briefCatalog.find((entry) => entry.id === args.brief || entry.hook === args.brief) ?? briefCatalog[0]
const brief = {
  ...selected,
  brief: await readFile(path.join(repoRoot, selected.contentPath), 'utf8'),
}
const turns = args.turns.length > 0 ? args.turns : ['I answer the character creation questions with a scarred name, an unpaid debt, and a willingness to risk myself for the missing.']

const transcript = []
const snapshots = []
const archivistOutputs = []

append('narrator', buildOpening(brief))
snapshots.push(snapshot(brief, 0))
archivistOutputs.push(archivist(brief, 0))

for (const [index, turn] of turns.entries()) {
  const turnNumber = index + 1
  append('player', turn)
  append('narrator', response(brief, turn, turnNumber))
  snapshots.push(snapshot(brief, turnNumber))
  archivistOutputs.push(archivist(brief, turnNumber))
}

const safeBriefId = brief.id.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '')
const runDir = path.join(outRoot, `${new Date().toISOString().replace(/[:.]/g, '-')}-${safeBriefId}`)
await mkdir(runDir, { recursive: true })

const artifact = {
  kind: 'sf2-prose-first-terminal-smoke',
  brief: {
    id: brief.id,
    genre: brief.genre,
    hook: brief.hook,
    title: brief.title,
  },
  transcript,
  rollLog: [],
  mechanicalStateSnapshots: snapshots,
  archivistOutputs,
  diagnostics: {
    adapter: 'local smoke adapter',
    liveNarrator: false,
    liveArchivist: false,
  },
  handoverDocuments: await loadHandoverDocs(brief.id),
}

await writeFile(path.join(runDir, 'artifact.json'), `${JSON.stringify(artifact, null, 2)}\n`)
await writeFile(path.join(runDir, 'transcript.md'), transcript.map((entry) => `## ${entry.speaker}\n\n${entry.content}`).join('\n\n'))

console.log(`SF2 prose-first smoke run written to ${runDir}`)
console.log(`Brief: ${brief.title}`)
console.log(`Turns: ${turns.length}`)

function parseArgs(raw) {
  const parsed = { brief: undefined, turns: [] }
  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index]
    if (arg === '--brief') parsed.brief = raw[++index]
    else if (arg === '--turn') parsed.turns.push(raw[++index] ?? '')
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node .scratch/sf2-tui/prose-first-smoke.mjs [--brief grimdark:pale-flame] [--turn "player input"]')
      process.exit(0)
    }
  }
  return parsed
}

function append(speaker, content) {
  transcript.push({ speaker, content, at: new Date().toISOString() })
}

function buildOpening(selectedBrief) {
  const questions = selectedBrief.brief
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .slice(0, 5)
  return [`${selectedBrief.title}`, '', 'Answer these character creation questions:', ...questions].join('\n')
}

function response(selectedBrief, turn, turnNumber) {
  if (turnNumber === 1) return `Recorded setup answer: ${turn}\n\nThe next smoke turn would enter the opening scene.`
  return `Smoke gameplay turn ${turnNumber}. A live adapter should stream the prose-first narrator response here.`
}

function snapshot(selectedBrief, turn) {
  return {
    turn,
    hp: turn < 2 ? 'pending character creation' : '12/12',
    clocks: (selectedBrief.brief.match(/tension clocks:\s*([^.]*)\./i)?.[1] ?? '')
      .split(/\s+and\s+|,/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, value: 0, max: 6 })),
  }
}

async function loadHandoverDocs(briefId) {
  const example = handoverExamples[briefId]
  if (!example) return { sessionBrief: '', gmMemory: '', quickReference: '' }
  const base = path.join(repoRoot, example.basePath)
  const read = async (name) => { try { return await readFile(path.join(base, name), 'utf8') } catch { return '' } }
  return {
    sessionBrief: await read('session-brief.md'),
    gmMemory: await read('gm-memory.md'),
    quickReference: await read('quick-reference.md'),
  }
}

function archivist(selectedBrief, turn) {
  return {
    turn,
    character: turn < 2 ? 'Pending' : 'Prototype PC',
    npcs: (selectedBrief.brief.match(/## Cast\n([\s\S]*?)(?:\n\n## |\s*$)/)?.[1] ?? '')
      .split('\n')
      .map((line) => line.trim().match(/^-\s+([^:]+):/)?.[1])
      .filter(Boolean),
    location: turn < 2 ? 'Character creation' : 'Opening scene',
  }
}
