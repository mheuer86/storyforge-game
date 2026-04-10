'use client'

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { renderMarkdown } from './chat-message'
import type { CloseData } from '@/lib/types'
import { formatModifier, getStatModifier } from '@/lib/game-data'

const CLOSE_STEPS = [
  'Auditing threads and promises',
  'Closing chapter',
  'Calculating level up',
  'Evaluating skill points',
  'Preparing debrief',
  'Setting next chapter frame',
]

export function ChapterCloseLoading({ chapterTitle }: { chapterTitle: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < CLOSE_STEPS.length - 1 ? s + 1 : s))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border/30 bg-card/95 shadow-2xl overflow-hidden p-5" style={{ fontFamily: 'var(--font-ui)' }}>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60 mb-4">Closing {chapterTitle}</p>
        <div className="flex flex-col gap-2">
          {CLOSE_STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {i < step ? (
                <span className="text-emerald-400 text-xs">✓</span>
              ) : i === step ? (
                <span className="text-primary/70 text-xs animate-pulse">●</span>
              ) : (
                <span className="text-muted-foreground/20 text-xs">○</span>
              )}
              <span className={`text-sm ${i <= step ? 'text-foreground/70' : 'text-muted-foreground/30'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ChapterCloseOverlayProps {
  closeData: CloseData
  characterName: string
  onStartNextChapter: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-4 h-px bg-primary/20" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>
        {children}
      </span>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-foreground/55 leading-relaxed">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function ChapterCloseOverlay({ closeData, characterName, onStartNextChapter }: ChapterCloseOverlayProps) {
  const { levelUp, skillPointsAwarded, keyEvents, debrief, nextFrame, completedChapterTitle, completedChapterNumber, nextChapterTitle: rawNextTitle } = closeData
  // Strip "Chapter N:" prefix if Claude included it in the title
  const nextChapterTitle = rawNextTitle?.replace(/^Chapter\s+\d+\s*:\s*/i, '') ?? rawNextTitle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 max-h-[85vh] flex flex-col rounded-xl border border-border/30 bg-card/95 shadow-2xl overflow-hidden" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/10">
          <h2 className="font-heading text-base font-medium text-foreground" style={{ fontFamily: 'var(--font-narrative)' }}>
            Chapter {completedChapterNumber}: {completedChapterTitle}
          </h2>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">Chapter Complete</p>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-5 py-4">

            {/* Level Up Card */}
            <div>
              <SectionLabel>Level Up</SectionLabel>
              <div className="rounded-lg border border-border/10 bg-secondary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground/70">{characterName}</span>
                  <span className="font-mono text-sm font-semibold text-primary">
                    Level {levelUp.oldLevel} → {levelUp.newLevel}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between border-b border-border/8 py-1.5 last:border-0">
                    <span className="text-xs text-foreground/40">HP Max</span>
                    <span className="font-mono text-xs font-medium text-foreground">
                      {levelUp.oldHpMax} → {levelUp.newHpMax} <span className="text-emerald-400">(+{levelUp.hpIncrease})</span>
                    </span>
                  </div>
                  {levelUp.newProficiencyBonus && (
                    <div className="flex items-center justify-between border-b border-border/8 py-1.5 last:border-0">
                      <span className="text-xs text-foreground/40">Proficiency Bonus</span>
                      <span className="font-mono text-xs font-medium text-primary">
                        +{levelUp.newProficiencyBonus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skill Points Card — only if any awarded */}
            {skillPointsAwarded.length > 0 && (
              <div>
                <SectionLabel>New Proficiencies</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {skillPointsAwarded.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] text-emerald-400/70"
                    >
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Events */}
            {keyEvents && keyEvents.length > 0 && (
              <div>
                <SectionLabel>Key Events</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {keyEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground/60 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debrief hint — full debrief available in burger menu */}
            {debrief && (
              <p className="text-[11px] text-muted-foreground/40 italic text-center">
                Full debrief available in the Chapters tab.
              </p>
            )}

            {/* Next Chapter Preview */}
            {nextFrame && (
              <div>
                <SectionLabel>Next Chapter</SectionLabel>
                <div className="rounded-lg border border-border/10 bg-secondary/5 p-3">
                  <p className="text-sm font-medium text-foreground/80 mb-1">{nextChapterTitle}</p>
                  <p className="text-xs text-foreground/50 leading-relaxed">{nextFrame.objective}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/10 flex flex-col gap-3">
          <button
            onClick={onStartNextChapter}
            className="w-full rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/40"
          >
            Start Chapter {(completedChapterNumber + 1)}: {nextChapterTitle}
          </button>
          <a
            href="https://buymeacoffee.com/storyforgegame"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary/70 hover:bg-primary/10 hover:text-primary transition-all"
          >
            Enjoying the story? Buy the developer a beer
          </a>
        </div>
      </div>
    </div>
  )
}
