# SF2B Mode Continuity and Export Identity

Status: needs-triage
Type: AFK
Area: SF2B / experiment shell / persistence

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Make SF2B mode identity durable across campaign start, chapter transition, persistence reload, API routing, diagnostics, and export.

The motivating failure is the Chapter 2 export that was expected to be SF2B but reported `runtimeMode: "sf2"`, used a normal `camp_...` campaign id, and contained a completely different campaign substrate. This slice should make that impossible to miss and hard to produce.

## Acceptance criteria

- [ ] A campaign started in SF2B keeps `meta.experimentMode = "sf2b-hook"` through Chapter 1 close and Chapter 2 open.
- [ ] SF2B campaign ids keep the `sf2b_camp_` prefix after chapter transition and persistence reload.
- [ ] SF2B chapter-meaning, Author, Narrator, and Archivist calls route through the SF2B endpoint aliases or otherwise carry an explicit SF2B marker.
- [ ] Session and replay exports from an SF2B campaign use the `sf2b-session` / `sf2b-replay` filename prefix and `runtimeMode: "sf2b"` payload.
- [ ] The UI/debug surface records an invariant event when runtime mode, campaign id prefix, endpoint family, or experiment marker disagree.
- [ ] A focused fixture or smoke check covers Chapter 1 close into Chapter 2 and fails if the resulting state is regular SF2.

## Blocked by

None - can start immediately.

## Out of scope

- Migrating regular SF2 saves into SF2B.
- Changing V1 behavior.
- Designing a public experiment picker.

## Comments

This is the foundation ticket. We cannot evaluate continuity if the run can silently leave the experiment path.
