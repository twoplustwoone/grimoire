'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CampaignPickerSheet } from '@/components/journals/campaign-picker-sheet'
import { X } from 'lucide-react'

type ShareRow = {
  id: string
  sharedEntityType:
    | 'JOURNAL'
    | 'NPC'
    | 'LOCATION'
    | 'FACTION'
    | 'THREAD'
    | 'CLUE'
    | 'PLAYER_CHARACTER'
    | 'CAPTURE'
  sharedEntityId: string | null
  label: string | null
}

interface Props {
  journalId: string
  linkedCampaign: { id: string; name: string } | null
  mirror: {
    journalPcId: string
    journalPcName: string
  } | null
}

export function SettingsClient({ journalId, linkedCampaign, mirror }: Props) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  async function handleUnlink() {
    setUnlinking(true)
    const res = await fetch(`/api/v1/journals/${journalId}/unlink`, {
      method: 'POST',
      credentials: 'include',
    })
    setUnlinking(false)
    setUnlinkOpen(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {linkedCampaign ? (
            <>
              <p className="text-sm">
                Linked to{' '}
                <Link href={`/campaigns/${linkedCampaign.id}`} className="font-medium hover:underline">
                  {linkedCampaign.name}
                </Link>
              </p>
              <Button variant="outline" size="sm" onClick={() => setUnlinkOpen(true)}>
                Unlink
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Not linked to a campaign.</p>
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                Link to a campaign
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {mirror && linkedCampaign && (
        <Card>
          <CardHeader>
            <CardTitle>Mirror</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Playing as{' '}
              <Link
                href={`/journals/${journalId}/player-characters/${mirror.journalPcId}`}
                className="font-medium hover:underline"
              >
                {mirror.journalPcName}
              </Link>{' '}
              in {linkedCampaign.name}.
            </p>
          </CardContent>
        </Card>
      )}

      <SharedWithGmCard journalId={journalId} hasLinkedCampaign={linkedCampaign !== null} />

      <CampaignPickerSheet
        journalId={journalId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />

      <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink this journal?</AlertDialogTitle>
            <AlertDialogDescription>
              Your journal content stays with you — notes, entities, and writing are untouched.
              Cross-references to campaign entities go stale and will re-hydrate if you re-link later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={unlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unlinking ? 'Unlinking...' : 'Unlink'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SHARE_SCOPE_LABEL(scope: ShareRow['sharedEntityType']): string {
  switch (scope) {
    case 'CAPTURE': return 'Capture'
    case 'PLAYER_CHARACTER': return 'Backstory'
    case 'NPC': return 'NPC'
    case 'LOCATION': return 'Location'
    case 'FACTION': return 'Faction'
    case 'THREAD': return 'Thread'
    case 'CLUE': return 'Clue'
    case 'JOURNAL': return 'Journal'
  }
}

function SharedWithGmCard({ journalId, hasLinkedCampaign }: { journalId: string; hasLinkedCampaign: boolean }) {
  const [shares, setShares] = useState<ShareRow[] | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!hasLinkedCampaign) return
    let cancelled = false
    fetch(`/api/v1/journals/${journalId}/shares`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: ShareRow[]) => {
        if (!cancelled) setShares(rows)
      })
    return () => {
      cancelled = true
    }
  }, [journalId, hasLinkedCampaign])

  const isJournalWide = (shares ?? []).some((s) => s.sharedEntityType === 'JOURNAL')
  const individuallyShared = (shares ?? []).filter((s) => s.sharedEntityType !== 'JOURNAL')
  const journalWideRow = (shares ?? []).find((s) => s.sharedEntityType === 'JOURNAL')

  async function toggleJournalWide() {
    if (pending || shares === null) return
    setPending(true)
    try {
      if (isJournalWide && journalWideRow) {
        const res = await fetch(`/api/v1/journals/${journalId}/shares/${journalWideRow.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (res.ok) {
          setShares(shares.filter((s) => s.id !== journalWideRow.id))
        }
      } else {
        const res = await fetch(`/api/v1/journals/${journalId}/shares`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sharedEntityType: 'JOURNAL' }),
        })
        if (res.ok) {
          const row = (await res.json()) as ShareRow
          setShares([{ ...row, label: null }, ...shares])
        }
      }
    } finally {
      setPending(false)
    }
  }

  async function unshare(id: string) {
    if (shares === null) return
    const prev = shares
    setShares(shares.filter((s) => s.id !== id))
    const res = await fetch(`/api/v1/journals/${journalId}/shares/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) setShares(prev)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared with GM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasLinkedCampaign ? (
          <p className="text-sm text-muted-foreground">
            Sharing becomes available when you link this journal to a campaign.
          </p>
        ) : shares === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Share this entire journal</p>
                <p className="text-xs text-muted-foreground">
                  {isJournalWide
                    ? 'Your GM can read everything in this journal: captures, backstory, entities, cross-references.'
                    : 'Your GM sees only items you specifically share.'}
                </p>
              </div>
              <Button
                size="sm"
                variant={isJournalWide ? 'default' : 'outline'}
                onClick={toggleJournalWide}
                disabled={pending}
              >
                {isJournalWide ? 'On' : 'Off'}
              </Button>
            </div>

            {!isJournalWide && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs text-muted-foreground">
                  {individuallyShared.length === 0
                    ? 'No individual items shared yet. Use the share toggle on captures, backstory, or NPCs.'
                    : `${individuallyShared.length} item${individuallyShared.length === 1 ? '' : 's'} shared individually.`}
                </p>
                {individuallyShared.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs uppercase text-muted-foreground tracking-wide">
                        {SHARE_SCOPE_LABEL(s.sharedEntityType)}
                      </span>{' '}
                      <span className="text-sm">{s.label ?? '—'}</span>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => unshare(s.id)}
                      aria-label="Unshare"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
