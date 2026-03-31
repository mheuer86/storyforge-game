'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getStatModifier, formatModifier, getSaveSlot, saveToSlot, type SaveSlotData } from '@/lib/game-data'
import { getGenreConfig, type Genre } from '@/lib/genre-config'
import type { GameState, Antagonist, ShipState } from '@/lib/types'

interface Character {
  name: string
  species: { name: string }
  class: {
    name: string
    stats: Record<string, number>
    proficiencies: { name: string }[]
    startingGear: string[]
    trait: { name: string; description: string }
  }
  level: number
  hp: { current: number; max: number }
  ac: number
  credits: number
  tempEffects: { name: string; effect: string; duration: string }[]
}

interface Ship {
  name: string
  state: ShipState | null
}

interface World {
  location: { name: string; description: string }
  factions: { name: string; stance: string }[]
  companions: { name: string; description: string; lastSeen: string }[]
  npcs: { name: string; description: string; lastSeen: string; subtype?: 'person' | 'vessel' | 'installation' }[]
  threads: { title: string; status: string; deteriorating: boolean }[]
  promises: { to: string; what: string; status: 'open' | 'fulfilled' | 'broken' }[]
  antagonist: Antagonist | null
  tensionClocks: { id: string; name: string; status: 'active' | 'triggered' | 'resolved'; triggerEffect: string }[]
}

interface Chapter {
  number: number
  title: string
  status: 'complete' | 'in-progress'
  summary: string
  keyEvents: string[]
  rollLog: { check: string; dc: number; roll: number; modifier: number; result: 'success' | 'failure' | 'critical' | 'fumble' }[]
  debrief: {
    tactical: string
    strategic: string
    luckyBreaks: string[]
    costsPaid: string[]
    promisesKept: string[]
    promisesBroken: string[]
  } | null
}

interface BurgerMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  character: Character
  ship: Ship
  world: World
  chapters: Chapter[]
  genre: Genre
  onSave: (slot: 1 | 2 | 3) => void
  onLoad: (state: GameState) => void
  onNewGame?: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function BurgerMenu({
  open,
  onOpenChange,
  character,
  ship,
  world,
  chapters,
  genre,
  onSave,
  onLoad,
  onNewGame,
}: BurgerMenuProps) {
  const genreConfig = getGenreConfig(genre)
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [saveMode, setSaveMode] = useState<'save' | 'load' | null>(null)
  const [loadConfirm, setLoadConfirm] = useState<SaveSlotData | null>(null)
  const [newGameConfirm, setNewGameConfirm] = useState(false)
  const [slots, setSlots] = useState<(SaveSlotData | null)[]>([null, null, null])
  const [savedSlot, setSavedSlot] = useState<number | null>(null)

  const openSaveLoad = (mode: 'save' | 'load') => {
    setSlots([getSaveSlot(1), getSaveSlot(2), getSaveSlot(3)])
    setSavedSlot(null)
    setSaveMode(mode)
  }

  const handleSaveToSlot = (slot: 1 | 2 | 3) => {
    onSave(slot)
    setSavedSlot(slot)
    setTimeout(() => setSaveMode(null), 800)
  }

  const handleLoadConfirm = () => {
    if (!loadConfirm) return
    onLoad(loadConfirm.gameState)
    setLoadConfirm(null)
    setSaveMode(null)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col overflow-hidden border-border/50 bg-card/95 backdrop-blur-sm sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="sr-only">Game Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Access character sheet, ship status, world state, and chapter history
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="character" className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 overflow-x-auto">
              <TabsList className="flex w-max min-w-full bg-secondary/30">
                <TabsTrigger value="character" className="shrink-0 text-xs">
                  Character
                </TabsTrigger>
                <TabsTrigger value="ship" className="shrink-0 text-xs">
                  {genre === 'cyberpunk' ? 'Rig' : genre === 'space-opera' ? 'Ship' : genreConfig.partyBaseName}
                </TabsTrigger>
                <TabsTrigger value="world" className="shrink-0 text-xs">
                  World
                </TabsTrigger>
                <TabsTrigger value="chapters" className="shrink-0 text-xs">
                  Chapters
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1 overflow-x-hidden" style={{ fontFamily: 'var(--font-narrative)' }}>
              {/* Character Tab */}
              <TabsContent value="character" className="mt-0 p-4">
                <CharacterSheet character={character} currencyLabel={genreConfig.currencyName} />
              </TabsContent>

              {/* Ship Tab */}
              <TabsContent value="ship" className="mt-0 w-full p-4">
                <ShipPanel ship={ship} genre={genre} partyBaseName={genreConfig.partyBaseName} />
              </TabsContent>

              {/* World Tab */}
              <TabsContent value="world" className="mt-0 p-4">
                <WorldPanel world={world} partyBaseName={genreConfig.partyBaseName} />
              </TabsContent>

              {/* Chapters Tab */}
              <TabsContent value="chapters" className="mt-0 p-4">
                <ChaptersPanel
                  chapters={chapters}
                  expandedChapter={expandedChapter}
                  onToggleChapter={(num) =>
                    setExpandedChapter(expandedChapter === num ? null : num)
                  }
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <SheetFooter className="flex-col gap-2 border-t border-border/30 pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openSaveLoad('save')}
                className="flex-1 border-border/50 bg-secondary/30 hover:bg-secondary/50"
              >
                Save Game
              </Button>
              <Button
                variant="outline"
                onClick={() => openSaveLoad('load')}
                className="flex-1 border-border/50 bg-secondary/30 hover:bg-secondary/50"
              >
                Load Game
              </Button>
            </div>
            {onNewGame && (
              <button
                onClick={() => setNewGameConfirm(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Start new campaign
              </button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Save / Load dialog */}
      <Dialog open={saveMode !== null} onOpenChange={(o) => { if (!o) setSaveMode(null) }}>
        <DialogContent className="border-border/50 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{saveMode === 'save' ? 'Save Game' : 'Load Game'}</DialogTitle>
            <DialogDescription>
              {saveMode === 'save' ? 'Choose a slot to save your current session.' : 'Choose a save to load. Your current session will be replaced.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {([1, 2, 3] as const).map((slot) => {
              const s = slots[slot - 1]
              const isSaved = savedSlot === slot
              return (
                <div key={slot} className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/20 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    {s ? (
                      <>
                        <div className="font-medium text-foreground truncate">{s.characterName} — {s.characterClass}</div>
                        <div className="text-xs text-muted-foreground">Ch. {s.chapterNumber}: {s.chapterTitle} · {timeAgo(s.savedAt)}</div>
                      </>
                    ) : (
                      <div className="italic text-muted-foreground text-sm">Empty slot</div>
                    )}
                  </div>
                  {saveMode === 'save' ? (
                    <Button
                      size="sm"
                      variant={isSaved ? 'default' : 'outline'}
                      className="shrink-0"
                      onClick={() => handleSaveToSlot(slot)}
                    >
                      {isSaved ? 'Saved ✓' : 'Save here'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={!s}
                      onClick={() => s && setLoadConfirm(s)}
                    >
                      Load
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Load confirmation */}
      <Dialog open={loadConfirm !== null} onOpenChange={(o) => { if (!o) setLoadConfirm(null) }}>
        <DialogContent className="border-border/50 bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Load this save?</DialogTitle>
            <DialogDescription>
              Your current session will be replaced by{' '}
              <span className="font-medium text-foreground">{loadConfirm?.characterName}</span>
              {' '}— Chapter {loadConfirm?.chapterNumber}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setLoadConfirm(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleLoadConfirm}>Load</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Game confirmation */}
      <Dialog open={newGameConfirm} onOpenChange={setNewGameConfirm}>
        <DialogContent className="border-border/50 bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Start a new campaign?</DialogTitle>
            <DialogDescription>
              Your current session will be cleared. Save first if you want to keep it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setNewGameConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => { setNewGameConfirm(false); onNewGame?.() }}>Start Over</Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}

function CharacterSheet({ character, currencyLabel }: { character: Character; currencyLabel: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {character.name}{' '}
          <span className="text-muted-foreground">
            — {character.species.name} {character.class.name}
          </span>
        </h2>
        <div className="mt-1 flex gap-3 text-sm">
          <span>
            <span className="text-muted-foreground">Level</span>{' '}
            <span className="text-foreground">{character.level}</span>
          </span>
          <span>
            <span className="text-muted-foreground">HP:</span>{' '}
            <span className="text-foreground">
              {character.hp.current}/{character.hp.max}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">AC:</span>{' '}
            <span className="text-foreground">{character.ac}</span>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(character.class.stats).map(([stat, value]) => (
          <div key={stat} className="rounded bg-secondary/30 px-2 py-1 text-center">
            <div className="text-xs text-muted-foreground">{stat}</div>
            <div className="text-foreground">
              {value}{' '}
              <span className="text-primary">({formatModifier(getStatModifier(value))})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Proficiencies */}
      <div>
        <h3 className="mb-1 text-xs uppercase text-muted-foreground">Proficiencies</h3>
        <div className="flex flex-wrap gap-1">
          {character.class.proficiencies.map((p) => (
            <Badge key={p.name} variant="secondary" className="bg-secondary/50 text-xs">
              {p.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Gear */}
      <div>
        <h3 className="mb-1 text-xs uppercase text-muted-foreground">Gear</h3>
        <ul className="list-inside list-disc text-foreground">
          {character.class.startingGear.map((item, i) => (
            <li key={`${item}-${i}`}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Traits */}
      <div>
        <h3 className="mb-1 text-xs uppercase text-muted-foreground">Traits</h3>
        <div className="text-foreground">
          <span className="text-primary">{character.class.trait.name}:</span>{' '}
          {character.class.trait.description}
        </div>
      </div>

      {/* Credits */}
      <div className="rounded bg-secondary/30 px-3 py-2">
        <span className="text-muted-foreground capitalize">{currencyLabel}:</span>{' '}
        <span className="font-semibold text-warning">{character.credits}</span>
      </div>

      {/* Temporary Effects */}
      {character.tempEffects.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs uppercase text-muted-foreground">Temporary Effects</h3>
          {character.tempEffects.map((effect, i) => (
            <div key={i} className="rounded bg-primary/10 px-2 py-1 text-foreground">
              {effect.name}: {effect.effect} — {effect.duration}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ShipPanel({ ship, genre, partyBaseName }: { ship: Ship; genre: Genre; partyBaseName: string }) {
  const isCyberpunk = genre === 'cyberpunk'
  const hasRig = (genre === 'space-opera' || isCyberpunk) && ship.state
  if (hasRig) {
    const s = ship.state!
    const conditionLabel = isCyberpunk ? 'Rig Integrity' : 'Hull Condition'
    const hullColor = s.hullCondition >= 70 ? 'text-success' : s.hullCondition >= 30 ? 'text-warning' : 'text-destructive'
    const hullBarColor = s.hullCondition >= 70 ? 'bg-success' : s.hullCondition >= 30 ? 'bg-warning' : 'bg-destructive'
    return (
      <div className="flex min-w-0 flex-col gap-4 overflow-hidden text-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{isCyberpunk ? 'Tech Rig' : ship.name}</h2>
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{conditionLabel}</span>
              <span className={hullColor}>{s.hullCondition}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
              <div className={cn('h-full rounded-full transition-all', hullBarColor)} style={{ width: `${s.hullCondition}%` }} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs uppercase text-muted-foreground">{isCyberpunk ? 'Modules' : 'Systems'}</h3>
          <div className="flex flex-col gap-2">
            {s.systems.map((sys) => (
              <div key={sys.id} className="flex items-start gap-3 rounded border border-border/30 bg-secondary/20 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{sys.name}</div>
                  <div className="break-words text-xs text-muted-foreground">{sys.description}</div>
                </div>
                <Badge
                  variant={sys.level >= 3 ? 'default' : sys.level === 2 ? 'secondary' : 'outline'}
                  className="shrink-0 text-[10px]"
                >
                  L{sys.level}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {s.combatOptions.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">{isCyberpunk ? 'Active Abilities' : 'Combat Options'}</h3>
            <div className="flex flex-col gap-1">
              {s.combatOptions.map((opt, i) => (
                <div key={i} className="break-words rounded border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs uppercase text-muted-foreground">{isCyberpunk ? 'Mod History' : 'Refit History'}</h3>
          {s.upgradeLog.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {s.upgradeLog.map((entry, i) => (
                <li key={i} className="text-xs text-foreground break-words">{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="italic text-muted-foreground">No upgrades yet</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{partyBaseName}</h2>
        <p className="mt-2 italic text-muted-foreground">
          Not yet established. As your story unfolds, the GM will introduce a place to call your own.
        </p>
      </div>
      {ship.name && (
        <div className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
          <div className="text-xs uppercase text-muted-foreground">Reserved name</div>
          <div className="mt-1 font-medium text-foreground">{ship.name}</div>
        </div>
      )}
    </div>
  )
}

function WorldPanel({ world, partyBaseName }: { world: World; partyBaseName: string }) {
  const [view, setView] = useState<'now' | 'all'>('now')

  const activeThreads = world.threads.filter((t) => t.status !== 'resolved')
  const openPromises = world.promises.filter((p) => p.status === 'open')

  const locationName = world.location.name.toLowerCase()
  const inScene = (lastSeen: string) => lastSeen.toLowerCase().includes(locationName) || locationName.includes(lastSeen.toLowerCase())
  const companionsHere = world.companions.filter((c) => inScene(c.lastSeen))
  const isVessel = (n: { subtype?: string }) => n.subtype === 'vessel' || n.subtype === 'installation'
  const npcsHere = world.npcs.filter((n) => inScene(n.lastSeen) && !isVessel(n))
  const vesselsHere = world.npcs.filter((n) => inScene(n.lastSeen) && isVessel(n))

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Sub-tab toggle */}
      <div className="flex rounded-lg border border-border/40 bg-secondary/20 p-0.5">
        <button
          onClick={() => setView('now')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            view === 'now'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Now
        </button>
        <button
          onClick={() => setView('all')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            view === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </button>
      </div>

      {view === 'now' && (
        <>
          {/* Location */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Current Location</h3>
            <div className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
              <div className="font-medium text-foreground">{world.location.name}</div>
              <div className="text-xs text-muted-foreground">{world.location.description}</div>
            </div>
          </div>

          {/* Companions in scene */}
          {companionsHere.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase text-muted-foreground">Companions</h3>
              <div className="flex flex-col gap-2">
                {companionsHere.map((c, i) => (
                  <div key={`${i}-${c.name}`} className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NPCs in scene */}
          {npcsHere.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase text-muted-foreground">Present</h3>
              <div className="flex flex-col gap-2">
                {npcsHere.map((npc, i) => (
                  <div key={`${i}-${npc.name}`} className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
                    <div className="font-medium text-foreground">{npc.name}</div>
                    <div className="text-xs text-muted-foreground">{npc.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vessels / installations in scene */}
          {vesselsHere.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase text-muted-foreground">Vessels & Installations</h3>
              <div className="flex flex-col gap-2">
                {vesselsHere.map((v, i) => (
                  <div key={`${i}-${v.name}`} className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
                    <div className="font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pressures */}
          {(() => {
            const activeClocks = world.tensionClocks.filter((c) => c.status === 'active')
            const triggeredClocks = world.tensionClocks.filter((c) => c.status === 'triggered')
            if (activeClocks.length === 0 && triggeredClocks.length === 0) return null
            return (
              <div>
                <h3 className="mb-2 text-xs uppercase text-muted-foreground">Pressures</h3>
                <div className="flex flex-col gap-2">
                  {activeClocks.map((clock) => (
                    <div key={clock.id} className="rounded border border-warning/30 bg-warning/5 px-3 py-2">
                      <div className="font-medium text-foreground">{clock.name}</div>
                    </div>
                  ))}
                  {triggeredClocks.length > 0 && (
                    <>
                      <h4 className="mt-1 text-xs uppercase text-muted-foreground">Consequences</h4>
                      {triggeredClocks.map((clock) => (
                        <div key={clock.id} className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
                          <div className="font-medium text-foreground">{clock.name}</div>
                          <div className="text-xs text-muted-foreground">{clock.triggerEffect}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Active Threads */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Active Threads</h3>
            {activeThreads.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeThreads.map((thread, i) => (
                  <div
                    key={`${i}-${thread.title}`}
                    className="rounded border border-border/30 bg-secondary/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{thread.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{thread.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No active threads</p>
            )}
          </div>

          {/* Open Promises */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Open Promises</h3>
            {openPromises.length > 0 ? (
              <div className="flex flex-col gap-2">
                {openPromises.map((promise, i) => (
                  <div key={i} className="rounded border border-warning/30 bg-warning/5 px-3 py-2">
                    <div className="font-medium text-foreground">{promise.to}</div>
                    <div className="text-xs text-muted-foreground">{promise.what}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No open promises</p>
            )}
          </div>
        </>
      )}

      {view === 'all' && (
        <>
          {/* Factions */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Known Factions</h3>
            {world.factions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.factions.map((faction, i) => (
                  <div key={`${i}-${faction.name}`} className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
                    <div className="font-medium text-foreground">{faction.name}</div>
                    <div className="text-xs text-muted-foreground">{faction.stance}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No factions encountered</p>
            )}
          </div>

          {/* Companions */}
          {world.companions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase text-muted-foreground">Companions</h3>
              <div className="flex flex-col gap-2">
                {world.companions.map((c, i) => (
                  <div key={`${i}-${c.name}`} className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.description} · {c.lastSeen}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NPCs */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Known NPCs</h3>
            {world.npcs.filter((n) => !isVessel(n)).length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.npcs.filter((n) => !isVessel(n)).map((npc, i) => (
                  <div key={`${i}-${npc.name}`} className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
                    <div className="font-medium text-foreground">{npc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {npc.description} ({npc.lastSeen})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No NPCs encountered</p>
            )}
          </div>

          {/* Vessels & Installations */}
          {world.npcs.filter(isVessel).length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase text-muted-foreground">Vessels & Installations</h3>
              <div className="flex flex-col gap-2">
                {world.npcs.filter(isVessel).map((v, i) => (
                  <div key={`${i}-${v.name}`} className="rounded border border-border/30 bg-secondary/20 px-3 py-2">
                    <div className="font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.description} ({v.lastSeen})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Threads */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">All Threads</h3>
            {world.threads.length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.threads.map((thread, i) => (
                  <div
                    key={`${i}-${thread.title}`}
                    className="rounded border border-border/30 bg-secondary/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{thread.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{thread.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No threads yet</p>
            )}
          </div>

          {/* All Promises */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Promises & Debts</h3>
            {world.promises.length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.promises.map((promise, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded px-3 py-2',
                      promise.status === 'open'
                        ? 'border border-warning/30 bg-warning/5'
                        : promise.status === 'fulfilled'
                        ? 'border border-success/30 bg-success/5'
                        : 'border border-destructive/30 bg-destructive/5 line-through opacity-70'
                    )}
                  >
                    <div className="font-medium text-foreground">{promise.to}</div>
                    <div className="text-xs text-muted-foreground">{promise.what}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No promises made yet</p>
            )}
          </div>

          {/* Antagonist */}
          <div>
            <h3 className="mb-2 text-xs uppercase text-muted-foreground">Primary Antagonist</h3>
            {world.antagonist ? (
              <div className="flex flex-col gap-2">
                <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{world.antagonist.name}</div>
                    {world.antagonist.movedThisChapter && (
                      <Badge variant="destructive" className="shrink-0 text-[10px]">Moved</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{world.antagonist.description}</div>
                  <div className="mt-1 text-xs text-foreground">
                    <span className="text-muted-foreground">Agenda: </span>
                    {world.antagonist.agenda}
                  </div>
                </div>
                {world.antagonist.moves.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs uppercase text-muted-foreground">Their Moves</h4>
                    <div className="flex flex-col gap-1">
                      {world.antagonist.moves.map((move, i) => (
                        <div key={i} className="rounded bg-secondary/20 px-3 py-1.5 text-xs">
                          <span className="text-muted-foreground">Ch. {move.chapterNumber}: </span>
                          <span className="text-foreground">{move.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="italic text-muted-foreground">Not yet identified</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ChaptersPanel({
  chapters,
  expandedChapter,
  onToggleChapter,
}: {
  chapters: Chapter[]
  expandedChapter: number | null
  onToggleChapter: (num: number) => void
}) {
  const [showDebrief, setShowDebrief] = useState<Chapter | null>(null)

  return (
    <>
      <div className="flex flex-col gap-3">
        {chapters.map((chapter) => (
          <div
            key={chapter.number}
            className="rounded border border-border/30 bg-secondary/20"
          >
            <button
              onClick={() => onToggleChapter(chapter.number)}
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <div>
                <div className="font-medium text-foreground">{chapter.title}</div>
                <Badge
                  variant={chapter.status === 'complete' ? 'secondary' : 'outline'}
                  className={cn(
                    'mt-1 text-[10px]',
                    chapter.status === 'in-progress' && 'border-primary text-primary'
                  )}
                >
                  {chapter.status === 'complete' ? 'Complete' : 'In Progress'}
                </Badge>
              </div>
            </button>

            {expandedChapter === chapter.number && (
              <div className="border-t border-border/30 p-3">
                <p className="mb-3 text-sm text-muted-foreground">{chapter.summary}</p>

                {chapter.keyEvents.length > 0 && (
                  <div className="mb-3">
                    <h4 className="mb-1 text-xs uppercase text-muted-foreground">Key Events</h4>
                    <ul className="list-inside list-disc text-sm text-foreground">
                      {chapter.keyEvents.map((event, i) => (
                        <li key={i}>{event}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {chapter.rollLog.length > 0 && (
                  <div className="mb-3">
                    <h4 className="mb-1 text-xs uppercase text-muted-foreground">Roll Log</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full font-mono text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="py-1 text-left">Check</th>
                            <th className="py-1 text-center">DC</th>
                            <th className="py-1 text-center">Roll</th>
                            <th className="py-1 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chapter.rollLog.map((entry, i) => (
                            <tr key={i}>
                              <td className="py-1 text-foreground">{entry.check}</td>
                              <td className="py-1 text-center text-muted-foreground">{entry.dc}</td>
                              <td className="py-1 text-center text-foreground">
                                {entry.roll}+{entry.modifier}
                              </td>
                              <td
                                className={cn(
                                  'py-1 text-right font-semibold',
                                  entry.result === 'critical'
                                    ? 'text-warning'
                                    : entry.result === 'success'
                                    ? 'text-success'
                                    : 'text-destructive'
                                )}
                              >
                                {entry.result === 'critical'
                                  ? 'CRIT'
                                  : entry.result === 'success'
                                  ? 'PASS'
                                  : 'FAIL'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => chapter.debrief && setShowDebrief(chapter)}
                  disabled={!chapter.debrief}
                  className="w-full border-border/50 bg-secondary/30"
                >
                  {chapter.debrief ? 'View Debrief' : 'Debrief Available on Completion'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Debrief Modal */}
      {showDebrief && showDebrief.debrief && (
        <Dialog open={!!showDebrief} onOpenChange={() => setShowDebrief(null)}>
          <DialogContent className="max-w-md border-border/50 bg-card/95">
            <DialogHeader>
              <DialogTitle>{showDebrief.title} — Debrief</DialogTitle>
              <DialogDescription className="sr-only">Chapter performance summary</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Tactical Rating</div>
                  <div className="text-2xl font-bold text-primary">
                    {showDebrief.debrief.tactical}
                  </div>
                </div>
                <div className="rounded bg-secondary/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Strategic Rating</div>
                  <div className="text-2xl font-bold text-primary">
                    {showDebrief.debrief.strategic}
                  </div>
                </div>
              </div>
              {showDebrief.debrief.luckyBreaks.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground">Lucky Breaks</h4>
                  <ul className="list-inside list-disc text-success">
                    {showDebrief.debrief.luckyBreaks.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {showDebrief.debrief.costsPaid.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground">Costs Paid</h4>
                  <ul className="list-inside list-disc text-destructive">
                    {showDebrief.debrief.costsPaid.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function SaveLoadModal({
  open,
  onOpenChange,
  mode,
  slots,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'save' | 'load'
  slots: {
    id: number
    name: string | null
    timestamp: string | null
    chapter: number | null
    level: number | null
  }[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border/50 bg-card/95">
        <DialogHeader>
          <DialogTitle>{mode === 'save' ? 'Save Game' : 'Load Game'}</DialogTitle>
          <DialogDescription>
            {mode === 'save' ? 'Choose a slot to save your progress' : 'Choose a save to load'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {slots.map((slot) => (
            <button
              key={slot.id}
              disabled={mode === 'load' && !slot.name}
              className={cn(
                'flex items-center justify-between rounded border p-3 text-left transition-colors',
                slot.name
                  ? 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50'
                  : 'cursor-not-allowed border-border/20 bg-secondary/10 opacity-50'
              )}
            >
              <div>
                <div className="font-medium text-foreground">
                  {slot.name || `Empty Slot ${slot.id}`}
                </div>
                {slot.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    {slot.timestamp} · Ch.{slot.chapter} · Lv.{slot.level}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
