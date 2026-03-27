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
import { getStatModifier, formatModifier } from '@/lib/game-data'

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
  class: string
  condition: string
  systems: { name: string; description: string }[]
  refitHistory: { chapter: number; upgrade: string }[]
}

interface World {
  location: { name: string; description: string }
  factions: { name: string; stance: string }[]
  npcs: { name: string; description: string; lastSeen: string }[]
  threads: { title: string; status: string; deteriorating: boolean }[]
  promises: { to: string; what: string; status: 'open' | 'fulfilled' | 'broken' }[]
}

interface Chapter {
  number: number
  title: string
  status: 'complete' | 'in-progress'
  summary: string
  keyEvents: string[]
  rollLog: { check: string; dc: number; roll: number; modifier: number; result: 'success' | 'failure' | 'critical' }[]
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
}

export function BurgerMenu({
  open,
  onOpenChange,
  character,
  ship,
  world,
  chapters,
}: BurgerMenuProps) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)

  const saveSlots = [
    { id: 1, name: 'Quicksave', timestamp: '2024-01-15 10:30', chapter: 1, level: 1 },
    { id: 2, name: 'Before Station', timestamp: '2024-01-14 21:15', chapter: 0, level: 1 },
    { id: 3, name: null, timestamp: null, chapter: null, level: null },
    { id: 4, name: null, timestamp: null, chapter: null, level: null },
    { id: 5, name: null, timestamp: null, chapter: null, level: null },
  ]

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
            <TabsList className="grid w-full grid-cols-4 bg-secondary/30">
              <TabsTrigger value="character" className="text-xs">
                Character
              </TabsTrigger>
              <TabsTrigger value="ship" className="text-xs">
                Ship
              </TabsTrigger>
              <TabsTrigger value="world" className="text-xs">
                World
              </TabsTrigger>
              <TabsTrigger value="chapters" className="text-xs">
                Chapters
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* Character Tab */}
              <TabsContent value="character" className="mt-0 p-4">
                <CharacterSheet character={character} />
              </TabsContent>

              {/* Ship Tab */}
              <TabsContent value="ship" className="mt-0 p-4">
                <ShipPanel ship={ship} />
              </TabsContent>

              {/* World Tab */}
              <TabsContent value="world" className="mt-0 p-4">
                <WorldPanel world={world} />
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
                onClick={() => setShowSaveModal(true)}
                className="flex-1 border-border/50 bg-secondary/30"
              >
                Save Game
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLoadModal(true)}
                className="flex-1 border-border/50 bg-secondary/30"
              >
                Load Game
              </Button>
            </div>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <button className="hover:text-foreground">Export</button>
              <span>·</span>
              <button className="hover:text-foreground">Import</button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Save/Load Modals */}
      <SaveLoadModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        mode="save"
        slots={saveSlots}
      />
      <SaveLoadModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        mode="load"
        slots={saveSlots}
      />
    </>
  )
}

function CharacterSheet({ character }: { character: Character }) {
  return (
    <div className="flex flex-col gap-4 font-mono text-sm">
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
          {character.class.startingGear.map((item) => (
            <li key={item}>{item}</li>
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
        <span className="text-muted-foreground">Credits:</span>{' '}
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

function ShipPanel({ ship }: { ship: Ship }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {ship.name}{' '}
          <span className="text-muted-foreground">— {ship.class}</span>
        </h2>
        <div className="mt-1 text-sm text-muted-foreground">
          Condition:{' '}
          <span className="text-success">{ship.condition}</span>
        </div>
      </div>

      {/* Systems */}
      <div>
        <h3 className="mb-2 text-xs uppercase text-muted-foreground">Installed Systems</h3>
        <div className="flex flex-col gap-2">
          {ship.systems.map((system) => (
            <div
              key={system.name}
              className="rounded border border-border/30 bg-secondary/20 px-3 py-2"
            >
              <div className="font-medium text-foreground">{system.name}</div>
              <div className="text-xs text-muted-foreground">{system.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Refit History */}
      <div>
        <h3 className="mb-2 text-xs uppercase text-muted-foreground">Refit History</h3>
        {ship.refitHistory.length > 0 ? (
          <ul className="list-inside list-disc text-foreground">
            {ship.refitHistory.map((refit, i) => (
              <li key={i}>
                Chapter {refit.chapter}: {refit.upgrade}
              </li>
            ))}
          </ul>
        ) : (
          <p className="italic text-muted-foreground">No upgrades yet</p>
        )}
      </div>
    </div>
  )
}

function WorldPanel({ world }: { world: World }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Current Location */}
      <div>
        <h3 className="mb-1 text-xs uppercase text-muted-foreground">Current Location</h3>
        <div className="font-medium text-foreground">{world.location.name}</div>
        <div className="text-xs text-muted-foreground">{world.location.description}</div>
      </div>

      {/* Known Factions */}
      <div>
        <h3 className="mb-2 text-xs uppercase text-muted-foreground">Known Factions</h3>
        <div className="flex flex-col gap-1">
          {world.factions.map((faction) => (
            <div key={faction.name} className="text-foreground">
              <span className="font-medium">{faction.name}</span>
              <span className="text-muted-foreground"> — {faction.stance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Known NPCs */}
      <div>
        <h3 className="mb-2 text-xs uppercase text-muted-foreground">Known NPCs</h3>
        <div className="flex flex-col gap-2">
          {world.npcs.map((npc) => (
            <div key={npc.name}>
              <div className="font-medium text-foreground">{npc.name}</div>
              <div className="text-xs text-muted-foreground">
                {npc.description} ({npc.lastSeen})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Threads */}
      <div>
        <h3 className="mb-2 text-xs uppercase text-muted-foreground">Open Threads</h3>
        <div className="flex flex-col gap-2">
          {world.threads.map((thread) => (
            <div
              key={thread.title}
              className="rounded border border-border/30 bg-secondary/20 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{thread.title}</span>
                {thread.deteriorating && (
                  <Badge variant="destructive" className="text-[10px]">
                    Deteriorating
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{thread.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Promises & Debts */}
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
