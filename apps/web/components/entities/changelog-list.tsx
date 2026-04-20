import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export interface ChangelogEntryRow {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
}

interface Props {
  entries: ChangelogEntryRow[]
}

export function ChangelogList({ entries }: Props) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between text-sm">
              <div>
                <span className="font-medium">{entry.field}</span>
                {entry.oldValue && entry.newValue && (
                  <span className="text-muted-foreground"> changed from <span className="line-through">{entry.oldValue}</span> to {entry.newValue}</span>
                )}
                {!entry.oldValue && entry.newValue && (
                  <span className="text-muted-foreground"> set to {entry.newValue}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(entry.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
