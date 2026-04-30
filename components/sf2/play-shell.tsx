'use client'

import {
  Activity,
  BookOpen,
  Database,
  Dices,
  FileDown,
  Map as MapIcon,
  Menu,
  RotateCcw,
  ScrollText,
  Send,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import type { computeSessionSummary } from '@/lib/sf2/instrumentation/session-summary'
import type { Sf2State } from '@/lib/sf2/types'

type SessionSummary = NonNullable<ReturnType<typeof computeSessionSummary>>
type DebugEntryView = { kind: string; at: number; data: unknown }
type TokenUsageView = {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

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
    document.body.setAttribute('data-genre', state.meta.genreId)
    return () => document.body.removeAttribute('data-genre')
  }, [state.meta.genreId])

  const rollLogByTurn = useMemo(() => {
    const map = new Map<number, Sf2State['history']['rollLog']>()
    for (const roll of state.history.rollLog) {
      const rolls = map.get(roll.turn) ?? []
      rolls.push(roll)
      map.set(roll.turn, rolls)
    }
    return map
  }, [state.history.rollLog])

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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_18%,oklch(0.72_0.15_195_/_0.07),transparent_34%),linear-gradient(90deg,transparent,oklch(0.72_0.15_195_/_0.03),transparent)]" />
      <div className="relative flex h-full min-w-0 flex-col">
        <TopBar
          state={state}
          chapterTurnCount={chapterTurnCount}
          busy={busy}
          onOpenPanel={setMobilePanel}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-3 pb-3 md:px-5 md:pb-5 xl:grid-cols-[minmax(270px,340px)_minmax(620px,1fr)_minmax(300px,360px)]">
          <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto pr-1 xl:flex">
            <CharacterPanel state={state} />
            <ObjectivePanel state={state} />
            <QuickSlotsPanel state={state} />
          </aside>

          <main className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/55 bg-background/70 shadow-[0_0_34px_-24px] shadow-primary">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6"
            >
              <TurnStream
                state={state}
                prose={prose}
                rollLogByTurn={rollLogByTurn}
                isStreaming={isStreaming}
                isGeneratingChapter={isGeneratingChapter}
                generationElapsed={generationElapsed}
                isArchiving={isArchiving}
                chapterTurnCount={chapterTurnCount}
              />
            </div>

            <div className="shrink-0 border-t border-border/50 bg-card/70 p-3 shadow-[0_-18px_32px_-30px] shadow-primary md:p-4">
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

          <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto pr-1 xl:flex">
            <ScenePanel state={state} />
            <PresentPanel state={state} />
            <PressurePanel state={state} closeReadiness={closeReadiness} />
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
                <CharacterPanel state={state} />
                <ObjectivePanel state={state} />
                <QuickSlotsPanel state={state} />
              </div>
            )}
            {mobilePanel === 'scene' && (
              <div className="space-y-3">
                <ScenePanel state={state} />
                <PresentPanel state={state} />
                <PressurePanel state={state} closeReadiness={closeReadiness} />
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
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)_minmax(300px,360px)] xl:gap-4">
        <div className="hidden items-center rounded-lg border border-primary/30 bg-card/45 px-5 py-2.5 shadow-[0_0_24px_-14px] shadow-primary xl:flex">
          <span className="font-mono text-[12px] uppercase tracking-[0.32em] text-primary">Storyforge</span>
        </div>

        <div className="min-w-0 rounded-lg border border-border/60 bg-card/55 px-4 py-2.5 shadow-[0_0_28px_-20px] shadow-primary">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
        </div>

        <div className="hidden min-w-0 items-center justify-end gap-2 xl:flex">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/45 bg-card/30 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Database className="h-3.5 w-3.5 text-primary/70" />
            Diagnostics in menu
          </div>
          <span className={cn(
            'rounded-lg border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em]',
            busy
              ? 'border-warning/45 bg-warning/10 text-warning'
              : 'border-success/40 bg-success/10 text-success',
          )}>
            {busy ? 'Syncing' : 'Ready'}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5 xl:hidden">
          <MobilePanelButton label="PC" icon={<UserRound className="h-4 w-4" />} onClick={() => onOpenPanel('character')} />
          <MobilePanelButton label="Scene" icon={<MapIcon className="h-4 w-4" />} onClick={() => onOpenPanel('scene')} />
          <MobilePanelButton label="Intel" icon={<BookOpen className="h-4 w-4" />} onClick={() => onOpenPanel('intel')} />
          <MobilePanelButton label="More" icon={<Menu className="h-4 w-4" />} onClick={() => onOpenPanel('diagnostics')} />
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
      'rounded-lg border border-border/40 bg-card/45 p-4 shadow-[0_0_24px_-22px] shadow-primary',
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

function CharacterPanel({ state }: { state: Sf2State }) {
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
          <Metric value={`${state.player.hp.current}/${state.player.hp.max}`} label="HP" />
          <Metric value={String(state.player.ac)} label="AC" />
          <Metric value={String(state.player.credits)} label="Cred" />
          <Metric value={String(state.player.inspiration)} label="Insp" accent />
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
        <span className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.16em] text-primary">
          {plan.status ?? 'active'}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-foreground/90">
          {plan.target || 'Operation plan'}
        </div>
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

function ScenePanel({ state }: { state: Sf2State }) {
  const location = state.world.sceneSnapshot.location.name || state.world.currentLocation.name || state.chapter.setup.openingSceneSpec.location
  const description = state.world.sceneSnapshot.location.description || state.world.currentLocation.description || state.chapter.setup.openingSceneSpec.initialState
  const time = state.world.sceneSnapshot.timeLabel || state.world.currentTimeLabel || state.meta.currentTimeLabel

  return (
    <HudPanel
      title="Scene"
      right={<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">live</span>}
    >
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[13px] uppercase tracking-[0.16em] text-foreground/90">
            {location || 'Unstaged location'}
          </div>
          {time && <div className="mt-1 text-[12px] text-muted-foreground">{time}</div>}
        </div>
        {description && (
          <p className="text-[12.5px] leading-relaxed text-muted-foreground/85">
            {description}
          </p>
        )}
        {state.world.sceneSnapshot.established.length > 0 && (
          <div className="space-y-1">
            {state.world.sceneSnapshot.established.slice(-3).map((fact) => (
              <div key={fact} className="rounded border border-border/35 bg-background/45 px-2 py-1.5 text-[12px] leading-snug text-foreground/80">
                {fact}
              </div>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
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
  const threadIds = unique([
    ...(state.chapter.setup.surfaceThreads ?? []),
    ...(state.chapter.setup.loadBearingThreadIds ?? []),
    ...(state.chapter.setup.activeThreadIds ?? []),
    ...Object.values(state.campaign.threads)
      .filter((thread) => thread.status === 'active')
      .map((thread) => thread.id),
  ])
  const threads = threadIds
    .map((id) => state.campaign.threads[id])
    .filter(Boolean)
    .slice(0, 5)
  const floatingClues = state.campaign.floatingClueIds
    .map((id) => state.campaign.clues[id])
    .filter(Boolean)
    .slice(0, 3)

  return (
    <HudPanel
      title="Intel / Case Board"
      className="min-h-0 flex-1 overflow-hidden"
      right={<span className="rounded-full border border-primary/45 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">{Object.keys(state.campaign.clues).length}</span>}
    >
      <div className="max-h-[42vh] space-y-4 overflow-y-auto pr-1 xl:max-h-none">
        {threads.length > 0 ? threads.map((thread) => {
          const clues = Object.values(state.campaign.clues)
            .filter((clue) => clue.anchoredTo.includes(thread.id))
            .slice(0, 3)
          return (
            <div key={thread.id} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/85">
                  {thread.title}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  tension {thread.tension}
                </span>
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

function TurnStream({
  state,
  prose,
  rollLogByTurn,
  isStreaming,
  isGeneratingChapter,
  generationElapsed,
  isArchiving,
  chapterTurnCount,
}: {
  state: Sf2State
  prose: string
  rollLogByTurn: Map<number, Sf2State['history']['rollLog']>
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
        <div className="rounded-r-lg border-l border-primary/35 bg-card/35 py-5 pl-5 pr-5 text-foreground shadow-[0_0_20px_-12px] shadow-primary/20">
          <p className="text-[15px] leading-relaxed text-muted-foreground" style={{ fontFamily: 'var(--font-narrative)' }}>
            {chapterTurnCount === 0
              ? 'Press begin when you are ready to open the chapter.'
              : 'The scene is quiet. Choose the next move.'}
          </p>
        </div>
      )}

      {turns.map((turn) => (
        <div key={turn.index} className="space-y-4">
          <SceneMarker label={`Turn ${turn.index + 1}`} />
          {turn.playerInput && <PlayerMessage>{turn.playerInput}</PlayerMessage>}
          {(rollLogByTurn.get(turn.index) ?? []).map((roll, index) => (
            <HistoryRollCard key={`${turn.index}-${index}`} roll={roll} />
          ))}
          <GMMessage>{turn.narratorProse}</GMMessage>
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

function SceneMarker({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/55">
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
      <span>{label}</span>
      <span className="flex-1 border-t border-dashed border-current opacity-40" />
    </div>
  )
}

function GMMessage({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <div
      className={cn(
        'whitespace-pre-wrap rounded-r-lg border-l border-primary/25 bg-card/35 py-4 pl-5 pr-5 text-foreground shadow-[0_0_20px_-12px] shadow-primary/15 md:py-5 md:pl-6 md:pr-6',
        live && 'border-primary/45 bg-primary/5',
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

function HistoryRollCard({ roll }: { roll: Sf2State['history']['rollLog'][number] }) {
  const success = roll.outcome === 'success' || roll.outcome === 'critical_success'
  const critical = roll.outcome === 'critical_success'
  const failure = roll.outcome === 'failure' || roll.outcome === 'critical_failure'
  const tone = critical ? 'warning' : success ? 'success' : failure ? 'destructive' : 'muted'

  return (
    <div className={cn(
      'border-y px-4 py-3 text-center shadow-[0_0_26px_-22px] md:px-7',
      tone === 'warning' && 'border-warning/45 bg-warning/10 text-warning',
      tone === 'success' && 'border-success/45 bg-success/10 text-success',
      tone === 'destructive' && 'border-destructive/45 bg-destructive/10 text-destructive',
      tone === 'muted' && 'border-border/45 bg-background/30 text-muted-foreground',
    )}>
      <div className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
        <Dices className="h-3.5 w-3.5" />
        <span>{roll.skill}</span>
        <span className="text-muted-foreground/60">/</span>
        <span>{roll.outcome.replace('_', ' ')}</span>
      </div>
      <div className="mt-2 font-mono text-[13px] text-foreground/80">
        d20 {roll.rollResult} {formatSigned(roll.modifier)} = {roll.rollResult + roll.modifier} vs DC {roll.effectiveDc ?? roll.dc}
        {roll.rawRolls && roll.rawRolls.length > 1 && (
          <span className="text-muted-foreground"> ({roll.rawRolls.join(', ')})</span>
        )}
      </div>
    </div>
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
  const result = rollResult
  const success = result?.result === 'success' || result?.result === 'critical'
  const failed = result?.result === 'failure' || result?.result === 'fumble'
  const tone = result?.result === 'critical' ? 'warning' : success ? 'success' : failed ? 'destructive' : 'primary'
  const title = pendingCheck?.skill ?? result?.skill ?? 'Skill Check'

  useEffect(() => {
    setDisplay(result?.d20 ?? null)
    setIsRolling(false)
  }, [result?.d20])

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
    }, 45)
    window.setTimeout(() => {
      window.clearInterval(interval)
      onRoll()
    }, 720)
  }

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 shadow-[0_0_26px_-20px] md:px-6',
      tone === 'primary' && 'border-primary/35 bg-primary/10 shadow-primary',
      tone === 'warning' && 'border-warning/45 bg-warning/10 shadow-warning',
      tone === 'success' && 'border-success/45 bg-success/10 shadow-success',
      tone === 'destructive' && 'border-destructive/45 bg-destructive/10 shadow-destructive',
    )}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
            <Dices className="h-4 w-4 text-primary" />
            <span className="text-foreground">{title}</span>
            {effectiveDc !== null && <span className="text-muted-foreground">DC {effectiveDc}</span>}
            {modifier !== null && <span className="text-muted-foreground">mod {formatSigned(modifier)}</span>}
            {pendingCheck?.modifierType && (
              <span className="rounded border border-current/25 px-1.5 py-0.5 text-primary">
                {pendingCheck.modifierType}
              </span>
            )}
          </div>
          {pendingCheck?.why && (
            <p className="text-[13px] leading-relaxed text-foreground/80" style={{ fontFamily: 'var(--font-narrative)' }}>
              {pendingCheck.why}
            </p>
          )}
          {pendingCheck?.consequenceOnFail && (
            <p className="text-[12px] italic leading-relaxed text-muted-foreground">
              On fail: {pendingCheck.consequenceOnFail}
            </p>
          )}
          {result && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em]">
              <span className={cn(
                result.result === 'critical' && 'text-warning',
                success && result.result !== 'critical' && 'text-success',
                failed && 'text-destructive',
              )}>
                {result.result}
              </span>
              <span className="text-muted-foreground">
                d20 {result.d20} {formatSigned(result.modifier)} = {result.total} vs DC {result.effectiveDc ?? result.dc}
              </span>
              {result.rawRolls && result.rawRolls.length > 1 && (
                <span className="text-muted-foreground">rolls {result.rawRolls.join(' / ')}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className={cn(
            'flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 font-mono text-4xl font-bold transition-colors',
            tone === 'primary' && 'border-primary/50 bg-background/60 text-primary',
            tone === 'warning' && 'border-warning/60 bg-warning/10 text-warning',
            tone === 'success' && 'border-success/60 bg-success/10 text-success',
            tone === 'destructive' && 'border-destructive/60 bg-destructive/10 text-destructive',
            isRolling && 'animate-pulse',
          )}>
            {display ?? 'd20'}
          </div>

          {!result && pendingCheck && (
            <button
              type="button"
              onClick={handleRoll}
              disabled={busy || isRolling}
              className="rounded-full border border-primary/75 px-6 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-primary shadow-[0_0_18px_-12px] shadow-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRolling ? 'Rolling...' : 'Roll d20'}
            </button>
          )}
        </div>
      </div>

      {inspirationOffer && (
        <div className="mt-3 flex flex-col gap-2 rounded border border-info/45 bg-info/10 px-3 py-3 text-info md:flex-row md:items-center md:justify-between">
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
              className="rounded border border-info/55 bg-info/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-info hover:bg-info/25"
            >
              Spend
            </button>
            <button
              type="button"
              onClick={onDeclineInspiration}
              className="rounded border border-border/60 bg-background/45 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
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
    onCloseChapter,
    onResetCampaign,
    onDownloadSessionLog,
    onDownloadReplayFixture,
  } = props
  const pressureFired = state.chapter.setup.pressureLadder.filter((step) => step.fired).length

  return (
    <div className="space-y-3">
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

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}
