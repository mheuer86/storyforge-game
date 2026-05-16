// Public facade for SF2 Narrator prompt scaffolds.
// Shape (CORE + BIBLE + ROLE + SITUATION) is load-bearing for cache-control.
// Discipline: NO per-turn content in any constant — keeps BP2 cache-warm.
// Per-turn content lives in the scene packet, appended at BP4 in the caller.

export { SF2_CORE } from './prompt/core'
export {
  SF2_NARRATOR_ROLE,
  buildNarratorRole,
} from './prompt/role'
export { buildNarratorSituation } from './prompt/situation'
export {
  SF2_BIBLE_CYBERPUNK,
  SF2_BIBLE_FANTASY,
  SF2_BIBLE_GRIMDARK,
  SF2_BIBLE_HEGEMONY,
  SF2_BIBLE_NOIR,
  SF2_BIBLE_SPACE_OPERA,
  getSf2BibleForGenre,
} from '../genre-profile'
