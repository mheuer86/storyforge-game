// Static map of entity type → relevant field names for
// field-population tracking. The list should reflect optional fields
// whose presence/absence gives signal about genre-specific elaboration.

export const ENTITY_FIELDS: Record<string, string[]> = {
  npc: [
    'name', 'description', 'last_seen', 'relationship', 'role', 'subtype',
    'vulnerability', 'disposition', 'affiliation', 'status', 'voice_note',
    'combat_tier', 'combat_notes', 'relations', 'key_facts', 'retrieval_cue',
  ],
  thread: [
    'id', 'title', 'status', 'deteriorating', 'owner', 'resolution_criteria',
    'failure_mode', 'relevant_npcs', 'retrieval_cue',
  ],
  promise: [
    'id', 'to', 'what', 'status', 'anchored_to', 'retrieval_cue',
  ],
  decision: [
    'id', 'summary', 'context', 'category', 'witnessed', 'anchored_to', 'retrieval_cue',
  ],
  clue: [
    'clue_id', 'title', 'content', 'source', 'tags', 'is_red_herring',
    'thread_title', 'status', 'anchored_to', 'retrieval_cue',
  ],
  faction: ['name', 'stance', 'retrieval_cue'],
  arc: [
    'id', 'title', 'episodes', 'spans_chapters', 'stakes_definition',
    'resolving_action', 'outcome_spectrum', 'retrieval_cue',
  ],
  clock: ['id', 'name', 'max_segments', 'trigger_effect'],
  timer: ['id', 'description', 'deadline'],
  operation: ['name', 'phase', 'objectives', 'tactical_facts', 'asset_constraints', 'abort_conditions', 'signals'],
}

// Map write_type → entity bucket
export const WRITE_TYPE_TO_ENTITY: Record<string, string> = {
  npc_create: 'npc',
  npc_update: 'npc',
  thread_create: 'thread',
  thread_update: 'thread',
  promise_create: 'promise',
  promise_update: 'promise',
  decision_create: 'decision',
  decision_update: 'decision',
  clue_create: 'clue',
  faction_update: 'faction',
  arc_create: 'arc',
  arc_update: 'arc',
  clock_establish: 'clock',
  clock_advance: 'clock',
  timer_set: 'timer',
  timer_update: 'timer',
}

export const CREATE_WRITE_TYPES = new Set([
  'npc_create', 'thread_create', 'promise_create', 'decision_create',
  'clue_create', 'faction_update', 'arc_create', 'clock_establish', 'timer_set',
])

export const UPDATE_WRITE_TYPES = new Set([
  'npc_update', 'thread_update', 'promise_update', 'decision_update',
  'arc_update', 'clock_advance', 'timer_update',
])
