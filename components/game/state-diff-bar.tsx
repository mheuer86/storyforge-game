'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StateChange {
  type: 'gain' | 'loss' | 'new' | 'neutral'
  label: string
}

interface StateDiffBarProps {
  changes: StateChange[]
  autoCollapse?: boolean
}

export function StateDiffBar({ changes, autoCollapse = true }: StateDiffBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoCollapse && !isExpanded) {
      const timer = setTimeout(() => {
        // Don't auto-collapse, just keep visible
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [autoCollapse, isExpanded])

  if (changes.length === 0 || !isVisible) {
    return null
  }

  const getChangeColor = (type: StateChange['type']) => {
    switch (type) {
      case 'gain':
        return 'text-success'
      case 'loss':
        return 'text-destructive'
      case 'new':
        return 'text-info'
      case 'neutral':
      default:
        return 'text-muted-foreground'
    }
  }

  const summaryLine = changes.map((c) => c.label).join(' · ')

  return (
    <div className="border-t border-border/30 bg-card/30 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-secondary/20"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {!isExpanded ? (
            <span className="text-muted-foreground">{summaryLine}</span>
          ) : (
            changes.map((change, index) => (
              <span key={index} className={cn('whitespace-nowrap', getChangeColor(change.type))}>
                {change.label}
                {index < changes.length - 1 && (
                  <span className="ml-2 text-border">·</span>
                )}
              </span>
            ))
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
