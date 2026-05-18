Status: proposed

# Narrator prose philosophy

## Problem

V1 had explicit prose craft philosophy (`lib/system-prompt.ts:341-345`):

> Present tense, second person. Scene transitions get a heading: "## [Location] — [Time]". Keep headings short. Blank lines between dialogue, italic text, and narrative blocks. End with an implicit or explicit "what do you do?"

> **Response length:** Most turns: 100-200 words. Pivotal moments: 300-500 words. The rule is honest density, not word count — if a scene needs space to land, give it space. If it doesn't, don't pad.

> **Silence is a tool.** Not every beat needs words. Let dialogue land. Let moments sit. Trust the player to read the gaps.

SF2's narrator has word targets ("150-250 words per turn target, 400 word cap") but none of the craft philosophy about:
- When to breathe (silence as tool)
- Formatting rhythm (blank lines between dialogue, italic text, narrative)
- Density over word count ("honest density, not word count")
- Scene transitions as headings

## Why this matters

The V1 prose philosophy gave the narrator permission to be spare. "Silence is a tool" means a two-line turn after a devastating reveal is not just allowed but preferred. Without this, the narrator defaults to filling its word budget every turn, producing uniform-density prose that flattens dramatic rhythm.

The formatting rules (blank lines, italic text discipline) also matter for readability and pacing feel.

## Fix

Add a prose philosophy subsection to the SF2 narrator craft block in `role.ts`. Port the V1 principles that are compatible with SF2's architecture:
- Silence/breathing permission
- Formatting rhythm rules
- Density philosophy (replace the bare word cap with the "honest density" framing)
- Scene transition headings

## Files

- `lib/sf2/narrator/prompt/role.ts:3-78` — `SF2_NARRATOR_CRAFT` (edit target)
- `lib/system-prompt.ts:338-345` — V1 tone/formatting/silence rules (reference)
