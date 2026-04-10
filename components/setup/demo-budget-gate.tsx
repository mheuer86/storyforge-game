'use client'

import { useState, type ReactNode } from 'react'
import { isByok, isDemoBudgetExhausted, setApiKey } from '@/lib/api-key'

interface DemoBudgetGateProps {
  children: ReactNode
}

export function DemoBudgetGate({ children }: DemoBudgetGateProps) {
  const [bypassed, setBypassed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  // BYOK users or budget still available — pass through
  if (bypassed || isByok() || !isDemoBudgetExhausted()) {
    return <>{children}</>
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const key = input.trim()
    if (!key.startsWith('sk-ant-')) {
      setError('API key should start with sk-ant-')
      setTimeout(() => setError(''), 2000)
      return
    }
    setApiKey(key)
    setBypassed(true)
  }

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

      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <p className="text-sm text-foreground/80">
          The free demo budget for this month has been used up.
        </p>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Add your own Claude API key to keep playing. Your key stays in your browser and is never sent to our servers. Cost per chapter is under 1EUR.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError('') }}
          placeholder="sk-ant-..."
          autoFocus
          className={[
            'rounded-lg border bg-secondary/30 px-4 py-3 text-center font-mono text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors duration-200',
            error
              ? 'border-destructive shadow-[0_0_10px_-3px] shadow-destructive/50'
              : 'border-border/50 focus:border-primary focus:shadow-[0_0_10px_-3px] focus:shadow-primary/30',
          ].join(' ')}
        />
        <div className="flex flex-col gap-2 text-xs text-foreground/50 text-center">
          <p>
            Get a key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors">
              console.anthropic.com
            </a>
          </p>
        </div>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: 'var(--action-glow)' }}
        >
          Save & Play
        </button>
      </form>
    </div>
  )
}
