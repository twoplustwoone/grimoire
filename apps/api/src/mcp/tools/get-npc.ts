import type { PrismaClient } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  const npcId = args.npcId as string
  await requireMember(userId, campaignId, db)

  const npc = await db.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
    include: {
      location: true,
      factionMemberships: { include: { faction: true } },
    },
  })
  if (!npc) throw new McpError(ErrorCode.InvalidParams, 'NPC not found in this campaign')

  const notes = await db.note.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return { content: [{ type: 'text', text: JSON.stringify({ ...npc, notes }, null, 2) }] }
}
