// Disposition derivation — given a (PC, NPC) role/affiliation pair, what's the
// expected disposition range? Used by the Author validator to catch rule-8
// violations programmatically. Per the playbook-fit zettel, derivation is
// per-genre; only Hegemony (epic-scifi) is encoded for V2 validation. Other
// genres return null (no constraint) until rules are added.
//
// The Author may still override the expected range when there's authorial
// reason — captured by `disposition_reason` on the starting_npc. Validator
// allows override when the reason is non-trivial (≥5 words). Empty-or-trivial
// reason + outside-range disposition is the actual violation we catch.
//
// Source: rule 8 from `lib/sf2/author/prompt.ts`. The text rule and the
// programmatic check should agree; the programmatic check is the load-bearing
// enforcement after [[Storyforge V2 Playthrough 7 Findings]] showed the prompt
// rule alone is not enough.

export type Sf2Disposition = 'hostile' | 'wary' | 'neutral' | 'favorable' | 'trusted'

export interface DispositionRange {
  expected: Sf2Disposition[]
  reason: string  // human-readable explanation for error messages
}

export interface DispositionDerivationContext {
  genreId: string
  pcOriginId: string  // 'imperial-service', 'synod', 'minor-house', 'undrift', 'spent-resonant'
  pcPlaybookId: string  // 'warden', 'crusader', etc.
}

export interface NpcRoleAffiliation {
  role: string
  affiliation: string
}

export function deriveDispositionDefault(
  ctx: DispositionDerivationContext,
  npc: NpcRoleAffiliation
): DispositionRange | null {
  if (ctx.genreId === 'epic-scifi' || ctx.genreId === 'hegemony') {
    return deriveHegemonyDefault(ctx, npc)
  }
  return null
}

function deriveHegemonyDefault(
  ctx: DispositionDerivationContext,
  npc: NpcRoleAffiliation
): DispositionRange | null {
  const aff = npc.affiliation.toLowerCase()
  const role = npc.role.toLowerCase()

  // 1. Sworn to PC personally — retainers, household, sworn aides.
  if (
    /\b(pc'?s|warden'?s|crusader'?s|seeker'?s|player'?s)\b/.test(aff) ||
    /\b(retainer|sworn|household|personal aide)\b/.test(role)
  ) {
    return {
      expected: ['favorable', 'trusted'],
      reason: 'sworn/retainer of the PC personally — should be favorable or trusted',
    }
  }

  // 2. Same starting-faction → favorable / trusted (caps below)
  const sameFaction =
    (ctx.pcOriginId === 'imperial-service' && /\bimperial\b/.test(aff)) ||
    (ctx.pcOriginId === 'synod' && /\bsynod\b/.test(aff)) ||
    (ctx.pcOriginId === 'minor-house' && /\bhouse\b/.test(aff)) ||
    (ctx.pcOriginId === 'undrift' && /\bundrift\b/.test(aff))
  if (sameFaction) {
    return {
      expected: ['neutral', 'favorable', 'trusted'],
      reason: 'shared faction with PC — should be neutral / favorable / trusted',
    }
  }

  // 3. Settlement leadership / frontier civilian leadership facing institutional
  //    enforcer PC (Warden, Crusader, Sworn-Blade) — should be wary or hostile.
  const isEnforcerPc =
    ctx.pcPlaybookId === 'warden' ||
    ctx.pcPlaybookId === 'crusader' ||
    ctx.pcPlaybookId === 'sworn-blade'
  const isSettlementLeader =
    /\b(settlement|frontier|village)\b/.test(aff) &&
    /\b(elder|chief|council|leadership|leader)\b/.test(role)
  if (isEnforcerPc && isSettlementLeader) {
    return {
      expected: ['hostile', 'wary'],
      reason: 'settlement leadership facing an institutional enforcer PC — should be wary or hostile (the system is taking again)',
    }
  }

  // 4. Synod official facing Imperial Service PC (or vice versa) — institutional
  //    rivalry within the system. Procedural antagonist face = neutral, not
  //    favorable.
  const synodVsImperial =
    (ctx.pcOriginId === 'imperial-service' && /\bsynod\b/.test(aff)) ||
    (ctx.pcOriginId === 'synod' && /\bimperial\b/.test(aff))
  if (synodVsImperial) {
    return {
      expected: ['wary', 'neutral'],
      reason: 'cross-institutional rivalry (Synod ↔ Imperial Service) — should be wary or neutral, not favorable',
    }
  }

  // 5. Family / direct relative of someone harmed by the chapter's pressure
  //    (e.g., dead Resonant, taken child). Civilians at the receiving end of
  //    the audit = wary.
  const isAffectedCivilian =
    /\b(family|relative|parent|sibling|child of|miner|laborer)\b/.test(role) &&
    /\b(dead|missing|taken|expended|loss)\b/.test(role)
  if (isAffectedCivilian && isEnforcerPc) {
    return {
      expected: ['hostile', 'wary'],
      reason: 'civilian directly harmed by the chapter pressure facing an institutional enforcer PC',
    }
  }

  // 6. Undrift vs Imperial / Synod — life-threatening adversarial relationship.
  //    The Empire/Synod hunts the Undrift; Undrift NPCs face an Imperial-aligned
  //    PC as an existential threat, not a procedural counterpart. Per Hegemony
  //    lore (epic-scifi.ts undrift species block): "every institution in the
  //    Hegemony wants to own, use, or destroy you." Cannot be neutral toward
  //    the system that is trying to destroy you.
  const undriftVsSystem =
    /\bundrift\b/.test(aff) &&
    (ctx.pcOriginId === 'imperial-service' || ctx.pcOriginId === 'synod')
  if (undriftVsSystem) {
    return {
      expected: ['hostile', 'wary'],
      reason: 'Undrift NPC facing institutional system PC — the Empire/Synod is life-threatening for the Undrift; cannot be neutral or favorable',
    }
  }

  // No rule matched — no constraint, Author may pick any disposition.
  return null
}

// Validator helper: check a single NPC's disposition against the derivation.
// Returns null if accepted, or an error string if rejected. The Author's
// `disposition_reason` may override an outside-range pick if it's non-trivial.
export function validateNpcDisposition(
  ctx: DispositionDerivationContext,
  npc: { role: string; affiliation: string; initialDisposition: string; dispositionReason?: string },
  ref: string  // path-like reference for error messages, e.g. 'starting_npcs[2]'
): string | null {
  const range = deriveDispositionDefault(ctx, { role: npc.role, affiliation: npc.affiliation })
  if (!range) return null

  const got = npc.initialDisposition as Sf2Disposition
  if (range.expected.includes(got)) return null

  // Author wrote outside the range. Allow if disposition_reason is substantive
  // (5+ words signals the Author considered the override deliberately).
  const reasonWords = (npc.dispositionReason ?? '').trim().split(/\s+/).filter(Boolean).length
  if (reasonWords >= 5) return null

  return `${ref}.initial_disposition: ${range.reason}; got "${got}" with no override reason`
}
