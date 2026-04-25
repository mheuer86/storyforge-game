#!/usr/bin/env node
// Analyze a Storyforge v2 session export against the design-doc kill criteria.
// Usage: node scripts/sf2-analyze.mjs <path-to-session-log.json>
//
// Exits 0 if all primary kill criteria pass, 1 otherwise. Prints a structured
// report to stdout.

import { readFileSync } from 'node:fs'
import { argv, exit } from 'node:process'

if (argv.length < 3) {
  console.error('Usage: node scripts/sf2-analyze.mjs <session-log.json>')
  exit(2)
}

const path = argv[2]
let payload
try {
  payload = JSON.parse(readFileSync(path, 'utf-8'))
} catch (err) {
  console.error(`Failed to read or parse ${path}: ${err.message}`)
  exit(2)
}

const { summary, state, debug } = payload
if (!state || !debug || !summary) {
  console.error('Session log is missing required fields (state / debug / summary).')
  exit(2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread continuity rate per chapter transition
// ─────────────────────────────────────────────────────────────────────────────

// Replay archivist patches across debug events to reconstruct snapshots of
// active threads at each chapter close. Each `archivist` debug event carries
// `data.patch.{turnIndex, transitions}`. We accumulate thread-status changes
// across turns and snapshot at chapter boundaries.
const threadStatusByTurn = new Map() // turnIndex → Map<threadId, status>
const chapterBoundaries = new Map() // chapter → { firstTurnIdx, lastTurnIdx }

for (const turn of state.history.turns) {
  const ch = chapterBoundaries.get(turn.chapter) ?? { firstTurnIdx: turn.index, lastTurnIdx: turn.index }
  if (turn.index < ch.firstTurnIdx) ch.firstTurnIdx = turn.index
  if (turn.index > ch.lastTurnIdx) ch.lastTurnIdx = turn.index
  chapterBoundaries.set(turn.chapter, ch)
}

// Walk debug events in order and replay status. Start with seed threads.
const liveStatus = new Map() // threadId → status

// Seed from initial threads (chapter 1 setup). Use first turn's pre-seed (the
// hardcoded Synod Seeker chapter starts with 3 threads).
for (const t of Object.values(state.campaign.threads)) {
  // Best approximation: assume all threads created in chapter 1 were active at
  // start. For chapters > 1, seed with their chapterCreated status.
  liveStatus.set(t.id, 'active')
}

const archivistEvents = debug
  .filter((e) => e.kind === 'archivist' && e.data?.patch)
  .sort((a, b) => (a.data.patch.turnIndex ?? 0) - (b.data.patch.turnIndex ?? 0))

const snapshotsByChapter = new Map() // chapter → { atOpen: Set<id>, atClose: Set<id> }
for (const ch of chapterBoundaries.keys()) {
  snapshotsByChapter.set(ch, { atOpen: new Set(), atClose: new Set() })
}

for (const ev of archivistEvents) {
  const patch = ev.data.patch
  const turnIndex = patch.turnIndex
  // Apply transitions for this turn
  if (Array.isArray(patch.transitions)) {
    for (const t of patch.transitions) {
      if (t.entityKind === 'thread') {
        liveStatus.set(t.entityId, t.toStatus)
      }
    }
  }
  // Apply creates of new threads
  if (Array.isArray(patch.creates)) {
    for (const c of patch.creates) {
      if (c.kind === 'thread') {
        const id = c.payload?.id || `thread_${liveStatus.size}`
        liveStatus.set(id, 'active')
      }
    }
  }
  // Apply status updates
  if (Array.isArray(patch.updates)) {
    for (const u of patch.updates) {
      if (u.entityKind === 'thread' && u.changes?.status) {
        liveStatus.set(u.entityId, u.changes.status)
      }
    }
  }

  // Find which chapter this turn belonged to and stamp opens/closes if at boundary
  for (const [ch, boundaries] of chapterBoundaries) {
    if (turnIndex === boundaries.firstTurnIdx) {
      // Snapshot at open: copy currently-active threads (before this turn's writes? approximate)
      const snap = snapshotsByChapter.get(ch)
      for (const [id, status] of liveStatus) {
        if (status === 'active') snap.atOpen.add(id)
      }
    }
    if (turnIndex === boundaries.lastTurnIdx) {
      // Snapshot at close: copy currently-active threads after this turn
      const snap = snapshotsByChapter.get(ch)
      for (const [id, status] of liveStatus) {
        if (status === 'active') snap.atClose.add(id)
      }
    }
  }
}

const chapters = [...chapterBoundaries.keys()].sort((a, b) => a - b)
const continuityByTransition = []
for (let i = 0; i < chapters.length - 1; i += 1) {
  const fromCh = chapters[i]
  const toCh = chapters[i + 1]
  const closeSnap = snapshotsByChapter.get(fromCh).atClose
  const openSnap = snapshotsByChapter.get(toCh).atOpen
  if (closeSnap.size === 0) continue
  const carried = [...closeSnap].filter((id) => openSnap.has(id)).length
  const rate = closeSnap.size > 0 ? carried / closeSnap.size : 0
  continuityByTransition.push({
    from: fromCh,
    to: toCh,
    closedActive: closeSnap.size,
    openedActive: openSnap.size,
    carried,
    rate,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Print report
// ─────────────────────────────────────────────────────────────────────────────

function color(text, code) {
  return `[${code}m${text}[0m`
}
const ok = (s) => color(s, '32')
const fail = (s) => color(s, '31')
const dim = (s) => color(s, '90')

console.log()
console.log(color('Storyforge v2 — session analysis', '1'))
console.log(dim('━'.repeat(60)))
console.log(`campaign: ${summary.campaignId}`)
console.log(`genre/playbook/origin: ${summary.genreId} · ${summary.playbookId} · ${summary.originId}`)
console.log(`chapters: ${summary.chapters} · turns: ${summary.totalTurns}`)
console.log()

console.log(color('Cost', '1'))
console.log(`  Total: $${summary.cost.estimatedUsdTotal.toFixed(3)}`)
console.log(`    Narrator (Sonnet 4.6):  $${summary.cost.estimatedUsdSonnetNarrator.toFixed(3)}`)
console.log(`    Archivist (Haiku 4.5):  $${summary.cost.estimatedUsdHaikuArchivist.toFixed(3)}`)
console.log(`    Author    (Sonnet 4.6): $${summary.cost.estimatedUsdSonnetAuthor.toFixed(3)}`)
console.log()

console.log(color('Archivist quality', '1'))
console.log(`  Writes: ${summary.archivist.totalWrites} total`)
console.log(`    accepted ${summary.archivist.accepted} · deferred ${summary.archivist.deferred} · rejected ${summary.archivist.rejected}`)
console.log(`  Anchor miss rate: ${(summary.archivist.anchorMissRate * 100).toFixed(2)}%`)
console.log(`  Drift flags: ${summary.archivist.driftFlags}`)
console.log()

console.log(color('Pacing signals fired', '1'))
console.log(`  Total: ${summary.pacing.advisoriesFired}`)
console.log(`    reactivity ${summary.pacing.breakdown.reactivity} · scene-link ${summary.pacing.breakdown.sceneLink} · stagnation ${summary.pacing.breakdown.stagnation} · arc-dormant ${summary.pacing.breakdown.arcDormant}`)
console.log()

console.log(color('Per-chapter', '1'))
for (const c of summary.perChapter) {
  console.log(`  Ch${c.chapter}: ${c.turns} turns · arc advances ${c.arcAdvancesThisChapter}`)
}
console.log()

console.log(color('Thread continuity transitions', '1'))
if (continuityByTransition.length === 0) {
  console.log(dim('  (no transitions; need ≥2 chapters)'))
} else {
  for (const t of continuityByTransition) {
    const pct = (t.rate * 100).toFixed(0)
    const tag = t.rate >= 0.5 ? ok(`${pct}%`) : t.rate >= 0.4 ? color(pct + '%', '33') : fail(`${pct}%`)
    console.log(`  Ch${t.from} → Ch${t.to}: ${t.carried}/${t.closedActive} carried = ${tag}`)
  }
}
console.log()

// Kill criteria final verdict
const continuityPass =
  continuityByTransition.every((t) => t.rate >= 0.5) &&
  continuityByTransition.every((t) => t.rate >= 0.4)
const continuityCliff = continuityByTransition.some((t) => t.rate < 0.4)

console.log(color('Kill criteria', '1'))
console.log(`  Anchor miss ≤5%:           ${summary.killCriteria.anchorMissRatePass ? ok('PASS') : fail('FAIL')} (${(summary.archivist.anchorMissRate * 100).toFixed(2)}%)`)
console.log(`  Thread continuity ≥50%:    ${continuityPass && !continuityCliff ? ok('PASS') : continuityByTransition.length === 0 ? dim('N/A') : fail('FAIL')}`)
console.log(`  Arc advances ≥1/chapter:   ${summary.killCriteria.arcAdvancementPass ? ok('PASS') : fail('FAIL')}`)
console.log(`  Cost ≤$7:                  ${summary.killCriteria.costPass ? ok('PASS') : fail('FAIL')} ($${summary.cost.estimatedUsdTotal.toFixed(2)})`)
console.log()

const overallPass =
  summary.killCriteria.anchorMissRatePass &&
  summary.killCriteria.arcAdvancementPass &&
  summary.killCriteria.costPass &&
  (continuityByTransition.length === 0 || (continuityPass && !continuityCliff))

console.log(overallPass ? ok('OVERALL: PASS') : fail('OVERALL: FAIL'))
console.log()

exit(overallPass ? 0 : 1)
