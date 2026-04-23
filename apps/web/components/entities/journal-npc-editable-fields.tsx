'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  npcId: string
  name: string
  description: string | null
}

export function JournalNpcEditableFields({ journalId, npcId, name, description }: Props) {
  const router = useRouter()

  async function save(field: 'name' | 'description', value: string) {
    await fetch(`/api/v1/journals/${journalId}/npcs/${npcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  return (
    <>
      <h1 className="text-3xl font-bold">
        <EditableField value={name} onSave={(v) => save('name', v)} placeholder="NPC name" />
      </h1>
      <div className="mt-2">
        <EditableField
          value={description}
          onSave={(v) => save('description', v)}
          type="textarea"
          placeholder="Who they are, what you think they want."
          emptyText="No description — click to add"
          className="text-muted-foreground"
        />
      </div>
    </>
  )
}
