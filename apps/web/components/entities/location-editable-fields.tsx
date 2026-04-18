'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { EntityStatusSelect } from './entity-status-select'

interface Props {
  campaignId: string
  locationId: string
  name: string
  description: string | null
  status: string
}

export function LocationEditableFields({ campaignId, locationId, name, description, status }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/locations/${locationId}`, {
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
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Location name" />
        </h1>
        <EntityStatusSelect status={status} entityType="LOCATION" onSave={(v) => save('status', v)} />
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
