Status: ready-for-agent

# 08 — Visual distinction between player input and narration

## Problem

The prototype's centre column renders all text as one continuous blob. Player input and narrator prose are visually indistinguishable, making it hard to follow the conversation flow during playtesting.

SF2 proper already solves this with a `PlayerMessage` component that floats right with a distinct card style, while narrator prose renders left-aligned with serif font.

## Current behaviour

`displayProse` in `prototype-play-app.tsx` (~line 770) concatenates `session.prose`, the `activePlayerInput` prefixed with `> `, and `liveProse` into a single string, then renders the whole thing through `renderMarkdown()`.

```tsx
const displayProse = [
  session.prose,
  activePlayerInput ? `> ${activePlayerInput}` : '',
  liveProse,
].filter((part) => part.trim()).join('\n\n')
```

The markdown blockquote `>` is the only visual signal for player input, and it's subtle.

## Desired behaviour

Render committed turns as alternating player/narrator blocks with clear visual distinction, similar to SF2 proper's `play-shell.tsx`. The live turn (streaming narrator + active player input) should also use the same visual split.

## Implementation plan

### 1. Render committed turns as structured blocks

Replace the single `displayProse` string with a loop over `session.transcript`. Each entry has `speaker: 'player' | 'narrator'` and `content: string`.

```tsx
{session.transcript.map((entry, i) => (
  entry.speaker === 'player'
    ? <PlayerMessage key={i}>{entry.content}</PlayerMessage>
    : <NarratorProse key={i}>{renderMarkdown(entry.content)}</NarratorProse>
))}
```

### 2. Add a PlayerMessage component

Steal the styling from SF2's `play-shell.tsx` line 1588-1596:

```tsx
function PlayerMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-l-lg border-r border-primary/35 bg-primary/15 py-3 pl-5 pr-5 text-foreground shadow-[0_0_22px_-12px] shadow-primary/20 md:max-w-[82%] md:py-4 md:pl-6 md:pr-6"
      style={{ fontFamily: 'var(--font-narrative)', lineHeight: 1.65 }}
    >
      {children}
    </div>
  )
}
```

### 3. Render the live turn separately

After the committed turn loop, render the active player input and live streaming prose as distinct elements:

```tsx
{activePlayerInput && <PlayerMessage>{activePlayerInput}</PlayerMessage>}
{liveProse && (
  <NarratorProse>
    {renderMarkdown(liveProse)}
    {isStreaming && <span className="animate-pulse text-primary"> |</span>}
  </NarratorProse>
)}
```

### 4. Remove the displayProse concatenation

Delete the `displayProse` variable and the single `<article>` that currently wraps `renderMarkdown(displayProse)`.

## Files to change

- `components/sf2/prototype-play-app.tsx` — restructure centre column rendering, add `PlayerMessage` and `NarratorProse` components

## Reference

- `components/sf2/play-shell.tsx` lines 1382-1404 (committed turn loop) and 1588-1596 (`PlayerMessage`)

## Verification

- Start a campaign, send a few turns
- Player input should appear right-aligned with a card style
- Narrator prose should appear left-aligned with serif font
- Live streaming should show the same visual distinction
- Committed turns should persist the split after the turn completes
