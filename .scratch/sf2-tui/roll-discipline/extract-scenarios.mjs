/**
 * Extract roll-discipline test scenarios from a prose-first playthrough export.
 *
 * A scenario is every gameplay turn where the roll gate sentinel fired
 * (either the narrator complied and rolled, or it was a missed expected roll).
 * Each scenario captures enough context to replay that turn through the narrator API:
 *   - campaign brief
 *   - transcript up to (but not including) the turn being tested
 *   - the player input for the turn
 *   - the mechanical snapshot at that turn
 *   - ground truth from the roll gate diagnostic
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * @param {string} exportPath - path to the playthrough export JSON
 * @returns {{ scenarios: object[], summary: object }}
 */
export function extractScenarios(exportPath) {
  const data = JSON.parse(readFileSync(exportPath, 'utf8'))
  const { transcript, diagnostics, mechanicalSnapshots, brief } = data

  // Load the campaign brief text
  const briefText = loadBriefText(brief)

  // Index diagnostics by turn
  // Roll gate diagnostics fire in pairs per turn:
  //   1. Pre-narrator check (fires before narrator runs): repair = 'not_needed'
  //   2. Post-narrator check (fires after narrator responds): repair = 'narrator_complied' | 'missed_expected_roll_allowed' | 'not_needed'
  const rollGates = diagnostics.filter((d) => d.kind === 'roll_gate_diagnostic')
  const rolls = diagnostics.filter((d) => d.kind === 'roll')

  // Build a turn-indexed map of what happened
  // Roll gate diagnostics don't have a turnIndex, so we correlate by timestamp
  // with the roll entries (which DO have turnIndex) and token_usage entries
  const turnEvents = buildTurnEventMap(diagnostics, transcript)

  const scenarios = []

  for (const [turnIndex, events] of Object.entries(turnEvents)) {
    const turn = Number(turnIndex)
    if (turn < 6) continue // skip character creation turns

    const gateEvents = events.gates
    const rollEvent = events.roll

    // We care about turns where EITHER:
    // 1. A gate fired and was missed (missed_expected_roll_allowed)
    // 2. A gate fired and narrator complied (narrator_complied)
    // 3. A roll happened (even without a gate — narrator volunteered one)
    const missedGate = gateEvents.find((g) => g.data.repair === 'missed_expected_roll_allowed')
    const compliedGate = gateEvents.find((g) => g.data.repair === 'narrator_complied')
    const hasRoll = !!rollEvent

    if (!missedGate && !compliedGate && !hasRoll) continue

    // Build transcript prefix: all turns BEFORE this one
    const transcriptPrefix = transcript
      .filter((t) => t.turn < turn)
      .map((t) => ({
        role: t.speaker === 'player' ? 'user' : 'assistant',
        content: t.content,
      }))

    // Get the player input for this turn
    const playerEntry = transcript.find((t) => t.speaker === 'player' && t.turn === turn)
    if (!playerEntry) continue

    // Get the narrator output for this turn (for comparison)
    const narratorEntry = transcript.find((t) => t.speaker === 'narrator' && t.turn === turn)

    // Get the mechanical snapshot for this turn
    const snapshot = mechanicalSnapshots?.find((s) => s.turn === turn) ?? null

    // Build the ground truth
    const activeGate = missedGate ?? compliedGate
    const groundTruth = {
      gateKind: activeGate?.data.kind ?? (hasRoll ? 'narrator_volunteered' : 'none'),
      gateBinding: activeGate?.data.binding ?? 'none',
      gateSkills: activeGate?.data.skills ?? [],
      gateSource: activeGate?.data.source ?? 'none',
      gateSourceId: activeGate?.data.sourceId,
      gateReason: activeGate?.data.reason ?? '',
      narratorActuallyRolled: hasRoll,
      rollData: rollEvent?.data ?? null,
    }

    scenarios.push({
      id: `${brief?.hook ?? 'unknown'}-t${turn}`,
      turnIndex: turn,
      briefId: brief?.id ?? brief?.seedId,
      briefText,
      transcript: transcriptPrefix,
      playerInput: playerEntry.content,
      mechanicalSnapshot: snapshot,
      groundTruth,
      // For display/comparison only — not sent to API
      actualNarratorOutput: narratorEntry?.content ?? null,
    })
  }

  const summary = {
    totalTurns: Math.max(...transcript.map((t) => t.turn)),
    totalScenarios: scenarios.length,
    missedRolls: scenarios.filter((s) => !s.groundTruth.narratorActuallyRolled && s.groundTruth.gateBinding !== 'none').length,
    actualRolls: scenarios.filter((s) => s.groundTruth.narratorActuallyRolled).length,
    gateKindBreakdown: scenarios.reduce((acc, s) => {
      const k = s.groundTruth.gateKind
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  }

  return { scenarios, summary }
}

function loadBriefText(briefMeta) {
  if (!briefMeta) return ''
  // Try to find the brief content file
  const candidates = [
    briefMeta.contentPath,
    `content/sf2/campaign-briefs/${briefMeta.genre}/${briefMeta.hook}.md`,
    `content/sf2/campaign-briefs/${briefMeta.genre ?? 'space-opera'}/${briefMeta.hook ?? 'forty-thousand'}.md`,
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      return readFileSync(path.join(repoRoot, candidate), 'utf8')
    } catch {
      // try next
    }
  }

  // Last resort: check if the export has inline brief text
  if (briefMeta.text) return briefMeta.text
  if (briefMeta.brief) return briefMeta.brief

  console.warn('[extract] Could not load brief text, using empty string')
  return ''
}

/**
 * Correlate diagnostics with transcript turns by timestamp ordering.
 * Returns a map of turnIndex → { gates, roll, tokenUsage }
 */
function buildTurnEventMap(diagnostics, transcript) {
  const map = {}

  // Build timestamp windows for each turn
  // Each turn's window is: [player input timestamp, next player input timestamp)
  const playerEntries = transcript
    .filter((t) => t.speaker === 'player')
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  const turnWindows = playerEntries.map((entry, i) => ({
    turn: entry.turn,
    start: new Date(entry.at).getTime(),
    end: i < playerEntries.length - 1 ? new Date(playerEntries[i + 1].at).getTime() : Infinity,
  }))

  // Also use roll events directly since they have turnIndex
  const rolls = diagnostics.filter((d) => d.kind === 'roll')
  for (const roll of rolls) {
    const turn = roll.data.turnIndex
    if (!map[turn]) map[turn] = { gates: [], roll: null, tokenUsage: [] }
    map[turn].roll = roll
  }

  // Assign gate diagnostics to turns by timestamp
  const gates = diagnostics.filter((d) => d.kind === 'roll_gate_diagnostic')
  for (const gate of gates) {
    const window = turnWindows.find((w) => gate.at >= w.start && gate.at < w.end)
    if (window) {
      if (!map[window.turn]) map[window.turn] = { gates: [], roll: null, tokenUsage: [] }
      map[window.turn].gates.push(gate)
    }
  }

  // Assign token usage to turns
  const usage = diagnostics.filter((d) => d.kind === 'token_usage')
  for (const u of usage) {
    const window = turnWindows.find((w) => u.at >= w.start && u.at < w.end)
    if (window) {
      if (!map[window.turn]) map[window.turn] = { gates: [], roll: null, tokenUsage: [] }
      map[window.turn].tokenUsage.push(u)
    }
  }

  return map
}

/**
 * Render a mechanical snapshot as the text block the narrator normally receives.
 */
export function renderSnapshotText(snapshot) {
  if (!snapshot) return '## Private mechanical snapshot\nNo snapshot available for this turn.'

  const lines = [
    '## Private mechanical snapshot',
    'Use this as code-owned truth for the next response. Do not quote this block or describe it as a system note.',
    '',
    `- PC: ${snapshot.pcName ?? 'unnamed'}; level 1; AC ${snapshot.ac ?? 15}; inspiration ${snapshot.inspiration ?? 0}`,
    `- HP: ${snapshot.hp ?? '9/9'}`,
    `- Active wounds: none recorded`,
    `- Credits: 0`,
    `- Inventory: ${(snapshot.inventory ?? []).join(', ') || 'none'}`,
    `- Temporary modifiers: none`,
    '- Tension clocks:',
  ]

  if (snapshot.clocks?.length) {
    for (const clock of snapshot.clocks) {
      lines.push(`  - ${clock.name}: tension ${clock.value}/${clock.max}`)
    }
  } else {
    lines.push('  - none active')
  }

  return lines.join('\n')
}
