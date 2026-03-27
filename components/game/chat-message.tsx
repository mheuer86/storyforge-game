'use client'

import { useState } from 'react'
import { Flag, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ChatMessage as ChatMessageType } from '@/lib/game-data'

interface ChatMessageProps {
  message: ChatMessageType
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts: React.ReactNode[] = []
    // Match **bold**, *italic*, and plain text segments
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let last = 0
    let match
    let key = 0
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(match.input.slice(last, match.index))
      if (match[1] !== undefined) parts.push(<strong key={key++}>{match[1]}</strong>)
      else if (match[2] !== undefined) parts.push(<em key={key++}>{match[2]}</em>)
      last = match.index + match[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return <span key={i}>{parts}{i < text.split('\n').length - 1 && <br />}</span>
  })
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleFlagClick = () => {
    toast('Checking against game state...', {
      description: 'Verifying consistency with world and character data.',
      duration: 2000,
    })
  }

  // GM narrative message
  if (message.type === 'gm') {
    return (
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="max-w-[85%] rounded-lg border border-border/30 bg-card/50 p-4">
          <p className="font-mono text-xs leading-relaxed text-narrative">
            {renderMarkdown(message.content)}
          </p>
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

  // Player action message
  if (message.type === 'player') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-lg bg-primary/20 px-4 py-2 text-right">
          <p className="text-sm text-foreground">{message.content}</p>
        </div>
      </div>
    )
  }

  // Meta question from player
  if (message.type === 'meta-question') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-lg border border-info/30 bg-info/10 px-4 py-2 text-right">
          <p className="text-sm italic text-info">{message.content}</p>
        </div>
      </div>
    )
  }

  // Meta response from GM
  if (message.type === 'meta-response') {
    return (
      <div className="flex items-start gap-2">
        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-info/20">
          <Info className="h-3 w-3 text-info" />
        </div>
        <div className="max-w-[80%] rounded-lg border border-info/30 bg-info/5 px-4 py-2">
          <p className="text-sm text-meta">{message.content}</p>
        </div>
      </div>
    )
  }

  return null
}
