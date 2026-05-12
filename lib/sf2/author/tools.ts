// Author tool schemas. The active Chapter Author path is a single Sonnet tool
// call (`author_chapter_setup`). The old spine/surface split was a Haiku
// reliability workaround; schema pieces are kept local so the single tool can
// reuse the same validated shape.
//
// The Author cannot emit mechanical effects, narrative-state writes, or prose.
// Firewall actor rule enforces the split.

import type Anthropic from '@anthropic-ai/sdk'

export const AUTHOR_SPINE_TOOL_NAME = 'author_chapter_spine' as const
export const AUTHOR_SURFACE_TOOL_NAME = 'author_pressure_surface' as const
export const AUTHOR_TOOL_NAME = 'author_chapter_setup' as const

const openingSceneSpecSchema = {
  type: 'object' as const,
  properties: {
    location: { type: 'string' as const },
    atmospheric_condition: { type: 'string' as const },
    initial_state: { type: 'string' as const },
    first_player_facing: { type: 'string' as const },
    dramatic_situation: {
      type: 'string' as const,
      description: 'Ch2+ required. The playable human/social/institutional situation, not a timer or task queue.',
    },
    first_visible_pressure: {
      type: 'string' as const,
      description: 'Ch2+ required. What pressure the player sees first in fiction.',
    },
    first_human_or_institutional_move: {
      type: 'string' as const,
      description: 'Ch2+ required. The first move made by a person, faction, or institution.',
    },
    do_not_restage: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Ch2+ required. Prior chapter mechanisms/milestones that must not be replayed as pending.',
    },
    no_starting_combat: { type: 'boolean' as const },
    no_exposition_dump: { type: 'boolean' as const },
    visible_npc_ids: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'starting_npcs on-stage in opening. Target 1-2 ids.',
    },
    withheld_premise_facts: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Premise facts true in state but not stated in opening prose. 1-3 short clauses.',
    },
  },
  required: [
    'location',
    'atmospheric_condition',
    'initial_state',
    'first_player_facing',
    'no_starting_combat',
    'no_exposition_dump',
    'visible_npc_ids',
    'withheld_premise_facts',
  ],
}

const chapterFrameSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const },
    premise: { type: 'string' as const },
    active_pressure: { type: 'string' as const },
    central_tension: { type: 'string' as const },
    objective: { type: 'string' as const },
    crucible: { type: 'string' as const },
    outcome_spectrum: {
      type: 'object' as const,
      properties: {
        clean: { type: 'string' as const },
        costly: { type: 'string' as const },
        failure: { type: 'string' as const },
        catastrophic: { type: 'string' as const },
      },
      required: ['clean', 'costly', 'failure', 'catastrophic'],
    },
  },
  required: [
    'title',
    'premise',
    'active_pressure',
    'central_tension',
    'objective',
    'crucible',
    'outcome_spectrum',
  ],
}

const antagonistFieldSchema = {
  type: 'object' as const,
  properties: {
    source_faction_id: { type: 'string' as const },
    source_faction_label: { type: 'string' as const },
    core_pressure: { type: 'string' as const },
    default_face: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        role: { type: 'string' as const },
        pressure_style: { type: 'string' as const },
      },
      required: ['name', 'role', 'pressure_style'],
    },
    possible_faces: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          role: { type: 'string' as const },
          becomes_primary_when: { type: 'string' as const },
          pressure_style: { type: 'string' as const },
        },
        required: ['id', 'name', 'role', 'becomes_primary_when', 'pressure_style'],
      },
    },
    escalation_logic: { type: 'string' as const },
  },
  required: ['core_pressure', 'default_face', 'possible_faces', 'escalation_logic'],
}

const startingNpcsSchema = {
  type: 'array' as const,
  description: 'Exactly 3 NPCs. Reuse existing ids on continuation chapters where possible.',
  minItems: 3,
  maxItems: 3,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const, description: 'npc_<snake_case_name>' },
      name: { type: 'string' as const },
      affiliation: { type: 'string' as const },
      role: { type: 'string' as const },
      voice_register: { type: 'string' as const, description: '≤12 words. The formal speaking style: judicial, procedural, clipped, military, etc. The category, not the personality.' },
      voice_note: {
        type: 'string' as const,
        description:
          'REQUIRED for character distinctness. ≥4 words, ≤14 words. The PERSONAL flavor that differentiates this NPC from others in the same role: "precise and tired, never finishes a sentence", "drawls vowels under stress", "warm but never first to speak". Avoid generic descriptors ("professional", "competent", "experienced", "measured") — voices that lean on these collapse together when the chapter has multiple trusted NPCs. Distinct voice_note is what lets the narrator render Aul-trusted differently from Solv-trusted.',
      },
      dramatic_function: { type: 'string' as const, description: '≤12 words.' },
      hidden_pressure: { type: 'string' as const, description: '≤16 words.' },
      retrieval_cue: { type: 'string' as const, description: '≤16 words.' },
      initial_disposition: {
        type: 'string' as const,
        enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
        description:
          "How this NPC feels about the PC at scene open. Default to 'neutral' ONLY when there is no prior power dynamic worth encoding. (See rule 8.)",
      },
      disposition_reason: {
        type: 'string' as const,
        description: 'One short line, ≤16 words.',
      },
    },
    required: [
      'id',
      'name',
      'affiliation',
      'role',
      'voice_register',
      'voice_note',
      'dramatic_function',
      'hidden_pressure',
      'retrieval_cue',
      'initial_disposition',
      'disposition_reason',
    ],
  },
}

const activeThreadsSchema = {
  type: 'array' as const,
  description: 'Ch1: exactly 3 chapter-usable threads. Ch2+: exactly 4, with at least 1 successor, new_pressure, or arc_promoted driver.',
  minItems: 3,
  maxItems: 4,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const, description: 'thread_<snake_case_subject>' },
      title: { type: 'string' as const },
      question: { type: 'string' as const, description: '≤16 words.' },
      owner_hint: { type: 'string' as const, description: 'NPC name or faction id' },
      tension: { type: 'number' as const, description: '0-10' },
      initial_tension: { type: 'number' as const, description: 'Optional opening chapter pressure for new threads only. 0-8. Omit unless overriding the role default.' },
      successor_to_thread_id: {
        type: 'string' as const,
        description: 'For successor threads only: prior thread id this follows from.',
      },
      driver_kind: {
        type: 'string' as const,
        enum: ['carry_forward', 'successor', 'new_pressure', 'arc_promoted'],
        description: 'Required for Ch2+. How this thread drives the continuation chapter.',
      },
      resolution_criteria: { type: 'string' as const, description: 'One sentence, ≤24 words.' },
      resolution_gates: {
        type: 'array' as const,
        description:
          'Optional. Use for multi-step threads where obtaining a means is distinct from resolving the problem. Items: {id, label, condition, required?: boolean}. Omit for simple one-beat threads.',
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const, description: 'gate_<snake_case_fact>' },
            label: { type: 'string' as const, description: 'Short state label.' },
            condition: { type: 'string' as const, description: 'Fictional event that satisfies this gate.' },
            required: { type: 'boolean' as const },
          },
          required: ['id', 'label', 'condition'],
        },
      },
      failure_mode: { type: 'string' as const, description: 'One sentence, ≤24 words.' },
      retrieval_cue: { type: 'string' as const, description: '≤16 words.' },
    },
    required: [
      'id',
      'title',
      'question',
      'owner_hint',
      'tension',
      'resolution_criteria',
      'failure_mode',
      'retrieval_cue',
    ],
  },
}

const threadTransitionsSchema = {
  type: 'array' as const,
  description:
    'OPTIONAL. Transitions for EXISTING campaign threads (carry-forward list) at chapter open. Empty array if no carried threads need closure.',
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const, description: 'existing thread id from the carry-forward list' },
      to_status: {
        type: 'string' as const,
        enum: [
          'resolved_clean',
          'resolved_costly',
          'resolved_failure',
          'resolved_catastrophic',
          'abandoned',
          'deferred',
        ],
      },
      reason: { type: 'string' as const, description: 'one-line reason grounded in prior-chapter prose' },
    },
    required: ['id', 'to_status', 'reason'],
  },
}

const arcLinkSchema = {
  type: 'object' as const,
  properties: {
    arc_id: { type: 'string' as const },
    chapter_function: { type: 'string' as const },
    player_stance_read: { type: 'string' as const },
    arc_thread_ids: { type: 'array' as const, items: { type: 'string' as const } },
    promoted_latent_question_ids: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: ['arc_id', 'chapter_function', 'player_stance_read', 'arc_thread_ids', 'promoted_latent_question_ids'],
}

const pacingContractSchema = {
  type: 'object' as const,
  properties: {
    target_turns: {
      type: 'object' as const,
      properties: {
        min: { type: 'number' as const },
        max: { type: 'number' as const },
      },
      required: ['min', 'max'],
    },
    chapter_question: { type: 'string' as const },
    acceptable_resolutions: { type: 'array' as const, items: { type: 'string' as const } },
    early_pressure: { type: 'string' as const },
    middle_pressure: { type: 'string' as const },
    late_pressure: { type: 'string' as const },
    close_when_any: { type: 'array' as const, items: { type: 'string' as const } },
    avoid_extending_for: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: [
    'target_turns',
    'chapter_question',
    'acceptable_resolutions',
    'early_pressure',
    'middle_pressure',
    'late_pressure',
    'close_when_any',
    'avoid_extending_for',
  ],
}

const continuationMovesSchema = {
  type: 'object' as const,
  properties: {
    prior_chapter_meaning: { type: 'string' as const },
    larger_pattern_revealed: { type: 'string' as const },
    institutional_scale_escalation: {
      type: 'object' as const,
      properties: {
        from: { type: 'string' as const },
        to: { type: 'string' as const },
      },
      required: ['from', 'to'],
    },
    new_named_threat_from_prior_success: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        emerged_from: { type: 'string' as const },
        why_inevitable: { type: 'string' as const },
      },
      required: ['name', 'emerged_from', 'why_inevitable'],
    },
    worsened_existing_thread: {
      type: 'object' as const,
      properties: {
        thread_id: { type: 'string' as const },
        prior_small_detail: { type: 'string' as const },
        why_load_bearing_now: { type: 'string' as const },
      },
      required: ['thread_id', 'prior_small_detail', 'why_load_bearing_now'],
    },
    planted_midchapter_revelation: {
      type: 'object' as const,
      properties: {
        hidden_statement: { type: 'string' as const },
        recontextualizes: { type: 'string' as const },
      },
      required: ['hidden_statement', 'recontextualizes'],
    },
    relationship_deepening_target: {
      type: 'object' as const,
      properties: {
        entity_id: { type: 'string' as const },
        pressure: { type: 'string' as const },
      },
      required: ['entity_id', 'pressure'],
    },
  },
  required: [
    'prior_chapter_meaning',
    'larger_pattern_revealed',
    'institutional_scale_escalation',
    'new_named_threat_from_prior_success',
    'worsened_existing_thread',
    'planted_midchapter_revelation',
  ],
}

const continuationDramaticTurnSchema = {
  type: 'object' as const,
  description:
    'Chapter 2+ required. Converts prior chapter continuity into a dramatic turn: who acts now, what leverage they hold, and how any procedure serves that pressure.',
  properties: {
    prior_chapter_meant: { type: 'string' as const },
    larger_pattern_revealed: { type: 'string' as const },
    pressure_owner: {
      type: 'object' as const,
      properties: {
        id_or_new_bridge: {
          type: 'string' as const,
          description: 'Existing id, named new threat, or explicit bridge from prior chapter facts.',
        },
        why_they_now_act: { type: 'string' as const },
      },
      required: ['id_or_new_bridge', 'why_they_now_act'],
    },
    human_leverage: {
      type: 'object' as const,
      properties: {
        what_they_can_take_or_offer: { type: 'string' as const },
        what_they_need_from_pc: { type: 'string' as const },
      },
      required: ['what_they_can_take_or_offer', 'what_they_need_from_pc'],
    },
    worsened_detail: {
      type: 'object' as const,
      properties: {
        prior_detail: { type: 'string' as const },
        why_it_is_load_bearing_now: { type: 'string' as const },
      },
      required: ['prior_detail', 'why_it_is_load_bearing_now'],
    },
    offscreen_antagonist_presence: { type: 'string' as const },
    procedure_budget: {
      type: 'object' as const,
      properties: {
        mechanism: {
          type: 'string' as const,
          description: 'One allowed mechanism, or "none".',
        },
        owner_using_it: {
          type: 'string' as const,
          description: 'Person/faction/institution using the mechanism for leverage, or "none".',
        },
        dramatic_function: {
          type: 'string' as const,
          description: 'How the mechanism changes leverage or forces an irreversible choice.',
        },
        max_opening_beats: {
          type: 'number' as const,
          description: 'Maximum opening beats the mechanism may occupy. Use 0 or 1.',
        },
      },
      required: ['mechanism', 'owner_using_it', 'dramatic_function', 'max_opening_beats'],
    },
  },
  required: [
    'prior_chapter_meant',
    'larger_pattern_revealed',
    'pressure_owner',
    'human_leverage',
    'worsened_detail',
    'offscreen_antagonist_presence',
    'procedure_budget',
  ],
}

const pressureLadderSchema = {
  type: 'array' as const,
  description:
    'Exactly 3 ordered pressure-tightening steps. Use trigger_event for the canonical trigger; code derives the scene-invariant trigger condition from it.',
  minItems: 3,
  maxItems: 3,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const },
      pressure: { type: 'string' as const, description: '≤18 words.' },
      trigger_event: {
        type: 'object' as const,
        description:
          'Structured crossing event. Use entity_action for people/faction choices, location_objective only when the location is a durable objective anchor, and late_unresolved for state-derived chapter pressure.',
        properties: {
          kind: {
            type: 'string' as const,
            enum: ['entity_action', 'location_objective', 'late_unresolved'],
            description:
              'entity_action rejects incidental scene coupling; location_objective allows a true durable location anchor; late_unresolved is state-derived.',
          },
          actor_id: {
            type: 'string' as const,
            description: 'Entity/person/faction id or "the PC" taking the pressure-crossing action.',
          },
          action: {
            type: 'string' as const,
            enum: [
              'refuses',
              'demands_cost_from',
              'exposes',
              'betrays',
              'protects',
              'threatens',
              'calls_in_debt_from',
              'withholds',
              'commits_against',
              'escalates_authority_over',
              'forces_choice_on',
              'retrieves_from',
              'secures_at',
              'delivers_to',
              'removes_from',
              'late_chapter_unresolved',
            ],
          },
          target_id: {
            type: 'string' as const,
            description: 'Entity, object, thread, person, faction, or "the PC" affected by the action.',
          },
          location_id: {
            type: 'string' as const,
            description:
              'Required for location_objective. Canonical durable location id/name, not incidental scene staging.',
          },
          stakes: {
            type: 'string' as const,
            description:
              'Human, relational, reputation, safety, freedom, or loyalty cost made visible.',
          },
        },
        required: ['kind', 'actor_id', 'action', 'target_id', 'stakes'],
      },
      trigger_condition: {
        type: 'string' as const,
        description:
          'Legacy mirror only. If emitted, match trigger_event. The runtime uses the code-derived canonical condition from trigger_event.',
      },
      narrative_effect: { type: 'string' as const, description: '≤22 words.' },
      severity: { type: 'string' as const, enum: ['standard', 'hard'] },
    },
    required: ['id', 'pressure', 'trigger_event', 'narrative_effect'],
  },
}

const humanStakesSchema = {
  type: 'array' as const,
  description:
    '2-3 human consequences this chapter can put at risk. At least one who_pays must be a starting_npcs id.',
  minItems: 2,
  maxItems: 3,
  items: {
    type: 'object' as const,
    properties: {
      who_pays: {
        type: 'string' as const,
        description: 'NPC id from starting_npcs preferred, or "the PC".',
      },
      cost_surface: {
        type: 'string' as const,
        enum: ['standing', 'freedom', 'loyalty', 'relationship', 'safety', 'reputation'],
      },
      what_is_lost: {
        type: 'string' as const,
        description: 'Human cost, 1 sentence, ≤24 words.',
      },
      triggering_pressure: {
        type: 'string' as const,
        description: 'active_threads id that realizes/threatens this stake.',
      },
    },
    required: ['who_pays', 'cost_surface', 'what_is_lost', 'triggering_pressure'],
  },
}

const possibleRevelationsSchema = {
  type: 'array' as const,
  description:
    'Exactly 2 hidden truths that reframe human agency, coercion, betrayal, exposure, danger, obligation, identity, power, or relationship stakes. Not procedural facts with names attached.',
  minItems: 2,
  maxItems: 2,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const },
      statement: {
        type: 'string' as const,
        description:
          'One sentence, ≤24 words. Hidden human/faction truth, not a filing/log/timestamp unless it exposes who acted, benefits, pays, or is endangered.',
      },
      held_by: { type: 'string' as const },
      emergence_condition: { type: 'string' as const, description: '≤22 words.' },
      recontextualizes: {
        type: 'string' as const,
        description:
          '≤22 words. Name what relationship, pressure, decision, danger, or obligation changes meaning.',
      },
      hint_phrases: {
        type: 'array' as const,
        description: 'Outbound: 3 short substrings the Narrator can plant in prose before this reveal fires.',
        items: { type: 'string' as const },
      },
      player_topic_keys: {
        type: 'array' as const,
        description:
          'Inbound: 2-5 short player-input phrases or entity ids that mean the player is pressing this reveal topic directly.',
        items: { type: 'string' as const },
      },
      cash_conditions: {
        type: 'object' as const,
        description:
          'Optional deterministic cash-out gates. Use when direct player pressure, turn count, thread tension, or reveal context should make the reveal due before Narrator prose.',
        properties: {
          player_presses_topic: {
            type: 'boolean' as const,
            description: 'True when matching player_topic_keys should make this reveal due.',
          },
          min_turn: {
            type: 'number' as const,
            description: 'Earliest zero-based turn index when this reveal can cash out.',
          },
          min_tension: {
            type: 'object' as const,
            properties: {
              thread_id: { type: 'string' as const },
              value: { type: 'number' as const, description: 'Minimum thread tension, 0-10.' },
            },
            required: ['thread_id', 'value'],
          },
          requires_context: {
            type: 'array' as const,
            description: 'Player-input/reveal contexts required for due-ness.',
            items: {
              type: 'string' as const,
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
          },
        },
      },
      hints_required: {
        type: 'number' as const,
        description: 'Minimum hint count before reveal is earned. Default 2; use 3 for major arc reveals.',
      },
      valid_reveal_contexts: {
        type: 'array' as const,
        description: 'Contexts where this reveal may legally land.',
        items: {
          type: 'string' as const,
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
      },
      invalid_reveal_contexts: {
        type: 'array' as const,
        description: 'Contexts where this reveal should not land, even if hints are satisfied.',
        items: {
          type: 'string' as const,
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
      },
    },
    required: ['id', 'statement', 'held_by', 'emergence_condition', 'recontextualizes'],
  },
}

const moralFaultLinesSchema = {
  type: 'array' as const,
  description: 'Exactly 2 chapter tensions.',
  minItems: 2,
  maxItems: 2,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const },
      tension: { type: 'string' as const, description: '≤16 words.' },
      side_a: { type: 'string' as const, description: '≤12 words.' },
      side_b: { type: 'string' as const, description: '≤12 words.' },
      why_it_hurts: { type: 'string' as const, description: '≤18 words.' },
    },
    required: ['id', 'tension', 'side_a', 'side_b', 'why_it_hurts'],
  },
}

const escalationOptionsSchema = {
  type: 'array' as const,
  description: 'Exactly 3 ways the world can tighten.',
  minItems: 3,
  maxItems: 3,
  items: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const },
      type: { type: 'string' as const, enum: ['bureaucratic', 'social', 'institutional', 'physical'] },
      condition: { type: 'string' as const, description: '≤18 words.' },
      consequence: { type: 'string' as const, description: '≤18 words.' },
    },
    required: ['id', 'type', 'condition', 'consequence'],
  },
}

const editorializedLoreSchema = {
  type: 'array' as const,
  description: 'Exactly 2 lore items relevant to THIS chapter.',
  minItems: 2,
  maxItems: 2,
  items: {
    type: 'object' as const,
    properties: {
      item: { type: 'string' as const, description: '≤12 words.' },
      relevance_now: { type: 'string' as const, description: '≤16 words.' },
      delivery_method: { type: 'string' as const, description: '≤16 words.' },
    },
    required: ['item', 'relevance_now', 'delivery_method'],
  },
}

export const authorChapterSpineTool: Anthropic.Tool = {
  name: AUTHOR_SPINE_TOOL_NAME,
  description:
    'Emit chapter spine: frame, cast, threads, opening. Call ONCE per spine pass. Pressure surface (ladder, revelations, fault lines, escalation, lore) goes in a separate later call.',
  input_schema: {
    type: 'object' as const,
    properties: {
      // chapter_frame is intentionally first. Tool-call generation degrades on
      // tail fields of long schemas; the frame's outcome_spectrum is the
      // densest nested object and the most crash-prone if truncated.
      chapter_frame: chapterFrameSchema,
      opening_scene_spec: openingSceneSpecSchema,
      antagonist_field: antagonistFieldSchema,
      starting_npcs: startingNpcsSchema,
      active_threads: activeThreadsSchema,
      thread_transitions: threadTransitionsSchema,
    },
    required: [
      'chapter_frame',
      'opening_scene_spec',
      'antagonist_field',
      'starting_npcs',
      'active_threads',
    ],
  },
}

export const authorPressureSurfaceTool: Anthropic.Tool = {
  name: AUTHOR_SURFACE_TOOL_NAME,
  description:
    'Emit chapter escalation surface: pressure ladder, revelations, fault lines, escalation options, lore. Derived from the spine you authored in the prior tool call. Call ONCE per surface pass.',
  input_schema: {
    type: 'object' as const,
    properties: {
      pressure_ladder: pressureLadderSchema,
      possible_revelations: possibleRevelationsSchema,
      moral_fault_lines: moralFaultLinesSchema,
      escalation_options: escalationOptionsSchema,
      editorialized_lore: editorializedLoreSchema,
    },
    required: [
      'pressure_ladder',
      'possible_revelations',
      'moral_fault_lines',
      'escalation_options',
      'editorialized_lore',
    ],
  },
}

export const authorChapterSetupTool: Anthropic.Tool = {
  name: AUTHOR_TOOL_NAME,
  description:
    'Emit the full chapter setup in one call: frame, opening, cast, threads, arc link, pacing contract, pressure surface, and optional continuation moves.',
  input_schema: {
    type: 'object' as const,
    properties: {
      chapter_frame: chapterFrameSchema,
      opening_scene_spec: openingSceneSpecSchema,
      antagonist_field: antagonistFieldSchema,
      starting_npcs: startingNpcsSchema,
      active_threads: activeThreadsSchema,
      thread_transitions: threadTransitionsSchema,
      arc_link: arcLinkSchema,
      pacing_contract: pacingContractSchema,
      continuation_moves: continuationMovesSchema,
      continuation_dramatic_turn: continuationDramaticTurnSchema,
      pressure_ladder: pressureLadderSchema,
      human_stakes: humanStakesSchema,
      possible_revelations: possibleRevelationsSchema,
      moral_fault_lines: moralFaultLinesSchema,
      escalation_options: escalationOptionsSchema,
      editorialized_lore: editorializedLoreSchema,
    },
    required: [
      'chapter_frame',
      'opening_scene_spec',
      'antagonist_field',
      'starting_npcs',
      'active_threads',
      'arc_link',
      'pacing_contract',
      'pressure_ladder',
      'human_stakes',
      'possible_revelations',
      'moral_fault_lines',
      'escalation_options',
      'editorialized_lore',
    ],
  },
}

export const AUTHOR_SPINE_TOOLS: Anthropic.Tool[] = [authorChapterSpineTool]
export const AUTHOR_SURFACE_TOOLS: Anthropic.Tool[] = [authorPressureSurfaceTool]
export const AUTHOR_TOOLS: Anthropic.Tool[] = [authorChapterSetupTool]
