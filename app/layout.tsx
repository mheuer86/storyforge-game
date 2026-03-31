import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Lora, Roboto_Mono, Space_Grotesk } from 'next/font/google'
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
const geistPixel = localFont({
  src: './fonts/GeistPixel-Square.woff2',
  variable: '--font-geist-pixel',
})

export const metadata: Metadata = {
  title: 'Storyforge | AI-Powered Text RPG',
  description: 'An immersive AI-powered text RPG experience. D&D meets chat in a space opera setting.',
  generator: 'v0.app',
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${geistPixel.variable} ${robotoMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <div className="starfield" aria-hidden="true" />
        <div className="grid-overlay" aria-hidden="true" />
        <div className="mist-bg hidden" aria-hidden="true" />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
        <Toaster theme="dark" position="bottom-center" />
        <Analytics />
      </body>
    </html>
  )
}
