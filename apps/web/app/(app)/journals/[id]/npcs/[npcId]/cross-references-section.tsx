'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { CrossReferenceDialog } from '@/components/journals/cross-reference-dialog'

interface LinkRow {
  id: string
  campaignEntityType: string
  campaignEntityId: string
  campaignEntityName: string | null
}

interface Props {
  journalId: string
  linkedCampaignId: string
  npcId: string
  links: LinkRow[]
}

export function CrossReferencesSection({
  journalId,
  linkedCampaignId,
  npcId,
  links,
}: Props) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function remove(linkId: string) {
    setRemoving(linkId)
    const res = await fetch(`/api/v1/journals/${journalId}/links/${linkId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setRemoving(null)
    if (res.ok) router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-lg">Cross-references</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add cross-reference
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cross-references yet.
          </p>
        ) : (
          links.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded border p-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/campaigns/${linkedCampaignId}/npcs/${l.campaignEntityId}`}
                  className="text-sm hover:underline"
                >
                  {l.campaignEntityName ?? '(missing entity)'}
                </Link>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {l.campaignEntityType.toLowerCase()}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(l.id)}
                disabled={removing === l.id}
                className="text-destructive hover:bg-destructive/10"
                aria-label="Remove cross-reference"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <CrossReferenceDialog
        journalId={journalId}
        linkedCampaignId={linkedCampaignId}
        journalEntityType="NPC"
        journalEntityId={npcId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </Card>
  )
}
