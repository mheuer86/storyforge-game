'use client'

// Static full-shell design preview. Mock data only: no SF2 engine wiring.
// Route: /design/play

import { useEffect } from 'react'
import { Activity, Database, Menu, Send } from 'lucide-react'

const RAIL_IDLE_CLASS = 'opacity-85 saturate-[.92]'
const RAIL_ACTIVE_CLASS = 'hover:opacity-100 hover:saturate-100 focus-within:opacity-100 focus-within:saturate-100'

type DiffTone = 'loss' | 'gain' | 'change'
type RollState = 'pending' | 'resolved'
type Tier = 'load-bearing' | 'evidenced' | 'lead'

type DiffItem = {
  label: string
  delta: string
  tone: DiffTone
}

type Slot = {
  number: string
  name: string
  status: string
  state: 'ready' | 'limited' | 'live' | 'spent'
}

type Location = {
  name: string
  tag: string
  current?: boolean
  locked?: boolean
}

type Npc = {
  name: string
  tag: string
  tone: 'good' | 'bad' | 'faint'
  distant?: boolean
}

type Clue = {
  text: string
  new?: boolean
}

type Thread = {
  title: string
  tier: Tier
  clues: Clue[]
}

type RollCardProps = {
  state: RollState
  title?: string
  dc?: string
  modifier?: string
  modifierValue?: string
  prompt?: string
  result?: string
  roll?: string
  total?: string
  dcValue?: string
  outcome?: 'critical' | 'success' | 'failure' | 'fumble'
}

const QUICK_SLOTS: Slot[] = [
  { number: '01', name: 'Pulse Cutter', status: '1-use', state: 'limited' },
  { number: '02', name: 'Memetic Damp.', status: 'ready', state: 'ready' },
  { number: '03', name: 'Stim - Tier 2', status: '2/3', state: 'ready' },
  { number: '04', name: 'Cipher Spike', status: 'live', state: 'live' },
]

const LOCATIONS: Location[] = [
  { name: 'Hangar Bay 3', tag: 'lume strips pulsing, slow blue', current: true },
  { name: 'Maintenance Corridor', tag: 'red sweep recurring across the pressure doors' },
  { name: 'Lift A', tag: 'core-deck access', locked: true },
  { name: 'Crew Compartment', tag: 'voices, very close' },
  { name: 'Engineering Spline', tag: 'hostage cluster, thermal ghosts' },
]

const NPCS: Npc[] = [
  { name: 'CDR. Aysu', tag: 'allied · wary', tone: 'good' },
  { name: 'HELIA', tag: 'hostile · core', tone: 'bad', distant: true },
  { name: 'Tessil-3', tag: 'cargo droid', tone: 'faint' },
  { name: 'Vance Echo', tag: 'cartel trace', tone: 'bad', distant: true },
]

const THREADS: Thread[] = [
  {
    title: 'THE INTAKE PROBLEM',
    tier: 'load-bearing',
    clues: [
      { text: 'Bay-3 lockout uses Cartel handshake' },
      { text: 'Hostages clustered near Engineering behind a load-bearing coolant spine', new: true },
      { text: 'Aysu has the fallback authorization codes' },
    ],
  },
  {
    title: "HELIA'S DECAY",
    tier: 'evidenced',
    clues: [
      { text: 'Signal pulses on a 4.2s cycle' },
      { text: 'Memetic damper bursts buy about nine seconds of clean spectrum' },
      { text: "She's been talking to herself in the comms log" },
    ],
  },
  {
    title: 'CARTEL FALLOUT',
    tier: 'lead',
    clues: [
      { text: "Vance's people know Vess is on the station" },
      { text: 'Old Drift War ciphers still pass through the outer access lift' },
    ],
  },
  {
    title: 'THE MISSING CARGO',
    tier: 'lead',
    clues: [
      { text: "One pod's manifest serial does not match" },
      { text: 'Heat signature wrong: that pod is occupied', new: true },
    ],
  },
]

const TURN_13_DIFF: DiffItem[] = [
  { label: '+Intel', delta: 'Bay-3 lockout uses Cartel handshake', tone: 'gain' },
  { label: 'Thread', delta: 'HELIA pulse cycle evidenced', tone: 'gain' },
  { label: 'Clock', delta: 'HELIA sweep 2/4', tone: 'change' },
]

const TURN_11_DIFF: DiffItem[] = [
  { label: 'Clock', delta: 'HELIA sweep 1/4', tone: 'loss' },
  { label: 'Aysu', delta: 'position exposed', tone: 'loss' },
  { label: '+Intel', delta: 'Lift A listens for old ciphers', tone: 'gain' },
]

const ACTIONS = [
  { label: 'SLICING', tone: 'tech', text: 'Slice the bay door open before HELIA pings the lock' },
  { label: 'STEALTH', tone: 'skill', text: 'Hand-signal Aysu to flank along the cargo line' },
  { label: 'PERCEPTION', tone: 'sense', text: 'Hold position and watch the cycle for one more pulse' },
  { label: 'RESOURCE', tone: 'resource', text: 'Burn a Cipher Spike - ghost the door entirely' },
]

const STRESS_ACTIONS = [
  { label: 'INSIGHT', tone: 'sense', text: 'Ask Aysu whether the hostage cluster is bait before committing the whole breach plan' },
  { label: 'RESOURCE', tone: 'resource', text: 'Use the memetic damper now and accept that the next HELIA pulse may come blind' },
  { label: 'TACTICS', tone: 'skill', text: 'Mark the Maintenance Corridor as fallback and move Tessil-3 into the access shadow' },
]

function GenreTheme({ genre }: { genre: string }) {
  useEffect(() => {
    document.body.setAttribute('data-genre', genre)
    return () => {
      document.body.removeAttribute('data-genre')
    }
  }, [genre])
  return null
}

function toneClass(tone: DiffTone) {
  if (tone === 'loss') return 'text-destructive'
  if (tone === 'gain') return 'text-success'
  return 'text-muted-foreground'
}

function npcDotClass(tone: Npc['tone']) {
  if (tone === 'good') return 'bg-success shadow-[0_0_12px_-2px] shadow-success'
  if (tone === 'bad') return 'bg-destructive shadow-[0_0_12px_-2px] shadow-destructive'
  return 'bg-muted-foreground/50'
}

function tierColorClass(tier: Tier) {
  if (tier === 'load-bearing') return 'text-primary'
  if (tier === 'evidenced') return 'text-success'
  return 'text-muted-foreground'
}

function actionToneClass(tone: string) {
  if (tone === 'tech') return 'border-primary/50 bg-primary/10 text-primary'
  if (tone === 'sense') return 'border-success/50 bg-success/10 text-success'
  if (tone === 'resource') return 'border-warning/50 bg-warning/10 text-warning'
  return 'border-muted-foreground/40 bg-muted/30 text-muted-foreground'
}

function slotStateClass(state: Slot['state']) {
  if (state === 'live') return 'border-primary/70 bg-primary/14 shadow-[inset_0_0_18px_-14px] shadow-primary text-primary'
  if (state === 'limited') return 'border-warning/55 bg-warning/10 text-warning'
  if (state === 'spent') return 'border-border/40 bg-background/30 text-muted-foreground/55 opacity-60'
  return 'border-border/55 bg-background/55 text-foreground'
}

function TopBar() {
  return (
    <header className="grid grid-cols-[390px_minmax(760px,1fr)_420px] gap-5 px-5 pt-4 pb-3">
      <div className="flex items-center rounded-lg border border-primary/30 bg-card/35 px-5 py-2.5 shadow-[0_0_24px_-12px] shadow-primary">
        <span className="font-mono text-[12px] tracking-[0.32em] text-primary uppercase">Storyforge</span>
      </div>
      <div className="grid grid-cols-[120px_minmax(0,1fr)_120px] items-center rounded-lg border border-border/70 bg-card/55 px-5 py-2.5 shadow-[0_0_28px_-18px] shadow-primary">
        <span className="justify-self-start font-mono text-[10px] tracking-[0.24em] uppercase text-muted-foreground/60">Ch.02</span>
        <span className="justify-self-center font-mono text-[14px] tracking-[0.28em] uppercase text-foreground">The Quiet Mutiny</span>
        <span className="justify-self-end font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/55">Turn 14</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-border/45 bg-card/30 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground xl:flex">
          <Database className="h-3.5 w-3.5 text-primary/70" />
          Diagnostics in menu
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-end gap-2 rounded-lg border border-border/60 bg-card/35 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>
      </div>
    </header>
  )
}

function HUDPanel({
  title,
  right,
  children,
  fill,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
  fill?: boolean
}) {
  return (
    <section
      className={[
        'rounded-lg border border-border/35 bg-card/38 backdrop-blur-md p-4 flex flex-col shadow-[0_0_24px_-20px] shadow-primary',
        fill ? 'flex-1 min-h-0' : '',
      ].join(' ')}
    >
      <div className="mb-3 flex min-h-[16px] shrink-0 items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">{title}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function OperativePanel() {
  return (
    <HUDPanel title="Operative" right={<span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">LV·4</span>}>
      <div className="space-y-4">
        <div>
          <div className="font-mono text-[18px] uppercase tracking-[0.12em] text-foreground">K. Vess</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">Voidwright · ex-Cartel</div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-3">
          {[
            ['24/30', 'HP'],
            ['12/12', 'SHLD'],
            ['180', 'CRED'],
            ['2', '◇'],
          ].map(([value, label]) => (
            <div key={label} className="min-w-0 text-center">
              <div className={['font-mono text-[20px] tracking-[0.01em]', label === '◇' ? 'text-warning/85' : 'text-foreground'].join(' ')}>
                {value}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">{label}</div>
            </div>
          ))}
        </div>
        <div className="h-1 overflow-hidden rounded-full border border-border/30 bg-background/60">
          <div className="h-full w-[81%] bg-primary/55 shadow-[0_0_14px_0] shadow-primary/30" />
        </div>
      </div>
    </HUDPanel>
  )
}

function OpsPlanPanel() {
  return (
    <HUDPanel
      title="Ops Plan"
      right={
        <span className="rounded-full border border-primary/40 px-2.5 py-0.5 font-mono text-[10px] lowercase tracking-[0.18em] text-primary/85">
          active
        </span>
      }
    >
      <div className="space-y-3">
        <div className="font-mono text-[13px] uppercase tracking-[0.18em] text-foreground/85">Breach Obelisk Core</div>
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[12.5px] leading-relaxed">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">Target</div>
          <div className="text-foreground/85">HELIA, in the core deck</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">Approach</div>
          <div className="text-foreground/85">Slice Bay-3 with the old Cartel cipher, advance up Lift A</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">Fallback</div>
          <div className="text-foreground/65">Pull back to Maintenance Corridor and hard-burn the lift</div>
        </div>
      </div>
    </HUDPanel>
  )
}

function QuickSlotsPanel() {
  return (
    <HUDPanel
      title="Quick Slots"
      right={<span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">1-4</span>}
    >
      <div className="grid grid-cols-2 gap-2">
        {QUICK_SLOTS.map((slot) => (
          <div
            key={slot.number}
            className={['min-h-[72px] rounded-md border p-3 transition-colors', slotStateClass(slot.state)].join(' ')}
          >
            <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/60">{slot.number}</div>
            <div className="mt-1 text-[12.5px] leading-snug text-foreground/90">{slot.name}</div>
            <div className="mt-1 inline-flex rounded border border-current/25 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">
              {slot.status}
            </div>
          </div>
        ))}
      </div>
    </HUDPanel>
  )
}

function PressurePanel() {
  return (
    <HUDPanel
      title="Pressure"
      right={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/45 bg-warning/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
          <Activity className="h-3 w-3" />
          step 2/4
        </span>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-foreground/90">HELIA hardens the station against rescue</div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground/85">
            Current face: core intelligence using old Cartel protocols.
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((step) => (
            <div
              key={step}
              className={[
                'h-1.5 rounded-full border',
                step < 2 ? 'border-warning/50 bg-warning/65 shadow-[0_0_12px_-4px] shadow-warning' : 'border-border/50 bg-background/60',
              ].join(' ')}
            />
          ))}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/75">Close readiness: not yet · spine unresolved</div>
      </div>
    </HUDPanel>
  )
}

function LocationsPanel() {
  return (
    <HUDPanel
      title="Locations"
      right={<span className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">● live</span>}
    >
      <div className="flex flex-col gap-1">
        {LOCATIONS.map((loc) => (
          <div
            key={loc.name}
            className={[
              'flex items-start gap-3 rounded-md border px-2.5 py-2',
              loc.current ? 'border-primary/45 bg-primary/10' : 'border-transparent',
              loc.locked ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span className={['mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', loc.current ? 'bg-primary' : 'bg-muted-foreground/35'].join(' ')} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[13.5px] leading-tight text-foreground/90">{loc.name}</span>
                {loc.current && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Here</span>}
                {loc.locked && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Locked</span>}
              </div>
              <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground/80">{loc.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </HUDPanel>
  )
}

function PresentPanel() {
  return (
    <HUDPanel title="Present">
      <div className="flex flex-col gap-2.5">
        {NPCS.map((npc) => (
          <div key={npc.name} className={['flex items-center gap-3', npc.distant ? 'opacity-65' : ''].join(' ')}>
            <span className={['h-1.5 w-1.5 shrink-0 rounded-full', npcDotClass(npc.tone)].join(' ')} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground/90">{npc.name}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">{npc.tag}</span>
          </div>
        ))}
      </div>
    </HUDPanel>
  )
}

function IntelPanel() {
  const newCount = THREADS.reduce((acc, thread) => acc + thread.clues.filter((clue) => clue.new).length, 0)
  return (
    <HUDPanel
      title="Intel · Case Board"
      fill
      right={
        <span className="rounded-full border border-primary/45 bg-primary/10 px-2 py-1 font-mono text-[10.5px] text-primary">
          +{newCount}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {THREADS.map((thread) => (
          <div key={thread.title} className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/85">{thread.title}</span>
              <span className={['font-mono text-[10px] uppercase tracking-[0.2em]', tierColorClass(thread.tier)].join(' ')}>
                · {thread.tier}
              </span>
            </div>
            <div className="space-y-1">
              {thread.clues.map((clue) => (
                <div
                  key={clue.text}
                  className={[
                    'flex gap-2 rounded border px-2 py-1.5 text-[12.5px] leading-snug',
                    clue.new ? 'border-primary/40 bg-primary/10' : 'border-transparent',
                  ].join(' ')}
                >
                  <span className="mt-0.5 text-muted-foreground/50">·</span>
                  <span className="min-w-0 flex-1 text-foreground/85">{clue.text}</span>
                  {clue.new && <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">[new]</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </HUDPanel>
  )
}

function SceneMarker({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/55">
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
      <span>{label}</span>
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
    </div>
  )
}

function GMMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-r-lg border-l border-primary/25 bg-card/35 py-5 pl-6 pr-6 text-foreground shadow-[0_0_20px_-10px] shadow-primary/15"
      style={{ fontFamily: 'var(--font-narrative)', fontSize: '15px', lineHeight: 1.65 }}
    >
      {children}
    </div>
  )
}

function PlayerMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ml-auto max-w-[82%] rounded-l-lg border-r border-primary/35 bg-primary/15 py-4 pl-6 pr-6 text-foreground shadow-[0_0_22px_-10px] shadow-primary/20"
      style={{ fontFamily: 'var(--font-narrative)', fontSize: '15px', lineHeight: 1.65 }}
    >
      {children}
    </div>
  )
}

function RollCard({
  state,
  title = 'Slicing Check',
  dc = 'DC 14',
  modifier = 'INT +4',
  modifierValue = '+4',
  prompt = "Reach into the bay door's handshake chip and feed it the old Cartel cipher.",
  result = 'd20 15 + 4 = 19 vs DC 14',
  roll = '15',
  total = '19',
  dcValue = 'DC 14',
  outcome = 'success',
}: RollCardProps) {
  const resolved = state === 'resolved'
  const isBad = outcome === 'failure' || outcome === 'fumble'
  const isCrit = outcome === 'critical'
  const outcomeLabel = isCrit ? 'critical' : outcome
  const outcomeTextClass = isCrit ? 'text-warning' : isBad ? 'text-destructive' : 'text-success'
  const outcomeBorderClass = isCrit
    ? 'border-warning/45 bg-warning/10 shadow-warning/15'
    : isBad
      ? 'border-destructive/45 bg-destructive/10 shadow-destructive/15'
      : 'border-success/45 bg-success/10 shadow-success/15'
  const outcomeLineClass = isCrit ? 'bg-warning/45' : isBad ? 'bg-destructive/45' : 'bg-success/45'
  const outcomeDotClass = isCrit
    ? 'bg-warning shadow-warning/40'
    : isBad
      ? 'bg-destructive shadow-destructive/40'
      : 'bg-success shadow-success/40'
  const playerFormulaTileClass = isCrit
    ? 'border-warning/55 bg-warning/10 text-warning'
    : isBad
      ? 'border-destructive/55 bg-destructive/10 text-destructive'
      : 'border-success/55 bg-success/10 text-success'
  const dcFormulaTileClass = isBad
    ? 'border-destructive/55 bg-destructive/10 text-destructive'
    : 'border-muted-foreground/30 bg-background/40 text-muted-foreground/70'
  const formulaTileClass = 'flex h-9 w-14 items-center justify-center rounded border font-mono text-[15px] font-bold leading-none'

  if (resolved) {
    return (
      <div className={['border-y px-7 py-4 shadow-[0_0_28px_-20px]', outcomeBorderClass].join(' ')}>
        <div className="space-y-3 text-center">
          <div className={['flex items-center gap-4 font-mono text-[12px] uppercase tracking-[0.28em]', outcomeTextClass].join(' ')}>
            <span className={['h-px flex-1', outcomeLineClass].join(' ')} />
            <span className={['h-1.5 w-1.5 rounded-full shadow-[0_0_12px_2px]', outcomeDotClass].join(' ')} />
            <span className="whitespace-nowrap">{title}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="whitespace-nowrap font-bold">{outcomeLabel}</span>
            <span className={['h-1.5 w-1.5 rounded-full shadow-[0_0_12px_2px]', outcomeDotClass].join(' ')} />
            <span className={['h-px flex-1', outcomeLineClass].join(' ')} />
          </div>
          <p className="mx-auto max-w-[780px] text-[14px] italic leading-relaxed text-foreground/72" style={{ fontFamily: 'var(--font-narrative)' }}>
            {prompt}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[12px] tracking-[0.08em]">
            <span className={[formulaTileClass, playerFormulaTileClass].join(' ')}>
              {roll}
            </span>
            <span className={[formulaTileClass, playerFormulaTileClass].join(' ')}>
              {modifierValue}
            </span>
            <span className="text-muted-foreground/55">=</span>
            <span className={[formulaTileClass, playerFormulaTileClass].join(' ')}>
              {total}
            </span>
            <span className="text-muted-foreground/55">vs.</span>
            <span className={[formulaTileClass, 'w-20', dcFormulaTileClass].join(' ')}>
              {dcValue}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-y border-primary/25 bg-background/20 px-7 py-4 shadow-[0_0_28px_-20px] shadow-primary">
      <div className="space-y-3 text-center">
        <div className="flex items-center gap-4 font-mono text-[12px] uppercase tracking-[0.28em] text-primary">
          <span className="h-px flex-1 bg-primary/35" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/40" />
          <span className="whitespace-nowrap">{title}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="whitespace-nowrap">{dc}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="whitespace-nowrap">{modifier}</span>
          {resolved && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-success">success</span>
            </>
          )}
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/40" />
          <span className="h-px flex-1 bg-primary/35" />
        </div>
        <p className="mx-auto max-w-[780px] text-[14px] italic leading-relaxed text-foreground/70" style={{ fontFamily: 'var(--font-narrative)' }}>
          {prompt}
        </p>
        <div>
          {resolved ? (
            <span className="font-mono text-[12px] tracking-[0.08em] text-success">{result}</span>
          ) : (
            <button
              type="button"
              className="rounded-full border border-primary/75 px-8 py-2 font-mono text-[12px] uppercase tracking-[0.26em] text-primary shadow-[0_0_18px_-10px] shadow-primary transition-colors hover:bg-primary/10 hover:text-foreground"
            >
              Tap to roll
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StateDiffLine({ turn, items }: { turn: number; items: DiffItem[] }) {
  return (
    <div className="font-mono text-[11px] leading-relaxed py-3 opacity-65">
      <span className="text-muted-foreground">turn {turn} -</span>{' '}
      {items.map((item, i) => (
        <span key={`${item.label}-${item.delta}`}>
          <span className="text-muted-foreground">{item.label}</span>{' '}
          <span className={toneClass(item.tone)}>{item.delta}</span>
          {i < items.length - 1 && <span className="mx-1.5 text-muted-foreground/60">·</span>}
        </span>
      ))}
    </div>
  )
}

function ActionList({ disabled = false, stress = false }: { disabled?: boolean; stress?: boolean }) {
  const actions = stress ? STRESS_ACTIONS : ACTIONS
  return (
    <div className={['space-y-1.5', disabled ? 'pointer-events-none opacity-45 saturate-50' : ''].join(' ')}>
      {actions.map((action) => (
        <button
          key={action.text}
          type="button"
          disabled={disabled}
          className="grid w-full grid-cols-[92px_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border/85 bg-card/75 px-5 py-2 text-left shadow-[0_0_16px_-14px] shadow-primary transition-colors hover:border-primary/55 hover:bg-primary/10"
        >
          <span className={['rounded border px-2 py-1 text-center font-mono text-[9px] uppercase tracking-[0.12em]', actionToneClass(action.tone)].join(' ')}>
            {action.label}
          </span>
          <span className="text-[13.5px] leading-snug text-foreground">{action.text}</span>
        </button>
      ))}
    </div>
  )
}

function CommandInput({ disabled = false }: { disabled?: boolean }) {
  return (
    <div
      className={[
        'flex items-end gap-3 rounded-lg border bg-card/72 px-5 py-2.5 shadow-[0_0_22px_-14px] shadow-primary',
        disabled ? 'border-border/55 opacity-55' : 'border-primary/45 focus-within:border-primary/80',
      ].join(' ')}
    >
      <span className="pb-1.5 font-mono text-[13px] text-primary">▸</span>
      <textarea
        rows={1}
        disabled={disabled}
        defaultValue=""
        placeholder={disabled ? 'Resolve the check before acting again...' : 'Type an action or / for commands...'}
        className="min-h-8 flex-1 resize-none bg-transparent py-1.5 font-mono text-[13px] leading-snug text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <button
        type="button"
        disabled={disabled}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/45 bg-primary/15 text-primary transition-colors hover:bg-primary/30 hover:text-foreground"
        aria-label="Submit command"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}

function PlaySurface() {
  return (
    <main className="flex min-h-0 rounded-xl border border-border/55 bg-background/66 px-12 py-5 shadow-[0_0_34px_-22px] shadow-primary">
      <div className="flex min-h-0 w-full flex-col">
        <section className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto max-w-[1000px] space-y-6">
          <SceneMarker label="OBELISK-9 · HANGAR BAY 3 · GRAVITY NOMINAL · TURN 11" />
          <div className="space-y-6">
            <GMMessage>
              <p>
                Aysu points toward Lift A, where the service lights blink in a pattern too regular to be random. The access plate is half-open, its wire bundle breathing cold vapor into the corridor.
              </p>
            </GMMessage>
            <PlayerMessage>
              I try to ghost across the open stripe before the sweep turns back.
            </PlayerMessage>
            <RollCard
              state="resolved"
              title="Stealth Check"
              dc="DC 14"
              dcValue="DC 14"
              modifier="DEX +2"
              modifierValue="+2"
              prompt="Cross the lit gap before HELIA's sensor sweep returns."
              roll="4"
              total="6"
              outcome="failure"
            />
            <GMMessage>
              <p>
                The floor light snaps white under Vess's boot. Somewhere inside the lift casing, a relay clicks awake, and the door remembers there is someone here to measure.
              </p>
            </GMMessage>
            <StateDiffLine turn={11} items={TURN_11_DIFF} />
            <SceneMarker label="TURN 12 · RECOVERY" />
            <GMMessage>
              <p>
                The maintenance corridor narrows into a throat of coolant pipes and shuttered cargo slits. Tessil-3 rolls ahead, one manipulator raised in apology, while Aysu marks the patrol sweep with two fingers against the wall.
              </p>
            </GMMessage>
            <PlayerMessage>
              I let Tessil take the lead and watch for the first place HELIA's cycle repeats.
            </PlayerMessage>
            <RollCard
              state="resolved"
              title="Perception Check"
              dc="DC 13"
              dcValue="DC 13"
              modifier="WIS +3"
              modifierValue="+3"
              prompt="Hold still long enough to read the pulse without letting HELIA read you back."
              result="d20 12 + 3 = 15 vs DC 13"
              roll="12"
              total="15"
              outcome="success"
            />
            <GMMessage>
              <p>
                The repeat comes as a blue stutter across the bay doors: four beats, a silent gap, then the lock panel wakes just long enough to accept a handshake. Old Cartel work, hidden under station paint.
              </p>
            </GMMessage>
            <StateDiffLine turn={13} items={TURN_13_DIFF} />
            <SceneMarker label="TURN 14 · PLAYER COMMITMENT" />
            <GMMessage>
              <p>
                The bay's emergency lume strips pulse a slow, sick blue - HELIA's signature. Aysu crouches beside a stack of sealed cryo-pods, fingertips on her sidearm, eyes flicking between the door's handshake panel and the dark slit of the access lift. <em>"Four-point-two seconds,"</em> she breathes. <em>"That's the cycle."</em>
              </p>
            </GMMessage>
            <PlayerMessage>
              I take the panel. Old Cartel cipher first - if she's running anything older than the Drift War, it'll bite.
            </PlayerMessage>
          </div>
        </div>
        </section>
        <div className="mx-auto mt-2.5 w-full max-w-[1000px] shrink-0 space-y-1.5">
          <RollCard state="pending" />
          <div className="rounded-lg border border-primary/35 bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Check pending · suggested actions return after the roll resolves
          </div>
          <CommandInput disabled />
        </div>
      </div>
    </main>
  )
}

export default function PlayDesignPreviewPage() {
  return (
    <>
      <GenreTheme genre="space-opera" />
      <div className="h-screen overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_18%,oklch(0.72_0.15_195_/_0.07),transparent_34%),linear-gradient(90deg,transparent,oklch(0.72_0.15_195_/_0.03),transparent)]" />
        <div className="relative flex h-full min-w-[1440px] flex-col">
          <TopBar />
          <div className="grid min-h-0 flex-1 grid-cols-[390px_minmax(760px,1fr)_420px] gap-5 px-5 pb-8">
            <aside className={['sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-3 transition-all duration-300', RAIL_IDLE_CLASS, RAIL_ACTIVE_CLASS].join(' ')}>
              <OperativePanel />
              <OpsPlanPanel />
              <QuickSlotsPanel />
            </aside>

            <PlaySurface />

            <aside className={['sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-3 transition-all duration-300', RAIL_IDLE_CLASS, RAIL_ACTIVE_CLASS].join(' ')}>
              <LocationsPanel />
              <PresentPanel />
              <PressurePanel />
              <IntelPanel />
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
