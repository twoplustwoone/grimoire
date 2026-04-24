'use client'

import { PendingLink } from '@/components/navigation/pending-link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface JournalRow {
  id: string
  name: string
  linkedCampaignName: string | null
  updatedAt: string | Date
}

interface Props {
  journals: JournalRow[]
}

export function JournalsList({ journals }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {journals.map(({ id, name, linkedCampaignName, updatedAt }) => (
        <PendingLink key={id} href={`/journals/${id}`} className="block">
          <Card className="hover:bg-foreground/5 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>
                {linkedCampaignName ? `Linked to ${linkedCampaignName}` : 'Freestanding journal'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </PendingLink>
      ))}
    </div>
  )
}
