import type Anthropic from '@anthropic-ai/sdk'

export const gameTools: Anthropic.Tool[] = [
  {
    name: 'update_character',
    description:
      'Modify the character\'s game state: HP changes, credit changes, inventory additions/removals, temporary modifiers, or trait usage. Call this immediately whenever any of these values change — do not wait until the end of the response.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hpChange: {
          type: 'number',
          description: 'HP change (negative for damage, positive for healing). Use this for relative changes.',
        },
        hpSet: {
          type: 'number',
          description: 'Set HP to this exact value (overrides hpChange). Use when setting HP directly.',
        },
        creditsChange: {
          type: 'number',
          description: 'Credit change (negative for spending, positive for earning).',
        },
        inventoryAdd: {
          type: 'array',
          description: 'Items to add to inventory.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique ID (use snake_case name)' },
              name: { type: 'string' },
              description: { type: 'string' },
              quantity: { type: 'number' },
              damage: { type: 'string', description: 'e.g. "1d8 energy"' },
              effect: { type: 'string', description: 'For consumables, e.g. "Heals 1d8+WIS HP"' },
              charges: { type: 'number' },
              maxCharges: { type: 'number' },
            },
            required: ['id', 'name', 'description', 'quantity'],
          },
        },
        inventoryRemove: {
          type: 'array',
          description: 'IDs of items to remove from inventory.',
          items: { type: 'string' },
        },
        inventoryUse: {
          type: 'object',
          description: 'Use one charge/unit of a consumable item.',
          properties: {
            id: { type: 'string', description: 'Item ID to consume one unit of' },
          },
          required: ['id'],
        },
        tempModifierAdd: {
          type: 'object',
          description: 'Add a temporary stat modifier (e.g. combat stim, environmental effect).',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            stat: {
              type: 'string',
              enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA', 'AC', 'attack', 'all'],
            },
            value: { type: 'number' },
            duration: { type: 'string', description: 'e.g. "this encounter", "1 hour"' },
          },
          required: ['id', 'name', 'stat', 'value', 'duration'],
        },
        tempModifierRemove: {
          type: 'string',
          description: 'ID of temp modifier to remove.',
        },
        traitUpdate: {
          type: 'object',
          description: 'Update remaining uses of a class trait.',
          properties: {
            name: { type: 'string', description: 'Trait name exactly as defined' },
            usesRemaining: { type: 'number' },
          },
          required: ['name', 'usesRemaining'],
        },
      },
    },
  },
  {
    name: 'request_roll',
    description:
      'Request a d20 skill check. Call this before narrating the outcome of any action that has a meaningful chance of failure. The system will auto-resolve the roll and return the result to you so you can narrate the outcome.',
    input_schema: {
      type: 'object' as const,
      properties: {
        checkType: {
          type: 'string',
          description: 'The skill or ability being checked (e.g. "Stealth", "Persuasion", "Athletics", "Piloting", "Hacking", "Medicine")',
        },
        stat: {
          type: 'string',
          enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
          description: 'The governing ability stat.',
        },
        dc: {
          type: 'number',
          description: 'Difficulty Class. Easy: 8, Moderate: 12, Hard: 16, Very Hard: 20.',
        },
        modifier: {
          type: 'number',
          description: 'Total modifier to add to the roll (stat modifier + proficiency bonus if proficient).',
        },
        reason: {
          type: 'string',
          description: 'Brief in-narrative reason for the check (shown to the player).',
        },
      },
      required: ['checkType', 'stat', 'dc', 'modifier', 'reason'],
    },
  },
  {
    name: 'start_combat',
    description: 'Start a combat encounter. Call this when a fight begins.',
    input_schema: {
      type: 'object' as const,
      properties: {
        enemies: {
          type: 'array',
          description: 'All enemies in this encounter.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique ID (snake_case)' },
              name: { type: 'string' },
              hp: {
                type: 'object',
                properties: {
                  current: { type: 'number' },
                  max: { type: 'number' },
                },
                required: ['current', 'max'],
              },
              ac: { type: 'number' },
              attackBonus: { type: 'number', description: 'Bonus added to their attack rolls' },
              damage: { type: 'string', description: 'Damage dice, e.g. "1d6+2"' },
              description: { type: 'string', description: 'Brief visual description' },
            },
            required: ['id', 'name', 'hp', 'ac', 'attackBonus', 'damage'],
          },
        },
        description: {
          type: 'string',
          description: 'Brief description of how the encounter starts.',
        },
      },
      required: ['enemies', 'description'],
    },
  },
  {
    name: 'end_combat',
    description: 'End the current combat encounter. Call when enemies are defeated, fled, or the player escapes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        outcome: {
          type: 'string',
          enum: ['victory', 'fled', 'enemies_fled', 'negotiated'],
          description: 'How combat ended.',
        },
        loot: {
          type: 'array',
          description: 'Items gained from this combat (if any). Will be added to inventory automatically.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              quantity: { type: 'number' },
              damage: { type: 'string' },
              effect: { type: 'string' },
              charges: { type: 'number' },
              maxCharges: { type: 'number' },
            },
            required: ['id', 'name', 'description', 'quantity'],
          },
        },
        creditsGained: {
          type: 'number',
          description: 'Credits looted from enemies (if any).',
        },
      },
      required: ['outcome'],
    },
  },
  {
    name: 'suggest_actions',
    description:
      'Provide 3-4 quick action options for the player. REQUIRED at the end of every narrative response. Actions should be concrete, contextually appropriate, and varied (not just "attack", "retreat", "hide"). Include at least one unexpected or creative option when the scene allows.',
    input_schema: {
      type: 'object' as const,
      properties: {
        actions: {
          type: 'array',
          description: '3-4 action options.',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 4,
        },
      },
      required: ['actions'],
    },
  },
  {
    name: 'meta_response',
    description:
      'Answer an out-of-character question from the player. Use this ONLY when the message is prefixed with [META]. Answer directly from game state. Do not advance the story.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The direct, factual answer to the player\'s question.',
        },
      },
      required: ['content'],
    },
  },
]
