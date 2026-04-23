'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ShareToggleScope =
  | 'CAPTURE'
  | 'PLAYER_CHARACTER'
  | 'NPC'
  | 'LOCATION'
  | 'FACTION'
  | 'THREAD'
  | 'CLUE'

interface Props {
  journalId: string
  scope: ShareToggleScope
  entityId: string
  initialShareId: string | null
  isJournalWideShare: boolean
  hasLinkedCampaign: boolean
  size?: 'sm' | 'default'
  className?: string
}

/** Labeled share toggle. Two visual states:
 *    unshared  → `Share2` + "Share",  muted foreground
 *    shared    → `Share2` + "Shared", primary foreground
 *  Plus a disabled state with a tooltip when sharing isn't available
 *  (no linked campaign, or journal-wide share overrides per-item).
 *
 *  Error handling is revert-only: if the POST/DELETE fails, the
 *  optimistic state snaps back with no user-visible error signal
 *  (no toast lib in this codebase yet — flagged for post-J5 polish).
 */
export function ShareToggle({
  journalId,
  scope,
  entityId,
  initialShareId,
  isJournalWideShare,
  hasLinkedCampaign,
  size = 'sm',
  className,
}: Props) {
  const [shareId, setShareId] = useState<string | null>(initialShareId)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const disabled = !hasLinkedCampaign || isJournalWideShare || pending
  // When journal-wide share is on, per-node is moot but should display
  // as "on" so the user understands their content is shared.
  const visuallyShared = isJournalWideShare || shareId !== null

  const tooltipText = !hasLinkedCampaign
    ? 'Sharing requires a linked campaign'
    : isJournalWideShare
      ? 'Journal-wide share is on'
      : visuallyShared
        ? 'Shared with GM — click to unshare'
        : 'Share with GM'

  async function toggle() {
    if (disabled) return
    if (shareId) {
      // Unshare
      const prev = shareId
      setShareId(null)
      startTransition(async () => {
        const res = await fetch(
          `/api/v1/journals/${journalId}/shares/${prev}`,
          { method: 'DELETE', credentials: 'include' }
        )
        if (!res.ok) {
          setShareId(prev)
          return
        }
        router.refresh()
      })
    } else {
      // Share
      startTransition(async () => {
        const res = await fetch(`/api/v1/journals/${journalId}/shares`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sharedEntityType: scope, sharedEntityId: entityId }),
        })
        if (!res.ok) return
        const row = (await res.json()) as { id: string }
        setShareId(row.id)
        router.refresh()
      })
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex', className)}>
          <Button
            type="button"
            size={size}
            variant="outline"
            onClick={toggle}
            disabled={disabled}
            aria-pressed={visuallyShared}
            aria-label={tooltipText}
            className={cn(
              visuallyShared
                ? 'text-primary border-primary/40 hover:bg-primary/10'
                : 'text-muted-foreground',
              disabled && 'opacity-60'
            )}
          >
            <Share2 />
            {visuallyShared ? 'Shared' : 'Share'}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  )
}
