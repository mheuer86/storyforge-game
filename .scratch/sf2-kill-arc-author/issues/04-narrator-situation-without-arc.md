Status: proposed

# Narrator situation without arc context

## Problem

The Narrator's situation prompt (`lib/sf2/narrator/prompt/situation.ts`) includes an "Arc context" block (lines 42-49) when an arc plan exists:

```
### Arc context
- Arc: ${arc.title}
- Scenario shape for GM use: ${arc.scenarioShape.mode} — ${arc.scenarioShape.premise}
- Arc question: ${arc.arcQuestion}
- Chapter function: ${arcLink?.chapterFunction}
- Player stance read: ${arcLink?.playerStanceRead}
- Chapter threads advancing arc: [thread links]
```

The chapter packet (`lib/sf2/retrieval/packets/chapter.ts`) also includes an `arc` block with title, scenario, question, and chapter function.

## Change

**Narrator situation:** The arc context block is already conditional (`${arc ? ... : ''}`). When no arc plan exists, it's simply absent. No code change needed — but verify the narrator still functions well without it.

What the narrator loses:
- Arc title — cosmetic, not load-bearing
- Scenario shape label — was mainly anti-procedure guidance ("don't rebuild the rejected default"). With the genre bible fixes, this is less critical.
- Arc question — e.g. "What does loyalty cost when the institution you serve is the threat?" This IS useful. Consider having the Author generate a `chapter_question` that fills this role.
- Chapter function — replaced by structural beat awareness
- Player stance read — this told the narrator where the PC sits on stance axes. Could be derived from decisions/thread state instead.

**Chapter packet:** The `arc` block in `buildChapterPacket` (lines 29-37) is already conditional. When no arc plan exists, `arc` is `undefined`.

**What to add instead:** The Author's `pacing_contract.chapterQuestion` already exists and serves a similar role to arc question. Ensure this is surfaced prominently in the narrator situation. The Author could also emit a `chapter_dramatic_thesis` — one sentence about what this chapter is testing — that replaces both arc question and chapter function.

## Files

- `lib/sf2/narrator/prompt/situation.ts:42-49` — arc context block (already conditional)
- `lib/sf2/retrieval/packets/chapter.ts:29-37` — arc block in chapter packet (already conditional)
- `lib/sf2/author/prompt.ts` — Author could emit `chapter_dramatic_thesis` as replacement

## Effort

Low. The conditional guards already exist. Main work is verifying narrator quality without the arc context and potentially adding a replacement `chapter_dramatic_thesis` field.
