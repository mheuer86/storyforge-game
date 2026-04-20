// ============================================================
// Stage 2 backfill migrator
// ============================================================
//
// Examines an existing game state (schemaVersion < 2) and produces a list of
// proposed actions to backfill hierarchy fields (owner, resolution_criteria,
// failure_mode, relevant_npcs, anchored_to, retrieval_cue) on entities that
// predate those fields. Heuristics are in the design sketch at
// zettel/2026-W17/2604192000.
//
// Two modes:
//  - dry-run: compute actions, log them, leave state unchanged, schemaVersion
//    stays at 1. Safe to run on every load.
//  - write (future, Part C): apply actions, stamp schemaVersion=2, save a
//    pre-migration snapshot for rollback.

import type { GameState, Thread, Decision, Promise, Clue, StoryArc } from '../types'

export type Confidence = 'high' | 'medium' | 'low'
export type EntityKind = 'thread' | 'decision' | 'promise' | 'clue' | 'arc' | 'npc' | 'faction'

export interface MigrationAction {
  kind: EntityKind
  id: string               // entity ID or name
  label: string            // display label (title or name)
  field: string            // target field (e.g. "owner", "retrieval_cue")
  currentValue: string | null
  proposedValue: string | null
  confidence: Confidence
  source: string           // which heuristic produced this
}

export interface MigrationReview {
  kind: EntityKind
  id: string
  label: string
  reason: string           // why manual review is suggested
}

export interface MigrationResult {
  fromVersion: number
  toVersion: number
  actions: MigrationAction[]
  reviews: MigrationReview[]
  stats: {
    entityCount: number
    actionsByKind: Record<string, number>
    actionsByConfidence: Record<Confidence, number>
  }
}

// ── Helpers ──────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'that', 'with', 'from', 'this', 'into', 'have', 'been',
  'they', 'their', 'them', 'what', 'when', 'where', 'which', 'while',
  'your', 'you', 'are', 'was', 'for', 'a', 'an', 'of', 'to', 'in', 'on',
  'by', 'is', 'it', 'as', 'be',
])

function tokens(s: string | undefined | null): Set<string> {
  if (!s) return new Set()
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const intersect = [...a].filter(w => b.has(w)).length
  const union = new Set([...a, ...b]).size
  return intersect / union
}

function firstSentence(s: string | undefined | null, maxLen = 120): string {
  if (!s) return ''
  const trimmed = s.trim()
  const match = trimmed.match(/^[^.!?]+[.!?]/)
  const candidate = match ? match[0].trim() : trimmed
  return candidate.length > maxLen ? candidate.slice(0, maxLen).trimEnd() + '…' : candidate
}

// ── Thread heuristics ────────────────────────────────────────

function backfillThread(thread: Thread & Record<string, unknown>, state: GameState, actions: MigrationAction[], reviews: MigrationReview[]) {
  const label = thread.title
  const titleTokens = tokens(thread.title)
  const statusTokens = tokens(thread.status)
  const npcNames = state.world.npcs.map(n => n.name).filter(n => !!n)
  const factionNames = state.world.factions.map(f => f.name).filter(n => !!n)

  // OWNER
  const currentOwner = typeof thread.owner === 'string' ? thread.owner.trim() : ''
  if (!currentOwner || currentOwner.toLowerCase() === 'unknown') {
    // Try exact NPC/faction name in title or status
    const candidate =
      npcNames.find(n => thread.title.toLowerCase().includes(n.toLowerCase())) ||
      factionNames.find(f => thread.title.toLowerCase().includes(f.toLowerCase())) ||
      npcNames.find(n => thread.status.toLowerCase().includes(n.toLowerCase())) ||
      factionNames.find(f => thread.status.toLowerCase().includes(f.toLowerCase()))
    if (candidate) {
      actions.push({
        kind: 'thread', id: thread.id, label, field: 'owner',
        currentValue: currentOwner || null, proposedValue: candidate,
        confidence: 'high', source: 'name_in_title_or_status',
      })
    } else {
      reviews.push({ kind: 'thread', id: thread.id, label, reason: 'no owner identifiable; title/status has no NPC or faction name' })
    }
  }

  // RESOLUTION_CRITERIA — semantic, punt to review
  if (!(typeof thread.resolution_criteria === 'string' && thread.resolution_criteria.trim().length > 0)) {
    // Try: if status contains "until"/"before"/"unless", take clause
    const match = thread.status.match(/\b(until|before|unless)\b\s+(.+?)(?:\.|$)/i)
    if (match) {
      actions.push({
        kind: 'thread', id: thread.id, label, field: 'resolution_criteria',
        currentValue: null, proposedValue: match[0].trim(),
        confidence: 'medium', source: 'until/before/unless_clause',
      })
    } else {
      reviews.push({ kind: 'thread', id: thread.id, label, reason: 'resolution_criteria is semantic, cannot backfill deterministically' })
    }
  }

  // FAILURE_MODE — semantic, punt to review
  if (!(typeof thread.failure_mode === 'string' && thread.failure_mode.trim().length > 0)) {
    reviews.push({ kind: 'thread', id: thread.id, label, reason: 'failure_mode is semantic, cannot backfill deterministically' })
  }

  // RELEVANT_NPCS — scan decisions/clues/promises that reference this thread by id or title
  if (!Array.isArray(thread.relevant_npcs) || thread.relevant_npcs.length === 0) {
    const referencing = new Set<string>()
    for (const d of state.world.decisions ?? []) {
      const text = `${d.summary} ${d.context}`.toLowerCase()
      if (text.includes(thread.title.toLowerCase()) || text.includes(thread.id.toLowerCase())) {
        for (const n of npcNames) if (text.includes(n.toLowerCase())) referencing.add(n)
      }
    }
    for (const p of state.world.promises ?? []) {
      if (p.what.toLowerCase().includes(thread.title.toLowerCase())) {
        if (npcNames.includes(p.to)) referencing.add(p.to)
      }
    }
    if (referencing.size > 0) {
      actions.push({
        kind: 'thread', id: thread.id, label, field: 'relevant_npcs',
        currentValue: null, proposedValue: [...referencing].join(', '),
        confidence: 'medium', source: 'scanned_decisions_promises',
      })
    }
  }

  // RETRIEVAL_CUE — NOT backfilled for existing entities. Deterministic text
  // extraction can't infer salience ("when does this matter?") — only state
  // descriptions. The dry-run showed that heuristic cues like "Active —
  // partial name surfaced from torn address book" are status dumps, not
  // salience pointers. Better to leave old entities cue-less and let future
  // retrieval fall back to name/description when cue is absent. New entities
  // created after Part A's prompt updates get real cues from the GM.
  void thread.retrieval_cue; void titleTokens; void statusTokens
}

// ── Decision heuristics ─────────────────────────────────────

function backfillDecision(decision: Decision & Record<string, unknown>, state: GameState, actions: MigrationAction[], reviews: MigrationReview[]) {
  const label = decision.summary || decision.id
  const bag = tokens(`${decision.summary} ${decision.context}`)

  // ANCHORED_TO — keyword overlap with active threads
  if (!Array.isArray(decision.anchored_to) || decision.anchored_to.length === 0) {
    const scored: { id: string; score: number }[] = []
    for (const t of state.world.threads ?? []) {
      const tTokens = tokens(`${t.title} ${t.status}`)
      const sim = jaccard(bag, tTokens)
      if (sim >= 0.15) scored.push({ id: t.id, score: sim })
    }
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 3)
    if (top.length > 0) {
      actions.push({
        kind: 'decision', id: decision.id, label, field: 'anchored_to',
        currentValue: null, proposedValue: top.map(t => t.id).join(', '),
        confidence: top[0].score >= 0.3 ? 'medium' : 'low',
        source: `jaccard_top${top.length}_≥${top[top.length - 1].score.toFixed(2)}`,
      })
    } else {
      reviews.push({ kind: 'decision', id: decision.id, label, reason: 'no thread keyword overlap ≥0.15' })
    }
  }

  // RETRIEVAL_CUE — not backfilled (see note on backfillThread).
  void decision.retrieval_cue
}

// ── Promise heuristics ──────────────────────────────────────

function backfillPromise(promise: Promise & Record<string, unknown>, state: GameState, actions: MigrationAction[], reviews: MigrationReview[]) {
  const label = promise.what || promise.id

  // ANCHORED_TO — find threads where recipient is involved (owner or relevant NPC)
  if (!Array.isArray(promise.anchored_to) || promise.anchored_to.length === 0) {
    const relevant = (state.world.threads ?? []).filter(t => {
      const thread = t as Thread & Record<string, unknown>
      const owner = typeof thread.owner === 'string' ? thread.owner : ''
      const relNpcs = Array.isArray(thread.relevant_npcs) ? thread.relevant_npcs as string[] : []
      return owner === promise.to || relNpcs.includes(promise.to) ||
             thread.title.toLowerCase().includes(promise.to.toLowerCase())
    })
    if (relevant.length === 1) {
      actions.push({
        kind: 'promise', id: promise.id, label, field: 'anchored_to',
        currentValue: null, proposedValue: relevant[0].id,
        confidence: 'high', source: 'single_thread_via_recipient',
      })
    } else if (relevant.length > 1) {
      // Score by what-text overlap with thread title
      const whatTokens = tokens(promise.what)
      const scored = relevant.map(t => ({ id: t.id, score: jaccard(whatTokens, tokens(t.title)) }))
      scored.sort((a, b) => b.score - a.score)
      actions.push({
        kind: 'promise', id: promise.id, label, field: 'anchored_to',
        currentValue: null, proposedValue: scored.slice(0, 2).map(t => t.id).join(', '),
        confidence: 'medium', source: 'multi_thread_via_recipient+what_match',
      })
    } else {
      reviews.push({ kind: 'promise', id: promise.id, label, reason: `recipient "${promise.to}" not associated with any thread` })
    }
  }

  // RETRIEVAL_CUE — not backfilled (see note on backfillThread).
  void promise.retrieval_cue
}

// ── Clue heuristics ─────────────────────────────────────────

function backfillClue(clue: Clue & Record<string, unknown>, state: GameState, actions: MigrationAction[], reviews: MigrationReview[]) {
  const label = clue.title || clue.content.slice(0, 60)

  // ANCHORED_TO — from thread_title if set, or tag overlap
  if (!Array.isArray(clue.anchored_to) || clue.anchored_to.length === 0) {
    // Check if there's an explicit thread_title field (Stage 1 optional)
    const threadTitle = typeof clue.thread_title === 'string' ? clue.thread_title : ''
    if (threadTitle) {
      const match = (state.world.threads ?? []).find(t => t.title.toLowerCase() === threadTitle.toLowerCase())
      if (match) {
        actions.push({
          kind: 'clue', id: clue.id, label, field: 'anchored_to',
          currentValue: null, proposedValue: match.id,
          confidence: 'high', source: 'clue.thread_title_match',
        })
        return
      }
    }
    // Tag overlap with thread title/status
    const tagsBag = new Set((clue.tags ?? []).flatMap((t: string) => [...tokens(t)]))
    const scored: { id: string; score: number }[] = []
    for (const t of state.world.threads ?? []) {
      const threadBag = tokens(`${t.title} ${t.status}`)
      const sim = jaccard(tagsBag, threadBag)
      if (sim >= 0.2) scored.push({ id: t.id, score: sim })
    }
    scored.sort((a, b) => b.score - a.score)
    if (scored.length > 0) {
      actions.push({
        kind: 'clue', id: clue.id, label, field: 'anchored_to',
        currentValue: null, proposedValue: scored.slice(0, 2).map(s => s.id).join(', '),
        confidence: 'medium', source: 'tag_jaccard',
      })
    }
    // No review flag: floating clues are acceptable.
  }

  // RETRIEVAL_CUE — not backfilled (see note on backfillThread).
  void clue.retrieval_cue
}

// ── Arc heuristics ──────────────────────────────────────────

function backfillArc(arc: StoryArc & Record<string, unknown>, _state: GameState, _actions: MigrationAction[], _reviews: MigrationReview[]) {
  // SPANS_CHAPTERS — skipped. Migration runs on saves where most arcs have
  // episodes from only the current chapter; deriving spans from episode
  // chapters at migration time always under-counts. The arc was created with
  // a declared spans_chapters (the create_arc schema requires ≥3); trust it.
  void arc.spans_chapters

  // STAKES_DEFINITION — grandfathered. Old arcs predate the validator and are
  // legitimate narrative state; forcing fixes would cost the player rewrites.
  // New arcs are already validator-gated on stakes_definition at create time.
  void arc.stakesDefinition

  // RETRIEVAL_CUE — not backfilled (see note on backfillThread). Semantic
  // salience requires LLM judgment; template cues add noise without value.
  void arc.retrieval_cue
}

// NPC and Faction retrieval_cue backfill removed — see note on backfillThread
// for the rationale. Template-generated cues produce noise, not salience.

// ── Main entry ──────────────────────────────────────────────

export interface MigrationOptions {
  dryRun: boolean
}

export function runStage2Migration(state: GameState, options: MigrationOptions): MigrationResult {
  const currentVersion = state.meta.schemaVersion ?? 1
  const targetVersion = 2

  const actions: MigrationAction[] = []
  const reviews: MigrationReview[] = []

  // Iterate entities. NPCs and factions no longer need per-entity migration
  // (retrieval_cue backfill was removed); they'll get cues from the GM on
  // future updates where applicable.
  for (const t of state.world.threads ?? []) backfillThread(t as Thread & Record<string, unknown>, state, actions, reviews)
  for (const d of state.world.decisions ?? []) backfillDecision(d as Decision & Record<string, unknown>, state, actions, reviews)
  for (const p of state.world.promises ?? []) backfillPromise(p as Promise & Record<string, unknown>, state, actions, reviews)
  for (const c of state.world.notebook?.clues ?? []) backfillClue(c as Clue & Record<string, unknown>, state, actions, reviews)
  for (const a of state.arcs ?? []) backfillArc(a as StoryArc & Record<string, unknown>, state, actions, reviews)

  // Stats
  const entityCount =
    (state.world.threads?.length ?? 0) +
    (state.world.decisions?.length ?? 0) +
    (state.world.promises?.length ?? 0) +
    (state.world.notebook?.clues?.length ?? 0) +
    (state.arcs?.length ?? 0) +
    (state.world.npcs?.length ?? 0) +
    (state.world.factions?.length ?? 0)

  const actionsByKind: Record<string, number> = {}
  const actionsByConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 }
  for (const a of actions) {
    actionsByKind[a.kind] = (actionsByKind[a.kind] ?? 0) + 1
    actionsByConfidence[a.confidence]++
  }

  return {
    fromVersion: currentVersion,
    toVersion: options.dryRun ? currentVersion : targetVersion,
    actions,
    reviews,
    stats: { entityCount, actionsByKind, actionsByConfidence },
  }
}

// ── Apply migration actions to a state clone ────────────────
//
// Mutates a deep clone of state, applies each action to the matching entity,
// bumps schemaVersion to the target. Returns the migrated state.
// Low- and medium-confidence actions are applied; the dry-run output has
// already been tuned so only high-signal actions survive (post-Part-B tweaks).

export function applyMigrationActions(state: GameState, result: MigrationResult): GameState {
  // JSON-clone is safe here: GameState is POJOs (no Dates, no Sets, no cycles)
  const next = JSON.parse(JSON.stringify(state)) as GameState

  const parseArray = (s: string | null): string[] =>
    typeof s === 'string' && s.length > 0 ? s.split(',').map(x => x.trim()).filter(Boolean) : []

  for (const a of result.actions) {
    if (a.proposedValue == null) continue
    switch (a.kind) {
      case 'thread': {
        const t = (next.world.threads ?? []).find(x => x.id === a.id) as (Thread & Record<string, unknown>) | undefined
        if (!t) break
        if (a.field === 'owner') t.owner = a.proposedValue
        else if (a.field === 'resolution_criteria') t.resolution_criteria = a.proposedValue
        else if (a.field === 'failure_mode') t.failure_mode = a.proposedValue
        else if (a.field === 'relevant_npcs') t.relevant_npcs = parseArray(a.proposedValue)
        break
      }
      case 'decision': {
        const d = (next.world.decisions ?? []).find(x => x.id === a.id) as (Decision & Record<string, unknown>) | undefined
        if (!d) break
        if (a.field === 'anchored_to') d.anchored_to = parseArray(a.proposedValue)
        break
      }
      case 'promise': {
        const p = (next.world.promises ?? []).find(x => x.id === a.id) as (Promise & Record<string, unknown>) | undefined
        if (!p) break
        if (a.field === 'anchored_to') p.anchored_to = parseArray(a.proposedValue)
        break
      }
      case 'clue': {
        const c = (next.world.notebook?.clues ?? []).find(x => x.id === a.id) as (Clue & Record<string, unknown>) | undefined
        if (!c) break
        if (a.field === 'anchored_to') c.anchored_to = parseArray(a.proposedValue)
        break
      }
      // arc/npc/faction have no applyable fields post-tweaks
    }
  }

  next.meta.schemaVersion = result.toVersion
  return next
}

// ── Console-friendly formatter for dry-run output ───────────

export function formatMigrationReport(result: MigrationResult): string {
  const lines: string[] = []
  lines.push(`[STAGE2_MIGRATION] dry-run report: from=v${result.fromVersion} to=v${result.toVersion}`)
  lines.push(`[STAGE2_MIGRATION] entities=${result.stats.entityCount} actions=${result.actions.length} reviews=${result.reviews.length}`)
  lines.push(`[STAGE2_MIGRATION] by_kind: ${Object.entries(result.stats.actionsByKind).map(([k, v]) => `${k}=${v}`).join(' ')}`)
  lines.push(`[STAGE2_MIGRATION] by_confidence: high=${result.stats.actionsByConfidence.high} medium=${result.stats.actionsByConfidence.medium} low=${result.stats.actionsByConfidence.low}`)
  if (result.actions.length > 0) {
    lines.push(`[STAGE2_MIGRATION] --- actions ---`)
    for (const a of result.actions.slice(0, 50)) {
      lines.push(`  [${a.confidence}] ${a.kind}:${a.id} (${a.label.slice(0, 40)}) ${a.field} := "${String(a.proposedValue).slice(0, 80)}" [${a.source}]`)
    }
    if (result.actions.length > 50) lines.push(`  ... and ${result.actions.length - 50} more`)
  }
  if (result.reviews.length > 0) {
    lines.push(`[STAGE2_MIGRATION] --- reviews needed ---`)
    for (const r of result.reviews.slice(0, 20)) {
      lines.push(`  ${r.kind}:${r.id} (${r.label.slice(0, 40)}) — ${r.reason}`)
    }
    if (result.reviews.length > 20) lines.push(`  ... and ${result.reviews.length - 20} more`)
  }
  return lines.join('\n')
}
