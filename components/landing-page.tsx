'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, Send, HelpCircle } from 'lucide-react'
import { ChatMessage } from '@/components/game/chat-message'
import { RollBadge } from '@/components/game/roll-badge'
import { genres, getGenreConfig, type Genre } from '@/lib/genre-config'
import type { RollDisplayData } from '@/lib/types'

// ─── Per-genre demo content ──────────────────────────────────────────

const ts = new Date()

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

const demoCharacter = {
  name: 'Kael Voss', species: 'Vrynn', class: 'Operative', level: 3,
  hp: { current: 22, max: 28 }, ac: 14,
  stats: { STR: 8, DEX: 16, CON: 12, INT: 14, WIS: 13, CHA: 10 },
  credits: 340, trait: 'Shadow Step',
}

const demoNpcs = [
  { name: 'Sable', desc: 'Fixer. Owes you a favor.', disposition: 'Trusted' },
  { name: 'Director Voss', desc: 'Station authority. Suspicious.', disposition: 'Wary' },
  { name: 'Oshi', desc: 'Missing. Last seen Verath Station.', disposition: 'Unknown' },
]

const demoPromises = [
  { to: 'Sable', what: 'Locate Oshi\'s child on Verath Station' },
  { to: 'Laine', what: 'Return the data core' },
]

const demoClocks = [
  { name: 'Station Lockdown', segments: 4, filled: 2 },
  { name: 'Syndicate Patience', segments: 6, filled: 4 },
]

// ─── Landing Page ────────────────────────────────────────────────────

export function LandingPage() {
  const [activeGenre, setActiveGenre] = useState<Genre>('space-opera')
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const availableGenres = genres.filter((g) => g.available)
  const activeConfig = getGenreConfig(activeGenre)
  const demo = demoContent[activeGenre]

  // Override CSS vars that ChatMessage / RollBadge read from the theme
  const themeVars: React.CSSProperties = {
    '--font-narrative': activeConfig.theme.fontNarrative,
    '--font-heading': activeConfig.theme.fontHeading,
    '--font-system': "'Geist Mono', monospace",
    '--narrative-font-size': (activeGenre === 'space-opera' || activeGenre === 'cyberpunk') ? '0.8125rem' : '0.875rem',
    '--primary': activeConfig.theme.primary,
    '--primary-foreground': activeConfig.theme.primaryForeground,
    '--tertiary': activeConfig.theme.tertiary,
  } as React.CSSProperties

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center px-6 pt-28 pb-24 text-center">
        <h1
          className="font-mono text-5xl font-light uppercase tracking-[0.25em] md:text-7xl"
          style={{
            color: 'var(--primary)',
            textShadow: '0 0 40px oklch(0.72 0.15 195 / 0.8), 0 0 80px oklch(0.72 0.15 195 / 0.4)',
          }}
        >
          Storyforge
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          The dice shape everything.
        </p>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/70 md:text-xl">
          A text RPG with real rules, real dice, and real consequences — powered by Claude.
        </p>
        <a
          href="/play"
          className="mt-10 rounded-full bg-primary px-8 py-3.5 font-heading text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_25px_-3px] hover:shadow-primary/40"
        >
          Start your campaign
        </a>
      </section>

      {/* ── Genre Showcase + Gameplay Preview (combined interactive section) ── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-28">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Six worlds. One engine.
        </h2>

        <div className="flex flex-col gap-6 md:flex-row" style={themeVars}>
          {/* Left: Vertical genre tabs */}
          <div className="flex shrink-0 flex-row gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-x-visible">
            {availableGenres.map((entry) => {
              const config = getGenreConfig(entry.id)
              const isActive = entry.id === activeGenre
              return (
                <button
                  key={entry.id}
                  onClick={() => { setActiveGenre(entry.id); setSelectedAction(null) }}
                  className={`group flex shrink-0 flex-col rounded-lg border p-3 text-left transition-all md:p-4 ${
                    isActive
                      ? 'border-[var(--preview-primary)] bg-card/50'
                      : 'border-border/10 bg-card/20 hover:bg-card/30'
                  }`}
                  style={isActive ? { borderColor: config.theme.primary } : undefined}
                >
                  <span
                    className="text-sm font-bold transition-colors"
                    style={{ color: isActive ? config.theme.primary : undefined, fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {config.name}
                  </span>
                  <span className={`mt-0.5 text-xs italic leading-tight ${
                    isActive ? 'text-foreground/60' : 'text-muted-foreground/60'
                  } hidden md:block`}>
                    {config.tagline}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right: Content area */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {/* Species + Classes */}
            <div className="grid gap-4">
              {/* Species — horizontal scroll with portrait cards (matches character wizard) */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-px" style={{ backgroundColor: activeConfig.theme.primary, opacity: 0.3 }} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: activeConfig.theme.primary }}>
                    {activeConfig.speciesLabel}
                  </span>
                </div>
                <div className="flex items-start gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
                  {activeConfig.species.map((s) => (
                    <div key={s.id} className="snap-start min-w-[140px] w-[140px] shrink-0 text-left">
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2 border border-border/10">
                        <Image
                          src={`/portraits/${activeGenre}/${s.id}.png`}
                          alt={s.name}
                          fill
                          className="object-cover"
                          sizes="140px"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background/80 to-transparent">
                          <p className="text-[10px] font-bold tracking-wide uppercase text-foreground">{s.name}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed px-0.5">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classes — grid cards (matches character wizard) */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-px" style={{ backgroundColor: activeConfig.theme.primary, opacity: 0.3 }} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: activeConfig.theme.primary }}>
                    Classes
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {activeConfig.classes.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-1 rounded-xl border border-border/15 bg-secondary/5 p-3.5 text-left"
                    >
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground leading-snug">{c.concept}</div>
                      <div className="mt-1 font-mono text-[10px]" style={{ color: activeConfig.theme.primary }}>{c.primaryStat}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gameplay preview — themed to active genre */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-px" style={{ backgroundColor: activeConfig.theme.primary, opacity: 0.3 }} />
                <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: activeConfig.theme.primary }}>
                  Gameplay Preview
                </span>
              </div>

              <div
                className="overflow-hidden rounded-xl border border-border/10 bg-card/40 transition-colors"
                style={{
                  borderTopWidth: 2,
                  borderTopColor: activeConfig.theme.primary,
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
                        className={`rounded-lg border px-4 py-2.5 text-xs text-left transition-all ${
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
                  <div className="mx-1.5 rounded-lg p-2" style={{ backgroundColor: `color-mix(in oklch, ${activeConfig.theme.primary} 40%, transparent)` }}>
                    <Send className="h-3.5 w-3.5 text-primary-foreground/70" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Burger Menu Showcase ── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-28">
        <h2 className="mb-3 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Everything at your fingertips.
        </h2>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Character sheet, NPCs, tension clocks, promises, ship systems — one slide away.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Character panel — matches real burger menu */}
          <div className="rounded-xl border border-border/15 bg-background/95 backdrop-blur-xl p-5 flex flex-col gap-5 text-sm">
            {/* Tab bar */}
            <div className="flex gap-4 overflow-x-auto border-b border-border/10 pb-2">
              {['Character', 'Ship', 'World', 'Chapters'].map((tab, i) => (
                <span key={tab} className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] ${i === 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            {/* Header */}
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{demoCharacter.name}</h3>
              <p className="mt-0.5 text-sm text-foreground/50">
                {demoCharacter.species} {demoCharacter.class} · Level {demoCharacter.level}
              </p>
            </div>

            {/* Vitals — key-value rows */}
            <div className="flex flex-col">
              {[
                { label: 'HP', value: `${demoCharacter.hp.current} / ${demoCharacter.hp.max}` },
                { label: 'AC', value: String(demoCharacter.ac) },
                { label: 'Credits', value: `${demoCharacter.credits}` },
                { label: 'Inspiration', value: '◇ —' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border/8 py-2 last:border-0">
                  <span className="text-sm text-foreground/40 capitalize">{row.label}</span>
                  <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Stats — terminal cards in 3-col grid */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Stats</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(demoCharacter.stats).map(([stat, value]) => {
                  const mod = Math.floor((value - 10) / 2)
                  const isPrimary = stat === 'DEX'
                  return (
                    <div key={stat} className={`rounded-lg border p-2 text-center ${isPrimary ? 'border-primary/30 bg-primary/8' : 'border-border/10 bg-secondary/5'}`}>
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

            {/* Trait */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Class Trait</h4>
              </div>
              <div className="border-l-2 border-primary/30 pl-3">
                <div className="text-sm font-medium text-primary">{demoCharacter.trait}</div>
                <div className="mt-1 text-xs text-foreground/50 leading-relaxed">Once per day, when caught or cornered, one contraband item goes undetected.</div>
              </div>
            </div>
          </div>

          {/* World panel — matches real burger menu */}
          <div className="rounded-xl border border-border/15 bg-background/95 backdrop-blur-xl p-5 flex flex-col gap-5 text-sm">
            {/* Tab bar — same as character panel top tabs */}
            <div className="flex gap-4 overflow-x-auto border-b border-border/10 pb-2">
              {['Character', 'Ship', 'World', 'Chapters'].map((tab, i) => (
                <span key={tab} className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] ${i === 2 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            {/* Subtab toggle */}
            <div className="flex gap-4">
              {['People', 'Narrative', 'Locations'].map((tab, i) => (
                <span key={tab} className={`text-[10px] font-medium uppercase tracking-[0.15em] pb-1 ${i === 0 ? 'text-primary border-b border-primary/40' : 'text-muted-foreground/40'}`}>
                  {tab}
                </span>
              ))}
            </div>

            {/* Companions — primary-tinted card */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Companions</h4>
              </div>
              <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5">
                <div className="font-medium text-foreground">Rix</div>
                <div className="text-xs text-foreground/60">Vrynn mechanic. Sarcastic but loyal.</div>
              </div>
            </div>

            {/* Known NPCs — neutral cards */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Known NPCs</h4>
              </div>
              <div className="flex flex-col gap-2">
                {demoNpcs.map((npc) => (
                  <div key={npc.name} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{npc.name}</div>
                    <div className="text-xs text-foreground/60">{npc.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Antagonist — destructive-tinted */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-px bg-primary/40" />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Antagonist</h4>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <div className="font-medium text-foreground">The Broker</div>
                <div className="text-xs text-foreground/60">Controls Orja-9&apos;s black market. Knows you&apos;re here.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mechanics ── */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-28">
        <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Not a chatbot wearing a fantasy hat.
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'D20 Rules Engine', text: 'Real ability scores, proficiency checks, advantage/disadvantage. Every roll matters — and you see the math.' },
            { label: 'Persistent Worlds', text: 'NPCs remember. Promises track. Your ship upgrades between chapters. Crew loyalty shifts based on your choices.' },
            { label: 'AI Game Master', text: 'Powered by Claude. Adapts difficulty to your play style. Enforces its own rules. Will absolutely let you fail.' },
          ].map((feature) => (
            <div key={feature.label} className="rounded-lg border border-border/10 bg-card/30 p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">{feature.label}</span>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="flex flex-col items-center border-t border-border/10 px-6 py-24 text-center">
        <h2
          className="font-heading text-4xl font-bold tracking-tight md:text-5xl"
          style={{ textShadow: '0 0 30px oklch(0.72 0.15 195 / 0.3)' }}
        >
          Your story is waiting.
        </h2>
        <a
          href="/play"
          className="mt-10 rounded-full bg-primary px-10 py-4 font-heading text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_25px_-3px] hover:shadow-primary/40"
        >
          Start your campaign
        </a>
        <p className="mt-6 max-w-sm font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Just a good game. Built by one person with Claude Code.
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between border-t border-border/10 px-6 py-8 text-muted-foreground/60">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em]">Storyforge</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em]">Made with Claude</span>
      </footer>
    </div>
  )
}
