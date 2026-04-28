// Display sentinel — deterministic scan of Narrator prose for visible
// violations the player must not see. PRD Fix 3 + Fix 6.
//
// Phase C scope this slice: debug_leak only. The forbidden lexicon catches
// the system's own diagnostic vocabulary leaking into player-facing prose
// (the failure mode where Narrator visibly reasons about coherence flags,
// state patches, scene packets). Other sentinel types (absent_speaker,
// forbidden_target_substitution, unintroduced_entity) layer on once the
// SceneKernel + resolver substrate is wired to the live pipeline.
//
// Operating mode: pure function, no side effects. Caller decides how to act
// on findings (observe-mode telemetry, block-and-repair, etc.). The PRD's
// streaming buffer integration is a separate wiring slice — this module is
// the scan, not the policy.

import type {
  Sf2Campaign,
  Sf2DisplaySentinelAction,
  Sf2DisplaySentinelFinding,
  Sf2DisplaySentinelSeverity,
} from '../types'

// Forbidden lexicon. Direct from PRD Fix 6. Each phrase is a literal
// case-insensitive match. We DO NOT use word boundaries on the whole phrase
// — multi-word phrases are inherently bounded by their token order — but we
// DO require word boundaries on single-word terms (just 'archivist' below)
// to avoid matching inside larger words.
//
// PRD note: "Some words may be diegetic in sci-fi contexts." Phase C ships
// strict matching in observe mode; if false positives surface in real
// playthroughs, individual entries gain a context disambiguator. Don't
// pre-tune for hypothetical false positives — let real prose calibrate.
const FORBIDDEN_PHRASES: readonly string[] = [
  'coherence flag',
  'coherence finding',
  'anchor miss',
  'drift flag',
  'game state',
  'state shows',
  'roll gate',
  'pending check',
  'pacing advisory',
  'pacing advisor',
  'scene packet',
  'scene kernel',
  'narrator annotation',
  'mechanical effect',
  'state patch',
  'working set',
  'cache breakpoint',
  'retrieval score',
  '**the escalation**',
  '**the escalation.**',
  '**the backfire**',
  '**the backfire.**',
  '**hard block + cost**',
  '**hard block + cost.**',
  'still favorable',
  'still hostile',
  'still wary',
  'the thread that was',
]

// Single-token forbidden terms get word boundaries so 'archivist' doesn't
// match inside an arbitrary longer word.
const FORBIDDEN_SINGLE_TOKENS: readonly string[] = ['archivist']

// Narrator-reveal phrases. Direct from the Narrator prompt's "Forbidden in
// failure narration" + "Pre-submit scan" lists. Pattern: omniscient sidebar
// telling the player what their PC didn't see, missed, or wouldn't yet
// realize. Empirically the model emits these despite the prompt rule
// (playthrough 6, turns 1 + 8 — confirmed Investigation/Perception failures
// produced "What you miss in the distraction is…" and "what you don't see…
// is that Vex just wrote…"). Detect them deterministically and surface as
// findings; let calling site decide observe vs enforce.
const NARRATOR_REVEAL_PHRASES: readonly string[] = [
  "what you don't",
  'what you do not',
  'what you miss',
  'what you missed',
  "what you didn't",
  'what you did not',
  'what escapes you',
  'unnoticed by you',
  'unseen by you',
  "you don't yet",
  'you do not yet',
  "the seed you don't",
  "what you fail to",
  "what you're missing",
  "what you are missing",
]

// Excerpt window for evidence quotes. Wide enough to give the repair path
// enough surrounding context to rewrite cleanly; narrow enough to keep the
// finding payload small for instrumentation.
const EVIDENCE_WINDOW_CHARS = 120

const DEFAULT_DEBUG_LEAK_SEVERITY: Sf2DisplaySentinelSeverity = 'hard'
const DEFAULT_DEBUG_LEAK_ACTION: Sf2DisplaySentinelAction = 'block_and_repair'

const ROLL_VALUE_PATTERNS: readonly RegExp[] = [
  /\bNatural\s+(?:1|20|\d+)\b/gi,
  /(?:^|[.!?]\s+)(Twenty(?:-two)?|Sixteen|Nineteen|Twenty)\.\s/gi,
]

const STAGE_LABEL_PATTERNS: readonly RegExp[] = [
  /\*\*[A-Z][A-Z ]+\.\*\*/g,
  /(?:^|\n)[A-Z][A-Z ]+\.(?=\n|$)/g,
]

const DISPOSITION_PREDICATE_PATTERN =
  /\b(?:is|was|remains|stays|seems|feels|looks|reads as)\s+(?:still\s+)?(favorable|wary|hostile|trusted|neutral)\b/gi

export interface ScanOptions {
  // Override the default action returned on finding. Useful for observe-mode
  // callers that want to record findings without blocking.
  action?: Sf2DisplaySentinelAction
  // Override severity. Defaults to 'hard' per PRD ("debug leak" is in the
  // hard-fail list).
  severity?: Sf2DisplaySentinelSeverity
}

// Public scan API. Returns one finding per match — distinct phrases produce
// distinct findings; the same phrase appearing twice in a turn produces two
// findings so the repair path / instrumentation can see frequency.
export function scanForDebugLeaks(
  prose: string,
  options: ScanOptions = {}
): Sf2DisplaySentinelFinding[] {
  if (!prose || typeof prose !== 'string') return []
  const action = options.action ?? DEFAULT_DEBUG_LEAK_ACTION
  const severity = options.severity ?? DEFAULT_DEBUG_LEAK_SEVERITY
  const findings: Sf2DisplaySentinelFinding[] = []
  const lower = prose.toLowerCase()

  for (const phrase of FORBIDDEN_PHRASES) {
    let from = 0
    while (true) {
      const idx = lower.indexOf(phrase, from)
      if (idx === -1) break
      findings.push(buildFinding(prose, idx, phrase.length, phrase, severity, action))
      from = idx + phrase.length
    }
  }

  for (const token of FORBIDDEN_SINGLE_TOKENS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(prose))) {
      findings.push(buildFinding(prose, m.index, m[0].length, token, severity, action))
    }
  }

  // Sort by position in prose so callers can act on the earliest violation
  // first (relevant for streaming buffer cancel points).
  findings.sort((a, b) => a.matchStart - b.matchStart)
  return findings
}

export function scanForFixtureLeaks(
  prose: string,
  campaign: Sf2Campaign | undefined,
  options: ScanOptions = {}
): Sf2DisplaySentinelFinding[] {
  if (!prose || typeof prose !== 'string') return []
  const action = options.action ?? DEFAULT_DEBUG_LEAK_ACTION
  const severity = options.severity ?? DEFAULT_DEBUG_LEAK_SEVERITY
  const findings: Sf2DisplaySentinelFinding[] = []

  for (const pattern of ROLL_VALUE_PATTERNS) {
    pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(prose))) {
      findings.push(buildFinding(prose, m.index, m[0].length, m[0].trim(), severity, action, 'roll_value_leak'))
    }
  }

  for (const pattern of STAGE_LABEL_PATTERNS) {
    pattern.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = pattern.exec(prose))) {
      findings.push(buildFinding(prose, m.index, m[0].length, m[0].trim(), severity, action, 'stage_label_leak'))
    }
  }

  DISPOSITION_PREDICATE_PATTERN.lastIndex = 0
  let dispositionMatch: RegExpExecArray | null
  while ((dispositionMatch = DISPOSITION_PREDICATE_PATTERN.exec(prose))) {
    findings.push(
      buildFinding(
        prose,
        dispositionMatch.index,
        dispositionMatch[0].length,
        dispositionMatch[0],
        'medium',
        action,
        'disposition_label_leak'
      )
    )
  }

  if (campaign) {
    for (const npc of Object.values(campaign.npcs)) {
      const cue = npc.retrievalCue?.trim()
      if (cue && cue.length >= 12) {
        const lowerProse = prose.toLowerCase()
        const lowerCue = cue.toLowerCase()
        let from = 0
        while (true) {
          const idx = lowerProse.indexOf(lowerCue, from)
          if (idx === -1) break
          findings.push(buildFinding(prose, idx, cue.length, cue, severity, action, 'retrieval_cue_leak'))
          from = idx + cue.length
        }
      }

      const titleValue = (npc as unknown as { title?: unknown }).title
      const title = typeof titleValue === 'string' ? titleValue.trim() : ''
      const name = npc.name?.trim()
      if (title && name && title.toLowerCase() !== 'warden') {
        const pattern = new RegExp(`\\bWarden\\s+${escapeRegExp(name)}\\b`, 'gi')
        let m: RegExpExecArray | null
        while ((m = pattern.exec(prose))) {
          findings.push(
            buildFinding(prose, m.index, m[0].length, m[0], severity, action, 'npc_title_contamination')
          )
        }
      }
    }
  }

  findings.sort((a, b) => a.matchStart - b.matchStart)
  return findings
}

// Present-tense dialogue verbs. Past-tense forms ('said', 'asked', etc.) are
// deliberately omitted — past tense in narrative prose almost always indicates
// reported speech / recall, which is allowed for absent NPCs ("Pol said
// earlier that the writ would close at sundown"). Conservative precision per
// Martin's review #1: ship the linter to catch obvious cases, leave ambiguous
// patterns alone until calibration data shows they matter.
const PRESENT_DIALOGUE_VERBS: readonly string[] = [
  'says',
  'asks',
  'replies',
  'answers',
  'tells',
  'whispers',
  'murmurs',
  'mutters',
  'states',
  'declares',
  'adds',
  'remarks',
  'interrupts',
  'demands',
  'presses',
  'responds',
  'intones',
  'snaps',
  'calls',
  'shouts',
  'objects',
]

// Present-tense direct-action verbs. Conservative-precision list: only verbs
// that, in present tense + first-clause position after an alias, almost
// always indicate the alias entity is physically performing an action in the
// scene. Past-tense ('walked', 'took') is reported recall and excluded — same
// reasoning as the dialogue verb list above. Body-language verbs (nods,
// frowns, shrugs) are excluded for now: they overlap too much with
// reported-speech patterns ("Yara said Miko nodded"). If observed false-
// negatives in real prose indicate that gap matters, add them with extra
// suppression logic.
const PRESENT_ACTION_VERBS: readonly string[] = [
  'enters',
  'exits',
  'leaves',
  'arrives',
  'approaches',
  'returns',
  'departs',
  'walks',
  'runs',
  'steps',
  'crosses',
  'moves',
  'comes',
  'goes',
  'takes',
  'grabs',
  'seizes',
  'holds',
  'lifts',
  'sets',
  'drops',
  'opens',
  'closes',
  'pulls',
  'pushes',
  'draws',
  'fires',
  'strikes',
  'hands',
  'sits',
  'stands',
  'kneels',
  'leans',
  'reaches',
  'turns',
]

// Hypothetical / counterfactual cues. When one of these appears within
// HYPOTHETICAL_LOOKBEHIND_CHARS before an alias-verb match, suppress the
// finding — "what would Pol say if she walked in" must not fire.
const HYPOTHETICAL_CUES: readonly string[] = [
  'would',
  'could',
  'might',
  'should',
  'if ',
  'whether',
  'suppose',
  'imagine',
  'were ',
]

const HYPOTHETICAL_LOOKBEHIND_CHARS = 40

// Quoted-memory cue: an opening quote without a closing one in the lookbehind
// window indicates we're inside a quoted block (someone is quoting prior
// speech). Suppress to avoid firing on "Pol's words came back to him: 'The
// writ doesn't pause.'" patterns.
const QUOTED_LOOKBEHIND_CHARS = 80

export interface AbsentSpeakerScanInput {
  // Canonical IDs of NPCs known to be absent from the scene. From
  // Sf2SceneKernel.absentEntityIds.
  absentEntityIds: readonly string[]
  // Display variants per absent NPC. From Sf2SceneKernel.aliasMap. Phase 1
  // uses exact alias matching with word boundaries — partial matches ("Pol"
  // when alias is "Auditor Pol") are not currently caught; if calibration
  // data shows that matters, enrich aliases at kernel build time.
  aliasMap: Readonly<Record<string, readonly string[]>>
}

// Scan prose for absent-NPC speech. Conservative-precision regex: only fires
// on `<alias>\s+<present-tense-verb>` patterns, with skip rules for
// hypothetical mood and quoted recall. Returns one finding per legitimate
// match; multiple matches in the same prose return distinct findings.
export function scanForAbsentSpeakers(
  prose: string,
  input: AbsentSpeakerScanInput,
  options: ScanOptions = {}
): Sf2DisplaySentinelFinding[] {
  if (!prose || typeof prose !== 'string') return []
  if (!input.absentEntityIds.length) return []
  const action = options.action ?? 'block_and_repair'
  const severity = options.severity ?? 'hard'
  const findings: Sf2DisplaySentinelFinding[] = []

  const verbAlternation = PRESENT_DIALOGUE_VERBS.map(escapeRegExp).join('|')

  for (const entityId of input.absentEntityIds) {
    const aliases = input.aliasMap[entityId] ?? []
    for (const alias of aliases) {
      if (!alias || alias.length < 2) continue
      // Match: alias + whitespace + dialogue verb at word boundary.
      // Possessive guard: alias must NOT be followed by 's (so "Pol's words"
      // doesn't match "Pol" against the word "says" downstream).
      const pattern = new RegExp(
        `\\b${escapeRegExp(alias)}\\b(?!['’]s)\\s+(?:${verbAlternation})\\b`,
        'gi'
      )
      let m: RegExpExecArray | null
      while ((m = pattern.exec(prose))) {
        if (shouldSuppressMatch(prose, m.index)) continue
        findings.push({
          severity,
          type: 'absent_speaker',
          entityId,
          surface: m[0],
          evidence: extractEvidence(prose, m.index, m[0].length),
          matchStart: m.index,
          recommendedAction: action,
        })
      }
    }
  }

  findings.sort((a, b) => a.matchStart - b.matchStart)
  return findings
}

// Scan prose for absent NPCs performing direct actions. Companion to
// scanForAbsentSpeakers — same alias/lookup substrate, different verb list.
// Catches the "Mareth steps through the door" pattern when Mareth is in
// absentEntityIds. Same precision approach: only fire on
// `<alias>\s+<present-action-verb>` with hypothetical/quoted suppression.
export function scanForAbsentDirectActors(
  prose: string,
  input: AbsentSpeakerScanInput,
  options: ScanOptions = {}
): Sf2DisplaySentinelFinding[] {
  if (!prose || typeof prose !== 'string') return []
  if (!input.absentEntityIds.length) return []
  const action = options.action ?? 'block_and_repair'
  const severity = options.severity ?? 'hard'
  const findings: Sf2DisplaySentinelFinding[] = []

  const verbAlternation = PRESENT_ACTION_VERBS.map(escapeRegExp).join('|')

  for (const entityId of input.absentEntityIds) {
    const aliases = input.aliasMap[entityId] ?? []
    for (const alias of aliases) {
      if (!alias || alias.length < 2) continue
      const pattern = new RegExp(
        `\\b${escapeRegExp(alias)}\\b(?!['’]s)\\s+(?:${verbAlternation})\\b`,
        'gi'
      )
      let m: RegExpExecArray | null
      while ((m = pattern.exec(prose))) {
        if (shouldSuppressMatch(prose, m.index)) continue
        findings.push({
          severity,
          type: 'absent_direct_actor',
          entityId,
          surface: m[0],
          evidence: extractEvidence(prose, m.index, m[0].length),
          matchStart: m.index,
          recommendedAction: action,
        })
      }
    }
  }

  findings.sort((a, b) => a.matchStart - b.matchStart)
  return findings
}

// Suppression rules. Precedence: hypothetical mood, quoted block, sentence
// inversion ("said Pol" — different pattern not currently matched). Each
// rule returns true to skip the match.
function shouldSuppressMatch(prose: string, matchStart: number): boolean {
  const lookbehindHypothetical = prose
    .slice(Math.max(0, matchStart - HYPOTHETICAL_LOOKBEHIND_CHARS), matchStart)
    .toLowerCase()
  for (const cue of HYPOTHETICAL_CUES) {
    if (lookbehindHypothetical.includes(cue)) return true
  }
  // Quoted-memory: count quote chars in the lookbehind. If we're inside an
  // open quote (odd number of straight quotes since the last paragraph
  // break), suppress.
  const lookbehindQuoted = prose.slice(
    Math.max(0, matchStart - QUOTED_LOOKBEHIND_CHARS),
    matchStart
  )
  // Restrict to the current sentence/paragraph by trimming back to the last
  // strong boundary. Without this, an unrelated earlier quoted block would
  // bias the count.
  const segmentStart = Math.max(
    lookbehindQuoted.lastIndexOf('. '),
    lookbehindQuoted.lastIndexOf('\n'),
    lookbehindQuoted.lastIndexOf('— '),
  )
  const segment = segmentStart >= 0 ? lookbehindQuoted.slice(segmentStart) : lookbehindQuoted
  const quoteCount = (segment.match(/["“”]/g) ?? []).length
  if (quoteCount % 2 === 1) return true
  return false
}

function extractEvidence(prose: string, start: number, length: number): string {
  const windowStart = Math.max(0, start - Math.floor(EVIDENCE_WINDOW_CHARS / 2))
  const windowEnd = Math.min(prose.length, start + length + Math.floor(EVIDENCE_WINDOW_CHARS / 2))
  return prose.slice(windowStart, windowEnd).trim()
}

export interface ScanDisplayOutputOptions extends ScanOptions {
  // When supplied, runs absent_speaker scan in addition to debug_leak.
  // Without it, only debug_leak runs (the current default for callers that
  // don't yet have a SceneKernel built).
  absentSpeakers?: AbsentSpeakerScanInput
  campaign?: Sf2Campaign
}

// Scan prose for narrator-reveal patterns: omniscient sidebar narrating what
// the PC didn't see, missed, or wouldn't yet realize. The Narrator prompt
// already forbids this (with a self-scan list), but the model violates it
// reliably enough on failed Investigation/Perception rolls that programmatic
// detection is necessary.
//
// Suppression: the in-character delayed-realization pattern is legitimate —
// "what you don't clock until it's too late is that you stopped in the
// doorway." The PC realizes retroactively what the failed roll cost them.
// The differentiator is a temporal-realization tail ("until it's too late",
// "until later", "until you turn around") within ~80 chars after the phrase.
// When that tail is present, the structure is PC-POV retrospective rather
// than narrator omniscient sidebar — suppress the finding.
const REALIZATION_TAIL = /\b(until\s+(?:it'?s\s+too\s+late|later|you\s+(?:turn|look|notice|see|realize|understand|hear|catch))|after\s+the\s+fact)\b/i
const REALIZATION_TAIL_LOOKAHEAD_CHARS = 80

export function scanForNarratorReveal(
  prose: string,
  options: ScanOptions = {}
): Sf2DisplaySentinelFinding[] {
  if (!prose || typeof prose !== 'string') return []
  // Default observe-mode: surface the finding so the route can route it to
  // telemetry without breaking the response. Flip the default to enforce
  // (block_and_repair) once observe data confirms the false-positive rate
  // is acceptable.
  const action = options.action ?? 'allow_but_quarantine_writes'
  const severity = options.severity ?? 'medium'
  const findings: Sf2DisplaySentinelFinding[] = []
  const lower = prose.toLowerCase()
  for (const phrase of NARRATOR_REVEAL_PHRASES) {
    let from = 0
    while (true) {
      const idx = lower.indexOf(phrase, from)
      if (idx === -1) break
      // Suppress when followed by an in-character realization tail — that's
      // PC-POV retrospective, not narrator omniscient sidebar.
      const lookahead = prose.slice(idx + phrase.length, idx + phrase.length + REALIZATION_TAIL_LOOKAHEAD_CHARS)
      if (REALIZATION_TAIL.test(lookahead)) {
        from = idx + phrase.length
        continue
      }
      findings.push(buildFinding(prose, idx, phrase.length, phrase, severity, action, 'narrator_reveal'))
      from = idx + phrase.length
    }
  }
  return findings
}

// Convenience: total scan combining all currently-shipped sentinel types.
// Single entry point the streaming buffer / API route calls. As new scanners
// land they're added here behind opt-in inputs.
export function scanDisplayOutput(
  prose: string,
  options: ScanDisplayOutputOptions = {}
): Sf2DisplaySentinelFinding[] {
  const findings = scanForDebugLeaks(prose, options)
  findings.push(...scanForFixtureLeaks(prose, options.campaign, options))
  findings.push(...scanForNarratorReveal(prose, options))
  if (options.absentSpeakers) {
    findings.push(...scanForAbsentSpeakers(prose, options.absentSpeakers, options))
    findings.push(...scanForAbsentDirectActors(prose, options.absentSpeakers, options))
  }
  findings.sort((a, b) => a.matchStart - b.matchStart)
  return findings
}

// Format a finding's detail string for instrumentation/log surfaces. Short
// enough to fit in a one-line invariant event detail.
export function formatFinding(finding: Sf2DisplaySentinelFinding): string {
  const surface = finding.surface ? `"${finding.surface}"` : ''
  return `${finding.type}${surface ? ` ${surface}` : ''} @ ${finding.matchStart}: ${finding.evidence.slice(0, 80)}`
}

function buildFinding(
  prose: string,
  start: number,
  length: number,
  surface: string,
  severity: Sf2DisplaySentinelSeverity,
  action: Sf2DisplaySentinelAction,
  type: Sf2DisplaySentinelFinding['type'] = 'debug_leak'
): Sf2DisplaySentinelFinding {
  const windowStart = Math.max(0, start - Math.floor(EVIDENCE_WINDOW_CHARS / 2))
  const windowEnd = Math.min(prose.length, start + length + Math.floor(EVIDENCE_WINDOW_CHARS / 2))
  const evidence = prose.slice(windowStart, windowEnd).trim()
  return {
    severity,
    type,
    surface,
    evidence,
    matchStart: start,
    recommendedAction: action,
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export { FORBIDDEN_PHRASES, FORBIDDEN_SINGLE_TOKENS }
