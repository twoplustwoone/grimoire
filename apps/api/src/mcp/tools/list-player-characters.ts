import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  await requireMember(userId, campaignId, db)

  const pcs = await db.playerCharacter.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  })

  return { content: [{ type: 'text', text: JSON.stringify(pcs, null, 2) }] }
}
