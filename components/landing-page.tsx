'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Menu, Send, HelpCircle, Github, Beer, ExternalLink } from 'lucide-react'
import { ChatMessage } from '@/components/game/chat-message'
import { RollBadge } from '@/components/game/roll-badge'
import { genres, getGenreConfig, type Genre } from '@/lib/genre-config'
import type { RollDisplayData } from '@/lib/types'

// ─── Per-genre demo content ──────────────────────────────────────────

const ts = new Date(0) // fixed timestamp to avoid SSR/client hydration mismatch

interface DemoContent {
  chapter: string
  messages: { id: string; type: 'gm' | 'player'; content: string; timestamp: Date }[]
  roll: RollDisplayData
  finalMessage: { id: string; type: 'gm'; content: string; timestamp: Date }
  actions: string[]
}

const demoContent: Record<string, DemoContent> = {
  'space-opera': {
    chapter: 'Chapter 1: Trouble at Orja-9',
    messages: [
      { id: 'so-1', type: 'gm', content: 'The airlock hisses open. Beyond it, Orja-9\'s docking ring stretches in both directions — rusted gantries, flickering nav-lights, and the smell of recycled air cut with engine grease. Your contact said Bay 7. You\'re standing at Bay 12.', timestamp: ts },
      { id: 'so-2', type: 'player', content: 'Find a vantage point first', timestamp: ts },
      { id: 'so-3', type: 'gm', content: 'You spot a maintenance catwalk above the main corridor. The ladder\'s missing two rungs, but it\'ll do.', timestamp: ts },
    ],
    roll: { check: 'Perception Check', dc: 12, roll: 17, modifier: 2, total: 19, result: 'success', reason: 'Scanning from the catwalk' },
    finalMessage: { id: 'so-4', type: 'gm', content: 'From up here you can see Bay 7 clearly. Two figures in dock-worker coveralls, but they\'re standing wrong — weight forward, hands empty, watching the corridor instead of working. Your contact is nowhere in sight.', timestamp: ts },
    actions: ['Approach carefully', 'Signal from the catwalk', 'Leave. This is a setup.'],
  },
  fantasy: {
    chapter: 'Chapter 1: The Thornwood Crossing',
    messages: [
      { id: 'fa-1', type: 'gm', content: 'The forest path narrows to a game trail. Roots twist across the ground like grasping fingers and the canopy is so thick the afternoon sun barely reaches you. Somewhere ahead, you hear running water — and voices. At least three, speaking low.', timestamp: ts },
      { id: 'fa-2', type: 'player', content: 'Crouch behind the brambles and listen', timestamp: ts },
      { id: 'fa-3', type: 'gm', content: 'You ease yourself into the undergrowth, thorns catching your cloak. The voices sharpen into words.', timestamp: ts },
    ],
    roll: { check: 'Stealth Check', dc: 14, roll: 16, modifier: 3, total: 19, result: 'success', reason: 'Moving through the brambles' },
    finalMessage: { id: 'fa-4', type: 'gm', content: '"...the seal on the crypt won\'t hold past the new moon." The speaker is a woman in travel-stained leather, her hand resting on a short sword. Two others kneel by the stream, filling waterskins. None of them have noticed you.', timestamp: ts },
    actions: ['Step out and announce yourself', 'Circle around to the stream', 'Stay hidden and keep listening'],
  },
  cyberpunk: {
    chapter: 'Chapter 1: The Kessler Job',
    messages: [
      { id: 'cy-1', type: 'gm', content: 'Rain hammers the rooftop. Forty stories below, Kessler\'s penthouse glows through floor-to-ceiling glass — a warm island in the neon sprawl. Your optic overlay tags two thermal signatures inside. The service elevator shaft is twelve meters to your left. Unguarded, but alarmed.', timestamp: ts },
      { id: 'cy-2', type: 'player', content: 'Jack into the building\'s security net', timestamp: ts },
      { id: 'cy-3', type: 'gm', content: 'You slot the deck and the world splits: meat-space rain on your face, cyberspace architecture blooming behind your eyes. The security net is military-grade. Kessler\'s paranoid.', timestamp: ts },
    ],
    roll: { check: 'Hacking Check', dc: 15, roll: 14, modifier: 4, total: 18, result: 'success', reason: 'Breaching the security net' },
    finalMessage: { id: 'cy-4', type: 'gm', content: 'The alarm grid peels open like foil. You\'re in. Camera feeds cascade across your vision — and there\'s a third thermal signature the overlay missed. Someone in the panic room. Someone Kessler is very afraid of.', timestamp: ts },
    actions: ['Disable the panic room lock remotely', 'Ignore it — hit the penthouse', 'Pull out. This just got complicated.'],
  },
  grimdark: {
    chapter: 'Chapter 1: The Black Tribunal',
    messages: [
      { id: 'gd-1', type: 'gm', content: 'The great hall reeks of tallow and old blood. A hundred petitioners line the walls, eyes down, waiting for the Tribunal to call their name. You are number seventy-three. The Inquisitor on the dais hasn\'t looked up from his ledger in an hour. When he does, someone always screams.', timestamp: ts },
      { id: 'gd-2', type: 'player', content: 'Study the guards\' rotation while I wait', timestamp: ts },
      { id: 'gd-3', type: 'gm', content: 'You keep your head bowed like the others, but your eyes are working. Two knights at the dais, ceremonial halberds. Four more at the exits. And one — just one — who keeps checking the servants\' passage behind the tapestry.', timestamp: ts },
    ],
    roll: { check: 'Insight Check', dc: 13, roll: 15, modifier: 2, total: 17, result: 'success', reason: 'Reading the guard\'s behavior' },
    finalMessage: { id: 'gd-4', type: 'gm', content: 'That guard is nervous. Not bored, not dutiful — genuinely afraid. Whatever is behind that tapestry, he doesn\'t want to be the one standing closest to it. Then the Inquisitor speaks: "Number seventy-three."', timestamp: ts },
    actions: ['Approach the dais', 'Bolt for the servants\' passage', 'Kneel and plead illness'],
  },
  noire: {
    chapter: 'Chapter 1: The Harmon Case',
    messages: [
      { id: 'no-1', type: 'gm', content: 'The office smells like yesterday\'s coffee and this morning\'s regret. Rain streaks the window behind you, turning the street below into a blurred painting of headlights and neon. The woman sitting across from you is Vera Harmon: black coat, white gloves, the kind of composure that costs money to maintain. She hasn\'t touched the coffee you offered.', timestamp: ts },
      { id: 'no-2', type: 'player', content: 'Ask who sent her', timestamp: ts },
      { id: 'no-3', type: 'gm', content: '"Nobody sent me." She reaches into her coat and places a photograph on your desk. A man in his fifties, silver hair, expensive suit. "My husband. Three days missing. The police say he\'s on a business trip." She pauses. "His passport is in my safe."', timestamp: ts },
    ],
    roll: { check: 'Insight Check', dc: 11, roll: 13, modifier: 3, total: 16, result: 'success', reason: 'Reading Vera\'s composure' },
    finalMessage: { id: 'no-4', type: 'gm', content: 'She\'s telling the truth about the passport. But her left hand, the one in her lap, keeps clenching. She\'s afraid, and not just for her husband. Something about this meeting itself is costing her. Someone told her not to come here.', timestamp: ts },
    actions: ['Take the case', 'Ask about the clenched fist', 'Name your price first'],
  },
  'epic-scifi': {
    chapter: 'Chapter 1: First Audience',
    messages: [
      { id: 'es-1', type: 'gm', content: 'The Conclave hall is vast enough to lose a voice in. Gold leaf catches the light from chandeliers powered by Drift energy you can almost taste on the back of your tongue. The Minor Houses sit below the dais. The Major Houses sit above it. You are standing.', timestamp: ts },
      { id: 'es-2', type: 'player', content: 'Study the Synod delegation before they notice me', timestamp: ts },
      { id: 'es-3', type: 'gm', content: 'Three Synod Adjudicators in white and silver vestments, seated apart from the houses. The one in the center hasn\'t stopped watching the Resonant standing behind House Aldren\'s chair. The Resonant\'s hands are trembling.', timestamp: ts },
    ],
    roll: { check: 'Insight Check', dc: 14, roll: 16, modifier: 3, total: 19, result: 'success', reason: 'Reading the Synod Adjudicator' },
    finalMessage: { id: 'es-4', type: 'gm', content: 'The Adjudicator isn\'t watching the Resonant with suspicion. It\'s recognition. She knows this Resonant. And from the way her jaw is set, the Resonant was supposed to be somewhere else entirely. House Aldren has an unregistered asset, and the Synod just noticed.', timestamp: ts },
    actions: ['Approach House Aldren with a warning', 'Intercept the Adjudicator', 'Stay silent and watch what unfolds'],
  },
}

// ─── Genre Lore Content ─────────────────────────────────────────────

const genreLore: Record<string, { lore: string; thesis: string; hookTitle: string; hookText: string }> = {
  'space-opera': {
    lore: "Year 3187. The Compact that once unified 200 star systems has collapsed. You command a scrappy frigate with a small crew, navigating a galaxy where pirate fleets, corporate blocs, and rogue AIs compete for what's left. You're not a chosen hero. You're just in the wrong place.",
    thesis: "Scale mismatch — small people, big stakes.",
    hookTitle: "Old Colors",
    hookText: "An old friend from your former unit sends a distress signal from a system you swore you'd never go back to. The signal is three hours old and degrading.",
  },
  'fantasy': {
    lore: "The Five Kingdoms still stand, but the world is ending in forgetting, not fire. Ancient ruins everywhere, nobody remembers who built them. The Collegium studies but understands less each decade. A plague spreads from the eastern marshes. Something stirs beneath ruins older than the kingdoms.",
    thesis: "A world forgetting itself. Every spell draws from a diminishing reservoir.",
    hookTitle: "The Second Library",
    hookText: "A scholar at the Collegium dies under suspicious circumstances. Her notes mention a second library — one you've never heard of, in a place that shouldn't exist.",
  },
  'grimdark': {
    lore: "The Pact of Ashes is fraying. A famine called the Wasting spreads across the provinces. Border lords raise private armies, the Church controls the hospitals and the Inquisition, and magic is feared and costly. You lead a small mercenary company through a world of mud, blood, and iron.",
    thesis: "Moral entropy. Every choice costs something. Victories are never clean.",
    hookTitle: "The Mercy",
    hookText: "Your company freed a group of prisoners from a border lord's stockade. You left two guards alive. Now a steward arrives at camp, unarmed, saying those prisoners were the dangerous ones.",
  },
  'cyberpunk': {
    lore: "Megacorps own the law, the media, and the people. The city is vertical, stratified by wealth. Cyberware is ubiquitous. Privacy is a commodity. You run a small crew from a safehouse in the middle layers.",
    thesis: "Humanity vs. capability. Every upgrade makes you better at the job, worse at being a person.",
    hookTitle: "Blackout",
    hookText: "City blackout in a six-block radius. Your name broadcast on every local channel. Someone wanted you visible. The question is who, and what they think you have.",
  },
  'noire': {
    lore: "The city runs on money, secrets, and the distribution of both. Police are overworked or bought. The wealthy are untouchable until they aren't. You work alone. Rain-slicked streets, frosted glass doors, dive bars, hotels with forgetting clerks.",
    thesis: "Information as currency. Truth is as dangerous as the lie.",
    hookTitle: "Five Names",
    hookText: "A woman you've never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names — four of them are still alive.",
  },
  'epic-scifi': {
    lore: "The Hegemony has endured for a thousand years, held together by Resonants — humans attuned to the Drift. Identified at age seven, taken by the Synod, deployed as living infrastructure. Resonants are legally property. Their power is immense. Their control is total.",
    thesis: "Institutional complicity. You're inside a machine that runs on human lives.",
    hookTitle: "The Allocation",
    hookText: "Your house has been allocated a new Resonant. She's fourteen. She arrives tomorrow. Her family hasn't stopped sending messages. The Synod says to ignore them.",
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────

function StatBar({ label, value }: { label: string; value: number }) {
  const mod = Math.floor((value - 10) / 2)
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">
        {value} <span className="text-muted-foreground">({mod >= 0 ? '+' : ''}{mod})</span>
      </span>
    </div>
  )
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.round((current / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-secondary/30 overflow-hidden">
        <div className="h-full rounded-full bg-success/70 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">{current}/{max}</span>
    </div>
  )
}

function ClockDisplay({ name, segments, filled }: { name: string; segments: number; filled: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} className={`h-2 w-3 rounded-sm ${i < filled ? 'bg-warning/70' : 'bg-secondary/30'}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  )
}

interface DemoCharacter {
  name: string; species: string; class: string; level: number
  hp: { current: number; max: number }; ac: number
  stats: { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number }
  currency: number; currencyLabel: string; trait: string; traitDesc: string
  companion: { name: string; desc: string }
  npcs: { name: string; desc: string; disposition: string }[]
  antagonist: { name: string; desc: string }
  tabs: string[]
}

const demoCharacters: Record<string, DemoCharacter> = {
  'space-opera': {
    name: 'Kael Voss', species: 'Vrynn', class: 'Driftrunner', level: 3,
    hp: { current: 22, max: 28 }, ac: 14,
    stats: { STR: 8, DEX: 16, CON: 12, INT: 14, WIS: 13, CHA: 10 },
    currency: 340, currencyLabel: 'Credits', trait: 'Smuggler\'s Luck',
    traitDesc: 'Once per day, when caught or cornered, one contraband item goes undetected.',
    companion: { name: 'Rix', desc: 'Vrynn mechanic. Sarcastic but loyal.' },
    npcs: [
      { name: 'Sable', desc: 'Fixer. Owes you a favor.', disposition: 'Trusted' },
      { name: 'Director Voss', desc: 'Station authority. Suspicious.', disposition: 'Wary' },
      { name: 'Oshi', desc: 'Missing. Last seen Verath Station.', disposition: 'Unknown' },
    ],
    antagonist: { name: 'The Broker', desc: 'Controls Orja-9\'s black market. Knows you\'re here.' },
    tabs: ['Character', 'Ship', 'World', 'Chapters'],
  },
  fantasy: {
    name: 'Sera Thornwood', species: 'Elf', class: 'Arcanist', level: 3,
    hp: { current: 18, max: 24 }, ac: 12,
    stats: { STR: 8, DEX: 12, CON: 10, INT: 17, WIS: 14, CHA: 11 },
    currency: 85, currencyLabel: 'Gold', trait: 'Arcane Surge',
    traitDesc: 'Once per day, auto-succeed an Arcana check or force a re-save. Nat 1 triggers wild magic.',
    companion: { name: 'Bryn', desc: 'Halfling ranger. Quiet, dependable, reads the land.' },
    npcs: [
      { name: 'Aldric', desc: 'Collegium scholar. Knows more than he shares.', disposition: 'Favorable' },
      { name: 'Warden Hale', desc: 'Border patrol. Trusts no one from the capital.', disposition: 'Wary' },
      { name: 'The Weaver', desc: 'Fortune teller. Always right. Always vague.', disposition: 'Neutral' },
    ],
    antagonist: { name: 'The Forgetting', desc: 'Not a person. A process. The world is losing itself.' },
    tabs: ['Character', 'Fellowship', 'World', 'Chapters'],
  },
  grimdark: {
    name: 'Harren Blackwall', species: 'House Stonemark', class: 'Ironclad', level: 3,
    hp: { current: 30, max: 34 }, ac: 16,
    stats: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 12, CHA: 8 },
    currency: 42, currencyLabel: 'Gold', trait: 'Last Standing',
    traitDesc: 'Once per day, drop to 1 HP instead of 0.',
    companion: { name: 'Maren', desc: 'Company scout. Fast, cynical, reliable under fire.' },
    npcs: [
      { name: 'Father Aldous', desc: 'Church healer. Kind hands, cold faith.', disposition: 'Favorable' },
      { name: 'Steward Gris', desc: 'Border lord\'s man. Delivers threats politely.', disposition: 'Wary' },
      { name: 'The Leper', desc: 'Knows the Ashlands. No name. No face.', disposition: 'Neutral' },
    ],
    antagonist: { name: 'Lord Vane', desc: 'Raises an army while his people starve.' },
    tabs: ['Character', 'Company', 'World', 'Chapters'],
  },
  cyberpunk: {
    name: 'Zero', species: 'Street Kid', class: 'Netrunner', level: 3,
    hp: { current: 20, max: 26 }, ac: 13,
    stats: { STR: 8, DEX: 14, CON: 12, INT: 17, WIS: 10, CHA: 11 },
    currency: 1200, currencyLabel: 'Eddies', trait: 'Deep Dive',
    traitDesc: 'Once per day, auto-succeed a hacking check or seize a device. Neural stress accumulates.',
    companion: { name: 'Patch', desc: 'Medtech. Keeps you alive. Asks too many questions.' },
    npcs: [
      { name: 'Mama Kin', desc: 'Gang boss. Raised you. Owns you.', disposition: 'Trusted' },
      { name: 'Kessler', desc: 'Corporate fixer. Pays well, lies better.', disposition: 'Wary' },
      { name: 'Ghost', desc: 'Hacker. Dead three years. Still sending messages.', disposition: 'Unknown' },
    ],
    antagonist: { name: 'Axiom Corp', desc: 'They don\'t want you dead. They want you useful.' },
    tabs: ['Character', 'Tech Rig', 'World', 'Chapters'],
  },
  noire: {
    name: 'Sam Harlow', species: 'Ex-Cop', class: 'Private Investigator', level: 3,
    hp: { current: 19, max: 22 }, ac: 11,
    stats: { STR: 10, DEX: 12, CON: 11, INT: 13, WIS: 16, CHA: 12 },
    currency: 180, currencyLabel: 'Cash', trait: 'Case Instinct',
    traitDesc: 'Once per chapter, propose a connection between facts. Success reveals hidden information.',
    companion: { name: 'Dot', desc: 'Secretary. Screens your calls. Keeps your secrets.' },
    npcs: [
      { name: 'Vera Harmon', desc: 'Client. Husband missing. Not telling everything.', disposition: 'Neutral' },
      { name: 'Det. Kowalski', desc: 'Old precinct buddy. Still picks up the phone.', disposition: 'Favorable' },
      { name: 'Eddie Lim', desc: 'Bookie. Knows who owes what to whom.', disposition: 'Wary' },
    ],
    antagonist: { name: 'Someone', desc: 'Told Vera not to come here. She came anyway.' },
    tabs: ['Character', 'Office', 'World', 'Chapters'],
  },
  'epic-scifi': {
    name: 'Lyra Vael', species: 'Minor House', class: 'Envoy', level: 3,
    hp: { current: 17, max: 22 }, ac: 12,
    stats: { STR: 8, DEX: 10, CON: 11, INT: 14, WIS: 13, CHA: 17 },
    currency: 500, currencyLabel: 'Writs', trait: 'Accord',
    traitDesc: 'Once per chapter, invoke house authority to halt hostility or force negotiation.',
    companion: { name: 'Thane', desc: 'House retainer. Loyal beyond reason. Served your mother.' },
    npcs: [
      { name: 'Adjudicator Seren', desc: 'Synod. Watches everything. Judges more.', disposition: 'Neutral' },
      { name: 'Lord Aldren', desc: 'Major House. Has an unregistered Resonant.', disposition: 'Wary' },
      { name: 'Kael', desc: 'Undrift contact. Trusts no institution.', disposition: 'Favorable' },
    ],
    antagonist: { name: 'The Synod', desc: 'The machine that runs on human lives. You\'re inside it.' },
    tabs: ['Character', 'Retinue', 'World', 'Chapters'],
  },
}

// ─── Landing Page ────────────────────────────────────────────────────

export function LandingPage() {
  const [activeGenre, setActiveGenre] = useState<Genre>('space-opera')
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const availableGenres = genres.filter((g) => g.available)
  const activeConfig = getGenreConfig(activeGenre)
  const demo = demoContent[activeGenre]
  const lore = genreLore[activeGenre]
  const char = demoCharacters[activeGenre]

  const handleGenreSelect = useCallback((genreId: Genre, el?: HTMLButtonElement) => {
    setActiveGenre(genreId)
    setSelectedAction(null)
    // Center the clicked card in the carousel
    if (el && carouselRef.current) {
      const container = carouselRef.current
      const scrollTarget = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    }
  }, [])

  // Looping carousel: triple the items and keep scroll centered on the middle set
  const carouselRef = useRef<HTMLDivElement>(null)
  const loopGenres = [...availableGenres, ...availableGenres, ...availableGenres]
  const isScrolling = useRef(false)

  // On mount, center the first active card in the middle set
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    // Find the first card in the middle set (index = availableGenres.length)
    const firstMiddleCard = el.children[availableGenres.length] as HTMLElement
    if (firstMiddleCard) {
      el.scrollLeft = firstMiddleCard.offsetLeft - el.offsetWidth / 2 + firstMiddleCard.offsetWidth / 2
    }
  }, [])

  // When scroll stops near the edges, silently jump to the equivalent middle position
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

  // Apply full genre theme to the document (background effects, colors, fonts)
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const theme = activeConfig.theme

    root.dataset.genre = activeGenre
    root.dataset.landingPage = 'true'

    root.style.setProperty('--background', theme.background)
    root.style.setProperty('--foreground', theme.foreground)
    root.style.setProperty('--card', theme.card)
    root.style.setProperty('--card-foreground', theme.cardForeground)
    root.style.setProperty('--primary', theme.primary)
    root.style.setProperty('--primary-foreground', theme.primaryForeground)
    root.style.setProperty('--secondary', theme.secondary)
    root.style.setProperty('--secondary-foreground', theme.secondaryForeground)
    root.style.setProperty('--muted', theme.muted)
    root.style.setProperty('--muted-foreground', theme.mutedForeground)
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--accent-foreground', theme.accentForeground)
    root.style.setProperty('--destructive', theme.destructive)
    root.style.setProperty('--border', theme.border)
    root.style.setProperty('--input', theme.input)
    root.style.setProperty('--ring', theme.ring)
    root.style.setProperty('--narrative', theme.narrative)
    root.style.setProperty('--meta', theme.meta)
    root.style.setProperty('--success', theme.success)
    root.style.setProperty('--warning', theme.warning)
    root.style.setProperty('--title-glow', theme.titleGlow)
    root.style.setProperty('--tertiary', theme.tertiary)
    root.style.setProperty('--tertiary-foreground', theme.tertiaryForeground)
    body.style.setProperty('--font-narrative', theme.fontNarrative)
    body.style.setProperty('--font-heading', theme.fontHeading)
    body.style.setProperty('--font-system', theme.fontSystem)

    return () => {
      // Clean up on unmount (e.g., navigating away from landing page)
      delete root.dataset.genre
      delete root.dataset.landingPage
    }
  }, [activeGenre, activeConfig.theme])

  // Scroll-triggered reveal for below-fold sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )
    // Delay slightly so DOM is painted
    const timer = setTimeout(() => {
      document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el))
    }, 150)
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [])

  // Theme vars for inline styling on specific sections
  const themeVars: React.CSSProperties = {
    '--font-narrative': activeConfig.theme.fontNarrative,
    '--font-heading': activeConfig.theme.fontHeading,
    '--font-system': "'Geist Mono', monospace",
    '--narrative-font-size': (activeGenre === 'space-opera' || activeGenre === 'cyberpunk') ? '0.8125rem' : '0.875rem',
    '--primary': activeConfig.theme.primary,
    '--primary-foreground': activeConfig.theme.primaryForeground,
    '--tertiary': activeConfig.theme.tertiary,
  } as React.CSSProperties

  // Font scale helper — genre fonts have different x-heights at the same CSS size
  const scale = activeConfig.theme.fontScale ?? 1
  const scaled = (base: string) => `calc(${base} * ${scale})`

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── 1. Hero ── */}
      <section className="relative flex flex-col items-center px-6 pt-32 pb-32 text-center overflow-hidden">
        {/* Subtle radial gradient */}
        <div
          className="pointer-events-none absolute inset-0 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 30%, color-mix(in oklch, ${activeConfig.theme.primary} 8%, transparent), transparent)`,
          }}
        />
        <h1
          className="hero-stagger relative text-4xl font-light tracking-[0.15em] sm:text-5xl md:text-6xl lg:text-7xl transition-all duration-700"
          style={{
            fontFamily: activeConfig.theme.fontHeading,
            color: activeConfig.theme.primary,
            textShadow: `0 0 40px color-mix(in oklch, ${activeConfig.theme.primary} 80%, transparent), 0 0 80px color-mix(in oklch, ${activeConfig.theme.primary} 40%, transparent)`,
            animationDelay: '0s',
          }}
        >
          storyforge
        </h1>
        <p
          className="hero-stagger relative mt-4 font-mono text-sm tracking-[0.15em] text-primary sm:text-base"
          style={{ animationDelay: '0.2s' }}
        >
          the dice shape everything.
        </p>
        <p className="hero-stagger relative mt-8 max-w-xl text-lg leading-relaxed text-foreground/70 md:text-xl" style={{ animationDelay: '0.4s' }}>
          Play a story you'd actually want to read.
        </p>
        <a
          href="/chronicles"
          className="hero-stagger relative mt-6 max-w-lg border-l-2 border-primary/30 pl-4 text-left transition-colors hover:border-primary/60"
          style={{ animationDelay: '0.5s' }}
        >
          <p className="text-sm italic text-foreground/40 leading-relaxed">
            &ldquo;The note said Mira Grenn. Daughter. Twelve years. Saw you leave.&rdquo;
          </p>
          <span className="mt-1.5 inline-block font-mono text-[10px] text-primary/50 hover:text-primary/80 transition-colors">
            Read the Tales of Storyforge →
          </span>
        </a>
        <div className="hero-stagger relative mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: '0.7s' }}>
          <a
            href="/play"
            className="bg-primary px-8 py-3.5 font-mono text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_0_25px_-3px] hover:shadow-primary/40 border border-primary"
          >
            Play demo
          </a>
          <a
            href="/play?byok=1"
            className="border border-primary/30 px-8 py-3.5 font-mono text-sm font-semibold text-foreground/80 transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Bring your own API key
          </a>
        </div>
        <div className="hero-stagger relative mt-5 flex flex-col items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground/50" style={{ animationDelay: '0.9s' }}>
          <span>Powered by Claude. Bring your own API key for unlimited play.</span>
          <a href="https://github.com/mheuer86/storyforge-game" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
            <Github className="h-3.5 w-3.5" />
            <span>Open Source on GitHub</span>
          </a>
        </div>
      </section>

      {/* ── 2. Genre Gallery (horizontal carousel) ── */}
      <section className="w-full pb-24">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Six worlds. One engine.
        </h2>

        <div ref={carouselRef} className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-thin md:gap-5">
          {loopGenres.map((entry, idx) => {
            const config = getGenreConfig(entry.id)
            const isActive = entry.id === activeGenre
            return (
              <button
                key={`${entry.id}-${idx}`}
                onClick={(e) => handleGenreSelect(entry.id, e.currentTarget)}
                className={`group relative shrink-0 snap-center w-[75vw] sm:w-[50vw] md:w-[40vw] lg:w-[30vw] aspect-[16/9] overflow-hidden text-left transition-[transform,opacity,filter] duration-500 ${
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
                  className={`object-cover transition-[filter] duration-500 ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`}
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
      </section>

      {/* ── 3. Genre Detail (expanded) ── */}
      <section
        ref={detailRef}
        className="mx-auto w-full max-w-5xl px-6 pb-28"
        style={themeVars}
      >
        {/* 3a. Lore Block */}
        <div className="max-w-2xl mb-16">
          <p
            className="leading-relaxed text-foreground/80"
            style={{ fontFamily: activeConfig.theme.fontNarrative, fontSize: scaled('1.05rem') }}
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

        {/* 3b. Species/Origins */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-px" style={{ backgroundColor: activeConfig.theme.primary, opacity: 0.4 }} />
            <span className="text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: activeConfig.theme.primary }}>
              {activeConfig.speciesLabel}
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
            {activeConfig.species.map((s) => (
              <div key={s.id} className="shrink-0 w-[160px] sm:w-[180px] md:w-[200px] text-left">
                <div className="relative aspect-[3/4] overflow-hidden mb-3 border border-border/10">
                  <Image
                    src={`/portraits/${activeGenre}/${s.id}.png`}
                    alt={s.name}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-background/90 to-transparent">
                    <p className="text-sm font-bold tracking-wide uppercase text-foreground">{s.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3c. Classes Grid */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-px" style={{ backgroundColor: activeConfig.theme.primary, opacity: 0.4 }} />
            <span className="text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: activeConfig.theme.primary }}>
              Classes
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {activeConfig.classes.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-1.5 border border-border/10 bg-card/60 p-4 text-left shadow-md shadow-black/20"
              >
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground leading-snug">{c.concept}</div>
                <div
                  className="mt-1.5 inline-flex self-start rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium"
                  style={{ color: activeConfig.theme.primary, backgroundColor: `color-mix(in oklch, ${activeConfig.theme.primary} 12%, transparent)` }}
                >
                  {c.primaryStat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${activeConfig.theme.primary}, transparent)`, opacity: 0.15 }} />

      {/* ── 4. Gameplay Preview ── */}
      <section className="scroll-reveal mx-auto w-full max-w-3xl px-6 pt-20 pb-24" style={themeVars}>
        <h2 className="mb-3 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          See it in action.
        </h2>
        <p className="mb-10 text-center text-sm" style={{ color: activeConfig.theme.primary }}>
          {demo.chapter}
        </p>

        <div
          className="relative overflow-hidden border border-border/10 bg-card/40 transition-colors"
          style={{
            borderTopWidth: 2,
            borderTopColor: activeConfig.theme.primary,
            boxShadow: `inset 0 1px 30px -10px color-mix(in oklch, ${activeConfig.theme.primary} 8%, transparent)`,
          }}
        >
          {/* Mini top bar */}
          <div className="flex h-10 items-center justify-between border-b border-border/10 bg-background/60 px-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
              storyforge
            </span>
            <span className="font-heading text-xs" style={{ color: activeConfig.theme.primary }}>
              {demo.chapter}
            </span>
            <Menu className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>

          {/* Chat area */}
          <div className="space-y-5 p-5">
            {demo.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            <RollBadge rollData={demo.roll} />

            <ChatMessage message={demo.finalMessage} />

            {/* Action buttons with hover */}
            <div className="flex flex-col gap-2">
              {demo.actions.map((action) => (
                <button
                  key={action}
                  onMouseEnter={() => setSelectedAction(action)}
                  onMouseLeave={() => setSelectedAction(null)}
                  className={`rounded-sm border px-4 py-2.5 text-xs text-left transition-all ${
                    selectedAction === action
                      ? 'border-primary/30 bg-primary/5 text-foreground'
                      : 'border-border/15 bg-secondary/5 text-foreground/70 hover:border-primary/20'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Mini action bar */}
          <div className="flex items-center gap-0 border-t border-border/10 bg-background/40">
            <div className="shrink-0 px-3 py-2.5 text-muted-foreground/50">
              <HelpCircle className="h-4 w-4" />
            </div>
            <span className="flex-1 px-2 py-2.5 text-sm text-muted-foreground/50">
              Or type your own action...
            </span>
            <div className="mx-1.5 rounded-sm p-2" style={{ backgroundColor: `color-mix(in oklch, ${activeConfig.theme.primary} 40%, transparent)` }}>
              <Send className="h-3.5 w-3.5 text-primary-foreground/70" />
            </div>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${activeConfig.theme.primary}, transparent)`, opacity: 0.15 }} />

      {/* ── 5. Burger Menu Showcase ── */}
      <section className="scroll-reveal mx-auto w-full max-w-3xl px-6 pt-20 pb-24" style={themeVars}>
        <h2 className="mb-3 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Everything at your fingertips.
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Character sheet, NPCs, tension clocks, promises — one slide away.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Character panel */}
          <div className="border border-border/15 bg-background/95 backdrop-blur-xl p-5 flex flex-col gap-5 text-sm">
            <div className="flex gap-4 overflow-x-auto border-b border-border/10 pb-2">
              {char.tabs.map((tab, i) => (
                <span key={tab} className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] ${i === 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{char.name}</h3>
              <p className="mt-0.5 text-sm text-foreground/50">
                {char.species} {char.class} · Level {char.level}
              </p>
            </div>

            <div className="flex flex-col">
              {[
                { label: 'HP', value: `${char.hp.current} / ${char.hp.max}` },
                { label: 'AC', value: String(char.ac) },
                { label: char.currencyLabel, value: `${char.currency}` },
                { label: 'Inspiration', value: '◇ —' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border/8 py-2 last:border-0">
                  <span className="text-sm text-foreground/40 capitalize">{row.label}</span>
                  <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Stats</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(char.stats).map(([stat, value]) => {
                  const mod = Math.floor((value - 10) / 2)
                  const highest = Math.max(...Object.values(char.stats))
                  const isPrimary = value === highest
                  return (
                    <div key={stat} className={`rounded-sm border p-2 text-center ${isPrimary ? 'border-primary/30 bg-primary/8' : 'border-border/10 bg-secondary/5'}`}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{stat}</div>
                      <div className="font-mono text-lg font-semibold text-foreground">{value}</div>
                      <div className={`font-mono text-xs ${isPrimary ? 'text-primary/80' : 'text-muted-foreground/60'}`}>
                        {mod >= 0 ? '+' : ''}{mod}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Class Trait</h4>
              </div>
              <div className="border-l-2 border-primary/30 pl-3">
                <div className="text-sm font-medium text-primary">{char.trait}</div>
                <div className="mt-1 text-xs text-foreground/50 leading-relaxed">{char.traitDesc}</div>
              </div>
            </div>
          </div>

          {/* World panel */}
          <div className="border border-border/15 bg-background/95 backdrop-blur-xl p-5 flex flex-col gap-5 text-sm">
            <div className="flex gap-4 overflow-x-auto border-b border-border/10 pb-2">
              {char.tabs.map((tab, i) => (
                <span key={tab} className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] ${i === 2 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            <div className="flex gap-4">
              {['People', 'Narrative', 'Locations'].map((tab, i) => (
                <span key={tab} className={`text-[10px] font-medium uppercase tracking-[0.15em] pb-1 ${i === 0 ? 'text-primary border-b border-primary/40' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">{activeConfig.companionLabel}</h4>
              </div>
              <div className="rounded-sm border border-primary/15 bg-primary/5 px-3 py-2.5">
                <div className="font-medium text-foreground">{char.companion.name}</div>
                <div className="text-xs text-foreground/60">{char.companion.desc}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Known NPCs</h4>
              </div>
              <div className="flex flex-col gap-2">
                {char.npcs.map((npc) => (
                  <div key={npc.name} className="rounded-sm border border-border/10 bg-secondary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{npc.name}</div>
                    <div className="text-xs text-foreground/60">{npc.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Antagonist</h4>
              </div>
              <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <div className="font-medium text-foreground">{char.antagonist.name}</div>
                <div className="text-xs text-foreground/60">{char.antagonist.desc}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${activeConfig.theme.primary}, transparent)`, opacity: 0.15 }} />

      {/* ── 6. Chronicles ── */}
      <section className="scroll-reveal mx-auto w-full max-w-5xl px-6 pt-20 pb-24">
        <h2 className="mb-3 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Tales of Storyforge.
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Real playthroughs, adapted into short fiction. Every story started with a dice roll.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: 'The Margaux Hotel', genre: 'Noir', character: 'Hank Garnett, Private Investigator', excerpt: 'The woman in the doorway didn\'t look like someone in mourning. She looked like someone running a calculation.', slug: 'hank-garnett-chapter-1' },
            { title: 'Implanted', genre: 'Cyberpunk', character: 'Ghost, Ghost', excerpt: 'Rain hammered the corrugated roof. Dr. Yara Okafor had been running the same scan for three minutes and she hadn\'t said a word since the results came up.', slug: 'ghost-sera-chapter-1' },
            { title: 'The Tethis Run', genre: 'Epic Sci-Fi', character: 'Verum, Seeker', excerpt: 'The cuffs hung loose around her wrist like a suggestion she\'d already declined.', slug: 'verum-chapter-2' },
            { title: 'Second Name', genre: 'Grimdark', character: 'Whisper, Cutthroat', excerpt: 'The note said Mira Grenn. Daughter. Twelve years. Saw you leave.', slug: 'whisper-chapter-1' },
          ].map((chronicle) => (
            <a
              key={chronicle.slug}
              href={`/chronicles/${chronicle.slug}`}
              className="group border border-border/10 bg-card/30 p-5 transition-colors hover:border-primary/20 hover:bg-card/50"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">{chronicle.genre}</span>
                <span className="text-[10px] text-muted-foreground/40">{chronicle.character}</span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{chronicle.title}</h3>
              <p className="text-sm italic text-foreground/50 leading-relaxed line-clamp-2">{chronicle.excerpt}</p>
              <span className="mt-3 inline-block text-xs text-primary/60 group-hover:text-primary transition-colors">
                Read the story →
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Section divider */}
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${activeConfig.theme.primary}, transparent)`, opacity: 0.15 }} />

      {/* ── 7. Mechanics ── */}
      <section className="scroll-reveal mx-auto w-full max-w-3xl px-6 pt-20 pb-24">
        <h2 className="mb-3 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Not a chatbot wearing a fantasy hat.
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Real mechanics. Real consequences. The AI enforces the rules, including on itself.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'NPCs That Remember', text: 'Every NPC tracks disposition toward you. Betray someone and they stay hostile. Earn trust and doors open. No dialogue trees, just consequences.' },
            { label: 'Promises & Clocks', text: 'Make a promise to an NPC and the game tracks it. Defer too long and it strains. Tension clocks advance whether you\'re ready or not.' },
            { label: 'D20 Under The Hood', text: 'Real ability scores, proficiency, advantage/disadvantage. Every roll is shown with the math. The dice are honest, and Claude plays by them.' },
          ].map((feature) => (
            <div key={feature.label} className="border border-border/10 bg-card/30 p-5">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{feature.label}</span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section divider */}
      <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${activeConfig.theme.primary}, transparent)`, opacity: 0.15 }} />

      {/* ── 8. How It Works ── */}
      <section className="scroll-reveal mx-auto w-full max-w-3xl px-6 pt-20 pb-24">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          How it works.
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: 'No account needed', text: 'Your game saves to your browser. No signup, no cloud, no tracking. Your story stays on your device.' },
            { label: 'Bring your own API key', text: 'Get a Claude API key from Anthropic and play unlimited. Your key stays in your browser and is never sent to our servers. Cost per chapter is under 1\u20AC.' },
            { label: 'Free demo', text: 'Try a few chapters without an API key. There\'s a limited monthly token budget for the demo, then you\'ll need your own key.' },
            { label: 'Open source', text: 'The full codebase is on GitHub. Run your own instance, read the code, contribute. Licensed under AGPL-3.0.' },
          ].map((item) => (
            <div key={item.label} className="border border-border/10 bg-card/30 p-5">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{item.label}</span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. Final CTA ── */}
      <section className="scroll-reveal flex flex-col items-center px-6 py-24 text-center">
        <h2
          className="font-heading text-4xl font-bold tracking-tight md:text-5xl"
          style={{ textShadow: `0 0 30px color-mix(in oklch, ${activeConfig.theme.primary} 30%, transparent)` }}
        >
          Your story is waiting.
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
          Try the demo for free, or bring your own Claude API key for unlimited play. No account required.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="/play"
            className="bg-primary px-10 py-4 font-mono text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_0_25px_-3px] hover:shadow-primary/40 border border-primary"
          >
            Play demo
          </a>
          <a
            href="/play?byok=1"
            className="border border-primary/30 px-10 py-4 font-mono text-sm font-semibold text-foreground/80 transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Bring your own API key
          </a>
        </div>
        <p className="mt-8 max-w-sm font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Built by one person with Claude Code.
        </p>
        <a
          href="https://buymeacoffee.com/storyforgegame"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-primary/50 hover:text-primary/80 transition-colors"
        >
          <Beer className="h-3.5 w-3.5" />
          Buy me a beer
        </a>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="border-t border-border/10 px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Left: branding */}
          <div className="flex items-center gap-4 sm:flex-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">Storyforge</span>
            <span className="text-muted-foreground/20">|</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">Made with Claude</span>
          </div>

          {/* Center: links */}
          <div className="flex items-center justify-center gap-5">
            <a href="/chronicles" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              Tales
            </a>
            <a href="/content-policy" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              Content Policy
            </a>
            <a href="/impressum" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              Impressum
            </a>
            <a href="mailto:storyforgegame@gmail.com" className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
              Contact
            </a>
          </div>

          {/* Right: social + support */}
          <div className="flex items-center gap-4 sm:flex-1 sm:justify-end">
            <a href="https://github.com/mheuer86/storyforge-game" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href="https://buymeacoffee.com/storyforgegame" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" aria-label="Buy me a beer">
              <Beer className="h-4 w-4" />
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Storyforge', text: 'A text RPG with real rules, real dice, and real consequences.', url: window.location.origin })
                } else {
                  navigator.clipboard.writeText(window.location.origin)
                }
              }}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              aria-label="Share"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
