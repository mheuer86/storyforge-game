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
  title: 'Storyforge | AI-Powered Text RPG',
  description: 'Play a story you\'d actually want to read. A text RPG with real rules, real dice, and real consequences — powered by Claude.',
  metadataBase: new URL('https://storyforge-game.com'),
  openGraph: {
    title: 'Storyforge',
    description: 'Play a story you\'d actually want to read. Six genres. Real dice. Real consequences.',
    url: 'https://storyforge-game.com',
    siteName: 'Storyforge',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Storyforge — AI-Powered Text RPG',
    description: 'Play a story you\'d actually want to read. Six genres. Real dice. Real consequences.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/storyforge_logo.png',
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
