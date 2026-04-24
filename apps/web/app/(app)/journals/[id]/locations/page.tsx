import type { Metadata } from 'next'
import { prisma } from '@grimoire/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PendingLink } from '@/components/navigation/pending-link'
import { requireJournalOwner } from '@/lib/journal-auth'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const journal = await prisma.journal.findUnique({ where: { id }, select: { name: true } })
  return { title: `Locations — ${journal?.name ?? 'Journal'}` }
}

export default async function JournalLocationsPage({ params }: Props) {
  const { id } = await params
  const { journal } = await requireJournalOwner(id)

  const list = await prisma.location.findMany({
    where: { ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          Locations
        </p>
        <h1 className="text-3xl font-bold">Locations</h1>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground">
              No locations yet. Mention a place with <code>@</code> in a capture to create your first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((loc) => (
            <PendingLink key={loc.id} href={`/journals/${journal.id}/locations/${loc.id}`}>
              <Card className="hover:bg-foreground/5 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {loc.status}
                    </span>
                  </div>
                  {loc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{loc.description}</p>
                  )}
                </CardHeader>
              </Card>
            </PendingLink>
          ))}
        </div>
      )}
    </div>
  )
}
