import type Anthropic from '@anthropic-ai/sdk'

export const ARC_AUTHOR_TOOL_NAME = 'author_arc_setup' as const

const sourceHookSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const },
    premise: { type: 'string' as const },
    objective: { type: 'string' as const },
    crucible: { type: 'string' as const },
    first_episode: { type: 'string' as const },
  },
  required: ['title', 'premise', 'crucible'],
}

const scenarioShapeSchema = {
  type: 'object' as const,
  properties: {
    mode: {
      type: 'string' as const,
      enum: [
        'public_crisis',
        'pursuit',
        'protection',
        'investigation',
        'chamber_play',
        'revolt',
        'extraction',
        'superior_fallout',
        'underground_network',
        'procedural_contest',
        'siege',
        'other',
      ],
    },
    premise: { type: 'string' as const, description: 'One sentence, ≤24 words.' },
    why_this_run: { type: 'string' as const, description: 'One sentence, ≤22 words.' },
    what_this_is_not: { type: 'string' as const, description: 'One sentence, ≤18 words.' },
    selection_rationale: {
      type: 'string' as const,
      description: 'One sentence, ≤24 words. Name the tradeoff, not a full analysis.',
    },
    rejected_default_shape: {
      type: 'string' as const,
      description:
        'One sentence, ≤20 words. Name the obvious default shape rejected or intentionally chosen.',
    },
  },
  required: [
    'mode',
    'premise',
    'why_this_run',
    'what_this_is_not',
    'selection_rationale',
    'rejected_default_shape',
  ],
}

export const arcAuthorTool: Anthropic.Tool = {
  name: ARC_AUTHOR_TOOL_NAME,
  description:
    'Author one stable 4-5 chapter arc pressure field from the hook. Do not author a chapter opening.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string' as const, description: 'arc_<snake_case_title>' },
      title: { type: 'string' as const },
      source_hook: sourceHookSchema,
      scenario_shape: scenarioShapeSchema,
      arc_question: { type: 'string' as const },
      core_crucible: { type: 'string' as const },
      invariant_facts: {
        type: 'array' as const,
        description: 'Exactly 3 short facts.',
        minItems: 3,
        maxItems: 3,
        items: { type: 'string' as const },
      },
      variable_truths_for_this_run: {
        type: 'array' as const,
        description: 'Exactly 2 short truths for this run.',
        minItems: 2,
        maxItems: 2,
        items: { type: 'string' as const },
      },
      durable_forces: {
        type: 'array' as const,
        description: 'Exactly 3 institutions, factions, networks, or pressure sources durable across chapters.',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            name: { type: 'string' as const },
            agenda: { type: 'string' as const, description: '≤12 words.' },
            leverage: { type: 'string' as const, description: '≤12 words.' },
            fear: { type: 'string' as const, description: '≤12 words.' },
            pressure_style: { type: 'string' as const, description: '≤12 words.' },
          },
          required: ['id', 'name', 'agenda', 'leverage', 'fear', 'pressure_style'],
        },
      },
      durable_npc_seeds: {
        type: 'array' as const,
        description: 'Exactly 3 reusable NPC roles. These are seeds, not all on-stage in Chapter 1.',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            role: { type: 'string' as const },
            affiliation: { type: 'string' as const },
            dramatic_function: { type: 'string' as const, description: '≤12 words.' },
            private_pressure: { type: 'string' as const, description: '≤12 words.' },
            reuse_guidance: { type: 'string' as const, description: '≤12 words.' },
          },
          required: ['id', 'role', 'affiliation', 'dramatic_function', 'private_pressure', 'reuse_guidance'],
        },
      },
      pressure_engines: {
        type: 'array' as const,
        description: 'Exactly 3 durable clocks or systemic pressures that can answer player actions.',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            name: { type: 'string' as const },
            aggregation: { type: 'string' as const, enum: ['max', 'average', 'weighted'] },
            advances_when: { type: 'string' as const, description: '≤14 words.' },
            slows_when: { type: 'string' as const, description: '≤14 words.' },
            visible_symptoms: { type: 'string' as const, description: '≤14 words.' },
          },
          required: ['id', 'name', 'advances_when', 'slows_when', 'visible_symptoms'],
        },
      },
      player_stance_axes: {
        type: 'array' as const,
        description: 'Exactly 3 axes the arc can respond to as the player aligns or flips.',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            axis: { type: 'string' as const },
            pole_a: { type: 'string' as const },
            pole_b: { type: 'string' as const },
            signals_a: {
              type: 'array' as const,
              description: 'Exactly 2 short signals.',
              minItems: 2,
              maxItems: 2,
              items: { type: 'string' as const },
            },
            signals_b: {
              type: 'array' as const,
              description: 'Exactly 2 short signals.',
              minItems: 2,
              maxItems: 2,
              items: { type: 'string' as const },
            },
            if_a_hardens: { type: 'string' as const, description: '≤14 words.' },
            if_b_hardens: { type: 'string' as const, description: '≤14 words.' },
          },
          required: ['id', 'axis', 'pole_a', 'pole_b', 'signals_a', 'signals_b', 'if_a_hardens', 'if_b_hardens'],
        },
      },
      chapter_function_map: {
        type: 'array' as const,
        description:
          'Exactly 5 chapter function slots. These are purposes, not scene sequences. The arc may resolve in Chapter 4 or 5, but still emit all five slots.',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object' as const,
          properties: {
            chapter: { type: 'number' as const },
            function: { type: 'string' as const, description: 'One sentence, ≤20 words.' },
            pressure_question: { type: 'string' as const, description: 'One question, ≤18 words.' },
            possible_end_states: {
              type: 'array' as const,
              description: 'Exactly 3 short states.',
              minItems: 3,
              maxItems: 3,
              items: { type: 'string' as const },
            },
          },
          required: ['chapter', 'function', 'pressure_question', 'possible_end_states'],
        },
      },
      possible_endgames: {
        type: 'array' as const,
        description: 'Exactly 3 concise endgames.',
        minItems: 3,
        maxItems: 3,
        items: { type: 'string' as const },
      },
    },
    required: [
      'id',
      'title',
      'source_hook',
      'scenario_shape',
      'arc_question',
      'core_crucible',
      'invariant_facts',
      'variable_truths_for_this_run',
      'durable_forces',
      'durable_npc_seeds',
      'pressure_engines',
      'player_stance_axes',
      'chapter_function_map',
      'possible_endgames',
    ],
  },
}

export const ARC_AUTHOR_TOOLS: Anthropic.Tool[] = [arcAuthorTool]
