import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const sessions = await db.gameSession.findMany({
    where: { campaignId },
    select: {
      id: true, number: true, title: true, status: true,
      playedOn: true, gmSummary: true, aiSummary: true,
      _count: { select: { entityTags: true } },
    },
    orderBy: { number: 'desc' },
  })

  return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] }
}
