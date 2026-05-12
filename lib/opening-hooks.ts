import type { CharacterClass, GenreConfig, OpeningHookObject } from './genre-config'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function asHookObject(hook: GenreConfig['openingHooks'][number]): OpeningHookObject {
  return typeof hook === 'string' ? { hook } : hook
}

function isTagLabel(label: string): boolean {
  return label === label.toLowerCase()
}

function matchesHookClass(label: string, characterClass: CharacterClass): boolean {
  const normalized = normalize(label)
  const directLabels = [characterClass.id, characterClass.name].map(normalize)
  const hookTags = (characterClass.hookTags ?? []).map(normalize)

  // Genre data uses display-cased playbook names for direct hooks and lower-case
  // tags for cross-playbook archetype hooks. Keeping that distinction prevents
  // direct playbooks like "Enforcer" from colliding with the "enforcer" tag.
  return isTagLabel(label)
    ? directLabels.includes(normalized) || hookTags.includes(normalized)
    : directLabels.includes(normalized)
}

export function getEligibleOpeningHooks(
  config: GenreConfig,
  speciesId: string,
  characterClass: CharacterClass,
): OpeningHookObject[] {
  const originId = normalize(speciesId)

  return config.openingHooks.map(asHookObject).filter((hook) => {
    const hasOrigins = !!hook.origins?.length
    const hasClasses = !!hook.classes?.length

    if (!hasOrigins && hasClasses) return false
    if (!hasOrigins && !hasClasses) return true
    if (!hook.origins!.some((origin) => normalize(origin) === originId)) return false
    if (!hasClasses) return true

    return hook.classes!.some((label) => matchesHookClass(label, characterClass))
  })
}

export function selectOpeningHook(
  config: GenreConfig,
  speciesId: string,
  characterClass: CharacterClass,
  random: () => number = Math.random,
): OpeningHookObject {
  const eligible = getEligibleOpeningHooks(config, speciesId, characterClass)

  if (eligible.length === 0) {
    throw new Error(`No eligible opening hooks for ${config.id}/${speciesId}/${characterClass.id}`)
  }

  return eligible[Math.min(Math.floor(random() * eligible.length), eligible.length - 1)]
}

export function resolveOpeningHookForCharacter(
  config: GenreConfig,
  speciesRef: string,
  classRef: string,
  random: () => number = Math.random,
): OpeningHookObject {
  const species = config.species.find((s) =>
    normalize(s.id) === normalize(speciesRef) || normalize(s.name) === normalize(speciesRef)
  )

  if (!species) {
    throw new Error(`Cannot resolve species/origin "${speciesRef}" for ${config.id} opening hook selection`)
  }

  const classPool = config.playbooks?.[species.id] ?? config.classes
  const characterClass = classPool.find((c) =>
    normalize(c.id) === normalize(classRef) || normalize(c.name) === normalize(classRef)
  )

  if (!characterClass) {
    throw new Error(`Cannot resolve class/playbook "${classRef}" for ${config.id}/${species.id} opening hook selection`)
  }

  return selectOpeningHook(config, species.id, characterClass, random)
}
