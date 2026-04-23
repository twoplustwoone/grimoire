'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { MentionInput } from '@/components/mentions/mention-input'
import { Button } from '@/components/ui/button'
import { emptyDoc, type ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  journalId: string
  pcId: string
  name: string
  description: string | null
  /** Optional render slot for the backstory's share toggle. Rendered
   *  in the section header so the toggle is visually associated with
   *  the backstory content it controls. */
  shareToggle?: ReactNode
}

function descriptionToDoc(description: string | null): ProseMirrorDoc {
  if (!description) return emptyDoc()
  // ProseMirror JSON is stored as TEXT in the current schema because
  // we reuse PlayerCharacter. Treat the value as a plaintext doc.
  return {
    type: 'doc',
    content: description.split('\n').map((line) =>
      line.length > 0
        ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
        : { type: 'paragraph' }
    ),
  }
}

function docToPlainText(doc: ProseMirrorDoc): string {
  const lines: string[] = []
  for (const block of doc.content ?? []) {
    if (block.type === 'paragraph') {
      const text = (block.content ?? [])
        .map((n) => (n.type === 'text' ? n.text ?? '' : ''))
        .join('')
      lines.push(text)
    }
  }
  return lines.join('\n')
}

export function JournalPcEditableFields({
  journalId,
  pcId,
  name,
  description,
  shareToggle,
}: Props) {
  const router = useRouter()
  const [draft, setDraft] = useState<ProseMirrorDoc>(descriptionToDoc(description))
  const [savingBackstory, setSavingBackstory] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  async function saveName(v: string) {
    await fetch(`/api/v1/journals/${journalId}/player-characters/${pcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: v }),
    })
    router.refresh()
  }

  async function saveBackstory() {
    setSavingBackstory(true)
    const text = docToPlainText(draft).trim()
    const res = await fetch(`/api/v1/journals/${journalId}/player-characters/${pcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ description: text || null }),
    })
    setSavingBackstory(false)
    if (res.ok) {
      setSavedAt(Date.now())
      router.refresh()
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold">
        <EditableField value={name} onSave={saveName} placeholder="Character name" />
      </h1>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Backstory
          </h2>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs text-muted-foreground">Saved</span>
            )}
            {shareToggle}
          </div>
        </div>
        <MentionInput
          allowMentions={false}
          value={draft}
          onChange={setDraft}
          rows={12}
          placeholder="Where your character comes from, what drives them, what they don't tell the others."
        />
        <div className="mt-2">
          <Button size="sm" onClick={saveBackstory} disabled={savingBackstory}>
            {savingBackstory ? 'Saving...' : 'Save backstory'}
          </Button>
        </div>
      </div>
    </>
  )
}
