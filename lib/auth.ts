import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'storyforge_session'
const SESSION_SECRET = process.env.ACCESS_CODE ?? ''

/** Sign a value with HMAC-SHA256 using the access code as key */
function sign(value: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex')
}

/** Create a signed session token */
export function createSessionToken(): string {
  const payload = crypto.randomUUID()
  const signature = sign(payload)
  return `${payload}.${signature}`
}

/** Verify a signed session token */
function verifyToken(token: string): boolean {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = sign(payload)
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}

/** Set the session cookie */
export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

/** Check if the current request has a valid session */
export async function isAuthenticated(): Promise<boolean> {
  if (!SESSION_SECRET) return true // no access code set = open access (local dev)
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return false
  try {
    return verifyToken(token)
  } catch {
    return false
  }
}
