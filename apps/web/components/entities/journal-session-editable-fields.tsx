'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  sessionId: string
  number: number
  title: string | null
  playedOn: string | null
}

export function JournalSessionEditableFields({
  journalId,
  sessionId,
  number,
  title,
  playedOn,
}: Props) {
  const router = useRouter()

  async function save(payload: Record<string, unknown>) {
    await fetch(`/api/v1/journals/${journalId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    router.refresh()
  }

  const playedOnDraft = playedOn ? playedOn.slice(0, 10) : null

  return (
    <>
      <p className="text-sm text-muted-foreground mb-1">Session {number}</p>
      <h1 className="text-3xl font-bold">
        <EditableField
          value={title ?? null}
          onSave={(v) => save({ title: v })}
          placeholder="Session title"
          emptyText="Untitled session — click to name it"
        />
      </h1>
      <div className="text-muted-foreground mt-2">
        <EditableField
          value={playedOnDraft ?? null}
          onSave={(v) => save({ playedOn: v || null })}
          type="date"
          emptyText="No date — click to set"
        />
      </div>
    </>
  )
}
