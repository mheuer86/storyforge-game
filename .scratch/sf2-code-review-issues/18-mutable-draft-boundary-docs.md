# Document SF2 mutable draft boundaries

Status: follow-up
Category: enhancement
**Type:** AFK
**Source:** follow-up from #17

## Decision Carried Forward

SF2 uses mutable drafts with named clone boundaries.

## What to build

Document and lightly enforce naming conventions:
- `applyX` mutates a draft.
- `withX` returns a new value.
- Route and pipeline entry points own clone boundaries.

## Acceptance criteria

- [ ] Add a short architecture note in the SF2 docs or code-adjacent comments.
- [ ] Identify the main clone boundaries in turn pipeline, apply-patch, persistence normalization, and route handlers.
- [ ] No behavior changes.
