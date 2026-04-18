import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { prisma } from '@grimoire/db'
import { ConsentScreen } from './consent-screen'

interface Props {
  searchParams: Promise<{
    client_id?: string
    redirect_uri?: string
    response_type?: string
    scope?: string
    state?: string
    code_challenge?: string
    code_challenge_method?: string
  }>
}

export const metadata = { title: 'Authorize Access' }

export default async function AuthorizePage({ searchParams }: Props) {
  const params = await searchParams
  const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state, scope } = params

  if (!client_id || !redirect_uri || response_type !== 'code' || !code_challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-3 p-6">
          <h1 className="text-2xl font-bold">Invalid Authorization Request</h1>
          <p className="text-muted-foreground">Missing or invalid OAuth parameters.</p>
        </div>
      </div>
    )
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: client_id },
  })
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-3 p-6">
          <h1 className="text-2xl font-bold">Unknown Client</h1>
          <p className="text-muted-foreground">This OAuth client is not registered.</p>
        </div>
      </div>
    )
  }

  if (!client.redirectUris.includes(redirect_uri)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-3 p-6">
          <h1 className="text-2xl font-bold">Invalid Redirect</h1>
          <p className="text-muted-foreground">The redirect URI is not allowed for this client.</p>
        </div>
      </div>
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    const inner = new URLSearchParams(params as Record<string, string>).toString()
    redirect(`/sign-in?redirect=${encodeURIComponent(`/oauth/authorize?${inner}`)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Grimoire</h1>
        </div>
        <ConsentScreen
          clientName={client.clientName}
          clientId={client_id}
          redirectUri={redirect_uri}
          codeChallenge={code_challenge}
          codeChallengeMethod={code_challenge_method ?? 'S256'}
          state={state}
          scope={scope}
          userName={session.user.name ?? session.user.email}
        />
      </div>
    </div>
  )
}
