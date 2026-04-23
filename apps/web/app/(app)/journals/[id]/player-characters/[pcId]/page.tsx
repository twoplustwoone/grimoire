import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { JournalPcEditableFields } from '@/components/entities/journal-pc-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'

interface Props {
  params: Promise<{ id: string; pcId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, pcId } = await params
  const pc = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'JOURNAL', ownerId: id },
    select: { name: true },
  })
  return { title: pc?.name ?? 'Character' }
}

export default async function JournalPcPage({ params }: Props) {
  const { id, pcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const pc = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
    include: {
      journalMirror: {
        include: {
          campaignPc: {
            select: { ownerId: true },
          },
        },
      },
    },
  })
  if (!pc) notFound()

  let mirrorCampaignName: string | null = null
  let mirrorActive = false
  if (pc.journalMirror) {
    // Only render the banner if the journal is linked to the same
    // campaign the mirror's campaign-side PC belongs to.
    if (
      journal.linkedCampaignId &&
      pc.journalMirror.campaignPc.ownerId === journal.linkedCampaignId
    ) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: journal.linkedCampaignId },
        select: { name: true },
      })
      mirrorCampaignName = campaign?.name ?? null
      mirrorActive = true
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          <span>{pc.name}</span>
        </p>
        <JournalPcEditableFields
          journalId={journal.id}
          pcId={pc.id}
          name={pc.name}
          description={pc.description}
        />
      </div>

      {mirrorActive && mirrorCampaignName && (
        <Card className="mb-8">
          <CardContent className="py-4 text-sm">
            Mirrored to your character in <strong>{mirrorCampaignName}</strong>.
            The GM sees your character name and any public one-liner, but not this backstory.
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={pc.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}/player-characters/${pc.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
