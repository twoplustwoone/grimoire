'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Check, X } from 'lucide-react'

interface Props {
  clientName: string
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  state?: string
  scope?: string
  userName: string
}

export function ConsentScreen({
  clientName, clientId, redirectUri, codeChallenge,
  codeChallengeMethod, state, scope, userName,
}: Props) {
  const [loading, setLoading] = useState<'allow' | 'deny' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDecision(allow: boolean) {
    setLoading(allow ? 'allow' : 'deny')
    setError(null)

    if (!allow) {
      const url = new URL(redirectUri)
      url.searchParams.set('error', 'access_denied')
      if (state) url.searchParams.set('state', state)
      window.location.href = url.toString()
      return
    }

    const res = await fetch('/oauth/authorize/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scope,
      }),
    })

    if (!res.ok) {
      setError('Failed to authorize')
      setLoading(null)
      return
    }

    const { code } = await res.json()
    const url = new URL(redirectUri)
    url.searchParams.set('code', code)
    if (state) url.searchParams.set('state', state)
    window.location.href = url.toString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Authorize {clientName}</CardTitle>
            <CardDescription>Signed in as {userName}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <p className="font-medium">{clientName} is requesting access to your Grimoire account.</p>
          <p className="text-muted-foreground">It will be able to:</p>
          <ul className="space-y-1 text-muted-foreground pl-4">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              View your campaigns and their entities
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Read NPCs, locations, factions, threads, and clues
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Read session notes and AI recaps
            </li>
            <li className="flex items-start gap-2">
              <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              It cannot modify or delete anything
            </li>
          </ul>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleDecision(false)}
            disabled={loading !== null}
          >
            Deny
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleDecision(true)}
            disabled={loading !== null}
          >
            {loading === 'allow' ? 'Authorizing...' : 'Allow'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
