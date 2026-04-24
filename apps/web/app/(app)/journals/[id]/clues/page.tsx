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
  return { title: `Clues — ${journal?.name ?? 'Journal'}` }
}

export default async function JournalCluesPage({ params }: Props) {
  const { id } = await params
  const { journal } = await requireJournalOwner(id)

  const list = await prisma.clue.findMany({
    where: { ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          Clues
        </p>
        <h1 className="text-3xl font-bold">Clues</h1>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground">
              No clues yet. Mention a lead with <code>@</code> in a capture to track your first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((clue) => (
            <PendingLink key={clue.id} href={`/journals/${journal.id}/clues/${clue.id}`}>
              <Card className="hover:bg-foreground/5 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">{clue.title}</CardTitle>
                  {clue.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{clue.description}</p>
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
