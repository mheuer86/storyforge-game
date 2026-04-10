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

export function getAllChronicles(): Chronicle[] {
  const files = fs.readdirSync(chroniclesDirectory).filter(f => f.endsWith('.md'))
  return files.map(file => {
    const raw = fs.readFileSync(path.join(chroniclesDirectory, file), 'utf8')
    const { data, content } = matter(raw)
    return { ...data, content: content.trim() } as Chronicle
  }).sort((a, b) => {
    const genreOrder = ['noire', 'cyberpunk', 'epic-scifi', 'fantasy', 'grimdark', 'space-opera']
    return genreOrder.indexOf(a.genre) - genreOrder.indexOf(b.genre)
  })
}
