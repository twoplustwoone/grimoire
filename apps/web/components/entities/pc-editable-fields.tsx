'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { EntityStatusSelect } from './entity-status-select'

interface PlayerOption {
  userId: string
  label: string
}

interface Props {
  campaignId: string
  pcId: string
  name: string
  description: string | null
  status: string
  linkedUserId: string | null
  players: PlayerOption[]
  isGM: boolean
}

export function PcEditableFields({
  campaignId, pcId, name, description, status, linkedUserId, players, isGM,
}: Props) {
  const router = useRouter()

  async function save(field: string, value: string | null) {
    await fetch(`/api/v1/campaigns/${campaignId}/player-characters/${pcId}`, {
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
          {isGM ? (
            <EditableField value={name} onSave={(v) => save('name', v)} placeholder="PC name" />
          ) : (
            <span>{name}</span>
          )}
        </h1>
        {isGM ? (
          <EntityStatusSelect status={status} entityType="PLAYER_CHARACTER" onSave={(v) => save('status', v)} />
        ) : (
          <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">{status}</span>
        )}
      </div>
      <div className="mt-2">
        {isGM ? (
          <EditableField
            value={description}
            onSave={(v) => save('description', v)}
            type="textarea"
            placeholder="Add a description..."
            emptyText="No description — click to add"
            className="text-muted-foreground"
          />
        ) : description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {isGM && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Linked player:</span>
          <select
            value={linkedUserId ?? ''}
            onChange={(e) => save('linkedUserId', e.target.value || null)}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            <option value="">Unlinked</option>
            {players.map(p => (
              <option key={p.userId} value={p.userId}>{p.label}</option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
