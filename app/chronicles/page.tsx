import Link from 'next/link'
import Image from 'next/image'
import { getAllChronicles } from '@/lib/chronicles'
import { genres } from '@/lib/genre-config'

const genreName = (id: string) => genres.find(g => g.id === id)?.name ?? id

const genreColor: Record<string, string> = {
  'noire': 'oklch(0.55 0.19 22)',
  'cyberpunk': 'oklch(0.75 0.22 145)',
  'epic-scifi': 'oklch(0.65 0.18 85)',
  'fantasy': 'oklch(0.72 0.14 75)',
  'grimdark': 'oklch(0.58 0.16 28)',
  'space-opera': 'oklch(0.82 0.15 175)',
}

export const metadata = {
  title: 'Tales of Storyforge',
  description: 'Literary fiction from real playthroughs. Every story is different — because every playthrough is yours.',
}

export default function ChroniclesPage() {
  const chronicles = getAllChronicles()

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <header className="relative mb-16 overflow-hidden rounded-sm">
        <Image
          src="/chronicles/chronicles-header.png"
          alt="Tales of Storyforge"
          width={800}
          height={450}
          className="w-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">
            Tales of Storyforge
          </h1>
          <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-white/60">
            Literary fiction from actual game sessions. Every chronicle below came from a real playthrough —
            the dice rolls, the choices, the consequences. Your story would read differently.
            That&apos;s the point.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-12">
        {chronicles.map((chronicle) => (
          <Link
            key={chronicle.slug}
            href={`/chronicles/${chronicle.slug}`}
            className="group block"
          >
            <article
              className="border-l-2 pl-6 transition-opacity group-hover:opacity-80"
              style={{ borderColor: genreColor[chronicle.genre] ?? 'var(--border)' }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {genreName(chronicle.genre)} &middot; Chapter {chronicle.chapter}
              </p>
              <h2 className="mt-2 text-xl font-medium text-foreground group-hover:text-foreground/80">
                {chronicle.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {chronicle.character}, {chronicle.class}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/50 italic">
                {chronicle.intro}
              </p>
            </article>
          </Link>
        ))}
      </div>

      <footer className="mt-20 border-t border-border pt-8">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Storyforge
        </Link>
      </footer>
    </div>
  )
}
