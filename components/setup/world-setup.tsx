'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { genres, getGenreConfig, applyGenreTheme, type Genre } from '@/lib/genre-config'
import { WizardNav } from './wizard-nav'

// ─── Genre lore (same as landing page) ──────────────────────────────

const genreLore: Record<string, { lore: string; thesis: string }> = {
  'space-opera': {
    lore: "Year 3187. The Compact that once unified 200 star systems has collapsed. You command a scrappy frigate with a small crew, navigating a galaxy where pirate fleets, corporate blocs, and rogue AIs compete for what's left. You're not a chosen hero. You're just in the wrong place.",
    thesis: "Scale mismatch — small people, big stakes.",
  },
  'fantasy': {
    lore: "The Five Kingdoms still stand, but the world is ending in forgetting, not fire. Ancient ruins everywhere, nobody remembers who built them. The Collegium studies but understands less each decade. A plague spreads from the eastern marshes. Something stirs beneath ruins older than the kingdoms.",
    thesis: "A world forgetting itself. Every spell draws from a diminishing reservoir.",
  },
  'grimdark': {
    lore: "The Pact of Ashes is fraying. A famine called the Wasting spreads across the provinces. Border lords raise private armies, the Church controls the hospitals and the Inquisition, and magic is feared and costly. You lead a small mercenary company through a world of mud, blood, and iron.",
    thesis: "Moral entropy. Every choice costs something. Victories are never clean.",
  },
  'cyberpunk': {
    lore: "Megacorps own the law, the media, and the people. The city is vertical, stratified by wealth. Cyberware is ubiquitous. Privacy is a commodity. You run a small crew from a safehouse in the middle layers.",
    thesis: "Humanity vs. capability. Every upgrade makes you better at the job, worse at being a person.",
  },
  'noire': {
    lore: "The city runs on money, secrets, and the distribution of both. Police are overworked or bought. The wealthy are untouchable until they aren't. You work alone. Rain-slicked streets, frosted glass doors, dive bars, hotels with forgetting clerks.",
    thesis: "Information as currency. Truth is as dangerous as the lie.",
  },
  'epic-scifi': {
    lore: "The Hegemony has endured for a thousand years, held together by Resonants — humans attuned to the Drift. Identified at age seven, taken by the Synod, deployed as living infrastructure. Resonants are legally property. Their power is immense. Their control is total.",
    thesis: "Institutional complicity. You're inside a machine that runs on human lives.",
  },
}

// ─── Component ──────────────────────────────────────────────────────

interface WorldSetupProps {
  onNext: (data: { genre: Genre }) => void
  onBack?: () => void
}

export function WorldSetup({ onNext, onBack }: WorldSetupProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('space-opera')
  const carouselRef = useRef<HTMLDivElement>(null)
  const availableGenres = genres.filter(g => g.available)
  const activeConfig = getGenreConfig(selectedGenre)
  const lore = genreLore[selectedGenre]

  // Looping carousel: triple the items
  const loopGenres = [...availableGenres, ...availableGenres, ...availableGenres]
  const isScrolling = useRef(false)

  const handleGenreSelect = useCallback((genre: Genre, el?: HTMLButtonElement) => {
    setSelectedGenre(genre)
    applyGenreTheme(genre)
    // Center the clicked card
    if (el && carouselRef.current) {
      const container = carouselRef.current
      const scrollTarget = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    }
  }, [])

  // On mount, center the first active card in the middle set
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const firstMiddleCard = el.children[availableGenres.length] as HTMLElement
    if (firstMiddleCard) {
      el.scrollLeft = firstMiddleCard.offsetLeft - el.offsetWidth / 2 + firstMiddleCard.offsetWidth / 2
    }
  }, [availableGenres.length])

  // Loop reset when scrolling near edges
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    let timeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      if (isScrolling.current) return
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const singleSetWidth = el.scrollWidth / 3
        if (el.scrollLeft < singleSetWidth * 0.3) {
          isScrolling.current = true
          el.scrollLeft += singleSetWidth
          isScrolling.current = false
        } else if (el.scrollLeft > singleSetWidth * 1.7) {
          isScrolling.current = true
          el.scrollLeft -= singleSetWidth
          isScrolling.current = false
        }
      }, 100)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => { el.removeEventListener('scroll', handleScroll); clearTimeout(timeout) }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center px-6 pt-12 pb-28">
      {/* Header: Wordmark + step indicator — fixed at top, matches character-setup */}
      <div className="w-full max-w-2xl flex flex-col gap-4 text-center">
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

      {/* Content — vertically centered in remaining space */}
      <div className="flex flex-1 flex-col items-center justify-center w-full">
        {/* Heading */}
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-center mb-10">
          Choose Your Universe
        </h1>

      {/* Genre carousel — full width, overflows */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto w-full px-6 pb-4 mt-10 scrollbar-thin"
      >
        {loopGenres.map((entry, idx) => {
          const config = getGenreConfig(entry.id)
          const isActive = entry.id === selectedGenre
          return (
            <button
              key={`${entry.id}-${idx}`}
              onClick={(e) => handleGenreSelect(entry.id, e.currentTarget)}
              className={`group relative shrink-0 snap-center w-[70vw] sm:w-[45vw] md:w-[35vw] lg:w-[28vw] min-w-[280px] aspect-[16/9] overflow-hidden text-left transition-all duration-500 ${
                isActive
                  ? 'grayscale-0 opacity-100 scale-[1.02]'
                  : 'grayscale opacity-50 hover:opacity-70 hover:grayscale-[0.3] scale-[0.97]'
              }`}
              style={{
                borderLeft: `2px solid ${isActive ? config.theme.primary : `color-mix(in oklch, ${config.theme.primary} 40%, transparent)`}`,
                ...(isActive ? {
                  boxShadow: `0 0 30px -5px ${config.theme.primary}`,
                } : {}),
              }}
            >
              <Image
                src={`/genres/${entry.id}.png`}
                alt={config.name}
                fill
                className={`object-cover transition-all duration-500 ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`}
                sizes="320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-sm font-bold uppercase tracking-wider text-white">{config.name}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Lore block — fixed height to prevent carousel from shifting */}
      <div className="w-full max-w-2xl mt-10 px-6 min-h-[160px]">
        <p
          className="leading-relaxed text-foreground/80"
          style={{ fontFamily: activeConfig.theme.fontNarrative, fontSize: `calc(1.05rem * ${activeConfig.theme.fontScale ?? 1})` }}
        >
          {lore?.lore}
        </p>
        <blockquote
          className="mt-4 border-l-2 pl-4 text-sm italic text-foreground/50 md:text-base"
          style={{ borderColor: activeConfig.theme.primary }}
        >
          {lore?.thesis}
        </blockquote>
      </div>
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
