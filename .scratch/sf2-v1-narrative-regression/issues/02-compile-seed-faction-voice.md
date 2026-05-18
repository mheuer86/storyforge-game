Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# Rewrite compile-seed factionVoiceRules to match fixed genre bibles

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Rewrite `SETUP_RULES_BY_GENRE.factionVoiceRules` so the Author seed gets the same character-driven faction voice philosophy as the fixed SF2 genre bibles.

Current compile-seed voice rules often describe institutional registers and mechanism language. The genre bibles now describe people under institutional pressure making choices. The Author seed should not reintroduce the old procedural voice.

## Required Behavior

- Each genre's `factionVoiceRules` describes people, stakes, pressure, and choices.
- Avoid mechanism-first phrasing such as "berth priority, safety codes, route permission" as the primary voice description.
- If a mechanism is named, tie it to the person using it or the person paying for it.
- Audit `socialPressures` while in the file and adjust only lines that reintroduce procedure-first framing.
- Keep `likelyAffiliations`, `vocabulary`, and `bannedRegisters` stable unless they directly contradict the new voice philosophy.

## Surfaces

- `lib/sf2/setup/compile-seed.ts`
- `lib/sf2/genre-profile/profiles.ts` as the source of current genre bible voice
- `fixtures/sf2/replay/`

## Implementation Notes

- This is a content change, not a schema change.
- Keep each genre distinct. Do not normalize all voices into the same "people not systems" sentence.
- Space Opera should emphasize crew warmth, dock hands, tired officials, brokers, and named officers rather than route permissions.
- Epic Sci-Fi can still use clean institutional language as horror, but it must point to who pays.
- Cyberpunk can use systems and surveillance, but only through bodies, handlers, fixers, and exposed residents.

## Acceptance Criteria

- [ ] Each genre's `factionVoiceRules` aligns with its `profiles.ts` faction voice.
- [ ] No `factionVoiceRules` line is purely a list of procedures, documents, permissions, or codes.
- [ ] Compile-seed output for at least Space Opera and one non-space genre includes character-driven faction voice.
- [ ] Existing setup seed fields still compile.

## Fixture Expectations

Add or update setup seed fixtures.

Suggested fixture names:

```bash
fixtures/sf2/replay/setup-seed-space-opera-faction-voice.json
fixtures/sf2/replay/setup-seed-cyberpunk-faction-voice.json
```

They should assert that generated seed text contains character-driven voice rules and avoids known procedural phrases.

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/setup-seed-space-opera-faction-voice.json
npm run sf2:replay -- fixtures/sf2/replay/setup-seed-cyberpunk-faction-voice.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Rewriting genre bibles again.
- Changing Author schema.
- Changing playbook/origin data.
