---
shaping: true
---

# Damage & Healing Dice — Shaping

## Problem

Weapons define damage dice (e.g. `"1d10 energy"`, `"1d6+DEX"`) and healing items define effect dice (e.g. `"1d8+WIS HP"`), but no mechanical system resolves them. The `request_roll` tool only supports d20 skill checks. When an attack hits or a healing item is used, Claude picks an arbitrary number for `hpChange` — the dice strings are flavor text.

## Outcome

Players roll damage and healing dice through the same interactive dice UI used for skill checks. Enemy damage is auto-resolved and displayed as a roll badge. All dice defined on items are mechanically meaningful.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Weapon damage is resolved by rolling the weapon's defined damage dice (e.g. "1d10 energy") | Core goal |
| R1 | Healing item effects are resolved by rolling their defined dice (e.g. "1d8+WIS HP") | Must-have |
| R2 | Damage formulas support stat-based modifiers (e.g. "+DEX", "+WIS") | Must-have |
| R3 | The dice modal headline distinguishes roll type (skill check vs attack damage vs healing) | Must-have |
| R4 | Player rolls their own damage/healing dice interactively (same modal, click-to-roll) | Must-have |
| R5 | Enemy damage is auto-resolved and displayed as a roll badge after the narrative | Must-have |
| R6 | The existing d20 skill check flow is not disrupted | Must-have |

---

## Shape A: Extend `request_roll` (Selected)

| Part | Mechanism |
|------|-----------|
| **A1** | Add `sides` param to `request_roll` tool (6, 8, 10, 12, 20; default 20) |
| **A2** | Add `rollType` param ("check" / "damage" / "healing" / "enemy_damage") to drive UI headline and behavior |
| **A3** | Add `damageType` param (optional — "energy", "fire", "shock", etc.) for display context |
| **A4** | Enemy damage (`rollType: "enemy_damage"`): Claude auto-resolves, passes result via `update_character` with `rollBreakdown` metadata; displayed as roll badge after narrative |
| **A5** | Dice modal headline varies by `rollType` (e.g. "Attack Damage — Plasma Rifle", "Healing — Medpatch", "Stealth Check") |
| **A6** | `update_character` gains optional `rollBreakdown` field (`{ dice: string, roll: number, modifier: number, total: number, damageType?: string, label: string }`) so UI can render enemy damage as a roll badge |
| **A7** | Stat-based modifiers (+DEX, +WIS) are resolved by Claude server-side from character stats, passed as the numeric `modifier` value |

## Fit Check: R × A

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Weapon damage resolved by rolling weapon's defined dice | Core goal | ✅ |
| R1 | Healing item effects resolved by rolling their defined dice | Must-have | ✅ |
| R2 | Damage formulas support stat-based modifiers | Must-have | ✅ |
| R3 | Dice modal headline distinguishes roll type | Must-have | ✅ |
| R4 | Player rolls their own damage/healing dice interactively | Must-have | ✅ |
| R5 | Enemy damage auto-resolved, displayed with roll badge | Must-have | ✅ |
| R6 | Existing d20 skill check flow not disrupted | Must-have | ✅ |

**Notes:**
- R6: `sides` defaults to 20, `rollType` defaults to "check" — existing `request_roll` calls work unchanged
- R2/A7: Claude reads the weapon's damage string and the character's stats, then passes the resolved numeric modifier — no formula parsing needed on the front-end

---

## Slices

### V1 — Player damage/healing rolls (interactive)

Extend the tool, types, streaming, modal, and badge to support variable-sided dice with roll type headlines. After V1, players can roll d6/d8/d10/d12 for damage and healing through the existing modal.

### V2 — Enemy damage roll badges

Add `rollBreakdown` to `update_character` and render it as a roll badge in the chat. After V2, enemy damage shows as a badge below the GM narrative.

### V3 — System prompt & Claude instructions

Update the system prompt to instruct Claude on when and how to use the new parameters. After V3, Claude correctly calls `request_roll` with `sides`, `rollType`, and `damageType` during combat and healing.

---

## V1 — Player damage/healing rolls

### V1.1 — Extend types (`lib/types.ts`)

**`RequestRollInput` interface (~line 473):** Add optional fields:

```typescript
interface RequestRollInput {
  checkType: string
  stat: keyof StatBlock
  dc: number
  modifier: number
  reason: string
  advantage?: 'advantage' | 'disadvantage'
  contested?: ContestedRollInfo
  // NEW
  sides?: number        // 6 | 8 | 10 | 12 | 20, default 20
  rollType?: string     // 'check' | 'damage' | 'healing'
  damageType?: string   // 'energy' | 'fire' | 'shock' | 'slashing' etc.
}
```

**`RollDisplayData` interface (~line 297):** Add optional fields:

```typescript
// ADD to existing interface
sides?: number
rollType?: string
damageType?: string
```

**`RollRecord` interface (~line 322):** Add optional fields:

```typescript
// ADD to existing interface
sides?: number
rollType?: string
damageType?: string
```

**`StreamEvent` roll_prompt variant (~line 407):** Add optional fields to the roll_prompt event type:

```typescript
// ADD to existing roll_prompt event
sides?: number
rollType?: string
damageType?: string
```

### V1.2 — Extend tool definition (`lib/tools.ts`)

**`request_roll` tool input_schema (~line 121):** Add three properties:

```typescript
sides: {
  type: 'number' as const,
  description: 'Number of sides on the die. 6, 8, 10, 12, or 20. Default 20 for skill checks.',
  enum: [6, 8, 10, 12, 20],
}
rollType: {
  type: 'string' as const,
  description: 'Type of roll: "check" for skill/ability checks (d20 vs DC), "damage" for player attack damage, "healing" for healing item use.',
  enum: ['check', 'damage', 'healing'],
}
damageType: {
  type: 'string' as const,
  description: 'Damage or healing type label for display (e.g. "energy", "fire", "slashing", "HP"). Optional.',
}
```

None added to `required` — all optional, preserving backwards compat.

### V1.3 — Pass new fields through streaming (`app/api/game/route.ts`)

**`request_roll` intercept (~line 133):** Thread `sides`, `rollType`, `damageType` from the tool input into the `roll_prompt` event sent to the client.

**Phase 2 roll resolution (~line 225):** Thread `sides`, `rollType`, `damageType` into the `RollRecord` and the roll result text.

**`resolveRoll` function:** For non-check rolls (`rollType !== 'check'`), skip DC/critical/fumble logic — just return `{ total: roll + modifier }`. Damage/healing rolls don't have DCs or crits/fumbles.

### V1.4 — Update dice modal (`components/game/dice-roll-modal.tsx`)

**Headline (~line 77):** Change from hardcoded `"{check} Check"` to:
- `rollType === 'damage'` → `"Attack Damage — {check}"`
- `rollType === 'healing'` → `"Healing — {check}"`
- default/`'check'` → `"{check} Check"` (unchanged)

**Random number generation (~line 50):** Change from `Math.floor(Math.random() * 20) + 1` to `Math.floor(Math.random() * sides) + 1` using the `sides` prop (default 20).

**Dice label (~line 131):** Change from hardcoded `"d20"` to `"d{sides}"`.

**DC display (~line 87):** For damage/healing rolls, hide the DC column (there's no DC to beat). Show only the modifier.

**Result display (~line 136):** For damage/healing rolls, skip success/failure/critical logic. Show: `"Rolled {roll} + {modifier} = {total} {damageType}"`.

**Die size display:** Keep the 32x32 die box, just change the label text.

### V1.5 — Update roll badge (`components/game/roll-badge.tsx`)

**Standard roll display (~line 87):** For damage/healing rolls:
- Header: `"{check} — {damageType}"` instead of `"{check}"`
- Body: `"Roll {roll} + {modifier} = {total} {damageType}"` (no DC, no success/failure)
- Die box: Show `"d{sides}"` label, color based on rollType (use a damage/healing color instead of success/failure)

### V1.6 — Update game-screen roll handling (`components/game/game-screen.tsx`)

**`RollPrompt` interface (~line 34):** Add `sides`, `rollType`, `damageType` fields.

**Stream handler for `roll_prompt` event (~line 210):** Pass `sides`, `rollType`, `damageType` from the event into the `RollPrompt` state.

**`handleDiceClick` (~line 680):** Use `rollPrompt.sides` (default 20) instead of hardcoded 20 for random generation.

**Inline roll button (~line 1119):** Show `"d{sides}"` instead of `"d20"`. Adjust label text based on rollType.

**`sendContinuation` (~line 451):** Thread `sides`, `rollType`, `damageType` into the `RollResolution` and the `RollDisplayData` for the roll message.

**Advantage/disadvantage:** For damage/healing rolls, advantage/disadvantage don't apply. The modal should not show the advantage badge. (Claude shouldn't send advantage for damage rolls, but guard in UI too.)

### V1.7 — Update tool-processor roll record (`lib/tool-processor.ts`)

**`_roll_record` processing (~line 541):** Thread `sides`, `rollType`, `damageType` into the persisted roll log entry.

---

## V2 — Enemy damage roll badges

### V2.1 — Extend `update_character` tool definition (`lib/tools.ts`)

Add optional `rollBreakdown` property to `update_character` input schema:

```typescript
rollBreakdown: {
  type: 'object' as const,
  description: 'Dice roll breakdown for display (e.g. enemy damage). Rendered as a roll badge.',
  properties: {
    label: { type: 'string' as const, description: 'Display label (e.g. "Guard Attack")' },
    dice: { type: 'string' as const, description: 'Dice notation (e.g. "1d8+2")' },
    roll: { type: 'number' as const, description: 'Raw die result' },
    modifier: { type: 'number' as const, description: 'Total modifier applied' },
    total: { type: 'number' as const, description: 'Final result (roll + modifier)' },
    damageType: { type: 'string' as const, description: 'Damage type (e.g. "energy", "fire")' },
    sides: { type: 'number' as const, description: 'Die sides (6, 8, 10, 12, 20)' },
  },
  required: ['label', 'dice', 'roll', 'modifier', 'total'],
}
```

### V2.2 — Extend types (`lib/types.ts`)

Add `RollBreakdown` interface and add it to `UpdateCharacterInput`:

```typescript
export interface RollBreakdown {
  label: string
  dice: string
  roll: number
  modifier: number
  total: number
  damageType?: string
  sides?: number
}
```

Add to `ChatMessage.statChanges` or as a new `rollBreakdown?: RollBreakdown` field on `ChatMessage`.

### V2.3 — Process rollBreakdown in tool-processor (`lib/tool-processor.ts`)

**`update_character` handler (~line 34):** If `input.rollBreakdown` exists, include it in the tool result so the client can render a badge. Pass it through as part of the `statChanges` or as a separate field on the tool result event.

### V2.4 — Render enemy roll badge in chat (`components/game/game-screen.tsx`)

When a `tools` event arrives with `update_character` results containing `rollBreakdown`, create a damage roll badge in the message stream. Reuse the `RollBadge` component with a damage-specific variant, or create a lightweight `DamageBadge` component that shows:

```
🎲 Guard Attack: 1d8+2 → 7 fire
```

Display it inline with the stat changes (HP loss) that accompany it.

---

## V3 — System prompt updates

### V3.1 — Update system prompt (`lib/system-prompt.ts`)

Add instructions in the combat module (~line 315) telling Claude:

1. **After a successful attack roll**, call `request_roll` again with:
   - `sides` matching the weapon's damage dice (e.g. 10 for "1d10 energy")
   - `rollType: "damage"`
   - `checkType` set to the weapon name (e.g. "Plasma Rifle")
   - `damageType` from the weapon's damage string (e.g. "energy")
   - `modifier` resolved from the character's stats if the weapon specifies +STAT

2. **For healing items**, call `request_roll` with:
   - `sides` matching the item's effect dice
   - `rollType: "healing"`
   - `checkType` set to the item name (e.g. "Medpatch")
   - `damageType: "HP"`

3. **For enemy damage**, do NOT use `request_roll`. Instead:
   - Roll the enemy's damage dice internally (pick a value within range)
   - Call `update_character` with `hpChange` AND `rollBreakdown` containing the breakdown

4. **Stat modifier resolution**: When a weapon says "+DEX", look up the character's DEX modifier and pass it as the numeric `modifier` value.

### V3.2 — Update tool descriptions (`lib/tools.ts`)

Update the `request_roll` tool description to mention damage and healing use cases, so Claude understands it's not just for skill checks.

---

## File Change Summary

| File | V1 | V2 | V3 |
|------|----|----|-----|
| `lib/types.ts` | ✅ Add `sides`, `rollType`, `damageType` to 4 interfaces | ✅ Add `RollBreakdown` interface | |
| `lib/tools.ts` | ✅ Add 3 params to `request_roll` schema | ✅ Add `rollBreakdown` to `update_character` schema | ✅ Update tool descriptions |
| `app/api/game/route.ts` | ✅ Thread new fields through streaming + roll resolution | | |
| `components/game/dice-roll-modal.tsx` | ✅ Variable sides, rollType headline, hide DC for damage | | |
| `components/game/roll-badge.tsx` | ✅ Damage/healing variant display | ✅ Enemy damage badge variant | |
| `components/game/game-screen.tsx` | ✅ Thread new fields, variable dice generation | ✅ Render enemy roll badge from tool results | |
| `lib/tool-processor.ts` | ✅ Thread new fields into roll log | ✅ Process `rollBreakdown` | |
| `lib/system-prompt.ts` | | | ✅ Combat/healing dice instructions |
