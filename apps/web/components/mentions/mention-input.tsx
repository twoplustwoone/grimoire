'use client'

import { useState, useRef, useEffect } from 'react'
import { buildMentionToken, getMentionColor } from '@/lib/mentions'
import { useParams } from 'next/navigation'

interface SearchResult {
  id: string
  type: string
  name: string
  meta: string | null
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function MentionInput({ value, onChange, placeholder, rows = 3, className, onKeyDown }: Props) {
  const params = useParams()
  const campaignId = params?.id as string | undefined

  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mentionQuery === null || !campaignId) {
      setMentionResults([])
      return
    }

    const timeout = setTimeout(async () => {
      if (mentionQuery.length === 0) {
        setMentionResults([])
        return
      }
      const res = await fetch(
        `/api/v1/search?campaignId=${campaignId}&q=${encodeURIComponent(mentionQuery)}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const data = await res.json()
        setMentionResults(data.slice(0, 8))
        setSelectedIndex(0)
      }
    }, 150)

    return () => clearTimeout(timeout)
  }, [mentionQuery, campaignId])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value
    const cursor = e.target.selectionStart

    const textBeforeCursor = newValue.slice(0, cursor)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1)
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' '
      const isValidTrigger = charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0

      if (isValidTrigger && !textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt)
        setMentionStart(atIndex)
        onChange(newValue)
        return
      }
    }

    setMentionQuery(null)
    setMentionResults([])
    onChange(newValue)
  }

  function insertMention(result: SearchResult) {
    const token = buildMentionToken(result.name, result.type, result.id)
    const before = value.slice(0, mentionStart)
    const after = value.slice(textareaRef.current?.selectionStart ?? mentionStart + (mentionQuery?.length ?? 0) + 1)
    const newValue = `${before}${token} ${after}`
    onChange(newValue)
    setMentionQuery(null)
    setMentionResults([])

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursor = before.length + token.length + 1
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, mentionResults.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(mentionResults[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        setMentionQuery(null)
        setMentionResults([])
        return
      }
    }
    onKeyDown?.(e)
  }

  const colorClass = (type: string) => getMentionColor(type)

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {mentionResults.length > 0 && (
        <div
          ref={popoverRef}
          className="absolute z-50 w-72 bg-card border rounded-lg shadow-lg overflow-hidden mt-1"
          style={{ bottom: '100%', left: 0, marginBottom: '4px' }}
        >
          <div className="px-2 py-1.5 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
              Mention entity
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {mentionResults.map((result, i) => (
              <button
                key={result.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertMention(result)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === selectedIndex ? 'bg-muted text-foreground' : 'hover:bg-muted/50'
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${colorClass(result.type)}`}>
                  {result.type}
                </span>
                <span className="flex-1 truncate">{result.name}</span>
              </button>
            ))}
          </div>
          <div className="px-2 py-1 border-t">
            <p className="text-[10px] text-muted-foreground">↑↓ navigate · ↵ insert · esc cancel</p>
          </div>
        </div>
      )}
    </div>
  )
}
