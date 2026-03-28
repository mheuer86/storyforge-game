'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getStatModifier,
  formatModifier,
} from '@/lib/game-data'
import { getGenreConfig, type Genre, type Species, type CharacterClass } from '@/lib/genre-config'

interface CharacterSetupProps {
  genre: Genre
  onBack: () => void
  onStart: (data: { name: string; species: Species; characterClass: CharacterClass; gender: 'he' | 'she' | 'they' }) => void
}

export function CharacterSetup({ genre, onBack, onStart }: CharacterSetupProps) {
  const config = getGenreConfig(genre)
  const genreSpecies = config.species
  const genreClasses = config.classes

  const [characterName, setCharacterName] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null)
  const [selectedGender, setSelectedGender] = useState<'he' | 'she' | 'they'>('they')

  const canStart = characterName.trim() && selectedSpecies && selectedClass

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-4xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle
            className="text-3xl tracking-wide text-primary/70"
            style={{ textShadow: 'var(--title-glow)' }}
          >
            Create Your Character
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Define who you are in this {genre === 'fantasy' ? 'world' : 'universe'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {/* Character Name */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Character Name
            </label>
            <Input
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Enter your character's name..."
              className="border-border/50 bg-secondary/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </div>

          {/* Gender / Pronouns */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Pronouns
            </label>
            <div className="flex gap-2">
              {([
                { value: 'he', label: 'He / Him' },
                { value: 'she', label: 'She / Her' },
                { value: 'they', label: 'They / Them' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedGender(opt.value)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200',
                    selectedGender === opt.value
                      ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_15px_-3px] shadow-primary/30'
                      : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Species Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {genre === 'fantasy' ? 'Race' : 'Species'}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {genreSpecies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSpecies(s)}
                  className={cn(
                    'flex min-w-[160px] flex-col gap-1 rounded-lg border p-3 transition-all duration-200',
                    selectedSpecies?.id === s.id
                      ? 'border-primary bg-primary/10 shadow-[0_0_15px_-3px] shadow-primary/30'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className="text-left text-xs leading-tight text-muted-foreground">
                    {s.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Class Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Class
            </label>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {genreClasses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClass(c)}
                  className={cn(
                    'flex flex-col gap-2 rounded-lg border p-4 text-left transition-all duration-200',
                    selectedClass?.id === c.id
                      ? 'border-primary bg-primary/10 shadow-[0_0_15px_-3px] shadow-primary/30'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.concept}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-primary/50 bg-primary/10 text-xs text-primary"
                    >
                      {c.primaryStat}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.proficiencies.map((p) => (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="bg-secondary/50 text-[10px] text-secondary-foreground"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stat Block Preview */}
          {selectedClass && (
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Character Preview
              </h4>
              <div className="flex flex-col gap-4 text-sm">
                {/* Stats */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-foreground">
                  {Object.entries(selectedClass.stats).map(([stat, value]) => (
                    <span key={stat}>
                      <span className="text-muted-foreground">{stat}</span>{' '}
                      <span className="font-semibold">{value}</span>
                      <span className="text-primary">
                        {' '}
                        ({formatModifier(getStatModifier(value))})
                      </span>
                    </span>
                  ))}
                </div>

                {/* HP & AC */}
                <div className="flex gap-4 text-foreground">
                  <span>
                    <span className="text-muted-foreground">HP:</span>{' '}
                    <span className="font-mono font-semibold">{selectedClass.startingHp}/{selectedClass.startingHp}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">AC:</span>{' '}
                    <span className="font-mono font-semibold">{selectedClass.startingAc}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">{config.currencyName.charAt(0).toUpperCase() + config.currencyName.slice(1)}:</span>{' '}
                    <span className="font-mono font-semibold">{selectedClass.startingCredits}{config.currencyAbbrev}</span>
                  </span>
                </div>

                {/* Starting Gear */}
                <div>
                  <span className="text-muted-foreground">Starting Gear:</span>
                  <ul className="mt-1 list-inside list-disc text-foreground">
                    {selectedClass.startingInventory.map((item) => (
                      <li key={item.id}>
                        {item.name}
                        {item.damage && (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">({item.damage})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trait */}
                <div>
                  <span className="font-medium text-primary">{selectedClass.trait.name}:</span>{' '}
                  <span className="text-muted-foreground">{selectedClass.trait.description}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              Back
            </Button>
            <Button
              onClick={() =>
                canStart &&
                onStart({
                  name: characterName.trim(),
                  species: selectedSpecies!,
                  characterClass: selectedClass!,
                  gender: selectedGender,
                })
              }
              disabled={!canStart}
              className="bg-primary px-8 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              style={{ boxShadow: 'var(--action-glow)' }}
            >
              Begin Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
