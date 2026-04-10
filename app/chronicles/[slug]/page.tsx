import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getChronicle, getAllChronicles } from '@/lib/chronicles'
import { genres } from '@/lib/genre-config'
import { GenreTheme } from './genre-theme'

const genreName = (id: string) => genres.find(g => g.id === id)?.name ?? id

export function generateStaticParams() {
  return getAllChronicles().map((c) => ({ slug: c.slug }))
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const chronicle = getChronicle(slug)
    if (!chronicle) return { title: 'Chronicle not found' }
    return {
      title: `${chronicle.title} — Tales of Storyforge`,
      description: chronicle.intro,
    }
  })
}

export default async function ChroniclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const chronicle = getChronicle(slug)
  if (!chronicle) notFound()

  // Split content into paragraphs, render section breaks as <hr>
  const paragraphs = chronicle.content
    .split('\n\n')
    .filter(p => p.trim().length > 0 && !p.trim().startsWith('<!--'))

  return (
    <div>
      <GenreTheme genre={chronicle.genre} />
      <article className="mx-auto max-w-2xl py-20">
        <div className="mb-4 px-6">
          <Link
            href="/chronicles"
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Tales of Storyforge
          </Link>
        </div>

        {chronicle.image && (
          <header className="relative mb-12 overflow-hidden rounded-sm mx-6 sm:mx-0">
            <Image
              src={chronicle.image}
              alt={`${chronicle.title} — key scene`}
              width={800}
              height={450}
              className="w-full object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
                {genreName(chronicle.genre)} &middot; Chapter {chronicle.chapter}
              </p>
              <h1 className="mt-1.5 text-2xl font-medium text-white">
                {chronicle.title}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                {chronicle.character}, {chronicle.class}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/40 italic max-w-lg">
                {chronicle.intro}
              </p>
            </div>
          </header>
        )}

        {!chronicle.image && (
          <header className="mb-12 mt-8 px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {genreName(chronicle.genre)} &middot; Chapter {chronicle.chapter}
            </p>
            <h1 className="mt-2 text-2xl font-medium text-foreground">
              {chronicle.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {chronicle.character}, {chronicle.class}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/50 italic">
              {chronicle.intro}
            </p>
          </header>
        )}

        <div
          className="prose-chronicle px-6"
          style={{ fontFamily: 'var(--font-narrative)', fontSize: 'var(--narrative-font-size)' }}
        >
          {paragraphs.map((p, i) => {
            if (p.trim() === '---') {
              return <hr key={i} className="my-10 border-border" />
            }
            // Handle *italics* in text
            const rendered = p.split(/(\*[^*]+\*)/).map((segment, j) => {
              if (segment.startsWith('*') && segment.endsWith('*')) {
                return <em key={j}>{segment.slice(1, -1)}</em>
              }
              return segment
            })
            return (
              <p key={i} className="mb-4 leading-relaxed text-foreground/85">
                {rendered}
              </p>
            )
          })}
        </div>

        <footer className="mt-16 border-t border-border pt-8 flex items-center justify-between px-6">
          <Link
            href="/chronicles"
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; All chronicles
          </Link>
          <Link
            href="/play"
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Start your own &rarr;
          </Link>
        </footer>
      </article>
    </div>
  )
}
