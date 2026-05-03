'use client'

import {
  Activity,
  BookOpen,
  FileDown,
  Map as MapIcon,
  Menu,
  RotateCcw,
  ScrollText,
  Send,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { applyGenreTheme, getGenreConfig, type Genre } from '@/lib/genre-config'
import type { ChapterPressureProjection } from '@/lib/sf2/pressure/runtime'
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
  'opacity-90 saturate-[0.92] transition-[opacity,filter] duration-200 ease-out',
  'hover:opacity-100 hover:saturate-100',
  'focus-within:opacity-100 focus-within:saturate-100',
)

const sidebarTitleTextClassName = '[font-family:var(--font-geist-sans),Geist,system-ui,sans-serif] text-sm font-semibold tracking-normal text-foreground/90'
const sidebarBodyTextClassName = '[font-family:var(--font-geist-sans),Geist,system-ui,sans-serif] text-xs leading-snug text-muted-foreground/80'
const sidebarEmptyTextClassName = '[font-family:var(--font-geist-sans),Geist,system-ui,sans-serif] text-xs leading-snug text-muted-foreground/75'

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

export interface Sf2LiveRollView {
  id: string
  proseOffset: number
  check: Sf2PendingCheckView
  outcome?: Sf2RollOutcomeView
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
  activePlayerInput: string
  suggestedActions: string[]
  pendingInput: string
  pendingCheck: Sf2PendingCheckView | null
  rollResult: Sf2RollOutcomeView | null
  liveRolls: Sf2LiveRollView[]
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
  pressureProjection: ChapterPressureProjection
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

type ShellPanel = 'character' | 'scene' | 'intel' | 'diagnostics'

const DEFAULT_STAT_LABELS: StatLabels = {
  hp: 'HP',
  defense: 'AC',
  currency: 'Cred',
  inspiration: 'Insp',
}

function getStateGenreConfig(state: Pick<Sf2State, 'meta'>) {
  try {
    return getGenreConfig(state.meta.genreId as Genre)
  } catch {
    return null
  }
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
  '--narrative-font-size',
] as const

const THEME_BODY_PROPS = [
  '--font-narrative',
  '--font-heading',
  '--font-system',
  '--font-scale',
  '--narrative-font-size',
] as const

export function Sf2PlayShell(props: Sf2PlayShellProps) {
  const {
    state,
    scrollRef,
    prose,
    activePlayerInput,
    suggestedActions,
    pendingInput,
    pendingCheck,
    rollResult,
    liveRolls,
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
    pressureProjection,
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
  const [activePanel, setActivePanel] = useState<ShellPanel | null>(null)
  const isMobileViewport = useIsMobile()

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
  const hasActiveRoll = Boolean(pendingCheck || rollResult || inspirationOffer)
  const displayedLiveRolls: Sf2LiveRollView[] = liveRolls.length > 0
    ? liveRolls
    : pendingCheck
      ? [{
          id: 'active-roll',
          proseOffset: prose.length,
          check: pendingCheck,
          outcome: rollResult ?? undefined,
        }]
      : rollResult
        ? [{
            id: 'active-roll-result',
            proseOffset: prose.length,
            check: {
              skill: rollResult.skill ?? 'Skill',
              dc: rollResult.dc,
              why: '',
              consequenceOnFail: '',
            },
            outcome: rollResult,
          }]
        : []
  const activePanelTitle = activePanel
    ? activePanel === 'character'
      ? 'Character'
      : activePanel === 'scene'
        ? 'Scene'
        : activePanel === 'intel'
          ? 'Intel'
          : 'Diagnostics'
    : ''
  const activePanelBody = (
    <div className={cn(
      'overflow-y-auto p-4',
      isMobileViewport ? 'max-h-[calc(86vh-5rem)]' : 'min-h-0 flex-1 p-5',
    )}>
      {activePanel === 'character' && (
        <div className="space-y-3">
          <CharacterPanel state={state} statLabels={statLabels} />
          <ObjectivePanel state={state} />
          <QuickSlotsPanel state={state} />
          <PlaybookSkillPanel state={state} />
        </div>
      )}
      {activePanel === 'scene' && (
        <div className="space-y-3">
          <LocationsPanel state={state} />
          <PresentPanel state={state} />
        </div>
      )}
      {activePanel === 'intel' && <IntelPanel state={state} />}
      {activePanel === 'diagnostics' && (
        <DiagnosticsPanel
          state={state}
          campaignStats={campaignStats}
          sessionSummary={sessionSummary}
          debug={debug}
          lastNarratorUsage={lastNarratorUsage}
          lastArchivistUsage={lastArchivistUsage}
          chapterTurnCount={chapterTurnCount}
          busy={busy}
          pressureProjection={pressureProjection}
          closeReadiness={closeReadiness}
          onCloseChapter={onCloseChapter}
          onResetCampaign={onResetCampaign}
          onDownloadSessionLog={onDownloadSessionLog}
          onDownloadReplayFixture={onDownloadReplayFixture}
        />
      )}
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0" style={ambientOverlayStyle} />
      <div className="relative flex h-full min-w-0 flex-col">
        <TopBar
          state={state}
          chapterTurnCount={chapterTurnCount}
          busy={busy}
          onOpenPanel={setActivePanel}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-3 pb-3 md:px-5 md:pb-5 xl:grid-cols-[minmax(270px,340px)_minmax(620px,1fr)_minmax(300px,360px)]">
          <aside className={desktopRailClassName}>
            <CharacterPanel state={state} statLabels={statLabels} />
            <ObjectivePanel state={state} />
            <QuickSlotsPanel state={state} />
            <PlaybookSkillPanel state={state} />
          </aside>

          <main className="sf2-center-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/45 shadow-[0_24px_80px_-52px_rgba(0,0,0,0.9)]">
            <div
              ref={scrollRef}
              className="sf2-narrative-scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6"
            >
              <TurnStream
                state={state}
                prose={prose}
                activePlayerInput={activePlayerInput}
                liveRolls={displayedLiveRolls}
                inspirationOffer={inspirationOffer}
                rollModifier={rollModifier}
                effectiveDc={effectiveDc}
                inspirationRemaining={inspirationRemaining}
                rollBusy={busy && !pendingCheck}
                rollLogByTurn={rollLogByTurn}
                locationByTurn={locationByTurn}
                isStreaming={isStreaming}
                isGeneratingChapter={isGeneratingChapter}
                generationElapsed={generationElapsed}
                isArchiving={isArchiving}
                chapterTurnCount={chapterTurnCount}
                onResolvePendingCheck={onResolvePendingCheck}
                onSpendInspiration={onSpendInspiration}
                onDeclineInspiration={onDeclineInspiration}
              />
            </div>

            <div className="shrink-0 border-t border-border/25 bg-transparent p-3 md:p-4">
              <ActionSurface
                state={state}
                suggestedActions={suggestedActions}
                pendingInput={pendingInput}
                pendingCheck={pendingCheck}
                busy={busy}
                chapterTurnCount={chapterTurnCount}
                closeReadiness={closeReadiness}
                hasActiveRoll={hasActiveRoll}
                onPendingInputChange={onPendingInputChange}
                onSendTurn={onSendTurn}
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

      {isMobileViewport ? (
        <Drawer open={activePanel !== null} onOpenChange={(open) => !open && setActivePanel(null)} direction="bottom">
          <DrawerContent className="max-h-[86vh] border-border/50 bg-background/95 backdrop-blur-xl">
            <DrawerHeader className="border-b border-border/30 pb-3 text-left">
              <DrawerTitle className="font-mono text-sm uppercase tracking-[0.22em] text-primary">
                {activePanelTitle}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Storyforge side panel
              </DrawerDescription>
            </DrawerHeader>
            {activePanelBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={activePanel !== null} onOpenChange={(open) => !open && setActivePanel(null)}>
          <DialogContent className="grid max-h-[min(82vh,760px)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden border-border/45 bg-background/95 p-0 shadow-[0_32px_110px_-60px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:max-w-[min(760px,calc(100vw-3rem))] lg:max-w-[880px]">
            <DialogHeader className="border-b border-border/30 px-5 py-4 pr-12 text-left">
              <DialogTitle className="font-mono text-sm uppercase tracking-[0.22em] text-primary">
                {activePanelTitle}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Storyforge side panel
              </DialogDescription>
            </DialogHeader>
            {activePanelBody}
          </DialogContent>
        </Dialog>
      )}
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
  onOpenPanel: (panel: ShellPanel) => void
}) {
  const genreConfig = getStateGenreConfig(state)
  const genreName = genreConfig?.name ?? state.meta.genreId

  return (
    <header className="shrink-0 px-3 py-2 md:px-5 md:py-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/45 bg-card/70 px-3 py-2 shadow-[0_12px_48px_-36px_rgba(0,0,0,0.9)] md:px-5 md:py-2.5 xl:grid-cols-[minmax(270px,340px)_minmax(620px,1fr)_minmax(300px,360px)] xl:gap-4 xl:px-0 xl:py-0">
        <div className="hidden min-w-0 flex-col xl:flex xl:px-5 xl:py-2.5">
          <span className="truncate font-mono text-[12px] uppercase tracking-[0.28em] text-primary">{genreName}</span>
          <span className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            {state.player.origin.name} / {state.player.class.name}
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-center xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-3 xl:py-2.5">
          <span className="mb-0.5 truncate text-center font-mono text-[9px] uppercase tracking-[0.16em] text-primary/70 xl:hidden">
            {genreName} · Ch.{String(state.meta.currentChapter).padStart(2, '0')}
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 xl:inline">
            Ch.{String(state.meta.currentChapter).padStart(2, '0')}
          </span>
          <span className="truncate text-center text-[12px] font-medium tracking-[0.03em] text-foreground [text-wrap:balance] md:text-sm xl:overflow-visible xl:text-clip xl:whitespace-normal">
            {state.chapter.title || 'Chapter setup pending'}
          </span>
          <span className="hidden text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 xl:inline">
            Turn {chapterTurnCount}
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 xl:min-w-0 xl:px-5 xl:py-2.5">
          <div className="flex items-center gap-1 xl:hidden">
            <MobilePanelButton label="PC" icon={<UserRound className="h-4 w-4" />} onClick={() => onOpenPanel('character')} />
            <MobilePanelButton label="Scene" icon={<MapIcon className="h-4 w-4" />} onClick={() => onOpenPanel('scene')} />
            <MobilePanelButton label="Intel" icon={<BookOpen className="h-4 w-4" />} onClick={() => onOpenPanel('intel')} />
          </div>
          <button
            type="button"
            onClick={() => onOpenPanel('diagnostics')}
            className={cn(
              'inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-[color,transform] hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96] sm:px-3',
              busy ? 'text-warning hover:text-warning' : 'text-muted-foreground',
            )}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">{busy ? 'Syncing' : 'Menu'}</span>
          </button>
        </div>
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
      className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-border/50 bg-card/55 px-2 text-muted-foreground transition-[border-color,color,transform] hover:border-primary/55 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96]"
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
      'rounded-xl border border-border/25 bg-card/70 p-4 shadow-[0_16px_54px_-42px_rgba(0,0,0,0.85)]',
      className,
    )}>
      <div className="mb-3 flex min-h-4 items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function CharacterPanel({ state, statLabels }: { state: Sf2State; statLabels: StatLabels }) {
  const genreConfig = getStateGenreConfig(state)
  const hpPct = state.player.hp.max > 0
    ? Math.max(0, Math.min(100, (state.player.hp.current / state.player.hp.max) * 100))
    : 0

  return (
    <HudPanel
      title={state.player.class.name}
      right={<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">Lv.{state.player.level}</span>}
    >
      <div className="space-y-4">
        <div>
          <div className="truncate text-[18px] font-semibold tracking-normal text-foreground">
            {state.player.name}
          </div>
          <div className="mt-1 truncate text-sm text-muted-foreground">
            {genreConfig?.name ?? state.meta.genreId} / {state.player.origin.name}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric value={`${state.player.hp.current}/${state.player.hp.max}`} label={statLabels.hp} />
          <Metric value={String(state.player.ac)} label={statLabels.defense} />
          <Metric value={String(state.player.credits)} label={statLabels.currency} />
          <Metric value={String(state.player.inspiration)} label={statLabels.inspiration} accent />
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-border/30 bg-background/70">
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
      <div className={cn('truncate font-mono text-[18px] font-medium tabular-nums', accent ? 'text-warning' : 'text-foreground')}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/75">
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
        <span className="rounded-md border border-primary/70 bg-primary/10 px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.16em] text-primary">
          {plan.status ?? 'active'}
        </span>
      }
    >
      <div className="space-y-3">
        {plan.name && (
          <div className="text-sm font-medium tracking-normal text-foreground/90">
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

type InventoryDisplayDetails = {
  description?: string
  modifiers: string[]
  quantityLabel?: string
}

const INLINE_GEAR_MODIFIER_MAX_LENGTH = 14

function getSelectedPlaybook(state: Sf2State) {
  const config = getGenreConfig(state.meta.genreId as Genre)
  const playbooks = config.playbooks?.[state.meta.originId] ?? config.classes

  return playbooks.find((playbook) => playbook.id === state.meta.playbookId || playbook.name === state.player.class.name)
}

function getInventoryDisplayDetails(state: Sf2State, item: Sf2State['player']['inventory'][number]): InventoryDisplayDetails {
  const configItem = getSelectedPlaybook(state)?.startingInventory.find((candidate) => candidate.name === item.name)
  const looseItem = item as Record<string, unknown>
  const description = typeof looseItem.description === 'string' ? looseItem.description : configItem?.description
  const damage = typeof looseItem.damage === 'string' ? looseItem.damage : configItem?.damage
  const effect = typeof looseItem.effect === 'string' ? looseItem.effect : configItem?.effect
  const configCharges = configItem?.charges
  const configMaxCharges = configItem?.maxCharges
  const configQuantity = configItem?.quantity
  const looseCharges = typeof looseItem.charges === 'number' ? looseItem.charges : undefined
  const looseMaxCharges = typeof looseItem.maxCharges === 'number' ? looseItem.maxCharges : undefined
  const chargeCountMirrorsQuantity = (
    typeof configCharges === 'number'
    && typeof configMaxCharges === 'number'
    && configQuantity === configMaxCharges
    && looseCharges === undefined
  )
  const charges = chargeCountMirrorsQuantity ? item.qty : looseCharges ?? configCharges
  const maxCharges = looseMaxCharges ?? configMaxCharges
  const chargeLabel = typeof charges === 'number'
    ? `Charges ${charges}/${typeof maxCharges === 'number' ? maxCharges : charges}`
    : null
  const showEffectModifier = Boolean(effect && !descriptionContainsQualifier(description, effect))
  const modifiers = [
    damage ?? null,
    showEffectModifier ? effect : null,
    chargeLabel,
  ].filter((modifier): modifier is string => Boolean(modifier))
  const quantityLabel = item.qty > 1 && !chargeCountMirrorsQuantity ? `${item.qty}x` : undefined

  return { description, modifiers, quantityLabel }
}

function descriptionContainsQualifier(description: string | undefined, qualifier: string): boolean {
  if (!description) return false
  const normalizedDescription = normalizeInventoryQualifier(description)
  const normalizedQualifier = normalizeInventoryQualifier(qualifier)
  return normalizedQualifier.length > 2 && normalizedDescription.includes(normalizedQualifier)
}

function normalizeInventoryQualifier(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\b(heals?|restores?|healing|hp|when|applied)\b/g, '')
    .replace(/[^a-z0-9+]+/g, '')
}

function QuickSlotsPanel({ state }: { state: Sf2State }) {
  const items = state.player.inventory

  return (
    <HudPanel title="Gear">
      {items.length > 0 ? (
        <div className={cn(
          'space-y-2',
          items.length > 5 && 'max-h-[18rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]',
        )}>
          {items.map((item, index) => {
            const details = getInventoryDisplayDetails(state, item)
            const primaryModifier = details.modifiers[0]
            const inlineModifier = primaryModifier && isCompactGearModifier(primaryModifier) ? primaryModifier : undefined
            const metadataModifiers = inlineModifier ? details.modifiers.slice(1) : details.modifiers
            const hasMetadata = Boolean(details.quantityLabel || metadataModifiers.length > 0)

            return (
              <div
                key={`${item.name}-${index}`}
                className="rounded-lg bg-background/50 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="w-5 shrink-0 pt-0.5 font-mono text-[10px] tracking-[0.18em] text-muted-foreground/60">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className={cn('min-w-0 flex-1 truncate', sidebarTitleTextClassName)}>
                        {item.name}
                      </div>
                      {inlineModifier && (
                        <GearModifierChip label={inlineModifier} />
                      )}
                    </div>
                    {details.description && (
                      <div className={cn('mt-1 line-clamp-2', sidebarBodyTextClassName)}>
                        {details.description}
                      </div>
                    )}
                    {hasMetadata && (
                      <div className="mt-2 flex min-w-0 flex-wrap gap-1">
                        {details.quantityLabel && (
                          <span className="inline-flex max-w-full rounded border border-current/25 px-1.5 py-0.5 font-mono text-[10px] uppercase leading-4 tracking-[0.14em] text-muted-foreground [overflow-wrap:anywhere]">
                            {details.quantityLabel}
                          </span>
                        )}
                        {metadataModifiers.map((modifier) => (
                          <GearModifierChip key={modifier} label={modifier} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyLine text="No gear yet." />
      )}
    </HudPanel>
  )
}

function isCompactGearModifier(label: string): boolean {
  return label.length <= INLINE_GEAR_MODIFIER_MAX_LENGTH && !label.includes(',')
}

function GearModifierChip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-primary/90 [overflow-wrap:anywhere]">
      {label}
    </span>
  )
}

function PlaybookSkillPanel({ state }: { state: Sf2State }) {
  const trait = state.player.traits[0]

  if (!trait) {
    return null
  }

  const uses = trait.uses
    ? `${trait.uses.current}/${trait.uses.max}`
    : null
  const configTrait = getSelectedPlaybook(state)?.trait
  const looseTrait = trait as Record<string, unknown>
  const description = typeof looseTrait.description === 'string' ? looseTrait.description : configTrait?.description

  return (
    <HudPanel
      title="Playbook Skill"
      right={uses && (
        <span className="rounded border border-primary/70 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary tabular-nums">
          {uses}
        </span>
      )}
    >
      <div className="rounded-md border border-border/30 bg-background/45 px-3 py-2.5">
        <div className={sidebarTitleTextClassName}>
          {trait.name}
        </div>
        {description && (
          <div className={cn('mt-1.5 line-clamp-3', sidebarBodyTextClassName)}>
            {description}
          </div>
        )}
        {!uses && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Always available
          </div>
        )}
      </div>
    </HudPanel>
  )
}

function LocationsPanel({ state }: { state: Sf2State }) {
  const currentChapter = state.meta.currentChapter
  const currentLocationId = state.world.currentLocation.id || state.world.sceneSnapshot.location.id
  const locationMap = new Map<string, Sf2State['world']['currentLocation']>()

  const addLocation = (location: Sf2State['world']['currentLocation']) => {
    if (!location.id) return
    const semanticKey = normalizedLocationDisplayKey(location)
    const existing = locationMap.get(semanticKey)
    if (!existing || location.id === currentLocationId) {
      locationMap.set(semanticKey, location)
    }
  }

  for (const location of Object.values(state.campaign.locations)) {
    addLocation(location)
  }
  if (state.world.currentLocation.id) {
    addLocation(state.world.currentLocation)
  }
  if (state.world.sceneSnapshot.location.id) {
    addLocation(state.world.sceneSnapshot.location)
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
    <HudPanel title="Locations">
      {locations.length > 0 ? (
        <div className={cn(
          'space-y-2.5',
          locations.length > 3 && 'max-h-[14.75rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]',
        )}>
          {locations.map((location) => {
            const here = location.id === currentLocationId
            const tag = location.atmosphericConditions?.[0]
            return (
              <div key={location.id} className={cn(
                'relative min-h-[72px] overflow-hidden rounded-lg border px-3 py-2.5',
                here
                  ? 'border-border/25 bg-primary/10 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary/70'
                  : 'border-border/25 bg-background/45',
              )}>
                <div className="flex min-w-0 items-center gap-2">
                  {here && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_12px_-3px] shadow-primary" />}
                  <span className={cn('min-w-0 flex-1 truncate', sidebarTitleTextClassName)}>
                    {location.name || location.id.replace(/_/g, ' ')}
                  </span>
                  {here && <LocationChip tone="primary" label="HERE" />}
                  {location.locked && <LocationChip tone="muted" label="LOCKED" />}
                </div>
                {tag && (
                  <div className={cn('mt-1.5 line-clamp-1', sidebarBodyTextClassName)}>
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

function normalizedLocationDisplayKey(location: Sf2State['world']['currentLocation']) {
  return canonicalLocationNameKey(location.name || location.id)
}

function canonicalLocationNameKey(name: string) {
  const normalized = name
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  const tokens = normalized.split(' ').filter(Boolean)
  const bayMatch = normalized.match(/\bbay\s*0*(\d+)\b/)
  const berthMatch = normalized.match(/\b(berth|dock|pier|gate)\s*0*(\d+)\s*([a-z])?\b/)

  if (bayMatch) {
    const bayNumber = bayMatch[1]
    const context = [...new Set(tokens.filter((token) => {
      return token !== 'bay' &&
        token !== bayNumber &&
        token !== 'station' &&
        token !== 'exterior' &&
        !/^\d+$/.test(token)
    }))].sort().join(' ')
    const exterior = tokens.includes('exterior') ? ':exterior' : ''
    return `bay:${bayNumber}${exterior}:${context}`
  }

  if (berthMatch) {
    const [, kind, number, suffix = ''] = berthMatch
    const berthIndex = tokens.findIndex((token, index) => {
      return token === kind && tokens[index + 1]?.replace(/^0+/, '') === number
    })
    const contextTokens = berthIndex > 0 ? tokens.slice(0, berthIndex) : tokens
    const context = [...new Set(contextTokens.filter((token) => {
      return token !== 'station' && token !== kind && token !== number && token !== suffix
    }))].sort().join(' ')

    return `${kind}:${number}${suffix}:${context}`
  }

  return [...new Set(tokens)].sort().join(' ')
}

function LocationChip({ label, tone }: { label: string; tone: 'primary' | 'muted' }) {
  return (
    <span className={cn(
      'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
      tone === 'primary'
        ? 'border-primary/70 bg-primary/10 text-primary'
        : 'border-border/30 bg-background/60 text-muted-foreground',
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
            <div key={npc.id} className="rounded-md border border-border/30 bg-background/45 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dispositionDotClass(npc.disposition))} />
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate', sidebarTitleTextClassName)}>{npc.name}</div>
                  {npc.affiliation && (
                    <div className={cn('mt-0.5 truncate', sidebarBodyTextClassName)}>
                      {npc.affiliation}
                    </div>
                  )}
                </div>
                <span className="shrink-0 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {npc.disposition}
                </span>
              </div>
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
  pressureProjection,
  closeReadiness,
}: {
  pressureProjection: ChapterPressureProjection
  closeReadiness: Sf2CloseReadinessView
}) {
  const fired = pressureProjection.ladderFiredCount
  const total = pressureProjection.ladderStepCount
  const steps = pressureProjection.ladderSteps
  const activeStep = pressureProjection.activeStep

  return (
    <HudPanel
      title="Pressure"
      right={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/45 bg-warning/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-warning tabular-nums">
          <Activity className="h-3 w-3" />
          {total > 0 ? `${fired}/${total}` : '0/0'}
        </span>
      }
    >
      <div className="space-y-3">
        <div>
          <div className={sidebarTitleTextClassName}>
            {pressureProjection.faceName}
          </div>
          {activeStep && (
            <div className={cn('mt-1', sidebarBodyTextClassName)}>
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
  return (
    <HudPanel
      title="Intel / Case Board"
      className="flex max-h-[42vh] min-h-0 flex-col overflow-hidden xl:max-h-none xl:flex-1"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {threads.length > 0 ? threads.map((thread) => {
          const clues = Object.values(state.campaign.clues)
            .filter((clue) => clue.anchoredTo.includes(thread.id))
            .filter((clue) => clue.chapterCreated === currentChapter)
            .slice(0, 3)
          const pressureRole = thread.id === state.chapter.setup.spineThreadId
            ? 'spine'
            : thread.loadBearing || state.chapter.setup.loadBearingThreadIds.includes(thread.id)
              ? 'pressure'
              : null
          const evidenceLabel = clues.length > 0
            ? `${clues.length} clue${clues.length === 1 ? '' : 's'}`
            : 'lead'
          return (
            <div key={thread.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={sidebarTitleTextClassName}>
                  {thread.title}
                </span>
                <span className="inline-flex flex-wrap gap-1.5">
                  {pressureRole && <IntelBadge tone="pressure" label={pressureRole} />}
                  <IntelBadge tone={clues.length > 0 ? 'evidence' : 'lead'} label={evidenceLabel} />
                </span>
              </div>
              <div className="space-y-1">
                {clues.length > 0 ? clues.map((clue) => (
                  <ClueRow key={clue.id} tone="evidence">
                    {clue.content}
                  </ClueRow>
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
          <div className="space-y-2 border-t border-border/30 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Floating clues
            </div>
            {floatingClues.map((clue) => (
              <ClueRow key={clue.id} tone="floating">
                {clue.content}
              </ClueRow>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  )
}

function ClueRow({ children, tone }: { children: ReactNode; tone: 'evidence' | 'floating' }) {
  return (
    <div className={cn(
      'grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md bg-background/35 px-2 py-1.5 text-foreground/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]',
      sidebarBodyTextClassName,
    )}>
      <span className={cn(
        'mt-1.5 h-1.5 w-1.5 rounded-full',
        tone === 'evidence' ? 'bg-success/70' : 'bg-primary/70',
      )} />
      <span>{children}</span>
    </div>
  )
}

function IntelBadge({ tone, label }: { tone: 'pressure' | 'evidence' | 'lead'; label: string }) {
  return (
    <span className={cn(
      'rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
      tone === 'pressure' && 'border-primary/55 bg-primary/10 text-primary',
      tone === 'evidence' && 'border-success/40 bg-success/10 text-success',
      tone === 'lead' && 'border-border/25 bg-background/45 text-muted-foreground',
    )}>
      {label}
    </span>
  )
}

function TurnStream({
  state,
  prose,
  activePlayerInput,
  liveRolls,
  inspirationOffer,
  rollModifier,
  effectiveDc,
  inspirationRemaining,
  rollBusy,
  rollLogByTurn,
  locationByTurn,
  isStreaming,
  isGeneratingChapter,
  generationElapsed,
  isArchiving,
  chapterTurnCount,
  onResolvePendingCheck,
  onSpendInspiration,
  onDeclineInspiration,
}: {
  state: Sf2State
  prose: string
  activePlayerInput: string
  liveRolls: Sf2LiveRollView[]
  inspirationOffer: Sf2RollOutcomeView | null
  rollModifier: number | null
  effectiveDc: number | null
  inspirationRemaining: number
  rollBusy: boolean
  rollLogByTurn: Map<number, Sf2State['history']['rollLog']>
  locationByTurn: Map<number, string>
  isStreaming: boolean
  isGeneratingChapter: boolean
  generationElapsed: number
  isArchiving: boolean
  chapterTurnCount: number
  onResolvePendingCheck: () => void
  onSpendInspiration: () => void
  onDeclineInspiration: () => void
}) {
  const turns = state.history.turns.filter((turn) => turn.chapter === state.meta.currentChapter)
  const showLiveTurn = Boolean(activePlayerInput || prose || isStreaming || isGeneratingChapter || isArchiving)
  const liveTurnNumber = state.history.turns.length + 1
  const liveLocation = state.world.sceneSnapshot.location.name || state.world.currentLocation.name
  const rollPauseActive = liveRolls.some((roll) => !roll.outcome)

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col justify-end space-y-6">
      {turns.length === 0 && !prose && !isGeneratingChapter && (
        <div className="rounded-r-lg border-l border-primary/30 bg-card/35 py-5 pl-5 pr-5 text-foreground">
          <p className="text-sm leading-relaxed text-muted-foreground" style={{ fontFamily: 'var(--font-narrative)' }}>
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
          <NarrativeWithRolls
            prose={turn.narratorProse}
            rollCards={(rollLogByTurn.get(turn.index) ?? []).map((roll, index) => ({
              id: `${turn.index}-${index}`,
              proseOffset: roll.proseOffset,
              node: <HistoryRollCard roll={roll} />,
            }))}
          />
          <StateDiffLine turnIndex={turn.index} diff={turn.stateDiff} />
        </div>
      ))}

      {showLiveTurn && (
        <div className="space-y-4">
          {activePlayerInput && (
            <>
              <SceneMarker turn={liveTurnNumber} location={liveLocation} />
              <PlayerMessage>{activePlayerInput}</PlayerMessage>
            </>
          )}
          {(prose || liveRolls.length > 0) && (
            <NarrativeWithRolls
              prose={prose}
              live
              trailing={isStreaming && !rollPauseActive ? <span className="animate-pulse text-primary"> |</span> : undefined}
              rollCards={liveRolls.map((roll, index) => ({
                id: roll.id,
                proseOffset: roll.proseOffset,
                node: (
                  <DiceTray
                    pendingCheck={roll.check}
                    rollResult={roll.outcome ?? null}
                    inspirationOffer={index === liveRolls.length - 1 ? inspirationOffer : null}
                    modifier={rollModifier}
                    effectiveDc={effectiveDc}
                    inspirationRemaining={inspirationRemaining}
                    busy={rollBusy}
                    onRoll={onResolvePendingCheck}
                    onSpendInspiration={onSpendInspiration}
                    onDeclineInspiration={onDeclineInspiration}
                  />
                ),
              }))}
            />
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

function NarrativeWithRolls({
  prose,
  rollCards,
  live,
  trailing,
}: {
  prose: string
  rollCards: Array<{ id: string; proseOffset?: number; node: ReactNode }>
  live?: boolean
  trailing?: ReactNode
}) {
  const ordered = [...rollCards].sort((a, b) => {
    const aOffset = typeof a.proseOffset === 'number' ? a.proseOffset : -1
    const bOffset = typeof b.proseOffset === 'number' ? b.proseOffset : -1
    return aOffset - bOffset
  })
  const nodes: ReactNode[] = []
  let cursor = 0

  ordered.forEach((roll, index) => {
    const hasOffset = typeof roll.proseOffset === 'number'
    const offset = hasOffset
      ? Math.max(cursor, Math.min(prose.length, roll.proseOffset as number))
      : cursor
    const before = prose.slice(cursor, offset)
    if (before) {
      nodes.push(
        <GMMessage key={`prose-${roll.id}`} live={live}>
          {before}
        </GMMessage>
      )
    }
    nodes.push(
      <div key={`roll-${roll.id}`} className="py-0.5">
        {roll.node}
      </div>
    )
    cursor = hasOffset ? offset : cursor
    if (!hasOffset && index === ordered.length - 1 && cursor === 0) {
      cursor = 0
    }
  })

  const after = prose.slice(cursor)
  if (after || trailing) {
    nodes.push(
      <GMMessage key="prose-final" live={live} trailing={trailing}>
        {after}
      </GMMessage>
    )
  }

  return <>{nodes}</>
}

function SceneMarker({ turn, location }: { turn: number; location?: string }) {
  return (
    <div className="flex items-center gap-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/65">
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
      <span className="inline-flex max-w-[70%] min-w-0 items-center gap-2">
        <span className="tabular-nums">Turn {turn}</span>
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

function renderNarrativeInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let buffer = ''
  let cursor = 0
  let key = 0

  const flushBuffer = () => {
    if (!buffer) return
    nodes.push(buffer)
    buffer = ''
  }

  while (cursor < text.length) {
    if (text.startsWith('**', cursor)) {
      const end = text.indexOf('**', cursor + 2)
      if (end > cursor + 2) {
        flushBuffer()
        nodes.push(<strong key={`strong-${key++}`} className="font-semibold text-foreground">{text.slice(cursor + 2, end)}</strong>)
        cursor = end + 2
        continue
      }
    }

    if (text[cursor] === '*' && text[cursor + 1] !== '*') {
      const end = text.indexOf('*', cursor + 1)
      if (end > cursor + 1) {
        flushBuffer()
        nodes.push(<em key={`em-${key++}`} className="italic">{text.slice(cursor + 1, end)}</em>)
        cursor = end + 1
        continue
      }
    }

    buffer += text[cursor]
    cursor += 1
  }

  flushBuffer()
  return nodes
}

function GMMessage({ children, live, trailing }: { children: ReactNode; live?: boolean; trailing?: ReactNode }) {
  return (
    <div
      className={cn(
        'whitespace-pre-wrap rounded-r-lg border-l border-primary/30 bg-card/35 py-4 pl-5 pr-5 text-foreground md:py-5 md:pl-6 md:pr-6',
        live && 'border-primary/40 bg-card/45',
      )}
      style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)', lineHeight: 1.7 }}
    >
      {typeof children === 'string' ? renderNarrativeInline(children) : children}
      {trailing}
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
      <span className="text-muted-foreground tabular-nums">turn {turnIndex + 1}</span>
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

interface RollBreakdownView {
  value: ReactNode
  detail?: ReactNode
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
      return 'Critical'
    case 'success':
      return 'Success'
    case 'failure':
      return 'Failure'
    case 'fumble':
      return 'Fumble'
    default:
      return ''
  }
}

function rollCardClassName(tone: RollTone, interactive = false) {
  return cn(
    'rounded-xl px-3 py-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 md:px-4 md:py-4',
    tone === 'idle' && 'sf2-roll-idle-card border border-primary/45',
    tone === 'success' && 'bg-success/10',
    tone === 'failure' && 'bg-warning/10',
    tone === 'critical' && 'bg-warning/15',
    tone === 'fumble' && 'bg-severe/10',
    interactive && 'w-full cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100',
  )
}

function rollValueBoxClassName(tone: RollTone, rolling = false) {
  return cn(
    'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border font-mono tabular-nums transition-[background-color,border-color,color,opacity,transform] duration-200 md:h-[4.5rem] md:w-[4.5rem]',
    tone === 'idle' && 'sf2-roll-idle-die',
    tone === 'success' && 'border-success/60 bg-success/15 text-success',
    tone === 'failure' && 'border-warning/60 bg-warning/15 text-warning',
    tone === 'critical' && 'border-warning/70 bg-warning/20 text-warning',
    tone === 'fumble' && 'border-severe/65 bg-severe/15 text-severe',
    rolling && 'shadow-[0_0_22px_-10px_currentColor]',
  )
}

function rollToneTextClassName(tone: RollTone) {
  return cn(
    'font-bold',
    tone === 'idle' && 'text-primary',
    tone === 'critical' && 'text-warning',
    tone === 'success' && 'text-success',
    tone === 'failure' && 'text-warning',
    tone === 'fumble' && 'text-severe',
  )
}

function RollCardView({
  tone,
  title,
  reason,
  dc,
  roll,
  actionLabel,
  rolling,
  disabled,
  onClick,
}: {
  tone: RollTone
  title: string
  reason?: string
  dc: number | null
  roll: RollBreakdownView
  actionLabel?: string
  rolling?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const resolved = tone !== 'idle'
  const content = (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="min-w-0">
        {resolved && (
          <div className="mb-1 font-mono text-[10px] tracking-[0.08em] text-foreground/65">
            {title}
          </div>
        )}
        <div className={cn(
          'font-mono leading-none',
          resolved
            ? cn('text-[22px] font-semibold md:text-[25px]', rollToneTextClassName(tone))
            : 'text-[20px] font-semibold text-primary md:text-[24px]',
        )}>
          {resolved ? rollResultLabel(tone) : title}
        </div>
        {reason && (
          <p className="mt-3 max-w-[32rem] text-sm font-normal leading-snug text-foreground/85 [text-wrap:pretty]" style={{ fontFamily: 'var(--font-narrative)' }}>
            {reason}
          </p>
        )}
      </div>

      <div className={cn('grid grid-cols-[auto_auto_auto] items-center justify-start gap-2.5 md:justify-end md:gap-3', rollToneTextClassName(tone))}>
        <RollValueBox tone={tone} value={dc !== null ? `DC ${dc}` : 'DC -'} />
        <div className="font-mono text-xl font-bold uppercase md:text-2xl">vs</div>
        <RollValueBox tone={tone} value={roll.value} detail={roll.detail} rolling={rolling} />
      </div>

      {actionLabel && (
        <div className="sf2-roll-idle-cta flex min-h-8 items-center justify-center rounded-md border px-3 py-1.5 text-center font-mono text-[11px] tracking-[0.08em] md:col-span-2 md:mx-auto md:w-[64%]">
          {actionLabel}
        </div>
      )}
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

function RollValueBox({
  tone,
  value,
  detail,
  rolling,
}: {
  tone: RollTone
  value: ReactNode
  detail?: ReactNode
  rolling?: boolean
}) {
  return (
    <div className={rollValueBoxClassName(tone, rolling)}>
      <div className="font-mono text-[18px] font-bold leading-none tabular-nums md:text-[20px]">
        <span className={cn(rolling && 'animate-pulse')}>{value}</span>
      </div>
      {detail && (
        <div className="mt-1.5 font-mono text-[11px] font-semibold leading-none opacity-85 tabular-nums md:text-[12px]">
          {detail}
        </div>
      )}
    </div>
  )
}

function rollBreakdownDetail(roll: number, modifier: number, rawRolls?: number[]) {
  const raw = rawRolls && rawRolls.length > 1
    ? rawRolls.join('/')
    : String(roll)
  return `${raw} ${formatSigned(modifier)}`
}

function HistoryRollCard({ roll }: { roll: Sf2State['history']['rollLog'][number] }) {
  const tone = rollToneForHistory(roll.outcome)
  const dc = roll.effectiveDc ?? roll.dc
  const total = roll.rollResult + roll.modifier

  return (
    <RollCardView
      tone={tone}
      title={`${roll.skill} Check`}
      reason={roll.consequenceSummary}
      dc={dc}
      roll={{ value: total, detail: rollBreakdownDetail(roll.rollResult, roll.modifier, roll.rawRolls) }}
    />
  )
}

function parseSuggestedAction(action: string) {
  const match = action.match(/\s*\[([^\]]+)\]\s*$/)
  if (!match) return { text: action, rollType: null as string | null }
  const rollType = match[1].split(',')[0]?.trim() || match[1].trim()

  return {
    text: action.slice(0, match.index).trim(),
    rollType,
  }
}

function ActionSurface(props: {
  state: Sf2State
  suggestedActions: string[]
  pendingInput: string
  pendingCheck: Sf2PendingCheckView | null
  busy: boolean
  chapterTurnCount: number
  closeReadiness: Sf2CloseReadinessView
  hasActiveRoll: boolean
  onPendingInputChange: (value: string) => void
  onSendTurn: (input: string) => void
  onCloseChapter: () => void
}) {
  const {
    state,
    suggestedActions,
    pendingInput,
    busy,
    chapterTurnCount,
    closeReadiness,
    hasActiveRoll,
    onPendingInputChange,
    onSendTurn,
    onCloseChapter,
  } = props
  const initialTurn = chapterTurnCount === 0

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-2 pb-[max(0px,env(safe-area-inset-bottom))]">
      {closeReadiness.closeReady && !busy && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/45 bg-warning/10 px-4 py-3 text-warning md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.18em]">Chapter ready to close</div>
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
            className="rounded-lg border border-warning/55 bg-warning/15 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-warning transition-[background-color,transform] hover:bg-warning/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warning/65 active:scale-[0.96]"
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
        <div className="rounded-lg border border-border/50 bg-background/45 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Spine pressure shifted to {state.campaign.threads[closeReadiness.promotedSpineThreadId]?.title ?? closeReadiness.promotedSpineThreadId}.
        </div>
      )}

      {!hasActiveRoll && suggestedActions.length > 0 && !busy && !initialTurn && (
        <div className="space-y-1.5">
          {suggestedActions.map((action, index) => {
            const parsed = parseSuggestedAction(action)

            return (
              <button
                key={`${action}-${index}`}
                type="button"
                onClick={() => onPendingInputChange(action)}
                className="sf2-action-enter grid w-full grid-cols-[76px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border/50 bg-card/75 px-3 py-2.5 text-left transition-[background-color,border-color,transform] hover:border-primary/55 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96] md:grid-cols-[104px_minmax(0,1fr)] md:px-5"
                style={{ '--sf2-action-delay': `${index * 70}ms` } as CSSProperties}
              >
                <span className={cn(
                  'line-clamp-2 font-mono text-[10px] uppercase leading-snug tracking-[0.16em]',
                  parsed.rollType ? 'text-primary/75' : 'text-muted-foreground/55',
                )}>
                  {parsed.rollType ?? 'Action'}
                </span>
                <span className="text-[14px] leading-snug text-foreground">{parsed.text}</span>
              </button>
            )
          })}
        </div>
      )}

      {initialTurn ? (
        <button
          type="button"
          onClick={() => onSendTurn('')}
          disabled={busy}
          className="w-full rounded-lg border border-primary/70 bg-primary/15 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-primary transition-[background-color,transform] hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
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
  const pendingRollValue = pendingUsesTwoDice
    ? (display !== null && display2 !== null ? `${display}/${display2}` : '2d20')
    : (display ?? 'd20')
  const rollValue = result
    ? result.total
    : pendingRollValue
  const rollDetail = result
    ? rollBreakdownDetail(result.d20, result.modifier, result.rawRolls)
    : (resolvedModifier !== null ? formatSigned(resolvedModifier) : undefined)

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
    <div className="mx-auto w-full max-w-[760px]">
      <RollCardView
        tone={tone}
        title={title}
        reason={pendingCheck?.why}
        dc={resolvedDc}
        roll={{ value: rollValue, detail: rollDetail }}
        actionLabel={!result ? (isRolling ? 'Rolling...' : 'Tap to roll') : undefined}
        rolling={isRolling}
        disabled={busy || isRolling}
        onClick={!result && pendingCheck ? handleRoll : undefined}
      />

      {inspirationOffer && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-info/35 bg-background/55 px-3 py-3 text-info md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.16em]">Spend inspiration?</div>
            <div className="mt-1 text-[12px] text-info/80">
              Reroll this failed check. Inspiration remaining: {inspirationRemaining}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSpendInspiration}
              className="rounded-lg border border-info/55 bg-info/15 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-info transition-[background-color,transform] hover:bg-info/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-info/65 active:scale-[0.96]"
            >
              Spend
            </button>
            <button
              type="button"
              onClick={onDeclineInspiration}
              className="rounded-lg border border-border/50 bg-background/45 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-[color,transform] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96]"
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value, placeholder])

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-background/70 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:px-5',
        disabled ? 'border-border/50 opacity-55' : 'border-primary/50 focus-within:border-primary/70',
      )}
    >
      <span className="font-mono text-sm leading-5 text-primary">&gt;</span>
      <textarea
        ref={textareaRef}
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
        className="min-h-8 flex-1 resize-none overflow-hidden bg-transparent py-1.5 font-mono text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/50 bg-primary/15 text-primary transition-[background-color,color,transform] hover:bg-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        aria-label="Submit command"
      >
        <Send className="h-4 w-4 translate-x-px -translate-y-[0.5px]" />
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
  pressureProjection: ChapterPressureProjection
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
    pressureProjection,
    closeReadiness,
    onCloseChapter,
    onResetCampaign,
    onDownloadSessionLog,
    onDownloadReplayFixture,
  } = props
  return (
    <div className="space-y-3">
      <PressurePanel pressureProjection={pressureProjection} closeReadiness={closeReadiness} />

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
          <div>Pressure fired: {pressureProjection.ladderFiredCount}/{pressureProjection.ladderStepCount}</div>
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
            <div key={`${entry.kind}-${entry.at}-${index}`} className="border-t border-border/30 pt-2">
              <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">{entry.kind}</div>
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
          className="inline-flex items-center justify-center gap-2 rounded border border-border/50 bg-card/55 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 md:col-span-2"
        >
          Back to v1
        </a>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/30 bg-background/45 px-2 py-2 text-center">
      <div className="font-mono text-lg text-foreground tabular-nums">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
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
      className="inline-flex items-center justify-center gap-2 rounded border border-border/50 bg-card/55 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/65 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {icon}
      {label}
    </button>
  )
}

function StatusLine({ tone, text, detail }: { tone: 'warning' | 'muted'; text: string; detail?: string }) {
  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 font-mono text-[12px] uppercase tracking-[0.16em]',
      tone === 'warning' ? 'border-warning/45 bg-warning/10 text-warning' : 'border-border/30 bg-card/45 text-muted-foreground',
    )}>
      <div>{text}</div>
      {detail && <div className="mt-1 normal-case tracking-normal text-muted-foreground">{detail}</div>}
    </div>
  )
}

function KeyValue({ label, value, muted }: { label: string; value?: string; muted?: boolean }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-sm leading-relaxed">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">{label}</div>
      <div className={muted ? 'text-foreground/65' : 'text-foreground/85'}>{value}</div>
    </div>
  )
}

function EmptyLine({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={cn(sidebarEmptyTextClassName, !compact && 'leading-normal')}>
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
