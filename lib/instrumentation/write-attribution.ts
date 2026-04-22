// ============================================================
// Write attribution — Batch 1
//
// Given a batch of ToolCallResult objects and the actor that produced
// them, emit one WRITE line per logical sub-write. Runs server-side
// in the route, before results are sent to the client. Purely
// observational: does not alter behavior or mutate state.
// ============================================================

import type { StreamEvent, ToolCallResult, InstrumentActor, GameState } from '../types'
import { emitLine, emitJson, type InstrumentContext } from '../instrumentation'
import { runFirewall, buildRejectionRecord, FIREWALL_MODE } from '../firewall'
import { ENTITY_FIELDS, WRITE_TYPE_TO_ENTITY, CREATE_WRITE_TYPES } from './entity-schemas'

type WriteRec = {
  type: string               // thread_create, npc_update, …
  entity: string | null
  fieldsProvided: string[]
  fieldsMissingRequired: string[]
  // success | partial | malformed — batch 1 heuristic without firewall.
  // step 3 (firewall) will upgrade this via runFirewall.
  status: 'success' | 'partial' | 'malformed'
  input?: unknown
}

const nonEmpty = (v: unknown) =>
  v !== undefined && v !== null &&
  (typeof v !== 'string' || v.trim().length > 0) &&
  (!Array.isArray(v) || v.length > 0)

// ── per-write-type decomposition ────────────────────────────────

function threadCreates(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.add_threads as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(t => {
    const provided = Object.keys(t).filter(k => nonEmpty(t[k]))
    const required = ['owner', 'resolution_criteria', 'failure_mode', 'title']
    const missing = required.filter(r => !nonEmpty(t[r]) || (r === 'owner' && typeof t.owner === 'string' && t.owner.trim().toLowerCase() === 'unknown'))
    return {
      type: 'thread_create',
      entity: (t.id as string) ?? (t.title as string) ?? 'NEW',
      fieldsProvided: provided,
      fieldsMissingRequired: missing,
      status: missing.length === 0 ? 'success' : (nonEmpty(t.title) ? 'partial' : 'malformed'),
      input: t,
    }
  })
}

function threadUpdates(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.update_threads as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(t => ({
    type: 'thread_update',
    entity: (t.id as string) ?? 'NONE',
    fieldsProvided: Object.keys(t).filter(k => nonEmpty(t[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: t,
  }))
}

function npcCreates(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.add_npcs as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(n => {
    const provided = Object.keys(n).filter(k => nonEmpty(n[k]))
    const required = ['name', 'description', 'last_seen']
    const missing = required.filter(r => !nonEmpty(n[r]))
    return {
      type: 'npc_create',
      entity: (n.name as string) ?? 'NEW',
      fieldsProvided: provided,
      fieldsMissingRequired: missing,
      status: missing.length === 0 ? 'success' : (nonEmpty(n.name) ? 'partial' : 'malformed'),
      input: n,
    }
  })
}

function npcUpdates(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.update_npcs as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(n => ({
    type: 'npc_update',
    entity: (n.name as string) ?? 'NONE',
    fieldsProvided: Object.keys(n).filter(k => nonEmpty(n[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: n,
  }))
}

function promiseCreate(world: Record<string, unknown>): WriteRec[] {
  const p = world.add_promise as Record<string, unknown> | undefined
  if (!p) return []
  const provided = Object.keys(p).filter(k => nonEmpty(p[k]))
  const required = ['to', 'what']
  const anchorBad = !Array.isArray(p.anchored_to) || (p.anchored_to as unknown[]).length === 0
  const missing = required.filter(r => !nonEmpty(p[r]))
  if (anchorBad) missing.push('anchored_to')
  return [{
    type: 'promise_create',
    entity: (p.id as string) ?? 'NEW',
    fieldsProvided: provided,
    fieldsMissingRequired: missing,
    status: missing.length === 0 ? 'success' : 'partial',
    input: p,
  }]
}

function promiseUpdate(world: Record<string, unknown>): WriteRec[] {
  const p = world.update_promise as Record<string, unknown> | undefined
  if (!p) return []
  return [{
    type: 'promise_update',
    entity: (p.id as string) ?? (p.to as string) ?? 'NONE',
    fieldsProvided: Object.keys(p).filter(k => nonEmpty(p[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: p,
  }]
}

function decisionCreate(world: Record<string, unknown>): WriteRec[] {
  const d = world.add_decision as Record<string, unknown> | undefined
  if (!d) return []
  const provided = Object.keys(d).filter(k => nonEmpty(d[k]))
  const required = ['summary', 'category']
  const anchorBad = !Array.isArray(d.anchored_to) || (d.anchored_to as unknown[]).length === 0
  const missing = required.filter(r => !nonEmpty(d[r]))
  if (anchorBad) missing.push('anchored_to')
  return [{
    type: 'decision_create',
    entity: (d.id as string) ?? 'NEW',
    fieldsProvided: provided,
    fieldsMissingRequired: missing,
    status: missing.length === 0 ? 'success' : 'partial',
    input: d,
  }]
}

function decisionUpdate(world: Record<string, unknown>): WriteRec[] {
  const d = world.update_decision as Record<string, unknown> | undefined
  if (!d) return []
  return [{
    type: 'decision_update',
    entity: (d.id as string) ?? 'NONE',
    fieldsProvided: Object.keys(d).filter(k => nonEmpty(d[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: d,
  }]
}

function clueCreates(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.add_clues as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(c => {
    const provided = Object.keys(c).filter(k => nonEmpty(c[k]))
    const required = ['content', 'source']
    const missing = required.filter(r => !nonEmpty(c[r]))
    const anchored = Array.isArray(c.anchored_to) && (c.anchored_to as unknown[]).length > 0
    const status: WriteRec['status'] =
      missing.length === 0 && anchored ? 'success'
      : missing.length === 0 && !anchored ? 'partial'  // floating
      : 'malformed'
    return {
      type: 'clue_create',
      entity: (c.clue_id as string) ?? (c.title as string) ?? 'NEW',
      fieldsProvided: provided,
      fieldsMissingRequired: missing.concat(anchored ? [] : ['anchored_to']),
      status,
      input: c,
    }
  })
}

function factionWrite(world: Record<string, unknown>): WriteRec[] {
  const f = world.add_faction as Record<string, unknown> | undefined
  if (!f) return []
  return [{
    type: 'faction_update',
    entity: (f.name as string) ?? 'NEW',
    fieldsProvided: Object.keys(f).filter(k => nonEmpty(f[k])),
    fieldsMissingRequired: [],
    status: nonEmpty(f.name) ? 'success' : 'malformed',
    input: f,
  }]
}

function dispositionChanges(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.disposition_changes as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(d => ({
    type: 'disposition_change',
    entity: (d.npc_name as string) ?? 'NONE',
    fieldsProvided: Object.keys(d).filter(k => nonEmpty(d[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: d,
  }))
}

function clockWrites(world: Record<string, unknown>): WriteRec[] {
  const arr = (world.clocks as Array<Record<string, unknown>> | undefined) ?? []
  return arr.map(c => ({
    type: c.action === 'establish' ? 'clock_establish' : 'clock_advance',
    entity: (c.id as string) ?? 'NONE',
    fieldsProvided: Object.keys(c).filter(k => nonEmpty(c[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: c,
  }))
}

function timerWrites(world: Record<string, unknown>): WriteRec[] {
  const out: WriteRec[] = []
  if (world.add_timer) {
    const t = world.add_timer as Record<string, unknown>
    out.push({
      type: 'timer_set',
      entity: (t.id as string) ?? 'NEW',
      fieldsProvided: Object.keys(t).filter(k => nonEmpty(t[k])),
      fieldsMissingRequired: [],
      status: 'success',
      input: t,
    })
  }
  if (world.update_timer) {
    const t = world.update_timer as Record<string, unknown>
    out.push({
      type: 'timer_update',
      entity: (t.id as string) ?? 'NONE',
      fieldsProvided: Object.keys(t).filter(k => nonEmpty(t[k])),
      fieldsMissingRequired: [],
      status: 'success',
      input: t,
    })
  }
  return out
}

function heatWrite(world: Record<string, unknown>): WriteRec[] {
  if (!world.update_heat) return []
  const h = world.update_heat as Record<string, unknown>
  return [{
    type: 'heat_change',
    entity: (h.faction as string) ?? 'NONE',
    fieldsProvided: Object.keys(h).filter(k => nonEmpty(h[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: h,
  }]
}

function ledgerWrite(world: Record<string, unknown>): WriteRec[] {
  if (!world.add_ledger_entry) return []
  const l = world.add_ledger_entry as Record<string, unknown>
  return [{
    type: 'ledger_entry',
    entity: 'NONE',
    fieldsProvided: Object.keys(l).filter(k => nonEmpty(l[k])),
    fieldsMissingRequired: [],
    status: 'success',
    input: l,
  }]
}

function sceneWrites(world: Record<string, unknown>): WriteRec[] {
  const out: WriteRec[] = []
  if (world.set_location) {
    out.push({
      type: 'set_location',
      entity: ((world.set_location as Record<string, unknown>).name as string) ?? 'NONE',
      fieldsProvided: Object.keys(world.set_location as object),
      fieldsMissingRequired: [],
      status: 'success',
      input: world.set_location,
    })
  }
  if (world.set_scene_snapshot) {
    out.push({
      type: 'scene_snapshot',
      entity: 'NONE',
      fieldsProvided: ['set_scene_snapshot'],
      fieldsMissingRequired: [],
      status: 'success',
      input: world.set_scene_snapshot,
    })
  }
  return out
}

function arcWrites(input: Record<string, unknown>): WriteRec[] {
  const out: WriteRec[] = []
  const a = input.arc_updates as Record<string, unknown> | undefined
  if (!a) return out
  if (a.create_arc) {
    const ar = a.create_arc as Record<string, unknown>
    const required = ['id', 'title', 'stakes_definition']
    const missing = required.filter(r => !nonEmpty(ar[r]))
    const threadCount = Array.isArray(ar.threads) ? (ar.threads as unknown[]).length : 0
    if (threadCount < 2) missing.push('threads<2')
    out.push({
      type: 'arc_create',
      entity: (ar.id as string) ?? 'NEW',
      fieldsProvided: Object.keys(ar).filter(k => nonEmpty(ar[k])),
      fieldsMissingRequired: missing,
      status: missing.length === 0 ? 'success' : 'partial',
      input: ar,
    })
  }
  if (a.advance_episode) out.push({ type: 'arc_update', entity: ((a.advance_episode as Record<string, unknown>).arc_id as string) ?? 'NONE', fieldsProvided: ['advance_episode'], fieldsMissingRequired: [], status: 'success' })
  if (a.resolve_arc) out.push({ type: 'arc_update', entity: ((a.resolve_arc as Record<string, unknown>).arc_id as string) ?? 'NONE', fieldsProvided: ['resolve_arc'], fieldsMissingRequired: [], status: 'success' })
  if (a.abandon_arc) out.push({ type: 'arc_update', entity: ((a.abandon_arc as Record<string, unknown>).arc_id as string) ?? 'NONE', fieldsProvided: ['abandon_arc'], fieldsMissingRequired: [], status: 'success' })
  if (a.add_episode) out.push({ type: 'arc_update', entity: ((a.add_episode as Record<string, unknown>).arc_id as string) ?? 'NONE', fieldsProvided: ['add_episode'], fieldsMissingRequired: [], status: 'success' })
  return out
}

function topLevelWrites(input: Record<string, unknown>): WriteRec[] {
  const out: WriteRec[] = []
  if (input.chapter_frame) {
    const cf = input.chapter_frame as Record<string, unknown>
    out.push({
      type: 'chapter_frame',
      entity: 'NONE',
      fieldsProvided: Object.keys(cf).filter(k => nonEmpty(cf[k])),
      fieldsMissingRequired: [],
      status: 'success',
      input: cf,
    })
  }
  if (input.reframe) {
    out.push({ type: 'reframe', entity: 'NONE', fieldsProvided: Object.keys(input.reframe as object), fieldsMissingRequired: [], status: 'success', input: input.reframe })
  }
  if (input.signal_close) {
    out.push({ type: 'signal_close', entity: 'NONE', fieldsProvided: Object.keys(input.signal_close as object), fieldsMissingRequired: [], status: 'success', input: input.signal_close })
  }
  if (input.origin_event) {
    out.push({ type: 'origin_event', entity: ((input.origin_event as Record<string, unknown>).counter as string) ?? 'NONE', fieldsProvided: Object.keys(input.origin_event as object), fieldsMissingRequired: [], status: 'success', input: input.origin_event })
  }
  if (input.spend_witness) {
    out.push({ type: 'witness_spend', entity: ((input.spend_witness as Record<string, unknown>).decision_id as string) ?? 'NONE', fieldsProvided: Object.keys(input.spend_witness as object), fieldsMissingRequired: [], status: 'success', input: input.spend_witness })
  }
  return out
}

// ── Top-level decomposition for one commit_turn input ──

function decomposeCommitTurn(input: Record<string, unknown>): WriteRec[] {
  const out: WriteRec[] = []
  const world = (input.world as Record<string, unknown> | undefined) ?? {}
  out.push(
    ...threadCreates(world), ...threadUpdates(world),
    ...npcCreates(world), ...npcUpdates(world),
    ...promiseCreate(world), ...promiseUpdate(world),
    ...decisionCreate(world), ...decisionUpdate(world),
    ...clueCreates(world),
    ...factionWrite(world),
    ...dispositionChanges(world),
    ...clockWrites(world),
    ...timerWrites(world),
    ...heatWrite(world),
    ...ledgerWrite(world),
    ...sceneWrites(world),
    ...arcWrites(input),
    ...topLevelWrites(input),
  )
  return out
}

// ── Public API ─────────────────────────────────────────────────

function emitEntityCreation(
  send: (event: StreamEvent) => void,
  ctx: InstrumentContext,
  writeType: string,
  entity: string | null,
  input: unknown,
) {
  const entityBucket = WRITE_TYPE_TO_ENTITY[writeType]
  if (!entityBucket) return
  const schema = ENTITY_FIELDS[entityBucket]
  if (!schema) return
  const obj = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {}
  const populated: string[] = []
  const empty: string[] = []
  for (const f of schema) {
    const v = obj[f]
    const isPresent =
      v !== undefined && v !== null &&
      (typeof v !== 'string' || v.trim().length > 0) &&
      (!Array.isArray(v) || v.length > 0)
    if (isPresent) populated.push(f)
    else empty.push(f)
  }
  const payload = { entity_type: entityBucket, write_type: writeType, entity, populated, empty }
  send({
    type: 'instrument',
    channel: 'ENTITY_CREATION',
    line: `ENTITY_CREATION genre=${ctx.genre} turn=${ctx.turn} chapter=${ctx.chapter} type=${entityBucket} entity=${entity ?? 'NEW'} populated=[${populated.join(',')}] empty=[${empty.join(',')}]`,
    payload,
  })
}

export function emitWriteLines(
  send: (event: StreamEvent) => void,
  ctx: InstrumentContext,
  actor: InstrumentActor,
  results: ToolCallResult[],
  state: GameState,
) {
  let seq = 0
  for (const r of results) {
    if (r.tool !== 'commit_turn' && r.tool !== 'chapter_setup') continue
    const recs = decomposeCommitTurn(r.input)
    for (const rec of recs) {
      // Run firewall against the sub-write. Results upgrade WRITE status when
      // severity='block' fires; warnings leave status untouched.
      const fwResults = runFirewall(
        { type: rec.type, actor, entity: rec.entity, input: rec.input },
        state,
      )
      let status = rec.status
      const blockFired = fwResults.some(f => f.severity === 'block')
      if (blockFired) {
        // In enforce mode this write would be rejected entirely; in observe
        // mode we log its projected classification without blocking.
        status = 'malformed'
      } else if (status === 'success' && fwResults.some(f => f.severity === 'warn')) {
        status = 'partial'
      }

      const fields = rec.fieldsProvided.length > 0 ? `fields=[${rec.fieldsProvided.join(',')}]` : `fields=[]`
      const missing = rec.fieldsMissingRequired.length > 0 ? ` missing=[${rec.fieldsMissingRequired.join(',')}]` : ''
      send({
        type: 'instrument',
        channel: 'WRITE',
        line: `WRITE genre=${ctx.genre} turn=${ctx.turn} chapter=${ctx.chapter} type=${rec.type} actor=${actor} entity=${rec.entity ?? 'NONE'} status=${status} ${fields}${missing}`,
        payload: {
          write_type: rec.type,
          actor,
          entity: rec.entity,
          status,
          fields_provided: rec.fieldsProvided,
          fields_missing: rec.fieldsMissingRequired,
          input: rec.input,
        },
      })

      // ENTITY_CREATION fires on every create, independent of firewall status
      if (CREATE_WRITE_TYPES.has(rec.type)) {
        emitEntityCreation(send, ctx, rec.type, rec.entity, rec.input)
      }

      // Per-rule observations + structured rejection records
      for (const fw of fwResults) {
        const payloadSummary = JSON.stringify(fw.payloadExcerpt).slice(0, 500)
        send({
          type: 'instrument',
          channel: 'FIREWALL_OBSERVATION',
          line: `FIREWALL_OBSERVATION genre=${ctx.genre} turn=${ctx.turn} chapter=${ctx.chapter} rule=${fw.ruleId} severity=${fw.severity} actor=${actor} type=${rec.type} entity=${rec.entity ?? 'NONE'} reason="${fw.suggestion.replace(/"/g, "'")}" payload=${payloadSummary}`,
          payload: { rule: fw.ruleId, severity: fw.severity, actor, write_type: rec.type },
        })
        const rejection = buildRejectionRecord(
          { type: rec.type, actor, entity: rec.entity, input: rec.input },
          fw,
          ctx,
          seq++,
        )
        emitJson(send, 'REJECTION_RECORD', ctx, rejection)
      }
    }
  }
  // Observe mode: never changes behavior. Verified at module-load time.
  void FIREWALL_MODE
}
