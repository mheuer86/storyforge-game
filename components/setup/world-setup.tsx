'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { genres, getGenreConfig, applyGenreTheme, type Genre } from '@/lib/genre-config'

interface WorldSetupProps {
  onNext: (data: { genre: Genre }) => void
}

export function WorldSetup({ onNext }: WorldSetupProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('space-opera')
  const config = getGenreConfig(selectedGenre)

  const handleGenreSelect = (genre: Genre) => {
    setSelectedGenre(genre)
    applyGenreTheme(genre)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-16 p-8">
      <div className="text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src={config.theme.logo}
            alt="Storyforge"
            width={175}
            height={175}
            className="opacity-90"
            style={{ filter: `drop-shadow(${config.theme.titleGlow.split(',')[0]})` }}
          />
          <div
            className="font-roboto-mono text-6xl text-primary/70"
            style={{ fontVariant: 'small-caps', textShadow: 'var(--title-glow)' }}
          >
            storyforge
          </div>
        </div>
        <div className="mt-1 text-sm tracking-widest text-muted-foreground uppercase">
          Text-based action RPG
        </div>
        <div className="mt-3 text-base text-muted-foreground/70 italic">
          Where fate is more than luck
        </div>
      </div>
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle
            className="text-3xl tracking-wide text-primary/70"
            style={{ textShadow: 'var(--title-glow)' }}
          >
            Choose Your Universe
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a genre for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {/* Genre Selection */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Genre
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {genres.map((genre) => {
                const genreConfig = genre.available ? getGenreConfig(genre.id) : null
                return (
                  <button
                    key={genre.id}
                    onClick={() => genre.available && handleGenreSelect(genre.id)}
                    disabled={!genre.available}
                    className={cn(
                      'relative flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-all duration-200',
                      genre.available
                        ? selectedGenre === genre.id
                          ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_15px_-3px] shadow-primary/30'
                          : 'border-border/50 bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/50'
                        : 'cursor-not-allowed border-border/30 bg-secondary/10 text-muted-foreground/50'
                    )}
                  >
                    <span className="text-sm font-medium leading-tight">{genre.name}</span>
                    {genreConfig && (
                      <span className="text-[10px] leading-snug text-muted-foreground/70 italic">
                        {genreConfig.tagline}
                      </span>
                    )}
                    {!genre.available && (
                      <Badge
                        variant="outline"
                        className="absolute -top-2 -right-2 border-muted-foreground/30 bg-background text-[10px] text-muted-foreground"
                      >
                        Soon
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => onNext({ genre: selectedGenre })}
              className="bg-primary px-8 text-primary-foreground hover:bg-primary/90"
              style={{ boxShadow: 'var(--action-glow)' }}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
