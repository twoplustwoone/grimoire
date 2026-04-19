'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  campaignId: string
  name: string
  description: string | null
  badge?: React.ReactNode
}

export function CampaignEditableFields({ campaignId, name, description, badge }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold">
          <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Campaign name" />
        </h1>
        {badge}
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
