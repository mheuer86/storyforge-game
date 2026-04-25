// Author tool schema — chapter setup only. One tool, one call per chapter boundary.
// The Author cannot emit mechanical effects, narrative-state writes, or prose.
// Firewall actor rule enforces the split.

import type Anthropic from '@anthropic-ai/sdk'

export const AUTHOR_TOOL_NAME = 'author_setup' as const

export const authorSetupTool: Anthropic.Tool = {
  name: AUTHOR_TOOL_NAME,
  description:
    'Emit the structured chapter setup as a single JSON tool call. Follow the output length caps from the role block. Call ONCE per Author run.',
  input_schema: {
    type: 'object' as const,
    properties: {
      chapter_frame: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          premise: { type: 'string' },
          active_pressure: { type: 'string' },
          central_tension: { type: 'string' },
          chapter_scope: { type: 'string' },
          objective: { type: 'string' },
          crucible: { type: 'string' },
          outcome_spectrum: {
            type: 'object',
            properties: {
              clean: { type: 'string' },
              costly: { type: 'string' },
              failure: { type: 'string' },
              catastrophic: { type: 'string' },
            },
            required: ['clean', 'costly', 'failure', 'catastrophic'],
          },
        },
        required: [
          'title',
          'premise',
          'active_pressure',
          'central_tension',
          'chapter_scope',
          'objective',
          'crucible',
          'outcome_spectrum',
        ],
      },
      antagonist_field: {
        type: 'object',
        properties: {
          source_system: { type: 'string' },
          core_pressure: { type: 'string' },
          default_face: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string' },
              pressure_style: { type: 'string' },
            },
            required: ['name', 'role', 'pressure_style'],
          },
          possible_faces: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                becomes_primary_when: { type: 'string' },
                pressure_style: { type: 'string' },
              },
              required: ['id', 'name', 'role', 'becomes_primary_when', 'pressure_style'],
            },
          },
          escalation_logic: { type: 'string' },
        },
        required: ['source_system', 'core_pressure', 'default_face', 'possible_faces', 'escalation_logic'],
      },
      starting_npcs: {
        type: 'array',
        description: '3-5 NPCs.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'npc_<snake_case_name>' },
            name: { type: 'string' },
            affiliation: { type: 'string' },
            role: { type: 'string' },
            voice_register: { type: 'string' },
            dramatic_function: { type: 'string' },
            hidden_pressure: { type: 'string' },
            retrieval_cue: { type: 'string' },
            initial_disposition: {
              type: 'string',
              enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
              description:
                "How this NPC feels about the PC at scene open, grounded in the power dynamic and pressure system. The PC's origin/class and the chapter's hook shape this — a Warden collecting the tithe walking into a village is not met with 'neutral'; the elder is wary, the parents are hostile, the collaborator is favorable. Default to 'neutral' ONLY when there is no prior power dynamic worth encoding.",
            },
            disposition_reason: {
              type: 'string',
              description:
                'One short line explaining why this starting disposition, grounded in the PC/NPC relationship given the hook. Used by the Narrator to voice the NPC accordingly.',
            },
          },
          required: [
            'id',
            'name',
            'affiliation',
            'role',
            'voice_register',
            'dramatic_function',
            'hidden_pressure',
            'retrieval_cue',
            'initial_disposition',
            'disposition_reason',
          ],
        },
      },
      active_threads: {
        type: 'array',
        description: '3-5 threads.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'thread_<snake_case_subject>' },
            title: { type: 'string' },
            question: { type: 'string' },
            owner_hint: { type: 'string', description: 'NPC name or faction id' },
            tension: { type: 'number', description: '0-10' },
            resolution_criteria: { type: 'string' },
            failure_mode: { type: 'string' },
            retrieval_cue: { type: 'string' },
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
      },
      pressure_ladder: {
        type: 'array',
        description: '3-5 ordered pressure-tightening steps.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            pressure: { type: 'string' },
            trigger_condition: { type: 'string' },
            narrative_effect: { type: 'string' },
          },
          required: ['id', 'pressure', 'trigger_condition', 'narrative_effect'],
        },
      },
      possible_revelations: {
        type: 'array',
        description: '2-4 latent truths.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            statement: { type: 'string' },
            held_by: { type: 'string' },
            emergence_condition: { type: 'string' },
            recontextualizes: { type: 'string' },
          },
          required: ['id', 'statement', 'held_by', 'emergence_condition', 'recontextualizes'],
        },
      },
      moral_fault_lines: {
        type: 'array',
        description: '2-4 chapter tensions.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tension: { type: 'string' },
            side_a: { type: 'string' },
            side_b: { type: 'string' },
            why_it_hurts: { type: 'string' },
          },
          required: ['id', 'tension', 'side_a', 'side_b', 'why_it_hurts'],
        },
      },
      escalation_options: {
        type: 'array',
        description: '3-5 ways the world can tighten.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['bureaucratic', 'social', 'institutional', 'physical'] },
            condition: { type: 'string' },
            consequence: { type: 'string' },
          },
          required: ['id', 'type', 'condition', 'consequence'],
        },
      },
      editorialized_lore: {
        type: 'array',
        description: '2-3 lore items relevant to THIS chapter.',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            relevance_now: { type: 'string' },
            delivery_method: { type: 'string' },
          },
          required: ['item', 'relevance_now', 'delivery_method'],
        },
      },
      thread_transitions: {
        type: 'array',
        description:
          'OPTIONAL. Transitions to apply to EXISTING campaign threads (from the Active carry-forward list) at chapter open. Use this to close threads whose resolutionCriteria was met in the prior chapter\'s prose but was not transitioned during play. Each entry names an existing thread id (not a new one) and the status to transition to. If the resolution opens a successor question, ALSO emit the successor as a new entry in active_threads with a new thread_<id>. Leave this array empty if no carried threads need closure.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'existing thread id from the carry-forward list' },
            to_status: {
              type: 'string',
              enum: [
                'resolved_clean',
                'resolved_costly',
                'resolved_failure',
                'resolved_catastrophic',
                'abandoned',
                'deferred',
              ],
            },
            reason: { type: 'string', description: 'one-line reason grounded in prior-chapter prose' },
          },
          required: ['id', 'to_status', 'reason'],
        },
      },
      opening_scene_spec: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          atmospheric_condition: { type: 'string' },
          initial_state: { type: 'string' },
          first_player_facing: { type: 'string' },
          immediate_choice: { type: 'string' },
          no_starting_combat: { type: 'boolean' },
          no_exposition_dump: { type: 'boolean' },
          visible_npc_ids: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Which starting_npcs are ON-STAGE in the opening prose. **Target: 1-2 NPCs.** The other startingNPCs exist in the chapter but are off-stage at opening — they arrive, get referenced secondhand, or are encountered later. Dumping all 3-5 startingNPCs on-stage at opening forces a convened-room tableau (table, hearing, audit) regardless of hook — avoid that.',
          },
          withheld_premise_facts: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Canonical premise facts that are TRUE in state but NOT stated in the opening prose. Held back so the player discovers them through play, not announced up front. Empty list is fine when the opening legitimately puts all premise facts in motion.',
          },
        },
        required: [
          'location',
          'atmospheric_condition',
          'initial_state',
          'first_player_facing',
          'immediate_choice',
          'no_starting_combat',
          'no_exposition_dump',
          'visible_npc_ids',
          'withheld_premise_facts',
        ],
      },
    },
    required: [
      'chapter_frame',
      'antagonist_field',
      'starting_npcs',
      'active_threads',
      'pressure_ladder',
      'possible_revelations',
      'moral_fault_lines',
      'escalation_options',
      'editorialized_lore',
      'opening_scene_spec',
    ],
  },
}

export const AUTHOR_TOOLS: Anthropic.Tool[] = [authorSetupTool]
