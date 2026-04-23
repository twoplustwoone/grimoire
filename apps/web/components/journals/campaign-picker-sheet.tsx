'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { LinkJournalSheet, type AvailablePc } from './link-journal-sheet'

interface Props {
  journalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CampaignRow {
  id: string
  name: string
  role: string
}

export function CampaignPickerSheet(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {props.open && <Body {...props} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ journalId, onOpenChange }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CampaignRow | null>(null)
  const [availablePcs, setAvailablePcs] = useState<AvailablePc[]>([])
  const [linkOpen, setLinkOpen] = useState(false)

  // Fetch once on mount. `Body` only mounts when the parent Sheet is
  // open, so this runs exactly on open.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/v1/campaigns', { credentials: 'include' })
      if (cancelled) return
      if (!res.ok) {
        setError('Failed to load campaigns')
        setLoading(false)
        return
      }
      const rows: CampaignRow[] = await res.json()
      setCampaigns(rows.filter((r) => r.role !== 'GM'))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function pick(c: CampaignRow) {
    setSelected(c)
    const res = await fetch(`/api/v1/campaigns/${c.id}/player-characters`, {
      credentials: 'include',
    })
    if (!res.ok) {
      setError('Failed to load characters for that campaign')
      return
    }
    const pcs = await res.json()
    // Only PCs the current user owns, and that aren't already mirrored.
    const eligible: AvailablePc[] = pcs
      .filter(
        (p: { linkedUserId?: string | null; campaignMirror?: unknown | null; linkedUserIsMe?: boolean }) =>
          // we don't know `me` here client-side; the server-side link
          // route re-validates ownership. Present every claimed PC and
          // let the server reject any that aren't ours.
          p.linkedUserId
      )
      .map((p: { id: string; name: string; description: string | null }) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      }))
    setAvailablePcs(eligible)
    setLinkOpen(true)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Pick a campaign</SheetTitle>
        <SheetDescription>
          Choose which campaign this journal should link to.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading campaigns...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {campaigns?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You&apos;re not a player in any campaign yet. Ask your GM for an invite.
          </p>
        )}
        {campaigns?.map((c) => (
          <Button
            key={c.id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => pick(c)}
          >
            {c.name}
            <span className="ml-auto text-xs text-muted-foreground">{c.role}</span>
          </Button>
        ))}
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      </SheetFooter>

      {selected && (
        <LinkJournalSheet
          journalId={journalId}
          campaignId={selected.id}
          campaignName={selected.name}
          availablePcs={availablePcs}
          open={linkOpen}
          onOpenChange={(next) => {
            setLinkOpen(next)
            if (!next) onOpenChange(false)
          }}
        />
      )}
    </>
  )
}
