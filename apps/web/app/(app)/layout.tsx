import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { AppShell } from '@/components/layout/app-shell'
import { CommandPalette } from '@/components/layout/command-palette'

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

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const widthCookie = cookieStore.get('sidebar_width')?.value
  const parsedWidth = widthCookie ? parseInt(widthCookie, 10) : NaN
  const defaultWidth = Number.isFinite(parsedWidth) ? parsedWidth : 240

  return (
    <>
      <CommandPalette />
      <AppShell user={session.user} defaultOpen={defaultOpen} defaultWidth={defaultWidth}>
        {children}
      </AppShell>
    </>
  )
}
