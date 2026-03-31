'use client'

import { Component, type ReactNode } from 'react'
import { clearGameState } from '@/lib/game-data'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    clearGameState()
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
          <div className="text-center">
            <div
              className="font-roboto-mono text-3xl text-primary/70"
              style={{ fontVariant: 'small-caps', textShadow: 'var(--title-glow)' }}
            >
              something broke
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-lg border border-border/50 px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/50"
            >
              Try again
            </button>
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground transition-opacity hover:opacity-90"
            >
              Reset game
            </button>
          </div>

          <p className="text-xs text-muted-foreground/50">
            Reset clears your auto-save. Manual save slots are preserved.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
