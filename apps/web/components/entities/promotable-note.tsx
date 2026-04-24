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
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { MentionRenderer } from '@/components/mentions/mention-renderer'
import { MentionInput } from '@/components/mentions/mention-input'
import { ArrowUpCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  docToPlainText,
  emptyDoc,
  type ProseMirrorDoc,
} from '@grimoire/db/prosemirror'

interface Note {
  id: string
  content: unknown
  createdAt: Date
}

interface Props {
  note: Note
  campaignId: string
  editingNoteId?: string | null
  editingContent?: ProseMirrorDoc
  onStartEdit?: (id: string, content: ProseMirrorDoc) => void
  onSaveEdit?: (id: string) => void
  onCancelEdit?: () => void
  onEditContentChange?: (content: ProseMirrorDoc) => void
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isEditing = editingNoteId === note.id
  const contentDoc = note.content as ProseMirrorDoc
  const plaintext = docToPlainText(note.content)

  async function handlePromote() {
    setPromoting(true)
    const res = await fetch(promoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: promoteTitle.trim() || plaintext.slice(0, 60),
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

  return (
    <div className="text-sm border-l-2 pl-3 py-1">
      <MentionRenderer content={contentDoc} campaignId={campaignId} />

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
              placeholder={plaintext.slice(0, 60)}
              autoFocus
              className="h-9 text-sm"
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
            <Button size="sm" onClick={handlePromote} disabled={promoting}>
              <ArrowUpCircle className="h-3 w-3" />
              {promoting ? 'Promoting...' : 'Promote'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPromoteForm(false)}>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Note actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onStartEdit?.(note.id, contentDoc)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowPromoteForm(true)}>
                <ArrowUpCircle className="h-4 w-4" />
                Promote to info node
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Sheet open={isEditing} onOpenChange={(o) => !o && onCancelEdit?.()}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Edit note</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MentionInput
              value={editingContent ?? emptyDoc()}
              onChange={(v) => onEditContentChange?.(v)}
              rows={6}
              placeholder="Edit note... (type @ to mention an entity)"
              onSave={() => onSaveEdit?.(note.id)}
            />
            <p className="text-xs text-muted-foreground mt-2">Cmd/Ctrl+Enter to save</p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="h-11 md:h-9">Cancel</Button>
            </SheetClose>
            <Button onClick={() => onSaveEdit?.(note.id)} className="h-11 md:h-9">
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={() => {
                onDelete?.(note.id)
                setDeleteDialogOpen(false)
              }}
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
