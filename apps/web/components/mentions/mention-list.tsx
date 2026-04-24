'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import { Plus } from 'lucide-react'
import { getEntityChipClasses, getEntityLabel } from '@/lib/entity-display'
import { CREATE_ITEM_ID } from '@/lib/tiptap-mention-suggestion'

interface MentionItem {
  id: string
  type: string
  name: string
  label: string
}

interface Props {
  items: MentionItem[]
  command: (item: { id: string; label: string; type: string; name: string }) => void
}

export const MentionList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [prevItems, setPrevItems] = useState(items)
    if (items !== prevItems) {
      setPrevItems(items)
      setSelectedIndex(0)
    }

    function selectItem(index: number) {
      const item = items[index]
      if (item) {
        command({ id: item.id, label: item.name, type: item.type, name: item.name })
      }
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-card border rounded-lg shadow-lg overflow-hidden w-72">
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No matches found
          </div>
        </div>
      )
    }

    const onlyCreateRow = items.length === 1 && items[0].id === CREATE_ITEM_ID

    return (
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden w-72 max-w-[calc(100vw-2rem)]">
        <div className="px-2 py-1.5 border-b">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
            {onlyCreateRow ? 'No matches' : 'Mention entity'}
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {items.map((item, i) =>
            item.id === CREATE_ITEM_ID ? (
              <button
                key={CREATE_ITEM_ID}
                type="button"
                onClick={() => selectItem(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-accent text-accent-foreground border-l-2 border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  Create entity{' '}
                  <span className="font-medium text-foreground">
                    &ldquo;{item.name}&rdquo;
                  </span>
                  …
                </span>
              </button>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-accent text-accent-foreground border-l-2 border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getEntityChipClasses(item.type)}`}
                >
                  {getEntityLabel(item.type)}
                </span>
                <span className="flex-1 truncate">{item.name}</span>
              </button>
            ),
          )}
        </div>
        <div className="px-2 py-1 border-t">
          <p className="text-xs text-foreground/60">↑↓ navigate · ↵ insert · esc cancel</p>
        </div>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
