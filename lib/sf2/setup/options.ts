import { getEligibleOpeningHooks } from '../../opening-hooks'
import {
  genres,
  getGenreConfig,
  type CharacterClass,
  type Genre,
  type GenreConfig,
  type OpeningHookObject,
  type Species,
} from '../../genre-config'
import type {
  Sf2SetupGenreOption,
  Sf2SetupHookOption,
  Sf2SetupOriginOption,
  Sf2SetupPlaybookOption,
  Sf2SetupSelection,
} from './types'

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'hook'
}

function hashText(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function hookTitle(config: GenreConfig, hook: OpeningHookObject): string {
  return hook.title?.trim() || config.initialChapterTitle || slug(hook.hook)
}

export function getSf2SetupHookId(config: GenreConfig, hook: OpeningHookObject): string {
  return `${slug(hookTitle(config, hook))}-${hashText(hook.hook).slice(0, 7)}`
}

export function listSf2SetupGenres(): Sf2SetupGenreOption[] {
  return genres
    .filter((genre) => genre.available)
    .map((genre) => ({ id: genre.id, name: genre.name }))
}

export function listSf2SetupOrigins(genreId: string): Sf2SetupOriginOption[] {
  const config = getGenreConfig(genreId as Genre)
  return config.species
    .filter((origin) => !origin.hidden)
    .map((origin) => ({
      id: origin.id,
      name: origin.name,
      description: origin.description,
    }))
}

export function getSf2SetupOrigin(config: GenreConfig, originId: string): Species {
  const origin = config.species.find((candidate) => candidate.id === originId && !candidate.hidden)
  if (!origin) throw new Error(`No selectable SF2 origin found for ${config.id}/${originId}`)
  return origin
}

export function listSf2SetupPlaybooks(
  genreId: string,
  originId: string
): Sf2SetupPlaybookOption[] {
  const config = getGenreConfig(genreId as Genre)
  return getSf2SetupPlaybooks(config, originId).map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    concept: playbook.concept,
  }))
}

export function getSf2SetupPlaybooks(config: GenreConfig, originId: string): CharacterClass[] {
  return config.playbooks?.[originId] ?? config.classes
}

export function getSf2SetupPlaybook(
  config: GenreConfig,
  originId: string,
  playbookId: string
): CharacterClass {
  const playbook = getSf2SetupPlaybooks(config, originId).find((candidate) => candidate.id === playbookId)
  if (!playbook) throw new Error(`No SF2 playbook found for ${config.id}/${originId}/${playbookId}`)
  return playbook
}

export function listSf2SetupHooks(
  genreId: string,
  originId: string,
  playbookId: string
): Sf2SetupHookOption[] {
  const config = getGenreConfig(genreId as Genre)
  const playbook = getSf2SetupPlaybook(config, originId, playbookId)
  return getEligibleOpeningHooks(config, originId, playbook).map((hook) => ({
    id: getSf2SetupHookId(config, hook),
    title: hookTitle(config, hook),
    premise: hook.hook,
    objective: hook.frame?.objective,
    crucible: hook.frame?.crucible,
    arcName: hook.arc?.name,
    firstEpisode: hook.arc?.episode,
  }))
}

export function getSf2SetupHook(
  config: GenreConfig,
  originId: string,
  playbook: CharacterClass,
  hookId: string
): OpeningHookObject {
  const hook = getEligibleOpeningHooks(config, originId, playbook).find((candidate) =>
    getSf2SetupHookId(config, candidate) === hookId
  )
  if (!hook) throw new Error(`No eligible SF2 hook found for ${config.id}/${originId}/${playbook.id}/${hookId}`)
  return hook
}

export function createSf2SetupSelectionId(selection: Sf2SetupSelection): string {
  return [
    'sf2-setup',
    selection.genreId,
    selection.originId,
    selection.playbookId,
    selection.hookId,
  ].map(slug).join('/')
}
