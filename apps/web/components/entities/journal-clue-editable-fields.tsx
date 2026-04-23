'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  clueId: string
  title: string
  description: string | null
  shareToggle?: ReactNode
}

export function JournalClueEditableFields({
  journalId,
  clueId,
  title,
  description,
  shareToggle,
}: Props) {
  const router = useRouter()

  async function save(field: 'title' | 'description', value: string) {
    await fetch(`/api/v1/journals/${journalId}/clues/${clueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold flex-1">
          <EditableField value={title} onSave={(v) => save('title', v)} placeholder="Clue title" />
        </h1>
        {shareToggle}
      </div>
      <div className="mt-2">
        <EditableField
          value={description}
          onSave={(v) => save('description', v)}
          type="textarea"
          placeholder="What you noticed, what it might mean."
          emptyText="No description — click to add"
          className="text-muted-foreground"
        />
      </div>
    </>
  )
}
