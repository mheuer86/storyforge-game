'use client'

import { useState, useEffect } from 'react'
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
import type { GameState, Antagonist, ShipState, Notebook, OperationState, ExplorationState } from '@/lib/types'
import { debugLog } from '@/lib/tool-processor'
import { isByok, getApiKey, setApiKey, clearApiKey } from '@/lib/api-key'
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
  decisions: { id: string; summary: string; context: string; category: 'moral' | 'tactical' | 'strategic' | 'relational'; status: 'active' | 'superseded' | 'abandoned'; reason?: string; chapter: number }[]
  antagonist: Antagonist | null
  tensionClocks: { id: string; name: string; status: 'active' | 'triggered' | 'resolved'; triggerEffect: string }[]
  notebook: Notebook | null
  operationState: OperationState | null
  explorationState: ExplorationState | null
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
  onConnectEvidence?: () => void
  initialTab?: string
  tokenLog?: Array<{ input: number; output: number; cacheWrite: number; cacheRead: number; timestamp: string }>
  debugLog?: string[]
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
  onConnectEvidence,
  initialTab,
  tokenLog,
  debugLog,
}: BurgerMenuProps) {
  const genreConfig = getGenreConfig(genre)
  const [activeMenuTab, setActiveMenuTab] = useState(initialTab || 'character')
  useEffect(() => {
    if (initialTab && open) setActiveMenuTab(initialTab)
  }, [initialTab, open])
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null)
  const [saveMode, setSaveMode] = useState<'save' | 'load' | null>(null)
  const [loadConfirm, setLoadConfirm] = useState<SaveSlotData | null>(null)
  const [newGameConfirm, setNewGameConfirm] = useState(false)
  const [slots, setSlots] = useState<(SaveSlotData | null)[]>([null, null, null])
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [savedSlot, setSavedSlot] = useState<number | null>(null)
  const isDebug = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && localStorage.getItem('storyforge_debug') === '1')

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

          <Tabs value={activeMenuTab} onValueChange={setActiveMenuTab} className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 overflow-x-auto border-b border-border/10 pb-2">
              <TabsList className="flex w-max min-w-full bg-transparent gap-1">
                <TabsTrigger value="character" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                  Character
                </TabsTrigger>
                <TabsTrigger value="world" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                  World
                </TabsTrigger>
                {(world.operationState || genre === 'noire' || (world.notebook && world.notebook.clues.length > 0)) && (
                  <TabsTrigger value="intel" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                    {genreConfig.intelTabLabel}
                  </TabsTrigger>
                )}
                {ship.state && (
                  <TabsTrigger value="ship" className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:border-b data-[state=active]:border-primary/40 data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/50 bg-transparent shadow-none rounded-none">
                    {genreConfig.partyBaseName}
                  </TabsTrigger>
                )}
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
                <WorldPanel world={world} partyBaseName={genreConfig.partyBaseName} explorationLabel={genreConfig.explorationLabel} companionLabel={genreConfig.companionLabel} inventory={character.class.gear} />
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
                {/* Token usage stats (dev or debug flag) */}
                {isDebug && tokenLog && tokenLog.length > 0 && (() => {
                  const totals = tokenLog.reduce((acc, t) => ({
                    input: acc.input + t.input,
                    output: acc.output + t.output,
                    cacheWrite: acc.cacheWrite + t.cacheWrite,
                    cacheRead: acc.cacheRead + t.cacheRead,
                  }), { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })
                  const cacheRate = totals.input > 0 ? Math.round((totals.cacheRead / (totals.input + totals.cacheRead)) * 100) : 0
                  const cost = (
                    (totals.input - totals.cacheRead) * 3 / 1_000_000 +
                    totals.cacheRead * 0.30 / 1_000_000 +
                    totals.cacheWrite * 3.75 / 1_000_000 +
                    totals.output * 15 / 1_000_000
                  )
                  const exportCsv = () => {
                    const header = 'timestamp,input_tokens,output_tokens,cache_write,cache_read\n'
                    const rows = tokenLog.map(t => `${t.timestamp},${t.input},${t.output},${t.cacheWrite},${t.cacheRead}`).join('\n')
                    const blob = new Blob([header + rows], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `storyforge-tokens-${new Date().toISOString().slice(0, 10)}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                  return (
                    <div className="mt-6 border-t border-border/10 pt-4">
                      <SectionLabel>Token Usage (this session)</SectionLabel>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="text-muted-foreground">API calls</div>
                        <div className="text-right text-foreground">{tokenLog.length}</div>
                        <div className="text-muted-foreground">Input tokens</div>
                        <div className="text-right text-foreground">{(totals.input + totals.cacheRead).toLocaleString()}</div>
                        <div className="text-muted-foreground">Output tokens</div>
                        <div className="text-right text-foreground">{totals.output.toLocaleString()}</div>
                        <div className="text-muted-foreground">Cache hit rate</div>
                        <div className="text-right text-foreground">{cacheRate}%</div>
                        <div className="text-muted-foreground">Est. cost</div>
                        <div className="text-right text-foreground">${cost.toFixed(4)}</div>
                      </div>
                      <button
                        onClick={exportCsv}
                        className="mt-3 text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                      >
                        Export CSV
                      </button>
                      {debugLog && debugLog.length > 0 && (
                        <button
                          onClick={() => {
                            const blob = new Blob([debugLog.join('\n')], { type: 'text/plain' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `storyforge-debug-${new Date().toISOString().slice(0, 10)}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="mt-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors ml-4"
                        >
                          Export Debug Log
                        </button>
                      )}
                    </div>
                  )
                })()}
              </TabsContent>

              {/* Intel Tab — operation brief + notebook */}
              {(world.operationState || genre === 'noire' || (world.notebook && world.notebook.clues.length > 0)) && (
                <TabsContent value="intel" className="mt-0 p-4">
                  <IntelPanel
                    operationState={world.operationState}
                    notebook={world.notebook}
                    evidenceLabel={genreConfig.intelNotebookLabel}
                    operationLabel={genreConfig.intelOperationLabel}
                    notebookLabel={genreConfig.notebookLabel}
                    genre={genre}
                    onConnect={onConnectEvidence}
                  />
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
            {/* API key status */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/40">
              <span>{isByok() ? `API key: ...${getApiKey()?.slice(-6)}` : 'Demo mode'}</span>
              {isByok() ? (
                <button onClick={() => { clearApiKey(); window.location.reload() }} className="text-destructive/50 hover:text-destructive/80 transition-colors">
                  Remove key
                </button>
              ) : (
                <button onClick={() => setApiKeyDialogOpen(true)} className="text-primary/50 hover:text-primary/80 transition-colors">
                  Add API key
                </button>
              )}
            </div>
            <a
              href="https://buymeacoffee.com/storyforgegame"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs text-muted-foreground/60 hover:text-primary transition-colors"
            >
              Every hero needs a patron. Buy me a beer&nbsp;→
            </a>
            {isDebug && <DebugPanel />}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* API Key dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => { setApiKeyDialogOpen(open); if (!open) { setApiKeyInput(''); setApiKeyError('') } }}>
        <DialogContent className="max-w-sm border-border/50 bg-card/95">
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>
              Your key is stored in your browser only and never sent to our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError('') }}
              placeholder="sk-ant-..."
              className="rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:shadow-[0_0_10px_-3px] focus:shadow-primary/30"
            />
            <div className="flex flex-col gap-1.5 text-xs text-foreground/50">
              <p>Get a key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors">console.anthropic.com</a></p>
              <p>Cost per chapter is under 1EUR, paid directly to Anthropic.</p>
            </div>
            {apiKeyError && <p className="text-xs text-destructive">{apiKeyError}</p>}
            <Button
              onClick={() => {
                const key = apiKeyInput.trim()
                if (!key.startsWith('sk-ant-')) { setApiKeyError('API key should start with sk-ant-'); return }
                setApiKey(key)
                setApiKeyDialogOpen(false)
                setApiKeyInput('')
                window.location.reload()
              }}
              className="w-full"
            >
              Save & Play
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

const PHASE_ORDER = ['planning', 'pre-insertion', 'active', 'extraction', 'complete'] as const
const PHASE_LABELS: Record<string, string> = {
  'planning': 'Planning',
  'pre-insertion': 'Pre-Insertion',
  'active': 'Active',
  'extraction': 'Extraction',
  'complete': 'Complete',
}

function MissionBrief({ op }: { op: OperationState }) {
  const phaseIdx = PHASE_ORDER.indexOf(op.phase)

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">
            {op.name}
          </div>
          <div className={cn(
            'flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider',
            op.phase === 'active' || op.phase === 'extraction' ? 'text-primary' : 'text-foreground/40'
          )}>
            <span className={cn(
              'inline-block w-1.5 h-1.5 rounded-full',
              op.phase === 'active' ? 'bg-primary animate-pulse' :
              op.phase === 'extraction' ? 'bg-warning animate-pulse' :
              op.phase === 'complete' ? 'bg-emerald-400' :
              'bg-foreground/30'
            )} />
            {PHASE_LABELS[op.phase] || op.phase}
          </div>
        </div>
        {/* Phase progress */}
        <div className="flex gap-1 mt-2">
          {PHASE_ORDER.filter(p => p !== 'complete').map((phase, i) => (
            <div
              key={phase}
              className={cn(
                'h-0.5 flex-1 rounded-full transition-colors',
                i < phaseIdx ? 'bg-primary/60' :
                i === phaseIdx ? 'bg-primary' :
                'bg-foreground/10'
              )}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-4">
        {/* Objectives */}
        <div>
          <SectionLabel>Objectives</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {op.objectives.filter(obj => obj.status !== 'completed').map((obj, i) => (
              <div key={i} className={cn("flex gap-2 text-xs", obj.status === 'failed' && "opacity-40")}>
                <span className={cn(
                  "font-mono text-[10px] mt-px",
                  obj.status === 'failed' ? 'text-destructive/60' : 'text-primary/60'
                )}>{i + 1}.</span>
                <span className={cn(
                  "text-foreground/80",
                  obj.status === 'failed' && "text-destructive/50 line-through"
                )}>{obj.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signals */}
        {op.signals.length > 0 && (
          <div>
            <SectionLabel>Signals</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {op.signals.map((sig, i) => (
                <div key={i} className="flex gap-2 text-xs text-foreground/60">
                  <span className="text-foreground/20">•</span>
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abort Conditions */}
        {op.abortConditions.length > 0 && (
          <div>
            <SectionLabel>Abort Conditions</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {op.abortConditions.map((cond, i) => (
                <div key={i} className="flex gap-2 text-xs text-foreground/60">
                  <span className="text-foreground/20">•</span>
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tactical Facts */}
        {op.tacticalFacts.length > 0 && (
          <div>
            <SectionLabel>Key Details</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {op.tacticalFacts.map((fact, i) => (
                <div key={i} className="flex gap-2 text-xs text-foreground/60">
                  <span className="text-foreground/20">•</span>
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResourceBar({ name, current }: { name: string; current: string }) {
  // Parse "2/3", "full", "1", etc. into a fill fraction
  let fraction = 1
  let label = current
  const slashMatch = current.match(/^(\d+)\s*\/\s*(\d+)/)
  if (slashMatch) {
    const cur = parseInt(slashMatch[1])
    const max = parseInt(slashMatch[2])
    fraction = max > 0 ? cur / max : 0
    label = `${cur}/${max}`
  } else if (current.toLowerCase() === 'full') {
    fraction = 1
  } else {
    const num = parseInt(current)
    if (!isNaN(num)) {
      // No max given — estimate: 1=critical, 2-3=low, 4+=ok
      fraction = Math.min(1, num / 6)
      label = `${num}`
    }
  }

  const isEmpty = fraction <= 0
  const barColor = isEmpty ? 'bg-foreground/10' : fraction <= 0.2 ? 'bg-destructive/70' : fraction <= 0.5 ? 'bg-warning/70' : 'bg-primary/50'

  return (
    <div className={cn("flex items-center gap-2", isEmpty && "opacity-40")}>
      <span className={cn("text-xs w-24 truncate shrink-0", isEmpty ? "text-foreground/30 line-through" : "text-foreground/60")}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-foreground/5 overflow-hidden">
        {!isEmpty && <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.max(4, fraction * 100)}%` }} />}
      </div>
      <span className={cn(
        'text-[10px] font-mono w-8 text-right shrink-0',
        isEmpty ? 'text-foreground/30' : fraction <= 0.2 ? 'text-destructive/70' : fraction <= 0.5 ? 'text-warning/70' : 'text-foreground/40'
      )}>{isEmpty ? '—' : label}</span>
    </div>
  )
}

function ExplorationCard({ ex, label, inventory }: { ex: ExplorationState; label: string; inventory?: GearItem[] }) {
  const [exploredExpanded, setExploredExpanded] = useState(ex.explored.length <= 3)

  // Derive resource bars from inventory (charges-based items)
  const inventoryResources: { name: string; current: string }[] = (inventory || [])
    .filter(item => item.charges !== undefined && item.maxCharges !== undefined && item.maxCharges > 0)
    .map(item => ({ name: item.name, current: item.charges === item.maxCharges ? 'full' : `${item.charges}/${item.maxCharges}` }))
  // Exploration-specific resources: only show if they DON'T look like inventory items
  // (i.e. no slash format like "2/4" or "full" — those should come from inventory)
  const extraResources = (ex.resources || []).filter(r => {
    // Skip if inventory already has this item
    if (inventoryResources.some(ir => ir.name.toLowerCase() === r.name.toLowerCase())) return false
    // Skip if it looks like an inventory consumable (has charges format) but isn't in inventory
    // — this means the GM put it in resources instead of inventory, which is wrong
    if (/^\d+\/\d+$/.test(r.current.trim()) || r.current.toLowerCase() === 'full') return false
    return true
  })
  const allResources = [...inventoryResources, ...extraResources]

  const alertUrgency = ex.alertLevel?.toLowerCase().includes('converging') || ex.alertLevel?.toLowerCase().includes('lockdown')
    ? 'high'
    : ex.alertLevel?.toLowerCase().includes('search') || ex.alertLevel?.toLowerCase().includes('alert')
      ? 'medium'
      : 'low'

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-primary/10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">
          {label}: {ex.facilityName}
        </div>
        <div className="text-xs text-foreground/40 mt-0.5">{ex.status}</div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 flex flex-col gap-4">
        {/* Current Position */}
        <div>
          <SectionLabel>Current Position</SectionLabel>
          <div className="rounded-lg border border-primary/15 bg-primary/[0.06] px-3 py-2">
            <div className="text-xs font-medium text-foreground/80">{ex.current.name}</div>
            <div className="text-xs text-foreground/50 mt-0.5">{ex.current.description}</div>
          </div>
        </div>

        {/* Unexplored */}
        {ex.unexplored.length > 0 && (
          <div>
            <SectionLabel>Unexplored</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {ex.unexplored.map((zone, i) => (
                <div key={i} className="flex gap-2 text-xs text-foreground/60">
                  <span className="text-primary/40 shrink-0">◇</span>
                  <div>
                    <span className="text-foreground/70">{zone.name}</span>
                    {zone.hints && <span className="text-foreground/40"> — {zone.hints}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explored */}
        {ex.explored.length > 0 && (
          <div>
            <button
              onClick={() => setExploredExpanded(!exploredExpanded)}
              className="flex items-center gap-2.5 mb-3 w-full text-left"
            >
              <div className="w-6 h-px bg-primary/40" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">
                Explored {!exploredExpanded && `(${ex.explored.length})`}
              </h3>
              <span className="text-[10px] text-foreground/30 ml-auto">{exploredExpanded ? '▾' : '▸'}</span>
            </button>
            {exploredExpanded && (
              <div className="flex flex-col gap-1.5">
                {ex.explored.map((zone, i) => (
                  <div key={i} className="flex gap-2 text-xs text-foreground/40">
                    <span className="text-emerald-400/50 shrink-0">✓</span>
                    <span>{zone.name}{zone.notes ? ` — ${zone.notes}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources — derived from inventory + exploration-specific */}
        {allResources.length > 0 && (
          <div>
            <SectionLabel>Resources</SectionLabel>
            <div className="flex flex-col gap-2">
              {allResources.map((r, i) => (
                <ResourceBar key={i} name={r.name} current={r.current} />
              ))}
            </div>
          </div>
        )}

        {/* Alert Level */}
        {ex.alertLevel && (
          <div className={cn(
            'rounded-lg border px-3 py-2 text-xs',
            alertUrgency === 'high' ? 'border-destructive/30 bg-destructive/5 text-destructive/80' :
            alertUrgency === 'medium' ? 'border-warning/30 bg-warning/5 text-warning/80' :
            'border-foreground/10 bg-foreground/5 text-foreground/50'
          )}>
            <span className="font-semibold uppercase tracking-wider text-[10px]">Alert: </span>
            {ex.alertLevel}
          </div>
        )}
      </div>
    </div>
  )
}

function CharacterSheet({ character, currencyLabel, mission }: { character: Character; currencyLabel: string; mission?: string | null }) {
  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Header */}
      <div className="min-w-0 overflow-hidden">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {character.name}
        </h2>
        <p className="mt-0.5 text-sm text-foreground/50">
          {character.species.name} {character.class.name} · Level {character.level}
        </p>
        {mission && (
          <p className="mt-1.5 text-xs text-primary/80 line-clamp-2">
            <span className="text-primary/60">▸ </span>{mission}
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

      {/* Gear — name + tags on one line, description full-width below */}
      <div>
        <SectionLabel>Gear</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          {character.class.gear.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-start gap-2.5 text-sm">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-foreground/70">{item.name}</span>
                  {item.damage && (
                    <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary/70">{item.damage}</span>
                  )}
                  {item.effect && (
                    <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary/70">{item.effect}</span>
                  )}
                  {item.charges != null && (
                    <span className="rounded border border-border/20 bg-secondary/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground/50">{item.charges}/{item.maxCharges}</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-foreground/40 leading-relaxed mt-0.5">{item.description}</p>
                )}
              </div>
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
  const hasAsset = ship.state
  if (hasAsset) {
    const s = ship.state!
    const showCondition = s.hullCondition >= 0  // -1 = hidden (e.g. retinue has no hull)
    const conditionLabel = isCyberpunk ? 'Rig Integrity' : 'Hull Condition'
    const hullColor = s.hullCondition >= 70 ? 'text-success' : s.hullCondition >= 30 ? 'text-warning' : 'text-destructive'
    const hullBarColor = s.hullCondition >= 70 ? 'bg-success' : s.hullCondition >= 30 ? 'bg-warning' : 'bg-destructive'
    const assetTitle = isCyberpunk ? 'Tech Rig' : ship.name
    return (
      <div className="flex min-w-0 flex-col gap-4 overflow-hidden text-sm">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">{assetTitle}</h2>
          {showCondition && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-foreground/50">{conditionLabel}</span>
              <span className={hullColor}>{s.hullCondition}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
              <div className={cn('h-full rounded-full transition-all', hullBarColor)} style={{ width: `${s.hullCondition}%` }} />
            </div>
          </div>
          )}
        </div>

        <div>
          <SectionLabel>{isCyberpunk ? 'Modules' : genre === 'epic-scifi' ? 'Services' : 'Systems'}</SectionLabel>
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

type GearItem = { name: string; description: string; damage?: string; effect?: string; charges?: number; maxCharges?: number }

function WorldPanel({ world, partyBaseName, explorationLabel, companionLabel, inventory }: { world: World; partyBaseName: string; explorationLabel: string; companionLabel: string; inventory?: GearItem[] }) {
  const [subtab, setSubtab] = useState<'locations' | 'people' | 'narrative'>('locations')

  const isVessel = (n: { subtype?: string }) => n.subtype === 'vessel' || n.subtype === 'installation'
  const isResolved = (s: string) => s.toLowerCase() === 'resolved'
  const activeThreads = world.threads.filter((t) => !isResolved(t.status))
  const openPromises = world.promises.filter((p) => p.status === 'open')

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Subtab toggle */}
      <div className="flex gap-4">
        {(['locations', 'people', 'narrative'] as const).map((tab) => (
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
            <SectionLabel>{companionLabel}</SectionLabel>
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

          {/* Decisions — active non-operational choices */}
          {(() => {
            const activeDecisions = world.decisions.filter((d) => d.status === 'active')
            return activeDecisions.length > 0 ? (
              <div>
                <SectionLabel>Key Decisions</SectionLabel>
                <div className="flex flex-col gap-2">
                  {activeDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className={cn(
                        'rounded px-3 py-2 border',
                        decision.category === 'moral' && 'border-blue-400/30 bg-blue-400/5',
                        decision.category === 'tactical' && 'border-amber-400/30 bg-amber-400/5',
                        decision.category === 'strategic' && 'border-violet-400/30 bg-violet-400/5',
                        decision.category === 'relational' && 'border-rose-400/30 bg-rose-400/5',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{decision.summary}</div>
                        <span className="text-[10px] uppercase tracking-wider text-foreground/40">{decision.category}</span>
                      </div>
                      <div className="text-xs text-foreground/60">{decision.context}</div>
                      <div className="mt-1 text-[10px] text-foreground/30">Ch. {decision.chapter}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* Archive — resolved threads, triggered/resolved clocks, fulfilled/broken promises */}
          {(() => {
            const resolvedThreads = world.threads.filter((t) => isResolved(t.status))
            const triggeredClocks = world.tensionClocks.filter((c) => c.status === 'triggered')
            const resolvedClocks = world.tensionClocks.filter((c) => c.status === 'resolved')
            const settledPromises = world.promises.filter((p) => p.status === 'fulfilled' || p.status === 'broken')
            const pastDecisions = world.decisions.filter((d) => d.status !== 'active')
            const hasArchive = resolvedThreads.length > 0 || triggeredClocks.length > 0 || resolvedClocks.length > 0 || settledPromises.length > 0 || pastDecisions.length > 0

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
                  {/* Past decisions — superseded/abandoned */}
                  {pastDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="rounded border border-border/20 bg-secondary/5 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground">{decision.summary}</div>
                        <span className="text-[10px] uppercase tracking-wider text-foreground/40">
                          {decision.status === 'superseded' ? 'Superseded' : 'Abandoned'}
                        </span>
                      </div>
                      {decision.reason && <div className="text-xs text-foreground/50">{decision.reason}</div>}
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
          {/* Current Location — exploration card when active, simple card otherwise */}
          <div>
            <SectionLabel>Current Location</SectionLabel>
            {world.explorationState ? (
              <ExplorationCard ex={world.explorationState} label={explorationLabel} inventory={inventory} />
            ) : (
              <div className="rounded-lg border border-border/10 bg-secondary/5 px-3 py-2.5">
                <div className="font-medium text-foreground">{world.location.name}</div>
                <div className="text-xs text-foreground/60">{world.location.description}</div>
              </div>
            )}
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

function IntelPanel({ operationState, notebook, evidenceLabel, operationLabel, notebookLabel, genre, onConnect }: {
  operationState: OperationState | null
  notebook: Notebook | null
  evidenceLabel: string
  operationLabel: string
  notebookLabel: string
  genre: Genre
  onConnect?: () => void
}) {
  const hasOp = !!operationState
  const hasNotebook = notebook && notebook.clues.length > 0
  const isNoir = genre === 'noire'
  // Only show sub-tabs when both sections have content
  const showSubtabs = hasOp && (hasNotebook || isNoir)
  const [subtab, setSubtab] = useState<'operation' | 'evidence'>(hasOp ? 'operation' : 'evidence')

  // If operation appears/disappears, adjust active subtab
  const activeTab = showSubtabs ? subtab : (hasOp ? 'operation' : 'evidence')

  return (
    <div className="flex flex-col gap-4 text-sm">
      {showSubtabs && (
        <div className="flex gap-4">
          <button
            onClick={() => setSubtab('operation')}
            className={cn(
              'text-[10px] font-medium uppercase tracking-[0.15em] transition-colors pb-1',
              activeTab === 'operation'
                ? 'text-primary border-b border-primary/40'
                : 'text-muted-foreground/40 hover:text-muted-foreground/60'
            )}
          >
            {operationLabel}
          </button>
          <button
            onClick={() => setSubtab('evidence')}
            className={cn(
              'text-[10px] font-medium uppercase tracking-[0.15em] transition-colors pb-1',
              activeTab === 'evidence'
                ? 'text-primary border-b border-primary/40'
                : 'text-muted-foreground/40 hover:text-muted-foreground/60'
            )}
          >
            {evidenceLabel}
          </button>
        </div>
      )}

      {activeTab === 'operation' && operationState && (
        <MissionBrief op={operationState} />
      )}

      {activeTab === 'evidence' && (
        notebook && notebook.clues.length > 0 ? (
          <NotebookPanel notebook={notebook} notebookLabel={notebookLabel} onConnect={onConnect} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h2 className="font-heading text-lg font-semibold text-foreground/50">{notebookLabel}</h2>
            <p className="mt-2 text-sm text-muted-foreground/50 max-w-[240px]">No evidence yet. Ask questions, search rooms, follow leads.</p>
          </div>
        )
      )}
    </div>
  )
}

function NotebookPanel({ notebook, notebookLabel, onConnect }: { notebook: Notebook; notebookLabel: string; onConnect?: () => void }) {
  const visibleClues = notebook.clues.filter(c => !c.isRedHerring || c.connectionIds.length > 0)

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

  // Resolve a source ID to either a clue or a connection
  const resolveSource = (id: string) => {
    const clue = resolveClue(id)
    if (clue) return { type: 'clue' as const, label: clue.title || clue.content.slice(0, 50) + '...' }
    const conn = notebook.connections.find(c => c.id === id)
    if (conn) return { type: 'connection' as const, label: conn.title }
    return null
  }

  // Upward counts: how many connections reference each item, and their highest tier
  const upwardInfo = (id: string) => {
    const refs = notebook.connections.filter(c => c.sourceIds.includes(id) && (!c.status || c.status === 'active'))
    if (refs.length === 0) return null
    const hasBreakthrough = refs.some(c => c.tier === 'breakthrough')
    return { count: refs.length, label: hasBreakthrough ? 'breakthrough' : 'lead' }
  }

  // Categorize connections by tier
  const activeConns = notebook.connections.filter(c => !c.status || c.status === 'active')
  const breakthroughs = activeConns.filter(c => c.tier === 'breakthrough').reverse()
  const leads = activeConns.filter(c => c.tier === 'lead').reverse()
  const resolvedConns = notebook.connections.filter(c => c.status === 'solved' || c.status === 'archived' || c.status === 'disproven').reverse()

  // Evidence: active clues
  const activeClues = [...visibleClues].filter(c => !c.status || c.status === 'active').reverse()
  const connectedClueIds = new Set(notebook.connections.flatMap(c => c.sourceIds.filter(id => notebook.clues.some(cl => cl.id === id))))
  const resolvedClues = [...visibleClues].filter(c => c.status === 'solved' || c.status === 'archived').reverse()

  // Stats
  const stats = [
    breakthroughs.length > 0 && `${breakthroughs.length} breakthrough${breakthroughs.length !== 1 ? 's' : ''}`,
    leads.length > 0 && `${leads.length} lead${leads.length !== 1 ? 's' : ''}`,
    `${notebook.clues.length} clue${notebook.clues.length !== 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')

  // Expandable item state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Header */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {notebook.activeThreadTitle || notebookLabel}
        </h2>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">{stats}</span>
          {onConnect && notebook.clues.length >= 2 && (
            <button
              onClick={onConnect}
              className="text-[10px] font-medium uppercase tracking-wider text-primary/60 hover:text-primary transition-colors"
            >
              Connect evidence
            </button>
          )}
        </div>
      </div>

      {/* Breakthroughs */}
      {breakthroughs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">Breakthroughs</span>
            <div className="h-px flex-1 bg-destructive/20" />
          </div>
          <div className="flex flex-col gap-3">
            {breakthroughs.map(conn => {
              const expanded = expandedId === conn.id
              const sources = conn.sourceIds.map(resolveSource).filter(Boolean)
              return (
                <div key={conn.id} role="button" onClick={() => toggle(conn.id)} className="cursor-pointer rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 transition-colors hover:bg-destructive/10">
                  <div className="font-medium text-foreground">{conn.title}</div>
                  {expanded && <div className="mt-1 text-xs text-foreground/60 leading-relaxed">{conn.revelation}</div>}
                  <div className={cn('mt-2 flex flex-col gap-1 border-t pt-2', expanded ? 'border-destructive/15' : 'border-destructive/10')}>
                    {sources.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-foreground/70">
                        <span className="text-destructive/50">{s!.type === 'connection' ? '◆' : '◇'}</span>
                        <span>{s!.type === 'connection' ? 'Lead: ' : ''}{s!.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leads */}
      {leads.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">Leads</span>
            <div className="h-px flex-1 bg-primary/20" />
          </div>
          <div className="flex flex-col gap-2.5">
            {leads.map(conn => {
              const expanded = expandedId === conn.id
              const sources = conn.sourceIds.map(resolveSource).filter(Boolean)
              const up = upwardInfo(conn.id)
              return (
                <div key={conn.id} role="button" onClick={() => toggle(conn.id)} className="cursor-pointer rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground">{conn.title}</div>
                    {up && <span className={cn('font-mono text-[9px]', up.label === 'breakthrough' ? 'text-destructive/70' : 'text-primary/60')}>→ {up.count} {up.label}{up.count !== 1 ? 's' : ''}</span>}
                  </div>
                  {expanded && <div className="mt-1 text-xs text-foreground/60 leading-relaxed">{conn.revelation}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sources.map((s, i) => (
                      <span key={i} className="rounded border border-border/15 bg-secondary/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground/50">
                        {s!.label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Evidence */}
      {activeClues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground/50">Evidence</span>
            <div className="h-px flex-1 bg-border/15" />
          </div>
          <div className="flex flex-col gap-1">
            {activeClues.map(clue => {
              const expanded = expandedId === clue.id
              const isConnected = connectedClueIds.has(clue.id)
              const up = upwardInfo(clue.id)
              return (
                <div key={clue.id} role="button" onClick={() => toggle(clue.id)} className={cn(
                  'cursor-pointer rounded-lg border border-border/10 px-3 py-2 transition-colors hover:bg-secondary/10',
                  isConnected ? 'opacity-60' : ''
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground/30 text-xs">◇</span>
                      <span className="font-medium text-foreground text-xs">{clue.title || clue.content.slice(0, 40) + '...'}</span>
                    </div>
                    <span className="font-mono text-[9px] text-foreground/40 shrink-0 ml-2">
                      {up ? `→ ${up.count} ${up.label}${up.count !== 1 ? 's' : ''}` : `Ch.${clue.discoveredChapter}`}
                    </span>
                  </div>
                  {expanded && (
                    <div className="mt-1.5 pl-5">
                      <div className="text-xs text-foreground/60 leading-relaxed">{clue.content}</div>
                      <div className="mt-1 font-mono text-[10px] text-foreground/30">{clue.source} · Ch.{clue.discoveredChapter}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resolved section — collapsed by default */}
      {(resolvedConns.length > 0 || resolvedClues.length > 0) && (
        <div className="border-t border-border/10 pt-3">
          <button onClick={() => toggle('__resolved')} className="flex items-center justify-between w-full group">
            <SectionLabel>Resolved ({resolvedConns.length + resolvedClues.length})</SectionLabel>
            <span className="text-foreground/30 text-xs group-hover:text-foreground/50 transition-colors">{expandedId === '__resolved' ? '▲' : '▼'}</span>
          </button>
          {expandedId === '__resolved' && (
            <div className="flex flex-col gap-2 mt-2 opacity-50">
              {resolvedConns.map(conn => (
                <div key={conn.id} className={cn(
                  'rounded-lg border px-3 py-2',
                  conn.status === 'disproven' ? 'border-destructive/15 bg-destructive/5' : 'border-border/15 bg-secondary/5'
                )}>
                  <div className="flex items-center justify-between">
                    <div className={cn('font-medium text-foreground text-xs', conn.status === 'disproven' && 'line-through text-foreground/50')}>{conn.title}</div>
                    <span className={cn(
                      'font-mono text-[9px] uppercase tracking-wider',
                      conn.status === 'solved' ? 'text-emerald-400/70' : conn.status === 'disproven' ? 'text-destructive/70' : 'text-foreground/30'
                    )}>{conn.status}</span>
                  </div>
                </div>
              ))}
              {resolvedClues.map(clue => (
                <div key={clue.id} className="rounded-lg border border-border/15 bg-secondary/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-foreground text-xs">{clue.title || clue.content.slice(0, 40) + '...'}</div>
                    <span className={cn(
                      'font-mono text-[9px] uppercase tracking-wider',
                      clue.status === 'solved' ? 'text-emerald-400/70' : 'text-foreground/30'
                    )}>{clue.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                <p className="mb-3 text-xs text-foreground/60 leading-relaxed">{chapter.summary}</p>

                {chapter.keyEvents.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2"><div className="w-4 h-px bg-primary/40" /><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">Key Events</span></div>
                    <ul className="flex flex-col gap-1">
                      {chapter.keyEvents.map((event, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/60 leading-relaxed">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                          {event}
                        </li>
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
              {showDebrief.debrief.luckyBreaks?.length > 0 && (
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
              {showDebrief.debrief.costsPaid?.length > 0 && (
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
