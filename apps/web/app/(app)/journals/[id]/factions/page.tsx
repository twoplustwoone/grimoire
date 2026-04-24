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
  return { title: `Factions — ${journal?.name ?? 'Journal'}` }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default async function JournalFactionsPage({ params }: Props) {
  const { id } = await params
  const { journal } = await requireJournalOwner(id)

  const list = await prisma.faction.findMany({
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
          Factions
        </p>
        <h1 className="text-3xl font-bold">Factions</h1>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground">
              No factions yet. Mention a group with <code>@</code> in a capture to create your first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((f) => (
            <PendingLink key={f.id} href={`/journals/${journal.id}/factions/${f.id}`}>
              <Card className="hover:bg-foreground/5 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[f.status] ?? ''}`}>
                      {f.status}
                    </span>
                  </div>
                  {f.agenda && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{f.agenda}</p>
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
