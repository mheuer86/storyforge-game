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
    name: 'update_world',
    description:
      'Update world state: add or update NPCs, change current location, add/update factions, add/update narrative threads. Call this whenever the player encounters a new NPC, moves to a new location, or a thread changes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        addNpcs: {
          type: 'array',
          description: 'New NPCs to add to the known NPCs list.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string', description: 'Brief description of who they are' },
              lastSeen: { type: 'string', description: 'Current location or context' },
              relationship: { type: 'string', description: 'e.g. "hostile", "neutral", "ally", "contact"' },
            },
            required: ['name', 'description', 'lastSeen'],
          },
        },
        updateNpc: {
          type: 'object',
          description: 'Update an existing NPC (matched by name).',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            lastSeen: { type: 'string' },
            relationship: { type: 'string' },
          },
          required: ['name'],
        },
        setLocation: {
          type: 'object',
          description: 'Update the current location.',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        addThread: {
          type: 'object',
          description: 'Add a new narrative thread.',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            deteriorating: { type: 'boolean' },
          },
          required: ['id', 'title', 'status', 'deteriorating'],
        },
        updateThread: {
          type: 'object',
          description: 'Update an existing thread status (matched by id).',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            deteriorating: { type: 'boolean' },
          },
          required: ['id', 'status'],
        },
        addFaction: {
          type: 'object',
          description: 'Add or update a faction.',
          properties: {
            name: { type: 'string' },
            stance: { type: 'string' },
          },
          required: ['name', 'stance'],
        },
        addPromise: {
          type: 'object',
          description: 'Record a promise or debt the player has made.',
          properties: {
            id: { type: 'string', description: 'Unique ID (snake_case)' },
            to: { type: 'string', description: 'Who the promise was made to' },
            what: { type: 'string', description: 'What was promised' },
            status: { type: 'string', enum: ['open', 'fulfilled', 'broken'] },
          },
          required: ['id', 'to', 'what', 'status'],
        },
        updatePromise: {
          type: 'object',
          description: 'Update the status of an existing promise (matched by id).',
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['open', 'fulfilled', 'broken'] },
          },
          required: ['id', 'status'],
        },
      },
    },
  },
  {
    name: 'close_chapter',
    description:
      'Close the current chapter and open the next one. Call this at a natural narrative break — when a major arc resolves, a significant time jump occurs, or the story moves to a clearly new phase. The player\'s message history is windowed to the current chapter only — chapter summaries are the sole long-term narrative memory, so write them carefully.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: '2-3 sentence narrative summary: what happened, what was won or lost, how the world changed.',
        },
        keyEvents: {
          type: 'array',
          description: '3-5 key events from this chapter (decisions made, people met, consequences taken).',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 6,
        },
        nextTitle: {
          type: 'string',
          description: 'Title for the upcoming chapter.',
        },
      },
      required: ['summary', 'keyEvents', 'nextTitle'],
    },
  },
  {
    name: 'update_antagonist',
    description:
      'Establish or update the primary antagonist and record their offscreen moves. Use "establish" on first appearance to define their identity. Use "move" once per chapter to execute Rule 4 — the antagonist acts regardless of how well the player is doing. Check movedThisChapter in game state before calling — only one move per chapter.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['establish', 'move'],
          description: '"establish" sets up the antagonist identity (call once, early in the story). "move" records one offscreen action this chapter.',
        },
        name: {
          type: 'string',
          description: 'Antagonist name (required for establish).',
        },
        description: {
          type: 'string',
          description: 'Who they are — their role, affiliation, and what makes them dangerous (required for establish).',
        },
        agenda: {
          type: 'string',
          description: 'What they want — their goal that puts them in conflict with the player (required for establish).',
        },
        moveDescription: {
          type: 'string',
          description: 'What they did offscreen this chapter — concrete and consequential (required for move).',
        },
      },
      required: ['action'],
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
