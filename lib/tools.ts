import type Anthropic from '@anthropic-ai/sdk'

export const gameTools: Anthropic.Tool[] = [
  {
    name: 'update_character',
    description:
      'Modify the character\'s game state: HP changes, credit changes, inventory additions/removals, temporary modifiers, trait usage, or level-up progression. Call this immediately whenever any of these values change — do not wait until the end of the response.',
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
        levelUp: {
          type: 'object',
          description: 'Level up the character at chapter close. Increments level, increases HP max, updates proficiency bonus if threshold crossed. HP current is healed to new max. Call this immediately after close_chapter.',
          properties: {
            newLevel: { type: 'number', description: 'The new level (current level + 1).' },
            hpIncrease: { type: 'number', description: 'Amount to add to HP max (hit die average + CON modifier, minimum 1).' },
            newProficiencyBonus: { type: 'number', description: 'New proficiency bonus — only include if it changes at this level (L5: 3, L9: 4, L13: 5).' },
          },
          required: ['newLevel', 'hpIncrease'],
        },
        statIncrease: {
          type: 'array',
          description: 'Ability Score Improvement at levels 4, 8, 12. Array of stat increases: [{stat: "CHA", amount: 2}] for +2 to one stat, or [{stat: "CHA", amount: 1}, {stat: "WIS", amount: 1}] for +1 to two stats. Ask the player which stats before calling.',
          items: {
            type: 'object',
            properties: {
              stat: { type: 'string', enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] },
              amount: { type: 'number', description: '1 or 2' },
            },
            required: ['stat', 'amount'],
          },
        },
        exhaustionChange: {
          type: 'number',
          description: 'Change exhaustion level: +1 to add a level (sustained pressure, severe injury), -1 to remove a level (long rest, medical treatment). Range 0-6.',
        },
        addProficiency: {
          type: 'string',
          description: 'Add a new skill proficiency earned via Skill Point (e.g. "Stealth"). Call after presenting the choice narratively.',
        },
        upgradeToExpertise: {
          type: 'string',
          description: 'Upgrade an existing proficiency to expertise via Skill Point. The proficiency must already exist in the list. Stored with "(expertise)" suffix.',
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
        advantage: {
          type: 'string',
          enum: ['advantage', 'disadvantage'],
          description: 'Set to "advantage" (roll 2d20, take higher) or "disadvantage" (roll 2d20, take lower) when conditions warrant it. Omit for a normal roll. See ADVANTAGE/DISADVANTAGE rules in system prompt.',
        },
        contested: {
          type: 'object',
          description: 'For contested rolls where an NPC actively opposes the player. Both sides roll simultaneously. Omit for static DC checks.',
          properties: {
            npcName: { type: 'string', description: 'The opposing NPC\'s name (e.g. "Station Guard").' },
            npcSkill: { type: 'string', description: 'The skill the NPC is using (e.g. "Perception").' },
            npcModifier: { type: 'number', description: 'The NPC\'s total modifier for their roll.' },
          },
          required: ['npcName', 'npcSkill', 'npcModifier'],
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
      'Update world state: add or update NPCs, change current location, add/update factions, add/update narrative threads, update scene snapshot. Call this whenever the player encounters a new NPC, moves to a new location, a thread changes, or the physical situation changes (movement, injuries, environment shifts).',
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
              description: { type: 'string', description: 'Who they are + one personality detail or behavioral habit. Not just role/stance — include something observable. E.g. "Senior intel officer. Efficient, dry, brings her own tea to briefings." not just "Intelligence officer."' },
              lastSeen: { type: 'string', description: 'Current location or context' },
              relationship: { type: 'string', description: 'e.g. "hostile", "neutral", "ally", "contact"' },
              role: { type: 'string', enum: ['crew', 'contact', 'npc'], description: 'Use "crew" for companions who travel with the player' },
              subtype: { type: 'string', enum: ['person', 'vessel', 'installation'], description: 'Use "vessel" for ships/freighters/shuttles, "installation" for stations/bases. Defaults to "person". Vessels and installations are displayed separately from characters.' },
              vulnerability: { type: 'string', description: 'What this companion is most sensitive to (for crew only) — used to modulate cohesion changes' },
              disposition: { type: 'string', enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'], description: 'Starting disposition for contacts/npcs. Defaults to neutral if omitted.' },
              affiliation: { type: 'string', description: 'Faction or group this NPC belongs to. Must match an existing faction name exactly (e.g. "The Inquisition", "Merchant Guild"). Used to group NPCs under their faction in the UI.' },
              status: { type: 'string', enum: ['active', 'dead', 'defeated', 'gone'], description: 'Set to "dead", "defeated", or "gone" when an NPC is permanently removed from play. Moves them to a "Fallen" section in the UI. Defaults to "active".' },
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
            role: { type: 'string', enum: ['crew', 'contact', 'npc'] },
            vulnerability: { type: 'string' },
            affiliation: { type: 'string', description: 'Faction or group name. Must match an existing faction name exactly.' },
            status: { type: 'string', enum: ['active', 'dead', 'defeated', 'gone'], description: 'Set when an NPC is permanently removed from play.' },
          },
          required: ['name'],
        },
        setLocation: {
          type: 'object',
          description: 'Update the current location. Triggers a scene break header in the UI.',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['name', 'description'],
        },
        setCurrentTime: {
          type: 'string',
          description: 'Update the in-world timeline at scene transitions. e.g. "Day 3, evening", "Late afternoon", "0347 hours". Announce time naturally in the narrative — never as a mechanical countdown.',
        },
        setSceneSnapshot: {
          type: 'string',
          description: 'Stage direction: who is where, physical state, injuries, environment. Update whenever position, injuries, or surroundings change. 1-2 sentences max. e.g. "Player crouched behind overturned table in tavern common room. Pell at the door, wounded (left arm). Fire spreading from kitchen. Two guards approaching from the street."',
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
          description: 'Update a single thread. Matched by id first, then by title if id not found.',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', description: 'Thread title — used as fallback if id does not match.' },
            status: { type: 'string' },
            deteriorating: { type: 'boolean' },
          },
          required: ['id', 'status'],
        },
        updateThreads: {
          type: 'array',
          description: 'Batch-update multiple threads at once (e.g. resolve several at chapter close). Each entry matched by id first, then by title.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string' },
              deteriorating: { type: 'boolean' },
            },
            required: ['id', 'status'],
          },
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
            status: { type: 'string', enum: ['open', 'strained', 'fulfilled', 'broken'] },
          },
          required: ['id', 'to', 'what', 'status'],
        },
        updatePromise: {
          type: 'object',
          description: 'Update an existing promise. Match by id or by the NPC name (to field). Can update status and/or description.',
          properties: {
            id: { type: 'string', description: 'Promise id. Optional if "to" is provided.' },
            to: { type: 'string', description: 'NPC name the promise is to. Used as fallback match if id is unknown.' },
            status: { type: 'string', enum: ['open', 'strained', 'fulfilled', 'broken'] },
            what: { type: 'string', description: 'Updated description of the promise. Use when the situation has changed.' },
          },
          required: ['status'],
        },
      },
    },
  },
  {
    name: 'close_chapter',
    description:
      'Close the current chapter and open the next one. Write the summary carefully: chapter summaries are the sole long-term narrative memory. Both resolutionMet and forwardHook are required — do not call unless both are genuinely satisfied.',
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
        resolutionMet: {
          type: 'string',
          description: 'How the chapter objective was resolved — completed, failed, or transformed beyond its original scope.',
        },
        forwardHook: {
          type: 'string',
          description: 'The revelation, complication, or setup that creates momentum into the next chapter.',
        },
      },
      required: ['summary', 'keyEvents', 'nextTitle', 'resolutionMet', 'forwardHook'],
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
          enum: ['establish', 'move', 'defeat'],
          description: '"establish" sets up the antagonist identity (call once, early in the story). "move" records one offscreen action this chapter. "defeat" marks the antagonist as defeated/dead/fled — moves them to Fallen in the UI.',
        },
        status: {
          type: 'string',
          enum: ['defeated', 'dead', 'fled'],
          description: '[defeat] How the antagonist was removed from play.',
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
    name: 'generate_debrief',
    description:
      'Generate a chapter debrief. Drop the GM voice — be direct, analytical, honest. Like two collaborators discussing a shared project. Generic praise is worthless; name actual events, rolls, NPCs, and consequences.\n\nThe tool captures structured data. Alongside the tool call, deliver sections 4 (Mechanical State) and 6 (GM Transparency) as narrative text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tactical: {
          type: 'string',
          description: 'Combines three analyses:\n\n1. THE DICE TOLD A STORY: Analyze the roll log. What patterns emerged (stat streaks, hot/cold runs)? Which 2-3 rolls most shaped the narrative? Name the one roll that defined the chapter and explain what the other result would have meant.\n\n2. WHAT WORKED: 2-3 player decisions with meaningful positive impact. Focus on decisions, not dice. Show causation chains: "Choosing X led to Y, which created Z." Note any moments where failure accidentally created better outcomes.\n\n3. WHAT COST YOU: The chapter\'s real costs — not just HP. Relationship damage, burned covers, closed options, strained promises. Be honest but not punishing: "here\'s what the chapter cost you, and why that makes the story richer."',
        },
        strategic: {
          type: 'string',
          description: 'THREADS AND PRESSURE: Assess the open thread landscape. Which threads advanced, worsened from neglect, or newly opened? What is most urgent next chapter? What has the player been ignoring that is about to become urgent? Frame as strategic awareness, not instructions — the player decides priorities.',
        },
        luckyBreaks: {
          type: 'array',
          description: 'Specific moments where dice or circumstances favored the player. Reference actual rolls and what would have happened otherwise.',
          items: { type: 'string' },
        },
        costsPaid: {
          type: 'array',
          description: 'Concrete permanent costs: consumables spent, covers burned, clocks advanced, relationships damaged, options closed.',
          items: { type: 'string' },
        },
        promisesKept: {
          type: 'array',
          description: 'Promises fulfilled or meaningfully advanced this chapter.',
          items: { type: 'string' },
        },
        promisesBroken: {
          type: 'array',
          description: 'Promises broken, strained, or left past their implied deadline.',
          items: { type: 'string' },
        },
      },
      required: ['tactical', 'strategic', 'luckyBreaks', 'costsPaid', 'promisesKept', 'promisesBroken'],
    },
  },
  {
    name: 'update_cohesion',
    description:
      'Adjust crew/companion cohesion by +1 or -1. Call immediately when a trigger occurs, before continuing the narrative. NEVER reveal the score or mention cohesion to the player. See COHESION MECHANIC in system prompt for triggers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        direction: {
          type: 'number',
          enum: [1, 0, -1],
          description: '+1 to raise, -1 to lower, 0 to log a significant moment without changing the score (e.g. acknowledging crew at max cohesion, or a moment that deepens trust without mechanical effect).',
        },
        reason: {
          type: 'string',
          description: 'Brief reason — logged internally for chapter debrief, never shown to player. For direction 0, describe what happened and why it matters for the relationship.',
        },
        companionName: {
          type: 'string',
          description: 'Name of the specific companion this relates to (if applicable). Omit for crew-wide changes.',
        },
      },
      required: ['direction', 'reason'],
    },
  },
  {
    name: 'update_ship',
    description:
      'Update ship state: hull condition changes, system upgrades, new combat options. Call when the ship takes damage, is repaired, or receives an upgrade. For chapter-end refits: propose 2-3 upgrade options in narrative dialogue (e.g. a dockmaster offers to upgrade engines or shields), then call this when the player chooses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hullConditionChange: {
          type: 'number',
          description: 'Hull condition change in percentage points. Negative for damage, positive for repairs. Ship combat hit: -15 to -25. Emergency field repair: +15 to +30. Full port refit: set to restore 100.',
        },
        upgradeSystem: {
          type: 'object',
          description: 'Upgrade a ship system to the next level.',
          properties: {
            id: { type: 'string', enum: ['engines', 'weapons', 'shields', 'sensors', 'crew_quarters'] },
            newLevel: { type: 'number', description: 'New level (2 or 3).' },
            description: { type: 'string', description: 'Updated description of what this system does at the new level.' },
          },
          required: ['id', 'newLevel', 'description'],
        },
        addCombatOption: {
          type: 'string',
          description: 'A tactical action the player can choose in space encounters. Use short verb phrases, not system descriptions. Good: "Nose cannon volley", "EW jamming burst", "Chaff deployment (4 charges)". Bad: "Active Cloaking — 12m40s invisibility, 6hr recharge".',
        },
        upgradeLogEntry: {
          type: 'string',
          description: 'Brief narrative note to log (e.g. "Upgraded engines at Orja-9 drydock"). Shown in Ship tab refit history.',
        },
      },
    },
  },
  {
    name: 'update_clock',
    description:
      'Manage tension clocks — hidden segmented threat tracks. See TENSION CLOCKS in system prompt for when to establish, advance, trigger, and resolve.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['establish', 'advance', 'trigger', 'resolve'],
          description: 'establish: create a new clock. advance: fill segments. trigger: fire consequence (clock is now permanent). resolve: player defused it.',
        },
        id: {
          type: 'string',
          description: 'Unique snake_case identifier for this clock (e.g. "corsair_pursuit", "reactor_leak").',
        },
        name: {
          type: 'string',
          description: '[establish] Player-visible name shown in Pressures list (e.g. "Corsair pursuit", "Reactor integrity"). Keep it evocative, not mechanical.',
        },
        maxSegments: {
          type: 'number',
          enum: [4, 6],
          description: '[establish] 4 for fast-burning threats; 6 for slow-burn pressures.',
        },
        triggerEffect: {
          type: 'string',
          description: '[establish] What happens when the clock fills — write it as a concrete in-world consequence.',
        },
        by: {
          type: 'number',
          description: '[advance] Number of segments to fill. Usually 1; 2 for a catastrophic failure or major escalation.',
        },
        reason: {
          type: 'string',
          description: '[advance] The in-world event that caused this advance.',
        },
        consequence: {
          type: 'string',
          description: '[trigger] The concrete consequence that fires — this is the moment that changes things permanently.',
        },
        how: {
          type: 'string',
          description: '[resolve] How the player defused this threat.',
        },
      },
      required: ['action', 'id'],
    },
  },
  {
    name: 'update_disposition',
    description:
      'Update the disposition tier of a contact or NPC. Only for contacts and NPCs, not crew (use update_cohesion for crew). See NPC DISPOSITION in system prompt for tier effects and shift rules.',
    input_schema: {
      type: 'object' as const,
      properties: {
        npcName: {
          type: 'string',
          description: 'Name of the NPC or contact — must match the name in the NPCS list exactly.',
        },
        newDisposition: {
          type: 'string',
          enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'],
          description: 'The new disposition tier.',
        },
        reason: {
          type: 'string',
          description: 'What triggered this shift.',
        },
      },
      required: ['npcName', 'newDisposition', 'reason'],
    },
  },
  {
    name: 'award_inspiration',
    description:
      'Award Inspiration when the player makes a narratively compelling, tactically risky decision. The player can hold only one at a time — if they already have it, the award is lost. They spend it to reroll any die.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief narrative note explaining why Inspiration was awarded (shown to player).',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'set_chapter_frame',
    description:
      'Silently establish the chapter\'s structural skeleton. Call at chapter open (turns 1-3) with the player\'s objective and the crucible scene. Can be called again to update if the objective fundamentally changes. Never announce the frame to the player.',
    input_schema: {
      type: 'object' as const,
      properties: {
        objective: {
          type: 'string',
          description: 'Short action phrase for the chapter goal, from the player\'s perspective. Under 10 words. E.g. "Sabotage the Pinnacle facility" or "Find out what Renn discovered".',
        },
        crucible: {
          type: 'string',
          description: 'The scene where the player\'s preparation meets real pressure — where plans are tested and dice matter most.',
        },
      },
      required: ['objective', 'crucible'],
    },
  },
  {
    name: 'signal_close_ready',
    description:
      'Signal that the chapter\'s close conditions are met. Call AFTER wrapping up the narrative. The player will see a Close Chapter button. Do NOT call close_chapter, generate_debrief, or levelUp yourself — those are handled by the close sequence.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief explanation of why the chapter is ready to close (objective resolved, forward hook established).',
        },
        selfAssessment: {
          type: 'string',
          description: 'Reflect on your narrative performance this chapter: what scenes landed, what dragged, what you\'d do differently. This feeds into the debrief\'s GM Transparency section.',
        },
      },
      required: ['reason'],
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
    cache_control: { type: 'ephemeral' as const },
  },
  {
    name: 'add_clue',
    description:
      'Add or update a clue in the notebook. Call this whenever the player discovers meaningful information. If updating an existing clue with new details, pass the existing clueId to merge rather than creating a duplicate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clueId: {
          type: 'string',
          description: 'ID of an existing clue to update with new details. Check NOTEBOOK in game state for existing clue IDs before adding. Omit to create a new clue.',
        },
        title: {
          type: 'string',
          description: 'Short descriptive label for this evidence (2-5 words). Shown as the clue heading in the notebook. E.g. "Betting Slip", "Dockside Witness", "Forged Transit Papers".',
        },
        content: {
          type: 'string',
          description: 'What the player learned — the factual content of the clue. When updating, this replaces the previous content.',
        },
        source: {
          type: 'string',
          description: 'Where the clue came from — a person, place, document, or observation.',
        },
        tags: {
          type: 'array',
          description: 'Hidden categorical tags for linking clues (e.g. "financial", "timeline", "alias"). 1-4 tags. When updating, tags are merged with existing.',
          items: { type: 'string' },
        },
        isRedHerring: {
          type: 'boolean',
          description: 'Whether this clue is intentionally misleading. Hidden from player.',
        },
        threadTitle: {
          type: 'string',
          description: 'The case or investigation thread this clue belongs to. Sets the notebook title if not already set.',
        },
        status: {
          type: 'string',
          enum: ['active', 'solved', 'archived'],
          description: 'Set to "solved" when the clue has been fully explained or its mystery resolved. Set to "archived" when it is no longer relevant. Only use when updating existing clues via clueId.',
        },
      },
      required: ['title', 'content', 'source', 'tags'],
    },
  },
  {
    name: 'connect_clues',
    description:
      'Record a confirmed connection between evidence items. Can connect clues to clues (produces a lead), leads to clues (enriches a lead), or leads to leads (produces a breakthrough). The revelation is the new information revealed by connecting these items. NPCs with analytical expertise may call this directly without a player roll.',
    input_schema: {
      type: 'object' as const,
      properties: {
        connectionId: {
          type: 'string',
          description: 'ID of an existing connection to update. Check CONNECTIONS in the NOTEBOOK for existing IDs. Omit to create a new connection.',
        },
        sourceIds: {
          type: 'array',
          description: 'IDs of the items being connected (exactly 2). Can be clue IDs or connection IDs from the NOTEBOOK in game state. Required when creating a new connection.',
          items: { type: 'string' },
        },
        title: {
          type: 'string',
          description: 'Descriptive summary of what this connection means (3-8 words). Shown as the connection heading. E.g. "Financial Desperation", "Voss Controls the Docks".',
        },
        revelation: {
          type: 'string',
          description: 'The new information revealed by connecting these items. Scale quality by combination: clue+clue opens inquiry; lead+clue confirms/sharpens; lead+lead reframes the case.',
        },
        status: {
          type: 'string',
          enum: ['active', 'solved', 'archived', 'disproven'],
          description: 'Set to "solved" when the connection\'s mystery is fully resolved, "archived" when no longer relevant, or "disproven" when invalidated by new evidence. Defaults to "active".',
        },
      },
      required: ['title'],
    },
  },
]

/** Subset of tools available to the audit prompt — state mutation only, no narrative tools. */
export const auditTools: Anthropic.Tool[] = gameTools.filter((t) =>
  ['update_character', 'update_world', 'update_antagonist', 'update_cohesion', 'update_ship', 'update_clock', 'update_disposition'].includes(t.name)
)
