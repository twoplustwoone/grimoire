'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { MentionRenderer } from '@/components/mentions/mention-renderer'
import { CaptureEditorSheet } from '@/components/captures/capture-editor-sheet'
import { ShareToggle } from '@/components/journals/share-toggle'
import { formatRelativeTime } from '@/lib/activity-feed'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'

export interface DetailCapture {
  id: string
  content: ProseMirrorDoc
  createdAt: string
  shareId: string | null
}

interface Props {
  journalId: string
  sessionId: string
  sessionLabel: string
  captures: DetailCapture[]
  isJournalWideShare: boolean
  hasLinkedCampaign: boolean
}

export function SessionCaptures({
  journalId,
  sessionId,
  sessionLabel,
  captures,
  isJournalWideShare,
  hasLinkedCampaign,
}: Props) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<DetailCapture | null>(null)
  const [deleting, setDeleting] = useState<DetailCapture | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    const res = await fetch(`/api/v1/journals/${journalId}/captures/${deleting.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setDeleting(null)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      {captures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">No captures in this session yet.</p>
          </CardContent>
        </Card>
      ) : (
        captures.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 pt-6">
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(new Date(c.createdAt))}
              </p>
              <MentionRenderer content={c.content} journalId={journalId} />
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleting(c)}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
                <ShareToggle
                  journalId={journalId}
                  scope="CAPTURE"
                  entityId={c.id}
                  initialShareId={c.shareId}
                  isJournalWideShare={isJournalWideShare}
                  hasLinkedCampaign={hasLinkedCampaign}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <div className="flex justify-center">
        <Button onClick={() => setAddOpen(true)} variant="outline">
          <Plus className="h-4 w-4" />
          Add capture
        </Button>
      </div>

      <CaptureEditorSheet
        journalId={journalId}
        journalSessionId={sessionId}
        sessionLabel={sessionLabel}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <CaptureEditorSheet
        journalId={journalId}
        captureId={editing?.id}
        initialContent={editing?.content ?? null}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this capture?</AlertDialogTitle>
            <AlertDialogDescription>
              The capture will be removed from your journal. You can contact support to restore it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
