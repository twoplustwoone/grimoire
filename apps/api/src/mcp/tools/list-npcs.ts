import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const npcs = await db.nPC.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      location: { select: { name: true } },
      factionMemberships: { include: { faction: { select: { name: true } } } },
    },
    orderBy: { name: 'asc' },
  })

  return { content: [{ type: 'text', text: JSON.stringify(npcs, null, 2) }] }
}
