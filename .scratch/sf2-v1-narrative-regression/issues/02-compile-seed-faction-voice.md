Status: proposed

# Rewrite compile-seed factionVoiceRules to match fixed genre bibles

## Problem

`lib/sf2/setup/compile-seed.ts` lines 28-237 contain per-genre `SETUP_RULES_BY_GENRE` adapters with their own `factionVoiceRules`. These feed the Author seed independently of the genre bibles we just fixed.

The compile-seed versions are mechanism-first:
- "Station officials speak in berth priority, safety codes, route permission, and liability."
- "Collegium scholars speak in careful claims, citations, and reputation management."
- "Corporate voices speak in liability, assets, risk, and brand-safe threats."

The fixed genre bibles describe faction voices as *people under pressure making choices*. The compile-seed copy still describes them as *institutional registers*.

## Fix

Rewrite each genre's `factionVoiceRules` array in `SETUP_RULES_BY_GENRE` to match the character-driven voice from the corresponding genre bible in `profiles.ts`. The Author should receive the same faction voice philosophy the Narrator gets.

Also audit `socialPressures` arrays — some are good ("A ship is a closed economy of fuel, parts, food, ammo, morale, and trust") but others lean procedural ("Route access, docking, permits, reputation, debt, and cargo all become human leverage" — the "human leverage" save doesn't redeem the mechanism list).

## Files

- `lib/sf2/setup/compile-seed.ts:28-237` — `SETUP_RULES_BY_GENRE`
- `lib/sf2/genre-profile/profiles.ts` — fixed genre bibles (reference)
