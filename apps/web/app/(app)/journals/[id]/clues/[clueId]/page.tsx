import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalClueEditableFields } from '@/components/entities/journal-clue-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { ShareToggle } from '@/components/journals/share-toggle'
import { JournalCrossReferencesSection } from '@/components/journals/cross-references-section'

interface Props {
  params: Promise<{ id: string; clueId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, clueId } = await params
  const clue = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'JOURNAL', ownerId: id },
    select: { title: true },
  })
  return { title: clue?.title ?? 'Clue' }
}

export default async function JournalCluePage({ params }: Props) {
  const { id, clueId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const clue = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
  })
  if (!clue) notFound()

  const shares = await prisma.journalShare.findMany({
    where: { journalId: journal.id },
    select: { id: true, sharedEntityType: true, sharedEntityId: true },
  })
  const isJournalWideShare = shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const clueShare = shares.find(
    (s) => s.sharedEntityType === 'CLUE' && s.sharedEntityId === clue.id
  )
  const hasLinkedCampaign = journal.linkedCampaignId !== null

  const linkRows = journal.linkedCampaignId
    ? await prisma.journalLink.findMany({
        where: {
          journalId: journal.id,
          journalEntityType: 'CLUE',
          journalEntityId: clue.id,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const campaignClueIds = linkRows
    .filter((l) => l.campaignEntityType === 'CLUE')
    .map((l) => l.campaignEntityId)
  const campaignClues = campaignClueIds.length
    ? await prisma.clue.findMany({
        where: { id: { in: campaignClueIds } },
        select: { id: true, title: true },
      })
    : []
  const nameById = new Map(campaignClues.map((n) => [n.id, n.title]))

  const links = linkRows.map((l) => ({
    id: l.id,
    campaignEntityType: l.campaignEntityType,
    campaignEntityId: l.campaignEntityId,
    campaignEntityName: nameById.get(l.campaignEntityId) ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          <span>{clue.title}</span>
        </p>
        <JournalClueEditableFields
          journalId={journal.id}
          clueId={clue.id}
          title={clue.title}
          description={clue.description}
          shareToggle={
            <ShareToggle
              journalId={journal.id}
              scope="CLUE"
              entityId={clue.id}
              initialShareId={clueShare?.id ?? null}
              isJournalWideShare={isJournalWideShare}
              hasLinkedCampaign={hasLinkedCampaign}
            />
          }
        />
      </div>

      {journal.linkedCampaignId && (
        <div className="mb-8">
          <JournalCrossReferencesSection
            journalId={journal.id}
            linkedCampaignId={journal.linkedCampaignId}
            journalEntityType="CLUE"
            journalEntityId={clue.id}
            links={links}
          />
        </div>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={clue.title}
          deleteEndpoint={`/api/v1/journals/${journal.id}/clues/${clue.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
