// Narrator tool schema — mechanical + annotation only.
// The Narrator CANNOT emit narrative-state writes (create_npc, thread status
// transitions, anchoring, etc.). Those live on the Archivist and are enforced
// via the firewall actor rule.

import type Anthropic from '@anthropic-ai/sdk'

export const NARRATOR_TOOL_NAME = 'narrate_turn' as const
export const REQUEST_ROLL_TOOL_NAME = 'request_roll' as const

export const requestRollTool: Anthropic.Tool = {
  name: REQUEST_ROLL_TOOL_NAME,
  description:
    'Pause narration mid-turn and request a d20 skill check. Call this INSIDE a turn, BEFORE narrate_turn, at the moment of uncertainty. Narrate up to the moment of action (setup, tension, what the PC is attempting), then call request_roll. STOP narrating — the stream pauses. When you receive the roll result, continue narrating the outcome (fail-forward on a miss). At the end of the turn, call narrate_turn once to commit.',
  input_schema: {
    type: 'object' as const,
    properties: {
      skill: { type: 'string', description: 'Skill or ability name (e.g. "Insight", "Investigation", "Persuasion", "Stealth").' },
      dc: { type: 'number', description: 'Difficulty class 5-25. For level-1 play, 12 easy, 15 meaningful standard, 18 hard/clutch, 20 very hard. Do not stack DC 18s against the same pressure surface.' },
      why: { type: 'string', description: 'One-sentence reason this check is required.' },
      consequence_on_fail: { type: 'string', description: 'What fails forward on a miss — the specific world-response pattern the PC lives through on failure.' },
      modifier_type: { type: 'string', enum: ['advantage', 'disadvantage', 'challenge'], description: 'Optional code-resolved modifier. Use advantage/disadvantage for strong fictional positioning. Use challenge for unusually hard pressure (+2 effective DC). Inspiration is not requested here; the player may spend it after a failed roll.' },
      modifier_reason: { type: 'string', description: 'One short clause anchoring why the modifier applies.' },
    },
    required: ['skill', 'dc', 'why', 'consequence_on_fail'],
  },
}

export const narrateTurnTool: Anthropic.Tool = {
  name: NARRATOR_TOOL_NAME,
  description:
    'Commit the turn once narrative prose is complete. Emit the compact annotation (hint for the Archivist) plus player-visible mechanical effects and the next quick actions. Never include durable narrative-state writes here — NPC creation, thread status changes, and anchoring are the Archivist\'s job. Call ONCE at the end of every turn, AFTER any request_roll has been resolved.',
  input_schema: {
    type: 'object' as const,
    properties: {
      mechanical_effects: {
        type: 'array',
        description:
          'Player-visible mechanical effects this turn: HP, credits, inventory use, location moves, scene endings, scene snapshots. Nothing narrative-structural.',
        items: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: [
                'hp_delta',
                'credits_delta',
                'inventory_use',
                'set_location',
                'scene_end',
                'set_scene_snapshot',
              ],
            },
            value: { type: 'number', description: 'For hp_delta or credits_delta (signed).' },
            item: { type: 'string', description: 'Item name for inventory_use.' },
            reason: { type: 'string', description: 'Why this happened (one clause).' },
            location_id: { type: 'string', description: 'For set_location.' },
            name: { type: 'string', description: 'For set_location: display name for a new location.' },
            description: { type: 'string', description: 'For set_location: one-line location description.' },
            atmospheric_conditions: {
              type: 'array',
              items: { type: 'string' },
              description: 'For set_location: short atmospheric tags, first tag appears in the UI rail.',
            },
            locked: { type: 'boolean', description: 'For set_location or set_scene_snapshot: known but not currently accessible.' },
            leads_to: {
              type: 'string',
              enum: ['unanswered_question', 'kinetic_carry', 'relational_tension', 'unpaid_promise', 'null'],
              description: 'For scene_end: what the ending leaves behind.',
            },
            summary: { type: 'string', description: 'For scene_end: one-line summary.' },
            snapshot: {
              type: 'object',
              description: 'For set_scene_snapshot: what is currently true in scene.',
              properties: {
                location_id: { type: 'string' },
                present_npc_ids: { type: 'array', items: { type: 'string' } },
                time_label: { type: 'string' },
                established: { type: 'array', items: { type: 'string' } },
                locked: { type: 'boolean' },
              },
            },
          },
          required: ['kind'],
        },
      },
      hinted_entities: {
        type: 'object',
        description:
          'A *hint* to the Archivist about what narrative-state activity occurred. The Archivist treats prose as ground truth — these hints help with anchor inference and flag unusual moves.',
        properties: {
          npcs_mentioned: {
            type: 'array',
            description: 'NPC ids (existing) or new names the Archivist should canonicalize.',
            items: { type: 'string' },
          },
          threads_touched: {
            type: 'array',
            description: 'Thread ids (existing) or short titles the Archivist should match.',
            items: { type: 'string' },
          },
          decisions_implied: {
            type: 'array',
            description: 'Plain-language statements of PC choices the player just made.',
            items: { type: 'string' },
          },
          promises_implied: {
            type: 'array',
            description: 'Plain-language statements of commitments the PC just made.',
            items: { type: 'string' },
          },
          clues_dropped: {
            type: 'array',
            description: 'Plain-language statements of observed facts the PC could act on.',
            items: { type: 'string' },
          },
        },
      },
      authorial_moves: {
        type: 'object',
        description: 'Deliberate authorial moves the GM wants on the record.',
        properties: {
          planted_revelation_deployed: {
            type: 'string',
            description: 'Revelation id if this turn deployed one.',
          },
          witness_mark_surfaced: {
            type: 'string',
            description: 'Witness-mark id if this turn surfaced one.',
          },
          pivot_signaled: { type: 'boolean' },
        },
      },
      suggested_actions: {
        type: 'array',
        description:
          "3-4 quick actions for the next player input. Each should pair a concrete action with emotional framing, physical detail, or underlying intent. **Grounding rule: only reference people, places, or facts the player has actually seen in prose this chapter.** An NPC appearing in the scene packet's cast list is NOT sufficient — the player must have been shown them in the Narrator's prose. If you want to suggest an action involving someone the packet shows but the prose hasn't surfaced, either introduce them in this turn's prose first, or choose a different action.",
        items: { type: 'string' },
      },
    },
    required: ['suggested_actions'],
  },
}

export const NARRATOR_TOOLS: Anthropic.Tool[] = [requestRollTool, narrateTurnTool]
