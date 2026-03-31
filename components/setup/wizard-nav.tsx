'use client'

import { cn } from '@/lib/utils'

interface WizardNavProps {
  onBack?: () => void
  backLabel?: string
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
}

export function WizardNav({
  onBack,
  backLabel = 'Back',
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
}: WizardNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-background/60 backdrop-blur-xl border-t border-border/10">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg border border-primary/30 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:border-primary/60 hover:bg-primary/5"
          >
            {backLabel}
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          'rounded-lg px-8 py-2.5 text-sm font-medium transition-all',
          nextDisabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-3px] shadow-primary/30'
        )}
        style={nextDisabled ? undefined : { boxShadow: 'var(--action-glow)' }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
