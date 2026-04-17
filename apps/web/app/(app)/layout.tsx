import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <MobileHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
