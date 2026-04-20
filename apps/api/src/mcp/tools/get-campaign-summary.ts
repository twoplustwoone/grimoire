import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const [campaign, openThreads, recentSessions, activeNPCs, playerCharacters, recentEvents] = await Promise.all([
    db.campaign.findUnique({
      where: { id: campaignId },
      select: {
        name: true,
        description: true,
        settings: true,
        _count: {
          select: { npcs: true, playerCharacters: true, locations: true, factions: true, threads: true, clues: true, sessions: true },
        },
      },
    }),
    db.thread.findMany({
      where: { campaignId, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
      select: { id: true, title: true, urgency: true, status: true, description: true },
      orderBy: { urgency: 'asc' },
    }),
    db.gameSession.findMany({
      where: { campaignId },
      select: { id: true, number: true, title: true, status: true, aiSummary: true, playedOn: true },
      orderBy: { number: 'desc' },
      take: 3,
    }),
    db.nPC.findMany({
      where: { campaignId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true, description: true },
      take: 10,
    }),
    db.playerCharacter.findMany({
      where: { campaignId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        linkedUser: { select: { name: true, email: true } },
      },
    }),
    db.worldEvent.findMany({
      where: { campaignId },
      select: { title: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ campaign, openThreads, recentSessions, activeNPCs, playerCharacters, recentWorldEvents: recentEvents }, null, 2),
    }],
  }
}
