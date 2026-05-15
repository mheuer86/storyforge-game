import type { Sf2State } from '../types'
import {
  applySceneSnapshotMechanicalEffect,
  applySetLocationMechanicalEffect,
} from '../scene-snapshot/reducer'

export interface Sf2ReplayInvariantEvent {
  kind: 'sf2.invariant'
  at: number
  data: { type: string } & Record<string, unknown>
}

type InvariantSink = Array<{ kind: string; at: number; data: unknown }>

export function makeInvariantEvent(
  type: string,
  data: Record<string, unknown>
): Sf2ReplayInvariantEvent {
  return { kind: 'sf2.invariant', at: Date.now(), data: { type, ...data } }
}

export function offstageRosterSignature(state: Sf2State): string {
  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  return Object.values(state.campaign.npcs)
    .filter((npc) => !present.has(npc.id))
    .filter((npc) => npc.status === 'alive' || npc.status === 'unknown')
    .map((npc) => [
      npc.id,
      npc.status,
      npc.affiliation,
      npc.role,
      npc.retrievalCue,
      state.chapter.setup.startingNpcIds.includes(npc.id) ? 'starting' : '',
    ].join(':'))
    .sort()
    .join('|')
}

export function applyMechanicalEffectLocally(
  state: Sf2State,
  m: Record<string, unknown>,
  invariantEvents?: InvariantSink
): void {
  const kind = String(m.kind)
  if (kind === 'hp_delta') {
    const v = Number(m.value ?? 0)
    state.player.hp.current = Math.max(0, Math.min(state.player.hp.max, state.player.hp.current + v))
  } else if (kind === 'credits_delta') {
    const reason = String(m.reason ?? '')
    const value = Number(m.value ?? 0)
    if (looksLikeObligationBalanceDelta(reason)) {
      emitMechanicalNoOp(invariantEvents, {
        kind,
        reason: 'credits_delta cannot represent obligation balance',
        attemptedValue: value,
      })
      return
    }
    state.player.credits = Math.max(0, state.player.credits + value)
  } else if (kind === 'inventory_use') {
    const itemName = String(m.item ?? '')
    const item = state.player.inventory.find((it) => it.name === itemName)
    if (item && item.qty > 0) {
      item.qty -= 1
    } else {
      emitMechanicalNoOp(invariantEvents, {
        kind,
        reason: 'inventory item unavailable',
        item: itemName,
      })
    }
  } else if (kind === 'set_scene_snapshot') {
    applySceneSnapshotMechanicalEffect(state, m, {
      invariantEvents,
      source: { sourceActor: 'narrator', sourceKind: kind },
    })
  } else if (kind === 'set_location') {
    applySetLocationMechanicalEffect(state, m, {
      invariantEvents,
      source: { sourceActor: 'narrator', sourceKind: kind },
    })
  } else if (kind === 'scene_end') {
    const summary = {
      sceneId: state.world.sceneSnapshot.sceneId,
      chapter: state.meta.currentChapter,
      summary: String(m.summary ?? ''),
      leadsTo: (m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise' | 'null') === 'null'
        ? null
        : ((m.leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise') ?? null),
    }
    const existing = state.chapter.sceneSummaries.find(
      (s) => s.chapter === summary.chapter && s.sceneId === summary.sceneId
    )
    if (existing) {
      if (!existing.summary && summary.summary) existing.summary = summary.summary
      if (!existing.leadsTo && summary.leadsTo) existing.leadsTo = summary.leadsTo
    } else {
      state.chapter.sceneSummaries.push(summary)
    }
    state.world.sceneBundleCache = undefined
  } else {
    emitMechanicalNoOp(invariantEvents, {
      kind,
      reason: 'unknown mechanical effect kind',
    })
  }
}

function looksLikeObligationBalanceDelta(reason: string): boolean {
  return /\b(lien|debt|owed|obligation|tithe|ransom|bounty|retainer|balance|service contract|blood price)\b/i.test(reason) &&
    /\b(balance|increas(?:e|es|ed)|decreas(?:e|es|ed)|doubles?|doubled|owed|stands against)\b/i.test(reason)
}

function emitMechanicalNoOp(
  invariantEvents: InvariantSink | undefined,
  data: Record<string, unknown>
): void {
  invariantEvents?.push(makeInvariantEvent('mechanical_effect_no_op', {
    detail: String(data.reason ?? 'mechanical effect no-op'),
    ...data,
  }))
}
