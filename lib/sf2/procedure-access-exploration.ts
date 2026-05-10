import type {
  Sf2ProcedureAffordance,
  Sf2ProcedureComplication,
  Sf2ProcedureConstraint,
  Sf2ProcedureFact,
  Sf2ProcedureLink,
  Sf2ProcedureRuntime,
} from './procedure'

export const SF2_ACCESS_POSTURES = ['open', 'masked', 'authorized', 'covert', 'forced', 'remote', 'social'] as const
export const SF2_CREDENTIAL_MASK_STATUSES = ['clean', 'flagged', 'compromised', 'burned'] as const
export const SF2_SCRUTINY_LAYER_STATUSES = ['dormant', 'watching', 'challenging', 'alarmed', 'cleared'] as const
export const SF2_EGRESS_PHASES = ['not_started', 'positioning', 'departing', 'pursued', 'clear'] as const
export const SF2_EXPLORATION_NODE_STATUSES = ['unknown', 'known', 'entered', 'searched', 'cleared'] as const
export const SF2_EXPLORATION_ROUTE_STATUSES = ['unknown', 'open', 'risky', 'blocked', 'spent'] as const
export const SF2_EXPLORATION_HAZARD_STATUSES = ['latent', 'telegraphed', 'active', 'avoided', 'triggered', 'cleared'] as const

export type Sf2AccessPosture = (typeof SF2_ACCESS_POSTURES)[number]
export type Sf2CredentialMaskStatus = (typeof SF2_CREDENTIAL_MASK_STATUSES)[number]
export type Sf2ScrutinyLayerStatus = (typeof SF2_SCRUTINY_LAYER_STATUSES)[number]
export type Sf2EgressPhase = (typeof SF2_EGRESS_PHASES)[number]
export type Sf2ExplorationNodeStatus = (typeof SF2_EXPLORATION_NODE_STATUSES)[number]
export type Sf2ExplorationRouteStatus = (typeof SF2_EXPLORATION_ROUTE_STATUSES)[number]
export type Sf2ExplorationHazardStatus = (typeof SF2_EXPLORATION_HAZARD_STATUSES)[number]

export interface Sf2CredentialMask {
  id: string
  label: string
  status: Sf2CredentialMaskStatus
  strength: number
  maxStrength: number
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ScrutinyLayer {
  id: string
  label: string
  status: Sf2ScrutinyLayerStatus
  intensity: number
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ProcedureClock {
  id: string
  label: string
  current: number
  max: number
}

export interface Sf2AccessRuntime {
  procedureId: string
  posture: Sf2AccessPosture
  credentialMasks: Sf2CredentialMask[]
  scrutinyLayers: Sf2ScrutinyLayer[]
  exposureClock?: Sf2ProcedureClock
  egressPhase: Sf2EgressPhase
  ambientAlertness: number
}

export interface Sf2ExplorationNode {
  id: string
  label: string
  status: Sf2ExplorationNodeStatus
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ExplorationRoute {
  id: string
  label: string
  fromNodeId?: string
  toNodeId?: string
  status: Sf2ExplorationRouteStatus
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ExplorationHazard {
  id: string
  label: string
  status: Sf2ExplorationHazardStatus
  severity: number
  linkedRefs: Sf2ProcedureLink[]
}

export interface Sf2ExplorationRuntime {
  procedureId: string
  currentNodeId?: string
  nodes: Sf2ExplorationNode[]
  routes: Sf2ExplorationRoute[]
  hazards: Sf2ExplorationHazard[]
  ambientAlertness: number
}

export interface Sf2AccessExplorationPacket {
  procedureId: string
  label: string
  kind: 'access' | 'exploration'
  status: Sf2ProcedureRuntime['status']
  phase?: Sf2ProcedureRuntime['phase']
  access?: Sf2AccessRuntime
  exploration?: Sf2ExplorationRuntime
  facts: Sf2ProcedureFact[]
  constraints: Sf2ProcedureConstraint[]
  affordances: Sf2ProcedureAffordance[]
  complications: Sf2ProcedureComplication[]
}

export interface Sf2AccessExplorationPacketOptions {
  factLimit?: number
  constraintLimit?: number
  affordanceLimit?: number
  complicationLimit?: number
  maskLimit?: number
  scrutinyLimit?: number
  nodeLimit?: number
  routeLimit?: number
  hazardLimit?: number
}

export function buildAccessExplorationPacket(
  runtime: Sf2ProcedureRuntime,
  options: Sf2AccessExplorationPacketOptions = {}
): Sf2AccessExplorationPacket | null {
  if (runtime.kind !== 'access' && runtime.kind !== 'exploration') return null

  const constraints = activeConstraints(runtime.constraints)
  const affordances = runtime.affordances.filter((affordance) => affordance.status === 'available')
  const complications = runtime.complications.filter((complication) => complication.status === 'active')
  const access = runtime.kind === 'access'
    ? deriveAccessRuntime(runtime, constraints, affordances, complications, options)
    : undefined
  const exploration = runtime.kind === 'exploration'
    ? deriveExplorationRuntime(runtime, constraints, affordances, complications, options)
    : undefined

  return {
    procedureId: runtime.id,
    label: runtime.label,
    kind: runtime.kind,
    status: runtime.status,
    phase: runtime.phase,
    access,
    exploration,
    facts: runtime.facts
      .slice()
      .sort((a, b) => b.lastUpdatedTurn - a.lastUpdatedTurn)
      .slice(0, options.factLimit ?? 3),
    constraints: dedupeById(constraints).slice(0, options.constraintLimit ?? 5),
    affordances: dedupeById(affordances).slice(0, options.affordanceLimit ?? 4),
    complications: dedupeById(complications).slice(0, options.complicationLimit ?? 3),
  }
}

export function deriveAccessRuntime(
  runtime: Pick<Sf2ProcedureRuntime, 'id' | 'constraints' | 'affordances' | 'complications'>,
  constraints = activeConstraints(runtime.constraints),
  affordances = runtime.affordances.filter((affordance) => affordance.status === 'available'),
  complications = runtime.complications.filter((complication) => complication.status === 'active'),
  options: Sf2AccessExplorationPacketOptions = {}
): Sf2AccessRuntime {
  const credentialMasks = dedupeById([
    ...affordances.filter((affordance) => affordance.kind === 'credential').map(credentialMaskFromAffordance),
    ...constraints.filter((constraint) => hasLinkKind(constraint.linkedRefs, 'credential_mask')).map(credentialMaskFromConstraint),
  ]).slice(0, options.maskLimit ?? 3)

  const scrutinyLayers = dedupeById([
    ...constraints.filter((constraint) => hasLinkKind(constraint.linkedRefs, 'scrutiny_layer')).map(scrutinyLayerFromConstraint),
    ...complications.map(scrutinyLayerFromComplication),
  ]).slice(0, options.scrutinyLimit ?? 3)

  const exposureClock = clockFromConstraints(constraints)
  const ambientAlertness = clamp(
    Math.max(
      exposureClock ? exposureClock.current / exposureClock.max : 0,
      ...scrutinyLayers.map((layer) => layer.intensity / 4)
    ),
    0,
    1
  )

  return {
    procedureId: runtime.id,
    posture: deriveAccessPosture(credentialMasks, scrutinyLayers, exposureClock),
    credentialMasks,
    scrutinyLayers,
    exposureClock,
    egressPhase: deriveEgressPhase(runtime, exposureClock, scrutinyLayers),
    ambientAlertness,
  }
}

export function deriveExplorationRuntime(
  runtime: Pick<Sf2ProcedureRuntime, 'id' | 'constraints' | 'affordances' | 'complications' | 'linkedRefs'>,
  constraints = activeConstraints(runtime.constraints),
  affordances = runtime.affordances.filter((affordance) => affordance.status === 'available'),
  complications = runtime.complications.filter((complication) => complication.status === 'active'),
  options: Sf2AccessExplorationPacketOptions = {}
): Sf2ExplorationRuntime {
  const nodes = dedupeById([
    ...runtime.linkedRefs.filter((ref) => ref.kind === 'area_node').map(nodeFromLink),
    ...constraints.filter((constraint) => hasLinkKind(constraint.linkedRefs, 'area_node')).map(nodeFromConstraint),
  ]).slice(0, options.nodeLimit ?? 5)

  const routes = dedupeById([
    ...runtime.linkedRefs.filter((ref) => ref.kind === 'route').map(routeFromLink),
    ...affordances.filter((affordance) => affordance.kind === 'route').map(routeFromAffordance),
    ...constraints.filter((constraint) => constraint.kind === 'route' || hasLinkKind(constraint.linkedRefs, 'route')).map(routeFromConstraint),
  ]).slice(0, options.routeLimit ?? 5)

  const hazards = dedupeById([
    ...constraints.filter((constraint) => constraint.kind === 'physical' || constraint.kind === 'technical' || constraint.kind === 'arcane').map(hazardFromConstraint),
    ...complications.map(hazardFromComplication),
  ]).slice(0, options.hazardLimit ?? 4)

  const ambientAlertness = clamp(
    Math.max(
      ...hazards.map((hazard) => hazard.severity / 4),
      constraints.some((constraint) => constraint.kind === 'exposure') ? 0.5 : 0
    ),
    0,
    1
  )

  return {
    procedureId: runtime.id,
    currentNodeId: nodes.find((node) => node.status === 'entered')?.id ?? nodes[0]?.id,
    nodes,
    routes,
    hazards,
    ambientAlertness,
  }
}

export function deriveAccessPosture(
  masks: Sf2CredentialMask[],
  scrutinyLayers: Sf2ScrutinyLayer[],
  exposureClock?: Sf2ProcedureClock
): Sf2AccessPosture {
  if (exposureClock && exposureClock.current >= exposureClock.max) return 'forced'
  if (scrutinyLayers.some((layer) => layer.status === 'alarmed')) return 'forced'
  if (masks.some((mask) => mask.status === 'clean' || mask.status === 'flagged' || mask.status === 'compromised')) return 'masked'
  if (scrutinyLayers.some((layer) => layer.status === 'challenging')) return 'social'
  return scrutinyLayers.some((layer) => layer.status === 'watching') ? 'authorized' : 'open'
}

function activeConstraints(constraints: Sf2ProcedureConstraint[]): Sf2ProcedureConstraint[] {
  return constraints.filter((constraint) => constraint.status === 'active' || constraint.status === 'consumed')
}

function credentialMaskFromAffordance(affordance: Sf2ProcedureAffordance): Sf2CredentialMask {
  return {
    id: firstLinkedId(affordance.linkedRefs, 'credential_mask') ?? affordance.id,
    label: affordance.label,
    status: affordance.status === 'available' ? 'clean' : 'burned',
    strength: 1,
    maxStrength: 1,
    linkedRefs: affordance.linkedRefs,
  }
}

function credentialMaskFromConstraint(constraint: Sf2ProcedureConstraint): Sf2CredentialMask {
  return {
    id: firstLinkedId(constraint.linkedRefs, 'credential_mask') ?? constraint.id,
    label: constraint.label,
    status: constraint.status === 'consumed'
      ? 'flagged'
      : boundedCurrent(constraint) >= boundedMax(constraint)
        ? 'compromised'
        : 'clean',
    strength: boundedCurrent(constraint),
    maxStrength: boundedMax(constraint),
    linkedRefs: constraint.linkedRefs,
  }
}

function scrutinyLayerFromConstraint(constraint: Sf2ProcedureConstraint): Sf2ScrutinyLayer {
  const intensity = boundedCurrent(constraint)
  return {
    id: firstLinkedId(constraint.linkedRefs, 'scrutiny_layer') ?? constraint.id,
    label: constraint.label,
    status: intensity >= boundedMax(constraint) ? 'challenging' : 'watching',
    intensity,
    linkedRefs: constraint.linkedRefs,
  }
}

function scrutinyLayerFromComplication(complication: Sf2ProcedureComplication): Sf2ScrutinyLayer {
  return {
    id: firstLinkedId(complication.linkedRefs, 'scrutiny_layer') ?? complication.id,
    label: complication.label,
    status: 'challenging',
    intensity: 3,
    linkedRefs: complication.linkedRefs,
  }
}

function clockFromConstraints(constraints: Sf2ProcedureConstraint[]): Sf2ProcedureClock | undefined {
  const exposure = constraints.find((constraint) => constraint.kind === 'exposure' && typeof constraint.current === 'number')
  if (!exposure) return undefined
  return {
    id: firstLinkedId(exposure.linkedRefs, 'clock') ?? exposure.id,
    label: exposure.label,
    current: boundedCurrent(exposure),
    max: boundedMax(exposure),
  }
}

function deriveEgressPhase(
  runtime: Pick<Sf2ProcedureRuntime, 'constraints'>,
  exposureClock: Sf2ProcedureClock | undefined,
  scrutinyLayers: Sf2ScrutinyLayer[]
): Sf2EgressPhase {
  if (runtime.constraints.some((constraint) => constraint.kind === 'route' && constraint.status === 'consumed')) return 'departing'
  if (exposureClock && exposureClock.current >= exposureClock.max) return 'pursued'
  if (scrutinyLayers.some((layer) => layer.status === 'alarmed')) return 'pursued'
  return 'not_started'
}

function nodeFromLink(link: Sf2ProcedureLink): Sf2ExplorationNode {
  return { id: link.id, label: link.id, status: 'known', linkedRefs: [link] }
}

function nodeFromConstraint(constraint: Sf2ProcedureConstraint): Sf2ExplorationNode {
  return {
    id: firstLinkedId(constraint.linkedRefs, 'area_node') ?? constraint.id,
    label: constraint.label,
    status: constraint.status === 'consumed' ? 'entered' : 'known',
    linkedRefs: constraint.linkedRefs,
  }
}

function routeFromLink(link: Sf2ProcedureLink): Sf2ExplorationRoute {
  return { id: link.id, label: link.id, status: 'unknown', linkedRefs: [link] }
}

function routeFromAffordance(affordance: Sf2ProcedureAffordance): Sf2ExplorationRoute {
  return {
    id: firstLinkedId(affordance.linkedRefs, 'route') ?? affordance.id,
    label: affordance.label,
    status: affordance.status === 'available' ? 'open' : 'spent',
    linkedRefs: affordance.linkedRefs,
  }
}

function routeFromConstraint(constraint: Sf2ProcedureConstraint): Sf2ExplorationRoute {
  return {
    id: firstLinkedId(constraint.linkedRefs, 'route') ?? constraint.id,
    label: constraint.label,
    status: constraint.status === 'active' ? 'risky' : 'spent',
    linkedRefs: constraint.linkedRefs,
  }
}

function hazardFromConstraint(constraint: Sf2ProcedureConstraint): Sf2ExplorationHazard {
  return {
    id: constraint.id,
    label: constraint.label,
    status: constraint.status === 'consumed' ? 'triggered' : 'telegraphed',
    severity: boundedCurrent(constraint),
    linkedRefs: constraint.linkedRefs,
  }
}

function hazardFromComplication(complication: Sf2ProcedureComplication): Sf2ExplorationHazard {
  return {
    id: complication.id,
    label: complication.label,
    status: 'active',
    severity: 3,
    linkedRefs: complication.linkedRefs,
  }
}

function boundedCurrent(constraint: Sf2ProcedureConstraint): number {
  return clamp(Math.round(constraint.current ?? 1), 0, boundedMax(constraint))
}

function boundedMax(constraint: Sf2ProcedureConstraint): number {
  return Math.max(1, Math.round(constraint.max ?? 4))
}

function hasLinkKind(refs: Sf2ProcedureLink[], kind: Sf2ProcedureLink['kind']): boolean {
  return refs.some((ref) => ref.kind === kind)
}

function firstLinkedId(refs: Sf2ProcedureLink[], kind: Sf2ProcedureLink['kind']): string | undefined {
  return refs.find((ref) => ref.kind === kind)?.id
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    deduped.push(item)
  }
  return deduped
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
