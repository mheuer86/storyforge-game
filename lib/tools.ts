import type Anthropic from '@anthropic-ai/sdk'

// ============================================================
// commit_turn — single tool for all game state mutations
// ============================================================

const commitTurnDefinition: Anthropic.Tool = {
  name: 'commit_turn',
  description:
    'Commit all state changes for this turn. Call ONCE at the end of every narrative response. Include suggested_actions (required). All other fields are optional — only include fields that changed this turn.',
  input_schema: {
    type: 'object' as const,
    properties: {
      // ── Character Changes ──────────────────────────────────
      character: {
        type: 'object',
        description: 'Character state mutations.',
        properties: {
          hp_delta: { type: 'number', description: 'Relative HP change (negative = damage, positive = healing).' },
          hp_set: { type: 'number', description: 'Absolute HP override (use sparingly).' },
          credits_delta: { type: 'number', description: 'Relative credit change.' },
          inventory_add: {
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
                max_charges: { type: 'number' },
              },
              required: ['id', 'name', 'description', 'quantity'],
            },
          },
          inventory_remove: {
            type: 'array',
            description: 'IDs of items to remove.',
            items: { type: 'string' },
          },
          inventory_use: {
            type: 'object',
            description: 'Use a consumable. Decrements charges by 1, or set_charges to override.',
            properties: {
              id: { type: 'string', description: 'Item ID or name' },
              set_charges: { type: 'number', description: 'Set charges directly instead of decrementing.' },
            },
            required: ['id'],
          },
          temp_modifier_add: {
            type: 'object',
            description: 'Add a temporary stat modifier.',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              stat: { type: 'string', enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA', 'AC', 'attack', 'all'] },
              value: { type: 'number' },
              duration: { type: 'string', description: 'e.g. "this encounter", "1 hour"' },
            },
            required: ['id', 'name', 'stat', 'value', 'duration'],
          },
          temp_modifier_remove: { type: 'string', description: 'ID of temp modifier to remove.' },
          trait_update: {
            type: 'object',
            description: 'Update remaining uses of a class trait.',
            properties: {
              name: { type: 'string', description: 'Trait name exactly as defined' },
              uses_remaining: { type: 'number' },
            },
            required: ['name', 'uses_remaining'],
          },
          level_up: {
            type: 'object',
            description: 'Level up at chapter close.',
            properties: {
              new_level: { type: 'number' },
              hp_increase: { type: 'number', description: 'Amount to add to HP max.' },
              new_proficiency_bonus: { type: 'number', description: 'Only if it changes at this level.' },
            },
            required: ['new_level', 'hp_increase'],
          },
          stat_increase: {
            type: 'array',
            description: 'Ability Score Improvement at levels 4, 8, 12.',
            items: {
              type: 'object',
              properties: {
                stat: { type: 'string', enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] },
                amount: { type: 'number', description: '1 or 2' },
              },
              required: ['stat', 'amount'],
            },
          },
          exhaustion_delta: { type: 'number', description: '+1 or -1.' },
          add_proficiency: { type: 'string', description: 'New skill proficiency name.' },
          upgrade_to_expertise: { type: 'string', description: 'Existing proficiency to upgrade.' },
          spend_inspiration: { type: 'boolean', description: 'Spend inspiration for a reroll.' },
          award_inspiration: {
            type: 'object',
            description: 'Award inspiration with reason.',
            properties: { reason: { type: 'string' } },
            required: ['reason'],
          },
          roll_breakdown: {
            type: 'object',
            description: 'GM-resolved roll display (enemy attacks, traps). Rendered as a roll badge.',
            properties: {
              label: { type: 'string', description: 'e.g. "Guard Attack", "Trap Damage"' },
              dice: { type: 'string', description: 'e.g. "1d8+2"' },
              roll: { type: 'number', description: 'Raw die result' },
              modifier: { type: 'number' },
              total: { type: 'number', description: 'roll + modifier' },
              damage_type: { type: 'string' },
              sides: { type: 'number' },
            },
            required: ['label', 'dice', 'roll', 'modifier', 'total'],
          },
        },
      },

      // ── World Changes ──────────────────────────────────────
      world: {
        type: 'object',
        description: 'World state mutations.',
        properties: {
          add_npcs: {
            type: 'array',
            description: 'New NPCs to add.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string', description: 'Who they are + one personality detail or behavioral habit.' },
                last_seen: { type: 'string' },
                relationship: { type: 'string' },
                role: { type: 'string', enum: ['crew', 'contact', 'npc'] },
                subtype: { type: 'string', enum: ['person', 'vessel', 'installation'] },
                vulnerability: { type: 'string' },
                disposition: { type: 'string', enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'] },
                affiliation: { type: 'string' },
                status: { type: 'string', enum: ['active', 'dead', 'defeated', 'gone'] },
                voice_note: { type: 'string' },
                combat_tier: { type: 'number', enum: [1, 2, 3, 4, 5] },
                combat_notes: { type: 'string' },
              },
              required: ['name', 'description', 'last_seen'],
            },
          },
          update_npcs: {
            type: 'array',
            description: 'Update existing NPCs (matched by name).',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Match key' },
                description: { type: 'string' },
                last_seen: { type: 'string' },
                relationship: { type: 'string' },
                role: { type: 'string', enum: ['crew', 'contact', 'npc'] },
                subtype: { type: 'string', enum: ['person', 'vessel', 'installation'] },
                vulnerability: { type: 'string' },
                disposition: { type: 'string', enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'] },
                affiliation: { type: 'string' },
                status: { type: 'string', enum: ['active', 'dead', 'defeated', 'gone'] },
                voice_note: { type: 'string' },
                combat_tier: { type: 'number', enum: [1, 2, 3, 4, 5] },
                combat_notes: { type: 'string' },
                temp_load_add: {
                  type: 'array',
                  description: 'Add load entries to a crew member. Use when operations create stress, promises slip, or traumatic events occur.',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string', description: 'What they\'re carrying (e.g. "Unresolved promise about Oshi\'s kid")' },
                      severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
                      acquired: { type: 'string', description: 'When/where (e.g. "Ch 2, Athex-7")' },
                    },
                    required: ['description', 'severity', 'acquired'],
                  },
                },
                temp_load_remove: {
                  type: 'string',
                  description: 'Remove a load entry by description (substring match). Use after recovery scenes that address what the crew member was carrying.',
                },
              },
              required: ['name'],
            },
          },
          set_location: {
            type: 'object',
            description: 'Update current location. Triggers scene break header.',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['name', 'description'],
          },
          set_current_time: { type: 'string', description: 'In-world time, e.g. "Day 3, evening".' },
          set_scene_snapshot: { type: 'string', description: 'Stage direction: who is where, physical state, 1-2 sentences.' },
          add_threads: {
            type: 'array',
            description: 'New narrative threads.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string' },
                deteriorating: { type: 'boolean' },
              },
              required: ['id', 'title', 'status', 'deteriorating'],
            },
          },
          update_threads: {
            type: 'array',
            description: 'Update existing threads (matched by id, fallback to title).',
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
          add_faction: {
            type: 'object',
            description: 'Add or update a faction.',
            properties: {
              name: { type: 'string' },
              stance: { type: 'string' },
            },
            required: ['name', 'stance'],
          },
          add_promise: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              to: { type: 'string' },
              what: { type: 'string' },
              status: { type: 'string', enum: ['open', 'strained', 'fulfilled', 'broken'] },
            },
            required: ['id', 'to', 'what', 'status'],
          },
          update_promise: {
            type: 'object',
            description: 'Update promise. Match by id or NPC name (to).',
            properties: {
              id: { type: 'string' },
              to: { type: 'string' },
              status: { type: 'string', enum: ['open', 'strained', 'fulfilled', 'broken'] },
              what: { type: 'string' },
            },
            required: ['status'],
          },
          add_decision: {
            type: 'object',
            description: 'Record a non-operational decision with consequences.',
            properties: {
              id: { type: 'string' },
              summary: { type: 'string' },
              context: { type: 'string' },
              category: { type: 'string', enum: ['moral', 'tactical', 'strategic', 'relational'] },
            },
            required: ['id', 'summary', 'context', 'category'],
          },
          update_decision: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: ['active', 'superseded', 'abandoned'] },
              reason: { type: 'string' },
            },
            required: ['id', 'status'],
          },
          set_operation: {
            type: 'object',
            description: 'Set or update multi-phase operation. Set to null to clear after completion.',
            properties: {
              name: { type: 'string' },
              phase: { type: 'string', enum: ['planning', 'pre-insertion', 'active', 'extraction', 'complete'] },
              objectives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'completed', 'failed'] },
                  },
                  required: ['text'],
                },
              },
              tactical_facts: { type: 'array', items: { type: 'string' } },
              asset_constraints: { type: 'array', items: { type: 'string' } },
              abort_conditions: { type: 'array', items: { type: 'string' } },
              signals: { type: 'array', items: { type: 'string' } },
              assessments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    claim: { type: 'string' },
                    skill: { type: 'string' },
                    result: { type: 'number' },
                    confidence: { type: 'string', enum: ['low', 'moderate', 'high'] },
                    rolled: { type: 'boolean' },
                  },
                  required: ['claim', 'skill', 'result', 'confidence', 'rolled'],
                },
              },
            },
            required: ['name', 'phase', 'objectives', 'tactical_facts', 'asset_constraints', 'abort_conditions', 'signals'],
          },
          set_exploration: {
            type: 'object',
            description: 'Set spatial exploration state. Omit to clear on exit.',
            properties: {
              facility_name: { type: 'string' },
              status: { type: 'string' },
              hostile: { type: 'boolean' },
              explored: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    notes: { type: 'string' },
                  },
                  required: ['name', 'notes'],
                },
              },
              current: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['name', 'description'],
              },
              unexplored: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    hints: { type: 'string' },
                  },
                  required: ['name', 'hints'],
                },
              },
              resources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    current: { type: 'string' },
                  },
                  required: ['name', 'current'],
                },
              },
              alert_level: { type: 'string' },
            },
            required: ['facility_name', 'status', 'hostile', 'explored', 'current', 'unexplored', 'resources'],
          },
          add_timer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              deadline: { type: 'string' },
            },
            required: ['id', 'description', 'deadline'],
          },
          update_timer: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string', enum: ['active', 'expired', 'completed'] },
            },
            required: ['id', 'status'],
          },
          update_heat: {
            type: 'object',
            properties: {
              faction: { type: 'string' },
              level: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'] },
              reason: { type: 'string' },
            },
            required: ['faction', 'level', 'reason'],
          },
          add_ledger_entry: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              description: { type: 'string' },
              day: { type: 'string' },
            },
            required: ['amount', 'description', 'day'],
          },
          cohesion: {
            type: 'object',
            description: 'Crew/companion cohesion change. Hidden from player.',
            properties: {
              direction: { type: 'number', enum: [1, 0, -1] },
              reason: { type: 'string' },
              companion_name: { type: 'string' },
            },
            required: ['direction', 'reason'],
          },
          disposition_changes: {
            type: 'array',
            description: 'NPC disposition tier changes with reason.',
            items: {
              type: 'object',
              properties: {
                npc_name: { type: 'string' },
                new_disposition: { type: 'string', enum: ['hostile', 'wary', 'neutral', 'favorable', 'trusted'] },
                reason: { type: 'string' },
              },
              required: ['npc_name', 'new_disposition', 'reason'],
            },
          },
          antagonist: {
            type: 'object',
            description: 'Establish, move, or defeat the primary antagonist.',
            properties: {
              action: { type: 'string', enum: ['establish', 'move', 'defeat'] },
              name: { type: 'string' },
              description: { type: 'string' },
              agenda: { type: 'string' },
              move_description: { type: 'string' },
              status: { type: 'string', enum: ['defeated', 'dead', 'fled'] },
            },
            required: ['action'],
          },
          ship: {
            type: 'object',
            description: 'Ship/asset state changes.',
            properties: {
              hull_condition_delta: { type: 'number' },
              upgrade_system: {
                type: 'object',
                properties: {
                  id: { type: 'string', enum: ['engines', 'weapons', 'shields', 'sensors', 'crew_quarters'] },
                  new_level: { type: 'number' },
                  description: { type: 'string' },
                },
                required: ['id', 'new_level', 'description'],
              },
              add_combat_option: { type: 'string' },
              upgrade_log_entry: { type: 'string' },
            },
          },
          clocks: {
            type: 'array',
            description: 'Tension clock actions (establish, advance, trigger, resolve).',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['establish', 'advance', 'trigger', 'resolve'] },
                id: { type: 'string' },
                name: { type: 'string', description: '[establish] Player-visible name.' },
                max_segments: { type: 'number', enum: [4, 6] },
                trigger_effect: { type: 'string' },
                by: { type: 'number', description: '[advance] Segments to fill (default 1).' },
                reason: { type: 'string' },
                consequence: { type: 'string', description: '[trigger] Concrete consequence.' },
                how: { type: 'string', description: '[resolve] How the player defused it.' },
              },
              required: ['action', 'id'],
            },
          },
          add_clues: {
            type: 'array',
            description: 'Add or update notebook clues.',
            items: {
              type: 'object',
              properties: {
                clue_id: { type: 'string', description: 'Existing clue ID to update. Omit for new.' },
                title: { type: 'string' },
                content: { type: 'string' },
                source: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                is_red_herring: { type: 'boolean' },
                thread_title: { type: 'string' },
                status: { type: 'string', enum: ['active', 'solved', 'archived'] },
              },
              required: ['title', 'content', 'source', 'tags'],
            },
          },
          connect_clues: {
            type: 'array',
            description: 'Record connections between evidence items.',
            items: {
              type: 'object',
              properties: {
                connection_id: { type: 'string', description: 'Existing connection ID to update.' },
                source_ids: { type: 'array', items: { type: 'string' }, description: 'IDs of items being connected (exactly 2).' },
                title: { type: 'string' },
                revelation: { type: 'string' },
                status: { type: 'string', enum: ['active', 'solved', 'archived', 'disproven'] },
              },
              required: ['title'],
            },
          },
        },
      },

      // ── Combat Changes ─────────────────────────────────────
      combat: {
        type: 'object',
        description: 'Start or end combat.',
        properties: {
          start: {
            type: 'object',
            properties: {
              enemies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    hp: {
                      type: 'object',
                      properties: { current: { type: 'number' }, max: { type: 'number' } },
                      required: ['current', 'max'],
                    },
                    ac: { type: 'number' },
                    attack_bonus: { type: 'number' },
                    damage: { type: 'string' },
                    description: { type: 'string' },
                    abilities: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          effect: { type: 'string' },
                          range: { type: 'string' },
                          cooldown: { type: 'string' },
                        },
                        required: ['name', 'effect'],
                      },
                    },
                  },
                  required: ['id', 'name', 'hp', 'ac', 'attack_bonus', 'damage'],
                },
              },
              description: { type: 'string' },
            },
            required: ['enemies', 'description'],
          },
          end: {
            type: 'object',
            properties: {
              outcome: { type: 'string', enum: ['victory', 'fled', 'enemies_fled', 'negotiated'] },
              loot: {
                type: 'array',
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
                    max_charges: { type: 'number' },
                  },
                  required: ['id', 'name', 'description', 'quantity'],
                },
              },
              credits_gained: { type: 'number' },
            },
            required: ['outcome'],
          },
        },
      },

      // ── Narrative Metadata ─────────────────────────────────
      suggested_actions: {
        type: 'array',
        description: 'REQUIRED: 3-4 contextual action options for the player.',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 4,
      },
      chapter_frame: {
        type: 'object',
        description: 'Chapter structural skeleton. Set at chapter open (turns 1-3). Never announce to player.',
        properties: {
          objective: { type: 'string', description: 'Under 10 words.' },
          crucible: { type: 'string' },
        },
        required: ['objective', 'crucible'],
      },
      signal_close: {
        type: 'object',
        description: 'Signal chapter close conditions are met. Player sees Close Chapter button.',
        properties: {
          reason: { type: 'string' },
          self_assessment: { type: 'string' },
        },
        required: ['reason'],
      },
      close_chapter: {
        type: 'object',
        description: 'Close current chapter. Summary is sole long-term narrative memory.',
        properties: {
          summary: { type: 'string', description: '2-3 sentence narrative summary.' },
          key_events: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
          next_title: { type: 'string' },
          resolution_met: { type: 'string' },
          forward_hook: { type: 'string' },
        },
        required: ['summary', 'key_events', 'next_title', 'resolution_met', 'forward_hook'],
      },
      debrief: {
        type: 'object',
        description: 'Chapter debrief. Be direct, analytical, honest.',
        properties: {
          tactical: { type: 'string' },
          strategic: { type: 'string' },
          lucky_breaks: { type: 'array', items: { type: 'string' } },
          costs_paid: { type: 'array', items: { type: 'string' } },
          promises_kept: { type: 'array', items: { type: 'string' } },
          promises_broken: { type: 'array', items: { type: 'string' } },
        },
        required: ['tactical', 'strategic', 'lucky_breaks', 'costs_paid', 'promises_kept', 'promises_broken'],
      },

      // ── Check Proposal ─────────────────────────────────────
      pending_check: {
        type: 'object',
        description: 'Propose a skill check, damage roll, or healing roll. Client shows dice widget.',
        properties: {
          skill: { type: 'string', description: 'Check name (e.g. "Stealth", "Plasma Rifle").' },
          stat: { type: 'string', enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] },
          dc: { type: 'number', description: 'Difficulty Class. 0 for damage/healing.' },
          modifier: { type: 'number', description: 'Total modifier.' },
          reason: { type: 'string', description: 'Narrative reason shown to player.' },
          advantage: { type: 'boolean' },
          disadvantage: { type: 'boolean' },
          contested: {
            type: 'object',
            properties: {
              npc_name: { type: 'string' },
              npc_skill: { type: 'string' },
              npc_modifier: { type: 'number' },
            },
            required: ['npc_name', 'npc_skill', 'npc_modifier'],
          },
          sides: { type: 'number', description: 'Die sides (default 20). 6/8/10/12 for damage/healing.' },
          roll_type: { type: 'string', enum: ['check', 'damage', 'healing'] },
          damage_type: { type: 'string' },
        },
        required: ['skill', 'stat', 'dc', 'modifier', 'reason'],
      },

      // ── Scene Management ───────────────────────────────────
      scene_end: { type: 'boolean', description: 'True when a scene boundary occurred.' },
      scene_summary: { type: 'string', description: '2-4 sentence summary of concluding scene.' },
    },
    required: ['suggested_actions'],
  },
}

// ============================================================
// meta_response — unchanged from V1
// ============================================================

const metaResponseDefinition: Anthropic.Tool = {
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
}

// ============================================================
// Exports
// ============================================================

export const gameTools: Anthropic.Tool[] = [commitTurnDefinition, metaResponseDefinition]

/** Subset for audit prompt — commit_turn only, no meta. */
export const auditTools: Anthropic.Tool[] = [commitTurnDefinition]

/** Subset for meta questions — meta_response only. */
export const metaTools: Anthropic.Tool[] = [metaResponseDefinition]
