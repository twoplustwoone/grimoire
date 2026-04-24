'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { displaySessionTitle } from '@/lib/session-display'

interface Props {
  journalId: string
  sessionId: string
  title: string | null
  createdAt: string
  playedOn: string | null
}

export function JournalSessionEditableFields({
  journalId,
  sessionId,
  title,
  createdAt,
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
  const placeholder = displaySessionTitle({ title: null, createdAt })

  return (
    <>
      <h1 className="text-3xl font-bold">
        <EditableField
          value={title ?? null}
          onSave={(v) => save({ title: v })}
          placeholder={placeholder}
          emptyText={placeholder}
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
