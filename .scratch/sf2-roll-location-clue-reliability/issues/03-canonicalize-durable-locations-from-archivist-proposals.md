Status: needs-triage
Type: AFK

# Canonicalize Durable Locations From Archivist Proposals

## What to build

Make durable SF2 location identity code-owned while preserving the usual SF2 role split: the Archivist proposes durable location creation or enrichment, and code resolves stable IDs, canonical aliases, merges, duplicate rejection, and persistence.

The Narrator may still move the immediate scene and set the current scene/location, but it should not be able to mint parallel durable locations for the same place through scene movement alone.

## Acceptance criteria

- [ ] Archivist location proposals pass through code-owned canonicalization before persistence.
- [ ] Semantically equivalent location proposals, aliases, and generated IDs merge into the existing durable location instead of creating duplicates.
- [ ] Narrator scene/location writes can update current scene state without creating duplicate durable locations for already-known places.
- [ ] A focused replay fixture reproduces the playthrough shape where locations like docking thresholds/cargo bays/ship interiors duplicated under multiple IDs.
- [ ] Rejected or merged location proposals produce diagnostics that make the canonicalization decision inspectable.

## Blocked by

None - can start immediately.

