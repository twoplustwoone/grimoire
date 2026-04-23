'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { emptyDoc, type ProseMirrorDoc } from '@grimoire/db/prosemirror'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { MentionInput } from '@/components/mentions/mention-input'

interface Props {
  journalId: string
  journalSessionId?: string
  captureId?: string
  initialContent?: ProseMirrorDoc | null
  sessionLabel?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EditorBodyHandle {
  tryClose: () => void
}

export function CaptureEditorSheet(props: Props) {
  const { open, onOpenChange } = props
  const bodyRef = useRef<EditorBodyHandle | null>(null)

  // Route every Radix-initiated close (X button, Escape, outside
  // click) through EditorBody's dirty-check. Cancel already goes
  // through the same handle; save and "Discard" use forceClose.
  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true)
      return
    }
    if (bodyRef.current) {
      bodyRef.current.tryClose()
      return
    }
    onOpenChange(false)
  }

  function forceClose() {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {open && <EditorBody ref={bodyRef} forceClose={forceClose} {...props} />}
      </SheetContent>
    </Sheet>
  )
}

interface EditorBodyProps extends Props {
  forceClose: () => void
}

const EditorBody = forwardRef<EditorBodyHandle, EditorBodyProps>(function EditorBody(
  {
    journalId,
    journalSessionId,
    captureId,
    initialContent,
    sessionLabel,
    forceClose,
  },
  ref,
) {
  const router = useRouter()
  const seed: ProseMirrorDoc = (initialContent as ProseMirrorDoc | null) ?? emptyDoc()
  const [draft, setDraft] = useState<ProseMirrorDoc>(seed)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(seed)

  function tryClose() {
    if (isDirty) {
      setConfirmDiscard(true)
    } else {
      forceClose()
    }
  }

  useImperativeHandle(ref, () => ({ tryClose }))

  async function handleSave() {
    setSaving(true)
    setError(null)
    const url = captureId
      ? `/api/v1/journals/${journalId}/captures/${captureId}`
      : `/api/v1/journals/${journalId}/captures`
    const method = captureId ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        content: draft,
        ...(journalSessionId && !captureId ? { journalSessionId } : {}),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save capture')
      return
    }
    router.refresh()
    forceClose()
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{captureId ? 'Edit capture' : 'New capture'}</SheetTitle>
        {sessionLabel && <SheetDescription>Capturing to {sessionLabel}</SheetDescription>}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        <MentionInput
          mentionJournalId={journalId}
          value={draft}
          onChange={setDraft}
          rows={12}
          placeholder="What happened?"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <SheetFooter>
        <Button variant="outline" onClick={tryClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Done'}
        </Button>
      </SheetFooter>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft will be lost. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false)
                forceClose()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
