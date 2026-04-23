import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const chroniclesDirectory = path.join(process.cwd(), 'content/chronicles')

export interface Chronicle {
  slug: string
  title: string
  genre: string
  chapter: number
  character: string
  class: string
  intro: string
  image: string
  content: string
}

export function getChronicle(slug: string): Chronicle | null {
  const files = fs.readdirSync(chroniclesDirectory)
  const file = files.find(f => {
    const { data } = matter(fs.readFileSync(path.join(chroniclesDirectory, f), 'utf8'))
    return data.slug === slug
  })
  if (!file) return null
  const raw = fs.readFileSync(path.join(chroniclesDirectory, file), 'utf8')
  const { data, content } = matter(raw)
  return { ...data, content: content.trim() } as Chronicle
}

// Curated strongest-first order, hand-picked. New chronicles not in this list
// fall to the end, alphabetical by slug among themselves — add here to position.
const CURATED_ORDER: string[] = [
  'sythe-chapter-1',          // The Tithe Was Short
  'silver-chapter-1',         // The Fourteen-Year-Old
  'whisper-chapter-1',        // Second Name
  'captain-rix-chapter-1',    // The Athex-7 Extraction (Annex 7)
  'captain-rix-chapter-2',    // The Narrowing Dark
  'ghost-sera-chapter-1',     // Implanted
  'seeker-verum-chapter-1',   // Heresy or Truth
  'seeker-verum-chapter-2',   // The Cost of Proof
  'hank-garnett-chapter-1',   // The Margaux Hotel
]

export function getAllChronicles(): Chronicle[] {
  const files = fs.readdirSync(chroniclesDirectory).filter(f => f.endsWith('.md'))
  return files.map(file => {
    const raw = fs.readFileSync(path.join(chroniclesDirectory, file), 'utf8')
    const { data, content } = matter(raw)
    return { ...data, content: content.trim() } as Chronicle
  }).sort((a, b) => {
    const aIdx = CURATED_ORDER.indexOf(a.slug)
    const bIdx = CURATED_ORDER.indexOf(b.slug)
    if (aIdx === -1 && bIdx === -1) return a.slug.localeCompare(b.slug)
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })
}
