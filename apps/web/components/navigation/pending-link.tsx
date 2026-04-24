'use client'

import Link, { useLinkStatus, type LinkProps } from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

function PendingOpacity({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={[
        'transition-opacity duration-150 delay-100',
        pending ? 'opacity-60' : '',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

type AnchorProps = Omit<ComponentPropsWithoutRef<'a'>, keyof LinkProps>

export type PendingLinkProps = LinkProps &
  AnchorProps & {
    children: ReactNode
  }

/**
 * Drop-in `next/link` replacement that dims its children while navigation
 * is pending. The opacity change is delayed 100ms so prefetched, near-
 * instant transitions do not flash.
 */
export function PendingLink({ children, ...props }: PendingLinkProps) {
  return (
    <Link {...props}>
      <PendingOpacity>{children}</PendingOpacity>
    </Link>
  )
}
