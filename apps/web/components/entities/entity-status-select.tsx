'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

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
  const [open, setOpen] = useState(false)
  const options = statusOptionsByType[entityType] ?? statusOptionsByType.DEFAULT
  const colorClass = statusColors[status] ?? 'bg-muted text-muted-foreground'

  async function handleChange(next: string) {
    if (next === status) return
    setSaving(true)
    await onSave(next)
    setSaving(false)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={saving}
        className={`inline-flex items-center gap-1 text-xs px-3 h-11 md:h-auto md:py-1 rounded-full font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${colorClass} ${saving ? 'opacity-60' : ''}`}
        aria-label={`Status: ${status}. Tap to change.`}
      >
        {status}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        <DropdownMenuRadioGroup value={status} onValueChange={handleChange}>
          {options.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {s}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
