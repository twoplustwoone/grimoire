'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CampaignRow {
  id: string
  name: string
  description: string | null
  status: string
  updatedAt: string | Date
  role: string
}

interface Props {
  campaigns: CampaignRow[]
}

export function CampaignsList({ campaigns }: Props) {
  const [showArchived, setShowArchived] = useState(false)
  const archivedCount = campaigns.filter(c => c.status === 'ARCHIVED').length
  const visible = showArchived
    ? campaigns
    : campaigns.filter(c => c.status !== 'ARCHIVED')

  return (
    <>
      {archivedCount > 0 && (
        <div className="mb-4 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-input"
            />
            Show archived ({archivedCount})
          </label>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map(({ id, name, description, status, updatedAt, role }) => (
          <div key={id} className="relative">
            <Link href={`/campaigns/${id}`} className="block">
              <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${status === 'ARCHIVED' ? 'opacity-70' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {role}
                    </span>
                  </div>
                  {description && (
                    <CardDescription className="line-clamp-2">
                      {description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {status} · Updated {new Date(updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
            {role === 'PLAYER' && (
              <Link
                href={`/portal/${id}`}
                className="absolute bottom-4 right-4 text-xs text-primary hover:underline z-10"
              >
                Player View →
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
