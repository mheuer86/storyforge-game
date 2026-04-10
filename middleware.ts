import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Prevent framing (clickjacking)
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer: send origin only on cross-origin requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Disable unnecessary browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // CSP: lock down what scripts/connections the page can make.
  // Key protection: connect-src 'self' prevents exfiltration of BYOK keys to third-party domains.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",                  // Next.js requires inline scripts for hydration
      "style-src 'self' 'unsafe-inline'",                  // Tailwind injects inline styles
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",                                // BYOK keys only go to own origin
      "frame-ancestors 'none'",
    ].join('; ')
  )

  return response
}

export const config = {
  // Apply to all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
