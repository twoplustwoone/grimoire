'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Sparkles, StickyNote } from 'lucide-react'

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
  initialAiSummary?: string | null
}

export function SessionControls({
  campaignId,
  sessionId,
  initialStatus,
  initialGmSummary,
  initialNotes,
  initialAiSummary,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [gmSummary, setGmSummary] = useState(initialGmSummary)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)
  const [generatingRecap, setGeneratingRecap] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(initialAiSummary ?? null)

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)

    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/notes`,
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
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}`,
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
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'COMPLETED' }),
      }
    )
    if (res.ok) setStatus('COMPLETED')
  }

  async function generateRecap() {
    setGeneratingRecap(true)
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/recap`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )
    if (res.ok) {
      const data = await res.json()
      setAiSummary(data.aiSummary)
    }
    setGeneratingRecap(false)
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="space-y-3">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{aiSummary}</p>
              <Button onClick={generateRecap} disabled={generatingRecap} variant="outline" size="sm">
                {generatingRecap ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Generate an AI recap from your session notes and tagged entities.
              </p>
              <Button onClick={generateRecap} disabled={generatingRecap} size="sm">
                {generatingRecap ? 'Generating...' : 'Generate Recap'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
