# SF2 Narrator Prompt Module

`lib/sf2/narrator/prompt.ts` is the public facade. External callers should keep importing from that file so prompt cache assembly and compatibility re-exports remain centralized.

Internal files in this directory own implementation details:

- `core.ts` owns the world-independent cached core.
- `role.ts` owns the cached Narrator role, craft rules, and output contract.
- `situation.ts` owns the chapter-scoped cached projection of Author setup.

Per-turn mutable state does not belong in `situation.ts`. Scene/message assembly and dynamic blocks live in `lib/sf2/narrator/messages.ts`, `lib/sf2/narrator/turn-context.ts`, and `lib/sf2/retrieval/scene-packet.ts`.

Any behavior-changing prompt edit belongs in a dedicated ticket with fixture coverage. Structural edits here should preserve prompt text and section order.
