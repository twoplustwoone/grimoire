import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session) {
    redirect('/campaigns')
  } else {
    redirect('/sign-in')
  }
}
