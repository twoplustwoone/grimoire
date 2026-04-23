'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  journalId: string
}

/** Renders a muted one-liner when the page is opened via the
 *  post-invite auto-create redirect (?welcome=1). Strips the query
 *  param after render via router.replace so a refresh doesn't
 *  re-fire the banner. */
export function WelcomeBanner({ journalId }: Props) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/journals/${journalId}`, { scroll: false })
  }, [journalId, router])

  return (
    <div className="mb-6 text-sm text-muted-foreground">
      We&apos;ve created a journal for this campaign.
    </div>
  )
}
