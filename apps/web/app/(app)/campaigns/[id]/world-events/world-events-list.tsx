'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Plus, Globe, Calendar, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react'
import Link from 'next/link'
import { displaySessionTitle } from '@/lib/session-display'

interface WorldEvent {
  id: string
  title: string
  description: string | null
  createdAt: Date
  session: { id: string; title: string | null; createdAt: Date | string } | null
  inWorldDate: { id: string; label: string; sortOrder: number } | null
}

interface Session {
  id: string
  title: string | null
  createdAt: Date | string
}

interface Props {
  campaignId: string
  initialEvents: WorldEvent[]
  sessions: Session[]
}

export function WorldEventsList({ campaignId, initialEvents, sessions }: Props) {
  const router = useRouter()
  const [events, setEvents] = useState<WorldEvent[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/world-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        sessionId: sessionId || null,
      }),
    })

    if (res.ok) {
      const event = await res.json()
      setEvents([...events, event])
      setTitle('')
      setDescription('')
      setSessionId('')
      setShowForm(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleEdit(eventId: string) {
    const res = await fetch(`/api/v1/campaigns/${campaignId}/world-events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setEvents(events.map(e => e.id === eventId ? updated : e))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDelete(eventId: string) {
    const res = await fetch(`/api/v1/campaigns/${campaignId}/world-events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (res.ok) {
      setEvents(events.filter(e => e.id !== eventId))
      router.refresh()
    }
  }

  function startEdit(event: WorldEvent) {
    setEditingId(event.id)
    setEditTitle(event.title)
    setEditDescription(event.description ?? '')
  }

  const betweenSession = events.filter(e => !e.session)
  const bySession = sessions.map(s => ({
    session: s,
    events: events.filter(e => e.session?.id === s.id),
  })).filter(g => g.events.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? (
            <><X className="h-4 w-4" />Cancel</>
          ) : (
            <><Plus className="h-4 w-4" />Log Event</>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log a World Event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">What happened?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Xanathar Guild raided a Zhentarim safe house"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Details (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, consequences, or notes..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session">Linked session (optional)</Label>
                <select
                  id="session"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  <option value="">Between sessions</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {displaySessionTitle(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving || !title.trim()}>
                  {saving ? 'Saving...' : 'Log Event'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {events.length === 0 && !showForm && (
        <Card className="text-center py-16">
          <CardContent>
            <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No world events logged yet.</p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              Track things happening in your world — faction moves, disasters, political changes — whether they happen during a session or between them.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Log First Event
            </Button>
          </CardContent>
        </Card>
      )}

      {betweenSession.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Between Sessions
          </h2>
          <div className="space-y-3">
            {betweenSession.map(event => (
              <EventCard
                key={event.id}
                event={event}
                editingId={editingId}
                editTitle={editTitle}
                editDescription={editDescription}
                onEditTitle={setEditTitle}
                onEditDescription={setEditDescription}
                onStartEdit={startEdit}
                onSaveEdit={handleEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {bySession.map(({ session, events: sessionEvents }) => (
        <div key={session.id}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Link href={`/campaigns/${campaignId}/sessions/${session.id}`} className="hover:underline">
              {displaySessionTitle(session)}
            </Link>
          </h2>
          <div className="space-y-3">
            {sessionEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                editingId={editingId}
                editTitle={editTitle}
                editDescription={editDescription}
                onEditTitle={setEditTitle}
                onEditDescription={setEditDescription}
                onStartEdit={startEdit}
                onSaveEdit={handleEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EventCard({
  event,
  editingId,
  editTitle,
  editDescription,
  onEditTitle,
  onEditDescription,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  event: WorldEvent
  editingId: string | null
  editTitle: string
  editDescription: string
  onEditTitle: (v: string) => void
  onEditDescription: (v: string) => void
  onStartEdit: (e: WorldEvent) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
}) {
  const isEditing = editingId === event.id

  return (
    <Card className="group">
      <CardContent className="py-4">
        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={editTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              value={editDescription}
              onChange={(e) => onEditDescription(e.target.value)}
              rows={3}
              placeholder="Details..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSaveEdit(event.id)}>
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{event.title}</p>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-2">
                {new Date(event.createdAt).toLocaleDateString()}
              </p>
            </div>
            <EventActions event={event} onStartEdit={onStartEdit} onDelete={onDelete} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EventActions({
  event,
  onStartEdit,
  onDelete,
}: {
  event: WorldEvent
  onStartEdit: (event: WorldEvent) => void
  onDelete: (id: string) => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          aria-label="Event actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => onStartEdit(event)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this world event?</AlertDialogTitle>
            <AlertDialogDescription>
              This world event will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(event.id)
                setDeleteDialogOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
