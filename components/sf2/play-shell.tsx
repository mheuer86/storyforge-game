'use client'

import {
  Activity,
  BookOpen,
  Dices,
  FileDown,
  Map as MapIcon,
  Menu,
  RotateCcw,
  ScrollText,
  Send,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { applyGenreTheme, getGenreConfig, type Genre } from '@/lib/genre-config'
import type { computeSessionSummary } from '@/lib/sf2/instrumentation/session-summary'
import type { Sf2State, Sf2TurnDiffEntry } from '@/lib/sf2/types'

type SessionSummary = NonNullable<ReturnType<typeof computeSessionSummary>>
type DebugEntryView = { kind: string; at: number; data: unknown }
type TokenUsageView = {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}
type StatLabels = { hp: string; defense: string; currency: string; inspiration: string }

const desktopRailClassName = cn(
  'hidden min-h-0 flex-col gap-3 overflow-y-auto pr-1 xl:flex',
  'opacity-75 brightness-95 saturate-[0.86] transition-[opacity,filter] duration-200 ease-out',
  'hover:opacity-100 hover:brightness-110 hover:saturate-100',
  'focus-within:opacity-100 focus-within:brightness-110 focus-within:saturate-100',
)

const ambientOverlayStyle = {
  background: [
    'radial-gradient(circle at 18% 0%, color-mix(in oklch, var(--accent) 18%, transparent), transparent 30%)',
    'radial-gradient(circle at 82% 10%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 28%)',
    'linear-gradient(90deg, transparent, color-mix(in oklch, var(--tertiary) 7%, transparent), transparent)',
  ].join(', '),
} satisfies CSSProperties

export interface Sf2PendingCheckView {
  skill: string
  dc: number
  why: string
  consequenceOnFail: string
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
}

export interface Sf2RollOutcomeView {
  d20: number
  rawRolls?: number[]
  modifier: number
  total: number
  dc: number
  effectiveDc?: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  skill?: string
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  inspirationSpent?: boolean
  originalRoll?: Sf2RollOutcomeView
}

export interface Sf2CloseReadinessView {
  closeReady: boolean
  chapterPivotSignaled: boolean
  spineResolved: boolean
  stalledFallback: boolean
  ladderFiredCount: number
  ladderStepCount: number
  spineStatus?: string
  spineTension: number
  successorRequired: boolean
  promotedSpineThreadId?: string
}

export interface Sf2CampaignStatsView {
  npcs: number
  threads: number
  decisions: number
  promises: number
  clues: number
}

interface Sf2PlayShellProps {
  state: Sf2State
  scrollRef: RefObject<HTMLDivElement | null>
  prose: string
  suggestedActions: string[]
  pendingInput: string
  pendingCheck: Sf2PendingCheckView | null
  rollResult: Sf2RollOutcomeView | null
  inspirationOffer: Sf2RollOutcomeView | null
  rollModifier: number | null
  effectiveDc: number | null
  inspirationRemaining: number
  isStreaming: boolean
  isArchiving: boolean
  isGeneratingChapter: boolean
  generationElapsed: number
  busy: boolean
  chapterTurnCount: number
  closeReadiness: Sf2CloseReadinessView
  campaignStats: Sf2CampaignStatsView
  sessionSummary: SessionSummary | null
  debug: DebugEntryView[]
  lastNarratorUsage: TokenUsageView | null
  lastArchivistUsage: TokenUsageView | null
  onPendingInputChange: (value: string) => void
  onSendTurn: (input: string) => void
  onResolvePendingCheck: () => void
  onSpendInspiration: () => void
  onDeclineInspiration: () => void
  onCloseChapter: () => void
  onResetCampaign: () => void
  onDownloadSessionLog: () => void
  onDownloadReplayFixture: () => void
}

type MobilePanel = 'character' | 'scene' | 'intel' | 'diagnostics'

const DEFAULT_STAT_LABELS: StatLabels = {
  hp: 'HP',
  defense: 'AC',
  currency: 'Cred',
  inspiration: 'Insp',
}

const THEME_ROOT_PROPS = [
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--border',
  '--input',
  '--ring',
  '--narrative',
  '--meta',
  '--success',
  '--warning',
  '--severe',
  '--title-glow',
  '--action-glow',
  '--action-glow-hover',
  '--scrollbar-thumb',
  '--scrollbar-thumb-hover',
  '--tertiary',
  '--tertiary-foreground',
] as const

const THEME_BODY_PROPS = [
  '--font-narrative',
  '--font-heading',
  '--font-system',
  '--font-scale',
] as const

export function Sf2PlayShell(props: Sf2PlayShellProps) {
  const {
    state,
    scrollRef,
    prose,
    suggestedActions,
    pendingInput,
    pendingCheck,
    rollResult,
    inspirationOffer,
    rollModifier,
    effectiveDc,
    inspirationRemaining,
    isStreaming,
    isArchiving,
    isGeneratingChapter,
    generationElapsed,
    busy,
    chapterTurnCount,
    closeReadiness,
    campaignStats,
    sessionSummary,
    debug,
    lastNarratorUsage,
    lastArchivistUsage,
    onPendingInputChange,
    onSendTurn,
    onResolvePendingCheck,
    onSpendInspiration,
    onDeclineInspiration,
    onCloseChapter,
    onResetCampaign,
    onDownloadSessionLog,
    onDownloadReplayFixture,
  } = props
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const priorRootGenre = root.getAttribute('data-genre')
    const priorBodyGenre = body.getAttribute('data-genre')
    const priorRootProps = new Map(THEME_ROOT_PROPS.map((prop) => [prop, root.style.getPropertyValue(prop)]))
    const priorBodyProps = new Map(THEME_BODY_PROPS.map((prop) => [prop, body.style.getPropertyValue(prop)]))

    try {
      applyGenreTheme(state.meta.genreId as Genre)
    } catch {
      root.setAttribute('data-genre', state.meta.genreId)
    }
    body.setAttribute('data-genre', state.meta.genreId)

    return () => {
      if (priorRootGenre === null) root.removeAttribute('data-genre')
      else root.setAttribute('data-genre', priorRootGenre)
      if (priorBodyGenre === null) body.removeAttribute('data-genre')
      else body.setAttribute('data-genre', priorBodyGenre)
      for (const prop of THEME_ROOT_PROPS) {
        const prior = priorRootProps.get(prop)
        if (prior) root.style.setProperty(prop, prior)
        else root.style.removeProperty(prop)
      }
      for (const prop of THEME_BODY_PROPS) {
        const prior = priorBodyProps.get(prop)
        if (prior) body.style.setProperty(prop, prior)
        else body.style.removeProperty(prop)
      }
    }
  }, [state.meta.genreId])

  const statLabels = useMemo(() => statLabelsForGenre(state.meta.genreId), [state.meta.genreId])

  const rollLogByTurn = useMemo(() => {
    const map = new Map<number, Sf2State['history']['rollLog']>()
    for (const roll of state.history.rollLog) {
      const rolls = map.get(roll.turn) ?? []
      rolls.push(roll)
      map.set(roll.turn, rolls)
    }
    return map
  }, [state.history.rollLog])

  const locationByTurn = useMemo(() => buildLocationByTurn(state), [state])
  const hasActiveRoll = Boolean(pendingCheck || rollResult)
  const mobilePanelTitle = mobilePanel
    ? mobilePanel === 'character'
      ? 'Character'
      : mobilePanel === 'scene'
        ? 'Scene'
        : mobilePanel === 'intel'
          ? 'Intel'
          : 'Diagnostics'
    : ''

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0" style={ambientOverlayStyle} />
      <div className="relative flex h-full min-w-0 flex-col">
        <TopBar
          state={state}
          chapterTurnCount={chapterTurnCount}
          busy={busy}
          onOpenPanel={setMobilePanel}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-3 pb-3 md:px-5 md:pb-5 xl:grid-cols-[minmax(270px,340px)_minmax(620px,1fr)_minmax(300px,360px)]">
          <aside className={desktopRailClassName}>
            <CharacterPanel state={state} statLabels={statLabels} />
            <ObjectivePanel state={state} />
            <QuickSlotsPanel state={state} />
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/55 bg-background/70 shadow-[0_0_34px_-24px] shadow-accent">
            <div
              ref={scrollRef}
              className="sf2-narrative-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6"
            >
              <TurnStream
                state={state}
                prose={prose}
                rollLogByTurn={rollLogByTurn}
                locationByTurn={locationByTurn}
                isStreaming={isStreaming}
                isGeneratingChapter={isGeneratingChapter}
                generationElapsed={generationElapsed}
                isArchiving={isArchiving}
                chapterTurnCount={chapterTurnCount}
              />
            </div>

            <div className="shrink-0 border-t border-border/50 bg-card/70 p-3 shadow-[0_-18px_32px_-30px] shadow-accent md:p-4">
              <ActionSurface
                state={state}
                suggestedActions={suggestedActions}
                pendingInput={pendingInput}
                pendingCheck={pendingCheck}
                rollResult={rollResult}
                inspirationOffer={inspirationOffer}
                rollModifier={rollModifier}
                effectiveDc={effectiveDc}
                inspirationRemaining={inspirationRemaining}
                busy={busy}
                chapterTurnCount={chapterTurnCount}
                closeReadiness={closeReadiness}
                hasActiveRoll={hasActiveRoll}
                onPendingInputChange={onPendingInputChange}
                onSendTurn={onSendTurn}
                onResolvePendingCheck={onResolvePendingCheck}
                onSpendInspiration={onSpendInspiration}
                onDeclineInspiration={onDeclineInspiration}
                onCloseChapter={onCloseChapter}
              />
            </div>
          </main>

          <aside className={desktopRailClassName}>
            <LocationsPanel state={state} />
            <PresentPanel state={state} />
            <IntelPanel state={state} />
          </aside>
        </div>
      </div>

      <Drawer open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)} direction="bottom">
        <DrawerContent className="max-h-[86vh] border-border/50 bg-background/95">
          <DrawerHeader className="border-b border-border/40 pb-3 text-left">
            <DrawerTitle className="font-mono text-sm uppercase tracking-[0.22em] text-primary">
              {mobilePanelTitle}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Mobile Storyforge side panel
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[calc(86vh-5rem)] overflow-y-auto p-4">
            {mobilePanel === 'character' && (
              <div className="space-y-3">
                <CharacterPanel state={state} statLabels={statLabels} />
                <ObjectivePanel state={state} />
                <QuickSlotsPanel state={state} />
              </div>
            )}
            {mobilePanel === 'scene' && (
              <div className="space-y-3">
                <LocationsPanel state={state} />
                <PresentPanel state={state} />
              </div>
            )}
            {mobilePanel === 'intel' && <IntelPanel state={state} />}
            {mobilePanel === 'diagnostics' && (
              <DiagnosticsPanel
                state={state}
                campaignStats={campaignStats}
                sessionSummary={sessionSummary}
                debug={debug}
                lastNarratorUsage={lastNarratorUsage}
                lastArchivistUsage={lastArchivistUsage}
                chapterTurnCount={chapterTurnCount}
                busy={busy}
                closeReadiness={closeReadiness}
                onCloseChapter={onCloseChapter}
                onResetCampaign={onResetCampaign}
                onDownloadSessionLog={onDownloadSessionLog}
                onDownloadReplayFixture={onDownloadReplayFixture}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function TopBar({
  state,
  chapterTurnCount,
  busy,
  onOpenPanel,
}: {
  state: Sf2State
  chapterTurnCount: number
  busy: boolean
  onOpenPanel: (panel: MobilePanel) => void
}) {
  return (
    <header className="shrink-0 px-3 py-3 md:px-5 md:py-4">
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/65 bg-card/70 px-3 py-2.5 shadow-[0_0_28px_-20px] shadow-accent md:px-5">
        <div className="hidden min-w-[210px] items-center sm:flex">
          <span className="font-mono text-[12px] uppercase tracking-[0.32em] text-primary">Storyforge</span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Ch.{String(state.meta.currentChapter).padStart(2, '0')}
          </span>
          <span className="truncate text-center font-mono text-[12px] uppercase tracking-[0.22em] text-foreground md:text-[14px]">
            {state.chapter.title || 'Chapter setup pending'}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Turn {chapterTurnCount}
          </span>
        </div>

        <div className="flex min-w-[52px] items-center justify-end sm:min-w-[210px]">
          <button
            type="button"
            onClick={() => onOpenPanel('diagnostics')}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-md px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 sm:px-3',
              busy ? 'text-warning hover:text-warning' : 'text-muted-foreground',
            )}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">{busy ? 'Syncing' : 'Menu'}</span>
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 xl:hidden">
        <MobilePanelButton label="PC" icon={<UserRound className="h-4 w-4" />} onClick={() => onOpenPanel('character')} />
        <MobilePanelButton label="Scene" icon={<MapIcon className="h-4 w-4" />} onClick={() => onOpenPanel('scene')} />
        <MobilePanelButton label="Intel" icon={<BookOpen className="h-4 w-4" />} onClick={() => onOpenPanel('intel')} />
      </div>
    </header>
  )
}

function MobilePanelButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 min-w-10 items-center justify-center rounded-md border border-border/65 bg-card/65 px-2 text-muted-foreground transition-colors hover:border-primary/55 hover:text-primary"
      aria-label={`Open ${label}`}
    >
      <span className="sr-only">{label}</span>
      {icon}
    </button>
  )
}

function HudPanel({
  title,
  right,
  children,
  className,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(
      'rounded-lg border border-border/55 bg-card/70 p-4 shadow-[0_0_24px_-22px] shadow-accent',
      className,
    )}>
      <div className="mb-3 flex min-h-4 items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function CharacterPanel({ state, statLabels }: { state: Sf2State; statLabels: StatLabels }) {
  const hpPct = state.player.hp.max > 0
    ? Math.max(0, Math.min(100, (state.player.hp.current / state.player.hp.max) * 100))
    : 0

  return (
    <HudPanel
      title="Operative"
      right={<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Lv.{state.player.level}</span>}
    >
      <div className="space-y-4">
        <div>
          <div className="truncate font-mono text-[18px] uppercase tracking-[0.12em] text-foreground">
            {state.player.name}
          </div>
          <div className="mt-1 truncate text-[12px] text-muted-foreground">
            {state.player.class.name} / {state.player.origin.name}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric value={`${state.player.hp.current}/${state.player.hp.max}`} label={statLabels.hp} />
          <Metric value={String(state.player.ac)} label={statLabels.defense} />
          <Metric value={String(state.player.credits)} label={statLabels.currency} />
          <Metric value={String(state.player.inspiration)} label={statLabels.inspiration} accent />
        </div>
        <div className="h-1 overflow-hidden rounded-full border border-border/40 bg-background/70">
          <div
            className="h-full bg-primary/65 shadow-[0_0_14px_0] shadow-primary/35"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        {state.player.tempModifiers.length > 0 && (
          <div className="space-y-1">
            {state.player.tempModifiers.slice(0, 2).map((mod) => (
              <div key={`${mod.source}-${mod.effect}`} className="rounded border border-warning/35 bg-warning/10 px-2 py-1 text-[12px] text-warning">
                {mod.source}: {mod.effect}
              </div>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  )
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={cn('truncate font-mono text-[18px]', accent ? 'text-warning' : 'text-foreground')}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/75">
        {label}
      </div>
    </div>
  )
}

function ObjectivePanel({ state }: { state: Sf2State }) {
  const plan = state.campaign.operationPlan

  if (!plan) {
    return null
  }

  return (
    <HudPanel
      title="Ops Plan"
      right={
        <span className="rounded-md border border-primary/40 px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.16em] text-primary">
          {plan.status ?? 'active'}
        </span>
      }
    >
      <div className="space-y-3">
        {plan.name && (
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/90">
            {plan.name}
          </div>
        )}
        <KeyValue label="Target" value={plan.target} />
        <KeyValue label="Approach" value={plan.approach} />
        <KeyValue label="Fallback" value={plan.fallback} muted />
      </div>
    </HudPanel>
  )
}

function QuickSlotsPanel({ state }: { state: Sf2State }) {
  const items = state.player.inventory.slice(0, 4)

  return (
    <HudPanel
      title="Quick Slots"
      right={<span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">1-4</span>}
    >
      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="min-h-[70px] rounded-md border border-border/55 bg-background/55 p-3"
            >
              <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/60">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-foreground/90">
                {item.name}
              </div>
              <div className="mt-1 inline-flex rounded border border-current/25 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.qty > 1 ? `${item.qty}x` : 'ready'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine text="No quick inventory yet." />
      )}
    </HudPanel>
  )
}

function LocationsPanel({ state }: { state: Sf2State }) {
  const currentChapter = state.meta.currentChapter
  const currentLocationId = state.world.currentLocation.id || state.world.sceneSnapshot.location.id
  const locationMap = new Map<string, Sf2State['world']['currentLocation']>()

  for (const location of Object.values(state.campaign.locations)) {
    locationMap.set(location.id, location)
  }
  if (state.world.currentLocation.id) {
    locationMap.set(state.world.currentLocation.id, state.world.currentLocation)
  }
  if (state.world.sceneSnapshot.location.id) {
    locationMap.set(state.world.sceneSnapshot.location.id, state.world.sceneSnapshot.location)
  }

  const locations = [...locationMap.values()]
    .filter((location) => location.id && location.id !== 'loc_pending')
    .filter((location) => {
      if (location.id === currentLocationId) return true
      return location.chapterCreated === currentChapter
    })
    .sort((a, b) => {
      if (a.id === currentLocationId) return -1
      if (b.id === currentLocationId) return 1
      return a.name.localeCompare(b.name)
    })

  return (
    <HudPanel
      title="Locations"
      right={<span className="rounded-full border border-primary/45 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">{locations.length}</span>}
    >
      {locations.length > 0 ? (
        <div className="space-y-2.5">
          {locations.map((location) => {
            const here = location.id === currentLocationId
            const tag = location.atmosphericConditions?.[0]
            return (
              <div key={location.id} className={cn(
                'rounded-md border px-3 py-2.5',
                here ? 'border-primary/45 bg-primary/10' : 'border-border/45 bg-background/45',
              )}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/90">
                    {location.name || location.id.replace(/_/g, ' ')}
                  </span>
                  {here && <LocationChip tone="primary" label="HERE" />}
                  {location.locked && <LocationChip tone="muted" label="LOCKED" />}
                </div>
                {tag && (
                  <div className="mt-1.5 line-clamp-1 text-[12px] text-muted-foreground">
                    {tag}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyLine text="No chapter locations surfaced." />
      )}
    </HudPanel>
  )
}

function LocationChip({ label, tone }: { label: string; tone: 'primary' | 'muted' }) {
  return (
    <span className={cn(
      'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
      tone === 'primary'
        ? 'border-primary/45 bg-primary/10 text-primary'
        : 'border-border/55 bg-background/60 text-muted-foreground',
    )}>
      {label}
    </span>
  )
}

function PresentPanel({ state }: { state: Sf2State }) {
  const present = state.world.sceneSnapshot.presentNpcIds
    .map((id) => state.campaign.npcs[id])
    .filter(Boolean)

  return (
    <HudPanel title="Present">
      {present.length > 0 ? (
        <div className="space-y-2.5">
          {present.map((npc) => (
            <div key={npc.id} className="flex min-w-0 items-center gap-3">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dispositionDotClass(npc.disposition))} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">{npc.name}</span>
              <span className="shrink-0 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {npc.disposition}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine text="No NPCs currently staged." />
      )}
    </HudPanel>
  )
}

function PressurePanel({
  state,
  closeReadiness,
}: {
  state: Sf2State
  closeReadiness: Sf2CloseReadinessView
}) {
  const steps = state.chapter.setup.pressureLadder
  const fired = steps.filter((step) => step.fired).length
  const total = steps.length
  const face = state.chapter.setup.antagonistField.currentPrimaryFace
  const activeStep = steps.find((step) => !step.fired) ?? steps[steps.length - 1]

  return (
    <HudPanel
      title="Pressure"
      right={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/45 bg-warning/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warning">
          <Activity className="h-3 w-3" />
          {total > 0 ? `${fired}/${total}` : '0/0'}
        </span>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/90">
            {face.name || state.chapter.setup.antagonistField.corePressure || 'Pressure forming'}
          </div>
          {activeStep && (
            <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground/85">
              {activeStep.pressure}
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {steps.map((step, index) => (
              <div
                key={step.id || index}
                className={cn(
                  'h-1.5 rounded-full border',
                  step.fired
                    ? 'border-warning/50 bg-warning/65 shadow-[0_0_12px_-4px] shadow-warning'
                    : 'border-border/50 bg-background/60',
                )}
              />
            ))}
          </div>
        )}
        <div className={cn(
          'font-mono text-[10px] uppercase tracking-[0.16em]',
          closeReadiness.closeReady ? 'text-warning' : 'text-muted-foreground/75',
        )}>
          {closeReadiness.closeReady ? 'Close readiness: ready' : 'Close readiness: not yet'}
        </div>
      </div>
    </HudPanel>
  )
}

function IntelPanel({ state }: { state: Sf2State }) {
  const currentChapter = state.meta.currentChapter
  const surfacedThreadIds = new Set([
    ...(state.chapter.setup.surfaceThreads ?? []),
    ...(state.chapter.setup.loadBearingThreadIds ?? []),
    ...(state.chapter.setup.activeThreadIds ?? []),
  ])
  const threadIds = unique([
    ...surfacedThreadIds,
    ...Object.values(state.campaign.threads)
      .filter((thread) => thread.status === 'active' && thread.chapterCreated === currentChapter)
      .map((thread) => thread.id),
  ])
  const threads = threadIds
    .map((id) => state.campaign.threads[id])
    .filter(Boolean)
    .filter((thread) => thread.status === 'active')
    .filter((thread) => surfacedThreadIds.has(thread.id) || thread.chapterCreated === currentChapter)
    .slice(0, 5)
  const floatingClues = state.campaign.floatingClueIds
    .map((id) => state.campaign.clues[id])
    .filter(Boolean)
    .filter((clue) => clue.chapterCreated === currentChapter)
    .slice(0, 3)
  const visibleClueCount = Object.values(state.campaign.clues)
    .filter((clue) => clue.chapterCreated === currentChapter)
    .length

  return (
    <HudPanel
      title="Intel / Case Board"
      className="min-h-0 flex-1 overflow-hidden"
      right={<span className="rounded-full border border-primary/45 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">{visibleClueCount}</span>}
    >
      <div className="max-h-[42vh] space-y-4 overflow-y-auto pr-1 xl:max-h-none">
        {threads.length > 0 ? threads.map((thread) => {
          const clues = Object.values(state.campaign.clues)
            .filter((clue) => clue.anchoredTo.includes(thread.id))
            .filter((clue) => clue.chapterCreated === currentChapter)
            .slice(0, 3)
          const tier = thread.loadBearing || state.chapter.setup.loadBearingThreadIds.includes(thread.id)
            ? 'load-bearing'
            : clues.length > 0
              ? 'evidenced'
              : 'lead'
          return (
            <div key={thread.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/85">
                  {thread.title}
                </span>
                <IntelTierBadge tier={tier} />
              </div>
              <div className="space-y-1">
                {clues.length > 0 ? clues.map((clue) => (
                  <div
                    key={clue.id}
                    className="flex gap-2 rounded border border-transparent px-2 py-1.5 text-[12.5px] leading-snug text-foreground/85"
                  >
                    <span className="text-muted-foreground/50">-</span>
                    <span>{clue.content}</span>
                  </div>
                )) : (
                  <EmptyLine text="No attached clues yet." compact />
                )}
              </div>
            </div>
          )
        }) : (
          <EmptyLine text="No active threads surfaced." />
        )}

        {floatingClues.length > 0 && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Floating clues
            </div>
            {floatingClues.map((clue) => (
              <div key={clue.id} className="rounded border border-primary/30 bg-primary/10 px-2 py-1.5 text-[12px] leading-snug text-foreground/85">
                {clue.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  )
}

function IntelTierBadge({ tier }: { tier: 'load-bearing' | 'evidenced' | 'lead' }) {
  return (
    <span className={cn(
      'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
      tier === 'load-bearing' && 'border-primary/40 bg-primary/10 text-primary',
      tier === 'evidenced' && 'border-success/40 bg-success/10 text-success',
      tier === 'lead' && 'border-border/50 bg-background/45 text-muted-foreground',
    )}>
      {tier}
    </span>
  )
}

function TurnStream({
  state,
  prose,
  rollLogByTurn,
  locationByTurn,
  isStreaming,
  isGeneratingChapter,
  generationElapsed,
  isArchiving,
  chapterTurnCount,
}: {
  state: Sf2State
  prose: string
  rollLogByTurn: Map<number, Sf2State['history']['rollLog']>
  locationByTurn: Map<number, string>
  isStreaming: boolean
  isGeneratingChapter: boolean
  generationElapsed: number
  isArchiving: boolean
  chapterTurnCount: number
}) {
  const turns = state.history.turns.filter((turn) => turn.chapter === state.meta.currentChapter)

  return (
    <div className="mx-auto flex min-h-full max-w-[940px] flex-col justify-end space-y-6">
      {turns.length === 0 && !prose && !isGeneratingChapter && (
        <div className="sf2-border-tertiary-soft sf2-shadow-accent-soft rounded-r-lg border-l bg-card/35 py-5 pl-5 pr-5 text-foreground">
          <p className="text-[15px] leading-relaxed text-muted-foreground" style={{ fontFamily: 'var(--font-narrative)' }}>
            {chapterTurnCount === 0
              ? 'Press begin when you are ready to open the chapter.'
              : 'The scene is quiet. Choose the next move.'}
          </p>
        </div>
      )}

      {turns.map((turn) => (
        <div key={turn.index} className="space-y-4">
          <SceneMarker turn={turn.index + 1} location={locationByTurn.get(turn.index)} />
          {turn.playerInput && <PlayerMessage>{turn.playerInput}</PlayerMessage>}
          {(rollLogByTurn.get(turn.index) ?? []).map((roll, index) => (
            <HistoryRollCard key={`${turn.index}-${index}`} roll={roll} />
          ))}
          <GMMessage>{turn.narratorProse}</GMMessage>
          <StateDiffLine turnIndex={turn.index} diff={turn.stateDiff} />
        </div>
      ))}

      {(prose || isStreaming || isGeneratingChapter || isArchiving) && (
        <div className="space-y-4">
          {prose && (
            <GMMessage live>
              {prose}
              {isStreaming && <span className="animate-pulse text-primary"> |</span>}
            </GMMessage>
          )}
          {isGeneratingChapter && (
            <StatusLine
              tone="warning"
              text={`Generating chapter setup - ${generationElapsed}s elapsed`}
              detail="Author is producing the chapter frame. No intermediate streaming is expected."
            />
          )}
          {isArchiving && !isStreaming && !isGeneratingChapter && (
            <StatusLine tone="muted" text="Archiving turn state" />
          )}
        </div>
      )}
    </div>
  )
}

function SceneMarker({ turn, location }: { turn: number; location?: string }) {
  return (
    <div className="sf2-text-tertiary-muted flex items-center gap-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]">
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
      <span className="inline-flex max-w-[70%] min-w-0 items-center gap-2">
        <span>Turn {turn}</span>
        {location && (
          <>
            <span className="text-muted-foreground/45">/</span>
            <span className="truncate text-primary/75">{location}</span>
          </>
        )}
      </span>
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
    </div>
  )
}

function GMMessage({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <div
      className={cn(
        'sf2-border-tertiary-soft sf2-shadow-accent-soft whitespace-pre-wrap rounded-r-lg border-l bg-card/35 py-4 pl-5 pr-5 text-foreground md:py-5 md:pl-6 md:pr-6',
        live && 'border-primary/45 bg-primary/5 shadow-primary/20',
      )}
      style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)', lineHeight: 1.7 }}
    >
      {children}
    </div>
  )
}

function PlayerMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-l-lg border-r border-primary/35 bg-primary/15 py-3 pl-5 pr-5 text-foreground shadow-[0_0_22px_-12px] shadow-primary/20 md:max-w-[82%] md:py-4 md:pl-6 md:pr-6"
      style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)', lineHeight: 1.65 }}
    >
      {children}
    </div>
  )
}

function StateDiffLine({
  turnIndex,
  diff,
}: {
  turnIndex: number
  diff?: Sf2TurnDiffEntry[]
}) {
  if (!diff || diff.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 font-mono text-[10px] uppercase tracking-[0.16em] opacity-65">
      <span className="text-muted-foreground">turn {turnIndex + 1}</span>
      <span className="text-muted-foreground/55">-</span>
      {diff.slice(0, 6).map((entry, index) => (
        <span key={`${entry.kind}-${entry.entityId ?? index}-${entry.label}`} className={cn(
          entry.tone === 'gain' && 'text-success',
          entry.tone === 'loss' && 'text-destructive',
          entry.tone === 'severe' && 'text-severe',
          entry.tone === 'change' && 'text-muted-foreground',
        )}>
          {index > 0 && <span className="mr-2 text-muted-foreground/45">/</span>}
          {entry.label}
        </span>
      ))}
    </div>
  )
}

type RollTone = 'idle' | 'success' | 'failure' | 'critical' | 'fumble'
type RollModifierType = NonNullable<Sf2RollOutcomeView['modifierType']>

interface RollDieView {
  value: ReactNode
  kept?: boolean
  rolling?: boolean
}

function rollToneForHistory(outcome: Sf2State['history']['rollLog'][number]['outcome']): RollTone {
  if (outcome === 'critical_success') return 'critical'
  if (outcome === 'critical_failure') return 'fumble'
  if (outcome === 'success') return 'success'
  return 'failure'
}

function rollToneForResult(result?: Sf2RollOutcomeView['result']): RollTone {
  if (result === 'critical') return 'critical'
  if (result === 'fumble') return 'fumble'
  if (result === 'success') return 'success'
  if (result === 'failure') return 'failure'
  return 'idle'
}

function rollResultLabel(tone: RollTone) {
  switch (tone) {
    case 'critical':
      return 'CRITICAL!'
    case 'success':
      return 'SUCCESS'
    case 'failure':
      return 'FAILURE'
    case 'fumble':
      return 'FUMBLE'
    default:
      return ''
  }
}

function rollCardClassName(tone: RollTone, interactive = false) {
  return cn(
    'rounded-lg px-4 py-3 text-left transition-[background-color,transform] duration-200 md:px-5',
    tone === 'idle' && 'sf2-roll-idle-card',
    tone === 'success' && 'bg-success/10',
    tone === 'failure' && 'bg-warning/10',
    tone === 'critical' && 'bg-warning/15',
    tone === 'fumble' && 'bg-severe/10',
    interactive && 'w-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100',
  )
}

function rollDieClassName(tone: RollTone, kept = true, rolling = false) {
  return cn(
    'flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border font-mono text-3xl font-bold transition-all duration-200',
    !kept && 'border-border/30 bg-card/20 text-muted-foreground/40 line-through',
    kept && tone === 'idle' && 'sf2-roll-idle-die',
    kept && tone === 'success' && 'border-success/60 bg-success/15 text-success',
    kept && tone === 'failure' && 'border-warning/60 bg-warning/15 text-warning',
    kept && tone === 'critical' && 'border-warning/70 bg-warning/20 text-warning shadow-[0_0_24px_-12px] shadow-warning',
    kept && tone === 'fumble' && 'border-severe/65 bg-severe/15 text-severe',
    rolling && 'animate-pulse',
  )
}

function rollResultTextClassName(tone: RollTone) {
  return cn(
    'font-bold',
    tone === 'critical' && 'text-warning',
    tone === 'success' && 'text-success',
    tone === 'failure' && 'text-warning',
    tone === 'fumble' && 'text-severe',
  )
}

function RollModifierChip({ type }: { type: RollModifierType }) {
  return (
    <span className={cn(
      'rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
      type === 'advantage' && 'border-success/35 bg-success/10 text-success',
      type === 'disadvantage' && 'border-warning/40 bg-warning/10 text-warning',
      type === 'challenge' && 'border-warning/40 bg-warning/10 text-warning',
      type === 'inspiration' && 'border-info/40 bg-info/10 text-info',
    )}>
      {type}
    </span>
  )
}

function RollCardView({
  tone,
  title,
  meta,
  modifierType,
  formula,
  reason,
  consequence,
  dice,
  actionLabel,
  rolling,
  disabled,
  onClick,
}: {
  tone: RollTone
  title: string
  meta?: ReactNode
  modifierType?: RollModifierType
  formula?: string
  reason?: string
  consequence?: string
  dice: RollDieView[]
  actionLabel?: string
  rolling?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const label = rollResultLabel(tone)
  const content = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Dices className={cn('h-4 w-4', tone === 'idle' ? 'text-primary' : rollResultTextClassName(tone))} />
          <span className="text-foreground">{title}</span>
          {modifierType && <RollModifierChip type={modifierType} />}
          {meta}
        </div>

        {formula && (
          <div className="mt-1.5 font-mono text-[14px] text-foreground/90">
            {formula}
            {label && (
              <>
                <span className="text-muted-foreground"> {' '}—{' '}</span>
                <span className={rollResultTextClassName(tone)}>{label}</span>
              </>
            )}
          </div>
        )}

        {reason && (
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/80" style={{ fontFamily: 'var(--font-narrative)' }}>
            {reason}
          </p>
        )}
        {consequence && (
          <p className="mt-1 text-[12px] italic leading-relaxed text-muted-foreground">
            On fail: {consequence}
          </p>
        )}
        {actionLabel && (
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/75">
            {actionLabel}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        {dice.map((die, index) => (
          <div key={index} className={rollDieClassName(tone, die.kept ?? true, rolling || die.rolling)}>
            {die.value}
          </div>
        ))}
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={rollCardClassName(tone, true)}
      >
        {content}
      </button>
    )
  }

  return <div className={rollCardClassName(tone)}>{content}</div>
}

function rollDiceFromValues(values: number[] | undefined, keptValue: number): RollDieView[] {
  const diceValues = values && values.length > 0 ? values : [keptValue]
  return diceValues.map((value) => ({
    value,
    kept: diceValues.length === 1 || value === keptValue,
  }))
}

function HistoryRollCard({ roll }: { roll: Sf2State['history']['rollLog'][number] }) {
  const tone = rollToneForHistory(roll.outcome)
  const dc = roll.effectiveDc ?? roll.dc
  const total = roll.rollResult + roll.modifier

  return (
    <RollCardView
      tone={tone}
      title={`${roll.skill} Check`}
      modifierType={roll.modifierType}
      formula={`${roll.rollResult} ${formatSigned(roll.modifier)} = ${total} vs DC ${dc}`}
      dice={rollDiceFromValues(roll.rawRolls, roll.rollResult)}
    />
  )
}

function ActionSurface(props: {
  state: Sf2State
  suggestedActions: string[]
  pendingInput: string
  pendingCheck: Sf2PendingCheckView | null
  rollResult: Sf2RollOutcomeView | null
  inspirationOffer: Sf2RollOutcomeView | null
  rollModifier: number | null
  effectiveDc: number | null
  inspirationRemaining: number
  busy: boolean
  chapterTurnCount: number
  closeReadiness: Sf2CloseReadinessView
  hasActiveRoll: boolean
  onPendingInputChange: (value: string) => void
  onSendTurn: (input: string) => void
  onResolvePendingCheck: () => void
  onSpendInspiration: () => void
  onDeclineInspiration: () => void
  onCloseChapter: () => void
}) {
  const {
    state,
    suggestedActions,
    pendingInput,
    pendingCheck,
    rollResult,
    inspirationOffer,
    rollModifier,
    effectiveDc,
    inspirationRemaining,
    busy,
    chapterTurnCount,
    closeReadiness,
    hasActiveRoll,
    onPendingInputChange,
    onSendTurn,
    onResolvePendingCheck,
    onSpendInspiration,
    onDeclineInspiration,
    onCloseChapter,
  } = props
  const initialTurn = chapterTurnCount === 0

  return (
    <div className="mx-auto w-full max-w-[940px] space-y-2">
      {closeReadiness.closeReady && !busy && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/45 bg-warning/10 px-4 py-3 text-warning md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em]">Chapter ready to close</div>
            <div className="mt-1 text-[12px] text-warning/75">
              {closeReadiness.chapterPivotSignaled && 'Narrator signaled the pivot.'}
              {!closeReadiness.chapterPivotSignaled && closeReadiness.spineResolved && `Spine thread transitioned to ${closeReadiness.spineStatus}.`}
              {!closeReadiness.chapterPivotSignaled && !closeReadiness.spineResolved && closeReadiness.stalledFallback &&
                `Stalled fallback: ${chapterTurnCount} turns / ladder ${closeReadiness.ladderFiredCount}/${closeReadiness.ladderStepCount} / spine tension ${closeReadiness.spineTension}/10.`}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseChapter}
            className="rounded border border-warning/55 bg-warning/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-warning transition-colors hover:bg-warning/25"
          >
            Close Ch{state.meta.currentChapter} / Open Ch{state.meta.currentChapter + 1}
          </button>
        </div>
      )}

      {!closeReadiness.closeReady && !busy && closeReadiness.successorRequired && (
        <div className="rounded-lg border border-warning/35 bg-warning/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
          Chapter spine resolved early - successor pressure needed before close.
        </div>
      )}

      {!closeReadiness.closeReady && !busy && closeReadiness.promotedSpineThreadId && (
        <div className="rounded-lg border border-border/55 bg-background/45 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Spine pressure shifted to {state.campaign.threads[closeReadiness.promotedSpineThreadId]?.title ?? closeReadiness.promotedSpineThreadId}.
        </div>
      )}

      {hasActiveRoll && (
        <DiceTray
          pendingCheck={pendingCheck}
          rollResult={rollResult}
          inspirationOffer={inspirationOffer}
          modifier={rollModifier}
          effectiveDc={effectiveDc}
          inspirationRemaining={inspirationRemaining}
          busy={busy}
          onRoll={onResolvePendingCheck}
          onSpendInspiration={onSpendInspiration}
          onDeclineInspiration={onDeclineInspiration}
        />
      )}

      {!hasActiveRoll && suggestedActions.length > 0 && !busy && !initialTurn && (
        <div className="space-y-1.5">
          {suggestedActions.map((action, index) => (
            <button
              key={`${action}-${index}`}
              type="button"
              onClick={() => onPendingInputChange(action)}
              className="grid w-full grid-cols-[74px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border/80 bg-card/75 px-3 py-2 text-left shadow-[0_0_16px_-14px] shadow-primary transition-colors hover:border-primary/55 hover:bg-primary/10 md:grid-cols-[92px_minmax(0,1fr)] md:px-5"
            >
              <span className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                Option {index + 1}
              </span>
              <span className="text-[13px] leading-snug text-foreground md:text-[13.5px]">{action}</span>
            </button>
          ))}
        </div>
      )}

      {initialTurn ? (
        <button
          type="button"
          onClick={() => onSendTurn('')}
          disabled={busy}
          className="w-full rounded-lg border border-primary/65 bg-primary/15 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-primary shadow-[0_0_18px_-12px] shadow-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {state.chapter.title ? 'Begin the opening' : 'Generate chapter / begin'}
        </button>
      ) : (
        <CommandInput
          value={pendingInput}
          disabled={busy || hasActiveRoll}
          placeholder={hasActiveRoll ? 'Resolve the check before acting again...' : 'Type an action or / for commands...'}
          onChange={onPendingInputChange}
          onSubmit={() => onSendTurn(pendingInput)}
        />
      )}
    </div>
  )
}

function DiceTray({
  pendingCheck,
  rollResult,
  inspirationOffer,
  modifier,
  effectiveDc,
  inspirationRemaining,
  busy,
  onRoll,
  onSpendInspiration,
  onDeclineInspiration,
}: {
  pendingCheck: Sf2PendingCheckView | null
  rollResult: Sf2RollOutcomeView | null
  inspirationOffer: Sf2RollOutcomeView | null
  modifier: number | null
  effectiveDc: number | null
  inspirationRemaining: number
  busy: boolean
  onRoll: () => void
  onSpendInspiration: () => void
  onDeclineInspiration: () => void
}) {
  const [isRolling, setIsRolling] = useState(false)
  const [display, setDisplay] = useState<number | null>(rollResult?.d20 ?? null)
  const [display2, setDisplay2] = useState<number | null>(rollResult?.rawRolls?.[1] ?? null)
  const result = rollResult
  const tone = rollToneForResult(result?.result)
  const title = `${pendingCheck?.skill ?? result?.skill ?? 'Skill'} Check`
  const resolvedDc = result?.effectiveDc ?? result?.dc ?? effectiveDc ?? pendingCheck?.dc ?? null
  const resolvedModifier = result?.modifier ?? modifier
  const pendingUsesTwoDice = pendingCheck?.modifierType === 'advantage' || pendingCheck?.modifierType === 'disadvantage'
  const pendingDice: RollDieView[] = Array.from({ length: pendingUsesTwoDice ? 2 : 1 }, (_, index) => ({
    value: (index === 0 ? display : display2) ?? 'd20',
    rolling: isRolling,
  }))
  const resultDice = result ? rollDiceFromValues(result.rawRolls, result.d20) : pendingDice
  const formula = result && resolvedDc !== null
    ? `${result.d20} ${formatSigned(result.modifier)} = ${result.total} vs DC ${resolvedDc}`
    : undefined
  const meta = (
    <>
      {resolvedDc !== null && (
        <span>
          DC <span className="text-foreground">{resolvedDc}</span>
        </span>
      )}
      {resolvedModifier !== null && (
        <span>
          mod <span className="text-primary">{formatSigned(resolvedModifier)}</span>
        </span>
      )}
    </>
  )

  useEffect(() => {
    setDisplay(result?.d20 ?? null)
    setDisplay2(result?.rawRolls?.[1] ?? null)
    setIsRolling(false)
  }, [result?.d20, result?.rawRolls])

  function handleRoll() {
    if (!pendingCheck || isRolling || busy) return
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      onRoll()
      return
    }
    setIsRolling(true)
    const interval = window.setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * 20))
      if (pendingUsesTwoDice) setDisplay2(1 + Math.floor(Math.random() * 20))
    }, 45)
    window.setTimeout(() => {
      window.clearInterval(interval)
      onRoll()
    }, 720)
  }

  return (
    <div>
      <RollCardView
        tone={tone}
        title={title}
        meta={meta}
        modifierType={pendingCheck?.modifierType ?? result?.modifierType}
        formula={formula}
        reason={!result ? pendingCheck?.why : undefined}
        consequence={!result ? pendingCheck?.consequenceOnFail : undefined}
        dice={resultDice}
        actionLabel={!result ? (isRolling ? 'Rolling...' : `Tap to roll${pendingUsesTwoDice ? ' 2d20' : ''}`) : undefined}
        rolling={isRolling}
        disabled={busy || isRolling}
        onClick={!result && pendingCheck ? handleRoll : undefined}
      />

      {inspirationOffer && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-info/35 bg-background/55 px-3 py-3 text-info shadow-[0_0_20px_-18px] shadow-info md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em]">Spend inspiration?</div>
            <div className="mt-1 text-[12px] text-info/80">
              Reroll this failed check. Inspiration remaining: {inspirationRemaining}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSpendInspiration}
              className="rounded-md border border-info/55 bg-info/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-info transition-colors hover:bg-info/25"
            >
              Spend
            </button>
            <button
              type="button"
              onClick={onDeclineInspiration}
              className="rounded-md border border-border/60 bg-background/45 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Keep result
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CommandInput({
  value,
  disabled,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string
  disabled: boolean
  placeholder: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-end gap-3 rounded-lg border bg-background/70 px-3 py-2.5 shadow-[0_0_22px_-16px] shadow-primary md:px-5',
        disabled ? 'border-border/55 opacity-55' : 'border-primary/45 focus-within:border-primary/80',
      )}
    >
      <span className="pb-1.5 font-mono text-[13px] text-primary">&gt;</span>
      <textarea
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSubmit()
          }
        }}
        className="min-h-8 flex-1 resize-none bg-transparent py-1.5 font-mono text-[13px] leading-snug text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-primary/45 bg-primary/15 text-primary transition-colors hover:bg-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Submit command"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}

function DiagnosticsPanel(props: {
  state: Sf2State
  campaignStats: Sf2CampaignStatsView
  sessionSummary: SessionSummary | null
  debug: DebugEntryView[]
  lastNarratorUsage: TokenUsageView | null
  lastArchivistUsage: TokenUsageView | null
  chapterTurnCount: number
  busy: boolean
  closeReadiness: Sf2CloseReadinessView
  onCloseChapter: () => void
  onResetCampaign: () => void
  onDownloadSessionLog: () => void
  onDownloadReplayFixture: () => void
}) {
  const {
    state,
    campaignStats,
    sessionSummary,
    debug,
    lastNarratorUsage,
    lastArchivistUsage,
    chapterTurnCount,
    busy,
    closeReadiness,
    onCloseChapter,
    onResetCampaign,
    onDownloadSessionLog,
    onDownloadReplayFixture,
  } = props
  const pressureFired = state.chapter.setup.pressureLadder.filter((step) => step.fired).length

  return (
    <div className="space-y-3">
      <PressurePanel state={state} closeReadiness={closeReadiness} />

      <HudPanel title="Campaign State">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <MiniStat label="NPCs" value={campaignStats.npcs} />
          <MiniStat label="Threads" value={campaignStats.threads} />
          <MiniStat label="Decisions" value={campaignStats.decisions} />
          <MiniStat label="Promises" value={campaignStats.promises} />
          <MiniStat label="Clues" value={campaignStats.clues} />
        </div>
        <div className="mt-3 space-y-1 text-[12px] text-muted-foreground">
          <div>Scene: {state.world.sceneSnapshot.sceneId}</div>
          <div>Pressure face: {state.chapter.setup.antagonistField.currentPrimaryFace.name || 'none'}</div>
          <div>Pressure fired: {pressureFired}/{state.chapter.setup.pressureLadder.length}</div>
        </div>
      </HudPanel>

      {sessionSummary && (
        <HudPanel title="Session Metrics">
          <div className="space-y-2 text-[12px] text-muted-foreground">
            <div>
              Cost ${sessionSummary.cost.estimatedUsdTotal.toFixed(3)} / turns {sessionSummary.totalTurns} / writes {sessionSummary.archivist.totalWrites}
            </div>
            <div>
              Anchor miss {(sessionSummary.archivist.anchorMissRate * 100).toFixed(1)}% / drift {sessionSummary.archivist.driftFlags} / pacing {sessionSummary.pacing.advisoriesFired}
            </div>
            <div>
              Coherence {sessionSummary.coherence.totalFindings}
              {sessionSummary.coherence.bySeverity.high > 0 ? ` (${sessionSummary.coherence.bySeverity.high} high)` : ''}
            </div>
            <div>
              Visible spend {(sessionSummary.waterfall.visibleSpendShare * 100).toFixed(0)}% / cache hit {(sessionSummary.waterfall.cacheHitRatio.overall * 100).toFixed(0)}%
            </div>
          </div>
        </HudPanel>
      )}

      <HudPanel title="Token Usage">
        <div className="space-y-2 text-[12px] text-muted-foreground">
          <UsageLine label="Narrator" usage={lastNarratorUsage} />
          <UsageLine label="Archivist" usage={lastArchivistUsage} />
        </div>
      </HudPanel>

      <HudPanel title={`Debug / ${debug.length} events`}>
        <div className="max-h-64 space-y-2 overflow-y-auto text-xs">
          {debug.length === 0 ? (
            <EmptyLine text="No debug events yet." />
          ) : debug.slice().reverse().slice(0, 20).map((entry, index) => (
            <div key={`${entry.kind}-${entry.at}-${index}`} className="border-t border-border/45 pt-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">{entry.kind}</div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </HudPanel>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <UtilityButton icon={<FileDown className="h-4 w-4" />} label="Download session log" onClick={onDownloadSessionLog} />
        <UtilityButton icon={<FileDown className="h-4 w-4" />} label="Download replay fixture" onClick={onDownloadReplayFixture} />
        <UtilityButton
          icon={<ScrollText className="h-4 w-4" />}
          label={`Close chapter / Open Ch${state.meta.currentChapter + 1}`}
          onClick={onCloseChapter}
          disabled={busy || chapterTurnCount === 0}
        />
        <UtilityButton icon={<RotateCcw className="h-4 w-4" />} label="Reset campaign" onClick={onResetCampaign} />
        <a
          href="/play"
          className="inline-flex items-center justify-center gap-2 rounded border border-border/60 bg-card/55 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground md:col-span-2"
        >
          Back to v1
        </a>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/45 bg-background/45 px-2 py-2 text-center">
      <div className="font-mono text-lg text-foreground">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  )
}

function UtilityButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded border border-border/60 bg-card/55 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
    >
      {icon}
      {label}
    </button>
  )
}

function StatusLine({ tone, text, detail }: { tone: 'warning' | 'muted'; text: string; detail?: string }) {
  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em]',
      tone === 'warning' ? 'border-warning/45 bg-warning/10 text-warning' : 'border-border/45 bg-card/45 text-muted-foreground',
    )}>
      <div>{text}</div>
      {detail && <div className="mt-1 normal-case tracking-normal text-muted-foreground">{detail}</div>}
    </div>
  )
}

function KeyValue({ label, value, muted }: { label: string; value?: string; muted?: boolean }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-[12px] leading-relaxed">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">{label}</div>
      <div className={muted ? 'text-foreground/65' : 'text-foreground/85'}>{value}</div>
    </div>
  )
}

function EmptyLine({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={cn('text-muted-foreground', compact ? 'text-[12px]' : 'text-[12.5px]')}>
      {text}
    </div>
  )
}

function UsageLine({ label, usage }: { label: string; usage: TokenUsageView | null }) {
  if (!usage) return <div>{label}: no usage yet</div>
  return (
    <div>
      {label}: in {usage.inputTokens} / out {usage.outputTokens} / cache w {usage.cacheWriteTokens} / r {usage.cacheReadTokens}
    </div>
  )
}

function dispositionDotClass(disposition: string) {
  if (disposition === 'trusted' || disposition === 'favorable') return 'bg-success shadow-[0_0_12px_-2px] shadow-success'
  if (disposition === 'hostile') return 'bg-destructive shadow-[0_0_12px_-2px] shadow-destructive'
  if (disposition === 'wary') return 'bg-warning shadow-[0_0_12px_-2px] shadow-warning'
  return 'bg-muted-foreground/55'
}

function formatSigned(value: number) {
  return value >= 0 ? `+${value}` : String(value)
}

function statLabelsForGenre(genreId: string): StatLabels {
  try {
    const config = getGenreConfig(genreId as Genre)
    return {
      ...DEFAULT_STAT_LABELS,
      currency: config.currencyAbbrev ? config.currencyAbbrev.toUpperCase() : DEFAULT_STAT_LABELS.currency,
      ...config.statLabels,
    }
  } catch {
    return DEFAULT_STAT_LABELS
  }
}

function buildLocationByTurn(state: Sf2State): Map<number, string> {
  const locations = new Map<number, string>()
  const currentSceneLocation = state.world.sceneSnapshot.location.name || state.world.currentLocation.name
  const firstSceneTurn = state.world.sceneSnapshot.firstTurnIndex ?? Number.POSITIVE_INFINITY

  for (const turn of state.history.turns) {
    const locationFromRaw = locationNameFromRawEffects(state, turn.narratorAnnotationRaw)
    if (locationFromRaw) {
      locations.set(turn.index, locationFromRaw)
      continue
    }
    if (turn.chapter === state.meta.currentChapter && turn.index >= firstSceneTurn && currentSceneLocation) {
      locations.set(turn.index, currentSceneLocation)
    }
  }

  return locations
}

function locationNameFromRawEffects(
  state: Sf2State,
  raw?: Record<string, unknown>
): string | undefined {
  const effects = raw?.mechanical_effects
  if (!Array.isArray(effects)) return undefined

  for (const effect of effects as Array<Record<string, unknown>>) {
    if (effect.kind === 'set_scene_snapshot') {
      const snapshot = effect.snapshot as Record<string, unknown> | undefined
      const id = typeof snapshot?.location_id === 'string'
        ? snapshot.location_id
        : typeof effect.location_id === 'string'
          ? effect.location_id
          : undefined
      if (id) return state.campaign.locations[id]?.name ?? id.replace(/_/g, ' ')
    }
    if (effect.kind === 'set_location' && typeof effect.location_id === 'string') {
      return state.campaign.locations[effect.location_id]?.name
        ?? (typeof effect.name === 'string' ? effect.name : effect.location_id.replace(/_/g, ' '))
    }
  }

  return undefined
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}
