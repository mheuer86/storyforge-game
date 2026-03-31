'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Genre } from '@/lib/genre-config'

interface TopBarProps {
  chapterTitle: string
  genre?: Genre
  onMenuClick: () => void
  onChapterClick: () => void
}

export function TopBar({ chapterTitle, onMenuClick, onChapterClick }: TopBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between bg-background/70 px-5 backdrop-blur-xl">
      {/* Wordmark */}
      <div className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground/50">
        storyforge
      </div>

      {/* Chapter Indicator */}
      <button
        onClick={onChapterClick}
        className="font-heading text-sm transition-colors hover:text-primary"
        style={{ color: 'var(--tertiary)' }}
      >
        {chapterTitle}
      </button>

      {/* Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="h-8 w-8 text-muted-foreground/50 hover:text-foreground"
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>
    </header>
  )
}
