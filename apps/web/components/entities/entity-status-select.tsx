'use client'

import { useState } from 'react'

const statusOptions = ['ACTIVE', 'INACTIVE', 'DEAD', 'DESTROYED', 'RETIRED'] as const
type EntityStatus = (typeof statusOptions)[number]

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  DEAD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  RETIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

interface EntityStatusSelectProps {
  status: string
  onSave: (status: string) => Promise<void>
}

export function EntityStatusSelect({ status, onSave }: EntityStatusSelectProps) {
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true)
    await onSave(e.target.value)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={saving}
      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${statusColors[status] ?? ''}`}
    >
      {statusOptions.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
