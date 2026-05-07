// Bounded, ref-backed store for diagnostics-only state. Streaming pushes here
// no longer re-render the play shell — only DiagnosticsPanel subscribes.

import { useSyncExternalStore } from 'react'

export const MAX_DEBUG_ENTRIES = 200

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

export interface DebugEntry {
  kind:
    | 'narrate_turn'
    | 'archivist'
    | 'token_usage'
    | 'latency'
    | 'roll'
    | 'truncation'
    | 'error'
    | 'working_set'
    | 'author'
    | 'face_shift'
    | 'ladder_fired'
    | 'pacing_advisory'
    | 'scene_bundle_built'
    | 'sf2.coherence.finding'
    | 'sf2.coherence.clean_turn'
    | 'sf2.invariant'
    | 'display_sentinel'
    | 'narrator_meta_observed'
    | 'narrator_output_recovered'
    | 'experiment'
  at: number
  data: unknown
}

export interface DiagnosticsSnapshot {
  debug: readonly DebugEntry[]
  lastNarratorUsage: TokenUsage | null
  lastArchivistUsage: TokenUsage | null
  exportCopyStatus: string | null
}

const EMPTY_DEBUG: readonly DebugEntry[] = Object.freeze([])

let snapshot: DiagnosticsSnapshot = {
  debug: EMPTY_DEBUG,
  lastNarratorUsage: null,
  lastArchivistUsage: null,
  exportCopyStatus: null,
}

const SERVER_SNAPSHOT: DiagnosticsSnapshot = {
  debug: EMPTY_DEBUG,
  lastNarratorUsage: null,
  lastArchivistUsage: null,
  exportCopyStatus: null,
}

const listeners = new Set<() => void>()

function commit(next: DiagnosticsSnapshot) {
  snapshot = next
  for (const fn of listeners) fn()
}

function appendCapped(prev: readonly DebugEntry[], entries: DebugEntry[]): readonly DebugEntry[] {
  if (entries.length === 0) return prev
  const merged = prev.concat(entries)
  return merged.length > MAX_DEBUG_ENTRIES
    ? merged.slice(merged.length - MAX_DEBUG_ENTRIES)
    : merged
}

export const diagnosticsStore = {
  pushDebug(entry: DebugEntry) {
    commit({ ...snapshot, debug: appendCapped(snapshot.debug, [entry]) })
  },
  pushDebugMany(entries: DebugEntry[]) {
    if (entries.length === 0) return
    commit({ ...snapshot, debug: appendCapped(snapshot.debug, entries) })
  },
  resetDebug() {
    if (snapshot.debug.length === 0) return
    commit({ ...snapshot, debug: EMPTY_DEBUG })
  },
  setNarratorUsage(usage: TokenUsage | null) {
    commit({ ...snapshot, lastNarratorUsage: usage })
  },
  setArchivistUsage(usage: TokenUsage | null) {
    commit({ ...snapshot, lastArchivistUsage: usage })
  },
  setExportCopyStatus(status: string | null) {
    commit({ ...snapshot, exportCopyStatus: status })
  },
  resetAll() {
    commit({
      debug: EMPTY_DEBUG,
      lastNarratorUsage: null,
      lastArchivistUsage: null,
      exportCopyStatus: null,
    })
  },
  getSnapshot(): DiagnosticsSnapshot {
    return snapshot
  },
  getDebug(): readonly DebugEntry[] {
    return snapshot.debug
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

export function useDiagnosticsStore(): DiagnosticsSnapshot {
  return useSyncExternalStore(
    diagnosticsStore.subscribe,
    diagnosticsStore.getSnapshot,
    () => SERVER_SNAPSHOT,
  )
}
