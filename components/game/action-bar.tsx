'use client'

import { useState } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionBarProps {
  quickActions: string[]
  onActionSelect: (action: string) => void
  onCustomAction: (action: string, isMetaQuestion: boolean) => void
  disabled?: boolean
}

export function ActionBar({ quickActions, onActionSelect, onCustomAction, disabled = false }: ActionBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isMetaMode, setIsMetaMode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onCustomAction(inputValue.trim(), isMetaMode)
      setInputValue('')
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-background/60 p-4 backdrop-blur-xl border-t border-border/10">
      {/* Quick Actions — centered */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {quickActions.map((action, index) => (
            <button
              key={`${index}-${action}`}
              onClick={() => !disabled && onActionSelect(action)}
              disabled={disabled}
              className="rounded-lg bg-secondary/10 border border-secondary/20 px-4 py-2 text-xs text-primary transition-all duration-200 hover:bg-secondary/20 hover:border-secondary/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Custom Input — contained area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-0 rounded-xl bg-secondary/8 border border-border/10 overflow-hidden">
        {/* Meta Question Toggle */}
        <button
          type="button"
          onClick={() => setIsMetaMode(!isMetaMode)}
          className={cn(
            'shrink-0 px-3 py-2.5 transition-colors',
            isMetaMode
              ? 'bg-info/15 text-info'
              : 'text-muted-foreground/40 hover:text-muted-foreground/60'
          )}
          title={isMetaMode ? 'Switch to action mode' : 'Ask GM a question'}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Toggle meta question mode</span>
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          placeholder={
            disabled
              ? 'GM is thinking...'
              : isMetaMode
                ? "Ask the GM a question (won't affect the story)..."
                : 'Or type your own action...'
          }
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className={cn(
            'shrink-0 mx-1.5 rounded-lg p-2 transition-colors disabled:opacity-30',
            isMetaMode
              ? 'bg-info text-white hover:bg-info/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Send className="h-3.5 w-3.5" />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  )
}
