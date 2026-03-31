'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getGenreConfig } from '@/lib/genre-config'
import type { GameState } from '@/lib/types'
import type { SaveSlotData } from '@/lib/game-data'
import { changelog } from '@/lib/changelog'

interface CampaignSelectProps {
  autoSave: GameState | null
  slots: (SaveSlotData | null)[]
  onContinue: () => void
  onLoadSlot: (data: SaveSlotData) => void
  onNewGame: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CampaignSelect({ autoSave, slots, onContinue, onLoadSlot, onNewGame }: CampaignSelectProps) {
  const hasSlots = slots.some(Boolean)
  const config = getGenreConfig('space-opera')
  const [showOlderUpdates, setShowOlderUpdates] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      {/* Wordmark */}
      <div className="text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src={config.theme.logo}
            alt="Storyforge"
            width={120}
            height={120}
            className="opacity-90"
          />
          <div
            className="font-roboto-mono text-5xl text-primary/70"
            style={{ fontVariant: 'small-caps', textShadow: 'var(--title-glow)' }}
          >
            storyforge
          </div>
        </div>
        <div className="mt-1 text-sm tracking-widest text-muted-foreground uppercase">
          Text-based action RPG
        </div>
      </div>

      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl tracking-wide text-primary/70" style={{ textShadow: 'var(--title-glow)' }}>
            Your Campaigns
          </CardTitle>
          <CardDescription>Continue where you left off, or start something new</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">

          {/* Auto-save — current campaign */}
          {autoSave && (
            <div>
              <p className="mb-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">Current</p>
              <button
                onClick={() => { track('campaign_continued', { genre: autoSave.meta.genre, chapter: autoSave.meta.chapterNumber }); onContinue() }}
                className="w-full rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-left transition-all duration-200 hover:border-primary/70 hover:bg-primary/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {autoSave.character.name}
                      <span className="ml-2 text-muted-foreground font-normal">— {autoSave.character.class}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      Ch. {autoSave.meta.chapterNumber}: {autoSave.meta.chapterTitle}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      {getGenreConfig(autoSave.meta.genre as Parameters<typeof getGenreConfig>[0]).name}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {autoSave.meta.lastSaved ? timeAgo(autoSave.meta.lastSaved) : ''}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Manual save slots */}
          {hasSlots && (
            <div>
              <p className="mb-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">Saved Campaigns</p>
              <div className="flex flex-col gap-2">
                {slots.map((slot, i) =>
                  slot ? (
                    <button
                      key={i}
                      onClick={() => { track('campaign_continued', { genre: slot.genre, chapter: slot.chapterNumber }); onLoadSlot(slot) }}
                      className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 text-left transition-all duration-200 hover:border-primary/50 hover:bg-secondary/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {slot.characterName}
                            <span className="ml-2 text-muted-foreground font-normal">— {slot.characterClass}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            Ch. {slot.chapterNumber}: {slot.chapterTitle}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {getGenreConfig(slot.genre as Parameters<typeof getGenreConfig>[0]).name}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(slot.savedAt)}</span>
                        </div>
                      </div>
                    </button>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* New campaign */}
          <div className="pt-1">
            <Button
              onClick={onNewGame}
              variant="outline"
              className="w-full border-border/50 bg-secondary/20 hover:bg-secondary/40"
            >
              Start New Campaign
            </Button>
          </div>

        </CardContent>
      </Card>
      {/* Changelog */}
      {changelog.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="mb-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">What's new</p>
          <div className="flex flex-col gap-3">
            {(showOlderUpdates ? changelog : changelog.slice(0, 1)).map((entry, i) => (
              <div key={i} className="rounded-lg border border-border/30 bg-card/40 px-4 py-3">
                <p className="mb-1.5 text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                <ul className="flex flex-col gap-1">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex gap-2 text-xs text-foreground/70">
                      <span className="mt-0.5 shrink-0 text-primary/50">·</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {changelog.length > 1 && (
            <button
              onClick={() => setShowOlderUpdates(v => !v)}
              className="mt-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {showOlderUpdates ? 'Show less' : `Show ${changelog.length - 1} older update${changelog.length - 1 > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
