import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import type { GameState, RollDisplayData } from '@/lib/types'
import { saveGameState } from '@/lib/game-data'

// ─── Types ───────────────────────────────────────────────────────────

export interface RollPrompt {
  check: string
  stat: string
  dc: number
  modifier: number
  reason: string
  toolUseId: string
  pendingMessages: unknown[]
  pendingState: GameState
  advantage?: 'advantage' | 'disadvantage'
  rawRolls?: [number, number]
  contested?: { npcName: string; npcSkill: string; npcModifier: number }
  npcRoll?: number
  priorToolResults?: unknown[]
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
}

interface RelevantItem {
  name: string
  bonus: number
  effect: string
}

interface OriginalRollData {
  value: number
  total: number
  result: string
  displayData: RollDisplayData
}

// ─── Hook ────────────────────────────────────────────────────────────

interface UseRollLogicParams {
  gameState: GameState | null
  setGameState: (state: GameState) => void
  sendContinuation: (roll: number, prompt: RollPrompt) => void
}

export interface RollLogic {
  // State
  rollPrompt: RollPrompt | null
  dicePhase: 'idle' | 'rolling' | 'revealed'
  diceDisplay: number
  diceDisplay2: number
  rolledValue: number | null
  rawRolls: [number, number] | null
  selectedItemBonus: { name: string; bonus: number } | null
  inspirationOffered: boolean
  originalRoll: OriginalRollData | null
  originalRollRef: React.RefObject<OriginalRollData | null>
  relevantItems: RelevantItem[]

  // Actions
  setRollPrompt: (prompt: RollPrompt | null) => void
  setSelectedItemBonus: (bonus: { name: string; bonus: number } | null) => void
  handleDiceClick: () => void
  handleInspirationReroll: () => void
  handleDeclineInspiration: () => void
}

export function useRollLogic({
  gameState,
  setGameState,
  sendContinuation,
}: UseRollLogicParams): RollLogic {
  const [rollPrompt, setRollPrompt] = useState<RollPrompt | null>(null)
  const [dicePhase, setDicePhase] = useState<'idle' | 'rolling' | 'revealed'>('idle')
  const [diceDisplay, setDiceDisplay] = useState(1)
  const [diceDisplay2, setDiceDisplay2] = useState(1)
  const [rolledValue, setRolledValue] = useState<number | null>(null)
  const [rawRolls, setRawRolls] = useState<[number, number] | null>(null)
  const [selectedItemBonus, setSelectedItemBonus] = useState<{ name: string; bonus: number } | null>(null)
  const [inspirationOffered, setInspirationOffered] = useState(false)
  const [originalRoll, setOriginalRoll] = useState<OriginalRollData | null>(null)
  const originalRollRef = useRef<OriginalRollData | null>(null)

  // Reset all dice state to idle
  const resetDiceState = useCallback(() => {
    setRollPrompt(null)
    setDicePhase('idle')
    setDiceDisplay(1)
    setDiceDisplay2(1)
    setRolledValue(null)
    setRawRolls(null)
    setSelectedItemBonus(null)
    setInspirationOffered(false)
    setOriginalRoll(null)
  }, [])

  // Find inventory items whose effect matches the current roll check
  const relevantItems = useMemo(() => {
    if (!rollPrompt || !gameState) return []
    const check = rollPrompt.check.toLowerCase()
    return gameState.character.inventory.filter((item) => {
      if (!item.effect) return false
      const effect = item.effect.toLowerCase()
      return effect.includes(check) || effect.includes(rollPrompt.stat.toLowerCase())
    }).map((item) => {
      const match = item.effect?.match(/[+-](\d+)/)
      return { name: item.name, bonus: match ? parseInt(match[1]) : 0, effect: item.effect || '' }
    }).filter((item) => item.bonus > 0)
  }, [rollPrompt, gameState])

  const handleDiceClick = useCallback(() => {
    if (!rollPrompt || dicePhase !== 'idle') return
    // Apply item bonus to modifier before rolling
    if (selectedItemBonus) {
      rollPrompt.modifier += selectedItemBonus.bonus
    }
    const dieSides = rollPrompt.sides || 20
    const isDmgOrHeal = rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing'
    const isAdvantage = !isDmgOrHeal && (rollPrompt.advantage === 'advantage' || rollPrompt.advantage === 'disadvantage')
    const isContested = !isDmgOrHeal && !!rollPrompt.contested
    const die1 = Math.floor(Math.random() * dieSides) + 1
    const die2 = isAdvantage ? Math.floor(Math.random() * dieSides) + 1
      : isContested ? Math.floor(Math.random() * 20) + 1
      : die1
    const kept = rollPrompt.advantage === 'advantage' ? Math.max(die1, die2)
      : rollPrompt.advantage === 'disadvantage' ? Math.min(die1, die2)
      : die1
    setRolledValue(kept)
    if (isAdvantage) setRawRolls([die1, die2])
    if (isContested) {
      rollPrompt.npcRoll = die2
    }
    setInspirationOffered(false)
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * dieSides) + 1)
      if (isAdvantage || isContested) setDiceDisplay2(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(die1)
      if (isAdvantage || isContested) setDiceDisplay2(die2)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, dicePhase, selectedItemBonus])

  const handleInspirationReroll = useCallback(() => {
    if (!rollPrompt || !gameState || rolledValue === null) return
    // Save original roll for display
    const origTotal = rolledValue + rollPrompt.modifier
    const origEffDC = rollPrompt.contested && rollPrompt.npcRoll !== undefined
      ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : rollPrompt.dc
    const origResult = rolledValue === 20 ? 'critical' : rolledValue === 1 ? 'fumble' : origTotal >= origEffDC ? 'success' : 'failure'
    const origDisplayData: RollDisplayData = {
      check: rollPrompt.check, dc: rollPrompt.dc, roll: rolledValue, modifier: rollPrompt.modifier,
      total: origTotal, result: origResult as RollDisplayData['result'], reason: rollPrompt.reason,
      advantage: rollPrompt.advantage, rawRolls: rawRolls ?? undefined,
      contested: rollPrompt.contested, npcRoll: rollPrompt.npcRoll,
      npcTotal: rollPrompt.contested && rollPrompt.npcRoll !== undefined ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : undefined,
    }
    const origData = { value: rolledValue, total: origTotal, result: origResult, displayData: origDisplayData }
    setOriginalRoll(origData)
    originalRollRef.current = origData

    // Consume inspiration
    const updated = {
      ...gameState,
      character: { ...gameState.character, inspiration: false },
    }
    setGameState(updated)
    saveGameState(updated)
    rollPrompt.pendingState = {
      ...rollPrompt.pendingState,
      character: { ...rollPrompt.pendingState.character, inspiration: false },
    }

    // Immediately reroll
    const isAdvantage = rollPrompt.advantage === 'advantage' || rollPrompt.advantage === 'disadvantage'
    const newDie1 = Math.floor(Math.random() * 20) + 1
    const newDie2 = isAdvantage ? Math.floor(Math.random() * 20) + 1 : newDie1
    const newKept = rollPrompt.advantage === 'advantage' ? Math.max(newDie1, newDie2)
      : rollPrompt.advantage === 'disadvantage' ? Math.min(newDie1, newDie2)
      : newDie1
    setRolledValue(newKept)
    if (isAdvantage) setRawRolls([newDie1, newDie2])
    setInspirationOffered(false)
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 20) + 1)
      if (isAdvantage) setDiceDisplay2(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(newDie1)
      if (isAdvantage) setDiceDisplay2(newDie2)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, gameState, rolledValue, rawRolls, setGameState])

  const handleDeclineInspiration = useCallback(() => {
    if (!rollPrompt || rolledValue === null) return
    setInspirationOffered(false)
    const capturedPrompt = { ...rollPrompt, rawRolls: rawRolls ?? undefined }
    const capturedRoll = rolledValue
    resetDiceState()
    sendContinuation(capturedRoll, capturedPrompt)
  }, [rollPrompt, rolledValue, rawRolls, sendContinuation, resetDiceState])

  // After revealing the dice result, auto-continue to phase 2
  // Unless: roll failed and player has inspiration → offer reroll (not for damage/healing)
  useEffect(() => {
    if (dicePhase !== 'revealed' || rolledValue === null || !rollPrompt) return
    const isDmgOrHeal = rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing'
    const total = rolledValue + rollPrompt.modifier
    const npcTot = rollPrompt.contested && rollPrompt.npcRoll !== undefined
      ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : null
    const effectiveDC = npcTot !== null ? npcTot : rollPrompt.dc
    const isFail = !isDmgOrHeal && rolledValue !== 20 && (rolledValue === 1 || total < effectiveDC)
    const hasInspiration = gameState?.character.inspiration ?? false

    if (isFail && hasInspiration && !originalRoll) {
      if (!inspirationOffered) setInspirationOffered(true)
      return
    }

    const t = setTimeout(() => {
      const capturedPrompt = { ...rollPrompt, rawRolls: rawRolls ?? undefined }
      const capturedRoll = rolledValue
      resetDiceState()
      sendContinuation(capturedRoll, capturedPrompt)
    }, originalRoll ? 2000 : 1400)
    return () => clearTimeout(t)
  }, [dicePhase, rolledValue, rollPrompt, rawRolls, sendContinuation, gameState, inspirationOffered, originalRoll, resetDiceState])

  return {
    rollPrompt,
    dicePhase,
    diceDisplay,
    diceDisplay2,
    rolledValue,
    rawRolls,
    selectedItemBonus,
    inspirationOffered,
    originalRoll,
    originalRollRef,
    relevantItems,
    setRollPrompt,
    setSelectedItemBonus,
    handleDiceClick,
    handleInspirationReroll,
    handleDeclineInspiration,
  }
}
