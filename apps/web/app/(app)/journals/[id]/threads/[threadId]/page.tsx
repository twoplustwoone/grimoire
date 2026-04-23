import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalThreadEditableFields } from '@/components/entities/journal-thread-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { ShareToggle } from '@/components/journals/share-toggle'
import { JournalCrossReferencesSection } from '@/components/journals/cross-references-section'

interface Props {
  params: Promise<{ id: string; threadId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, threadId } = await params
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, ownerType: 'JOURNAL', ownerId: id },
    select: { title: true },
  })
  return { title: thread?.title ?? 'Thread' }
}

export default async function JournalThreadPage({ params }: Props) {
  const { id, threadId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
  })
  if (!thread) notFound()

  const shares = await prisma.journalShare.findMany({
    where: { journalId: journal.id },
    select: { id: true, sharedEntityType: true, sharedEntityId: true },
  })
  const isJournalWideShare = shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const threadShare = shares.find(
    (s) => s.sharedEntityType === 'THREAD' && s.sharedEntityId === thread.id
  )
  const hasLinkedCampaign = journal.linkedCampaignId !== null

  const linkRows = journal.linkedCampaignId
    ? await prisma.journalLink.findMany({
        where: {
          journalId: journal.id,
          journalEntityType: 'THREAD',
          journalEntityId: thread.id,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const campaignThreadIds = linkRows
    .filter((l) => l.campaignEntityType === 'THREAD')
    .map((l) => l.campaignEntityId)
  const campaignThreads = campaignThreadIds.length
    ? await prisma.thread.findMany({
        where: { id: { in: campaignThreadIds } },
        select: { id: true, title: true },
      })
    : []
  const nameById = new Map(campaignThreads.map((n) => [n.id, n.title]))

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
          <span>{thread.title}</span>
        </p>
        <JournalThreadEditableFields
          journalId={journal.id}
          threadId={thread.id}
          title={thread.title}
          description={thread.description}
          shareToggle={
            <ShareToggle
              journalId={journal.id}
              scope="THREAD"
              entityId={thread.id}
              initialShareId={threadShare?.id ?? null}
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
            journalEntityType="THREAD"
            journalEntityId={thread.id}
            links={links}
          />
        </div>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={thread.title}
          deleteEndpoint={`/api/v1/journals/${journal.id}/threads/${thread.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
