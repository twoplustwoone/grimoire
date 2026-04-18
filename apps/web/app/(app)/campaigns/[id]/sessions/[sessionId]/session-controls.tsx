'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Sparkles, StickyNote, Pencil, X } from 'lucide-react'
import { MentionInput } from '@/components/mentions/mention-input'
import { MentionRenderer } from '@/components/mentions/mention-renderer'

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
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [gmSummary, setGmSummary] = useState(initialGmSummary)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingSummary, setSavingSummary] = useState(false)
  const [generatingRecap, setGeneratingRecap] = useState(false)
  const [recapError, setRecapError] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(initialAiSummary ?? null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  function startEditNote(id: string, content: string) {
    setEditingNoteId(id)
    setEditingContent(content)
  }

  async function saveNoteEdit(noteId: string) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/notes/${noteId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editingContent }),
      }
    )
    if (res.ok) {
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, content: editingContent } : n)))
      setEditingNoteId(null)
    }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/notes/${noteId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )
    if (res.ok) {
      setNotes(notes.filter((n) => n.id !== noteId))
    }
  }

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
    router.refresh()
    setTimeout(() => router.replace(window.location.pathname), 100)
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
    setRecapError(null)
    try {
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
      } else {
        const data = await res.json().catch(() => ({}))
        setRecapError(data.error ?? 'Failed to generate recap. Check that your Anthropic API key is configured.')
      }
    } catch {
      setRecapError('Network error. Please try again.')
    } finally {
      setGeneratingRecap(false)
    }
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
                <div key={note.id} className="text-sm border-l-2 pl-3 py-1 group">
                  {editingNoteId === note.id ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveNoteEdit(note.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p><MentionRenderer content={note.content} campaignId={campaignId} /></p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString()}{' '}
                          {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button
                            onClick={() => startEditNote(note.id, note.content)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <MentionInput
              value={newNote}
              onChange={setNewNote}
              placeholder="Quick note... (type @ to mention an entity)"
              rows={2}
              className="flex-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
            <MentionInput
              value={gmSummary}
              onChange={setGmSummary}
              placeholder="What happened this session... (type @ to mention an entity)"
              rows={4}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
              {recapError && <p className="text-sm text-destructive mt-2">{recapError}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Generate an AI recap from your session notes and tagged entities.
              </p>
              <Button onClick={generateRecap} disabled={generatingRecap} size="sm">
                {generatingRecap ? 'Generating...' : 'Generate Recap'}
              </Button>
              {recapError && <p className="text-sm text-destructive mt-2">{recapError}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
