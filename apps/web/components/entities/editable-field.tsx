'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableFieldProps {
  value: string | null | undefined
  onSave: (value: string) => Promise<void>
  type?: 'input' | 'textarea' | 'date'
  placeholder?: string
  className?: string
  emptyText?: string
}

/** Callers store ISO date strings (YYYY-MM-DD). The native date input
 *  accepts that format and returns it unchanged; display mode renders
 *  `new Date(value).toLocaleDateString()`. */

export function EditableField({
  value,
  onSave,
  type = 'input',
  placeholder,
  className,
  emptyText = 'Click to add...',
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  function handleCancel() {
    setDraft(value ?? '')
    setEditing(false)
  }

  if (!editing) {
    const display =
      type === 'date' && value
        ? new Date(value).toLocaleDateString()
        : value
    return (
      <div
        className={cn('group flex items-start gap-2 cursor-pointer', className)}
        onClick={() => setEditing(true)}
      >
        <span className={cn('flex-1', !value && 'text-muted-foreground italic text-sm')}>
          {display || emptyText}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {type === 'textarea' ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel()
          }}
        />
      ) : (
        <Input
          type={type === 'date' ? 'date' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Check className="h-3 w-3 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
