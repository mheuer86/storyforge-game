'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/lib/game-data'

interface StatChange {
  type: 'gain' | 'loss' | 'new' | 'neutral'
  label: string
}

interface ChatMessageProps {
  message: ChatMessageType
  statChanges?: StatChange[]
  onFlag?: (content: string) => void
  onRetry?: () => void
}

function renderMarkdown(text: string) {
  // Fix missing spaces after sentence-ending punctuation (e.g. "you.Not" → "you. Not", 'heads."Sera' → 'heads." Sera')
  // Also fix horizontal rules glued to text (e.g. "one.---" → "one.\n---", "---Tactical" → "---\nTactical")
  const normalized = text.replace(/([.!?]["']?)([A-Z])/g, '$1 $2').replace(/([^\n])---/g, '$1\n---').replace(/---([^\n])/g, '---\n$1')
  const lines = normalized.split('\n')
  return lines.map((line, i) => {
    const addBreak = i < lines.length - 1

    // --- horizontal rule
    if (line.trim() === '---') {
      return <hr key={i} className="my-3 border-t border-border/20" />
    }
    // ## heading
    if (line.startsWith('## ')) {
      return <span key={i} className="block mt-3 mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-primary/70">{line.slice(3)}{addBreak && <br />}</span>
    }
    // # heading
    if (line.startsWith('# ')) {
      return <span key={i} className="block mt-4 mb-1 font-mono text-sm font-bold uppercase tracking-widest text-primary/80">{line.slice(2)}{addBreak && <br />}</span>
    }

    // Numbered list item (e.g. "1. text" or "1) text")
    const listMatch = line.match(/^(\d+)[.)]\s+(.*)/)
    // Bullet list item (e.g. "- text")
    const bulletMatch = !listMatch && line.match(/^[-•]\s+(.*)/)
    const lineContent = listMatch ? listMatch[2] : bulletMatch ? bulletMatch[1] : line
    const listPrefix = listMatch ? `${listMatch[1]}. ` : bulletMatch ? '• ' : null

    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let last = 0
    let match
    let key = 0
    while ((match = regex.exec(lineContent)) !== null) {
      if (match.index > last) parts.push(match.input.slice(last, match.index))
      if (match[1] !== undefined) parts.push(<strong key={key++}>{match[1]}</strong>)
      else if (match[2] !== undefined) parts.push(<em key={key++}>{match[2]}</em>)
      last = match.index + match[0].length
    }
    if (last < lineContent.length) parts.push(lineContent.slice(last))

    if (listPrefix) {
      return <span key={i} className="block pl-4 -indent-4 mt-1"><span className="text-muted-foreground/60">{listPrefix}</span>{parts}{addBreak && <br />}</span>
    }
    return <span key={i}>{parts}{addBreak && <br />}</span>
  })
}

function getChangeColor(type: StatChange['type']) {
  switch (type) {
    case 'gain': return 'text-success/70 border-success/20 bg-success/5'
    case 'loss': return 'text-destructive/70 border-destructive/20 bg-destructive/5'
    case 'new': return 'text-muted-foreground/70 border-border/20 bg-secondary/5'
    case 'neutral': default: return 'text-muted-foreground/50 border-border/15 bg-secondary/5'
  }
}

export function ChatMessage({ message, statChanges, onFlag, onRetry }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleFlagClick = () => {
    if (onFlag) {
      onFlag(message.content)
    }
  }

  // Error state (any message type)
  if (onRetry) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <span className="flex-1">{message.content}</span>
        <button
          onClick={onRetry}
          className="shrink-0 rounded px-3 py-1 text-xs font-medium border border-destructive/40 hover:bg-destructive/10 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // GM narrative message — left accent border, no full card outline
  if (message.type === 'gm') {
    return (
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="max-w-[85%] border-l border-primary/15 bg-card/30 rounded-r-lg pl-4 pr-4 py-4">
          <p className="leading-relaxed text-narrative" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}>
            {renderMarkdown(message.content)}
          </p>
          {statChanges && statChanges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {statChanges.map((change, i) => (
                <span key={i} className={cn('inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px]', getChangeColor(change.type))}>
                  {change.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Flag button on hover */}
        <button
          onClick={handleFlagClick}
          className={cn(
            'absolute bottom-2 right-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-all duration-200',
            isHovered ? 'opacity-100' : 'opacity-0',
            'hover:bg-secondary/50 hover:text-foreground'
          )}
        >
          <Flag className="h-3 w-3" />
          <span>{"That's not right"}</span>
        </button>
      </div>
    )
  }

  // Player action message — softer accent tint
  if (message.type === 'player') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-lg bg-primary/8 border border-primary/20 px-4 py-2 text-right shadow-[0_0_15px_-5px] shadow-primary/10">
          <p className="text-foreground/80" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}>{message.content}</p>
        </div>
      </div>
    )
  }

  // Meta question from player — no card border, just tinted text
  if (message.type === 'meta-question') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-2 text-right">
          <p className="italic text-info/70" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}>{message.content}</p>
        </div>
      </div>
    )
  }

  // Meta response from GM — dot prefix, no card border
  if (message.type === 'meta-response') {
    return (
      <div className="flex items-start gap-2.5 max-w-[80%]">
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-info shrink-0" />
        <p className="text-meta leading-relaxed" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}>{renderMarkdown(message.content)}</p>
      </div>
    )
  }

  return null
}
