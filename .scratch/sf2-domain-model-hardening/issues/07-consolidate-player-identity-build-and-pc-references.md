# Consolidate Player identity, build, and PC references

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Player identity/build note

## What to build

Clarify `Sf2Player` by separating identity, build, mechanics, inventory, traits, and temporary modifiers. Also centralize the literal PC reference used by decisions, promises, beats, and other participant fields.

The player already has name, species, origin, and class, while campaign meta stores `playbookId` and `originId`. This slice should make that interface explicit and migration-safe.

## Acceptance criteria

- [ ] `Sf2Player` separates identity, build, mechanics, inventory, traits, and temporary modifiers
- [ ] `playbookId` and `originId` have one clear relationship to player build and campaign meta
- [ ] The literal `pc` participant id is centralized as a named constant or value object
- [ ] Promise modeling distinguishes promisor from promisee so PC-owned promises can be queried explicitly
- [ ] Player packet rendering remains stable for Narrator prompts
- [ ] Save normalization migrates existing player saves safely
- [ ] Replay fixture covers player packet output and PC promise ownership

## Blocked by

None - can start immediately

## Comments

HITL decision: whether `playbookId` belongs primarily in player build, campaign meta, or both with one derived from the other.

## Agent Brief

**Category:** architecture
**Summary:** Make Player identity/build explicit and make PC references queryable.

**Current behavior:** Player data is compact, but build identity is split with campaign meta and `pc` is a literal string in multiple places.

**Desired behavior:** Player identity/build has a clear shape; PC-owned decisions/promises and emotional beats can reference the player through a stable constant.

**Key interfaces:** `Sf2Player`, `Sf2CampaignMeta`, `Sf2Decision`, `Sf2Promise`, `Sf2BeatParticipant`, player packet, persistence normalization.

**Out of scope:** Full character builder redesign.

