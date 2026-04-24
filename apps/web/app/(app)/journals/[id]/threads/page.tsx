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
  return { title: `Threads — ${journal?.name ?? 'Journal'}` }
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RESOLVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DORMANT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export default async function JournalThreadsPage({ params }: Props) {
  const { id } = await params
  const { journal } = await requireJournalOwner(id)

  const list = await prisma.thread.findMany({
    where: { ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          Threads
        </p>
        <h1 className="text-3xl font-bold">Threads</h1>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground">
              No open threads yet. Drop a question with <code>@</code> in a capture to track your first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((t) => (
            <PendingLink key={t.id} href={`/journals/${journal.id}/threads/${t.id}`}>
              <Card className="hover:bg-foreground/5 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${urgencyColors[t.urgency] ?? ''}`}>
                        {t.urgency}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[t.status] ?? ''}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{t.description}</p>
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
