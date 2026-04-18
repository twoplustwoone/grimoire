'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StickyNote, Plus } from 'lucide-react'

interface Note {
  id: string
  content: string
  createdAt: Date
}

interface Props {
  notes: Note[]
  addNoteEndpoint: string
}

export function EntityNotes({ notes: initialNotes, addNoteEndpoint }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function addNote() {
    if (!content.trim()) return
    setSaving(true)
    const res = await fetch(addNoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: content.trim() }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes([note, ...notes])
      setContent('')
      router.refresh()
    }
    setSaving(false)
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
              <div key={note.id} className="text-sm border-l-2 pl-3 py-1">
                <p>{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(note.createdAt).toLocaleDateString()}{' '}
                  {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">No notes yet.</p>
        )}
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote()
            }}
          />
          <Button
            onClick={addNote}
            disabled={saving || !content.trim()}
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
