// Group A: required fields at creation.
// All rules return severity='block' when the write would be rejected under enforce mode,
// or 'warn' when the write passes but is flagged (e.g. floating clues).

import type { FirewallRule } from '../../firewall'
import type { FirewallResult, GameState } from '../../types'

const nonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

const nonEmptyArray = (v: unknown): v is unknown[] =>
  Array.isArray(v) && v.length > 0

const suggestion: Record<string, string> = {
  thread_missing_owner: "Name the NPC or faction driving this tension — 'unknown' is not a valid owner",
  thread_missing_resolution_criteria: "Specify what action or event would resolve this thread",
  thread_missing_failure_mode: "Describe what happens if this thread is ignored or left to deteriorate",
  decision_missing_summary: "Describe the choice the PC made in 1-2 short sentences",
  decision_missing_anchor: "Attach this decision to the thread(s) or arc(s) it constrains via anchored_to",
  decision_missing_category: "Set decision_category to one of: moral, tactical, strategic, relational",
  promise_missing_owner: "Specify the recipient of the promise via `to`",
  promise_missing_what: "Describe what was committed to",
  promise_missing_anchor: "Anchor the promise to the thread(s) or arc(s) it locks into shape",
  clue_missing_content: "Provide the factual content the PC now knows",
  clue_missing_source: "Name the person, document, or observation this clue came from",
  clue_floating: "Floating clue — attach to a thread via anchored_to once the connection is known",
  arc_too_few_threads: "Arcs require ≥2 threads. Use a single thread rather than a thin arc",
  arc_stakes_duplicates_title: "stakes_definition must distinguish itself from title — describe what this says about the character's stance",
  arc_over_active_cap: "Active arc cap of 5 reached — resolve or abandon an existing arc before creating another",
}

// ── thread_create ────────────────────────────────────────────

const threadMissingOwner: FirewallRule = {
  id: 'thread_missing_owner',
  appliesTo: (w) => w.type === 'thread_create',
  check: (w): FirewallResult | null => {
    const t = w.input as Record<string, unknown>
    const owner = typeof t.owner === 'string' ? t.owner.trim().toLowerCase() : ''
    if (owner && owner !== 'unknown') return null
    return {
      ruleId: 'thread_missing_owner',
      severity: 'block',
      rejectedField: 'owner',
      suggestion: suggestion.thread_missing_owner,
      payloadExcerpt: t,
    }
  },
}

const threadMissingResolution: FirewallRule = {
  id: 'thread_missing_resolution_criteria',
  appliesTo: (w) => w.type === 'thread_create',
  check: (w): FirewallResult | null => {
    const t = w.input as Record<string, unknown>
    if (nonEmptyString(t.resolution_criteria)) return null
    return {
      ruleId: 'thread_missing_resolution_criteria',
      severity: 'block',
      rejectedField: 'resolution_criteria',
      suggestion: suggestion.thread_missing_resolution_criteria,
      payloadExcerpt: t,
    }
  },
}

const threadMissingFailure: FirewallRule = {
  id: 'thread_missing_failure_mode',
  appliesTo: (w) => w.type === 'thread_create',
  check: (w): FirewallResult | null => {
    const t = w.input as Record<string, unknown>
    if (nonEmptyString(t.failure_mode)) return null
    return {
      ruleId: 'thread_missing_failure_mode',
      severity: 'block',
      rejectedField: 'failure_mode',
      suggestion: suggestion.thread_missing_failure_mode,
      payloadExcerpt: t,
    }
  },
}

// ── decision_create ──────────────────────────────────────────

const decisionMissingSummary: FirewallRule = {
  id: 'decision_missing_summary',
  appliesTo: (w) => w.type === 'decision_create',
  check: (w): FirewallResult | null => {
    const d = w.input as Record<string, unknown>
    if (nonEmptyString(d.summary)) return null
    return {
      ruleId: 'decision_missing_summary',
      severity: 'block',
      rejectedField: 'summary',
      suggestion: suggestion.decision_missing_summary,
      payloadExcerpt: d,
    }
  },
}

const decisionMissingAnchor: FirewallRule = {
  id: 'decision_missing_anchor',
  appliesTo: (w) => w.type === 'decision_create',
  check: (w): FirewallResult | null => {
    const d = w.input as Record<string, unknown>
    if (nonEmptyArray(d.anchored_to)) return null
    return {
      ruleId: 'decision_missing_anchor',
      severity: 'block',
      rejectedField: 'anchored_to',
      suggestion: suggestion.decision_missing_anchor,
      payloadExcerpt: d,
    }
  },
}

const decisionMissingCategory: FirewallRule = {
  id: 'decision_missing_category',
  appliesTo: (w) => w.type === 'decision_create',
  check: (w): FirewallResult | null => {
    const d = w.input as Record<string, unknown>
    if (nonEmptyString(d.category)) return null
    return {
      ruleId: 'decision_missing_category',
      severity: 'block',
      rejectedField: 'category',
      suggestion: suggestion.decision_missing_category,
      payloadExcerpt: d,
    }
  },
}

// ── promise_create ───────────────────────────────────────────

const promiseMissingOwner: FirewallRule = {
  id: 'promise_missing_owner',
  appliesTo: (w) => w.type === 'promise_create',
  check: (w): FirewallResult | null => {
    const p = w.input as Record<string, unknown>
    if (nonEmptyString(p.to)) return null
    return {
      ruleId: 'promise_missing_owner',
      severity: 'block',
      rejectedField: 'to',
      suggestion: suggestion.promise_missing_owner,
      payloadExcerpt: p,
    }
  },
}

const promiseMissingWhat: FirewallRule = {
  id: 'promise_missing_what',
  appliesTo: (w) => w.type === 'promise_create',
  check: (w): FirewallResult | null => {
    const p = w.input as Record<string, unknown>
    if (nonEmptyString(p.what)) return null
    return {
      ruleId: 'promise_missing_what',
      severity: 'block',
      rejectedField: 'what',
      suggestion: suggestion.promise_missing_what,
      payloadExcerpt: p,
    }
  },
}

const promiseMissingAnchor: FirewallRule = {
  id: 'promise_missing_anchor',
  appliesTo: (w) => w.type === 'promise_create',
  check: (w): FirewallResult | null => {
    const p = w.input as Record<string, unknown>
    if (nonEmptyArray(p.anchored_to)) return null
    return {
      ruleId: 'promise_missing_anchor',
      severity: 'block',
      rejectedField: 'anchored_to',
      suggestion: suggestion.promise_missing_anchor,
      payloadExcerpt: p,
    }
  },
}

// ── clue_create ──────────────────────────────────────────────

const clueMissingContent: FirewallRule = {
  id: 'clue_missing_content',
  appliesTo: (w) => w.type === 'clue_create',
  check: (w): FirewallResult | null => {
    const c = w.input as Record<string, unknown>
    if (nonEmptyString(c.content)) return null
    return {
      ruleId: 'clue_missing_content',
      severity: 'block',
      rejectedField: 'content',
      suggestion: suggestion.clue_missing_content,
      payloadExcerpt: c,
    }
  },
}

const clueMissingSource: FirewallRule = {
  id: 'clue_missing_source',
  appliesTo: (w) => w.type === 'clue_create',
  check: (w): FirewallResult | null => {
    const c = w.input as Record<string, unknown>
    if (nonEmptyString(c.source)) return null
    return {
      ruleId: 'clue_missing_source',
      severity: 'block',
      rejectedField: 'source',
      suggestion: suggestion.clue_missing_source,
      payloadExcerpt: c,
    }
  },
}

// Floating clue: content + source present, but no anchored_to. Allowed but flagged.
const clueFloating: FirewallRule = {
  id: 'clue_floating',
  appliesTo: (w) => w.type === 'clue_create',
  check: (w): FirewallResult | null => {
    const c = w.input as Record<string, unknown>
    if (!nonEmptyString(c.content) || !nonEmptyString(c.source)) return null
    if (nonEmptyArray(c.anchored_to)) return null
    return {
      ruleId: 'clue_floating',
      severity: 'warn',
      rejectedField: 'anchored_to',
      suggestion: suggestion.clue_floating,
      payloadExcerpt: c,
    }
  },
}

// ── arc_create ───────────────────────────────────────────────

const arcTooFewThreads: FirewallRule = {
  id: 'arc_too_few_threads',
  appliesTo: (w) => w.type === 'arc_create',
  check: (w): FirewallResult | null => {
    const a = w.input as Record<string, unknown>
    const threads = Array.isArray(a.threads) ? (a.threads as unknown[]).length : 0
    if (threads >= 2) return null
    return {
      ruleId: 'arc_too_few_threads',
      severity: 'block',
      rejectedField: 'threads',
      suggestion: suggestion.arc_too_few_threads,
      payloadExcerpt: a,
    }
  },
}

const arcStakesDuplicatesTitle: FirewallRule = {
  id: 'arc_stakes_duplicates_title',
  appliesTo: (w) => w.type === 'arc_create',
  check: (w): FirewallResult | null => {
    const a = w.input as Record<string, unknown>
    const title = typeof a.title === 'string' ? a.title.trim().toLowerCase() : ''
    const stakes = typeof a.stakes_definition === 'string' ? a.stakes_definition.trim().toLowerCase() : ''
    if (!stakes) return {
      ruleId: 'arc_stakes_duplicates_title',
      severity: 'block',
      rejectedField: 'stakes_definition',
      suggestion: suggestion.arc_stakes_duplicates_title,
      payloadExcerpt: a,
    }
    if (stakes === title) return {
      ruleId: 'arc_stakes_duplicates_title',
      severity: 'block',
      rejectedField: 'stakes_definition',
      suggestion: suggestion.arc_stakes_duplicates_title,
      payloadExcerpt: a,
    }
    return null
  },
}

const arcOverActiveCap: FirewallRule = {
  id: 'arc_over_active_cap',
  appliesTo: (w) => w.type === 'arc_create',
  check: (w, state: GameState): FirewallResult | null => {
    const active = (state.arcs ?? []).filter(a => a.status === 'active').length
    if (active < 5) return null
    return {
      ruleId: 'arc_over_active_cap',
      severity: 'block',
      rejectedField: null,
      suggestion: suggestion.arc_over_active_cap,
      payloadExcerpt: w.input,
    }
  },
}

export const GROUP_A_RULES: FirewallRule[] = [
  threadMissingOwner,
  threadMissingResolution,
  threadMissingFailure,
  decisionMissingSummary,
  decisionMissingAnchor,
  decisionMissingCategory,
  promiseMissingOwner,
  promiseMissingWhat,
  promiseMissingAnchor,
  clueMissingContent,
  clueMissingSource,
  clueFloating,
  arcTooFewThreads,
  arcStakesDuplicatesTitle,
  arcOverActiveCap,
]
