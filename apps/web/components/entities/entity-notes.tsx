'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StickyNote, Plus } from 'lucide-react'
import { MentionInput } from '@/components/mentions/mention-input'
import { PromotableNote } from '@/components/entities/promotable-note'
import { emptyDoc, type ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Note {
  id: string
  // Prisma's JsonValue type is wider than ProseMirrorDoc (includes null,
  // arrays, primitives). Keep the boundary loose here and let the editor /
  // renderer narrow it.
  content: unknown
  createdAt: Date
}

interface Props {
  notes: Note[]
  addNoteEndpoint: string
  campaignId: string
  entityType: string
  entityId: string
}

export function EntityNotes({ notes: initialNotes, addNoteEndpoint, campaignId }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [content, setContent] = useState<ProseMirrorDoc>(emptyDoc())
  const [saving, setSaving] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<ProseMirrorDoc>(emptyDoc())

  const noteEndpointFor = (noteId: string) =>
    addNoteEndpoint.replace(/\/notes$/, '') + `/notes/${noteId}`

  async function addNote() {
    setSaving(true)
    const res = await fetch(addNoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes([note, ...notes])
      setContent(emptyDoc())
      router.refresh()
    }
    setSaving(false)
  }

  async function saveNoteEdit(noteId: string) {
    const res = await fetch(noteEndpointFor(noteId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: editingContent }),
    })
    if (res.ok) {
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: editingContent } : n))
      setEditingNoteId(null)
      router.refresh()
    }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(noteEndpointFor(noteId), {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.ok) {
      setNotes(notes.filter(n => n.id !== noteId))
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length > 0 && (
          <div className="space-y-3 mb-4">
            {notes.map((note) => (
              <PromotableNote
                key={note.id}
                note={note}
                campaignId={campaignId}
                editingNoteId={editingNoteId}
                editingContent={editingContent}
                onStartEdit={(id, noteContent) => {
                  setEditingNoteId(id)
                  setEditingContent(noteContent)
                }}
                onSaveEdit={saveNoteEdit}
                onCancelEdit={() => setEditingNoteId(null)}
                onEditContentChange={setEditingContent}
                onDelete={deleteNote}
                onPromote={() => router.refresh()}
                promoteEndpoint={`/api/v1/campaigns/${campaignId}/notes/${note.id}/promote`}
              />
            ))}
          </div>
        )}
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">No notes yet.</p>
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder="Add a note... (type @ to mention an entity)"
              rows={2}
              onSave={addNote}
            />
          </div>
          <Button
            onClick={addNote}
            disabled={saving}
            size="sm"
            className="self-end"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Cmd/Ctrl+Enter to save</p>
      </CardContent>
    </Card>
  )
}
