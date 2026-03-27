'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatModifier } from '@/lib/game-data'

interface DiceRollModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  check: string
  dc: number
  modifier: number
  roll: number | null
  consequence?: string
  onRoll: () => void
  onContinue: () => void
}

export function DiceRollModal({
  open,
  onOpenChange,
  check,
  dc,
  modifier,
  roll,
  consequence,
  onRoll,
  onContinue,
}: DiceRollModalProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [displayNumber, setDisplayNumber] = useState<number | null>(null)

  const total = roll !== null ? roll + modifier : null
  const success = total !== null && total >= dc
  const isCritical = roll === 20
  const isCriticalFail = roll === 1

  useEffect(() => {
    if (isRolling && roll === null) {
      // Animate random numbers while rolling
      const interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * 20) + 1)
      }, 50)

      return () => clearInterval(interval)
    } else if (roll !== null) {
      setDisplayNumber(roll)
      setIsRolling(false)
    }
  }, [isRolling, roll])

  const handleRoll = () => {
    setIsRolling(true)
    setDisplayNumber(Math.floor(Math.random() * 20) + 1)
    
    // Trigger actual roll after animation
    setTimeout(() => {
      onRoll()
    }, 800)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border-border/50 bg-card/95 backdrop-blur-sm sm:rounded-xl"
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-medium text-foreground">
            {check} Check
          </DialogTitle>
          <DialogDescription className="sr-only">
            Roll a d20 to determine the outcome of your {check} check against DC {dc}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* DC and Modifier Info */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground">Target</span>
              <span className="font-mono text-lg font-bold text-foreground">DC {dc}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground">Modifier</span>
              <span className="font-mono text-lg font-bold text-primary">
                {formatModifier(modifier)}
              </span>
            </div>
          </div>

          {/* Dice Display */}
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 transition-all duration-300',
              roll === null
                ? 'border-border/50 bg-secondary/30'
                : success
                ? isCritical
                  ? 'border-warning bg-warning/10 shadow-[0_0_30px_-5px] shadow-warning/50'
                  : 'border-success bg-success/10 shadow-[0_0_30px_-5px] shadow-success/50'
                : 'border-destructive bg-destructive/10 shadow-[0_0_30px_-5px] shadow-destructive/50'
            )}
          >
            {displayNumber !== null ? (
              <span
                className={cn(
                  'font-mono text-5xl font-bold transition-all duration-200',
                  isRolling && 'animate-pulse',
                  roll === null
                    ? 'text-foreground'
                    : isCritical
                    ? 'text-warning'
                    : success
                    ? 'text-success'
                    : 'text-destructive'
                )}
              >
                {displayNumber}
              </span>
            ) : (
              <span className="text-4xl text-muted-foreground">d20</span>
            )}
          </div>

          {/* Result Display */}
          {roll !== null && total !== null && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="font-mono text-lg">
                <span className="text-muted-foreground">Rolled </span>
                <span className={cn(isCritical ? 'text-warning' : isCriticalFail ? 'text-destructive' : 'text-foreground')}>
                  {roll}
                </span>
                <span className="text-muted-foreground"> + </span>
                <span className="text-primary">{modifier}</span>
                <span className="text-muted-foreground"> = </span>
                <span className={cn('font-bold', success ? 'text-success' : 'text-destructive')}>
                  {total}
                </span>
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isCritical
                    ? 'text-warning'
                    : success
                    ? 'text-success'
                    : 'text-destructive'
                )}
              >
                {isCritical
                  ? 'Critical Success!'
                  : isCriticalFail
                  ? 'Critical Failure!'
                  : success
                  ? 'Success!'
                  : 'Failure'}
              </div>

              {/* Consequence */}
              {consequence && (
                <p className="mt-2 max-w-sm text-center text-sm italic text-muted-foreground">
                  {consequence}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          {roll === null ? (
            <Button
              onClick={handleRoll}
              disabled={isRolling}
              className="action-glow w-full max-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isRolling ? 'Rolling...' : 'Roll d20'}
            </Button>
          ) : (
            <Button
              onClick={onContinue}
              className="action-glow w-full max-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
