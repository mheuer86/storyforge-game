'use client'

import { useState } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex flex-col gap-3 border-t border-border/30 bg-background/80 p-4 backdrop-blur-sm">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => !disabled && onActionSelect(action)}
            disabled={disabled}
            className="action-glow rounded-lg border border-border/50 bg-secondary/40 px-4 py-2 text-sm text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Custom Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Meta Question Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsMetaMode(!isMetaMode)}
          className={cn(
            'shrink-0 transition-colors',
            isMetaMode
              ? 'bg-info/20 text-info hover:bg-info/30 hover:text-info'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={isMetaMode ? 'Switch to action mode' : 'Ask GM a question'}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Toggle meta question mode</span>
        </Button>

        {/* Text Input */}
        <div className="relative flex-1">
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
              'w-full rounded-lg border bg-secondary/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-40',
              isMetaMode
                ? 'border-info/40 focus:border-info focus:ring-info/30'
                : 'border-border/50 focus:border-primary focus:ring-primary/30'
            )}
          />
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim()}
          className={cn(
            'shrink-0',
            isMetaMode
              ? 'bg-info text-info-foreground hover:bg-info/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
