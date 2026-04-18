import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { ApiKeyManager } from './api-key-manager'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>
      <ApiKeyManager />
    </div>
  )
}
