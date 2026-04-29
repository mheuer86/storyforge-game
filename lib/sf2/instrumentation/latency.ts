// Uniform latency payload emitted by every Sf2 API route. Captured in the
// client debug log under kind 'latency' and aggregated by computeSessionSummary
// alongside token usage. The cost-improvements doc (zettel 2604292102) calls
// for per-call latency next to per-call cost; this is the minimum payload
// that supports that rollup without each route inventing its own shape.
export interface Sf2LatencyPayload {
  // Wall-clock from request entry to response send (or stream-close for
  // streaming routes). This is the number a player perceives.
  totalMs: number
  // Wall-clock spent inside the Anthropic SDK call. For streaming routes this
  // is from `client.messages.stream(...)` invocation to `finalMessage()`
  // resolve; for non-streaming routes it is the round-trip of
  // `client.messages.create(...)`.
  apiMs: number
  // Time-to-first-token, streaming routes only. Undefined for non-streaming.
  ttftMs?: number
  // Number of API attempts. >1 means a retry/repair occurred (Author has
  // explicit retry-on-validation; other routes don't yet).
  attempts?: number
}

export function startTimer() {
  const t0 = Date.now()
  return {
    elapsed: () => Date.now() - t0,
  }
}
