'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { MentionRenderer } from '@/components/mentions/mention-renderer'
import { ArrowUpCircle, Check, X, Pencil, Trash2 } from 'lucide-react'

interface Note {
  id: string
  content: string
  createdAt: Date
}

interface Props {
  note: Note
  campaignId: string
  editingNoteId?: string | null
  editingContent?: string
  onStartEdit?: (id: string, content: string) => void
  onSaveEdit?: (id: string) => void
  onCancelEdit?: () => void
  onEditContentChange?: (content: string) => void
  onDelete?: (noteId: string) => void
  onPromote?: (noteId: string) => void
  promoteEndpoint: string
}

export function PromotableNote({
  note,
  campaignId,
  editingNoteId,
  editingContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditContentChange,
  onDelete,
  onPromote,
  promoteEndpoint,
}: Props) {
  const router = useRouter()
  const [showPromoteForm, setShowPromoteForm] = useState(false)
  const [promoteTitle, setPromoteTitle] = useState('')
  const [deleteNote, setDeleteNote] = useState(true)
  const [promoting, setPromoting] = useState(false)

  const isEditing = editingNoteId === note.id

  async function handlePromote() {
    setPromoting(true)
    const res = await fetch(promoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: promoteTitle.trim() || note.content.slice(0, 60),
        deleteNote,
      }),
    })

    if (res.ok) {
      if (deleteNote) {
        onDelete?.(note.id)
      } else {
        onPromote?.(note.id)
      }
      setShowPromoteForm(false)
      router.refresh()
    }
    setPromoting(false)
  }

  if (isEditing) {
    return (
      <div className="text-sm border-l-2 pl-3 py-1 space-y-2">
        <textarea
          value={editingContent}
          onChange={(e) => onEditContentChange?.(e.target.value)}
          rows={2}
          autoFocus
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSaveEdit?.(note.id)}>
            <Check className="h-3 w-3 mr-1" />Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancelEdit}>
            <X className="h-3 w-3 mr-1" />Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm border-l-2 pl-3 py-1 group">
      <MentionRenderer content={note.content} campaignId={campaignId} />

      {showPromoteForm && (
        <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-3 border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Promote to Information Node
          </p>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input
              value={promoteTitle}
              onChange={(e) => setPromoteTitle(e.target.value)}
              placeholder={note.content.slice(0, 60)}
              autoFocus
              className="h-8 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={deleteNote}
              onChange={(e) => setDeleteNote(e.target.checked)}
              className="rounded"
            />
            Delete original note after promoting
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handlePromote}
              disabled={promoting}
            >
              <ArrowUpCircle className="h-3 w-3 mr-1" />
              {promoting ? 'Promoting...' : 'Promote'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPromoteForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">
          {new Date(note.createdAt).toLocaleDateString()}{' '}
          {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {!showPromoteForm && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
            <button
              onClick={() => setShowPromoteForm(true)}
              className="text-muted-foreground hover:text-primary transition-colors p-0.5"
              title="Promote to information node"
              aria-label="Promote to information node"
            >
              <ArrowUpCircle className="h-3 w-3" />
            </button>
            <button
              onClick={() => onStartEdit?.(note.id, note.content)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              aria-label="Edit note"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete note?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This note will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete?.(note.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  )
}
