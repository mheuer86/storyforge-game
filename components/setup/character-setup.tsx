'use client'

import { useState } from 'react'
import Image from 'next/image'
import { track } from '@vercel/analytics'
import { cn } from '@/lib/utils'
import {
  getStatModifier,
  formatModifier,
} from '@/lib/game-data'
import { getGenreConfig, type Genre, type Species, type CharacterClass } from '@/lib/genre-config'
import { WizardNav } from './wizard-nav'

// Portrait paths: /portraits/{genre}/{species-id}.png
// Falls back to letter placeholder if image doesn't exist
const PORTRAIT_GENRES = new Set(['space-opera', 'fantasy', 'cyberpunk', 'grimdark', 'noire', 'epic-scifi'])

function SpeciesPortrait({ genre, speciesId, speciesName, isSelected }: {
  genre: Genre
  speciesId: string
  speciesName: string
  isSelected: boolean
}) {
  const hasPortrait = PORTRAIT_GENRES.has(genre)
  return (
    <div className={cn(
      'relative aspect-[3/4] rounded-xl overflow-hidden mb-3 border transition-all duration-300',
      isSelected
        ? 'border-primary/40'
        : 'border-border/10 group-hover/species:border-primary/30'
    )}>
      {hasPortrait ? (
        <Image
          src={`/portraits/${genre}/${speciesId}.png`}
          alt={speciesName}
          fill
          className={cn(
            'object-cover transition-all duration-500',
            isSelected ? 'grayscale-0 opacity-100' : 'grayscale opacity-50 group-hover/species:grayscale-0 group-hover/species:opacity-80'
          )}
          sizes="200px"
        />
      ) : (
        <div className={cn(
          'flex items-center justify-center w-full h-full text-3xl font-mono font-bold transition-colors',
          isSelected ? 'bg-primary/10 text-primary' : 'bg-secondary/8 text-muted-foreground/15'
        )}>
          {speciesName[0]}
        </div>
      )}
      {/* Name overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-background/80 to-transparent">
        <p className="text-sm font-bold tracking-wide uppercase text-foreground">{speciesName}</p>
      </div>
    </div>
  )
}

interface CharacterSetupProps {
  genre: Genre
  onBack: () => void
  onStart: (data: { name: string; species: Species; characterClass: CharacterClass; gender: 'he' | 'she' | 'they' }) => void
}

export function CharacterSetup({ genre, onBack, onStart }: CharacterSetupProps) {
  const config = getGenreConfig(genre)
  const genreSpecies = config.species

  const [characterName, setCharacterName] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null)
  const [selectedGender, setSelectedGender] = useState<'he' | 'she' | 'they'>('they')

  // When playbooks exist for the selected origin, use those; otherwise fall back to universal classes
  const availableClasses = (selectedSpecies && config.playbooks?.[selectedSpecies.id]) || config.classes

  const canStart = characterName.trim() && selectedSpecies && selectedClass

  const stepLabels = ['World', 'Identity']

  return (
    <div className="flex min-h-screen flex-col items-center px-6 pt-12 pb-28">
      <div className="w-full max-w-2xl flex flex-col gap-10">

        {/* Header: Wordmark + step indicator */}
        <div className="text-center flex flex-col gap-4">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
            storyforge
          </div>
          <div className="flex items-center justify-center gap-6">
            {stepLabels.map((label, i) => (
              <span
                key={label}
                className={cn(
                  'text-[10px] font-medium uppercase tracking-[0.15em] transition-colors',
                  i === 1 ? 'text-primary' : 'text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/60'
                )}
                onClick={i === 0 ? onBack : undefined}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Character name — full width, bottom border only */}
        <div>
          <input
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Name your character..."
            className="w-full bg-transparent border-0 border-b border-border/20 pb-3 text-2xl font-heading tracking-wider text-foreground placeholder:text-muted-foreground/25 focus:border-primary/40 focus:outline-none transition-colors sm:text-3xl"
          />
        </div>

        {/* Pronouns — compact segmented control */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-px bg-primary/30 shrink-0" />
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary/70 shrink-0">
            Pronouns
          </span>
          <div className="flex rounded-lg border border-border/20 overflow-hidden">
            {([
              { value: 'he', label: 'He/Him' },
              { value: 'she', label: 'She/Her' },
              { value: 'they', label: 'They/Them' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedGender(opt.value)}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium transition-all',
                  selectedGender === opt.value
                    ? 'bg-primary/15 text-primary'
                    : 'text-foreground/50 hover:text-foreground/70 hover:bg-secondary/10'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Species — horizontal scroll with accent line label */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-primary/30" />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary/70">
              {config.speciesLabel}
            </span>
          </div>
          <div className="flex items-start gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
            {genreSpecies.map((s) => {
              const isSelected = selectedSpecies?.id === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSpecies(s)
                    // Clear class selection when origin changes — available classes may differ per origin (playbooks)
                    if (selectedSpecies?.id !== s.id) setSelectedClass(null)
                  }}
                  className="snap-start min-w-[200px] w-[200px] shrink-0 group/species text-left"
                >
                  {/* Portrait area — 3:4 aspect like the mock */}
                  <SpeciesPortrait
                    genre={genre}
                    speciesId={s.id}
                    speciesName={s.name}
                    isSelected={isSelected}
                  />
                  <p className="text-xs text-foreground/50 leading-relaxed px-1">{s.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Class — grid with accent line label */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-primary/30" />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary/70">
              {selectedSpecies && config.playbooks?.[selectedSpecies.id] ? 'Playbook' : 'Class'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            {availableClasses.map((c) => {
              const isSelected = selectedClass?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClass(c)}
                  className={cn(
                    'relative flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all duration-300',
                    isSelected
                      ? 'border-primary/50 bg-primary/8 shadow-[0_0_20px_-5px] shadow-primary/15'
                      : 'border-border/15 bg-secondary/5 hover:border-border/30'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-xs">✓</span>
                    </div>
                  )}
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-foreground/50 leading-snug">{c.concept}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Character preview — terminal dossier (requires both origin + class) */}
        {selectedSpecies && selectedClass && (
          <div className="rounded-xl border border-border/15 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center px-4 py-2.5 bg-primary/5 border-b border-border/10">
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-primary/70">
                Profile Analysis
              </span>
            </div>

            <div className="p-5 flex flex-col gap-5 sm:flex-row sm:gap-6">
              {/* Left column — lore & description */}
              <div className="flex flex-col gap-4 sm:w-1/2">
                {/* Origin lore */}
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-primary/70 mb-1.5">
                    {config.speciesLabel} — {selectedSpecies.name}
                  </div>
                  <p className="text-xs text-foreground/50 leading-relaxed">{selectedSpecies.lore}</p>
                </div>

                {/* Class description + trait */}
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-primary/70 mb-1.5">
                    Class — {selectedClass.name}
                  </div>
                  {selectedClass.description && (
                    <p className="text-xs text-foreground/50 leading-relaxed mb-3">{selectedClass.description}</p>
                  )}
                  <div className="border-l-2 border-primary/30 pl-3">
                    <div className="text-xs font-medium text-primary/80">{selectedClass.trait.name}</div>
                    <div className="mt-1 text-xs text-foreground/50 leading-relaxed">{selectedClass.trait.description}</div>
                  </div>
                </div>
              </div>

              {/* Right column — stats, vitals, gear */}
              <div className="flex flex-col gap-5 sm:w-1/2">
                {/* Stat grid */}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  {Object.entries(selectedClass.stats).map(([stat, value]) => {
                    const isPrimary = stat === selectedClass.primaryStat
                    return (
                      <div
                        key={stat}
                        className={cn(
                          'rounded-lg border p-2.5 text-center transition-colors',
                          isPrimary
                            ? 'border-primary/30 bg-primary/8'
                            : 'border-border/10 bg-secondary/5'
                        )}
                      >
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{stat}</div>
                        <div className="font-mono text-2xl font-semibold text-foreground">{value}</div>
                        <div className={cn(
                          'font-mono text-xs',
                          isPrimary ? 'text-primary' : 'text-muted-foreground/60'
                        )}>
                          {formatModifier(getStatModifier(value))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Vitals — key-value rows */}
                <div className="flex flex-col">
                  {[
                    { label: 'HP', value: `${selectedClass.startingHp} / ${selectedClass.startingHp}` },
                    { label: 'AC', value: String(selectedClass.startingAc) },
                    { label: config.currencyName.charAt(0).toUpperCase() + config.currencyName.slice(1), value: `${selectedClass.startingCredits} ${config.currencyAbbrev}` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-border/8 py-2 last:border-0">
                      <span className="text-xs text-foreground/70">{row.label}</span>
                      <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Starting inventory */}
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-primary/70 mb-2">
                    Starting Gear
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {selectedClass.startingInventory.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                        <span className="text-foreground/70">
                          {item.name}
                          {item.damage && (
                            <span className="ml-1 font-mono text-[10px] text-foreground/40">({item.damage})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <WizardNav
        onBack={onBack}
        onNext={() => {
          if (!canStart) return
          track('campaign_started', { genre, class: selectedClass!.id })
          onStart({
            name: characterName.trim(),
            species: selectedSpecies!,
            characterClass: selectedClass!,
            gender: selectedGender,
          })
        }}
        nextLabel="Begin Campaign"
        nextDisabled={!canStart}
      />
    </div>
  )
}
