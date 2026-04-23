import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalFactionEditableFields } from '@/components/entities/journal-faction-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { ShareToggle } from '@/components/journals/share-toggle'
import { JournalCrossReferencesSection } from '@/components/journals/cross-references-section'

interface Props {
  params: Promise<{ id: string; factionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, factionId } = await params
  const faction = await prisma.faction.findFirst({
    where: { id: factionId, ownerType: 'JOURNAL', ownerId: id },
    select: { name: true },
  })
  return { title: faction?.name ?? 'Faction' }
}

export default async function JournalFactionPage({ params }: Props) {
  const { id, factionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const faction = await prisma.faction.findFirst({
    where: { id: factionId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
  })
  if (!faction) notFound()

  const shares = await prisma.journalShare.findMany({
    where: { journalId: journal.id },
    select: { id: true, sharedEntityType: true, sharedEntityId: true },
  })
  const isJournalWideShare = shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const factionShare = shares.find(
    (s) => s.sharedEntityType === 'FACTION' && s.sharedEntityId === faction.id
  )
  const hasLinkedCampaign = journal.linkedCampaignId !== null

  const linkRows = journal.linkedCampaignId
    ? await prisma.journalLink.findMany({
        where: {
          journalId: journal.id,
          journalEntityType: 'FACTION',
          journalEntityId: faction.id,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const campaignFactionIds = linkRows
    .filter((l) => l.campaignEntityType === 'FACTION')
    .map((l) => l.campaignEntityId)
  const campaignFactions = campaignFactionIds.length
    ? await prisma.faction.findMany({
        where: { id: { in: campaignFactionIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(campaignFactions.map((n) => [n.id, n.name]))

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
          <span>{faction.name}</span>
        </p>
        <JournalFactionEditableFields
          journalId={journal.id}
          factionId={faction.id}
          name={faction.name}
          description={faction.description}
          shareToggle={
            <ShareToggle
              journalId={journal.id}
              scope="FACTION"
              entityId={faction.id}
              initialShareId={factionShare?.id ?? null}
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
            journalEntityType="FACTION"
            journalEntityId={faction.id}
            links={links}
          />
        </div>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={faction.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}/factions/${faction.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
