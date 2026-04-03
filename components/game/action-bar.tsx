'use client'

import { useState, useEffect, useRef } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { slashCommands } from '@/lib/slash-commands'
import type { Notebook, ClueConnection, Clue } from '@/lib/types'

interface PickerItem {
  id: string
  type: 'clue' | 'connection'
  label: string
  subtitle: string
  tag: string
}

interface ActionBarProps {
  quickActions: string[]
  onActionSelect: (action: string) => void
  onCustomAction: (action: string, isMetaQuestion: boolean) => void
  onSlashCommand?: (commandName: string, args: string) => void
  disabled?: boolean
  closeReady?: boolean
  closeReason?: string
  onCloseChapter?: () => void
  prefill?: string
  onPrefillConsumed?: () => void
  notebook?: Notebook | null
}

export function ActionBar({ quickActions, onActionSelect, onCustomAction, onSlashCommand, disabled = false, closeReady, closeReason, onCloseChapter, prefill, onPrefillConsumed, notebook }: ActionBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isMetaMode, setIsMetaMode] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)

  // Evidence picker state
  const [pickerActive, setPickerActive] = useState(false)
  const [pickerFirst, setPickerFirst] = useState<PickerItem | null>(null)
  const [pickerIndex, setPickerIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle prefill from external trigger (e.g. evidence Connect button)
  if (prefill && inputValue !== prefill) {
    setInputValue(prefill)
    setShowSlashMenu(false)  // Don't show autocomplete — command is already selected
    onPrefillConsumed?.()
  }

  // Filter commands for autocomplete — computed before handlers that reference it
  const typed = inputValue.startsWith('/') ? inputValue.slice(1).split(' ')[0].toLowerCase() : ''
  const matchingCommands = showSlashMenu
    ? slashCommands.filter(c => c.name.startsWith(typed))
    : []

  // Build picker items from notebook
  const pickerItems: PickerItem[] = (() => {
    if (!notebook || !pickerActive) return []
    const conns = notebook.connections.filter(c => !c.status || c.status === 'active')
    const clues = notebook.clues.filter(c => !c.isRedHerring || c.connectionIds.length > 0)
      .filter(c => !c.status || c.status === 'active')

    // Existing pairs for dedup prevention
    const existingPairs = new Set(conns.map(c => [...c.sourceIds].sort().join('|')))

    const items: PickerItem[] = [
      // Leads/breakthroughs first
      ...conns.map(c => {
        const up = conns.filter(other => other.sourceIds.includes(c.id)).length
        return {
          id: c.id,
          type: 'connection' as const,
          label: c.title,
          subtitle: c.revelation.slice(0, 60) + (c.revelation.length > 60 ? '...' : ''),
          tag: up > 0 ? `→ ${up} breakthrough${up !== 1 ? 's' : ''}` : c.tier.toUpperCase(),
        }
      }),
      // Then evidence
      ...clues.map(c => {
        const up = conns.filter(conn => conn.sourceIds.includes(c.id)).length
        return {
          id: c.id,
          type: 'clue' as const,
          label: c.title || c.content.slice(0, 40) + '...',
          subtitle: c.content.slice(0, 60) + (c.content.length > 60 ? '...' : ''),
          tag: up > 0 ? `→ ${up} lead${up !== 1 ? 's' : ''}` : `Ch.${c.discoveredChapter}`,
        }
      }),
    ]

    // If first is selected, filter out items already paired with it
    if (pickerFirst) {
      return items.filter(item => {
        if (item.id === pickerFirst.id) return false
        const pair = [pickerFirst.id, item.id].sort().join('|')
        return !existingPairs.has(pair)
      })
    }
    return items
  })()

  // Activate picker when input is "/connect " (with trailing space)
  useEffect(() => {
    const isConnect = inputValue.toLowerCase().startsWith('/connect ') && inputValue.trim() === '/connect'
    if (isConnect && notebook && notebook.clues.length >= 2) {
      setPickerActive(true)
      setPickerFirst(null)
      setPickerIndex(0)
    } else if (!inputValue.startsWith('/connect')) {
      setPickerActive(false)
      setPickerFirst(null)
    }
  }, [inputValue, notebook])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    const shouldShow = val.startsWith('/') && val.length < 20
    setShowSlashMenu(shouldShow)
    if (shouldShow) setSlashIndex(0)
  }

  const handleSlashSelect = (name: string) => {
    const cmd = slashCommands.find(c => c.name === name)
    if (cmd) {
      setInputValue(`/${name} `)
      setShowSlashMenu(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Evidence picker keyboard nav
    if (pickerActive && pickerItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPickerIndex(i => (i + 1) % pickerItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPickerIndex(i => (i - 1 + pickerItems.length) % pickerItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = pickerItems[pickerIndex]
        if (!selected) return
        if (!pickerFirst) {
          // First selection
          setPickerFirst(selected)
          setPickerIndex(0)
        } else {
          // Second selection — submit
          const display = `/${`connect`} ${pickerFirst.label} and ${selected.label}`
          const args = `${pickerFirst.label} and ${selected.label}`
          setPickerActive(false)
          setPickerFirst(null)
          setInputValue('')
          onSlashCommand?.('connect', args)
        }
      } else if (e.key === 'Backspace' && pickerFirst && inputValue === '/connect ') {
        e.preventDefault()
        setPickerFirst(null)
        setPickerIndex(0)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setPickerActive(false)
        setPickerFirst(null)
        setInputValue('')
      }
      return
    }

    // Slash command autocomplete keyboard nav
    if (!showSlashMenu || matchingCommands.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSlashIndex(i => (i + 1) % matchingCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSlashIndex(i => (i - 1 + matchingCommands.length) % matchingCommands.length)
    } else if (e.key === 'Enter' && !inputValue.includes(' ')) {
      e.preventDefault()
      handleSlashSelect(matchingCommands[slashIndex].name)
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    if (trimmed.startsWith('/') && onSlashCommand) {
      const spaceIdx = trimmed.indexOf(' ', 1)
      const name = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)
      const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()
      const cmd = slashCommands.find(c => c.name === name.toLowerCase())
      if (cmd) {
        onSlashCommand(cmd.name, args)
        setInputValue('')
        setShowSlashMenu(false)
        return
      }
    }

    onCustomAction(trimmed, isMetaMode)
    setInputValue('')
    setShowSlashMenu(false)
  }

  const isSlashMode = inputValue.startsWith('/')

  return (
    <div className="flex flex-col gap-3 p-4 border-t border-border/10">
      {/* Close Chapter Button */}
      {closeReady && onCloseChapter && (
        <div className="flex flex-col gap-2">
          {closeReason && (
            <p className="text-[11px] text-muted-foreground/60 px-1 leading-relaxed">{closeReason}</p>
          )}
          <button
            onClick={onCloseChapter}
            disabled={disabled}
            className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {disabled ? 'Closing chapter...' : 'Close Chapter'}
          </button>
        </div>
      )}

      {/* Quick Actions — hidden when close is ready */}
      {quickActions.length > 0 && !closeReady && (
        <div className="flex flex-col gap-2">
          {quickActions.map((action, index) => (
            <button
              key={`${index}-${action}`}
              onClick={() => !disabled && onActionSelect(action)}
              disabled={disabled}
              className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-2.5 text-xs text-foreground/80 text-left transition-all duration-200 hover:bg-primary/10 hover:border-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Evidence Picker */}
      {pickerActive && pickerItems.length > 0 && (
        <div className="flex flex-col rounded-lg border border-primary/20 bg-card/95 backdrop-blur-sm overflow-hidden max-h-[50vh]">
          {/* Picker header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Connect</span>
            {pickerFirst ? (
              <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                {pickerFirst.type === 'connection' ? '◆' : '◇'} {pickerFirst.label}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-foreground/40">select first</span>
            )}
            {pickerFirst && <span className="font-mono text-[10px] text-foreground/30">↔ ?</span>}
          </div>
          {/* Picker items */}
          <div className="overflow-y-auto max-h-[40vh] p-1.5 flex flex-col gap-0.5">
            {pickerItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!pickerFirst) {
                    setPickerFirst(item)
                    setPickerIndex(0)
                  } else {
                    onSlashCommand?.('connect', `${pickerFirst.label} and ${item.label}`)
                    setPickerActive(false)
                    setPickerFirst(null)
                    setInputValue('')
                  }
                }}
                className={cn(
                  'flex items-start gap-2 rounded px-2.5 py-2 text-left transition-colors',
                  i === pickerIndex ? 'bg-primary/10 border border-emerald-400/30' : 'border border-transparent hover:bg-primary/5'
                )}
              >
                <span className="text-xs text-foreground/40 mt-0.5 shrink-0">{item.type === 'connection' ? '◆' : '◇'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
                    <span className="font-mono text-[9px] text-foreground/40 shrink-0">{item.tag}</span>
                  </div>
                  <div className="text-[10px] text-foreground/40 truncate mt-0.5">{item.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
          {/* Picker footer */}
          <div className="flex items-center gap-4 px-3 py-1.5 border-t border-border/10">
            <span className="font-mono text-[9px] text-foreground/30">↑↓ navigate</span>
            <span className="font-mono text-[9px] text-foreground/30">Enter select</span>
            {pickerFirst && <span className="font-mono text-[9px] text-foreground/30">⌫ undo</span>}
            <span className="font-mono text-[9px] text-foreground/30 ml-auto">Esc cancel</span>
          </div>
        </div>
      )}

      {/* Slash Command Autocomplete */}
      {matchingCommands.length > 0 && !pickerActive && (
        <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-card/90 p-2">
          {matchingCommands.map((cmd, i) => (
            <button
              key={cmd.name}
              type="button"
              onClick={() => handleSlashSelect(cmd.name)}
              className={cn(
                'flex items-baseline gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-primary/10',
                i === slashIndex && 'bg-primary/10'
              )}
            >
              <span className="font-mono text-xs text-primary">/{cmd.name}</span>
              <span className="text-[11px] text-muted-foreground/60">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom Input — contained area */}
      <form onSubmit={handleSubmit} className={cn(
        'flex items-center gap-0 rounded-xl border-2 overflow-hidden shadow-[0_0_12px_-3px]',
        isSlashMode
          ? 'bg-primary/[0.08] border-primary/40 shadow-primary/20'
          : isMetaMode
            ? 'bg-info/[0.08] border-info/30 shadow-info/15'
            : 'bg-primary/[0.06] border-primary/25 shadow-primary/15'
      )}>
        {/* Meta Question Toggle */}
        <button
          type="button"
          onClick={() => setIsMetaMode(!isMetaMode)}
          className={cn(
            'shrink-0 self-stretch px-3 transition-colors',
            isMetaMode
              ? 'bg-info/15 text-info'
              : 'text-muted-foreground/40 hover:text-muted-foreground/60'
          )}
          title={isMetaMode ? 'Switch to action mode' : 'Ask GM a question'}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Toggle meta question mode</span>
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled
              ? 'GM is thinking...'
              : isMetaMode
                ? "Ask the GM a question (won't affect the story)..."
                : 'Type an action or / for commands...'
          }
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-40',
            isSlashMode ? 'font-mono text-xs text-tertiary placeholder:text-tertiary/40' : 'text-sm',
            !isSlashMode && (isMetaMode ? 'placeholder:text-info/40' : 'placeholder:text-primary/40')
          )}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className={cn(
            'shrink-0 mx-1.5 rounded-lg p-2 transition-colors disabled:opacity-50',
            isMetaMode
              ? 'bg-info text-white hover:bg-info/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          <Send className="h-3.5 w-3.5" />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  )
}
