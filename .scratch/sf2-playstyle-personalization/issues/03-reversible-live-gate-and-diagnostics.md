# Add Reversible Live Gate And Diagnostics

Status: complete
Labels: complete
Type: AFK
Area: SF2 / diagnostics / playstyle personalization

## What to build

Make playstyle personalization live by default but reversible. The system should use the rolling campaign-local profile unless an internal gate disables it, and diagnostics should make the current profile and recent artifact inspectable without adding normal player-facing UI.

This is not a player settings screen. The first implementation is internal and diagnostic-only so weak personalization can be turned off or trimmed after playtest evidence.

## Acceptance criteria

- [x] There is a single internal gate for whether playstyle personalization influences live roles.
- [x] The default posture is enabled for new implementation runs.
- [x] Diagnostics/debug export shows whether personalization was enabled, skipped, failed open, or disabled.
- [x] The normal player UI does not expose an edit/review surface for this feature.
- [x] If the gate is disabled, chapter close still persists artifacts for audit but live prompts do not consume the rolling profile.
- [x] A focused fixture/helper test proves prompt rendering omits personalization when disabled.

## Blocked by

- 02-persist-artifacts-and-rolling-profile.md

## Comments

Added the campaign-local `liveEnabled` gate with status diagnostics, default enabled state for new campaigns, fail-open status recording, and replay coverage proving prompt omission when disabled.
