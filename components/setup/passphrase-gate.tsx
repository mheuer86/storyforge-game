'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { getApiKey, setApiKey, isByok } from '@/lib/api-key'

interface PassphraseGateProps {
  children: ReactNode
}

export function PassphraseGate({ children }: PassphraseGateProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [mode, setMode] = useState<'access-code' | 'byok'>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('byok')) return 'byok'
    return 'access-code'
  })
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | false>(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // If player has a stored BYOK key, let them through
    if (isByok()) {
      setUnlocked(true)
      setChecking(false)
      return
    }
    // Otherwise check server auth
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUnlocked(true)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input.trim() }),
      })
      if (res.ok) {
        setUnlocked(true)
      } else {
        setError('Wrong access code.')
        setInput('')
        setTimeout(() => setError(false), 1500)
      }
    } catch {
      setError('Connection error.')
      setInput('')
      setTimeout(() => setError(false), 1500)
    }
  }

  const handleByok = (e: React.FormEvent) => {
    e.preventDefault()
    const key = input.trim()
    if (!key.startsWith('sk-ant-')) {
      setError('API key should start with sk-ant-')
      setTimeout(() => setError(false), 2000)
      return
    }
    setApiKey(key)
    setUnlocked(true)
  }

  if (checking) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div
          className="font-mono text-4xl text-primary/70 tracking-[0.15em]"
          style={{ textShadow: 'var(--title-glow)' }}
        >
          storyforge
        </div>
        <div className="mt-2 text-xs tracking-widest text-muted-foreground/60 uppercase">
          the dice shape everything.
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => { setMode('access-code'); setInput(''); setError(false) }}
          className={`text-[10px] font-medium uppercase tracking-[0.15em] pb-1 transition-colors ${
            mode === 'access-code' ? 'text-primary border-b border-primary/40' : 'text-muted-foreground/40 hover:text-muted-foreground/60'
          }`}
        >
          Demo Access
        </button>
        <button
          onClick={() => { setMode('byok'); setInput(''); setError(false) }}
          className={`text-[10px] font-medium uppercase tracking-[0.15em] pb-1 transition-colors ${
            mode === 'byok' ? 'text-primary border-b border-primary/40' : 'text-muted-foreground/40 hover:text-muted-foreground/60'
          }`}
        >
          Own API Key
        </button>
      </div>

      <form onSubmit={mode === 'access-code' ? handleAccessCode : handleByok} className="flex w-full max-w-xs flex-col gap-3">
        {mode === 'access-code' ? (
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Access code"
            autoFocus
            className={[
              'rounded-lg border bg-secondary/30 px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-200',
              error
                ? 'border-destructive shadow-[0_0_10px_-3px] shadow-destructive/50'
                : 'border-border/50 focus:border-primary focus:shadow-[0_0_10px_-3px] focus:shadow-primary/30',
            ].join(' ')}
          />
        ) : (
          <>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="sk-ant-..."
              autoFocus
              className={[
                'rounded-lg border bg-secondary/30 px-4 py-3 text-center font-mono text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-200',
                error
                  ? 'border-destructive shadow-[0_0_10px_-3px] shadow-destructive/50'
                  : 'border-border/50 focus:border-primary focus:shadow-[0_0_10px_-3px] focus:shadow-primary/30',
              ].join(' ')}
            />
            <div className="flex flex-col gap-2 text-[10px] text-muted-foreground/40 text-center leading-relaxed">
              <p>
                Get a key from{' '}
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary/80 transition-colors">
                  console.anthropic.com
                </a>
              </p>
              <div className="flex flex-col gap-1 border border-border/10 rounded-lg p-3 text-left">
                <p>Your key is stored in your browser&apos;s local storage only. It is never sent to or stored on our servers.</p>
                <p>Cost per chapter is under 1EUR, paid directly to Anthropic through your own account.</p>
                <p>You can remove your key at any time from the in-game menu.</p>
              </div>
            </div>
          </>
        )}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: 'var(--action-glow)' }}
        >
          {mode === 'access-code' ? 'Enter' : 'Save & Play'}
        </button>
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </form>
    </div>
  )
}
