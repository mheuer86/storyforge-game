import type { GameState, ChapterDebrief } from '../types'
import { dbg, type CommitTurnInput, type StatChange } from '../tool-processor'
import { resetChapterCounters } from '../rules-engine'

export function applyNarrativeChanges(
  input: CommitTurnInput,
  updated: GameState,
  statChanges: StatChange[],
  trackEvent?: (name: string, data: Record<string, string | number | boolean>) => void,
): GameState {
  // Chapter frame update rules:
  // - Always allowed during close sequence (close_chapter present)
  // - One mid-chapter refinement allowed if: turn 5+ AND (defining decision OR promise change in same commit)
  // - All other mid-chapter updates silently rejected to prevent frame drift
  if (input.chapter_frame) {
    const isCloseSequence = !!input.close_chapter
    const alreadyRefined = updated.chapterFrame?.refined === true
    const turnCount = updated.history.messages.filter(m => m.role === 'player').length
    const hasDefiningTrigger = !!input.world?.add_decision || !!input.world?.update_promise

    if (isCloseSequence) {
      updated = {
        ...updated,
        chapterFrame: {
          objective: input.chapter_frame.objective,
          crucible: input.chapter_frame.crucible,
          ...(input.chapter_frame.outcome_spectrum && { outcomeSpectrum: input.chapter_frame.outcome_spectrum }),
        },
      }
    } else if (!alreadyRefined && turnCount >= 5 && hasDefiningTrigger) {
      updated = {
        ...updated,
        chapterFrame: {
          objective: input.chapter_frame.objective,
          crucible: input.chapter_frame.crucible,
          refined: true,
          ...(input.chapter_frame.outcome_spectrum && { outcomeSpectrum: input.chapter_frame.outcome_spectrum }),
        },
      }
      dbg(`Frame refined at turn ${turnCount}: "${input.chapter_frame.objective}"`)
    }
  }

  if (input.signal_close) {
    // Gate: signal_close requires scene_end (don't close mid-scene) and no pending_check (don't close mid-roll)
    const hasSceneEnd = !!input.scene_end
    const hasPendingCheck = !!input.pending_check
    if (hasSceneEnd && !hasPendingCheck) {
      const { _signalCloseDeferred, ...rest } = updated as GameState & { _signalCloseDeferred?: string }
      updated = {
        ...rest as GameState,
        meta: {
          ...updated.meta,
          closeReady: true,
          closeReason: input.signal_close.reason,
          ...(input.signal_close.self_assessment && { selfAssessment: input.signal_close.self_assessment }),
        },
      }
    }
    // If gated out, log why and set flag so the prompt reminds Claude next turn
    if (!hasSceneEnd) {
      dbg('signal_close DEFERRED: missing scene_end')
      ;(updated as GameState & { _signalCloseDeferred?: string })._signalCloseDeferred = 'missing scene_end'
    }
    if (hasPendingCheck) {
      dbg('signal_close DEFERRED: pending_check in same turn')
      ;(updated as GameState & { _signalCloseDeferred?: string })._signalCloseDeferred = 'pending_check'
    }
  }

  if (input.close_chapter && !updated.meta.chapterClosed) {
    const rawCi = input.close_chapter
    // Strip "Chapter N:" prefix if Claude included it in the title
    const ci = { ...rawCi, next_title: rawCi.next_title.replace(/^Chapter\s+\d+\s*:\s*/i, '') }
    const currentNum = updated.meta.chapterNumber
    trackEvent?.('chapter_completed', { chapter: currentNum, genre: updated.meta.genre })
    const completedChapter = {
      ...updated.history.chapters.find((ch) => ch.number === currentNum) ?? {
        number: currentNum,
        title: updated.meta.chapterTitle,
        keyEvents: [],
      },
      status: 'complete' as const,
      summary: ci.summary,
      keyEvents: ci.key_events,
      sceneSummaries: updated.sceneSummaries.length > 0 ? updated.sceneSummaries : undefined,
      ...(ci.outcome_tier && { outcomeTier: ci.outcome_tier }),
    }
    const nextNum = currentNum + 1
    const nextChapter = {
      number: nextNum,
      title: ci.next_title,
      status: 'in-progress' as const,
      summary: '',
      keyEvents: [],
    }
    updated = {
      ...updated,
      meta: {
        ...updated.meta,
        chapterNumber: nextNum,
        chapterTitle: ci.next_title,
        chapterClosed: true,  // prevent Phase 2/3 from closing another chapter
        closeReady: false,
        closeReason: undefined,
        selfAssessment: undefined,
      },
      chapterFrame: input.chapter_frame
        ? {
            objective: input.chapter_frame.objective,
            crucible: input.chapter_frame.crucible,
            ...(input.chapter_frame.outcome_spectrum && { outcomeSpectrum: input.chapter_frame.outcome_spectrum }),
          }
        : ci.forward_hook
          ? { objective: ci.forward_hook, crucible: 'Establish in opening turns' }
          : null,
      storySummary: null,
      sceneSummaries: [],
      _pendingSceneSummary: false,
      _objectiveResolvedAtTurn: undefined,
      scopeSignals: 0,
      npcFailures: [],
      counters: resetChapterCounters(updated).counters,  // reset per-chapter counters, preserve persistent ones
      history: {
        ...updated.history,
        chapters: [
          ...updated.history.chapters.filter((ch) => ch.number !== currentNum),
          { ...completedChapter, messages: updated.history.messages },
          nextChapter,
        ],
        messages: [],
        // Keep rollLog until Phase 2 debrief has used it — cleared on next chapter start
      },
      world: updated.world.antagonist
        ? { ...updated.world, antagonist: { ...updated.world.antagonist, movedThisChapter: false } }
        : updated.world,
    }
    statChanges.push({ type: 'neutral', label: `Chapter ${nextNum}: ${ci.next_title}` })
  }

  if (input.debrief) {
    const chapters = updated.history.chapters.map((ch) =>
      ch.status === 'complete' && !ch.debrief
        ? { ...ch, debrief: input.debrief }
        : ch
    )
    updated = { ...updated, history: { ...updated.history, chapters } }
    statChanges.push({ type: 'new', label: 'Chapter debrief ready' })
  }

  // Scene summaries — when Claude signals scene_end, compress prior messages into a summary
  if (input.scene_end && input.scene_summary) {
    const existing = updated.sceneSummaries ?? []
    const lastSummary = existing[existing.length - 1]
    const fromIndex = lastSummary ? lastSummary.toMessageIndex + 1 : 0
    const toIndex = Math.max(0, updated.history.messages.length - 1)
    // Prevent duplicate: skip if toIndex hasn't advanced past the last summary
    if (toIndex >= fromIndex && toIndex !== lastSummary?.toMessageIndex) {
      updated = {
        ...updated,
        sceneSummaries: [
          ...existing,
          {
            text: input.scene_summary,
            sceneNumber: existing.length + 1,
            fromMessageIndex: fromIndex,
            toMessageIndex: toIndex,
            ...(input.tone_signature && { toneSignature: input.tone_signature }),
          },
        ],
      }
    }
  }

  // Objective status tracking: record when objective flips to resolved/failed
  if (input.objective_status && (input.objective_status === 'resolved' || input.objective_status === 'failed') && !updated._objectiveResolvedAtTurn) {
    const turnCount = updated.history.messages.filter(m => m.role === 'player').length
    updated = { ...updated, _objectiveResolvedAtTurn: turnCount } as typeof updated
  }

  // Track missed scene_end: if set_location happened without scene_end, flag it for next turn
  if (input.world?.set_location && !input.scene_end) {
    const isFirstScene = (updated.sceneSummaries ?? []).length === 0 && updated.history.messages.length <= 2
    if (!isFirstScene) {
      updated = { ...updated, _pendingSceneSummary: true } as typeof updated
    }
  } else if (input.scene_end) {
    // Clear the flag if scene_end was properly sent
    updated = { ...updated, _pendingSceneSummary: false } as typeof updated
  }

  // Pivotal scenes (close prompt curation)
  if (input.pivotal_scenes) {
    const scenes = input.pivotal_scenes
    const existing = updated.pivotalScenes ?? []
    const newScenes = scenes.map(s => ({
      title: s.title,
      text: s.text,
      chapter: updated.meta.chapterNumber,
    }))
    // Cap at 8 total, keep newest
    updated = {
      ...updated,
      pivotalScenes: [...existing, ...newScenes].slice(-8),
    }
  }

  // Arc updates
  if (input.arc_updates) {
    const au = input.arc_updates
    let arcs = [...(updated.arcs ?? [])]

    if (au.create_arc) {
      // Dedup: match by ID, title similarity, or significant keyword overlap
      const newTitle = au.create_arc.title.toLowerCase()
      const newWords = new Set(newTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3))
      const existing = arcs.find(a => {
        if (a.id === au.create_arc!.id) return true
        const existingTitle = a.title.toLowerCase()
        if (existingTitle === newTitle) return true
        // Substring match (first 20 chars)
        if (existingTitle.includes(newTitle.slice(0, 20)) || newTitle.includes(existingTitle.slice(0, 20))) return true
        // Keyword overlap: if 2+ significant words match, it's likely the same arc
        // (proper nouns like character/location names are strong signals)
        const existingWords = new Set(existingTitle.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3))
        const overlap = [...newWords].filter(w => existingWords.has(w) || [...existingWords].some(ew => ew.startsWith(w) || w.startsWith(ew))).length
        if (overlap >= 2) return true
        return false
      })
      if (!existing) {
        arcs.push({
          id: au.create_arc.id,
          title: au.create_arc.title,
          status: 'active',
          episodes: au.create_arc.episodes.map((milestone, i) => ({
            chapter: updated.meta.chapterNumber,
            milestone,
            status: i === 0 ? 'active' as const : 'pending' as const,
          })),
          ...(au.create_arc.outcome_spectrum && { outcomeSpectrum: au.create_arc.outcome_spectrum }),
        })
      }
    }

    if (au.advance_episode) {
      // Capture outcome_tier from close_chapter to store on the completed episode
      const closeTier = input.close_chapter?.outcome_tier
      arcs = arcs.map(a => {
        if (a.id !== au.advance_episode!.arc_id) return a
        let foundActive = false
        let activatedNext = false
        const episodes = a.episodes.map(ep => {
          if (ep.status === 'active' && !foundActive) {
            foundActive = true
            return { ...ep, status: 'complete' as const, summary: au.advance_episode!.summary, ...(closeTier && { outcomeTier: closeTier }) }
          }
          if (foundActive && ep.status === 'pending' && !activatedNext) {
            activatedNext = true
            return { ...ep, status: 'active' as const, chapter: updated.meta.chapterNumber }
          }
          return ep
        })
        return { ...a, episodes }
      })
    }

    if (au.resolve_arc) {
      arcs = arcs.map(a =>
        a.id === au.resolve_arc!.arc_id ? { ...a, status: 'resolved' as const } : a
      )
      // Clean up scene summaries from prior chapters, but only if no other active arc
      // has episodes in that chapter. A scene touched by two arcs stays until both resolve.
      const remainingActiveArcs = arcs.filter(a => a.status === 'active')
      const chaptersWithActiveArcs = new Set(
        remainingActiveArcs.flatMap(a => a.episodes.map(e => e.chapter))
      )
      const chapters = updated.history.chapters.map(ch =>
        ch.sceneSummaries && !chaptersWithActiveArcs.has(ch.number)
          ? { ...ch, sceneSummaries: undefined }
          : ch
      )
      updated = { ...updated, history: { ...updated.history, chapters } }
    }

    if (au.abandon_arc) {
      arcs = arcs.map(a =>
        a.id === au.abandon_arc!.arc_id ? { ...a, status: 'abandoned' as const } : a
      )
    }

    if (au.add_episode) {
      arcs = arcs.map(a => {
        if (a.id !== au.add_episode!.arc_id) return a
        return {
          ...a,
          episodes: [...a.episodes, {
            chapter: updated.meta.chapterNumber,
            milestone: au.add_episode!.milestone,
            status: 'pending' as const,
          }],
        }
      })
    }

    updated = { ...updated, arcs }
  }

  return updated
}
