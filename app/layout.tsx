import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Lora, Newsreader, Roboto_Mono, Space_Grotesk, Cormorant_Garamond, Cinzel } from 'next/font/google'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans'
})
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
})
const lora = Lora({
  subsets: ["latin"],
  variable: '--font-lora'
})
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
})
const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant-garamond',
})
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cinzel',
})
const geistPixel = localFont({
  src: './fonts/GeistPixel-Square.woff2',
  variable: '--font-geist-pixel',
})

export const metadata: Metadata = {
  title: 'Storyforge — Play a story you\'d actually want to read',
  description: 'A text RPG with real rules, real dice, and real consequences. Six genres, persistent worlds, NPC memory. Powered by Claude. Bring your own API key.',
  metadataBase: new URL('https://storyforge-game.com'),
  openGraph: {
    title: 'Storyforge — Play a story you\'d actually want to read',
    description: 'A text RPG with real rules, real dice, and real consequences. Six genres, persistent worlds, NPC memory. Powered by Claude.',
    url: 'https://storyforge-game.com',
    siteName: 'Storyforge',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Storyforge — AI-Powered Text RPG',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Storyforge — Play a story you\'d actually want to read',
    description: 'A text RPG with real rules, real dice, and real consequences. Powered by Claude.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${geistPixel.variable} ${robotoMono.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${cormorantGaramond.variable} ${cinzel.variable} font-sans antialiased`}>
        <div className="starfield" aria-hidden="true" />
        <div className="grid-overlay" aria-hidden="true" />
        <div className="mist-bg" aria-hidden="true" />
        <div className="static-bg" aria-hidden="true" />
        <div className="drift-bg" aria-hidden="true" />
        <div className="grain-overlay" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-2" aria-hidden="true" />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
        <Toaster theme="dark" position="bottom-center" />
        <Analytics />
      </body>
    </html>
  )
}
