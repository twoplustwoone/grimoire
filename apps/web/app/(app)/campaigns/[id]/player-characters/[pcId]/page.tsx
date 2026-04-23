import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PcEditableFields } from '@/components/entities/pc-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityNotes } from '@/components/entities/entity-notes'
import { InformationNodes } from '@/components/entities/information-nodes'
import { EntityRevealPanel } from '@/components/entities/entity-reveal-panel'
import { ChangelogList } from '@/components/entities/changelog-list'

interface Props {
  params: Promise<{ id: string; pcId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, pcId } = await params
  const [pc, campaign] = await Promise.all([
    prisma.playerCharacter.findUnique({ where: { id: pcId }, select: { name: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { name: true } }),
  ])
  return { title: `${pc?.name ?? 'PC'} — ${campaign?.name ?? 'Campaign'}` }
}

export default async function PlayerCharacterDetailPage({ params }: Props) {
  const { id: campaignId, pcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const pc = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
      campaignMirror: {
        include: {
          journalPc: {
            select: {
              id: true,
              ownerId: true,
              linkedUser: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  })
  if (!pc) notFound()

  const mirror = pc.campaignMirror
    ? {
        ownerName:
          pc.campaignMirror.journalPc.linkedUser?.name ??
          pc.campaignMirror.journalPc.linkedUser?.email ??
          null,
        viewerIsMirrorPlayer:
          pc.campaignMirror.journalPc.linkedUser?.id === session.user.id,
        journalId: pc.campaignMirror.journalPc.ownerId,
        journalPcId: pc.campaignMirror.journalPc.id,
      }
    : null

  const [notes, changelog, infoNodes, playerMembers] = await Promise.all([
    prisma.note.findMany({
      where: { entityType: 'PLAYER_CHARACTER', entityId: pcId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.changelogEntry.findMany({
      where: { entityType: 'PLAYER_CHARACTER', entityId: pcId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.informationNode.findMany({
      where: { campaignId, entityType: 'PLAYER_CHARACTER', entityId: pcId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.campaignMembership.findMany({
      where: { campaignId, role: 'PLAYER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  const playerOptions = playerMembers.map(m => ({
    userId: m.userId,
    label: m.user.name ?? m.user.email,
  }))
  const revealMembers = playerMembers.map(m => ({
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
          <Link href={`/campaigns/${campaignId}/player-characters`} className="hover:underline">
            Player Characters
          </Link>
          {' / '}
          <span>{pc.name}</span>
        </p>
        <PcEditableFields
          campaignId={campaignId}
          pcId={pcId}
          name={pc.name}
          description={pc.description}
          status={pc.status}
          linkedUserId={pc.linkedUserId}
          players={playerOptions}
          isGM={isGM}
          mirror={mirror}
        />
        {pc.linkedUser && (
          <p className="mt-2 text-sm text-muted-foreground">
            Played by {pc.linkedUser.name ?? pc.linkedUser.email}
          </p>
        )}
      </div>

      <InformationNodes
        nodes={infoNodes}
        campaignId={campaignId}
        entityType="PLAYER_CHARACTER"
        entityId={pcId}
      />

      {isGM && revealMembers.length > 0 && (
        <EntityRevealPanel
          campaignId={campaignId}
          entityType="PLAYER_CHARACTER"
          entityId={pcId}
          entityName={pc.name}
          members={revealMembers}
        />
      )}

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/player-characters/${pcId}/notes`}
          campaignId={campaignId}
          entityType="PLAYER_CHARACTER"
          entityId={pcId}
        />
      </div>

      <ChangelogList entries={changelog} />

      {isGM && (
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
          <DeleteEntityButton
            entityName={pc.name}
            deleteEndpoint={`/api/v1/campaigns/${campaignId}/player-characters/${pcId}`}
            redirectTo={`/campaigns/${campaignId}/player-characters`}
          />
        </div>
      )}
    </div>
  )
}
