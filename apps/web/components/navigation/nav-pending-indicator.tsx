'use client'

import { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'

/**
 * Fixed-size spinner that appears next to a Link's content while its
 * navigation is pending. Must be rendered inside a `<Link>` subtree —
 * `useLinkStatus` only works there.
 */
export function NavPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus()
  return (
    <Loader2
      aria-hidden
      className={[
        'h-3.5 w-3.5 shrink-0 animate-spin transition-opacity duration-150 delay-100',
        pending ? 'opacity-60' : 'opacity-0',
        className ?? '',
      ].join(' ')}
    />
  )
}
