import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { LandingPage } from '@/components/landing-page'

export default async function Home() {
  if (await isAuthenticated()) {
    redirect('/play')
  }
  return <LandingPage />
}
