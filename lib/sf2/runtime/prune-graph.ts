// Graph pruning. Pure function: given an Sf2State, demote entities whose
// anchor threads are all non-active. Does NOT delete — downgrades status so
// they stop showing up in the working-set scoring but remain queryable.
//
// Runs at chapter boundaries (before Author) and opportunistically when a
// thread transitions out of 'active'.

import type { Sf2ClueStatus, Sf2DecisionStatus, Sf2PromiseStatus, Sf2State } from '../types'

export interface PruneResult {
  demotedDecisions: number
  demotedPromises: number
  consumedClues: number
  clearedFloatingClues: number
  nextState: Sf2State
}

export function pruneGraph(state: Sf2State): PruneResult {
  const draft: Sf2State = structuredClone(state)
  const activeThreadIds = new Set(
    Object.values(draft.campaign.threads)
      .filter((t) => t.status === 'active')
      .map((t) => t.id)
  )

  let demotedDecisions = 0
  let demotedPromises = 0
  let consumedClues = 0
  let clearedFloatingClues = 0

  // Decisions: if all anchors are non-active and status is still 'active',
  // mark invalidated.
  for (const decision of Object.values(draft.campaign.decisions)) {
    if (decision.status !== 'active') continue
    const liveAnchors = decision.anchoredTo.filter((tid) => activeThreadIds.has(tid))
    if (liveAnchors.length === 0 && decision.anchoredTo.length > 0) {
      decision.status = 'invalidated' as Sf2DecisionStatus
      demotedDecisions += 1
    }
  }

  // Promises: if all anchors are non-active and status is still 'active',
  // mark released.
  for (const promise of Object.values(draft.campaign.promises)) {
    if (promise.status !== 'active') continue
    const liveAnchors = promise.anchoredTo.filter((tid) => activeThreadIds.has(tid))
    if (liveAnchors.length === 0 && promise.anchoredTo.length > 0) {
      promise.status = 'released' as Sf2PromiseStatus
      demotedPromises += 1
    }
  }

  // Clues: if attached-only anchors are dead, mark consumed.
  for (const clue of Object.values(draft.campaign.clues)) {
    if (clue.status !== 'attached') continue
    const liveAnchors = clue.anchoredTo.filter((tid) => activeThreadIds.has(tid))
    if (liveAnchors.length === 0 && clue.anchoredTo.length > 0) {
      clue.status = 'consumed' as Sf2ClueStatus
      consumedClues += 1
    }
  }

  // Floating clues: age out any floating clue older than 2 chapters.
  const cutoffChapter = draft.meta.currentChapter - 2
  const survivingFloating: string[] = []
  for (const clueId of draft.campaign.floatingClueIds) {
    const clue = draft.campaign.clues[clueId]
    if (!clue) continue
    if (clue.chapterCreated < cutoffChapter) {
      clue.status = 'consumed' as Sf2ClueStatus
      clearedFloatingClues += 1
    } else {
      survivingFloating.push(clueId)
    }
  }
  draft.campaign.floatingClueIds = survivingFloating

  return {
    demotedDecisions,
    demotedPromises,
    consumedClues,
    clearedFloatingClues,
    nextState: draft,
  }
}
