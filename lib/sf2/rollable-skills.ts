import { genres, getGenreConfig, type CharacterClass, type Genre } from '../genre-config'

const BASE_DND_SKILLS = [
  'Intimidation',
  'Persuasion',
  'Deception',
  'Insight',
  'Perception',
  'Investigation',
  'Athletics',
  'Acrobatics',
  'Stealth',
  'Sleight of Hand',
  'Arcana',
  'Religion',
  'History',
  'Medicine',
  'Survival',
  'Nature',
  'Performance',
]

const SF2_SEED_PROFICIENCIES = [
  'Athletics',
  'Intimidation',
  'Perception',
  'Heavy Weapons',
  'Stealth',
  'Sleight of Hand',
  'Piloting',
  'Hacking',
]

let cachedRollableSkills: ReadonlyMap<string, string> | null = null

export function getSf2RollableSkillMap(): ReadonlyMap<string, string> {
  if (cachedRollableSkills) return cachedRollableSkills

  const skills = new Map<string, string>()
  for (const skill of BASE_DND_SKILLS) addSkill(skills, skill)
  for (const skill of SF2_SEED_PROFICIENCIES) addSkill(skills, skill)

  for (const genre of genres) {
    const config = getGenreConfig(genre.id as Genre)
    for (const playbook of collectPlaybooks(config.classes, config.playbooks)) {
      for (const proficiency of playbook.proficiencies) addSkill(skills, proficiency)
    }
  }

  cachedRollableSkills = skills
  return skills
}

export function canonicalizeSf2RollableSkill(skill: string): string | undefined {
  return getSf2RollableSkillMap().get(normalizeSf2SkillKey(skill))
}

export function normalizeSf2SkillKey(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z]/g, '')
}

function collectPlaybooks(
  classes: CharacterClass[],
  playbooks: Record<string, CharacterClass[]> | undefined
): CharacterClass[] {
  const all = [...classes]
  if (playbooks) {
    for (const originPlaybooks of Object.values(playbooks)) all.push(...originPlaybooks)
  }
  return all
}

function addSkill(skills: Map<string, string>, skill: string): void {
  const trimmed = skill.trim()
  if (!trimmed) return
  const key = normalizeSf2SkillKey(trimmed)
  if (!key || skills.has(key)) return
  skills.set(key, trimmed)
}
