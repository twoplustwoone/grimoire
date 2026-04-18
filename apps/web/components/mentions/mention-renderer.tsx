'use client'

import Link from 'next/link'
import { parseContentForDisplay, getMentionColor } from '@/lib/mentions'

interface Props {
  content: string
  campaignId?: string
}

const entityTypePaths: Record<string, string> = {
  NPC: 'npcs',
  LOCATION: 'locations',
  FACTION: 'factions',
  THREAD: 'threads',
  CLUE: 'clues',
  SESSION: 'sessions',
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
        const path = entityTypePaths[mention.entityType]
        const colorClass = getMentionColor(mention.entityType)

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
