// Format low-confidence Archivist writes as short narrator-facing recovery
// notes. These get stashed on state.campaign.pendingRecoveryNotes and surfaced
// on the NEXT Narrator turn as "re-establish if still relevant" cues.
//
// Keep each note one line, concrete enough for the Narrator to decide whether
// to re-surface the fact in prose. The prior turn's prose produced these, so
// the Narrator should recognize them.

import type { DeferredWrite } from './apply-patch'

export function formatDeferredWrites(writes: DeferredWrite[]): string[] {
  return writes
    .map((w) => {
      const payload = w.payload as Record<string, unknown> | undefined
      switch (w.kind) {
        case 'create': {
          const kind = (payload?.kind as string) ?? 'entity'
          const inner = payload?.payload as Record<string, unknown> | undefined
          const hint =
            (inner?.title as string) ||
            (inner?.name as string) ||
            (inner?.summary as string) ||
            (inner?.obligation as string) ||
            (inner?.content as string) ||
            '(unnamed)'
          return `create ${kind}: "${truncate(hint, 100)}" — ${w.reason}`
        }
        case 'update': {
          const entityKind = (payload?.entity_kind as string) ?? 'entity'
          const entityId = (payload?.entity_id as string) ?? '(unknown)'
          return `update ${entityKind} ${entityId} — ${w.reason}`
        }
        case 'transition': {
          const entityKind = (payload?.entity_kind as string) ?? 'entity'
          const entityId = (payload?.entity_id as string) ?? '(unknown)'
          const toStatus = (payload?.to_status as string) ?? '(status)'
          return `transition ${entityKind} ${entityId} → ${toStatus} — ${w.reason}`
        }
        case 'attachment': {
          const kind = (payload?.kind as string) ?? 'anchor'
          const entityId = (payload?.entity_id as string) ?? '(unknown)'
          return `${kind} ${entityId} — ${w.reason}`
        }
        default:
          return `deferred write — ${w.reason}`
      }
    })
    .filter((s) => s.length > 0)
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
