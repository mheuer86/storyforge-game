// Pacing signals — deterministic advisories computed from Archivist
// classifications + state. Inject into Narrator DYNAMIC. Advisory only — they
// nudge the Narrator; they don't constrain.
//
// Four signals per the design doc §9:
// - reactivity ratio: world-initiated vs player-initiated beats over a window
// - scene-link discipline: sequence of clean closures without a forward hook
// - thread tension stagnation: thread touched repeatedly without moving
// - arc dormant: active arc with zero advancement this chapter

import type { Sf2EntityId, Sf2PacingAdvisory, Sf2State } from '../types'

const REACTIVITY_WINDOW = 8
const REACTIVITY_THRESHOLD = 0.2
const STAGNATION_WINDOW = 5
const STAGNATION_TOUCH_MIN = 3
const STAGNATION_DELTA_MAX = 1
const SCENE_LINK_CONSECUTIVE = 2

export function computePacingAdvisory(state: Sf2State): Sf2PacingAdvisory {
  const recent = state.history.turns.slice(-REACTIVITY_WINDOW)

  // Reactivity ratio
  let worldCount = 0
  let totalCount = 0
  for (const turn of recent) {
    const cls = turn.archivistPatchApplied?.pacingClassification
    if (!cls) continue
    totalCount += 1
    if (cls.worldInitiated) worldCount += 1
  }
  const reactivityRatio = totalCount > 0 ? worldCount / totalCount : 0.5
  const reactivityTripped =
    totalCount >= REACTIVITY_WINDOW && reactivityRatio < REACTIVITY_THRESHOLD

  // Scene-link discipline. Walk recent scene endings; "clean closure" means
  // leadsTo === null. Two consecutive clean closures with no intervening
  // forward-hook ending = trip.
  const sceneSummaries = state.chapter.sceneSummaries.slice(-(SCENE_LINK_CONSECUTIVE + 2))
  let consecutiveClean = 0
  let sceneLinkStatus: Sf2PacingAdvisory['sceneLinkStatus'] = 'insufficient_data'
  for (const s of sceneSummaries) {
    if (s.leadsTo === null) {
      consecutiveClean += 1
      sceneLinkStatus = 'clean_closure'
    } else {
      consecutiveClean = 0
      sceneLinkStatus = 'forward_hook'
    }
  }
  const sceneLinkTripped = consecutiveClean >= SCENE_LINK_CONSECUTIVE

  // Thread stagnation: per active thread, count touches in last STAGNATION_WINDOW
  // turns and sum |tension delta|. Tripped if touched ≥3 times with total |delta| ≤1.
  const stagnationWindow = state.history.turns.slice(-STAGNATION_WINDOW)
  const touches = new Map<Sf2EntityId, number>()
  const deltas = new Map<Sf2EntityId, number>()
  for (const turn of stagnationWindow) {
    const cls = turn.archivistPatchApplied?.pacingClassification
    if (!cls) continue
    for (const [tid, delta] of Object.entries(cls.tensionDeltasByThreadId)) {
      touches.set(tid, (touches.get(tid) ?? 0) + 1)
      deltas.set(tid, (deltas.get(tid) ?? 0) + Math.abs(delta))
    }
  }
  const stagnantThreadIds: Sf2EntityId[] = []
  for (const [tid, touchCount] of touches) {
    const totalAbsDelta = deltas.get(tid) ?? 0
    const thread = state.campaign.threads[tid]
    if (
      touchCount >= STAGNATION_TOUCH_MIN &&
      totalAbsDelta <= STAGNATION_DELTA_MAX &&
      thread?.status === 'active'
    ) {
      stagnantThreadIds.push(tid)
    }
  }

  // Arc dormant: active arcs whose threads have not advanced this chapter.
  const arcDormantIds: Sf2EntityId[] = []
  const currentChapter = state.meta.currentChapter
  const turnsThisChapter = state.history.turns.filter((t) => t.chapter === currentChapter)
  const earliestTurnThisChapter = turnsThisChapter[0]?.index ?? 0
  for (const arc of Object.values(state.campaign.arcs)) {
    if (arc.status !== 'active') continue
    let advancedThisChapter = false
    for (const tid of arc.threadIds) {
      const thread = state.campaign.threads[tid]
      if (!thread) continue
      if (
        thread.lastAdvancedTurn !== undefined &&
        thread.lastAdvancedTurn >= earliestTurnThisChapter
      ) {
        advancedThisChapter = true
        break
      }
    }
    // Only flag dormant if the chapter has had meaningful play (5+ turns)
    if (!advancedThisChapter && turnsThisChapter.length >= 5) {
      arcDormantIds.push(arc.id)
    }
  }

  return {
    reactivityRatio,
    reactivityTripped,
    sceneLinkStatus,
    sceneLinkTripped,
    stagnantThreadIds,
    arcDormantIds,
  }
}

// Render advisories as a compact instruction block for Narrator DYNAMIC.
// Returns empty string when nothing is tripped (saves tokens; no noise).
export function renderPacingAdvisories(
  advisory: Sf2PacingAdvisory,
  state: Sf2State
): string {
  const advisories: string[] = []

  if (advisory.reactivityTripped) {
    advisories.push(
      `**Reactivity low (${(advisory.reactivityRatio * 100).toFixed(0)}% world-initiated).** You have been responding to player moves; the world is not pushing back. This turn, let an NPC act without being asked, or let an off-stage pressure (the courier window, an institutional clock, a faction move) intrude visibly.`
    )
  }

  if (advisory.sceneLinkTripped) {
    advisories.push(
      `**Scene-link discipline broken.** The last ${SCENE_LINK_CONSECUTIVE}+ scenes ended with clean closures (no forward hook). Scenes are concatenating "and then." End this scene with one of: an unanswered question, a kinetic carry, a relational tension, or an unpaid promise. Do not let it close clean.`
    )
  }

  if (advisory.stagnantThreadIds.length > 0) {
    const titles = advisory.stagnantThreadIds
      .map((tid) => state.campaign.threads[tid]?.title ?? tid)
      .join(', ')
    advisories.push(
      `**Stagnant threads:** ${titles}. These threads have been touched repeatedly across the last ${STAGNATION_WINDOW} turns without moving. Either advance them concretely this turn (revelation, decision-point, deterioration) or let them rest by not surfacing them.`
    )
  }

  if (advisory.arcDormantIds.length > 0) {
    const titles = advisory.arcDormantIds
      .map((aid) => state.campaign.arcs[aid]?.title ?? aid)
      .join(', ')
    advisories.push(
      `**Arc dormant in this chapter:** ${titles}. The arc has not advanced via any constituent thread. The chapter is drifting from its arc spine. Re-engage at least one constituent thread before close.`
    )
  }

  if (advisories.length === 0) return ''
  return `## Pacing advisories\n\n${advisories.join('\n\n')}`
}
