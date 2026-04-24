import type { Metadata } from 'next'
import { prisma } from '@grimoire/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { JournalLocationEditableFields } from '@/components/entities/journal-location-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { ShareToggle } from '@/components/journals/share-toggle'
import { JournalCrossReferencesSection } from '@/components/journals/cross-references-section'
import { requireJournalOwner } from '@/lib/journal-auth'

interface Props {
  params: Promise<{ id: string; locationId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locationId } = await params
  const location = await prisma.location.findFirst({
    where: { id: locationId, ownerType: 'JOURNAL', ownerId: id },
    select: { name: true },
  })
  return { title: location?.name ?? 'Location' }
}

export default async function JournalLocationPage({ params }: Props) {
  const { id, locationId } = await params
  const { journal } = await requireJournalOwner(id)

  const location = await prisma.location.findFirst({
    where: { id: locationId, ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null },
  })
  if (!location) notFound()

  const shares = await prisma.journalShare.findMany({
    where: { journalId: journal.id },
    select: { id: true, sharedEntityType: true, sharedEntityId: true },
  })
  const isJournalWideShare = shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const locationShare = shares.find(
    (s) => s.sharedEntityType === 'LOCATION' && s.sharedEntityId === location.id
  )
  const hasLinkedCampaign = journal.linkedCampaignId !== null

  const linkRows = journal.linkedCampaignId
    ? await prisma.journalLink.findMany({
        where: {
          journalId: journal.id,
          journalEntityType: 'LOCATION',
          journalEntityId: location.id,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const campaignLocationIds = linkRows
    .filter((l) => l.campaignEntityType === 'LOCATION')
    .map((l) => l.campaignEntityId)
  const campaignLocations = campaignLocationIds.length
    ? await prisma.location.findMany({
        where: { id: { in: campaignLocationIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(campaignLocations.map((n) => [n.id, n.name]))

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
          <Link href={`/journals/${journal.id}/locations`} className="hover:underline">Locations</Link>
          {' / '}
          <span>{location.name}</span>
        </p>
        <JournalLocationEditableFields
          journalId={journal.id}
          locationId={location.id}
          name={location.name}
          description={location.description}
          shareToggle={
            <ShareToggle
              journalId={journal.id}
              scope="LOCATION"
              entityId={location.id}
              initialShareId={locationShare?.id ?? null}
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
            journalEntityType="LOCATION"
            journalEntityId={location.id}
            links={links}
          />
        </div>
      )}

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={location.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}/locations/${location.id}`}
          redirectTo={`/journals/${journal.id}`}
        />
      </div>
    </div>
  )
}
