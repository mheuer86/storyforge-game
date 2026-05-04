export interface Sf2bRollSkillBinding {
  skill: string
  intendedSkills: string[]
  requestedSkill: string
  overridden: boolean
  diagnostic?: string
}

const CANONICAL_SKILLS = new Map<string, string>([
  ['intimidation', 'Intimidation'],
  ['persuasion', 'Persuasion'],
  ['deception', 'Deception'],
  ['insight', 'Insight'],
  ['perception', 'Perception'],
  ['investigation', 'Investigation'],
  ['athletics', 'Athletics'],
  ['acrobatics', 'Acrobatics'],
  ['stealth', 'Stealth'],
  ['sleightofhand', 'Sleight of Hand'],
  ['arcana', 'Arcana'],
  ['religion', 'Religion'],
  ['history', 'History'],
  ['medicine', 'Medicine'],
  ['survival', 'Survival'],
  ['nature', 'Nature'],
  ['performance', 'Performance'],
  ['piloting', 'Piloting'],
  ['hacking', 'Hacking'],
])

export function extractSf2bSkillTags(playerInput: string): string[] {
  if (!playerInput) return []
  const skills: string[] = []

  for (const match of playerInput.matchAll(/\[([^\]]+)\]/g)) {
    const tokens = match[1].split(/\s+or\s+|\s*,\s*|\s+and\s+/i).map((token) => token.trim())
    for (const token of tokens) {
      const found = CANONICAL_SKILLS.get(normalizeSkillKey(token))
      if (found && !skills.includes(found)) skills.push(found)
    }
  }

  return skills
}

export function bindSf2bRollSkill(
  requestedSkill: string,
  intendedSkills: string[]
): Sf2bRollSkillBinding {
  const requested = canonicalizeSf2bSkill(requestedSkill) ?? requestedSkill
  const requestedKey = normalizeSkillKey(requested)
  const matchingIntended = intendedSkills.find((skill) => normalizeSkillKey(skill) === requestedKey)

  if (intendedSkills.length === 0 || matchingIntended) {
    return {
      skill: matchingIntended ?? requested,
      intendedSkills,
      requestedSkill: requested,
      overridden: false,
    }
  }

  const skill = intendedSkills[0]
  return {
    skill,
    intendedSkills,
    requestedSkill: requested,
    overridden: true,
    diagnostic: `SF2B skill-tag override: Narrator requested ${requested || '(blank)'} but player tagged ${intendedSkills.join(' or ')}.`,
  }
}

export function canonicalizeSf2bSkill(skill: string): string | undefined {
  return CANONICAL_SKILLS.get(normalizeSkillKey(skill))
}

function normalizeSkillKey(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z]/g, '')
}
