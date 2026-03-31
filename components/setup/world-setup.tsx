'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { genres, getGenreConfig, applyGenreTheme, type Genre } from '@/lib/genre-config'
import { WizardNav } from './wizard-nav'

const genreAccentColors: Record<string, string> = {
  'space-opera': 'oklch(0.82 0.15 175)',
  'fantasy': 'oklch(0.72 0.14 75)',
  'cyberpunk': 'oklch(0.75 0.22 145)',
  'grimdark': 'oklch(0.58 0.16 28)',
}

interface WorldSetupProps {
  onNext: (data: { genre: Genre }) => void
  onBack?: () => void
}

export function WorldSetup({ onNext, onBack }: WorldSetupProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('space-opera')

  const handleGenreSelect = (genre: Genre) => {
    setSelectedGenre(genre)
    applyGenreTheme(genre)
  }

  const availableGenres = genres.filter(g => g.available)
  const comingSoonGenres = genres.filter(g => !g.available)

  return (
    <div className="flex min-h-screen flex-col items-center px-6 pt-16 pb-28">
      <div className="w-full max-w-xl flex flex-col gap-12">

        {/* Header: Wordmark + step indicator */}
        <div className="text-center flex flex-col gap-4">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
            storyforge
          </div>
          <div className="flex items-center justify-center gap-6">
            {['World', 'Identity'].map((label, i) => (
              <span
                key={label}
                className={cn(
                  'text-[10px] font-medium uppercase tracking-[0.15em]',
                  i === 0 ? 'text-primary' : 'text-muted-foreground/25'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Choose Your Universe
          </h1>
          <p className="mt-3 text-sm text-muted-foreground/60">
            Select a genre for your campaign
          </p>
        </div>

        {/* Available genres — 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {availableGenres.map((genre) => {
            const config = getGenreConfig(genre.id)
            const accent = genreAccentColors[genre.id] || 'var(--primary)'
            const isSelected = selectedGenre === genre.id
            return (
              <button
                key={genre.id}
                onClick={() => handleGenreSelect(genre.id)}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-all duration-300',
                  isSelected
                    ? 'border-primary/60 bg-primary/8'
                    : 'border-border/20 bg-transparent hover:border-border/40'
                )}
                style={isSelected ? {
                  borderColor: `color-mix(in oklch, ${accent} 60%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${accent} 8%, transparent)`,
                  boxShadow: `0 0 25px -5px color-mix(in oklch, ${accent} 15%, transparent)`,
                } : undefined}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = `0 0 20px -5px color-mix(in oklch, ${accent} 10%, transparent)`
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = ''
                  }
                }}
              >
                <span className="text-lg font-bold text-foreground">{genre.name}</span>
                <span className="text-xs leading-snug text-muted-foreground/60 italic">
                  "{config.tagline}"
                </span>
              </button>
            )
          })}
        </div>

        {/* Coming soon — compact grid with divider */}
        {comingSoonGenres.length > 0 && (
          <div className="opacity-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/20" />
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
                Expanding the Multiverse
              </span>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {comingSoonGenres.map((genre) => (
                <div
                  key={genre.id}
                  className="flex items-center justify-between rounded-lg border border-border/10 bg-secondary/5 px-3 py-2"
                >
                  <span className="text-[11px] text-muted-foreground/60">{genre.name}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/30">
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <WizardNav
        onBack={onBack}
        onNext={() => onNext({ genre: selectedGenre })}
        nextLabel="Next"
      />
    </div>
  )
}
