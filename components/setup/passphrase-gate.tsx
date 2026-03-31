'use client'

import { useState, useEffect, type ReactNode } from 'react'

interface PassphraseGateProps {
  children: ReactNode
}

export function PassphraseGate({ children }: PassphraseGateProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUnlocked(true)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(true)
        setInput('')
        setTimeout(() => setError(false), 1500)
      }
    } catch {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 1500)
    }
  }

  if (checking) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <div
          className="font-roboto-mono text-5xl text-primary/70"
          style={{ fontVariant: 'small-caps', textShadow: 'var(--title-glow)' }}
        >
          storyforge
        </div>
        <div className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
          Text-based action RPG
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Access code"
          autoFocus
          className={[
            'rounded-lg border bg-secondary/30 px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200',
            error
              ? 'border-destructive shadow-[0_0_10px_-3px] shadow-destructive/50'
              : 'border-border/50 focus:border-primary focus:shadow-[0_0_10px_-3px] focus:shadow-primary/30',
          ].join(' ')}
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: 'var(--action-glow)' }}
        >
          Enter
        </button>
        {error && (
          <p className="text-center text-xs text-destructive">Wrong access code.</p>
        )}
      </form>
    </div>
  )
}
