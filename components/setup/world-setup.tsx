'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { genres, tonePresets, type Genre } from '@/lib/game-data'

interface WorldSetupProps {
  onNext: (data: { genre: Genre; tone: string }) => void
}

export function WorldSetup({ onNext }: WorldSetupProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('space-opera')
  const [selectedTone, setSelectedTone] = useState('epic')

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-3xl tracking-wide text-foreground">
            Choose Your Universe
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a genre and set the tone for your campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {/* Genre Selection */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Genre
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => genre.available && setSelectedGenre(genre.id)}
                  disabled={!genre.available}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-lg border p-4 transition-all duration-200',
                    genre.available
                      ? selectedGenre === genre.id
                        ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_15px_-3px] shadow-primary/30'
                        : 'border-border/50 bg-secondary/30 text-foreground hover:border-primary/50 hover:bg-secondary/50'
                      : 'cursor-not-allowed border-border/30 bg-secondary/10 text-muted-foreground/50'
                  )}
                >
                  <span className="text-sm font-medium">{genre.name}</span>
                  {!genre.available && (
                    <Badge
                      variant="outline"
                      className="absolute -top-2 -right-2 border-muted-foreground/30 bg-background text-[10px] text-muted-foreground"
                    >
                      Soon
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Campaign Tone
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {tonePresets.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-4 transition-all duration-200',
                    selectedTone === tone.id
                      ? 'border-primary bg-primary/10 shadow-[0_0_15px_-3px] shadow-primary/30'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{tone.name}</span>
                  <span className="text-center text-xs text-muted-foreground">
                    {tone.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => onNext({ genre: selectedGenre, tone: selectedTone })}
              className="action-glow bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
