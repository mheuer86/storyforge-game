'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import { getGenreConfig, type Genre } from '@/lib/genre-config'
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

function genreAccentColor(genre: string): string {
  // Read primary color from genre config instead of hardcoding
  try {
    const config = getGenreConfig(genre as Genre)
    return config.theme.primary
  } catch {
    return 'oklch(0.82 0.15 175)' // fallback to space opera teal
  }
}

export function CampaignSelect({ autoSave, slots, onContinue, onLoadSlot, onNewGame }: CampaignSelectProps) {
  const hasSlots = slots.some(Boolean)
  const [showOlderUpdates, setShowOlderUpdates] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16 pb-24">
      <div className="w-full max-w-xl flex flex-col gap-14">

        {/* Wordmark */}
        <div className="text-center">
          <div
            className="font-heading text-2xl font-semibold uppercase tracking-[0.25em] text-primary"
          >
            Storyforge
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            The dice shape everything
          </div>
        </div>

        {/* Active campaign — hero treatment */}
        {autoSave && (() => {
          const genre = autoSave.meta.genre as Genre
          const genreName = getGenreConfig(genre).name
          const accent = genreAccentColor(genre)
          return (
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-px bg-primary/40" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Active Campaign</span>
              </div>
              <button
                onClick={() => { track('campaign_continued', { genre, chapter: autoSave.meta.chapterNumber }); onContinue() }}
                className="group relative w-full text-left"
              >
                {/* Ambient glow behind card */}
                <div
                  className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[60px]"
                  style={{ background: accent, opacity: 0.05 }}
                />
                <div
                  className="relative rounded-xl border-l-2 px-5 py-5 transition-all duration-300"
                  style={{ borderColor: `color-mix(in oklch, ${accent} 40%, transparent)` }}
                >
                  {/* Genre tag + chapter breadcrumb */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[10px] font-medium uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm"
                      style={{ color: accent, backgroundColor: `color-mix(in oklch, ${accent} 10%, transparent)` }}
                    >
                      {genreName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">
                      Chapter {autoSave.meta.chapterNumber}
                    </span>
                    {autoSave.meta.lastSaved && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {timeAgo(autoSave.meta.lastSaved)}
                      </span>
                    )}
                  </div>

                  {/* Chapter title — hero element */}
                  <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground mb-1.5 sm:text-4xl">
                    {autoSave.meta.chapterTitle}
                  </h2>

                  {/* Character info */}
                  <p className="text-base text-foreground/70">
                    {autoSave.character.name}
                    <span className="text-muted-foreground/50"> — {autoSave.character.class}</span>
                  </p>

                  {/* Continue link */}
                  <div
                    className="mt-4 text-sm font-medium transition-colors group-hover:translate-x-1 transition-transform duration-200"
                    style={{ color: accent }}
                  >
                    Continue Story →
                  </div>
                </div>
              </button>
            </div>
          )
        })()}

        {/* Saved campaigns — minimal rows */}
        {hasSlots && (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-px bg-primary/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Archived Echoes</span>
            </div>
            <div className="flex flex-col gap-1">
              {slots.map((slot, i) => {
                if (!slot) return null
                const genre = slot.genre as Genre
                const genreName = getGenreConfig(genre).name
                const accent = genreAccentColor(genre)
                return (
                  <button
                    key={i}
                    onClick={() => { track('campaign_continued', { genre, chapter: slot.chapterNumber }); onLoadSlot(slot) }}
                    className="group w-full rounded-lg px-4 py-3.5 text-left transition-all duration-200 hover:bg-secondary/10"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-base font-medium text-foreground">
                          {slot.characterName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                          <span>{slot.characterClass}</span>
                          <span className="text-muted-foreground/20">·</span>
                          <span>Ch. {slot.chapterNumber}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className="text-[10px] font-medium uppercase tracking-[0.1em]"
                          style={{ color: accent }}
                        >
                          {genreName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(slot.savedAt)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* New campaign — centered outline button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onNewGame}
            className="rounded-lg border border-primary/25 px-10 py-3 text-sm font-medium text-foreground/70 transition-all hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
          >
            Start New Campaign
          </button>
        </div>

        {/* Decorative dots */}
        <div className="flex justify-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/15" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/10" />
        </div>

        {/* Changelog — vertical accent line */}
        {changelog.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-px bg-primary/40" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">What&apos;s New</span>
            </div>
            <div className="flex flex-col gap-4">
              {(showOlderUpdates ? changelog : changelog.slice(0, 1)).map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-[2px] shrink-0 rounded-full bg-secondary/30" />
                  <div>
                    <p className="mb-1.5 text-[10px] text-muted-foreground/40">{formatDate(entry.date)}</p>
                    <ul className="flex flex-col gap-1">
                      {entry.changes.map((change, j) => (
                        <li key={j} className="text-xs text-foreground/50 leading-relaxed">
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            {changelog.length > 1 && (
              <button
                onClick={() => setShowOlderUpdates(v => !v)}
                className="mt-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
              >
                {showOlderUpdates ? 'Show less' : `Show ${changelog.length - 1} older update${changelog.length - 1 > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
