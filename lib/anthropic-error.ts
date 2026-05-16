function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parsePossiblyEmbeddedJson(message: string): Record<string, unknown> | null {
  const jsonStart = message.indexOf('{')
  if (jsonStart < 0) return null
  try {
    const parsed = JSON.parse(message.slice(jsonStart))
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function formatAnthropicErrorPayload(payload: Record<string, unknown>): string | null {
  const error = payload.error
  const requestId = typeof payload.request_id === 'string' ? payload.request_id : undefined

  if (isRecord(error)) {
    const message = typeof error.message === 'string' ? error.message : undefined
    const type = typeof error.type === 'string' ? error.type : undefined
    if (message) {
      const suffix = [
        type ? `Anthropic ${type}` : 'Anthropic error',
        requestId ? `request ${requestId}` : undefined,
      ].filter(Boolean).join(', ')
      return suffix ? `${message} (${suffix})` : message
    }
  }

  const message = typeof payload.message === 'string' ? payload.message : undefined
  if (message) {
    return requestId ? `${message} (Anthropic request ${requestId})` : message
  }

  return null
}

export function normalizeAnthropicErrorMessage(message: string): string {
  return formatAnthropicErrorPayload(parsePossiblyEmbeddedJson(message) ?? {}) ?? message
}

export function extractAnthropicErrorMessage(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return normalizeAnthropicErrorMessage(value)
  if (!isRecord(value)) return String(value)

  const formatted = formatAnthropicErrorPayload(value)
  if (formatted) return formatted

  const direct = value.message ?? value.error
  if (typeof direct === 'string') return normalizeAnthropicErrorMessage(direct)
  if (isRecord(direct)) {
    const nested = formatAnthropicErrorPayload({ error: direct, request_id: value.request_id })
    if (nested) return nested
  }

  if (typeof value.body === 'string') return normalizeAnthropicErrorMessage(value.body)
  return null
}
