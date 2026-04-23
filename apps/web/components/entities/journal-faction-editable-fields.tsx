'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  factionId: string
  name: string
  description: string | null
  shareToggle?: ReactNode
}

export function JournalFactionEditableFields({
  journalId,
  factionId,
  name,
  description,
  shareToggle,
}: Props) {
  const router = useRouter()

  async function save(field: 'name' | 'description', value: string) {
    await fetch(`/api/v1/journals/${journalId}/factions/${factionId}`, {
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
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Faction name" />
        </h1>
        {shareToggle}
      </div>
      <div className="mt-2">
        <EditableField
          value={description}
          onSave={(v) => save('description', v)}
          type="textarea"
          placeholder="Who they are, what they want, how they operate."
          emptyText="No description — click to add"
          className="text-muted-foreground"
        />
      </div>
    </>
  )
}
