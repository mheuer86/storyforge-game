# Domain Docs

Storyforge is a single-context repo. Engineering skills should use the root project context before proposing architecture, implementation, diagnosis, or tests.

## Before exploring, read these

- `CLAUDE.md` for commands, architecture, code style, and high-value files.
- `CONTEXT.md` for product vision, current state, V1/SF2 distinction, and domain language.
- Relevant stable docs under `docs/`, especially when touching shipped systems.
- `docs/adr/` if it exists in the future. If it does not exist, proceed silently.

## Additional project knowledge

When the user references a zettel by ID or title, search the Brainforest vault path described in `CONTEXT.md` before continuing. Vault notes may describe recent decisions that have not landed in code yet.

## Vocabulary

Use Storyforge's existing terms from `CONTEXT.md`, `CLAUDE.md`, and the relevant docs. Preserve the V1/SF2 distinction, and do not normalize Storyforge-specific language into generic RPG or app terms.

## Conflict handling

If a proposed change contradicts current code, `CONTEXT.md`, or stable docs under `docs/`, surface the conflict explicitly instead of silently overriding it.
