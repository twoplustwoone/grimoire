import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PlayerPortalView } from './player-portal-view'

interface Props {
  params: Promise<{ campaignId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { campaignId } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { name: true } })
  return { title: `${campaign?.name ?? 'Campaign'} — Player View` }
}

export default async function PlayerPortalPage({ params }: Props) {
  const { campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: true },
  })
  if (!membership) notFound()

  const reveals = await prisma.entityReveal.findMany({
    where: {
      campaignId,
      OR: [
        { userId: session.user.id },
        { userId: null },
      ],
    },
  })

  const allNodes = await prisma.informationNode.findMany({
    where: { campaignId },
  })

  const specificRevealIds = await prisma.informationNodeReveal.findMany({
    where: { membership: { userId: session.user.id, campaignId } },
    select: { informationNodeId: true },
  })
  const specificRevealSet = new Set(specificRevealIds.map(r => r.informationNodeId))

  const visibleNodes = allNodes.filter(node => {
    if (node.visibility === 'GM_ONLY') return false
    if (node.visibility === 'ALL_PLAYERS') return true
    if (node.visibility === 'SPECIFIC_PLAYERS') return specificRevealSet.has(node.id)
    return false
  })

  const revealMap = new Map(reveals.map(r => [r.entityId, r]))

  const revealedEntityIdsByType = {
    NPC: reveals.filter(r => r.entityType === 'NPC').map(r => r.entityId),
    PLAYER_CHARACTER: reveals.filter(r => r.entityType === 'PLAYER_CHARACTER').map(r => r.entityId),
    LOCATION: reveals.filter(r => r.entityType === 'LOCATION').map(r => r.entityId),
    FACTION: reveals.filter(r => r.entityType === 'FACTION').map(r => r.entityId),
    THREAD: reveals.filter(r => r.entityType === 'THREAD').map(r => r.entityId),
    CLUE: reveals.filter(r => r.entityType === 'CLUE').map(r => r.entityId),
  }

  const [npcs, pcs, locations, factions, threads, clues, yourCharacter] = await Promise.all([
    revealedEntityIdsByType.NPC.length > 0
      ? prisma.nPC.findMany({ where: { id: { in: revealedEntityIdsByType.NPC }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedEntityIdsByType.PLAYER_CHARACTER.length > 0
      ? prisma.playerCharacter.findMany({ where: { id: { in: revealedEntityIdsByType.PLAYER_CHARACTER }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedEntityIdsByType.LOCATION.length > 0
      ? prisma.location.findMany({ where: { id: { in: revealedEntityIdsByType.LOCATION }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedEntityIdsByType.FACTION.length > 0
      ? prisma.faction.findMany({ where: { id: { in: revealedEntityIdsByType.FACTION }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedEntityIdsByType.THREAD.length > 0
      ? prisma.thread.findMany({ where: { id: { in: revealedEntityIdsByType.THREAD }, deletedAt: null }, select: { id: true, title: true, description: true } })
      : [],
    revealedEntityIdsByType.CLUE.length > 0
      ? prisma.clue.findMany({ where: { id: { in: revealedEntityIdsByType.CLUE }, deletedAt: null }, select: { id: true, title: true, description: true } })
      : [],
    prisma.playerCharacter.findFirst({
      where: { campaignId, linkedUserId: session.user.id, deletedAt: null },
      select: { id: true, name: true, description: true },
    }),
  ])

  function applyNameReveal(entity: { id: string; name: string; description: string | null }) {
    const reveal = revealMap.get(entity.id)
    return {
      id: entity.id,
      name: reveal?.displayName ?? entity.name,
      description: reveal?.displayDescription ?? entity.description ?? '',
      isNameRevealed: !reveal?.displayName,
      nodes: visibleNodes.filter(n => n.entityId === entity.id),
    }
  }

  function applyTitleReveal(entity: { id: string; title: string; description: string | null }) {
    const reveal = revealMap.get(entity.id)
    return {
      id: entity.id,
      name: reveal?.displayName ?? entity.title,
      description: reveal?.displayDescription ?? entity.description ?? '',
      isNameRevealed: !reveal?.displayName,
      nodes: visibleNodes.filter(n => n.entityId === entity.id),
    }
  }

  const otherPCs = yourCharacter
    ? pcs.filter(pc => pc.id !== yourCharacter.id)
    : pcs

  const portalData = {
    yourCharacter: yourCharacter
      ? {
          id: yourCharacter.id,
          name: yourCharacter.name,
          description: yourCharacter.description ?? '',
          isNameRevealed: true,
          nodes: visibleNodes.filter(n => n.entityId === yourCharacter.id),
        }
      : null,
    npcs: npcs.map(applyNameReveal),
    playerCharacters: otherPCs.map(applyNameReveal),
    locations: locations.map(applyNameReveal),
    factions: factions.map(applyNameReveal),
    threads: threads.map(applyTitleReveal),
    clues: clues.map(applyTitleReveal),
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <span>{membership.campaign.name}</span>
        </p>
        <h1 className="text-3xl font-bold">{membership.campaign.name}</h1>
        <p className="text-muted-foreground mt-1">What your character knows</p>
      </div>
      <PlayerPortalView data={portalData} />
    </div>
  )
}
