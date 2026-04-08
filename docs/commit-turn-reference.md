# commit_turn Tool Reference

Single tool for all game state mutations. Called once per turn, at the end of every narrative response.

`suggested_actions` is the only required field. All other fields are optional; include only what changed this turn.

Schema uses **snake_case** for Claude reliability. The tool-processor (`lib/tool-processor.ts`) maps snake_case input to camelCase `GameState` fields internally.

---

## Processing Rules

- All fields optional except `suggested_actions`
- Use **deltas, not absolutes** for HP, credits, and exhaustion (`hp_delta`, `credits_delta`, `exhaustion_delta`)
- `hp_set` exists for absolute HP override but should be used sparingly
- Arrays enable **batch operations**: add multiple NPCs, threads, clocks, clues, enemies in one call
- NPC updates match by `name`; thread updates match by `id` (fallback to `title`)
- Promise updates match by `id` or `to` (NPC name)
- Duplicate credit changes in the same batch are rejected

---

## Schema Reference

### Character (`character`)

| Field | Type | Description |
|-------|------|-------------|
| `hp_delta` | `number` | Relative HP change. Negative = damage, positive = healing. Clamped to [0, max]. |
| `hp_set` | `number` | Absolute HP override. Use sparingly. |
| `credits_delta` | `number` | Relative credit change. |
| `inventory_add` | `array` | Items to add. Each: `{id, name, description, quantity}` required; optional `damage`, `effect`, `charges`, `max_charges`. |
| `inventory_remove` | `string[]` | Item IDs to remove from inventory. |
| `inventory_use` | `object` | Use a consumable: `{id}` required. Decrements charges by 1, or `set_charges` to override. |
| `temp_modifier_add` | `object` | Add temp stat modifier: `{id, name, stat, value, duration}` all required. `stat` enum: `STR, DEX, CON, INT, WIS, CHA, AC, attack, all`. |
| `temp_modifier_remove` | `string` | ID of temp modifier to remove. |
| `trait_update` | `object` | Update class trait uses: `{name, uses_remaining}`. |
| `level_up` | `object` | Level up at chapter close: `{new_level, hp_increase}` required; optional `new_proficiency_bonus`. |
| `stat_increase` | `array` | Ability Score Improvement (levels 4, 8, 12): `[{stat, amount}]`. `stat` enum: `STR-CHA`. `amount`: 1 or 2. |
| `exhaustion_delta` | `number` | +1 or -1. |
| `add_proficiency` | `string` | New skill proficiency name. |
| `upgrade_to_expertise` | `string` | Existing proficiency to upgrade. |
| `spend_inspiration` | `boolean` | Spend inspiration for a reroll. |
| `award_inspiration` | `object` | `{reason}` required. |
| `roll_breakdown` | `object` | GM-resolved roll display (enemy attacks, traps). Rendered as a roll badge. Required: `{label, dice, roll, modifier, total}`. Optional: `damage_type`, `sides`. |

### World (`world`)

#### NPCs

| Field | Type | Description |
|-------|------|-------------|
| `add_npcs` | `array` | New NPCs. Required: `{name, description, last_seen}`. Optional: `relationship, role, subtype, vulnerability, disposition, affiliation, status, voice_note, combat_tier, combat_notes`. |
| `update_npcs` | `array` | Update by `name` match. All fields optional except `name`. Additional sub-fields: `temp_load_add`, `temp_load_remove`, `add_signature_line`. |

**update_npcs sub-fields:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `temp_load_add` | `array` | Add crew load entries: `[{description, severity, acquired}]`. Severity: `mild/moderate/severe`. |
| `temp_load_remove` | `string` | Remove load entry by description substring match. |
| `add_signature_line` | `string` | Preserve an exact NPC quote. Max 4 per NPC. Use sparingly. |

**NPC enums:**
- `role`: `crew`, `contact`, `npc`
- `subtype`: `person`, `vessel`, `installation`
- `disposition`: `hostile`, `wary`, `neutral`, `favorable`, `trusted`
- `status`: `active`, `dead`, `defeated`, `gone`
- `combat_tier`: 1-5

#### Location & Time

| Field | Type | Description |
|-------|------|-------------|
| `set_location` | `object` | `{name, description}`. Triggers scene break header. |
| `set_current_time` | `string` | In-world time, e.g. "Day 3, evening". |
| `set_scene_snapshot` | `string` | Stage direction: who is where, physical state. 1-2 sentences. |

#### Threads

| Field | Type | Description |
|-------|------|-------------|
| `add_threads` | `array` | `[{id, title, status, deteriorating}]` all required. |
| `update_threads` | `array` | Match by `id` (fallback `title`). Required: `{id, status}`. Optional: `title, deteriorating`. |

#### Factions & Heat

| Field | Type | Description |
|-------|------|-------------|
| `add_faction` | `object` | `{name, stance}`. |
| `update_heat` | `object` | `{faction, level, reason}`. Level: `none/low/medium/high/critical`. |

#### Promises

| Field | Type | Description |
|-------|------|-------------|
| `add_promise` | `object` | `{id, to, what, status}`. Status: `open/strained/fulfilled/broken`. |
| `update_promise` | `object` | Match by `id` or `to`. Required: `{status}`. Optional: `id, to, what`. |

#### Decisions

| Field | Type | Description |
|-------|------|-------------|
| `add_decision` | `object` | `{id, summary, context, category}`. Category: `moral/tactical/strategic/relational`. |
| `update_decision` | `object` | `{id, status}` required. Status: `active/superseded/abandoned`. Optional: `reason`. |

#### Operations

| Field | Type | Description |
|-------|------|-------------|
| `set_operation` | `object` or `null` | Multi-phase operation. Set to `null` to clear after completion. Required: `{name, phase, objectives, tactical_facts, asset_constraints, abort_conditions, signals}`. Phase: `planning/pre-insertion/active/extraction/complete`. Optional: `assessments`. |

#### Exploration

| Field | Type | Description |
|-------|------|-------------|
| `set_exploration` | `object` or `null` | Spatial exploration state. Omit/null to clear on exit. Required: `{facility_name, status, hostile, explored, current, unexplored, resources}`. Optional: `alert_level`. |

#### Timers

| Field | Type | Description |
|-------|------|-------------|
| `add_timer` | `object` | `{id, description, deadline}`. |
| `update_timer` | `object` | `{id, status}`. Status: `active/expired/completed`. |

#### Economy

| Field | Type | Description |
|-------|------|-------------|
| `add_ledger_entry` | `object` | `{amount, description, day}`. |

#### Relationships

| Field | Type | Description |
|-------|------|-------------|
| `cohesion` | `object` | Crew/companion cohesion change. Hidden from player. `{direction, reason}` required. Direction: `1/0/-1`. Optional: `companion_name`. |
| `disposition_changes` | `array` | NPC disposition tier changes: `[{npc_name, new_disposition, reason}]`. |

#### Antagonist

| Field | Type | Description |
|-------|------|-------------|
| `antagonist` | `object` | `{action}` required. Action: `establish/move/defeat`. Establish: `name, description, agenda`. Move: `move_description`. Defeat: `status` (`defeated/dead/fled`). |

#### Ship

| Field | Type | Description |
|-------|------|-------------|
| `ship` | `object` | Ship/asset state changes. Optional fields: `hull_condition_delta`, `upgrade_system {id, new_level, description}`, `add_combat_option`, `upgrade_log_entry`. System IDs: `engines/weapons/shields/sensors/crew_quarters`. |

#### Clocks

| Field | Type | Description |
|-------|------|-------------|
| `clocks` | `array` | Tension clock actions. Each: `{action, id}` required. Action-specific fields below. |

| Action | Additional Fields |
|--------|-------------------|
| `establish` | `name` (player-visible), `max_segments` (4 or 6), `trigger_effect` |
| `advance` | `by` (segments to fill, default 1), `reason` |
| `trigger` | `consequence` (concrete consequence) |
| `resolve` | `how` (how the player defused it) |

#### Clues & Connections

| Field | Type | Description |
|-------|------|-------------|
| `add_clues` | `array` | Add or update notebook clues. Required: `{title, content, source, tags}`. Optional: `clue_id` (to update existing), `is_red_herring`, `thread_title`, `status`. Status: `active/solved/archived`. |
| `connect_clues` | `array` | Record connections between evidence. Required: `{title}`. Optional: `connection_id` (to update), `source_ids` (exactly 2 IDs), `revelation`, `status`. Status: `active/solved/archived/disproven`. |

### Combat (`combat`)

| Field | Type | Description |
|-------|------|-------------|
| `start` | `object` | `{enemies, description}`. Each enemy requires: `{id, name, hp: {current, max}, ac, attack_bonus, damage}`. Optional: `description`, `abilities [{name, effect, range?, cooldown?}]`. |
| `end` | `object` | `{outcome}` required. Outcome: `victory/fled/enemies_fled/negotiated`. Optional: `loot` (same shape as `inventory_add`), `credits_gained`. |

### Narrative (top-level)

| Field | Type | Description |
|-------|------|-------------|
| `suggested_actions` | `string[]` | **REQUIRED.** 3-4 contextual action options for the player. |
| `chapter_frame` | `object` | Chapter skeleton, set at chapter open (turns 1-3). Never announced to player. `{objective, crucible}`. Objective under 10 words. |
| `signal_close` | `object` | Signal chapter close conditions met. Player sees Close Chapter button. `{reason}` required; optional `self_assessment`. |
| `close_chapter` | `object` | Close current chapter. Summary is sole long-term narrative memory. Required: `{summary, key_events, next_title, resolution_met, forward_hook}`. key_events: 2-6 items. |
| `debrief` | `object` | Chapter debrief. Be direct, analytical, honest. Required: `{tactical, strategic, lucky_breaks, costs_paid, promises_kept, promises_broken}`. |
| `pivotal_scenes` | `array` | Scenes worth preserving permanently. Close prompt only. Max 2-3 per chapter. `[{title, text}]`. Text: ~200-300 tokens preserving specific imagery, dialogue, callbacks. |

### Check (`pending_check`)

| Field | Type | Description |
|-------|------|-------------|
| `skill` | `string` | Check name (e.g. "Stealth", "Plasma Rifle"). |
| `stat` | `string` | `STR/DEX/CON/INT/WIS/CHA`. |
| `dc` | `number` | Difficulty Class. 0 for damage/healing rolls. |
| `modifier` | `number` | Total modifier. |
| `reason` | `string` | Narrative reason shown to player. |
| `advantage` | `boolean` | Optional. |
| `disadvantage` | `boolean` | Optional. |
| `contested` | `object` | Optional. `{npc_name, npc_skill, npc_modifier}`. |
| `sides` | `number` | Die sides (default 20). Use 6/8/10/12 for damage/healing. |
| `roll_type` | `string` | `check/damage/healing`. |
| `damage_type` | `string` | Optional. |

Client renders a dice widget when `pending_check` is present.

### Story Arcs (`arc_updates`)

| Field | Type | Description |
|-------|------|-------------|
| `create_arc` | `object` | Start a new story arc. Required: `{id, title, description}`. |
| `add_episode` | `object` | Add an episode to an existing arc. Required: `{arc_id, episode_id, milestone}`. |
| `advance_episode` | `object` | Advance or complete an episode. Required: `{arc_id, episode_id, status, summary}`. Status: `active/completed/failed`. |
| `resolve_arc` | `object` | Mark an arc as resolved. Required: `{arc_id, resolution_summary}`. |
| `abandon_arc` | `object` | Mark an arc as abandoned. Required: `{arc_id, reason}`. |

Arcs persist across chapters. Episodes are chapter-scoped milestones. The close sequence (Phase 1) advances episodes with summaries. Only one episode per arc should be `active` at a time.

### Scene (top-level)

| Field | Type | Description |
|-------|------|-------------|
| `scene_end` | `boolean` | True when a scene boundary occurred. |
| `scene_summary` | `string` | 2-4 sentence summary of the concluding scene. |
| `tone_signature` | `string` | 1-2 words capturing emotional register (e.g. "quiet tension", "earned release", "accumulated dread"). |

---

## meta_response

Separate tool for out-of-character questions only. Use when the player message is prefixed with `[META]`.

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | **Required.** Direct, factual answer from game state. Does not advance the story. |
