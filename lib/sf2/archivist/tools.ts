// Archivist tool schema — narrative-state writes only.
// The Archivist CANNOT emit mechanical effects (HP, credits, combat, location).
// Those live on the Narrator. Firewall actor rule enforces the split.
//
// Flat writes, structured storage: Archivist emits simple semantic statements;
// the apply-patch layer resolves references, assigns IDs, and populates the graph.

import type Anthropic from '@anthropic-ai/sdk'
import { SF2_EMOTIONAL_BEAT_TAGS, SF2_TEMP_LOAD_TAGS } from '../types'

export const ARCHIVIST_TOOL_NAME = 'extract_turn' as const

export const extractTurnTool: Anthropic.Tool = {
  name: ARCHIVIST_TOOL_NAME,
  description:
    'Emit narrative-state writes derived from Narrator prose. Prose is ground truth; the Narrator\'s annotation is a hint. For every write include a confidence tier (high/medium/low) and a source_quote when possible. Low-confidence writes are logged but not applied — the Narrator will be prompted to re-establish next turn. Call ONCE per turn.',
  input_schema: {
    type: 'object' as const,
    properties: {
      creates: {
        type: 'array',
        description: 'New entities to create. Flat semantic statements — do not nest.',
        items: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['npc', 'faction', 'thread', 'decision', 'promise', 'clue', 'arc', 'location', 'temporal_anchor', 'document'],
            },
            payload: {
              type: 'object',
              description:
                'Flat fields for the entity. Shape depends on kind. NPCs: {name, affiliation, role, pronoun: "she/her"|"he/him"|"they/them"|"other", age, voice_note, voice_register, retrieval_cue, key_facts: string[], supersedes_id?: string}. The optional supersedes_id field directs an anonymous→named merge: when the prose names a previously-anonymous on-stage NPC (e.g. "the unknown young man" turns out to be "Sev\'s brother"), set supersedes_id to that existing anonymous NPC\'s id. Apply-patch will rename + enrich the existing entity rather than creating a parallel one. Threads: {title, owner: {kind: "npc"|"faction", name_or_id: string}, tension: number 0-10, resolution_criteria, failure_mode, retrieval_cue, resolution_gates?: [{id,label,condition,required?: boolean}], successor_to_thread_id?: thread id/title, arc_id?: existing arc id/title}. Use resolution_gates only when successful resolution requires distinct state facts; code blocks successful resolution until required gates are satisfied. Use successor_to_thread_id when a resolved thread opens a follow-up question; code automatically anchors the successor to the same arc as its predecessor. Decisions: {summary, anchored_to: [thread_title_or_id, ...]}. Promises: {obligation, owner: {kind, name_or_id}, anchored_to: [thread_title_or_id, ...]}. Clues: {content, anchored_to: [thread_title_or_id, ...] (may be empty for floating)}. Locations: {name, description, atmospheric_conditions: string[], locked?: boolean}. Temporal anchors: {title, kind: deadline|timestamp|duration|sequence|recurrence, label, anchor_text, anchored_to: [entity_id_or_title, ...], retrieval_cue}. Arcs: {title, thread_ids: [...], spans_chapters: number, stakes_definition: string}. Documents: {type: "authorization"|"directive"|"communication"|"record"|"petition"|"notation", kind_label: string (genre flavor noun, e.g. "writ", "transfer order", "court summons", "ship manifest"), title, authorizes (one-line: what it permits/commands/attests/requests), original_summary (canonical terms at issuance — locked, never overwritten by updates), filed_by (npc/faction id-or-name; who originated/registered it), signed_by (npc/faction id-or-name; who authorized it — distinct from filer), additional_parties: [{role: "counter-signer"|"witness"|"custodian"|..., entity_id: string}], subject_entity_ids: [npc/faction ids; whom the document concerns — REQUIRED, must be ≥1. Use canonical IDs from the cast roster (e.g. \\`npc_4\\`, \\`npc_kess_elder\\`). Do NOT synthesize role-descriptive IDs like \\`npc_fled_resonant\\` when an existing NPC matches that role — scan the cast roster and reference their canonical id. Synthesizing role-descriptive IDs causes the same person to be treated as multiple entities in downstream prose.], anchored_to: [thread ids; may be empty for floating], access_level?: "public"|"sealed"|"classified", retrieval_cue}.',
              additionalProperties: true,
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            source_quote: {
              type: 'string',
              description: 'Phrase from the narrator prose supporting this write.',
            },
          },
          required: ['kind', 'payload', 'confidence'],
        },
      },
      updates: {
        type: 'array',
        description:
          "Updates to existing entities. Use for sharpening existing clues (prefer over creating a new clue that says the same underlying fact at higher resolution), adjusting NPC/faction state, or advancing thread tension/status.",
        items: {
          type: 'object',
          properties: {
            entity_kind: { type: 'string', enum: ['npc', 'faction', 'thread', 'arc', 'clue', 'document', 'operation_plan'] },
            entity_id: { type: 'string', description: 'Id or canonical name for lookup. For operation_plan, use "current".' },
            changes: {
              type: 'object',
              description:
                "Fields to change. NPC: disposition (one of hostile|wary|neutral|favorable|trusted — do NOT emit free-form words like 'closed_off', 'resigned', 'fearful'; pick the closest tier), pronoun (only if not already established), age (only if not already established), temp_load (numeric saturation gauge), temp_load_tag (one of uneasy_under_scrutiny|vulnerable|betrayed|exhausted|cornered — transient state that modulates the per-turn behavioral imperative; clear by re-asserting disposition), agenda.current_move, agenda_severity ('standard'|'major'; use major only when the NPC/faction makes a decisive new pressure move), last_seen_turn. Faction: stance (same five-tier enum as disposition), heat (one of none|low|medium|high|boiling), heat_reasons, agenda.current_move, agenda_severity. When agenda changes, code stamps agenda.last_updated_turn automatically. Thread: tension, status (one of active|resolved_clean|resolved_costly|resolved_failure|resolved_catastrophic|abandoned|deferred), last_advanced_turn, resolution_gates (append/merge), progress or progress_events ({summary, gate_id/gate_ids/satisfies_gate_ids} records durable progress), satisfied_resolution_gates / failed_resolution_gates / waived_resolution_gates. Operation_plan: name, target, approach, fallback, status (active|paused|resolved|abandoned); update only when the prose explicitly commits, changes, pauses, resolves, or abandons the plan. **Clue: content (replaces the clue's text with a sharpened version), retrieval_cue (replaces the cue), anchored_to (union-merges with the existing anchor set — add threads, never silently remove).** **Document: amendment-only — current_summary (new active terms; appends a revision entry, original_summary is locked), amendment_reason (what changed it: verdict, addendum, override), changed_by (npc/faction id), anchored_to (union-merge with thread anchors), additional_parties (append-only: counter-signers, witnesses added later), clue_ids (cross-ref new clues that record what the PC knows about this document). Do NOT update filed_by, signed_by, type, or original_summary — to change attribution, supersede the document with a new one and transition the old to 'superseded'.**",
              properties: {
                agenda_severity: {
                  type: 'string',
                  enum: ['standard', 'major'],
                  description:
                    "Optional. Only with NPC/faction agenda.current_move updates. 'standard' for ordinary repositioning; 'major' for decisive agenda action that materially escalates a chapter thread.",
                },
                temp_load_tag: {
                  type: 'string',
                  enum: [...SF2_TEMP_LOAD_TAGS, ''],
                  description:
                    "Optional. NPC only. Transient state lingering from recent events that modulates the per-turn behavioral imperative without changing disposition tier. Distinct from beat tags (those describe what just happened). Clears when a subsequent NPC update restates disposition without this field; pass an empty string to clear explicitly without changing disposition.",
                },
              },
              additionalProperties: true,
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            source_quote: { type: 'string' },
          },
          required: ['entity_kind', 'entity_id', 'changes', 'confidence'],
        },
      },
      transitions: {
        type: 'array',
        description:
          'Status transitions: thread resolved, decision paid, promise kept/broken, clue consumed, arc resolved.',
        items: {
          type: 'object',
          properties: {
            entity_kind: {
              type: 'string',
              enum: ['thread', 'decision', 'promise', 'clue', 'arc', 'document'],
            },
            entity_id: { type: 'string' },
            to_status: {
              type: 'string',
              description:
                'Target status. Valid values depend on entity_kind: thread → resolved_clean|resolved_costly|resolved_failure|resolved_catastrophic|abandoned|deferred. decision → paid|invalidated. promise → kept|broken|released. clue → consumed. arc → resolved|abandoned. document → superseded|revoked|void|resolved (per-type lifecycle: authorization/directive can be superseded|revoked|void; communication/notation can be superseded|void; record can be void only; petition can be resolved|superseded|void).',
            },
            reason: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['entity_kind', 'entity_id', 'to_status', 'reason', 'confidence'],
        },
      },
      attachments: {
        type: 'array',
        description:
          'Anchor a decision, promise, or clue to one or more threads, or anchor a thread to an existing arc. This is the riskiest write — use medium/low confidence when anchor inference is uncertain.',
        items: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['anchor_decision', 'anchor_promise', 'anchor_clue', 'anchor_thread_to_arc'],
            },
            entity_id: { type: 'string' },
            thread_ids: { type: 'array', items: { type: 'string' } },
            arc_id: {
              type: 'string',
              description: 'Required for anchor_thread_to_arc. Existing arc id/title to receive the thread named in entity_id.',
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['kind', 'entity_id', 'confidence'],
        },
      },
      scene_result: {
        type: 'object',
        description: 'If a scene ended this turn, summarize it.',
        properties: {
          scene_id: { type: 'string' },
          summary: { type: 'string' },
          leads_to: {
            type: 'string',
            enum: ['unanswered_question', 'kinetic_carry', 'relational_tension', 'unpaid_promise', 'null'],
          },
        },
        required: ['scene_id', 'summary', 'leads_to'],
      },
      pacing_classification: {
        type: 'object',
        description:
          'Per-turn pacing signals. world_initiated = world pushed new pressure vs player pushed. scene_end_leads_to = forward hook kind if scene ended this turn. tension_deltas = per-thread tension changes this turn.',
        properties: {
          world_initiated: { type: 'boolean' },
          scene_end_leads_to: {
            type: 'string',
            enum: [
              'unanswered_question',
              'kinetic_carry',
              'relational_tension',
              'unpaid_promise',
              'null',
              'not_applicable',
            ],
          },
          tension_deltas: {
            type: 'object',
            description: 'Map of thread_id → signed integer delta (usually -2..+2).',
            additionalProperties: { type: 'number' },
          },
        },
        required: ['world_initiated', 'scene_end_leads_to', 'tension_deltas'],
      },
      flags: {
        type: 'array',
        description: 'Drift and contradiction flags. Non-fatal — logged for later review.',
        items: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: [
                'npc_teleport',
                'anchor_reference_missing',
                'identity_drift',
                'protected_field_write',
                'contradiction',
                'annotation_mismatch_claims',
                'annotation_mismatch_shown',
                'revelation_premature_reveal',
              ],
            },
            detail: { type: 'string' },
            entity_id: { type: 'string' },
          },
          required: ['kind', 'detail'],
        },
      },
      ladder_fires: {
        type: 'array',
        description:
          "Pressure-ladder step ids that FIRED this turn. **Most turns fire ZERO steps.** A step fires only when the narrative in THIS turn's prose concretely *crosses* the specific event the triggerCondition names — the moment you can point to the sentence where it just became true. If the condition was merely consistent with prior state, don't fire (assume it fired earlier or will fire later). **Hard cap: fire at most 1 step per turn** except when the narrative genuinely produces two distinct crossings in the same turn (rare). Prefer the earliest unfired step when multiple could plausibly match. This is mechanical evaluation — not whether the chapter *should* escalate, only whether the trigger's specific event *just happened*.",
        items: { type: 'string', description: 'ladder step id (e.g. pl_2)' },
      },
      lexicon_additions: {
        type: 'array',
        description:
          'Phrases the Narrator coined this turn that nail the world\'s register and should join the campaign lexicon. Capture sparingly — at most 1 per turn, and only when a phrase feels like found canon (specific, institutional, reusable). Do NOT capture generic narration, single nouns from the existing vocabulary, or one-off similes.',
        items: {
          type: 'object',
          properties: {
            phrase: { type: 'string', description: 'The exact phrase as it appeared.' },
            register: {
              type: 'string',
              description: 'One-line note on what register/voice this phrase carries.',
            },
            example_context: {
              type: 'string',
              description: 'A short prose snippet (≤120 chars) where the phrase appeared.',
            },
          },
          required: ['phrase', 'register', 'example_context'],
        },
      },
      emotional_beats: {
        type: 'array',
        description:
          'Moment-grain narrative memory. Emit at most ONE per turn, and most turns emit zero. Reserve for a prose moment that lands a confession, betrayal, breakthrough, pivotal hesitation, or character-shift worth retrieving in a later chapter.',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'One compact sentence naming what emotionally landed in the prose.',
            },
            participants: {
              type: 'array',
              description: 'Canonical entity ids involved in the beat. Include pc when the PC is directly involved.',
              items: { type: 'string' },
            },
            anchored_to: {
              type: 'array',
              description: 'Optional thread/document/entity anchors that make this beat retrievable later.',
              items: { type: 'string' },
            },
            emotional_tags: {
              type: 'array',
              items: {
                type: 'string',
                // Vocabulary defined once in lib/sf2/types.ts; both this
                // schema and the Sf2EmotionalBeatTag type read from it.
                enum: [...SF2_EMOTIONAL_BEAT_TAGS],
              },
            },
            salience: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Archivist-assessed dramatic weight. Below 0.5 should usually be omitted.',
            },
          },
          required: ['text', 'participants', 'emotional_tags', 'salience'],
        },
      },
      revelation_hints_delivered: {
        type: 'array',
        description:
          'Hint-counter events for authored revelations. Emit when this turn\'s prose contains a configured hint phrase for an unrevealed revelation.',
        items: {
          type: 'object',
          properties: {
            revelation_id: { type: 'string' },
            phrase_matched: { type: 'string' },
            prose_excerpt: { type: 'string', description: 'Short prose excerpt showing the hint phrase.' },
          },
          required: ['revelation_id', 'phrase_matched', 'prose_excerpt'],
        },
      },
      revelations_revealed: {
        type: 'array',
        description:
          'Authored revelations whose truth actually landed in this turn. The system validates hint count and context in observe mode.',
        items: {
          type: 'object',
          properties: {
            revelation_id: { type: 'string' },
            context: {
              type: 'string',
              enum: [
                'crisis_of_trust',
                'private_pressure',
                'documentary_surface',
                'confession',
                'accusation',
                'forced_disclosure',
                'inadvertent',
              ],
            },
            evidence_quote: { type: 'string' },
          },
          required: ['revelation_id', 'context', 'evidence_quote'],
        },
      },
      coherence_findings: {
        type: 'array',
        description:
          'Observations about how the Narrator\'s prose honored (or didn\'t) current state. Soft signals only — they feed the next Narrator turn as corrective notes. Most turns produce ZERO findings. Only emit when prose visibly contradicts state or skips a required beat. See the "Coherence audit" section in the situation block for which types to use and when to skip.',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'disposition_incoherence',
                'heat_mismatch',
                'stale_reentry',
                'clue_leak',
                'identity_drift',
                'npc_fabrication',
                'pronoun_drift',
                'age_drift',
                'anchor_miss',
                'revelation_premature_reveal',
                'document_attribution_drift',
              ],
            },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            evidence_quote: {
              type: 'string',
              description: 'The prose clause that raised the concern (≤400 chars).',
            },
            state_reference: {
              type: 'string',
              description: 'Entity id or fact key the prose is incoherent with.',
            },
            suggested_note: {
              type: 'string',
              description: '≤20 words, framed for the Narrator\'s next turn.',
            },
          },
          required: ['type', 'severity', 'evidence_quote', 'state_reference', 'suggested_note'],
        },
      },
    },
    required: ['pacing_classification'],
  },
}

export const ARCHIVIST_TOOLS: Anthropic.Tool[] = [extractTurnTool]
