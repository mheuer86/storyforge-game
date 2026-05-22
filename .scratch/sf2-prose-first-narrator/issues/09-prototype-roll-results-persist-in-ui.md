Status: ready-for-agent

# 09 — Roll results visible and persistent in the UI

## Problem

When a roll is requested, the `RollPanel` appears. After the player clicks the roll button, the d20 resolves and the narrator resumes — but once the turn completes, all roll state is cleared (`setLiveRolls([])`, `setRollResult(null)`, `setPendingCheck(null)` at line ~379-381). The roll result vanishes from the UI entirely.

The player has no record of what they rolled, what the DC was, or whether they succeeded or failed.

## Current behaviour

1. Narrator requests a roll → `pendingCheck` set → `RollPanel` renders in a border-t bar below the prose
2. Player clicks "Roll d20" → `resolvePendingCheck()` fires, `rollResult` set → outcome briefly visible inside `RollPanel`
3. Narrator resumes streaming post-roll prose
4. Turn completes → all roll state cleared → `RollPanel` unmounts → result gone

## Desired behaviour

Roll results should persist in the prose flow after the turn completes, similar to SF2 proper's inline `HistoryRollCard` rendered via `NarrativeWithRolls`. The roll card should show:

- Skill name and DC
- d20 result, modifier, total
- Outcome (critical / success / failure / fumble) with colour coding
- Stakes/consequence text from `pendingCheck.why` and `pendingCheck.consequenceOnFail`

## Implementation plan

### 1. Record roll results in the transcript

When a roll resolves, store it alongside the narrator prose in the session transcript. The `Sf2ClientLiveRollView` already has a `proseOffset` field indicating where in the prose the roll was requested. The `Sf2ClientRollOutcome` has all the mechanical data.

Add a `rolls` field to the transcript entry or create a parallel roll log:

```ts
interface Sf2PrototypeTranscriptRoll {
  skill: string
  dc: number
  effectiveDc: number
  d20: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  why: string
  consequenceOnFail?: string
}
```

In `appendSf2PrototypeCommittedTurn` (prototype-session.ts ~line 258), include the roll records from `narratorResult.rollRecords` or reconstruct from `liveRolls` state.

### 2. Render committed roll results inline

When rendering committed turns (after issue 08's visual split), insert a `RollResultCard` at the appropriate position in the narrator prose. A simpler approach for the prototype: render the roll card between the prose segments or just before/after the narrator prose block for the turn that contained the roll.

```tsx
function RollResultCard({ roll }: { roll: Sf2PrototypeTranscriptRoll }) {
  const toneClass = {
    critical: 'border-green-500/50 bg-green-500/10 text-green-400',
    success: 'border-primary/50 bg-primary/10 text-primary',
    failure: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
    fumble: 'border-destructive/50 bg-destructive/10 text-destructive',
  }[roll.result]

  return (
    <div className={cn('my-3 rounded-lg border p-3 font-mono text-sm', toneClass)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider">{roll.skill} vs DC {roll.effectiveDc}</span>
        <span className="text-[11px] uppercase tracking-wider font-semibold">{roll.result}</span>
      </div>
      <div className="mt-1 text-xs opacity-75">
        d20({roll.d20}) {roll.modifier >= 0 ? '+' : ''}{roll.modifier} = {roll.total}
      </div>
    </div>
  )
}
```

### 3. Keep RollPanel visible during the live roll

The existing `RollPanel` component is fine for the live roll interaction. The key change is that after the roll resolves and the turn completes, the result persists as a `RollResultCard` in the committed turn view rather than disappearing.

### 4. Wire roll data through the commit path

In `prototype-play-app.tsx`, capture `liveRolls` and `rollResult` before they're cleared at turn commit time (~line 359-383). Pass them to `appendSf2PrototypeCommittedTurn` so the roll data lands in the transcript/session.

The `narratorResult.rollRecords` from the narrator orchestrator already contains the roll data — check if this is sufficient or if the client-side `liveRolls` state needs to supplement it.

## Files to change

- `components/sf2/prototype-session.ts` — add roll type, store rolls in transcript entries
- `components/sf2/prototype-play-app.tsx` — add `RollResultCard` component, wire roll data to committed turns, render inline

## Reference

- `components/sf2/play-shell.tsx` lines 1629-1700 (`rollToneForHistory`, `rollToneForResult`, `rollCardClassName`) for colour/tone patterns
- `components/sf2/play-shell.tsx` lines 1949-1990 (`HistoryRollCard`) for the committed roll card layout
- `lib/sf2/runtime/client-turn-orchestrator.ts` for `Sf2ClientLiveRollView` and `Sf2ClientRollOutcome` types

## Verification

- Start a campaign, reach a roll check
- Roll the d20 — result should be visible in the RollPanel
- After the narrator resumes and the turn commits, the roll result should remain visible inline in the prose history
- Start another turn — previous roll result should still be visible in the scroll-back
- Check all four outcome tones: critical, success, failure, fumble
