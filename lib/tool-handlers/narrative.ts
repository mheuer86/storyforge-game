import type { GameState, ChapterDebrief, ChapterFrameHistoryEntry } from '../types'
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
  // - Mid-chapter refinement gated by a turn cooldown: turn 5+ AND at least 5
  //   turns since the last refinement, AND a defining trigger (new decision or
  //   promise change) in the same commit. The cooldown replaces the prior
  //   "one refinement per chapter" boolean, which was too strict — Ch2 had five
  //   legitimate frame-sharpening evolutions that got silently rejected.
  if (input.chapter_frame) {
    const isCloseSequence = !!input.close_chapter
    const turnCount = updated.history.messages.filter(m => m.role === 'player').length
    const lastRefinedAt = updated.chapterFrame?.lastRefinedAtTurn
    const cooldownOk = lastRefinedAt === undefined || (turnCount - lastRefinedAt) >= 5
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
    } else if (turnCount >= 5 && cooldownOk && hasDefiningTrigger) {
      updated = {
        ...updated,
        chapterFrame: {
          objective: input.chapter_frame.objective,
          crucible: input.chapter_frame.crucible,
          refined: true,
          lastRefinedAtTurn: turnCount,
          ...(input.chapter_frame.outcome_spectrum && { outcomeSpectrum: input.chapter_frame.outcome_spectrum }),
        },
      }
      dbg(`Frame refined at turn ${turnCount} (cooldown-ok, last=${lastRefinedAt ?? 'never'}): "${input.chapter_frame.objective}"`)
    } else {
      const reason = turnCount < 5 ? 'pre-turn-5' : !cooldownOk ? `cooldown (${turnCount - (lastRefinedAt ?? 0)} < 5 since last)` : !hasDefiningTrigger ? 'no defining trigger' : '?'
      dbg(`Frame refinement rejected at turn ${turnCount}: ${reason}`)
    }
  }

  // Reframe: update chapterFrame, reset close-pressure state, archive prior frame.
  // Handled before signal_close so a turn that does both (rare) still reframes rather than closes.
  if (input.reframe && !input.close_chapter) {
    const prior = updated.chapterFrame
    const turnCount = updated.history.messages.filter(m => m.role === 'player').length
    const historyEntry: ChapterFrameHistoryEntry | null = prior
      ? {
          objective: prior.objective,
          crucible: prior.crucible,
          ...(prior.outcomeSpectrum && { outcomeSpectrum: prior.outcomeSpectrum }),
          reason: input.reframe.reason,
          replacedAtTurn: turnCount,
        }
      : null

    const nextSpectrum = input.reframe.new_outcome_spectrum ?? prior?.outcomeSpectrum

    const { _objectiveResolvedAtTurn, ...rest } = updated
    updated = {
      ...rest as GameState,
      chapterFrame: {
        objective: input.reframe.new_objective,
        crucible: input.reframe.new_crucible,
        refined: false,
        ...(nextSpectrum && { outcomeSpectrum: nextSpectrum }),
        history: historyEntry ? [...(prior?.history ?? []), historyEntry] : (prior?.history ?? []),
      },
      meta: {
        ...updated.meta,
        closeReady: false,
        closeReason: undefined,
        selfAssessment: undefined,
      },
    }
    statChanges.push({ type: 'neutral', label: `Chapter reframed: ${input.reframe.new_objective}` })
    dbg(`REFRAME turn=${turnCount} new_objective="${input.reframe.new_objective}" reason="${input.reframe.reason}"`)
  }

  if (input.signal_close) {
    // Gate: block signal_close if there's a pending_check (don't close mid-roll)
    // or a reframe in the same turn (reframe says the chapter has room to run).
    const hasPendingCheck = !!input.pending_check
    if (input.reframe) {
      dbg('signal_close SUPPRESSED: reframe in same turn (chapter continues under new frame)')
    } else if (!hasPendingCheck) {
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

  // Objective status tracking: record when objective flips to resolved/failed.
  // Skip if a reframe fired this turn — the new objective can't be resolved the moment it's set.
  if (input.objective_status && (input.objective_status === 'resolved' || input.objective_status === 'failed') && !updated._objectiveResolvedAtTurn && !input.reframe) {
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
      // Validation gates — reject arcs that are thread-shaped or over-budget.
      const ca = au.create_arc
      const activeArcCount = arcs.filter(a => a.status === 'active').length
      const episodeCount = ca.episodes?.length ?? 0
      const stakes = (ca.stakes_definition ?? '').trim()
      const title = (ca.title ?? '').trim()
      const spans = ca.spans_chapters ?? 0
      const rejections: string[] = []
      if (episodeCount < 2 || episodeCount > 4) rejections.push(`episodes=${episodeCount} (must be 2-4)`)
      if (spans < 3) rejections.push(`spans_chapters=${spans} (must be >= 3)`)
      if (!stakes) rejections.push('stakes_definition missing or empty')
      else if (stakes.toLowerCase() === title.toLowerCase()) rejections.push('stakes_definition duplicates title')
      if (activeArcCount >= 5) rejections.push(`active arcs already at cap (${activeArcCount})`)

      if (rejections.length > 0) {
        dbg(`ARC_CREATE_REJECTED id="${ca.id}" title="${title}" reasons=[${rejections.join('; ')}] payload=${JSON.stringify(ca)}`)
      } else {
        // Dedup: match by ID, title similarity, or stakes similarity (catches the
        // "relabeling" failure mode where two thematically-identical arcs get
        // different titles and evade the title-overlap check).
        const normalizeTokens = (s: string) =>
          new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3))
        const jaccard = (a: Set<string>, b: Set<string>) => {
          if (a.size === 0 || b.size === 0) return 0
          const intersect = [...a].filter(w => b.has(w)).length
          const union = new Set([...a, ...b]).size
          return intersect / union
        }
        const newTitle = title.toLowerCase()
        const newTitleWords = normalizeTokens(newTitle)
        const newStakesWords = normalizeTokens(stakes)
        let matchReason = ''
        const existing = arcs.find(a => {
          if (a.id === ca.id) { matchReason = 'id'; return true }
          const existingTitle = a.title.toLowerCase()
          if (existingTitle === newTitle) { matchReason = 'exact_title'; return true }
          if (existingTitle.includes(newTitle.slice(0, 20)) || newTitle.includes(existingTitle.slice(0, 20))) { matchReason = 'title_substring'; return true }
          const existingTitleWords = normalizeTokens(existingTitle)
          const titleOverlap = [...newTitleWords].filter(w => existingTitleWords.has(w) || [...existingTitleWords].some(ew => ew.startsWith(w) || w.startsWith(ew))).length
          if (titleOverlap >= 2) { matchReason = 'title_keyword_overlap'; return true }
          // Stakes similarity: Jaccard on significant tokens. Catches relabeling.
          if (a.stakesDefinition && stakes) {
            const existingStakesWords = normalizeTokens(a.stakesDefinition)
            const stakesSim = jaccard(newStakesWords, existingStakesWords)
            if (stakesSim >= 0.6) { matchReason = `stakes_jaccard_${stakesSim.toFixed(2)}`; return true }
          }
          return false
        })
        if (!existing) {
          arcs.push({
            id: ca.id,
            title: ca.title,
            status: 'active',
            episodes: ca.episodes.map((milestone, i) => ({
              chapter: updated.meta.chapterNumber,
              milestone,
              status: i === 0 ? 'active' as const : 'pending' as const,
            })),
            ...(ca.outcome_spectrum && { outcomeSpectrum: ca.outcome_spectrum }),
            ...(stakes && { stakesDefinition: stakes }),
          })
          dbg(`ENTITY_WRITE add_arc result=new id=${ca.id} title="${ca.title}" episodes=${ca.episodes.length} spans_chapters=${ca.spans_chapters} stakes="${stakes.slice(0, 80)}"`)
        } else {
          dbg(`ENTITY_WRITE add_arc result=dup_rejected id=${ca.id} matched_existing="${existing.id}" reason=${matchReason}`)
        }
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
