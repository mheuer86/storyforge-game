import { PROCEDURE_NONE } from '../procedure'
import type { Sf2ChapterMeaning, Sf2State } from '../types'

export type ChapterMeaningValidationFinding = {
  field: string
  severity: 'warning' | 'error'
  message: string
}

const NEW_THREAT_RE = /\b(new|unknown|emerging|external|bridge|successor|next|fresh)\s+(threat|actor|owner|pressure|bridge)\b/i

export function validateChapterMeaningTransitionSeed(
  state: Sf2State,
  meaning: Sf2ChapterMeaning
): ChapterMeaningValidationFinding[] {
  const seed = meaning.transitionSeed
  if (!seed) {
    return [{
      field: 'transition_seed',
      severity: 'error',
      message: 'transition_seed is required for next-chapter Author handoff',
    }]
  }

  const findings: ChapterMeaningValidationFinding[] = []
  const owner = seed.pressureOwnerCandidate.trim()
  if (!owner) {
    findings.push({
      field: 'transition_seed.pressure_owner_candidate',
      severity: 'error',
      message: 'pressure_owner_candidate is empty',
    })
  } else if (!matchesKnownPressureOwner(state, owner) && !NEW_THREAT_RE.test(owner)) {
    findings.push({
      field: 'transition_seed.pressure_owner_candidate',
      severity: 'warning',
      message: `pressure_owner_candidate "${owner}" does not match an existing NPC/faction or explicit new threat/bridge phrasing`,
    })
  }

  const mechanism = seed.procedureResidue.mechanism.trim()
  const keepAs = seed.procedureResidue.keepAs
  const hasProcedureResidue = mechanism.length > 0 && mechanism.toLowerCase() !== PROCEDURE_NONE
  if (!hasProcedureResidue && keepAs === 'leverage') {
    findings.push({
      field: 'transition_seed.procedure_residue',
      severity: 'error',
      message: 'procedure_residue.keep_as cannot be leverage when mechanism is none',
    })
  }

  if ((hasProcedureResidue || chapterHasResolvedMilestones(state)) && (seed.doNotRestage.length < 2 || seed.doNotRestage.length > 5)) {
    findings.push({
      field: 'transition_seed.do_not_restage',
      severity: 'warning',
      message: `do_not_restage must contain 2-5 items when procedure residue or resolved milestones exist (got ${seed.doNotRestage.length})`,
    })
  }

  return findings
}

function matchesKnownPressureOwner(state: Sf2State, owner: string): boolean {
  const normalized = normalize(owner)
  if (!normalized) return false
  return [...Object.values(state.campaign.npcs), ...Object.values(state.campaign.factions)].some((entity) => {
    const candidates = [
      entity.id,
      'name' in entity ? entity.name : '',
      'affiliation' in entity ? entity.affiliation : '',
      'retrievalCue' in entity ? entity.retrievalCue : '',
    ]
    return candidates.some((candidate) => {
      const n = normalize(candidate)
      if (!n) return false
      return n === normalized || n.includes(normalized) || normalized.includes(n)
    })
  })
}

function chapterHasResolvedMilestones(state: Sf2State): boolean {
  const terminal = new Set(['resolved_clean', 'resolved_costly', 'resolved_failure', 'resolved_catastrophic'])
  return Object.values(state.campaign.threads).some((thread) =>
    terminal.has(thread.status) &&
    state.chapter.setup.activeThreadIds.includes(thread.id)
  )
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
