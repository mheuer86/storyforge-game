import type { RollDisplayData } from '@/lib/types'

export function RollBadge({ rollData }: { rollData: RollDisplayData }) {
  const isCrit = rollData.result === 'critical'
  const isFumble = rollData.result === 'fumble'
  const isSuccess = rollData.result === 'success' || isCrit
  const label = isCrit ? '— CRITICAL!' : isFumble ? '— FUMBLE' : isSuccess ? '— SUCCESS' : '— FAILURE'
  const hasAdv = !!rollData.advantage && !!rollData.rawRolls

  const cardClass = isCrit
    ? 'dice-crit-card'
    : isSuccess
    ? 'border-emerald-400/60 bg-emerald-400/10'
    : isFumble
    ? 'border-red-500/60 bg-red-500/10'
    : 'border-orange-400/60 bg-orange-400/10'

  const labelClass = isCrit
    ? 'text-tertiary font-bold'
    : isSuccess
    ? 'text-emerald-400 font-bold'
    : isFumble
    ? 'text-red-400 font-bold'
    : 'text-orange-400 font-bold'

  const keptDieClass = isCrit
    ? 'dice-crit'
    : isSuccess
    ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-400'
    : isFumble
    ? 'border-red-500/60 bg-red-500/20 text-red-400'
    : 'border-orange-400/60 bg-orange-400/20 text-orange-400'

  const discardedDieClass = 'border-border/30 bg-card/20 text-muted-foreground/40 line-through'

  return (
    <div className={`rounded-lg border px-6 py-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {rollData.check}
            {rollData.advantage && (
              <span className={rollData.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                {rollData.advantage}
              </span>
            )}
          </div>
          <div className="mt-1 font-system text-sm text-foreground">
            {rollData.roll}
            {rollData.modifier !== 0 && (
              <span className="text-muted-foreground">
                {' '}{rollData.modifier > 0 ? '+' : ''}{rollData.modifier}
              </span>
            )}
            {' '}= {rollData.total} <span className="text-muted-foreground">vs DC {rollData.dc}</span>{' '}
            <span className={labelClass}>{label}</span>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          {hasAdv ? (
            <>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${rollData.rawRolls![0] === rollData.roll ? keptDieClass : discardedDieClass}`}>
                {rollData.rawRolls![0]}
              </div>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${rollData.rawRolls![1] === rollData.roll && (rollData.rawRolls![0] !== rollData.roll || rollData.rawRolls![0] === rollData.rawRolls![1]) ? keptDieClass : discardedDieClass}`}>
                {rollData.rawRolls![1]}
              </div>
            </>
          ) : (
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border font-mono text-3xl font-bold ${keptDieClass}`}>
              {rollData.roll}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
