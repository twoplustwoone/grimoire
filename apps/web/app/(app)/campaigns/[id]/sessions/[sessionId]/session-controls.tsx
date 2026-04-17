'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, StickyNote } from 'lucide-react'

interface Note {
  id: string
  content: string
  createdAt: Date
}

interface Props {
  campaignId: string
  sessionId: string
  initialStatus: string
  initialGmSummary: string
  initialNotes: Note[]
}

export function SessionControls({
  campaignId,
  sessionId,
  initialStatus,
  initialGmSummary,
  initialNotes,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [gmSummary, setGmSummary] = useState(initialGmSummary)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/campaigns/${campaignId}/sessions/${sessionId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newNote.trim() }),
      }
    )

    if (res.ok) {
      const note = await res.json()
      setNotes([...notes, note])
      setNewNote('')
    }
    setSavingNote(false)
  }

  async function saveSummary() {
    setSavingSummary(true)
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/campaigns/${campaignId}/sessions/${sessionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gmSummary }),
      }
    )
    setSavingSummary(false)
  }

  async function markCompleted() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/campaigns/${campaignId}/sessions/${sessionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETED' }),
      }
    )
    if (res.ok) setStatus('COMPLETED')
  }

  return (
    <div className="space-y-4 mb-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Session Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length > 0 && (
            <div className="space-y-2 mb-4">
              {notes.map((note) => (
                <div key={note.id} className="text-sm border-l-2 pl-3 py-1">
                  <p>{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Quick note during play..."
              rows={2}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote()
              }}
            />
            <Button onClick={addNote} disabled={savingNote || !newNote.trim()} size="sm" className="self-end">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Cmd/Ctrl+Enter to save</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GM Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              value={gmSummary}
              onChange={(e) => setGmSummary(e.target.value)}
              placeholder="What happened this session..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={saveSummary} disabled={savingSummary} size="sm">
                {savingSummary ? 'Saving...' : 'Save Summary'}
              </Button>
              {status === 'PLANNED' && (
                <Button onClick={markCompleted} variant="outline" size="sm">
                  Mark Completed
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
