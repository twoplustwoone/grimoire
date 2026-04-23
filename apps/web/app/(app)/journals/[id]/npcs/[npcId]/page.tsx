import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalNpcEditableFields } from '@/components/entities/journal-npc-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { CrossReferencesSection } from './cross-references-section'

interface Props {
  params: Promise<{ id: string; npcId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, npcId } = await params
  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, ownerType: 'JOURNAL', ownerId: id },
    select: { name: true },
  })
  return { title: npc?.name ?? 'NPC' }
}

export default async function JournalNpcPage({ params }: Props) {
  const { id, npcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
  })
  if (!npc) notFound()

  // Fetch cross-references for this entity; hydrate campaign-side names.
  const linkRows = journal.linkedCampaignId
    ? await prisma.journalLink.findMany({
        where: {
          journalId: journal.id,
          journalEntityType: 'NPC',
          journalEntityId: npc.id,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const campaignNpcIds = linkRows
    .filter((l) => l.campaignEntityType === 'NPC')
    .map((l) => l.campaignEntityId)
  const campaignNpcs = campaignNpcIds.length
    ? await prisma.nPC.findMany({
        where: { id: { in: campaignNpcIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(campaignNpcs.map((n) => [n.id, n.name]))

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
          <span>{npc.name}</span>
        </p>
        <JournalNpcEditableFields
          journalId={journal.id}
          npcId={npc.id}
          name={npc.name}
          description={npc.description}
        />
      </div>

      {journal.linkedCampaignId && (
        <div className="mb-8">
          <CrossReferencesSection
            journalId={journal.id}
            linkedCampaignId={journal.linkedCampaignId}
            npcId={npc.id}
            links={links}
          />
        </div>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={npc.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}/npcs/${npc.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
