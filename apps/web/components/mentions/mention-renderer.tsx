'use client'

import Link from 'next/link'
import { parseContentForDisplay } from '@/lib/mentions'
import { getEntityChipClasses, getEntityRoutePath } from '@/lib/entity-display'

interface Props {
  content: string
  campaignId?: string
}

export function MentionRenderer({ content, campaignId }: Props) {
  const parts = parseContentForDisplay(content)

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.value}</span>
        }

        const { mention } = part
        const path = getEntityRoutePath(mention.entityType)
        const colorClass = getEntityChipClasses(mention.entityType)

        if (campaignId && path) {
          return (
            <Link
              key={i}
              href={`/campaigns/${campaignId}/${path}/${mention.entityId}`}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 hover:opacity-80 transition-opacity ${colorClass}`}
              onClick={(e) => e.stopPropagation()}
            >
              @{mention.name}
            </Link>
          )
        }

        return (
          <span
            key={i}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 ${colorClass}`}
          >
            @{mention.name}
          </span>
        )
      })}
    </span>
  )
}
