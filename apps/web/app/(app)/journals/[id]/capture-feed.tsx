'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
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
import { docToPlainText, type ProseMirrorDoc } from '@grimoire/db/prosemirror'

export interface FeedCapture {
  id: string
  content: ProseMirrorDoc
  createdAt: string
  shareId: string | null
}

export interface FeedSession {
  id: string
  number: number
  title: string | null
  playedOn: string | null
  captures: FeedCapture[]
}

interface Props {
  journalId: string
  sessions: FeedSession[]
  isJournalWideShare: boolean
  hasLinkedCampaign: boolean
}

export function CaptureFeed({ journalId, sessions, isJournalWideShare, hasLinkedCampaign }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<FeedCapture | null>(null)
  const [deleting, setDeleting] = useState<FeedCapture | null>(null)
  const router = useRouter()

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
    <div className="space-y-6">
      {sessions.map((session) => {
        const first = session.captures[session.captures.length - 1]
        const label = session.title ?? `Session ${session.number}`
        const subtitle = session.playedOn
          ? new Date(session.playedOn).toLocaleDateString()
          : first
            ? `Started ${formatRelativeTime(new Date(first.createdAt))}`
            : null
        const totalWords = session.captures.reduce((acc, c) => {
          return acc + docToPlainText(c.content).split(/\s+/).filter(Boolean).length
        }, 0)

        return (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/journals/${journalId}/sessions/${session.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {label}
                </Link>
                {subtitle && (
                  <span className="text-sm text-muted-foreground">{subtitle}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {session.captures.length} capture{session.captures.length === 1 ? '' : 's'} · {totalWords} word{totalWords === 1 ? '' : 's'}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {session.captures.map((c) => {
                const isOpen = !!expanded[c.id]
                const preview = docToPlainText(c.content).slice(0, 200)
                return (
                  <div key={c.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(new Date(c.createdAt))}
                      </span>
                      {!isOpen && (
                        <span className="flex-1 text-sm text-muted-foreground line-clamp-2">
                          {preview}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-3">
                        <MentionRenderer content={c.content} />
                        <div className="flex gap-2 items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(c)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleting(c)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
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
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

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
