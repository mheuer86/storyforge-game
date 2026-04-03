'use client'

import { useState } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionBarProps {
  quickActions: string[]
  onActionSelect: (action: string) => void
  onCustomAction: (action: string, isMetaQuestion: boolean) => void
  disabled?: boolean
  closeReady?: boolean
  closeReason?: string
  onCloseChapter?: () => void
  onDismissClose?: () => void
}

export function ActionBar({ quickActions, onActionSelect, onCustomAction, disabled = false, closeReady, closeReason, onCloseChapter }: ActionBarProps) {
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
    <div className="flex flex-col gap-3 p-4 border-t border-border/10">
      {/* Close Chapter Button */}
      {closeReady && onCloseChapter && (
        <div className="flex flex-col gap-2">
          {closeReason && (
            <p className="text-[11px] text-muted-foreground/60 px-1 leading-relaxed">{closeReason}</p>
          )}
          <button
            onClick={onCloseChapter}
            disabled={disabled}
            className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {disabled ? 'Closing chapter...' : 'Close Chapter'}
          </button>
        </div>
      )}

      {/* Quick Actions — hidden when close is ready */}
      {quickActions.length > 0 && !closeReady && (
        <div className="flex flex-col gap-2">
          {quickActions.map((action, index) => (
            <button
              key={`${index}-${action}`}
              onClick={() => !disabled && onActionSelect(action)}
              disabled={disabled}
              className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-2.5 text-xs text-foreground/80 text-left transition-all duration-200 hover:bg-primary/10 hover:border-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Custom Input — contained area */}
      <form onSubmit={handleSubmit} className={cn(
        'flex items-center gap-0 rounded-xl border-2 overflow-hidden shadow-[0_0_12px_-3px]',
        isMetaMode
          ? 'bg-info/[0.08] border-info/30 shadow-info/15'
          : 'bg-primary/[0.06] border-primary/25 shadow-primary/15'
      )}>
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
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-40',
            isMetaMode ? 'placeholder:text-info/40' : 'placeholder:text-primary/40'
          )}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className={cn(
            'shrink-0 mx-1.5 rounded-lg p-2 transition-colors disabled:opacity-50',
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
