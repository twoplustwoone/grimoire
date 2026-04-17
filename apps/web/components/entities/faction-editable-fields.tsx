'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { EntityStatusSelect } from './entity-status-select'

interface Props {
  campaignId: string
  factionId: string
  name: string
  description: string | null
  agenda: string | null
  status: string
}

export function FactionEditableFields({ campaignId, factionId, name, description, agenda, status }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/factions/${factionId}`, {
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
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Faction name" />
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
      <div className="mt-2">
        <p className="text-xs font-medium text-muted-foreground mb-1">Agenda</p>
        <EditableField
          value={agenda}
          onSave={(v) => save('agenda', v)}
          type="textarea"
          placeholder="What does this faction want?"
          emptyText="No agenda — click to add"
          className="text-sm text-muted-foreground italic"
        />
      </div>
    </>
  )
}
