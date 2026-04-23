'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface AvailablePc {
  id: string
  name: string
  description: string | null
}

interface Props {
  journalId: string
  campaignId: string
  campaignName: string
  availablePcs: AvailablePc[]
  /** When set, preselect this PC in step 2 (used by the invite-accept flow). */
  preselectedPcId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked?: (journalId: string) => void
}

export function LinkJournalSheet(props: Props) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] flex flex-col">
        {props.open && <Body {...props} />}
      </SheetContent>
    </Sheet>
  )
}

type Step = 'ceremony' | 'claim' | 'seed_prompt'
type Choice =
  | { kind: 'claim_existing'; pcId: string; seed: boolean | null }
  | { kind: 'create_new'; name: string }
  | { kind: 'none' }

function Body({
  journalId,
  campaignId,
  campaignName,
  availablePcs,
  preselectedPcId,
  onOpenChange,
  onLinked,
}: Props) {
  const router = useRouter()
  const initialChoice: Choice | null = preselectedPcId
    ? availablePcs.some((p) => p.id === preselectedPcId)
      ? { kind: 'claim_existing', pcId: preselectedPcId, seed: null }
      : null
    : null
  const [step, setStep] = useState<Step>('ceremony')
  const [choice, setChoice] = useState<Choice | null>(initialChoice)
  const [newPcName, setNewPcName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectExistingPc(pc: AvailablePc) {
    const hasBackstoryDraft = !!(pc.description && pc.description.trim())
    if (hasBackstoryDraft) {
      setChoice({ kind: 'claim_existing', pcId: pc.id, seed: null })
      setStep('seed_prompt')
    } else {
      setChoice({ kind: 'claim_existing', pcId: pc.id, seed: false })
    }
  }

  async function submit() {
    if (!choice) {
      setError('Pick a character option to continue.')
      return
    }
    if (choice.kind === 'create_new' && !choice.name.trim()) {
      setError('Character name is required.')
      return
    }
    if (choice.kind === 'claim_existing' && choice.seed === null) {
      setError('Choose whether to use your GM\'s draft as a starting point.')
      return
    }

    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = {
      campaignId,
      pcChoice: choice.kind,
    }
    if (choice.kind === 'claim_existing') {
      body.existingPcId = choice.pcId
      body.seedBackstoryFromCampaignPc = choice.seed === true
    } else if (choice.kind === 'create_new') {
      body.newPcName = choice.name.trim()
    }

    const res = await fetch(`/api/v1/journals/${journalId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to link journal')
      return
    }
    router.refresh()
    onLinked?.(journalId)
    onOpenChange(false)
  }

  const selectedPc =
    choice?.kind === 'claim_existing'
      ? availablePcs.find((p) => p.id === choice.pcId) ?? null
      : null

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {step === 'ceremony' && `Link this journal to ${campaignName}?`}
          {step === 'claim' && 'Which character are you playing?'}
          {step === 'seed_prompt' && 'Use your GM\'s draft as a starting point?'}
        </SheetTitle>
        <SheetDescription>
          {step === 'ceremony' && 'Review what will and won\'t change before linking.'}
          {step === 'claim' && 'Choose a character, create one, or link without a PC.'}
          {step === 'seed_prompt' && 'Your GM has drafted a backstory on this character.'}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto space-y-4">
        {step === 'ceremony' && (
          <ul className="space-y-3 text-sm">
            <li>
              <strong>What will happen.</strong> This journal will link to {campaignName}. You&apos;ll be able to reference campaign entities from your journal.
            </li>
            <li>
              <strong>What changes.</strong> Your player character in the campaign will be mirrored to this journal. You can write backstory and private notes in your journal PC; the campaign PC stays as the GM&apos;s roster entry.
            </li>
            <li>
              <strong>What doesn&apos;t change.</strong> Your existing notes, entities, and writing in this journal stay exactly as they are.
            </li>
            <li>
              <strong>Privacy.</strong> The GM cannot see anything in your journal unless you explicitly share it. This is opt-in, per-item or journal-wide.
            </li>
            <li>
              <strong>Reversibility.</strong> You can unlink this journal from the campaign at any time. Your journal content stays with you.
            </li>
          </ul>
        )}

        {step === 'claim' && (
          <div className="space-y-2">
            {availablePcs.map((pc) => {
              const active = choice?.kind === 'claim_existing' && choice.pcId === pc.id
              return (
                <Button
                  key={pc.id}
                  variant={active ? 'default' : 'outline'}
                  className="w-full h-auto py-3 justify-start text-left"
                  onClick={() => selectExistingPc(pc)}
                >
                  <div>
                    <div className="font-medium">{pc.name}</div>
                    {pc.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {pc.description}
                      </div>
                    )}
                  </div>
                </Button>
              )
            })}

            <div className="space-y-2 pt-2">
              <Label htmlFor="newPcName">Create a new character</Label>
              <Input
                id="newPcName"
                value={newPcName}
                onChange={(e) => {
                  setNewPcName(e.target.value)
                  if (e.target.value.trim()) {
                    setChoice({ kind: 'create_new', name: e.target.value })
                  }
                }}
                placeholder="Character name"
              />
            </div>

            <Button
              variant={choice?.kind === 'none' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setChoice({ kind: 'none' })}
            >
              No character yet
            </Button>
          </div>
        )}

        {step === 'seed_prompt' && selectedPc && (
          <div className="space-y-4">
            <div className="rounded border p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">
                From the campaign-side {selectedPc.name}:
              </div>
              <div className="whitespace-pre-wrap">
                {selectedPc.description}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={
                  choice?.kind === 'claim_existing' && choice.seed === true
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  setChoice((c) =>
                    c?.kind === 'claim_existing' ? { ...c, seed: true } : c
                  )
                }
              >
                Use draft
              </Button>
              <Button
                variant={
                  choice?.kind === 'claim_existing' && choice.seed === false
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  setChoice((c) =>
                    c?.kind === 'claim_existing' ? { ...c, seed: false } : c
                  )
                }
              >
                Start fresh
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <SheetFooter>
        {step === 'ceremony' && (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => setStep('claim')}>Continue</Button>
          </>
        )}
        {step === 'claim' && (
          <>
            <Button variant="outline" onClick={() => setStep('ceremony')}>Back</Button>
            <Button onClick={submit} disabled={saving || !choice}>
              {saving ? 'Linking...' : 'Link journal'}
            </Button>
          </>
        )}
        {step === 'seed_prompt' && (
          <>
            <Button variant="outline" onClick={() => setStep('claim')}>Back</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Linking...' : 'Link journal'}
            </Button>
          </>
        )}
      </SheetFooter>
    </>
  )
}
