'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { EntityStatusSelect } from './entity-status-select'

interface Props {
  campaignId: string
  npcId: string
  name: string
  description: string | null
  status: string
}

export function NpcEditableFields({ campaignId, npcId, name, description, status }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold flex-1">
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="NPC name" />
        </h1>
        <EntityStatusSelect status={status} onSave={(v) => save('status', v)} />
      </div>
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
