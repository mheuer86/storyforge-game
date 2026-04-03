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
import type { GameState, Antagonist, ShipState, Notebook } from '@/lib/types'
import { debugLog } from '@/lib/tool-processor'
import { renderMarkdown } from './chat-message'

interface Character {
  name: string
  species: { name: string }
  class: {
    name: string
    stats: Record<string, number>
    proficiencies: { name: string }[]
    gear: { name: string; description: string; damage?: string; effect?: string; charges?: number; maxCharges?: number }[]
    trait: { name: string; description: string }
  }
  level: number
  hp: { current: number; max: number }
  ac: number
  credits: number
  inspiration: boolean
  exhaustion: number
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
  npcs: { name: string; description: string; lastSeen: string; subtype?: 'person' | 'vessel' | 'installation'; affiliation?: string; status?: 'active' | 'dead' | 'defeated' | 'gone' }[]
  threads: { title: string; status: string; deteriorating: boolean }[]
  promises: { to: string; what: string; status: 'open' | 'strained' | 'fulfilled' | 'broken' }[]
  antagonist: Antagonist | null
  tensionClocks: { id: string; name: string; status: 'active' | 'triggered' | 'resolved'; triggerEffect: string }[]
  notebook: Notebook | null
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
  chapterMission?: { objective: string; crucible: string } | null
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
  chapterMission,
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
        <SheetContent className="flex w-full flex-col overflow-hidden border-0 bg-background/95 backdrop-blur-xl sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="sr-only">Game Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Access character sheet, ship status, world state, and chapter history
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="character" className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 overflow-x-auto border-b border-border/10 pb-2">
              <TabsList className="flex w-max min-w-full bg-transparent gap-1">
                <TabsTrigger value="character" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                  Character
                </TabsTrigger>
                {ship.state && (
                  <TabsTrigger value="ship" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                    {genre === 'cyberpunk' ? 'Rig' : 'Ship'}
                  </TabsTrigger>
                )}
                {(genre === 'noire' || (world.notebook && world.notebook.clues.length > 0)) && (
                  <TabsTrigger value="notebook" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                    {genreConfig.notebookLabel}
                  </TabsTrigger>
                )}
                <TabsTrigger value="world" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                  World
                </TabsTrigger>
                <TabsTrigger value="chapters" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                  Chapters
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1 overflow-x-hidden" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'calc(1rem * var(--font-scale, 1))' }}>
              {/* Character Tab */}
              <TabsContent value="character" className="mt-0 p-4">
                <CharacterSheet character={character} currencyLabel={genreConfig.currencyName} mission={chapterMission?.objective} />
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

              {/* Notebook Tab */}
              {(genre === 'noire' || (world.notebook && world.notebook.clues.length > 0)) && (
                <TabsContent value="notebook" className="mt-0 p-4">
                  {world.notebook && world.notebook.clues.length > 0 ? (
                    <NotebookPanel notebook={world.notebook} notebookLabel={genreConfig.notebookLabel} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <h2 className="font-heading text-lg font-semibold text-foreground/50">{genreConfig.notebookLabel}</h2>
                      <p className="mt-2 text-sm text-muted-foreground/50 max-w-[240px]">No evidence yet. Ask questions, search rooms, follow leads.</p>
                    </div>
                  )}
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>

          <SheetFooter className="flex-col gap-2 border-t border-border/10 pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openSaveLoad('save')}
                className="flex-1 border-border/15 bg-secondary/10 hover:bg-secondary/20 text-xs"
              >
                Save Game
              </Button>
              <Button
                variant="outline"
                onClick={() => openSaveLoad('load')}
                className="flex-1 border-border/15 bg-secondary/10 hover:bg-secondary/20 text-xs"
              >
                Load Game
              </Button>
            </div>
            {onNewGame && (
              <Button
                variant="outline"
                onClick={() => setNewGameConfirm(true)}
                className="w-full border-border/15 bg-secondary/10 hover:bg-secondary/20 text-xs"
              >
                Start new campaign
              </Button>
            )}
            <a
              href="https://www.paypal.me/MartinHeuer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs text-muted-foreground/60 hover:text-primary transition-colors"
            >
              Every hero needs a patron. Fund the next chapter&nbsp;→
            </a>
            <DebugPanel />
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-6 h-px bg-primary/40" />
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">{children}</h3>
    </div>
  )
}

function CharacterSheet({ character, currencyLabel, mission }: { character: Character; currencyLabel: string; mission?: string | null }) {
  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {character.name}
        </h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          {character.species.name} {character.class.name} · Level {character.level}
        </p>
        {mission && (
          <p className="mt-1.5 text-xs text-primary/60 leading-snug">
            <span className="text-primary/40">▸ </span>{mission}
          </p>
        )}
      </div>

      {/* Vitals — key-value rows */}
      <div className="flex flex-col">
        {[
          { label: 'HP', value: `${character.hp.current} / ${character.hp.max}` },
          { label: 'AC', value: String(character.ac) },
          { label: currencyLabel, value: String(character.credits) },
          { label: 'Inspiration', value: character.inspiration ? '◆ Ready' : '◇ —' },
          ...(character.exhaustion > 0 ? [{ label: 'Exhaustion', value: `Level ${character.exhaustion}` }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-border/8 py-2 last:border-0">
            <span className="text-sm text-foreground/40 capitalize">{row.label}</span>
            <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Stats — terminal cards */}
      <div>
        <SectionLabel>Stats</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(character.class.stats).map(([stat, value]) => (
            <div key={stat} className="rounded-lg border border-border/10 bg-secondary/5 p-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{stat}</div>
              <div className="font-mono text-lg font-semibold text-foreground">{value}</div>
              <div className="font-mono text-xs text-primary/80">
                {formatModifier(getStatModifier(value))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proficiencies */}
      <div>
        <SectionLabel>Proficiencies</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {character.class.proficiencies.map((p) => (
            <span key={p.name} className="rounded border border-border/15 bg-secondary/8 px-2.5 py-1 text-xs text-foreground/60">
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* Gear — name + description left, effect badges right */}
      <div>
        <SectionLabel>Gear</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          {character.class.gear.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-start gap-2.5 text-sm">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-foreground/70">{item.name}</span>
                {item.description && (
                  <p className="text-xs text-foreground/40 leading-relaxed mt-0.5">{item.description}</p>
                )}
              </div>
              {(item.damage || item.effect || item.charges != null) && (
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  {item.damage && (
                    <div className="rounded-lg border border-border/30 bg-secondary/5 px-2 py-1 text-center min-w-[3.5rem]">
                      <div className="font-mono text-xs font-semibold text-foreground/70">{item.damage}</div>
                    </div>
                  )}
                  {item.effect && (
                    <div className="rounded-lg border border-border/30 bg-secondary/5 px-2 py-1 text-center min-w-[3.5rem]">
                      <div className="font-mono text-xs font-semibold text-primary/80">{item.effect}</div>
                    </div>
                  )}
                  {item.charges != null && (
                    <div className="rounded-lg border border-border/30 bg-secondary/5 px-2 py-1 text-center min-w-[3.5rem]">
                      <div className="font-mono text-[10px] font-semibold text-foreground/60">{item.charges}/{item.maxCharges}</div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Trait — left accent border */}
      <div>
        <SectionLabel>Class Trait</SectionLabel>
        <div className="border-l-2 border-primary/30 pl-3">
          <div className="text-xs font-medium text-primary">{character.class.trait.name}</div>
          <div className="mt-1 text-xs text-foreground/50 leading-relaxed">{character.class.trait.description}</div>
        </div>
      </div>

      {/* Temporary Effects */}
      {character.tempEffects.length > 0 && (
        <div>
          <SectionLabel>Temporary Effects</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {character.tempEffects.map((effect, i) => (
              <div key={i} className="border-l-2 border-warning/30 pl-3 py-1">
                <div className="text-xs font-medium text-foreground">{effect.name}</div>
                <div className="text-[11px] text-muted-foreground/50">{effect.effect} — {effect.duration}</div>
              </div>
            ))}
          </div>
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
          <h2 className="font-heading text-lg font-semibold text-foreground">{isCyberpunk ? 'Tech Rig' : ship.name}</h2>
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-foreground/50">{conditionLabel}</span>
              <span className={hullColor}>{s.hullCondition}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
              <div className={cn('h-full rounded-full transition-all', hullBarColor)} style={{ width: `${s.hullCondition}%` }} />
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>{isCyberpunk ? 'Modules' : 'Systems'}</SectionLabel>
          <div className="flex flex-col gap-2">
            {s.systems.map((sys) => (
              <div key={sys.id} className="flex items-start gap-3 rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{sys.name}</div>
                  <div className="break-words text-xs text-foreground/60">{sys.description}</div>
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
            <SectionLabel>{isCyberpunk ? 'Active Abilities' : 'Combat Options'}</SectionLabel>
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
          <SectionLabel>{isCyberpunk ? 'Mod History' : 'Refit History'}</SectionLabel>
          {s.upgradeLog.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {s.upgradeLog.map((entry, i) => (
                <li key={i} className="text-xs text-foreground break-words">{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="italic text-foreground/30">No upgrades yet</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">{partyBaseName}</h2>
        <p className="mt-2 italic text-foreground/30">
          Not yet established. As your story unfolds, the GM will introduce a place to call your own.
        </p>
      </div>
      {ship.name && (
        <div className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
          <div className="text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">Reserved name</div>
          <div className="mt-1 font-medium text-foreground">{ship.name}</div>
        </div>
      )}
    </div>
  )
}

function WorldPanel({ world, partyBaseName }: { world: World; partyBaseName: string }) {
  const [subtab, setSubtab] = useState<'people' | 'narrative' | 'locations'>('people')

  const isVessel = (n: { subtype?: string }) => n.subtype === 'vessel' || n.subtype === 'installation'
  const isResolved = (s: string) => s.toLowerCase() === 'resolved'
  const activeThreads = world.threads.filter((t) => !isResolved(t.status))
  const openPromises = world.promises.filter((p) => p.status === 'open')

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Subtab toggle */}
      <div className="flex gap-4">
        {(['people', 'narrative', 'locations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubtab(tab)}
            className={cn(
              'text-[10px] font-medium uppercase tracking-[0.15em] transition-colors pb-1',
              subtab === tab
                ? 'text-primary border-b border-primary/40'
                : 'text-muted-foreground/40 hover:text-muted-foreground/60'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── People ── */}
      {subtab === 'people' && (
        <>
          {/* Companions */}
          <div>
            <SectionLabel>Companions</SectionLabel>
            {world.companions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.companions.map((c, i) => (
                  <div key={`${i}-${c.name}`} className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-foreground/60">{c.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-foreground/30">No companions yet</p>
            )}
          </div>

          {/* Antagonist — only show if active */}
          {(!world.antagonist || !world.antagonist.status || world.antagonist.status === 'active') && (
            <div>
              <SectionLabel>Antagonist</SectionLabel>
              {world.antagonist ? (
                <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{world.antagonist.name}</div>
                    {world.antagonist.movedThisChapter && (
                      <Badge variant="destructive" className="shrink-0 text-[10px]">Moved</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-foreground/60">{world.antagonist.description}</div>
                  {world.antagonist.moves.length > 0 && (
                    <div className="mt-2.5 border-t border-destructive/15 pt-2">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Their Moves</div>
                      <div className="flex flex-col gap-1.5">
                        {world.antagonist.moves.map((move, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-foreground/40">Ch. {move.chapterNumber}: </span>
                            <span className="text-foreground/60">{move.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="italic text-foreground/30">Not yet identified</p>
              )}
            </div>
          )}

          {/* Factions */}
          <div>
            <SectionLabel>Factions</SectionLabel>
            {world.factions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {world.factions.map((faction, i) => (
                  <div key={`${i}-${faction.name}`} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{faction.name}</div>
                    <div className="text-xs text-foreground/60">{faction.stance}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-foreground/30">No factions encountered</p>
            )}
          </div>

          {/* NPCs — grouped by affiliation */}
          {(() => {
            const isFallen = (n: { status?: string }) => n.status === 'dead' || n.status === 'defeated' || n.status === 'gone'
            const people = world.npcs.filter((n) => !isVessel(n) && !isFallen(n))
            const fallen = world.npcs.filter((n) => !isVessel(n) && isFallen(n))

            const affiliated = people.filter((n) => n.affiliation)
            const unaffiliated = people.filter((n) => !n.affiliation)
            const groups = Array.from(new Set(affiliated.map((n) => n.affiliation!)))

            const statusLabel = (s?: string) => s === 'dead' ? 'Dead' : s === 'defeated' ? 'Defeated' : 'Gone'

            return (
              <>
                <div>
                  <SectionLabel>Known NPCs</SectionLabel>
                  {people.length === 0 ? (
                    <p className="italic text-foreground/30">No one encountered yet</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {groups.map((group) => (
                        <div key={group}>
                          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{group}</div>
                          <div className="flex flex-col gap-2">
                            {affiliated.filter((n) => n.affiliation === group).map((npc, i) => (
                              <div key={`${i}-${npc.name}`} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                                <div className="font-medium text-foreground">{npc.name}</div>
                                <div className="text-xs text-foreground/60">{npc.description}</div>
                                <div className="mt-1 text-[10px] text-muted-foreground">{npc.lastSeen}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {unaffiliated.length > 0 && (
                        <div>
                          {groups.length > 0 && <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Unaffiliated</div>}
                          <div className="flex flex-col gap-2">
                            {unaffiliated.map((npc, i) => (
                              <div key={`${i}-${npc.name}`} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                                <div className="font-medium text-foreground">{npc.name}</div>
                                <div className="text-xs text-foreground/60">{npc.description}</div>
                                <div className="mt-1 text-[10px] text-muted-foreground">{npc.lastSeen}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fallen — dead, defeated, gone NPCs + defeated antagonist */}
                {(() => {
                  const fallenAntagonist = world.antagonist && world.antagonist.status && world.antagonist.status !== 'active' ? world.antagonist : null
                  const hasFallen = fallen.length > 0 || fallenAntagonist
                  if (!hasFallen) return null
                  return (
                    <div className="mt-2 border-t border-border/10 pt-3">
                      <SectionLabel>Fallen</SectionLabel>
                      <div className="flex flex-col gap-2 opacity-60">
                        {fallenAntagonist && (
                          <div className="rounded border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-foreground">{fallenAntagonist.name}</div>
                              <span className="text-[10px] uppercase tracking-wider text-destructive/70">
                                {fallenAntagonist.status === 'dead' ? 'Dead' : fallenAntagonist.status === 'fled' ? 'Fled' : 'Defeated'}
                              </span>
                            </div>
                            <div className="text-xs text-foreground/50">{fallenAntagonist.description}</div>
                          </div>
                        )}
                        {fallen.map((npc, i) => (
                          <div key={`fallen-${i}-${npc.name}`} className="rounded-lg border border-border/20 bg-secondary/10 px-3 py-2.5">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-foreground">{npc.name}</div>
                              <span className="text-[10px] uppercase tracking-wider text-destructive/70">{statusLabel(npc.status)}</span>
                            </div>
                            <div className="text-xs text-foreground/50">{npc.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </>
      )}

      {/* ── Narrative ── */}
      {subtab === 'narrative' && (
        <>
          {/* Active Threads */}
          <div>
            <SectionLabel>Active Threads</SectionLabel>
            {activeThreads.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeThreads.map((thread, i) => (
                  <div key={`${i}-${thread.title}`} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{thread.title}</div>
                    <div className="text-xs text-foreground/50">{thread.status}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-foreground/30">No active threads</p>
            )}
          </div>

          {/* Active Pressures */}
          {(() => {
            const activeClocks = world.tensionClocks.filter((c) => c.status === 'active')
            return activeClocks.length > 0 ? (
              <div>
                <SectionLabel>Pressures</SectionLabel>
                <div className="flex flex-col gap-2">
                  {activeClocks.map((clock) => (
                    <div key={clock.id} className="rounded border border-warning/30 bg-warning/5 px-3 py-2">
                      <div className="font-medium text-foreground">{clock.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Promises — show all non-settled */}
          {(() => {
            const activePromises = world.promises.filter((p) => p.status !== 'fulfilled' && p.status !== 'broken')
            return (
              <div>
                <SectionLabel>Promises & Debts</SectionLabel>
                {activePromises.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {activePromises.map((promise, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded px-3 py-2',
                          promise.status === 'strained'
                            ? 'border border-orange-400/30 bg-orange-400/5'
                            : 'border border-warning/30 bg-warning/5'
                        )}
                      >
                        <div className="font-medium text-foreground">{promise.to}</div>
                        <div className="text-xs text-foreground/60">{promise.what}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-foreground/30">No promises made yet</p>
                )}
              </div>
            )
          })()}

          {/* Archive — resolved threads, triggered/resolved clocks, fulfilled/broken promises */}
          {(() => {
            const resolvedThreads = world.threads.filter((t) => isResolved(t.status))
            const triggeredClocks = world.tensionClocks.filter((c) => c.status === 'triggered')
            const resolvedClocks = world.tensionClocks.filter((c) => c.status === 'resolved')
            const settledPromises = world.promises.filter((p) => p.status === 'fulfilled' || p.status === 'broken')
            const hasArchive = resolvedThreads.length > 0 || triggeredClocks.length > 0 || resolvedClocks.length > 0 || settledPromises.length > 0

            return hasArchive ? (
              <div className="mt-2 border-t border-border/10 pt-3">
                <SectionLabel>Archive</SectionLabel>
                <div className="flex flex-col gap-2 opacity-60">
                  {/* Triggered clocks — lost (destructive) */}
                  {triggeredClocks.map((clock) => (
                    <div key={clock.id} className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{clock.name}</div>
                        <span className="text-[10px] uppercase tracking-wider text-destructive/70">Triggered</span>
                      </div>
                      <div className="text-xs text-foreground/50">{clock.triggerEffect}</div>
                    </div>
                  ))}
                  {/* Resolved threads — won (green) */}
                  {resolvedThreads.map((thread, i) => (
                    <div key={`t-${i}`} className="rounded border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{thread.title}</div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">Resolved</span>
                      </div>
                    </div>
                  ))}
                  {/* Defused clocks — won (green) */}
                  {resolvedClocks.map((clock) => (
                    <div key={clock.id} className="rounded border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{clock.name}</div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">Defused</span>
                      </div>
                    </div>
                  ))}
                  {/* Settled promises — fulfilled (green) / broken (destructive) */}
                  {settledPromises.map((promise, i) => (
                    <div
                      key={`p-${i}`}
                      className={cn(
                        'rounded px-3 py-2',
                        promise.status === 'fulfilled'
                          ? 'border border-emerald-400/20 bg-emerald-400/5'
                          : 'border border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{promise.to}</div>
                        <span className={cn(
                          'text-[10px] uppercase tracking-wider',
                          promise.status === 'fulfilled' ? 'text-emerald-400/70' : 'text-destructive/70'
                        )}>
                          {promise.status === 'fulfilled' ? 'Kept' : 'Broken'}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/50">{promise.what}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}
        </>
      )}

      {/* ── Locations ── */}
      {subtab === 'locations' && (
        <>
          {/* Current Location */}
          <div>
            <SectionLabel>Current Location</SectionLabel>
            <div className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
              <div className="font-medium text-foreground">{world.location.name}</div>
              <div className="text-xs text-foreground/60">{world.location.description}</div>
            </div>
          </div>

          {/* Vessels & Installations */}
          {world.npcs.filter(isVessel).length > 0 && (
            <div>
              <SectionLabel>Vessels & Installations</SectionLabel>
              <div className="flex flex-col gap-2">
                {world.npcs.filter(isVessel).map((v, i) => (
                  <div key={`${i}-${v.name}`} className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                    <div className="font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-foreground/60">{v.description}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{v.lastSeen}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NotebookPanel({ notebook, notebookLabel }: { notebook: Notebook; notebookLabel: string }) {
  const visibleClues = notebook.clues.filter(c => !c.isRedHerring || c.connected.length > 0)

  // Resolve clue IDs — exact match first, then slug-to-title fallback (GM sometimes uses slugs instead of auto-IDs)
  const normalize = (s: string) => s.replace(/[_\-]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
  const resolveClue = (id: string) => {
    const exact = notebook.clues.find(c => c.id === id)
    if (exact) return exact
    const norm = normalize(id)
    const byTitle = notebook.clues.find(c => c.title && normalize(c.title) === norm)
    if (byTitle) return byTitle
    const byTitlePartial = notebook.clues.find(c => c.title && normalize(c.title).includes(norm))
    if (byTitlePartial) return byTitlePartial
    const byContent = notebook.clues.find(c => normalize(c.content).includes(norm))
    if (byContent) return byContent
    // Last resort: check if any word overlap between slug and title
    const slugWords = norm.split(' ').filter(w => w.length > 3)
    const byWords = notebook.clues.find(c => {
      if (!c.title) return false
      const titleNorm = normalize(c.title)
      return slugWords.filter(w => titleNorm.includes(w)).length >= 2
    })
    console.log('[SF] resolveClue:', id, '→ norm:', norm, '→ clue titles:', notebook.clues.map(c => c.title), '→ found:', byWords?.title ?? 'NONE')
    return byWords ?? null
  }

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {notebook.activeThreadTitle || notebookLabel}
        </h2>
        <div className="mt-1 text-xs text-muted-foreground">
          {notebook.connections.length > 0 && `${notebook.connections.length} ${notebook.connections.length === 1 ? 'connection' : 'connections'} · `}
          {notebook.clues.length} {notebook.clues.length === 1 ? 'clue' : 'clues'} discovered
        </div>
      </div>

      {/* Connections — active on top */}
      {(() => {
        const activeConns = notebook.connections.filter(c => !c.status || c.status === 'active')
        const resolvedConns = notebook.connections.filter(c => c.status === 'solved' || c.status === 'archived')

        const ConnectionCard = ({ conn, dimmed }: { conn: typeof notebook.connections[0]; dimmed?: boolean }) => {
          const linkedClues = conn.clueIds.map(resolveClue).filter(Boolean)
          return (
            <div className={cn(
              'rounded-lg border px-3 py-2.5',
              dimmed ? 'border-border/20 bg-secondary/10' : 'border-primary/20 bg-primary/5'
            )}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-foreground">{conn.title || 'Connection'}</div>
                {dimmed && (
                  <span className={cn(
                    'text-[10px] uppercase tracking-wider',
                    conn.status === 'solved' ? 'text-emerald-400/70' : 'text-foreground/30'
                  )}>
                    {conn.status === 'solved' ? 'Solved' : 'Archived'}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-foreground/60 leading-relaxed">{conn.revelation}</div>
              {linkedClues.length > 0 && (
                <div className="mt-2 border-t border-primary/10 pt-2 flex flex-col gap-1.5">
                  {linkedClues.map(c => (
                    <div key={c!.id} className="text-xs text-foreground/50">
                      <span className="text-primary/40">●</span> {c!.title || c!.content.slice(0, 50) + '...'}
                      <span className="text-muted-foreground/40 ml-1">— {c!.source}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return activeConns.length > 0 ? (
          <div>
            <SectionLabel>Connections</SectionLabel>
            <div className="flex flex-col gap-3 mt-2">
              {activeConns.map((conn, i) => <ConnectionCard key={`ac-${i}`} conn={conn} />)}
            </div>
          </div>
        ) : null
      })()}

      {/* Active evidence */}
      {(() => {
        const active = [...visibleClues].filter(c => !c.status || c.status === 'active').reverse()
        const connectedIds = new Set(notebook.connections.flatMap(c => c.clueIds.map(id => resolveClue(id)?.id).filter(Boolean)))

        const ClueCard = ({ clue }: { clue: typeof visibleClues[0] }) => (
          <div className={cn(
            'rounded-lg border px-3 py-2',
            connectedIds.has(clue.id) ? 'border-border/10 bg-secondary/5 opacity-50' : 'border-border/10 bg-secondary/5'
          )}>
            {clue.title && <div className="font-medium text-foreground mb-0.5">{clue.title}</div>}
            <div className="text-xs text-foreground/60 leading-relaxed">{clue.content}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="min-w-0">{clue.source}</span>
              <span className="shrink-0">·</span>
              <span className="shrink-0 whitespace-nowrap">Ch. {clue.discoveredChapter}</span>
            </div>
          </div>
        )

        return active.length > 0 ? (
          <div>
            <SectionLabel>Evidence</SectionLabel>
            <div className="flex flex-col gap-2 mt-2">
              {active.map((clue) => <ClueCard key={clue.id} clue={clue} />)}
            </div>
          </div>
        ) : null
      })()}

      {/* Unified Resolved section — connections + evidence */}
      {(() => {
        const resolvedConns = notebook.connections.filter(c => c.status === 'solved' || c.status === 'archived')
        const resolvedClues = [...visibleClues].filter(c => c.status === 'solved' || c.status === 'archived').reverse()
        if (resolvedConns.length === 0 && resolvedClues.length === 0) return null

        return (
          <div className="mt-2 border-t border-border/10 pt-3">
            <SectionLabel>Resolved</SectionLabel>
            <div className="flex flex-col gap-2 mt-2 opacity-60">
              {resolvedConns.map((conn, i) => {
                const linkedClues = conn.clueIds.map(resolveClue).filter(Boolean)
                return (
                  <div key={`rc-${i}`} className="rounded-lg border border-border/20 bg-secondary/10 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">{conn.title || 'Connection'}</div>
                      <span className={cn(
                        'text-[10px] uppercase tracking-wider',
                        conn.status === 'solved' ? 'text-emerald-400/70' : 'text-foreground/30'
                      )}>
                        {conn.status === 'solved' ? 'Solved' : 'Archived'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-foreground/50 leading-relaxed">{conn.revelation}</div>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {linkedClues.map(c => (
                        <div key={c!.id} className="text-xs text-foreground/40">
                          <span className="text-foreground/30">●</span> {c!.title || c!.content.slice(0, 50) + '...'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {resolvedClues.map((clue) => (
                <div key={clue.id} className="rounded-lg border border-border/20 bg-secondary/10 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground">{clue.title || clue.content.slice(0, 40) + '...'}</div>
                    <span className={cn(
                      'text-[10px] uppercase tracking-wider',
                      clue.status === 'solved' ? 'text-emerald-400/70' : 'text-foreground/30'
                    )}>
                      {clue.status === 'solved' ? 'Solved' : 'Archived'}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/50 leading-relaxed">{clue.content}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
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
                <div className="font-heading font-medium text-foreground">{chapter.title}</div>
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
                <p className="mb-3 text-sm text-foreground/60 leading-relaxed">{chapter.summary}</p>

                {chapter.keyEvents.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2"><div className="w-4 h-px bg-primary/40" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Key Events</span></div>
                    <ul className="list-inside list-disc text-sm text-foreground/80">
                      {chapter.keyEvents.map((event, i) => (
                        <li key={i}>{event}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {chapter.rollLog.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2"><div className="w-4 h-px bg-primary/40" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Roll Log</span></div>
                    <div className="overflow-x-auto">
                      <table className="w-full font-mono text-xs">
                        <thead>
                          <tr className="text-foreground/40">
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
                              <td className="py-1 text-center text-foreground/50">{entry.dc}</td>
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
          <DialogContent className="max-w-sm border-border/50 bg-card/95" style={{ fontFamily: 'var(--font-narrative)', fontSize: 'calc(1rem * var(--font-scale, 1))' }}>
            <DialogHeader>
              <DialogTitle className="font-heading text-base">{showDebrief.title} — Debrief</DialogTitle>
              <DialogDescription className="sr-only">Chapter performance summary</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm max-h-[70vh] overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 mb-1.5"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Tactical</span></div>
                <div className="text-sm text-foreground/70 leading-relaxed">{renderMarkdown(showDebrief.debrief.tactical)}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Strategic</span></div>
                <div className="text-sm text-foreground/70 leading-relaxed">{renderMarkdown(showDebrief.debrief.strategic)}</div>
              </div>
              {showDebrief.debrief.luckyBreaks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Lucky Breaks</span></div>
                  <ul className="flex flex-col gap-1">
                    {showDebrief.debrief.luckyBreaks.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/60">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showDebrief.debrief.costsPaid.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Costs Paid</span></div>
                  <ul className="flex flex-col gap-1">
                    {showDebrief.debrief.costsPaid.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/60">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showDebrief.debrief.promisesKept && showDebrief.debrief.promisesKept.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Promises Kept</span></div>
                  <ul className="flex flex-col gap-1">
                    {showDebrief.debrief.promisesKept.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/60">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showDebrief.debrief.promisesBroken && showDebrief.debrief.promisesBroken.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1"><div className="w-4 h-px bg-primary/20" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70" style={{ fontFamily: 'var(--font-ui)' }}>Promises Broken</span></div>
                  <ul className="flex flex-col gap-1">
                    {showDebrief.debrief.promisesBroken.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/60">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-1 rounded border border-border/20 bg-secondary/20 px-3 py-2.5 text-center">
                <p className="text-xs text-muted-foreground">
                  The forge burns real fuel. If this story&apos;s worth telling, keep the fires lit.
                </p>
                <a
                  href="https://www.paypal.me/MartinHeuer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  style={{ textShadow: 'var(--title-glow)' }}
                >
                  Buy the forgemaster a drink&nbsp;→
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function DebugPanel() {
  const [open, setOpen] = useState(false)
  if (debugLog.length === 0) return null
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors"
      >
        {open ? '▾ hide debug' : '▸ debug log'}
      </button>
      {open && (
        <div className="mt-1 rounded border border-border/10 bg-black/30 p-2 font-mono text-[9px] text-foreground/40 max-h-40 overflow-y-auto">
          {debugLog.map((entry, i) => (
            <div key={i} className="break-all">{entry}</div>
          ))}
        </div>
      )}
    </div>
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
