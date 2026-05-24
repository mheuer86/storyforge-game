/**
 * Follow-up variants for optimizing the winning v4 close-loop strategy.
 *
 * These keep v4 as the control and test narrower execution improvements:
 * tool completion, active-scene deferral, fact-locked close reasoning, and a
 * combined candidate for production shaping.
 */

import {
  buildCloseLoopProtocol,
  CHAPTER_CLOSE_RULE,
  PROTOCOL_FRAME_AFTER,
  PROTOCOL_FRAME_BEFORE,
  SHARED_ROLL_DISCIPLINE,
} from './variants.mjs'

const TOOL_COMPLETION_CONTRACT = `## Tool completion contract

Every non-roll response is incomplete until narrate_turn is called.

- If you call request_roll, stop immediately after request_roll; the harness will resume after the roll.
- If you do not call request_roll, call narrate_turn exactly once after the prose.
- Fill chapter_status on every narrate_turn, even when phase is only pressure or decision.
- If no chapter transition is due, set authorial_moves.pivot_signaled to false.`

const ACTIVE_SCENE_GUARD = `## Active-scene close guard

Never close or reframe while the current scene still has a live response obligation.

Treat these as active blockers:
- An NPC is present and answering a direct question.
- The player asked an NPC, crew member, or ship AI for specific analysis and that answer has not landed.
- A revelation is currently unfolding and the player has not had a chance to react.
- A negotiation or interrogation is still in exchange rather than aftermath.

When close pressure exists but an active blocker is present:
- Do not pivot.
- Set chapter_status.close_candidate to true if the chapter is close-soon.
- Put the blocker in chapter_status.never_close_mid_active.
- Set next_required_delta to the exact landing beat after which close/reframe becomes clean.
- Suggested actions should finish, consolidate, or depart; they should not open unrelated side loops.`

const FACT_LOCKED_CLOSE_REASONING = `## Fact-locked close reasoning

Close signals must be based only on facts already established in the transcript or completed by the current player action.

Before marking a chapter close-ready, separate:
- Done: events already completed in transcript or by the current player action.
- In flight: events currently being attempted or started.
- Not done: events that would require future narration or another player choice.

Do not count future facts as true. Examples:
- If the player is heading to the broker, the broker deal is not signed yet.
- If the player has not reached the Harbour Office, the lien or marker is not cleared yet.
- If the ship is still docked, departure and unclamping are not resolved yet.
- If an NPC is holding out new evidence, the revelation has not fully landed yet.

If you mention Done/In flight/Not done, put it only in chapter_status.reason, never in player-facing prose.`

const HANDOVER_READINESS_CONTRACT = `## Handover readiness contract

Only close or reframe when a clean handover could be written from current facts.

Handover-ready means:
- The chapter's foreground question is answered, failed, or transformed.
- Current location/scope is stable enough for the next chapter opener.
- All named parties needed for the next opener are stable and accounted for.
- No NPC in the current scene is waiting for an answer.
- The next chapter starts with a clear first decision, not with finishing the current exchange.

If close pressure is real but handover is not ready, write the smallest consolidation beat that makes it ready.`

const HYBRID_CONTROLLER_LITE_CORE = `## Optimized hybrid controller-lite rule

- Use your narrative judgment and the code advisory together.
- If both indicate close/reframe and no active blocker exists, close or explicitly reframe now.
- If both indicate close/reframe but an active blocker exists, continue only the active exchange and mark close_candidate with the blocker.
- If they disagree, explain the disagreement only in chapter_status.reason.
- If the advisory says hard scope boundary, treat it as mandatory: close or explicitly reframe instead of continuing the old chapter.
- Do not add ordinary obstacles after a close candidate unless they are the first pressure of the successor chapter.`

const CONTROLLER_RETRY_AWARENESS = `## Controller repair awareness

The harness may reject a turn for one of three code-owned reasons:
- missing narrate_turn on a non-roll response
- malformed chapter_status, especially JSON stuffed inside chapter_status.reason
- chapter_status contradicts code-owned facts, especially by counting Not done facts as Done

If a repair retry happens, do not defend the first attempt. Follow the controller correction exactly.`

function buildV4dProtocol(advisory, extraBlocks = []) {
  return [
    PROTOCOL_FRAME_BEFORE,
    SHARED_ROLL_DISCIPLINE,
    CHAPTER_CLOSE_RULE,
    TOOL_COMPLETION_CONTRACT,
    ACTIVE_SCENE_GUARD,
    FACT_LOCKED_CLOSE_REASONING,
    HANDOVER_READINESS_CONTRACT,
    ...extraBlocks,
    advisory ? `## Private code-owned chapter loop advisory\n\n${advisory}` : '',
    HYBRID_CONTROLLER_LITE_CORE,
    PROTOCOL_FRAME_AFTER,
  ].filter(Boolean).join('\n\n')
}

export const V4_OPTIMIZATION_VARIANTS = {
  v4: {
    label: 'v4 control from first experiment',
    build: (advisory) => buildCloseLoopProtocol('v4', advisory),
  },

  v4a: {
    label: 'v4 + mandatory tool completion',
    build: (advisory) => [
      PROTOCOL_FRAME_BEFORE,
      SHARED_ROLL_DISCIPLINE,
      CHAPTER_CLOSE_RULE,
      TOOL_COMPLETION_CONTRACT,
      advisory ? `## Private code-owned chapter loop advisory\n\n${advisory}` : '',
      HYBRID_CONTROLLER_LITE_CORE,
      PROTOCOL_FRAME_AFTER,
    ].filter(Boolean).join('\n\n'),
  },

  v4b: {
    label: 'v4 + active-scene close guard',
    build: (advisory) => [
      PROTOCOL_FRAME_BEFORE,
      SHARED_ROLL_DISCIPLINE,
      CHAPTER_CLOSE_RULE,
      TOOL_COMPLETION_CONTRACT,
      ACTIVE_SCENE_GUARD,
      advisory ? `## Private code-owned chapter loop advisory\n\n${advisory}` : '',
      HYBRID_CONTROLLER_LITE_CORE,
      PROTOCOL_FRAME_AFTER,
    ].filter(Boolean).join('\n\n'),
  },

  v4c: {
    label: 'v4 + fact-locked handover readiness',
    build: (advisory) => [
      PROTOCOL_FRAME_BEFORE,
      SHARED_ROLL_DISCIPLINE,
      CHAPTER_CLOSE_RULE,
      TOOL_COMPLETION_CONTRACT,
      FACT_LOCKED_CLOSE_REASONING,
      HANDOVER_READINESS_CONTRACT,
      advisory ? `## Private code-owned chapter loop advisory\n\n${advisory}` : '',
      HYBRID_CONTROLLER_LITE_CORE,
      PROTOCOL_FRAME_AFTER,
    ].filter(Boolean).join('\n\n'),
  },

  v4d: {
    label: 'v4 optimized combined',
    build: (advisory) => buildV4dProtocol(advisory),
  },

  v4d_completion_retry: {
    label: 'v4d + controller completion retry',
    build: (advisory) => buildV4dProtocol(advisory, [CONTROLLER_RETRY_AWARENESS]),
  },

  v4d_fact_retry: {
    label: 'v4d + controller fact-lock retry',
    build: (advisory) => buildV4dProtocol(advisory, [CONTROLLER_RETRY_AWARENESS]),
  },

  v4d_controller: {
    label: 'v4d + completion/schema/fact controller',
    build: (advisory) => buildV4dProtocol(advisory, [CONTROLLER_RETRY_AWARENESS]),
  },
}

export function buildV4OptimizationProtocol(variantKey, advisory = '') {
  const variant = V4_OPTIMIZATION_VARIANTS[variantKey]
  if (!variant) {
    throw new Error(`Unknown v4 optimization variant: ${variantKey}. Available: ${Object.keys(V4_OPTIMIZATION_VARIANTS).join(', ')}`)
  }
  return variant.build(advisory)
}

export function listV4OptimizationVariants() {
  return Object.entries(V4_OPTIMIZATION_VARIANTS).map(([key, value]) => ({ key, label: value.label }))
}
