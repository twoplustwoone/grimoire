import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const threads = await db.thread.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
    include: { entityTags: true },
    orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
  })

  return { content: [{ type: 'text', text: JSON.stringify(threads, null, 2) }] }
}
