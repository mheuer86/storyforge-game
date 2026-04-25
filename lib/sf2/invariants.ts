// Write-time invariants. Reject with the failing field named.
// These run before any state mutation lands in Sf2State.

import type {
  Sf2Arc,
  Sf2Campaign,
  Sf2Clue,
  Sf2Decision,
  Sf2Faction,
  Sf2Npc,
  Sf2Promise,
  Sf2TemporalAnchor,
  Sf2Thread,
} from './types'

export type InvariantResult =
  | { ok: true }
  | { ok: false; field: string; reason: string }

export function checkThread(thread: Sf2Thread, campaign: Sf2Campaign): InvariantResult {
  if (!thread.owner || !thread.owner.id) {
    return { ok: false, field: 'owner', reason: 'thread must have non-empty owner' }
  }
  const ownerExists =
    thread.owner.kind === 'npc'
      ? Boolean(campaign.npcs[thread.owner.id])
      : Boolean(campaign.factions[thread.owner.id])
  if (!ownerExists) {
    return { ok: false, field: 'owner.id', reason: `owner ${thread.owner.kind} ${thread.owner.id} not in registry` }
  }
  if (!thread.resolutionCriteria?.trim()) {
    return { ok: false, field: 'resolutionCriteria', reason: 'required' }
  }
  if (!thread.failureMode?.trim()) {
    return { ok: false, field: 'failureMode', reason: 'required' }
  }
  if (thread.tension < 0 || thread.tension > 10) {
    return { ok: false, field: 'tension', reason: 'must be 0-10' }
  }
  return { ok: true }
}

export function checkDecision(decision: Sf2Decision, campaign: Sf2Campaign): InvariantResult {
  if (!decision.anchoredTo || decision.anchoredTo.length === 0) {
    return { ok: false, field: 'anchoredTo', reason: 'decisions require at least one anchor thread' }
  }
  for (const tid of decision.anchoredTo) {
    if (!campaign.threads[tid]) {
      return { ok: false, field: 'anchoredTo', reason: `thread ${tid} not in registry` }
    }
  }
  return { ok: true }
}

export function checkPromise(promise: Sf2Promise, campaign: Sf2Campaign): InvariantResult {
  if (!promise.anchoredTo || promise.anchoredTo.length === 0) {
    return { ok: false, field: 'anchoredTo', reason: 'promises require at least one anchor thread' }
  }
  for (const tid of promise.anchoredTo) {
    if (!campaign.threads[tid]) {
      return { ok: false, field: 'anchoredTo', reason: `thread ${tid} not in registry` }
    }
  }
  if (!promise.owner || !promise.owner.id) {
    return { ok: false, field: 'owner', reason: 'promise must have a recipient owner' }
  }
  const ownerExists =
    promise.owner.kind === 'npc'
      ? Boolean(campaign.npcs[promise.owner.id])
      : Boolean(campaign.factions[promise.owner.id])
  if (!ownerExists) {
    return { ok: false, field: 'owner.id', reason: `promise recipient ${promise.owner.id} not in registry` }
  }
  return { ok: true }
}

export function checkClue(clue: Sf2Clue, campaign: Sf2Campaign): InvariantResult {
  // Clues MAY have empty anchoredTo (floating). Validate referenced threads when present.
  for (const tid of clue.anchoredTo ?? []) {
    if (!campaign.threads[tid]) {
      return { ok: false, field: 'anchoredTo', reason: `thread ${tid} not in registry` }
    }
  }
  if (clue.status === 'attached' && clue.anchoredTo.length === 0) {
    return { ok: false, field: 'status', reason: 'attached clue must have at least one anchor' }
  }
  return { ok: true }
}

export function checkTemporalAnchor(anchor: Sf2TemporalAnchor, campaign: Sf2Campaign): InvariantResult {
  if (!anchor.title?.trim()) {
    return { ok: false, field: 'title', reason: 'temporal anchor must have a title' }
  }
  if (!anchor.label?.trim()) {
    return { ok: false, field: 'label', reason: 'temporal anchor must have a label' }
  }
  if (!anchor.anchorText?.trim()) {
    return { ok: false, field: 'anchorText', reason: 'temporal anchor must have anchor text' }
  }
  for (const id of anchor.anchoredTo ?? []) {
    if (
      !campaign.threads[id] &&
      !campaign.decisions[id] &&
      !campaign.promises[id] &&
      !campaign.clues[id] &&
      !campaign.npcs[id] &&
      !campaign.factions[id]
    ) {
      return { ok: false, field: 'anchoredTo', reason: `anchor target ${id} not in registry` }
    }
  }
  return { ok: true }
}

export function checkArc(arc: Sf2Arc, campaign: Sf2Campaign): InvariantResult {
  if (!arc.threadIds || arc.threadIds.length < 2) {
    return { ok: false, field: 'threadIds', reason: 'arc requires ≥2 threads' }
  }
  for (const tid of arc.threadIds) {
    if (!campaign.threads[tid]) {
      return { ok: false, field: 'threadIds', reason: `thread ${tid} not in registry` }
    }
  }
  if (arc.spansChapters < 3) {
    return { ok: false, field: 'spansChapters', reason: 'arcs must span ≥3 chapters' }
  }
  if (arc.noSingleResolvingAction !== true) {
    return {
      ok: false,
      field: 'noSingleResolvingAction',
      reason: 'arcs must not be resolvable in a single action',
    }
  }
  if (!arc.stakesDefinition?.trim()) {
    return { ok: false, field: 'stakesDefinition', reason: 'arcs must define stakes' }
  }
  // Resolution-dependency check is advisory (semantic): threadIds must share a resolution
  // dependency. This is enforced structurally via the spans+no-single-action gates;
  // caller should verify semantic dependency at creation time.
  return { ok: true }
}

export function checkNpcIdentity(npc: Sf2Npc, prior?: Sf2Npc): InvariantResult {
  if (!npc.name?.trim()) {
    return { ok: false, field: 'name', reason: 'npc must have a name' }
  }
  const normalizedName = npc.name.trim().toLowerCase()
  if (normalizedName === 'girl' || normalizedName === 'boy') {
    return { ok: false, field: 'name', reason: 'npc name must not be a generic child descriptor' }
  }
  if (!Array.isArray(npc.identity.keyFacts) || npc.identity.keyFacts.length > 3) {
    return {
      ok: false,
      field: 'identity.keyFacts',
      reason: 'keyFacts must be an array of at most 3 immutable facts',
    }
  }
  if (prior) {
    if (prior.name !== npc.name) {
      return {
        ok: false,
        field: 'name',
        reason: `npc name is protected: ${prior.name} → ${npc.name} not allowed`,
      }
    }
    if (!arraysEqual(prior.identity.keyFacts, npc.identity.keyFacts)) {
      return { ok: false, field: 'identity.keyFacts', reason: 'keyFacts are immutable after creation' }
    }
    if (prior.identity.pronoun && npc.identity.pronoun !== prior.identity.pronoun) {
      return {
        ok: false,
        field: 'identity.pronoun',
        reason: `pronoun is protected: ${prior.identity.pronoun} → ${npc.identity.pronoun ?? 'unset'} not allowed`,
      }
    }
    if (prior.identity.age && npc.identity.age !== prior.identity.age) {
      return {
        ok: false,
        field: 'identity.age',
        reason: `age is protected: ${prior.identity.age} → ${npc.identity.age ?? 'unset'} not allowed`,
      }
    }
    // Status transitions: alive → dead | gone allowed; dead → * blocked
    if (prior.status === 'dead' && npc.status !== 'dead') {
      return { ok: false, field: 'status', reason: 'dead NPCs cannot un-die' }
    }
  }
  return { ok: true }
}

export function checkFaction(faction: Sf2Faction): InvariantResult {
  if (!faction.name?.trim()) {
    return { ok: false, field: 'name', reason: 'faction must have a name' }
  }
  return { ok: true }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
