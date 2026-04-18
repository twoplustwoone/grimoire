'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

interface Props {
  token: string
  invite: {
    email: string
    campaign: { name: string; description: string | null }
    expiresAt: string
  }
  isSignedIn: boolean
  currentUserEmail: string | null
}

export function InviteAcceptForm({ token, invite, isSignedIn, currentUserEmail }: Props) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailMismatch = isSignedIn && currentUserEmail?.toLowerCase() !== invite.email.toLowerCase()

  async function handleAccept() {
    setAccepting(true)
    setError(null)

    const res = await fetch(`/api/v1/invites/${token}/accept`, {
      method: 'POST',
      credentials: 'include',
    })

    const data = await res.json()
    if (res.ok) {
      router.push(`/campaigns/${data.campaignId}`)
    } else {
      setError(data.error ?? 'Failed to accept invite')
      setAccepting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{invite.campaign.name}</CardTitle>
            <CardDescription>Campaign invite</CardDescription>
          </div>
        </div>
        {invite.campaign.description && (
          <p className="text-sm text-muted-foreground">{invite.campaign.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Invited as: <span className="font-medium text-foreground">{invite.email}</span>
        </div>

        {emailMismatch && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            You are signed in as <strong>{currentUserEmail}</strong> but this invite was sent to <strong>{invite.email}</strong>. Please sign in with the correct account.
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!isSignedIn ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You need an account to join this campaign.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => router.push(`/sign-up?invite=${token}&email=${encodeURIComponent(invite.email)}`)}
              >
                Create account
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/sign-in?invite=${token}`)}
              >
                Sign in
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={accepting || emailMismatch}
          >
            {accepting ? 'Joining...' : `Join ${invite.campaign.name}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
