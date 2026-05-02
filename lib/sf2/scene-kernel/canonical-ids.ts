// Compatibility export for older scene-kernel callers. The canonical reference
// policy module owns id classification, validation modes, and violation text.
export {
  CANONICAL_ID_PATTERN,
  CANONICAL_PREFIXES,
  formatViolations,
  isCanonicalId,
  validateSnapshotIds,
  validateSnapshotIdsForMode,
  validateSnapshotIdsStrict,
  type CanonicalIdCheckResult,
  type CanonicalIdViolation,
  type Sf2ReferencePolicyMode,
} from '../reference-policy'
