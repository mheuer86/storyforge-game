// Probe-test runner: real Haiku Archivist call against captured stateBefore +
// Narrator prose, then assert the response. Mirrors the replay runner's shape
// but adds the model call as the test subject.
//
// Probes validate Archivist behavior the deterministic replay layer can't
// reach: does the prompt actually produce the right finding types? Does it
// use new fields like supersedes_id when prose calls for them?
//
// Usage: npm run sf2:probe -- <fixture-or-dir>
// Requires ANTHROPIC_API_KEY in env (loaded from .env.local automatically).

import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARCHIVIST_TOOLS, ARCHIVIST_TOOL_NAME } from '../lib/sf2/archivist/tools'
import {
  SF2_ARCHIVIST_CORE,
  SF2_ARCHIVIST_ROLE,
  buildArchivistSituation,
  buildArchivistTurnMessage,
} from '../lib/sf2/archivist/prompt'
import { SF2_BIBLE_HEGEMONY } from '../lib/sf2/narrator/prompt'
import { composeSystemBlocks } from '../lib/sf2/prompt/compose'
import { applyArchivistPatch } from '../lib/sf2/validation/apply-patch'
import type { Sf2ArchivistPatch, Sf2State } from '../lib/sf2/types'

interface ProbeFixture {
  schema: 'sf2-probe-fixture/v1'
  name: string
  source?: Record<string, unknown>
  input: {
    stateBefore: Sf2State
    turnIndex?: number
    playerInput: string
    narratorProse: string
    narratorAnnotation?: Record<string, unknown> | null
  }
  expected?: {
    coherenceFindingsInclude?: Array<{
      type: string
      stateReferenceIncludes?: string
      evidenceQuoteIncludes?: string
    }>
    createsInclude?: Array<{
      kind: string
      nameIncludes?: string
      payloadFieldEquals?: Record<string, string>
    }>
    archivistAcceptedRefs?: string[]
    archivistRejectedRefs?: string[]
    driftIncludes?: Array<{ kind: string; detailIncludes?: string }>
    npcNamesInclude?: string[]
    npcNamesAbsent?: string[]
  }
}

interface ProbeResult {
  fixture: ProbeFixture
  path: string
  failures: string[]
  rawArchivistInput?: Record<string, unknown>
  rawArchivistResponse?: string
  costUsd?: number
}

const HAIKU_PRICING = { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 } // $/M tokens
const ARCHIVIST_MODEL = process.env.SF2_ARCHIVIST_MODEL || 'claude-haiku-4-5-20251001'

async function main(): Promise<void> {
  loadEnvFromDotenvLocal()
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing. Set it in .env.local or env.')
    process.exit(2)
  }

  const target = process.argv[2]
  if (!target) {
    console.error('Usage: npm run sf2:probe -- <fixture-file-or-directory>')
    process.exit(2)
  }

  const paths = collectFixturePaths(resolve(process.cwd(), target))
  if (paths.length === 0) {
    console.error(`No probe fixtures found at ${target}`)
    process.exit(2)
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const results: ProbeResult[] = []
  for (const path of paths) {
    const result = await runFixturePath(path, client)
    results.push(result)
    const label = `${result.fixture.name} (${result.path})`
    if (result.failures.length === 0) {
      console.log(
        `PASS ${label}${result.costUsd !== undefined ? ` — $${result.costUsd.toFixed(4)}` : ''}`
      )
    } else {
      console.log(`FAIL ${label}`)
      for (const failure of result.failures) console.log(`  - ${failure}`)
      if (process.env.SF2_PROBE_DEBUG && result.rawArchivistInput) {
        console.log('  raw archivist input:')
        console.log(JSON.stringify(result.rawArchivistInput, null, 2).split('\n').map((l) => `    ${l}`).join('\n'))
      }
    }
  }

  const failed = results.filter((r) => r.failures.length > 0).length
  const totalCost = results.reduce((acc, r) => acc + (r.costUsd ?? 0), 0)
  console.log(
    `\n${results.length - failed}/${results.length} probes passed — total cost ~$${totalCost.toFixed(4)}`
  )
  process.exit(failed === 0 ? 0 : 1)
}

function collectFixturePaths(target: string): string[] {
  if (!existsSync(target)) return []
  const stat = statSync(target)
  if (stat.isFile()) return target.endsWith('.json') ? [target] : []
  return readdirSync(target)
    .flatMap((entry) => collectFixturePaths(resolve(target, entry)))
    .filter((path) => path.endsWith('.json'))
    .sort()
}

async function runFixturePath(path: string, client: Anthropic): Promise<ProbeResult> {
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as ProbeFixture
  const failures: string[] = []

  if (fixture.schema !== 'sf2-probe-fixture/v1') {
    return { fixture, path, failures: [`unsupported schema ${String(fixture.schema)}`] }
  }

  const state = fixture.input.stateBefore
  const turnIndex = fixture.input.turnIndex ?? state.history.turns.length

  // Build the same Archivist call the route would make.
  const situation = buildArchivistSituation(state)
  const { blocks: system } = composeSystemBlocks({
    core: SF2_ARCHIVIST_CORE,
    bible: SF2_BIBLE_HEGEMONY,
    role: SF2_ARCHIVIST_ROLE,
    situation,
  })
  const cachedTools = ARCHIVIST_TOOLS.map((t, i) =>
    i === ARCHIVIST_TOOLS.length - 1
      ? { ...t, cache_control: { type: 'ephemeral' as const } }
      : t
  )
  const userMessage = buildArchivistTurnMessage(
    state,
    turnIndex,
    fixture.input.narratorProse,
    fixture.input.narratorAnnotation ?? null
  )

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: ARCHIVIST_MODEL,
      max_tokens: 4096,
      system,
      tools: cachedTools,
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userMessage }],
    })
  } catch (err) {
    return {
      fixture,
      path,
      failures: [`API call failed: ${err instanceof Error ? err.message : String(err)}`],
    }
  }

  const usage = response.usage
  const costUsd =
    (usage.input_tokens * HAIKU_PRICING.input +
      usage.output_tokens * HAIKU_PRICING.output +
      (usage.cache_creation_input_tokens ?? 0) * HAIKU_PRICING.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * HAIKU_PRICING.cacheRead) /
    1_000_000

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === 'tool_use' && b.name === ARCHIVIST_TOOL_NAME
  )
  if (!toolUse) {
    return {
      fixture,
      path,
      failures: [`Archivist did not emit ${ARCHIVIST_TOOL_NAME}; stop_reason: ${response.stop_reason}`],
      costUsd,
    }
  }

  const rawInput = toolUse.input as Record<string, unknown>
  const patch = normalizePatch(rawInput, turnIndex + 1)
  const applyResult = applyArchivistPatch(state, patch, state.meta.currentChapter)
  const stateAfter = applyResult.nextState

  assertExpected(fixture, rawInput, applyResult, stateAfter, failures)
  return { fixture, path, failures, rawArchivistInput: rawInput, costUsd }
}

function normalizePatch(raw: Record<string, unknown>, turnIndex: number): Sf2ArchivistPatch {
  // Lighter-touch normalizer than the route's — we only need apply-patch to
  // accept it. Match snake_case to camelCase per the route's normalizeArchivistPatch.
  const creates = Array.isArray(raw.creates)
    ? (raw.creates as Array<Record<string, unknown>>).map((r) => ({
        kind: r.kind as 'npc' | 'faction' | 'thread' | 'decision' | 'promise' | 'clue' | 'arc' | 'location' | 'temporal_anchor' | 'document',
        payload: (r.payload as Record<string, unknown>) ?? {},
        confidence: normalizeConfidence(r.confidence),
        sourceQuote: r.source_quote as string | undefined,
      }))
    : []
  const updates = Array.isArray(raw.updates)
    ? (raw.updates as Array<Record<string, unknown>>).map((r) => ({
        entityKind: r.entity_kind as 'npc' | 'faction' | 'thread' | 'arc' | 'clue' | 'document',
        entityId: String(r.entity_id ?? ''),
        changes: (r.changes as Record<string, unknown>) ?? {},
        confidence: normalizeConfidence(r.confidence),
        sourceQuote: r.source_quote as string | undefined,
      }))
    : []
  const transitions = Array.isArray(raw.transitions)
    ? (raw.transitions as Array<Record<string, unknown>>).map((r) => ({
        entityKind: r.entity_kind as 'thread' | 'decision' | 'promise' | 'clue' | 'arc' | 'document',
        entityId: String(r.entity_id ?? ''),
        toStatus: String(r.to_status ?? ''),
        reason: String(r.reason ?? ''),
        confidence: normalizeConfidence(r.confidence),
      }))
    : []
  const attachments = Array.isArray(raw.attachments)
    ? (raw.attachments as Array<Record<string, unknown>>).map((r) => ({
        kind: r.kind as 'anchor_decision' | 'anchor_promise' | 'anchor_clue',
        entityId: String(r.entity_id ?? ''),
        threadIds: Array.isArray(r.thread_ids) ? (r.thread_ids as string[]) : [],
        confidence: normalizeConfidence(r.confidence),
      }))
    : []
  const flags = Array.isArray(raw.flags)
    ? (raw.flags as Array<Record<string, unknown>>).map((r) => ({
        kind: r.kind as
          | 'npc_teleport'
          | 'anchor_reference_missing'
          | 'identity_drift'
          | 'protected_field_write'
          | 'contradiction'
          | 'annotation_mismatch_claims'
          | 'annotation_mismatch_shown',
        detail: String(r.detail ?? ''),
        entityId: r.entity_id as string | undefined,
      }))
    : []
  const pc = raw.pacing_classification as Record<string, unknown> | undefined
  const pacingClassification = {
    worldInitiated: Boolean(pc?.world_initiated),
    sceneEndLeadsTo: (pc?.scene_end_leads_to as 'unanswered_question' | 'kinetic_carry' | 'relational_tension' | 'unpaid_promise' | null | 'not_applicable') ?? 'not_applicable',
    tensionDeltasByThreadId: (pc?.tension_deltas as Record<string, number> | undefined) ?? {},
  }
  const coherenceFindings = Array.isArray(raw.coherence_findings)
    ? (raw.coherence_findings as Array<Record<string, unknown>>).map((r) => ({
        type: r.type as Sf2ArchivistPatch['coherenceFindings'] extends Array<infer U> | undefined ? (U extends { type: infer T } ? T : never) : never,
        severity: (r.severity as 'low' | 'medium' | 'high') ?? 'low',
        evidenceQuote: String(r.evidence_quote ?? ''),
        stateReference: String(r.state_reference ?? ''),
        suggestedNote: String(r.suggested_note ?? ''),
      }))
    : []
  return {
    turnIndex,
    creates,
    updates,
    transitions,
    attachments,
    pacingClassification,
    flags,
    coherenceFindings: coherenceFindings.length > 0 ? coherenceFindings : undefined,
  }
}

function normalizeConfidence(v: unknown): 'high' | 'medium' | 'low' {
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

function assertExpected(
  fixture: ProbeFixture,
  rawInput: Record<string, unknown>,
  applyResult: ReturnType<typeof applyArchivistPatch>,
  state: Sf2State,
  failures: string[]
): void {
  const expected = fixture.expected ?? {}

  // coherenceFindingsInclude: assert against the raw Archivist response, not
  // the normalized patch (the response is what the prompt produced).
  const findings = Array.isArray(rawInput.coherence_findings)
    ? (rawInput.coherence_findings as Array<Record<string, unknown>>)
    : []
  for (const want of expected.coherenceFindingsInclude ?? []) {
    const match = findings.find((f) => {
      if (String(f.type ?? '') !== want.type) return false
      if (want.stateReferenceIncludes && !String(f.state_reference ?? '').includes(want.stateReferenceIncludes)) return false
      if (want.evidenceQuoteIncludes && !String(f.evidence_quote ?? '').toLowerCase().includes(want.evidenceQuoteIncludes.toLowerCase())) return false
      return true
    })
    if (!match) {
      failures.push(
        `missing coherence_finding type=${want.type}` +
          (want.stateReferenceIncludes ? ` stateRef⊃"${want.stateReferenceIncludes}"` : '') +
          (want.evidenceQuoteIncludes ? ` evidence⊃"${want.evidenceQuoteIncludes}"` : '') +
          `; got: [${findings.map((f) => f.type).join(', ')}]`
      )
    }
  }

  // createsInclude: assert against raw creates payloads.
  const creates = Array.isArray(rawInput.creates)
    ? (rawInput.creates as Array<Record<string, unknown>>)
    : []
  for (const want of expected.createsInclude ?? []) {
    const match = creates.find((c) => {
      if (String(c.kind ?? '') !== want.kind) return false
      const payload = (c.payload as Record<string, unknown>) ?? {}
      if (want.nameIncludes) {
        const name = String(payload.name ?? '')
        if (!name.toLowerCase().includes(want.nameIncludes.toLowerCase())) return false
      }
      if (want.payloadFieldEquals) {
        for (const [field, value] of Object.entries(want.payloadFieldEquals)) {
          if (String(payload[field] ?? '') !== value) return false
        }
      }
      return true
    })
    if (!match) {
      failures.push(
        `missing create kind=${want.kind}` +
          (want.nameIncludes ? ` name⊃"${want.nameIncludes}"` : '') +
          (want.payloadFieldEquals ? ` fields=${JSON.stringify(want.payloadFieldEquals)}` : '')
      )
    }
  }

  for (const ref of expected.archivistAcceptedRefs ?? []) {
    const outcome = applyResult.outcomes.find((o) => o.writeRef === ref)
    if (!outcome?.accepted) failures.push(`archivist write ${ref} was not accepted`)
  }
  for (const ref of expected.archivistRejectedRefs ?? []) {
    const outcome = applyResult.outcomes.find((o) => o.writeRef === ref)
    if (!outcome || outcome.accepted) failures.push(`archivist write ${ref} was not rejected`)
  }
  for (const driftWant of expected.driftIncludes ?? []) {
    const match = applyResult.drift.find(
      (d) =>
        d.kind === driftWant.kind &&
        (!driftWant.detailIncludes ||
          d.detail.toLowerCase().includes(driftWant.detailIncludes.toLowerCase()))
    )
    if (!match) {
      failures.push(
        `missing drift ${driftWant.kind}${driftWant.detailIncludes ? ` ⊃ "${driftWant.detailIncludes}"` : ''}`
      )
    }
  }
  for (const name of expected.npcNamesInclude ?? []) {
    const match = Object.values(state.campaign.npcs).find(
      (npc) => npc.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (!match) failures.push(`npc name "${name}" missing after apply`)
  }
  for (const name of expected.npcNamesAbsent ?? []) {
    const match = Object.values(state.campaign.npcs).find(
      (npc) => npc.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (match) failures.push(`npc name "${name}" should have been merged but is still present as ${match.id}`)
  }
}

function loadEnvFromDotenvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
