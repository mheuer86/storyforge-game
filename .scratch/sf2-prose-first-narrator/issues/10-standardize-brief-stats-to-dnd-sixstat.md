Status: ready-for-agent

# 10 — Standardize campaign brief stats to STR/DEX/CON/INT/WIS/CHA

## Problem

Each campaign brief defines its own genre-flavored stat names (EDGE/SCAN/GRIT for space-opera, NERVE/STREET/SHARP for noire, TECH/NET/REFLEX for cyberpunk, etc.), but the code — `Sf2State.player.stats`, genre configs, and the prototype sidebar — all use standard D&D stats: STR, DEX, CON, INT, WIS, CHA.

The prose-first narrator runs from the brief's system prompt, so it uses the brief's stat names when requesting rolls. The sidebar displays the genre config's standard stats. The player sees "EDGE" in the narrative but "DEX" in the sidebar. Roll resolution uses the code's stat values keyed by the standard names, so a narrator-requested "EDGE check" has to be mapped somewhere — currently it isn't, so the mapping is ad-hoc or broken.

## Current state by brief

| Brief | Stats used | Matches code? |
|-------|-----------|---------------|
| `fantasy/covenant.md` | STR, DEX, CON, INT, WIS, CHA | Yes |
| `cold-war/cardinal.md` | TRADECRAFT, FIELDCRAFT, SOCIAL, INTEL | No (4 stats, not 6) |
| `space-opera/forty-thousand.md` | EDGE, SCAN, GRIT, CHARM, TECH, WEIGHT | No |
| `cyberpunk/chrome.md` | TECH, NET, REFLEX, COOL, AWARENESS, BODY | No |
| `epic-scifi/hegemony-seeker.md` | FORCE, REFLEX, WILL, SENSE, ACUITY | No (5 stats) |
| `noire/sable.md` | NERVE, STREET, SHARP, SHADOW | No (4 stats) |
| `grimdark/pale-flame.md` | (no stat section found) | N/A |

The code type is locked at six stats:
```ts
// lib/sf2/types.ts line 1487
stats: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number }
```

## Desired behaviour

All campaign briefs use the standard six-stat block (STR, DEX, CON, INT, WIS, CHA) with genre-appropriate descriptions that give each stat flavour without renaming it.

Example pattern (from `fantasy/covenant.md` which already does this):
```
**INT (Intelligence)** — Spellcasting, knowledge, investigation, deduction.
**DEX (Dexterity)** — Ranged attacks, stealth, initiative, avoiding things that move fast.
```

For space-opera, this would become:
```
**DEX (Dexterity)** — Piloting under pressure, fast hands, moving before the room agrees.
**WIS (Wisdom)** — Reading routes, people, sensors, contracts, and lies.
**CON (Constitution)** — Staying upright through fear, fatigue, recoil, or vacuum-cold math.
**CHA (Charisma)** — Keeping someone talking, making the bad option sound survivable.
**INT (Intelligence)** — Repairs, spoofing, ship systems, improvised hardware.
**STR (Strength)** — Social standing, clean credit, legal authority, institutional protection.
```

The genre flavour text stays; only the canonical name changes. The stat array (16, 15, 14, 12, 10, 8) and proficiency bonus remain unchanged.

## Implementation plan

### 1. Update each brief's `### Stats` section

For each brief, replace the custom stat names with the standard six-stat names. Preserve the genre flavour descriptions. Map each custom stat to its closest D&D equivalent:

**space-opera/forty-thousand.md:**
- EDGE → DEX, SCAN → WIS, GRIT → CON, CHARM → CHA, TECH → INT, WEIGHT → STR

**cyberpunk/chrome.md:**
- TECH → INT, NET → WIS, REFLEX → DEX, COOL → CHA, AWARENESS → WIS (merge with NET?), BODY → CON
- Note: cyberpunk has 6 stats so this maps cleanly, but AWARENESS and NET both map to perception-adjacent stats. May need to merge or reassign. Use judgment.

**epic-scifi/hegemony-seeker.md:**
- FORCE → STR, REFLEX → DEX, WILL → CHA, SENSE → WIS, ACUITY → INT
- Missing CON — add it with genre-appropriate description.

**noire/sable.md:**
- NERVE → CON, STREET → WIS, SHARP → INT, SHADOW → DEX
- Missing STR and CHA — add them with genre-appropriate descriptions.

**cold-war/cardinal.md:**
- TRADECRAFT → DEX, FIELDCRAFT → STR, SOCIAL → CHA, INTEL → INT
- Missing CON and WIS — add them with genre-appropriate descriptions.

**grimdark/pale-flame.md:**
- Check if stats section exists; if not, add one following the pattern.

### 2. Update all stat references within each brief

Each brief references its custom stat names throughout (in wound tables, roll examples, proficiency descriptions, character creation questions, opening scene text). All of these references need updating to use the standard names.

Search each brief for all occurrences of the custom stat names and replace them. For example in `forty-thousand.md`, replace "EDGE" with "DEX" in the wound table, failed check examples, etc.

### 3. Keep genre config stats unchanged

The genre configs in `lib/genres/*.ts` already use `{ STR, DEX, CON, INT, WIS, CHA }` — no code changes needed there.

## Files to change

- `content/sf2/campaign-briefs/space-opera/forty-thousand.md`
- `content/sf2/campaign-briefs/cyberpunk/chrome.md`
- `content/sf2/campaign-briefs/epic-scifi/hegemony-seeker.md`
- `content/sf2/campaign-briefs/noire/sable.md`
- `content/sf2/campaign-briefs/cold-war/cardinal.md`
- `content/sf2/campaign-briefs/grimdark/pale-flame.md` (if stat section exists)

No code changes needed. Fantasy brief already uses standard stats.

## Risks

- The custom stat names carry genre identity. "EDGE check" sounds more space-opera than "DEX check". Mitigate by keeping flavour descriptions on each stat so the narrator can still say "Roll DEX — that's your piloting reflex, fast hands under pressure" rather than just "Roll DEX".
- Some briefs use 4 or 5 stats instead of 6. Adding the missing stats means inventing genre-appropriate descriptions and adjusting the stat array instructions (still 16/15/14/12/10/8 but now distributed across 6 rather than 4-5).

## Verification

- Open each brief and confirm all stat references use STR/DEX/CON/INT/WIS/CHA
- Start a campaign with each brief — narrator should request rolls using standard stat names
- Sidebar stats should match what the narrator calls them
- No orphaned references to old custom stat names in any brief
