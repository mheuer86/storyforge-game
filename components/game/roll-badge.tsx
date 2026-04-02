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

  const isContested = !!rollData.contested && rollData.npcRoll !== undefined
  const loserDieClass = 'border-border/30 bg-card/20 text-muted-foreground/40'

  if (isContested) {
    const npcTotal = rollData.npcRoll! + rollData.contested!.npcModifier
    return (
      <div className={`rounded-lg border px-6 py-4 ${cardClass}`}>
        <div className="text-center font-heading text-xs font-medium uppercase tracking-wider text-foreground/70 mb-3">
          Contested — {rollData.check} vs {rollData.contested!.npcSkill}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-xs font-medium text-foreground/60 mb-1">{rollData.contested!.npcName}</div>
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${isSuccess ? loserDieClass : 'border-orange-400/60 bg-orange-400/20 text-orange-400'}`}>
              {rollData.npcRoll}
            </div>
            <div className="mt-1 font-system text-xs text-foreground/50">
              {rollData.npcRoll} + {rollData.contested!.npcModifier} = {npcTotal}
            </div>
          </div>
          <div className="text-center">
            <span className={labelClass}>{label.replace('— ', '')}</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-foreground/70 mb-1">You</div>
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ml-auto ${!isSuccess ? loserDieClass : keptDieClass}`}>
              {rollData.roll}
            </div>
            <div className="mt-1 font-system text-xs text-foreground/70">
              {rollData.roll} + {rollData.modifier} = {rollData.total}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (rollData.isOriginal) {
    // Dimmed original roll before inspiration reroll
    return (
      <div className="rounded-lg border border-border/20 bg-card/20 px-6 py-3 opacity-50">
        <div className="font-system text-sm text-foreground/60">
          {rollData.roll}
          {rollData.modifier !== 0 && <span> {rollData.modifier > 0 ? '+' : ''}{rollData.modifier}</span>}
          {' '}= {rollData.total} <span className="text-muted-foreground/60">vs DC {rollData.dc}</span>
          {' '}<span className="text-orange-400/60 line-through">{label}</span>
        </div>
      </div>
    )
  }

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
