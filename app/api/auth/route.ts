import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, setSessionCookie, isAuthenticated } from '@/lib/auth'

const ACCESS_CODE = process.env.ACCESS_CODE ?? ''

/** Check if session is valid */
export async function GET() {
  const authed = await isAuthenticated()
  return NextResponse.json({ authenticated: authed })
}

/** Validate access code and set session cookie */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  if (!ACCESS_CODE) {
    // No access code configured — open access
    return NextResponse.json({ ok: true })
  }

  if (code.toLowerCase() !== ACCESS_CODE.trim().toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'Wrong access code' }, { status: 401 })
  }

  const token = createSessionToken()
  await setSessionCookie(token)
  return NextResponse.json({ ok: true })
}
