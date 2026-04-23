'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookOpen } from 'lucide-react'
import { LinkJournalSheet, type AvailablePc } from '@/components/journals/link-journal-sheet'

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

interface FreestandingJournal {
  id: string
  name: string
  updatedAt: string
}

type Phase = 'idle' | 'pick_journal' | 'linking'

export function InviteAcceptForm({ token, invite, isSignedIn, currentUserEmail }: Props) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [journals, setJournals] = useState<FreestandingJournal[]>([])
  const [chosenJournalId, setChosenJournalId] = useState<string | null>(null)
  const [newJournalName, setNewJournalName] = useState('')
  const [creating, setCreating] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [claimedPcId, setClaimedPcId] = useState<string | null>(null)
  const [availablePcs, setAvailablePcs] = useState<AvailablePc[]>([])

  const emailMismatch = isSignedIn && currentUserEmail?.toLowerCase() !== invite.email.toLowerCase()

  useEffect(() => {
    if (phase !== 'pick_journal') return
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/v1/journals', { credentials: 'include' })
      if (cancelled) return
      if (!res.ok) {
        setError('Failed to load your journals')
        return
      }
      const all = (await res.json()) as Array<{
        id: string
        name: string
        linkedCampaignId: string | null
        updatedAt: string
      }>
      setJournals(all.filter((j) => j.linkedCampaignId === null))
    })()
    return () => {
      cancelled = true
    }
  }, [phase])

  async function handleAccept() {
    setAccepting(true)
    setError(null)

    const res = await fetch(`/api/v1/invites/${token}/accept`, {
      method: 'POST',
      credentials: 'include',
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to accept invite')
      setAccepting(false)
      return
    }

    if (data.autoCreatedJournalId) {
      router.push(`/journals/${data.autoCreatedJournalId}?welcome=1`)
      return
    }

    if (data.requiresLinkingSheet && data.pcId) {
      setCampaignId(data.campaignId)
      setClaimedPcId(data.pcId)

      // Fetch the claimed PC's details so the ceremony sheet can show
      // the backstory-seed prompt if the GM already drafted one.
      const pcRes = await fetch(
        `/api/v1/campaigns/${data.campaignId}/player-characters`,
        { credentials: 'include' }
      )
      if (pcRes.ok) {
        const pcs = (await pcRes.json()) as Array<{
          id: string
          name: string
          description: string | null
        }>
        const pc = pcs.find((p) => p.id === data.pcId)
        if (pc) setAvailablePcs([{ id: pc.id, name: pc.name, description: pc.description }])
      }
      setPhase('pick_journal')
      setAccepting(false)
      return
    }

    router.push(`/campaigns/${data.campaignId}`)
  }

  async function chooseExistingJournal(id: string) {
    setChosenJournalId(id)
    setPhase('linking')
  }

  async function createAndLinkNew() {
    if (!newJournalName.trim()) {
      setError('Journal name is required')
      return
    }
    setCreating(true)
    setError(null)
    const res = await fetch('/api/v1/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newJournalName.trim() }),
    })
    setCreating(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create journal')
      return
    }
    const journal = await res.json()
    setChosenJournalId(journal.id)
    setPhase('linking')
  }

  function onLinked(journalId: string) {
    router.push(`/journals/${journalId}`)
  }

  return (
    <>
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
          ) : phase === 'idle' ? (
            <Button
              className={`w-full ${emailMismatch ? 'opacity-50' : ''}`}
              onClick={handleAccept}
              disabled={accepting || emailMismatch}
            >
              {accepting ? 'Joining...' : `Join ${invite.campaign.name}`}
            </Button>
          ) : phase === 'pick_journal' ? (
            <div className="space-y-3">
              <p className="text-sm">
                You&apos;re in. Pick a journal to link to this campaign, or start a new one.
              </p>
              <div className="space-y-2">
                {journals.map((j) => (
                  <Button
                    key={j.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => chooseExistingJournal(j.id)}
                  >
                    {j.name}
                  </Button>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="newJournalName">Or start a new journal</Label>
                <Input
                  id="newJournalName"
                  value={newJournalName}
                  onChange={(e) => setNewJournalName(e.target.value)}
                  placeholder="My character's journal"
                />
                <Button onClick={createAndLinkNew} disabled={creating}>
                  {creating ? 'Creating...' : 'Create + link'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {campaignId && chosenJournalId && (
        <LinkJournalSheet
          journalId={chosenJournalId}
          campaignId={campaignId}
          campaignName={invite.campaign.name}
          availablePcs={availablePcs}
          preselectedPcId={claimedPcId}
          open={phase === 'linking'}
          onOpenChange={(next) => {
            if (!next) setPhase('pick_journal')
          }}
          onLinked={onLinked}
        />
      )}
    </>
  )
}
