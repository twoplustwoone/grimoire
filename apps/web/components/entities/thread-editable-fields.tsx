'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'

interface Props {
  campaignId: string
  threadId: string
  title: string
  description: string | null
  status: string
  urgency: string
  resolvedNote: string | null
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RESOLVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DORMANT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function ThreadEditableFields({ campaignId, threadId, title, description, status, urgency, resolvedNote }: Props) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentUrgency, setCurrentUrgency] = useState(urgency)

  async function save(field: string, value: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  async function saveStatus(value: string) {
    setCurrentStatus(value)
    await save('status', value)
  }

  async function saveUrgency(value: string) {
    setCurrentUrgency(value)
    await save('urgency', value)
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold flex-1">
          <EditableField value={title} onSave={(v) => save('title', v)} placeholder="Thread title" />
        </h1>
        <div className="flex gap-2 mt-2">
          <select
            value={currentUrgency}
            onChange={(e) => saveUrgency(e.target.value)}
            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${urgencyColors[currentUrgency] ?? ''}`}
          >
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select
            value={currentStatus}
            onChange={(e) => saveStatus(e.target.value)}
            className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusColors[currentStatus] ?? ''}`}
          >
            {['OPEN', 'RESOLVED', 'DORMANT'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
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
      {currentStatus === 'RESOLVED' && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Resolution</p>
          <EditableField
            value={resolvedNote}
            onSave={(v) => save('resolvedNote', v)}
            type="textarea"
            placeholder="How was this resolved?"
            emptyText="No resolution note — click to add"
            className="text-sm"
          />
        </div>
      )}
    </>
  )
}
