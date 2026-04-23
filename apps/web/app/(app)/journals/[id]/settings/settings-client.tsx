'use client'

import { useState } from 'react'
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
