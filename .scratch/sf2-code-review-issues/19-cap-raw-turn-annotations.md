# Cap or externalize raw turn annotations

Status: follow-up
Category: enhancement
**Type:** AFK
**Source:** follow-up from #17

## Decision Carried Forward

Canonical `history.turns` stays for save compatibility, but replay-heavy `narratorAnnotationRaw` should not grow forever in canonical state.

## What to build

Choose and implement a migration-safe retention cap for `history.turns[].narratorAnnotationRaw`, while keeping compact prompt/retrieval state in `history.recentTurns`.

## Acceptance criteria

- [ ] Existing saved campaigns load without losing current-turn behavior.
- [ ] Recent raw annotations needed by replay/debug remain available within the cap.
- [ ] Full raw annotations can be preserved in explicit export/debug artifacts.
- [ ] Add or update replay/persistence fixtures for capped raw annotation behavior.
