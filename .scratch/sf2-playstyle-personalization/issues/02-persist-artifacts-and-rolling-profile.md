# Persist Artifacts And Rolling Profile

Status: complete
Labels: complete
Type: AFK
Area: SF2 / persistence / playstyle personalization

## What to build

Persist each closed-chapter playstyle personalization artifact for audit, and maintain a compact rolling campaign-local personalization profile for live use by future roles.

The rolling profile should represent the current best guidance for this campaign. It must not become a cross-campaign player identity profile, and it must not overwrite or reinterpret fiction state.

## Acceptance criteria

- [x] `Sf2State` has migration-safe types for closed-chapter playstyle artifacts and the rolling campaign-local profile.
- [x] Chapter-close flow stores the latest artifact before opening the next chapter.
- [x] A compact rolling profile is updated from prior profile plus the new artifact.
- [x] Persistence normalization preserves old saves with no playstyle data.
- [x] Diagnostics/replay exports include the artifact and rolling profile when present.
- [x] A focused fixture proves old saves normalize and new artifacts survive persistence/export.

## Blocked by

- 01-synthesize-chapter-playstyle-artifact.md

## Comments

Added migration-safe SF2 playstyle state, persistence normalization, IndexedDB chapter-artifact storage, rolling profile updates, and replay fixtures for absent legacy saves plus retained artifact/profile export.
