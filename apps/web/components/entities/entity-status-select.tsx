'use client'

import { useState } from 'react'

export type EntityStatusOption = string

const statusOptionsByType: Record<string, string[]> = {
  NPC: ['ACTIVE', 'INACTIVE', 'DEAD', 'RETIRED'],
  LOCATION: ['ACTIVE', 'INACTIVE', 'DESTROYED'],
  FACTION: ['ACTIVE', 'INACTIVE', 'DESTROYED'],
  THREAD: ['OPEN', 'DORMANT', 'RESOLVED'],
  CLUE: ['ACTIVE', 'INACTIVE'],
  PLAYER_CHARACTER: ['ACTIVE', 'RETIRED', 'DECEASED'],
  DEFAULT: ['ACTIVE', 'INACTIVE'],
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DEAD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DECEASED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  RETIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DORMANT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

interface EntityStatusSelectProps {
  status: string
  entityType: 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE' | 'PLAYER_CHARACTER' | 'DEFAULT'
  onSave: (status: string) => Promise<void>
}

export function EntityStatusSelect({ status, entityType, onSave }: EntityStatusSelectProps) {
  const [saving, setSaving] = useState(false)
  const options = statusOptionsByType[entityType] ?? statusOptionsByType.DEFAULT

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
      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none ${statusColors[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
