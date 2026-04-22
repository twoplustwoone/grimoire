'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PenSquare } from 'lucide-react'
import { CaptureEditorSheet } from '@/components/captures/capture-editor-sheet'

interface RecentSession {
  id: string
  number: number
  title: string | null
}

interface Props {
  journalId: string
  activeSession: RecentSession | null
  recentSessions: RecentSession[]
}

function sessionLabel(s: { number: number; title: string | null }) {
  return s.title ? `Session ${s.number} — ${s.title}` : `Session ${s.number}`
}

export function CaptureCTA({ journalId, activeSession, recentSessions }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [targetSessionId, setTargetSessionId] = useState<string | undefined>(undefined)
  const [targetSessionLabel, setTargetSessionLabel] = useState<string | undefined>(undefined)

  function start() {
    if (activeSession) {
      setTargetSessionId(activeSession.id)
      setTargetSessionLabel(sessionLabel(activeSession))
      setSheetOpen(true)
    } else {
      setPickerOpen(true)
    }
  }

  function chooseNewSession() {
    setPickerOpen(false)
    setTargetSessionId(undefined)
    setTargetSessionLabel(undefined)
    setSheetOpen(true)
  }

  function chooseExisting(s: RecentSession) {
    setPickerOpen(false)
    setTargetSessionId(s.id)
    setTargetSessionLabel(sessionLabel(s))
    setSheetOpen(true)
  }

  return (
    <>
      <Button size="lg" className="w-full sm:w-auto" onClick={start}>
        <PenSquare className="h-4 w-4 mr-2" />
        Start capturing
      </Button>

      <AlertDialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new session?</AlertDialogTitle>
            <AlertDialogDescription>
              It&apos;s been a while since your last capture. Start a new session, or continue an earlier one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Button onClick={chooseNewSession} className="w-full justify-start">
              New session
            </Button>
            {recentSessions.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                onClick={() => chooseExisting(s)}
                className="w-full justify-start"
              >
                Continue {sessionLabel(s)}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
