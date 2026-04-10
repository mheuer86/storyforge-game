const STORAGE_KEY = 'storyforge_api_key'
const DEMO_USAGE_KEY = 'storyforge_demo_usage'

/** Get the stored BYOK API key (or null for demo mode) */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

/** Store a BYOK API key */
export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

/** Clear the stored API key (revert to demo mode) */
export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Check if using BYOK */
export function isByok(): boolean {
  return !!getApiKey()
}

/** Build headers for API requests — includes BYOK key if set */
export function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = getApiKey()
  if (key) headers['x-anthropic-key'] = key
  return headers
}

// ─── Demo token budget tracking ─────────────────────────────────────

interface DemoUsage {
  month: string  // "2026-04"
  tokens: number
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function getDemoUsage(): DemoUsage {
  if (typeof window === 'undefined') return { month: currentMonth(), tokens: 0 }
  try {
    const raw = localStorage.getItem(DEMO_USAGE_KEY)
    if (!raw) return { month: currentMonth(), tokens: 0 }
    const parsed = JSON.parse(raw) as DemoUsage
    // Reset if new month
    if (parsed.month !== currentMonth()) return { month: currentMonth(), tokens: 0 }
    return parsed
  } catch {
    return { month: currentMonth(), tokens: 0 }
  }
}

/** Add tokens to the demo usage counter */
export function trackDemoUsage(tokens: number): void {
  const usage = getDemoUsage()
  usage.tokens += tokens
  localStorage.setItem(DEMO_USAGE_KEY, JSON.stringify(usage))
}

/** Get current demo usage for this month */
export function getDemoTokensUsed(): number {
  return getDemoUsage().tokens
}

/** Monthly demo budget */
export const DEMO_MONTHLY_BUDGET = 2_000_000

/** Check if demo budget is exhausted */
export function isDemoBudgetExhausted(): boolean {
  if (isByok()) return false
  return getDemoTokensUsed() >= DEMO_MONTHLY_BUDGET
}
