'use client'

import { useState, useEffect } from 'react'
import { WorldSetup } from '@/components/setup/world-setup'
import { CharacterSetup } from '@/components/setup/character-setup'
import { GameScreen } from '@/components/game/game-screen'
import { loadGameState, createInitialGameState } from '@/lib/game-data'
import type { Genre, Species, CharacterClass } from '@/lib/game-data'
import type { GameState } from '@/lib/types'

type AppState = 'loading' | 'world-setup' | 'character-setup' | 'playing'

interface SetupData {
  genre: Genre
  characterName: string
  species: Species | null
  characterClass: CharacterClass | null
}

export default function StoryforgeApp() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null)
  const [setupData, setSetupData] = useState<SetupData>({
    genre: 'space-opera',
    characterName: '',
    species: null,
    characterClass: null,
  })

  // Check for existing game on mount — skip setup if one exists
  useEffect(() => {
    const existing = loadGameState()
    if (existing) {
      setAppState('playing')
    } else {
      setAppState('world-setup')
    }
  }, [])

  const handleWorldSetupComplete = (data: { genre: Genre; tone: string }) => {
    setSetupData((prev) => ({ ...prev, genre: data.genre }))
    setAppState('character-setup')
  }

  const handleCharacterSetupComplete = (data: {
    name: string
    species: Species
    characterClass: CharacterClass
  }) => {
    const initialState = createInitialGameState(
      data.name,
      data.species.id,
      data.characterClass.id
    )
    setPendingGameState(initialState)
    setAppState('playing')
  }

  const handleBackToWorldSetup = () => {
    setAppState('world-setup')
  }

  if (appState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (appState === 'world-setup') {
    return <WorldSetup onNext={handleWorldSetupComplete} />
  }

  if (appState === 'character-setup') {
    return (
      <CharacterSetup
        onBack={handleBackToWorldSetup}
        onStart={handleCharacterSetupComplete}
      />
    )
  }

  return <GameScreen initialGameState={pendingGameState ?? undefined} />
}
