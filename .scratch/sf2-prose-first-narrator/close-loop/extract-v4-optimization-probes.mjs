/**
 * Refined probe extraction for optimizing v4.
 *
 * This keeps the original Forty Thousand probes as the evidence base but
 * updates expectations based on the first run:
 * - p1 must avoid future-fact close compression.
 * - p3 is an active Slink revelation scene, not a clean close point.
 * - p4/p5 are strict hard boundaries, not soft close candidates.
 */

import { extractCloseLoopProbes } from './extract-probes.mjs'

const OPTIMIZATION_EXPECTATIONS = {
  'p1-passenger-arrangement': {
    expected: 'compress_no_future',
    label: 'Davan/Kes arrangement sealed, broker decision still ahead',
    rationale: 'Do not close and do not count broker/lien/departure facts that have not happened yet.',
  },
  'p2-broker-job-accepted': {
    expected: 'close_candidate_or_plan',
    label: 'Broker job accepted; consolidate toward clean chapter close',
    rationale: 'The chapter-defining decision has landed, but one consolidation beat may still be needed.',
  },
  'p3-crew-cohesion-tested': {
    expected: 'active_revelation_defer',
    label: 'Slink trust beat is active revelation, not clean aftermath',
    rationale: 'Slink is present, answering a direct question, and handing over evidence. Never close mid-revelation.',
  },
  'p4-undock-boundary': {
    expected: 'hard_boundary_strict',
    label: 'Endurance undocks from Gannett',
    rationale: 'Leaving Gannett is a hard scope boundary. The old chapter must close or explicitly reframe.',
  },
  'p5-cooling-cut-boundary': {
    expected: 'hard_boundary_strict',
    label: 'Cooling cut and Ossel route pressure dominate',
    rationale: 'The corridor operation is successor-chapter material. Continuing old Chapter 1 is failure.',
  },
}

export function extractV4OptimizationProbes(exportPath, options = {}) {
  const { probes, summary } = extractCloseLoopProbes(exportPath, options)
  const optimized = probes.map((probe) => optimizeProbe(probe))

  return {
    probes: optimized,
    summary: {
      ...summary,
      optimization: 'v4',
      expectedBreakdown: optimized.reduce((acc, probe) => {
        acc[probe.expected] = (acc[probe.expected] ?? 0) + 1
        return acc
      }, {}),
    },
  }
}

function optimizeProbe(probe) {
  const override = OPTIMIZATION_EXPECTATIONS[probe.id]
  if (!override) {
    return {
      ...probe,
      advisory: buildV4OptimizationAdvisory({ ...probe, expected: probe.expected }),
    }
  }

  const optimized = {
    ...probe,
    ...override,
  }

  return {
    ...optimized,
    advisory: buildV4OptimizationAdvisory(optimized),
  }
}

export function buildV4OptimizationAdvisory(probe) {
  if (probe.expected === 'no_close') {
    return [
      `Probe ${probe.id}: no close advisory.`,
      'The foreground question is still live.',
      'Keep pressure concrete. Do not signal chapter close.',
      'If the player seeks information, price it with a roll, concession, exposure, or partial answer.',
    ].join('\n')
  }

  if (probe.expected === 'compress_no_future') {
    return [
      `Probe ${probe.id}: compress toward broker decision, but do not close.`,
      'Done: Davan/Kes arrangement is sealed.',
      'In flight: player is heading to the broker to negotiate/accept the job.',
      'Not done: broker deal signed, lien cleared, cargo loaded, ship unclamped, departure authorized.',
      'Do not count Not done items as close signals.',
      'Do not open a new side investigation. Move decisively toward accepting/refusing/reframing the broker job.',
    ].join('\n')
  }

  if (probe.expected === 'close_candidate_or_plan') {
    return [
      `Probe ${probe.id}: close candidate or close plan.`,
      'The broker job is accepted and the old debt-only foreground question has transformed.',
      'One consolidation beat is acceptable if it makes handover cleaner: crew truth, passenger positioning, Harbour Office paperwork, or departure framing.',
      'Do not introduce a new Gannett-side chapter-scale problem.',
      'If no active blocker exists, close or reframe. If an active blocker exists, mark close_candidate and name the blocker.',
    ].join('\n')
  }

  if (probe.expected === 'active_revelation_defer') {
    return [
      `Probe ${probe.id}: active revelation blocker.`,
      'Slink is present and answering a direct question. He may reveal evidence or uncertainty, but the revelation has not landed until the answer is complete.',
      'Do not close or reframe during this exchange.',
      'Do call narrate_turn with chapter_status.',
      'Mark close pressure only as blocked/deferred: close_candidate can be true, pivot_signaled must be false, and never_close_mid_active should name the live Slink/revelation exchange.',
      'The next required delta is to finish this answer and steer toward departure/undock as the clean close boundary.',
    ].join('\n')
  }

  if (probe.expected === 'hard_boundary_strict') {
    return [
      `Probe ${probe.id}: strict hard scope boundary.`,
      'The old Chapter 1 question has been answered or displaced.',
      'This turn must close Chapter 1 or explicitly reframe to Chapter 2 with a new foreground question.',
      'Set authorial_moves.pivot_signaled to true and use phase "closed" or "reframed".',
      'Do not continue ordinary Chapter 1 play. Do not add more Gannett/berth/manifest friction.',
    ].join('\n')
  }

  if (probe.expected === 'close_candidate') {
    return [
      `Probe ${probe.id}: close candidate.`,
      'If no "never close mid" condition is active, close this chapter or write one consolidation beat that explicitly leads to close.',
      'Do not introduce a new chapter-scale truth unless it is framed as the next chapter hook.',
    ].join('\n')
  }

  return probe.advisory ?? ''
}
