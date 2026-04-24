'use client'

import { useState } from 'react'
import { Dialog as Primitive } from 'radix-ui'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ENTITY_ICON } from '@/lib/entity-display'
import type { CreatableEntityType } from '@/lib/journal-entity-create'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The verbatim name to be used as the new entity's label. */
  name: string
  /** Resolves when the create request completes (success or failure). */
  onPick: (type: CreatableEntityType) => Promise<void>
}

const OPTIONS: ReadonlyArray<{ type: CreatableEntityType; label: string; icon: LucideIcon }> = [
  { type: 'NPC', label: 'NPC', icon: ENTITY_ICON.NPC },
  { type: 'LOCATION', label: 'Location', icon: ENTITY_ICON.LOCATION },
  { type: 'FACTION', label: 'Faction', icon: ENTITY_ICON.FACTION },
  { type: 'THREAD', label: 'Thread', icon: ENTITY_ICON.THREAD },
  { type: 'CLUE', label: 'Clue', icon: ENTITY_ICON.CLUE },
]

export function EntityTypePicker({ open, onOpenChange, name, onPick }: Props) {
  const [pending, setPending] = useState<CreatableEntityType | null>(null)

  async function handlePick(type: CreatableEntityType) {
    if (pending) return
    setPending(type)
    try {
      await onPick(type)
    } finally {
      setPending(null)
    }
  }

  return (
    <Primitive.Root open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <Primitive.Portal>
        <Primitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <Primitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4',
            'rounded-xl bg-popover p-6 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <Primitive.Title className="text-base font-medium">Create entity</Primitive.Title>
          <Primitive.Description className="text-sm text-muted-foreground">
            Pick a type for{' '}
            <span className="font-medium text-foreground">&ldquo;{name}&rdquo;</span>.
          </Primitive.Description>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OPTIONS.map(({ type, label, icon: Icon }) => {
              const isPending = pending === type
              return (
                <button
                  key={type}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => handlePick(type)}
                  className={cn(
                    'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-3 text-sm',
                    'hover:bg-muted hover:border-primary/40',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{isPending ? 'Creating…' : label}</span>
                </button>
              )
            })}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending !== null}>
              Cancel
            </Button>
          </div>
          <Primitive.Close asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={pending !== null}
              className="absolute right-3 top-3 rounded p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}
