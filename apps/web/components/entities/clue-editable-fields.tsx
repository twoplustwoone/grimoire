'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  campaignId: string
  clueId: string
  title: string
  description: string | null
}

export function ClueEditableFields({ campaignId, clueId, title, description }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/clues/${clueId}`, {
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
        <EditableField value={title} onSave={(v) => save('title', v)} placeholder="Clue title" />
      </h1>
      <div className="mt-2">
        <EditableField
          value={description}
          onSave={(v) => save('description', v)}
          type="textarea"
          placeholder="Add a description..."
          emptyText="No description — click to add"
          className="text-muted-foreground"
        />
      </div>
    </>
  )
}
