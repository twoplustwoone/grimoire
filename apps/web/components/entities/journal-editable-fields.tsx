'use client'

import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  journalId: string
  name: string
}

export function JournalEditableFields({ journalId, name }: Props) {
  const router = useRouter()

  async function save(field: string, value: string) {
    await fetch(`/api/v1/journals/${journalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  return (
    <h1 className="text-3xl font-bold">
      <EditableField value={name} onSave={(v) => save('name', v)} placeholder="Journal name" />
    </h1>
  )
}
