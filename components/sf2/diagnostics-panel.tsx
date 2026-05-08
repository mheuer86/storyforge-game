'use client'

import { useMemo, type ReactNode } from 'react'
import { Activity, Copy, FileDown, RotateCcw, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChapterPressureProjection } from '@/lib/sf2/pressure/runtime'
import { computeSessionSummary } from '@/lib/sf2/instrumentation/session-summary'
import { useDiagnosticsStore, type TokenUsage } from '@/lib/sf2/diagnostics-store'
import { queryOpenErrorFindingsForEntity } from '@/lib/sf2/diagnostics'
import type { Sf2State } from '@/lib/sf2/types'
import {
  EmptyLine,
  HudPanel,
  sidebarBodyTextClassName,
  sidebarTitleTextClassName,
  type Sf2CampaignStatsView,
  type Sf2CloseReadinessView,
} from './play-shell'

interface DiagnosticsPanelProps {
  state: Sf2State
  campaignStats: Sf2CampaignStatsView
  chapterTurnCount: number
  busy: boolean
  pressureProjection: ChapterPressureProjection
  closeReadiness: Sf2CloseReadinessView
  onCloseChapter: () => void
  onResetCampaign: () => void
  onDownloadSessionLog: () => void
  onDownloadReplayFixture: () => void
  onCopySessionLog: () => void
  onCopyReplayFixture: () => void
}

export default function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  const {
    state,
    campaignStats,
    chapterTurnCount,
    busy,
    pressureProjection,
    closeReadiness,
    onCloseChapter,
    onResetCampaign,
    onDownloadSessionLog,
    onDownloadReplayFixture,
    onCopySessionLog,
    onCopyReplayFixture,
  } = props
  const { debug, findings, lastNarratorUsage, lastArchivistUsage, exportCopyStatus } = useDiagnosticsStore()
  const sessionSummary = useMemo(() => computeSessionSummary(state, debug), [state, debug])
  const selectedEntityErrors = useMemo(() => {
    const entityId = state.chapter.setup.spineThreadId ?? state.chapter.setup.startingNpcIds[0] ?? ''
    return entityId ? queryOpenErrorFindingsForEntity(findings, entityId) : []
  }, [findings, state.chapter.setup.spineThreadId, state.chapter.setup.startingNpcIds])

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

      <HudPanel title={`Diagnostic Findings / ${findings.length}`}>
        <div className="space-y-2 text-[12px] text-muted-foreground">
          {findings.length === 0 ? (
            <EmptyLine text="No diagnostic findings yet." />
          ) : (
            <>
              <div>
                Open errors for current spine/lead entity: {selectedEntityErrors.length}
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {findings.slice().reverse().slice(0, 8).map((finding) => (
                  <div key={finding.id} className="border-t border-border/25 pt-1">
                    <span className="font-mono uppercase tracking-[0.12em] text-primary">
                      {finding.source}/{finding.kind}/{finding.severity}
                    </span>
                    <span> — {finding.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}
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
        <UtilityButton icon={<Copy className="h-4 w-4" />} label="Copy session JSON" onClick={onCopySessionLog} />
        <UtilityButton icon={<Copy className="h-4 w-4" />} label="Copy replay JSON" onClick={onCopyReplayFixture} />
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
      {exportCopyStatus && (
        <div className="rounded border border-primary/25 bg-primary/10 px-3 py-2 font-mono text-[11px] text-primary">
          {exportCopyStatus}
        </div>
      )}
    </div>
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

function UsageLine({ label, usage }: { label: string; usage: TokenUsage | null }) {
  if (!usage) return <div>{label}: no usage yet</div>
  return (
    <div>
      {label}: in {usage.inputTokens} / out {usage.outputTokens} / cache w {usage.cacheWriteTokens} / r {usage.cacheReadTokens}
    </div>
  )
}
