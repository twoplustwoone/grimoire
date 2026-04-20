import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { NpcEditableFields } from '@/components/entities/npc-editable-fields'
import { ChangelogList } from '@/components/entities/changelog-list'
import { NpcAssignments } from '@/components/entities/npc-assignments'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityNotes } from '@/components/entities/entity-notes'
import { InformationNodes } from '@/components/entities/information-nodes'
import { EntityRevealPanel } from '@/components/entities/entity-reveal-panel'

interface Props {
  params: Promise<{ id: string; npcId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, npcId } = await params
  const [npc, campaign] = await Promise.all([
    prisma.nPC.findUnique({ where: { id: npcId }, select: { name: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { name: true } }),
  ])
  return { title: `${npc?.name ?? 'NPC'} — ${campaign?.name ?? 'Campaign'}` }
}

export default async function NPCDetailPage({ params }: Props) {
  const { id: campaignId, npcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
  })
  if (!npc) notFound()

  const notes = await prisma.note.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
  })

  const changelog = await prisma.changelogEntry.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const infoNodes = await prisma.informationNode.findMany({
    where: { campaignId, entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'asc' },
  })

  const [availableLocations, availableFactions, players] = await Promise.all([
    prisma.location.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.faction.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.campaignMembership.findMany({
      where: { campaignId, role: 'PLAYER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  const playerMembers = players.map(m => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
  }))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">
            {membership.campaign.name}
          </Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}/npcs`} className="hover:underline">NPCs</Link>
          {' / '}
          <span>{npc.name}</span>
        </p>
        <NpcEditableFields
          campaignId={campaignId}
          npcId={npcId}
          name={npc.name}
          description={npc.description}
          status={npc.status}
        />
      </div>

      <NpcAssignments
        campaignId={campaignId}
        npcId={npcId}
        currentLocationId={npc.locationId}
        currentLocation={npc.location}
        factionMemberships={npc.factionMemberships}
        availableLocations={availableLocations}
        availableFactions={availableFactions}
      />

      <InformationNodes
        nodes={infoNodes}
        campaignId={campaignId}
        entityType="NPC"
        entityId={npcId}
      />

      {isGM && players.length > 0 && (
        <EntityRevealPanel
          campaignId={campaignId}
          entityType="NPC"
          entityId={npcId}
          entityName={npc.name}
          members={playerMembers}
        />
      )}

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/npcs/${npcId}/notes`}
          campaignId={campaignId}
          entityType="NPC"
          entityId={npcId}
        />
      </div>

      <ChangelogList entries={changelog} />

      <div className="mt-8 pt-6 border-t border-destructive/20">
        <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
        <DeleteEntityButton
          entityName={npc.name}
          deleteEndpoint={`/api/v1/campaigns/${campaignId}/npcs/${npcId}`}
          redirectTo={`/campaigns/${campaignId}/npcs`}
        />
      </div>
    </div>
  )
}
