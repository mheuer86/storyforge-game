/**
 * Extract close-loop probes from a prose-first prototype export.
 *
 * The first pass uses named Forty Thousand probe turns because the export is
 * the evidence source that exposed the chapter-close failure. The extractor is
 * intentionally data-light: enough context to replay a turn through the model,
 * plus expected close/reframe behavior for scoring variants.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export const PROBE_SPECS = [
  {
    id: 'n1-early-offer',
    turn: 8,
    kind: 'negative',
    expected: 'no_close',
    label: 'Early broker offer, terms still forming',
    rationale: 'The player is still hearing the job. The foreground question has not been answered.',
  },
  {
    id: 'n2-decision-window',
    turn: 11,
    kind: 'negative',
    expected: 'no_close',
    label: 'Player asks how long they have to decide',
    rationale: 'The player has not committed. The chapter should keep pressure live.',
  },
  {
    id: 'n3-alternative-job-search',
    turn: 14,
    kind: 'negative',
    expected: 'no_close',
    label: 'Player seeks alternative work at the board',
    rationale: 'This is investigation before commitment, not a resting point.',
  },
  {
    id: 'p1-passenger-arrangement',
    turn: 20,
    kind: 'positive',
    expected: 'compress',
    label: 'Davan/Kes arrangement sealed, player heads to broker',
    rationale: 'Do not close immediately, but compress toward the broker decision instead of opening new side loops.',
  },
  {
    id: 'p2-broker-job-accepted',
    turn: 22,
    kind: 'positive',
    expected: 'close_candidate',
    label: 'Broker job accepted and documentation plan exists',
    rationale: 'The chapter-defining decision has landed. Any continuation should consolidate toward close.',
  },
  {
    id: 'p3-crew-cohesion-tested',
    turn: 25,
    kind: 'positive',
    expected: 'close_candidate',
    label: 'Slink trust beat resolves the internal crew question',
    rationale: 'The immediate debt/job decision and crew-cohesion beat are both stable enough for handover.',
  },
  {
    id: 'p4-undock-boundary',
    turn: 31,
    kind: 'positive',
    expected: 'must_close_or_reframe',
    label: 'Endurance undocks from Gannett',
    rationale: 'Leaving Gannett crosses the Chapter 1 scope boundary. Corridor transit should be Chapter 2 material.',
  },
  {
    id: 'p5-cooling-cut-boundary',
    turn: 35,
    kind: 'positive',
    expected: 'must_close_or_reframe',
    label: 'Cooling cut and Sable Corridor operation dominates',
    rationale: 'If this is still Chapter 1, the boundary failure has already occurred. The next move must reframe.',
  },
]

export function extractCloseLoopProbes(exportPath, options = {}) {
  const data = JSON.parse(readFileSync(exportPath, 'utf8'))
  const briefText = loadBriefText(data.brief)
  const specs = options.probeIds?.length
    ? PROBE_SPECS.filter((spec) => options.probeIds.includes(spec.id))
    : PROBE_SPECS

  const probes = specs
    .map((spec) => buildProbe(data, briefText, spec))
    .filter(Boolean)

  return {
    probes,
    summary: {
      exportKind: data.kind,
      exportedAt: data.exportedAt,
      briefId: data.brief?.id,
      chapter: data.chapter,
      transcriptEntries: data.transcript?.length ?? 0,
      narratorTurns: (data.transcript ?? []).filter((entry) => entry.speaker === 'narrator').length,
      playerTurns: (data.transcript ?? []).filter((entry) => entry.speaker === 'player').length,
      extractedProbes: probes.length,
      expectedBreakdown: probes.reduce((acc, probe) => {
        acc[probe.expected] = (acc[probe.expected] ?? 0) + 1
        return acc
      }, {}),
    },
  }
}

function buildProbe(data, briefText, spec) {
  const transcript = data.transcript ?? []
  const playerEntry = transcript.find((entry) => entry.speaker === 'player' && entry.turn === spec.turn)
  if (!playerEntry) return null

  const narratorEntry = transcript.find((entry) => entry.speaker === 'narrator' && entry.turn === spec.turn)
  const transcriptPrefix = transcript
    .filter((entry) => entry.turn < spec.turn)
    .map((entry) => ({
      role: entry.speaker === 'player' ? 'user' : 'assistant',
      content: entry.content,
    }))

  const mechanicalSnapshot = (data.mechanicalSnapshots ?? []).find((snapshot) => snapshot.turn === spec.turn) ?? null

  return {
    ...spec,
    briefId: data.brief?.id,
    briefTitle: data.brief?.title,
    briefText,
    transcript: transcriptPrefix,
    playerInput: playerEntry.content,
    mechanicalSnapshot,
    actualNarratorOutput: narratorEntry?.content ?? '',
    actualTurnChapter: playerEntry.chapter,
    advisory: buildCodeAdvisory(spec),
  }
}

export function buildCodeAdvisory(spec) {
  if (spec.expected === 'no_close') {
    return [
      `Probe ${spec.id}: no close advisory.`,
      'The foreground question is still live.',
      'Keep pressure concrete. Do not signal chapter close.',
      'If the player seeks information, price it with a roll, concession, exposure, or partial answer.',
    ].join('\n')
  }

  if (spec.expected === 'compress') {
    return [
      `Probe ${spec.id}: compress toward the chapter-defining broker decision.`,
      'Do not close this exact beat unless the player-facing scene naturally lands there.',
      'Do not open a new side investigation. Move decisively toward accepting/refusing/reframing the broker job.',
      'Forbidden repeat: more generic station logistics that do not change the decision.',
    ].join('\n')
  }

  if (spec.expected === 'close_candidate') {
    return [
      `Probe ${spec.id}: close candidate.`,
      'At least three close signals are true: major irreversible decision, immediate objective transformed, handover would be clean, and next chapter can open on a clear first decision.',
      'If no "never close mid" condition is active, close this chapter or write one consolidation beat that explicitly leads to close.',
      'Do not introduce a new chapter-scale truth unless it is framed as the next chapter hook.',
    ].join('\n')
  }

  if (spec.expected === 'must_close_or_reframe') {
    return [
      `Probe ${spec.id}: hard scope boundary crossed.`,
      'The old Chapter 1 question has been answered or displaced.',
      'This turn must close Chapter 1 or explicitly reframe to Chapter 2 with a new foreground question.',
      'Do not continue ordinary Chapter 1 play. Do not add more Gannett/berth/manifest friction.',
    ].join('\n')
  }

  return ''
}

export function renderSnapshotText(snapshot) {
  if (!snapshot) return '## Private mechanical snapshot\nNo snapshot available for this turn.'

  const lines = [
    '## Private mechanical snapshot',
    'Use this as code-owned truth for the next response. Do not quote this block or describe it as a system note.',
    '',
    `- Chapter: ${snapshot.chapter ?? 'unknown'}; turn: ${snapshot.turn ?? 'unknown'}`,
    `- PC: ${snapshot.pcName ?? 'unnamed'}; AC ${snapshot.ac ?? 15}; inspiration ${snapshot.inspiration ?? 0}`,
    `- HP: ${snapshot.hp ?? 'unknown'}`,
    `- Location: ${snapshot.location ?? 'unknown'}`,
    `- Inventory: ${(snapshot.inventory ?? []).join(', ') || 'none'}`,
    `- Present/known NPCs: ${(snapshot.npcs ?? []).join(', ') || 'none'}`,
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

function loadBriefText(briefMeta) {
  if (!briefMeta) return ''

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

  if (briefMeta.text) return briefMeta.text
  if (briefMeta.brief) return briefMeta.brief

  return ''
}
