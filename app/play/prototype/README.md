# SF2 Prose-First Prototype Route

This isolated route supports `.scratch/sf2-prose-first-narrator` issues 03 and 06.

It intentionally does not modify the production `/play` route or `components/sf2/play-app.tsx`.

Current adapter status:

- Campaign briefs are loaded from `lib/sf2/campaign-briefs` and the markdown files under `content/sf2/campaign-briefs/`.
- The browser play view uses a swappable local narrator adapter with the same transcript/snapshot shape expected from the prose-first narrator slice.
- The terminal smoke harness reads the same markdown brief files and writes a small artifact bundle under `.scratch/sf2-tui/prose-first-runs/`.

The live narrator route and Archivist adapters can replace the local adapter once the prototype is promoted beyond the isolated route.
