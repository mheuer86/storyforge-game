'use client'

import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getGenreConfig, type Genre } from '@/lib/genre-config'

interface TopBarProps {
  chapterTitle: string
  genre?: Genre
  onMenuClick: () => void
  onChapterClick: () => void
}

export function TopBar({ chapterTitle, genre = 'space-opera', onMenuClick, onChapterClick }: TopBarProps) {
  const config = getGenreConfig(genre)

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/30 bg-background/80 px-6 backdrop-blur-sm">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <Image src={config.theme.logo} alt="Storyforge" width={46} height={46} className="opacity-80" />
        <div className="text-sm font-medium tracking-widest text-muted-foreground">
          STORYFORGE
        </div>
      </div>

      {/* Chapter Indicator */}
      <button
        onClick={onChapterClick}
        className="group flex items-center gap-2 text-sm text-foreground transition-colors hover:text-primary"
      >
        <span className="font-heading" style={{ color: 'var(--tertiary)' }}>{chapterTitle}</span>
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
