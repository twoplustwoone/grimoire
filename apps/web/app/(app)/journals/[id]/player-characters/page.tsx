import type { Metadata } from 'next'
import { prisma } from '@grimoire/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { requireJournalOwner } from '@/lib/journal-auth'

export const metadata: Metadata = { title: 'My character' }

interface Props { params: Promise<{ id: string }> }

export default async function JournalPlayerCharactersIndex({ params }: Props) {
  const { id } = await params
  const { journal } = await requireJournalOwner(id)

  const mirrorRow = await prisma.playerCharacterMirror.findFirst({
    where: {
      journalPc: { ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
    },
    include: {
      journalPc: { select: { id: true } },
      campaignPc: { select: { ownerId: true } },
    },
  })

  const hasMirror =
    journal.linkedCampaignId !== null &&
    mirrorRow !== null &&
    mirrorRow.campaignPc.ownerId === journal.linkedCampaignId

  if (hasMirror) {
    redirect(`/journals/${journal.id}/player-characters/${mirrorRow.journalPc.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          My character
        </p>
        <h1 className="text-3xl font-bold">My character</h1>
      </div>

      <Card className="text-center py-16">
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No character linked to this journal yet.
          </p>
          <Link
            href={`/journals/${journal.id}/settings`}
            className="text-sm underline hover:no-underline"
          >
            Link one in settings
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
