import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { InviteAcceptForm } from './invite-accept-form'

interface Props {
  params: Promise<{ token: string }>
}

export const metadata = { title: 'Campaign Invite' }

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const res = await fetch(
    `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/invites/${token}`,
    { cache: 'no-store' }
  )

  if (!res.ok) {
    const data = await res.json()
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 max-w-md px-6">
          <h1 className="text-2xl font-bold">Invalid Invite</h1>
          <p className="text-muted-foreground">
            {data.error === 'Invite has expired'
              ? 'This invite link has expired. Ask your GM to send a new one.'
              : data.error === 'Invite already accepted'
              ? 'This invite has already been used.'
              : 'This invite link is invalid or has been revoked.'}
          </p>
          <a href="/campaigns" className="text-primary hover:underline text-sm">
            Go to your campaigns
          </a>
        </div>
      </div>
    )
  }

  const invite = await res.json()

  const session = await auth.api.getSession({ headers: await headers() })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Grimoire</h1>
          <p className="text-muted-foreground mt-1">Campaign Invite</p>
        </div>
        <InviteAcceptForm
          token={token}
          invite={invite}
          isSignedIn={!!session}
          currentUserEmail={session?.user.email ?? null}
        />
      </div>
    </div>
  )
}
