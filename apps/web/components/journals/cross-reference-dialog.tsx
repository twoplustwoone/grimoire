'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LinkableType = 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE'

const LIST_PATHS: Record<LinkableType, string> = {
  NPC: 'npcs',
  LOCATION: 'locations',
  FACTION: 'factions',
  THREAD: 'threads',
  CLUE: 'clues',
}

interface Props {
  journalId: string
  linkedCampaignId: string
  journalEntityType: LinkableType
  journalEntityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CrossReferenceDialog(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {props.open && <Body {...props} />}
      </SheetContent>
    </Sheet>
  )
}

interface CampaignEntityRow {
  id: string
  name: string
  title?: string
}

function Body({
  journalId,
  linkedCampaignId,
  journalEntityType,
  journalEntityId,
  onOpenChange,
}: Props) {
  const router = useRouter()
  const [entities, setEntities] = useState<CampaignEntityRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const path = LIST_PATHS[journalEntityType]
      const res = await fetch(`/api/v1/campaigns/${linkedCampaignId}/${path}`, {
        credentials: 'include',
      })
      if (cancelled) return
      if (!res.ok) {
        setError('Failed to load campaign entities')
        setLoading(false)
        return
      }
      const rows = (await res.json()) as Array<Record<string, unknown>>
      const normalised: CampaignEntityRow[] = rows.map((r) => ({
        id: String(r.id),
        name: String(r.name ?? r.title ?? ''),
      }))
      setEntities(normalised)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [linkedCampaignId, journalEntityType])

  const filtered = (entities ?? []).filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  async function submit() {
    if (!selectedId) {
      setError('Pick a campaign entity to link.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/v1/journals/${journalId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        journalEntityType,
        journalEntityId,
        campaignEntityType: journalEntityType,
        campaignEntityId: selectedId,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create link')
      return
    }
    router.refresh()
    onOpenChange(false)
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Add cross-reference</SheetTitle>
        <SheetDescription>
          Link this journal entity to one of your campaign&apos;s matching entities.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="space-y-2">
          <Label htmlFor="xref-search">Search</Label>
          <Input
            id="xref-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name..."
            autoFocus
          />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-1">
          {filtered.map((e) => (
            <Button
              key={e.id}
              variant={selectedId === e.id ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setSelectedId(e.id)}
            >
              {e.name}
            </Button>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No matches.
            </p>
          )}
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !selectedId}>
          {saving ? 'Linking...' : 'Link'}
        </Button>
      </SheetFooter>
    </>
  )
}
