import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { JournalEditableFields } from '@/components/entities/journal-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { CaptureCTA } from './capture-cta'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const journal = await prisma.journal.findUnique({ where: { id }, select: { name: true } })
  return { title: journal?.name ?? 'Journal' }
}

export default async function JournalHomePage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    include: { linkedCampaign: { select: { name: true } } },
  })

  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const subtitle = journal.linkedCampaign
    ? `Linked to ${journal.linkedCampaign.name}`
    : 'Freestanding journal'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <span>{journal.name}</span>
        </p>
        <JournalEditableFields journalId={journal.id} name={journal.name} />
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      </div>

      <div className="mb-8">
        <CaptureCTA />
      </div>

      <Card className="mb-8">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No captures yet. Your captures will appear here, grouped by session.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-8 border-t">
        <Link
          href="#"
          className="text-sm text-muted-foreground hover:underline"
          aria-disabled="true"
        >
          Settings
        </Link>
        <DeleteEntityButton
          entityName={journal.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}`}
          redirectTo="/journals"
        />
      </div>
    </div>
  )
}
