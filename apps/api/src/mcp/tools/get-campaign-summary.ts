import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const ownedBy = { ownerType: 'CAMPAIGN' as const, ownerId: campaignId }

  const [
    campaign,
    openThreads,
    recentSessions,
    activeNPCs,
    playerCharacters,
    recentEvents,
    counts,
  ] = await Promise.all([
    db.campaign.findUnique({
      where: { id: campaignId },
      select: { name: true, description: true, settings: true },
    }),
    db.thread.findMany({
      where: { ...ownedBy, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
      select: { id: true, title: true, urgency: true, status: true, description: true },
      orderBy: { urgency: 'asc' },
    }),
    db.gameSession.findMany({
      where: ownedBy,
      select: { id: true, number: true, title: true, status: true, aiSummary: true, playedOn: true },
      orderBy: { number: 'desc' },
      take: 3,
    }),
    db.nPC.findMany({
      where: { ...ownedBy, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true, description: true },
      take: 10,
    }),
    db.playerCharacter.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        linkedUser: { select: { name: true, email: true } },
      },
    }),
    db.worldEvent.findMany({
      where: ownedBy,
      select: { title: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    Promise.all([
      db.nPC.count({ where: { ...ownedBy, deletedAt: null } }),
      db.playerCharacter.count({ where: { ...ownedBy, deletedAt: null } }),
      db.location.count({ where: { ...ownedBy, deletedAt: null } }),
      db.faction.count({ where: { ...ownedBy, deletedAt: null } }),
      db.thread.count({ where: { ...ownedBy, deletedAt: null } }),
      db.clue.count({ where: { ...ownedBy, deletedAt: null } }),
      db.gameSession.count({ where: ownedBy }),
    ]).then(([npcs, playerCharacters, locations, factions, threads, clues, sessions]) => ({
      npcs, playerCharacters, locations, factions, threads, clues, sessions,
    })),
  ])

  const summary = campaign ? { ...campaign, _count: counts } : null

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ campaign: summary, openThreads, recentSessions, activeNPCs, playerCharacters, recentWorldEvents: recentEvents }, null, 2),
    }],
  }
}
