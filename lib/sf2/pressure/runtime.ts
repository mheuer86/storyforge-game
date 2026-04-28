import { ENGINE_AGGREGATION_DEFAULT } from './constants'
import { deriveEngineValue, initializeChapterPressure } from './derive'
import type {
  Sf2ChapterSetupRuntimeState,
  Sf2EngineRuntime,
  Sf2EntityId,
  Sf2State,
} from '../types'

export function ensureRuntimeEnginesFromArcPlan(state: Sf2State): void {
  const arc = state.campaign.arcPlan
  if (!arc) return
  state.campaign.engines ??= {}
  for (const engine of arc.pressureEngines) {
    const existing = state.campaign.engines[engine.id]
    // Summary stays in sync with the arc-plan's visibleSymptoms while
    // existing.summary still equals what we last seeded from it. Once Phase 6
    // adds `update_engine` patches (archivist-driven summary writes), that
    // overridden summary will diverge from visibleSymptoms and we stop
    // refreshing. This keeps long-arc signal alive instead of frozen at first
    // creation, without clobbering future explicit edits.
    const summaryFromArc = engine.visibleSymptoms
    const summary =
      existing && existing.summary !== existing.visibleSymptoms
        ? existing.summary
        : summaryFromArc
    const runtime: Sf2EngineRuntime = {
      id: engine.id,
      name: engine.name,
      status: existing?.status ?? 'active',
      summary,
      aggregation: existing?.aggregation ?? engine.aggregation ?? ENGINE_AGGREGATION_DEFAULT,
      anchorThreadIds: existing?.anchorThreadIds ?? [],
      primaryThreadId: existing?.primaryThreadId,
      value: existing?.value ?? 0,
      advancesWhen: engine.advancesWhen,
      slowsWhen: engine.slowsWhen,
      visibleSymptoms: engine.visibleSymptoms,
      lastUpdatedTurn: existing?.lastUpdatedTurn,
      lastUpdatedChapter: existing?.lastUpdatedChapter,
    }
    state.campaign.engines[engine.id] = runtime
  }
}

// `priorActiveThreadIds` is the previous chapter's activeThreadIds, captured
// before the new chapter setup overwrote them. Required so the role splitter
// can distinguish "active last chapter" from "background carried into this
// chapter" — the two roles cool by 2 vs 4 (D4) and the bug at the call site
// would silently classify everything as 'active' if we read it from `state`.
export function prepareChapterPressureRuntime(
  state: Sf2State,
  chapterSetup: Sf2ChapterSetupRuntimeState,
  priorActiveThreadIds: Sf2EntityId[]
): Sf2ChapterSetupRuntimeState {
  ensureRuntimeEnginesFromArcPlan(state)
  seedSelectedEngineAnchors(state, chapterSetup)
  updateRuntimeEngineValues(state)
  return {
    ...chapterSetup,
    threadPressure: initializeChapterPressure(state, chapterSetup, priorActiveThreadIds),
  }
}

export function updateRuntimeEngineValues(state: Sf2State): void {
  const turn = state.history.turns.length
  const chapter = state.meta.currentChapter
  for (const engine of Object.values(state.campaign.engines ?? {})) {
    const nextValue = deriveEngineValue(engine, state.campaign.threads)
    if (engine.value !== nextValue) {
      engine.value = nextValue
      engine.lastUpdatedTurn = turn
      engine.lastUpdatedChapter = chapter
    }
  }
}

function seedSelectedEngineAnchors(
  state: Sf2State,
  chapterSetup: Sf2ChapterSetupRuntimeState
): void {
  const selectedIds = chapterSetup.arcLink?.pressureEngineIds ?? []
  if (selectedIds.length === 0) return
  const anchorIds = chapterSetup.activeThreadIds.filter((id) => Boolean(state.campaign.threads[id]))
  if (anchorIds.length === 0) return
  for (const engineId of selectedIds) {
    const engine = state.campaign.engines[engineId]
    if (!engine) continue
    engine.anchorThreadIds = unionIds(engine.anchorThreadIds, anchorIds)
  }
}

function unionIds(a: Sf2EntityId[], b: Sf2EntityId[]): Sf2EntityId[] {
  return Array.from(new Set([...a, ...b]))
}

