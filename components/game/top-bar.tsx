'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  chapterTitle: string
  onMenuClick: () => void
  onChapterClick: () => void
}

export function TopBar({ chapterTitle, onMenuClick, onChapterClick }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/30 bg-background/80 px-6 backdrop-blur-sm">
      {/* Wordmark */}
      <div className="text-sm font-medium tracking-widest text-muted-foreground">
        STORYFORGE
      </div>

      {/* Chapter Indicator */}
      <button
        onClick={onChapterClick}
        className="group flex items-center gap-2 text-sm text-foreground transition-colors hover:text-primary"
      >
        <span className="font-mono">{chapterTitle}</span>
        <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
          (view history)
        </span>
      </button>

      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>
    </header>
  )
}
