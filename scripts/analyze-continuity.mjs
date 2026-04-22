#!/usr/bin/env node
// Parses a Storyforge debug log and reconstructs continuity metrics.
// Required because the zod schema in the route stripped _instrumentation
// from the request payload, so server-side counters always read zero.
// Raw per-event lines survived (WRITE, FIREWALL_OBSERVATION, etc.) — this
// script recomputes what CHAPTER_STATS / CONTINUITY_STATS should have shown.

import fs from 'node:fs'

const logPath = process.argv[2]
if (!logPath) {
  console.error('usage: node analyze-continuity.mjs <debug-log.txt>')
  process.exit(1)
}
const lines = fs.readFileSync(logPath, 'utf8').split('\n')

const writeRe = /^\[.*?\]\s+WRITE\s+genre=(\S+)\s+turn=(\d+)\s+chapter=(\d+)\s+type=(\S+)\s+actor=(\S+)\s+entity=(\S+)\s+status=(\S+)\s+fields=\[([^\]]*)\](?:\s+missing=\[([^\]]*)\])?/
const fwRe = /^\[.*?\]\s+FIREWALL_OBSERVATION\s+genre=(\S+)\s+turn=(\d+)\s+chapter=(\d+)\s+rule=(\S+)\s+severity=(\S+)\s+actor=(\S+)\s+type=(\S+)/
const entityRe = /^\[.*?\]\s+ENTITY_CREATION\s+genre=(\S+)\s+turn=(\d+)\s+chapter=(\d+)\s+type=(\S+)\s+entity=(\S+)\s+populated=\[([^\]]*)\]\s+empty=\[([^\]]*)\]/
const turnTimingRe = /^\[.*?\]\s+TURN_TIMING\s+genre=(\S+)\s+turn=(\d+)\s+chapter=(\d+)/

const THREAD_TYPES = new Set(['thread_create', 'thread_update'])
const UPDATE_TYPES = new Set([
  'npc_update', 'thread_update', 'promise_update', 'decision_update',
  'arc_update', 'clock_advance', 'timer_update',
])
const CREATE_TYPE_TO_ENTITY = {
  npc_create: 'npc', thread_create: 'thread', promise_create: 'promise',
  decision_create: 'decision', clue_create: 'clue', faction_update: 'faction',
  arc_create: 'arc', clock_establish: 'clock', timer_set: 'timer',
}
const UPDATE_TYPE_TO_ENTITY = {
  npc_update: 'npc', thread_update: 'thread', promise_update: 'promise',
  decision_update: 'decision', arc_update: 'arc', clock_advance: 'clock',
  timer_update: 'timer',
}

// Per-chapter accumulators
const chapterWrites = new Map()   // chapter -> { success, partial, malformed, byType: { type -> {s,p,m} } }
const chapterFirewall = new Map() // chapter -> { total, block, warn, byRule: {} }
const chapterEntities = new Map() // chapter -> { created: { type -> count }, fieldPop: { type -> { field -> count } }, fieldEmpty: ... }
const chapterTurns = new Map()    // chapter -> set of turn numbers
const chapterThreads = new Map()  // chapter -> Set of thread entity ids touched
const chapterCallbacks = new Map()// chapter -> callback count
const chapterArcAdvances = new Map() // chapter -> Map<arcId, count>

// Global entity first-seen tracking (entity_type:entity -> first chapter)
const entityFirstChapter = new Map()
// Thread first-seen (by id) separately so anchored_to lookups work
const threadFirstChapter = new Map()

function ensureChapter(map, ch, init) {
  if (!map.has(ch)) map.set(ch, init())
  return map.get(ch)
}

for (const line of lines) {
  let m

  if ((m = writeRe.exec(line))) {
    const [, , , chStr, writeType, , entity, status, , ] = m
    const ch = Number(chStr)
    const bucket = ensureChapter(chapterWrites, ch, () => ({ success: 0, partial: 0, malformed: 0, byType: {} }))
    bucket[status] = (bucket[status] ?? 0) + 1
    if (!bucket.byType[writeType]) bucket.byType[writeType] = { success: 0, partial: 0, malformed: 0 }
    bucket.byType[writeType][status] = (bucket.byType[writeType][status] ?? 0) + 1

    // Thread tracking
    if (THREAD_TYPES.has(writeType) && entity !== 'NONE' && entity !== 'NEW') {
      const set = ensureChapter(chapterThreads, ch, () => new Set())
      set.add(entity)
    }
    // Arc advance
    if (writeType === 'arc_update' && entity !== 'NONE') {
      const m2 = ensureChapter(chapterArcAdvances, ch, () => new Map())
      m2.set(entity, (m2.get(entity) ?? 0) + 1)
    }
    // Cross-chapter callback: update against an entity first seen in a prior chapter
    if (UPDATE_TYPES.has(writeType) && entity !== 'NONE') {
      const bucket = UPDATE_TYPE_TO_ENTITY[writeType]
      if (bucket) {
        const key = `${bucket}:${entity}`
        const firstCh = entityFirstChapter.get(key)
        if (firstCh !== undefined && firstCh < ch) {
          chapterCallbacks.set(ch, (chapterCallbacks.get(ch) ?? 0) + 1)
        }
      }
    }
    continue
  }

  if ((m = fwRe.exec(line))) {
    const [, , , chStr, rule, severity] = m
    const ch = Number(chStr)
    const bucket = ensureChapter(chapterFirewall, ch, () => ({ total: 0, block: 0, warn: 0, byRule: {} }))
    bucket.total += 1
    if (severity === 'block') bucket.block += 1
    else bucket.warn += 1
    bucket.byRule[rule] = (bucket.byRule[rule] ?? 0) + 1
    continue
  }

  if ((m = entityRe.exec(line))) {
    const [, , , chStr, entityType, entity, populated, empty] = m
    const ch = Number(chStr)
    const bucket = ensureChapter(chapterEntities, ch, () => ({ created: {}, fieldPop: {}, fieldEmpty: {} }))
    bucket.created[entityType] = (bucket.created[entityType] ?? 0) + 1
    if (!bucket.fieldPop[entityType]) bucket.fieldPop[entityType] = {}
    if (!bucket.fieldEmpty[entityType]) bucket.fieldEmpty[entityType] = {}
    for (const f of populated.split(',').filter(Boolean)) bucket.fieldPop[entityType][f] = (bucket.fieldPop[entityType][f] ?? 0) + 1
    for (const f of empty.split(',').filter(Boolean)) bucket.fieldEmpty[entityType][f] = (bucket.fieldEmpty[entityType][f] ?? 0) + 1

    // First-seen mapping
    const key = `${entityType}:${entity}`
    if (!entityFirstChapter.has(key)) entityFirstChapter.set(key, ch)
    if (entityType === 'thread' && !threadFirstChapter.has(entity)) threadFirstChapter.set(entity, ch)
    continue
  }

  if ((m = turnTimingRe.exec(line))) {
    const [, , turnStr, chStr] = m
    const ch = Number(chStr)
    const set = ensureChapter(chapterTurns, ch, () => new Set())
    set.add(Number(turnStr))
    continue
  }
}

// Also: thread ids that first appear in thread_create writes (not ENTITY_CREATION only)
for (const line of lines) {
  const m = writeRe.exec(line)
  if (!m) continue
  const [, , , chStr, writeType, , entity] = m
  const ch = Number(chStr)
  if (writeType === 'thread_create' && entity !== 'NONE' && entity !== 'NEW') {
    if (!threadFirstChapter.has(entity)) threadFirstChapter.set(entity, ch)
  }
}

const chapters = [...chapterWrites.keys()].sort((a, b) => a - b)

function fmtBytype(byType) {
  return Object.entries(byType)
    .map(([t, o]) => `${t}=${o.success}/${o.partial}/${o.malformed}`)
    .join(' ')
}

console.log('='.repeat(72))
console.log(`Storyforge playthrough analysis (reconstructed from raw log)`)
console.log(`log: ${logPath}`)
console.log(`chapters detected: ${chapters.join(', ')}`)
console.log('='.repeat(72))

for (const ch of chapters) {
  const w = chapterWrites.get(ch) ?? { success: 0, partial: 0, malformed: 0, byType: {} }
  const fw = chapterFirewall.get(ch) ?? { total: 0, block: 0, warn: 0, byRule: {} }
  const ent = chapterEntities.get(ch) ?? { created: {}, fieldPop: {}, fieldEmpty: {} }
  const turns = chapterTurns.get(ch)?.size ?? 0
  const threads = chapterThreads.get(ch) ?? new Set()
  const callbacks = chapterCallbacks.get(ch) ?? 0
  const arcAdv = chapterArcAdvances.get(ch) ?? new Map()

  // Continuity vs prior chapter
  const priorThreads = chapterThreads.get(ch - 1) ?? new Set()
  const carryOver = [...threads].filter(t => priorThreads.has(t)).length
  const continuityRate = priorThreads.size === 0 ? null : Math.round((carryOver / priorThreads.size) * 100)

  console.log(`\n── Chapter ${ch} ──`)
  console.log(`turns observed: ${turns}`)
  console.log(`writes: success=${w.success} partial=${w.partial} malformed=${w.malformed} (total ${w.success + w.partial + w.malformed})`)
  console.log(`writes by type (success/partial/malformed): ${fmtBytype(w.byType) || '(none)'}`)
  console.log(`firewall fires: total=${fw.total} block=${fw.block} warn=${fw.warn}`)
  console.log(`firewall by rule: ${Object.entries(fw.byRule).map(([k, v]) => `${k}=${v}`).join(' ') || '(none)'}`)
  console.log(`entities created: ${Object.entries(ent.created).map(([k, v]) => `${k}=${v}`).join(' ') || '(none)'}`)
  console.log(`threads touched this chapter: ${threads.size} [${[...threads].join(', ') || '—'}]`)
  console.log(`threads carried from ch${ch - 1}: ${carryOver} of ${priorThreads.size} (${continuityRate === null ? 'NA' : continuityRate + '%'})`)
  console.log(`cross-chapter callbacks: ${callbacks}`)
  console.log(`arc advances: ${[...arcAdv].map(([id, n]) => `${id}=${n}`).join(' ') || '(none)'}`)
}

console.log(`\n${'='.repeat(72)}`)
console.log('Field population by entity type (aggregated across all chapters)')
console.log('='.repeat(72))
const aggPop = {}
const aggEmpty = {}
for (const [, ent] of chapterEntities) {
  for (const [type, fields] of Object.entries(ent.fieldPop)) {
    if (!aggPop[type]) aggPop[type] = {}
    for (const [f, n] of Object.entries(fields)) aggPop[type][f] = (aggPop[type][f] ?? 0) + n
  }
  for (const [type, fields] of Object.entries(ent.fieldEmpty)) {
    if (!aggEmpty[type]) aggEmpty[type] = {}
    for (const [f, n] of Object.entries(fields)) aggEmpty[type][f] = (aggEmpty[type][f] ?? 0) + n
  }
}
for (const type of Object.keys(aggPop)) {
  console.log(`\n${type}:`)
  const allFields = new Set([...Object.keys(aggPop[type] ?? {}), ...Object.keys(aggEmpty[type] ?? {})])
  for (const f of allFields) {
    const p = aggPop[type][f] ?? 0
    const e = aggEmpty[type][f] ?? 0
    const total = p + e
    const pct = total === 0 ? 0 : Math.round((p / total) * 100)
    console.log(`  ${f.padEnd(28)} ${p}/${total} (${pct}%)`)
  }
}
