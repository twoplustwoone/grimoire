'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Archive } from 'lucide-react'

interface Props {
  campaignId: string
  campaignName: string
}

export function ArchiveCampaignButton({ campaignId, campaignName }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleArchive() {
    setPending(true)
    const res = await fetch(`/api/v1/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
    if (res.ok) {
      router.push('/campaigns')
    } else {
      setPending(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground border-muted-foreground/30">
          <Archive className="h-4 w-4" />
          Archive campaign
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {campaignName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Archiving hides this campaign from your main list. All data stays intact — you can still access it under &quot;Show archived&quot; on /campaigns, and unarchive it from the settings page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={pending}>
            {pending ? 'Archiving...' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
