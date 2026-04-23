'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  locationId: string
  name: string
  description: string | null
  /** Optional render slot for the share toggle. Placed in the header row
   *  alongside the name so sharing is visually tied to the entity it controls. */
  shareToggle?: ReactNode
}

export function JournalLocationEditableFields({
  journalId,
  locationId,
  name,
  description,
  shareToggle,
}: Props) {
  const router = useRouter()

  async function save(field: 'name' | 'description', value: string) {
    await fetch(`/api/v1/journals/${journalId}/locations/${locationId}`, {
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
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Location name" />
        </h1>
        {shareToggle}
      </div>
      <div className="mt-2">
        <EditableField
          value={description}
          onSave={(v) => save('description', v)}
          type="textarea"
          placeholder="Where it is, what it feels like, why it matters."
          emptyText="No description — click to add"
          className="text-muted-foreground"
        />
      </div>
    </>
  )
}
