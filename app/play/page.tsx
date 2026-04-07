'use client'

import { useState, useEffect } from 'react'
import { PassphraseGate } from '@/components/setup/passphrase-gate'
import { WorldSetup } from '@/components/setup/world-setup'
import { CharacterSetup } from '@/components/setup/character-setup'
import { CampaignSelect } from '@/components/setup/campaign-select'
import { GameScreen } from '@/components/game/game-screen'
import { GameErrorBoundary } from '@/components/error-boundary'
import { loadGameState, createInitialGameState, clearGameState, getSaveSlot, saveGameState, saveToSlot, type SaveSlotData } from '@/lib/game-data'
import { applyGenreTheme, type Genre, type Species, type CharacterClass } from '@/lib/genre-config'
import type { GameState } from '@/lib/types'

type AppState = 'loading' | 'campaign-select' | 'world-setup' | 'character-setup' | 'playing'

interface SetupData {
  genre: Genre
  characterName: string
  species: Species | null
  characterClass: CharacterClass | null
}

function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null)
  const [autoSave, setAutoSave] = useState<GameState | null>(null)
  const [saveSlots, setSaveSlots] = useState<(SaveSlotData | null)[]>([null, null, null])
  const [setupData, setSetupData] = useState<SetupData>({
    genre: 'space-opera',
    characterName: '',
    species: null,
    characterClass: null,
  })

  useEffect(() => {
    const existing = loadGameState()
    const slots = [getSaveSlot(1), getSaveSlot(2), getSaveSlot(3)]
    const hasAnySave = existing || slots.some(Boolean)

    if (hasAnySave) {
      setAutoSave(existing)
      setSaveSlots(slots)
      // Apply the current auto-save theme if one exists
      if (existing) {
        applyGenreTheme((existing.meta.genre || 'space-opera') as Genre)
      }
      setAppState('campaign-select')
    } else {
      setAppState('world-setup')
    }
  }, [])

  const handleContinue = () => {
    if (!autoSave) return
    setAppState('playing')
  }

  const handleLoadSlot = (slot: SaveSlotData) => {
    // Auto-backup current game before overwriting with loaded save
    if (autoSave) {
      const currentName = autoSave.character.name
      const currentGenre = autoSave.meta.genre
      // Check if current auto-save differs from what we're loading
      const isDifferentGame = currentName !== slot.characterName || currentGenre !== slot.gameState.meta.genre
      if (isDifferentGame) {
        // Find matching slot for current game, or first empty slot, or slot 3 as last resort
        let backupSlot: 1 | 2 | 3 | null = null
        for (const s of [1, 2, 3] as const) {
          const existing = getSaveSlot(s)
          if (existing && existing.characterName === currentName && existing.genre === currentGenre) {
            backupSlot = s
            break
          }
        }
        if (!backupSlot) {
          for (const s of [1, 2, 3] as const) {
            if (!getSaveSlot(s)) { backupSlot = s; break }
          }
        }
        if (backupSlot) {
          saveToSlot(backupSlot, autoSave)
        }
      }
    }

    saveGameState(slot.gameState)
    applyGenreTheme((slot.gameState.meta.genre || 'space-opera') as Genre)
    setPendingGameState(slot.gameState)
    setAppState('playing')
  }

  const handleWorldSetupComplete = (data: { genre: Genre }) => {
    setSetupData((prev) => ({ ...prev, genre: data.genre }))
    setAppState('character-setup')
  }

  const handleCharacterSetupComplete = (data: {
    name: string
    species: Species
    characterClass: CharacterClass
    gender: 'he' | 'she' | 'they'
  }) => {
    const initialState = createInitialGameState(
      data.name,
      data.species.id,
      data.characterClass.id,
      setupData.genre,
      data.gender
    )
    applyGenreTheme(setupData.genre)
    // Auto-save new game to first empty slot
    const firstEmpty = ([1, 2, 3] as const).find(s => !getSaveSlot(s))
    if (firstEmpty) {
      saveToSlot(firstEmpty, initialState)
    }
    setPendingGameState(initialState)
    setAppState('playing')
  }

  const handleBackToWorldSetup = () => {
    setAppState('world-setup')
  }

  const handleNewGame = () => {
    clearGameState()
    setPendingGameState(null)
    setSetupData({ genre: 'space-opera', characterName: '', species: null, characterClass: null })
    applyGenreTheme('space-opera')
    setAppState('world-setup')
  }

  if (appState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (appState === 'campaign-select') {
    return (
      <CampaignSelect
        autoSave={autoSave}
        slots={saveSlots}
        onContinue={handleContinue}
        onLoadSlot={handleLoadSlot}
        onNewGame={handleNewGame}
      />
    )
  }

  if (appState === 'world-setup') {
    const hasSaves = autoSave || saveSlots.some(Boolean)
    return <WorldSetup onNext={handleWorldSetupComplete} onBack={hasSaves ? () => setAppState('campaign-select') : undefined} />
  }

  if (appState === 'character-setup') {
    return (
      <CharacterSetup
        genre={setupData.genre}
        onBack={handleBackToWorldSetup}
        onStart={handleCharacterSetupComplete}
      />
    )
  }

  return (
    <GameErrorBoundary onReset={handleNewGame}>
      <GameScreen initialGameState={pendingGameState ?? undefined} onNewGame={handleNewGame} />
    </GameErrorBoundary>
  )
}

export default function StoryforgeApp() {
  return (
    <PassphraseGate>
      <AppContent />
    </PassphraseGate>
  )
}
