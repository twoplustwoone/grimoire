'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import { getMentionColor } from '@/lib/mentions'

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

    return (
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden w-72 max-w-[calc(100vw-2rem)]">
        <div className="px-2 py-1.5 border-b">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
            Mention entity
          </p>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {items.map((item, i) => (
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
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getMentionColor(item.type)}`}>
                {item.type}
              </span>
              <span className="flex-1 truncate">{item.name}</span>
            </button>
          ))}
        </div>
        <div className="px-2 py-1 border-t">
          <p className="text-xs text-foreground/60">↑↓ navigate · ↵ insert · esc cancel</p>
        </div>
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
