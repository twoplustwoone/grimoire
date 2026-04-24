'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PenSquare, Plus } from 'lucide-react'
import { CaptureEditorSheet } from '@/components/captures/capture-editor-sheet'
import { displaySessionTitle } from '@/lib/session-display'

interface ActiveSession {
  id: string
  title: string | null
  createdAt: string
}

interface Props {
  journalId: string
  activeSession: ActiveSession | null
}

export function CaptureCTA({ journalId, activeSession }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [targetSessionId, setTargetSessionId] = useState<string | undefined>(undefined)
  const [targetSessionLabel, setTargetSessionLabel] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)

  function continueCapturing() {
    if (activeSession) {
      setTargetSessionId(activeSession.id)
      setTargetSessionLabel(displaySessionTitle(activeSession))
    } else {
      setTargetSessionId(undefined)
      setTargetSessionLabel(undefined)
    }
    setSheetOpen(true)
  }

  async function newSession() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch(`/api/v1/journals/${journalId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) return
      const session = (await res.json()) as { id: string; title: string | null; createdAt: string }
      setTargetSessionId(session.id)
      setTargetSessionLabel(displaySessionTitle(session))
      setSheetOpen(true)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={continueCapturing}>
          <PenSquare />
          Continue capturing
        </Button>
        <Button size="lg" variant="outline" onClick={newSession} disabled={creating}>
          <Plus />
          New session
        </Button>
      </div>

      <CaptureEditorSheet
        journalId={journalId}
        journalSessionId={targetSessionId}
        sessionLabel={targetSessionLabel}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
