import type { NPC } from './types'

/**
 * Fuzzy-match an NPC by name: exact match, or prefix match in either direction.
 * Used for deduplication and upsert logic across add_npcs, update_npcs, and deduplicateNpcs.
 */
export function findNpcByName<T extends { name: string }>(npcs: T[], name: string): T | undefined {
  const nameLower = name.toLowerCase()
  return npcs.find((x) => {
    const xLower = x.name.toLowerCase()
    return xLower === nameLower || xLower.startsWith(nameLower) || nameLower.startsWith(xLower)
  })
}

/**
 * Like findNpcByName but returns the index. Returns -1 if not found.
 */
export function findNpcIndexByName<T extends { name: string }>(npcs: T[], name: string): number {
  const nameLower = name.toLowerCase()
  return npcs.findIndex((x) => {
    const xLower = x.name.toLowerCase()
    return xLower === nameLower || xLower.startsWith(nameLower) || nameLower.startsWith(xLower)
  })
}
