import type { PrismaClient } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  const sessionId = args.sessionId as string
  await requireMember(userId, campaignId, db)

  const session = await db.gameSession.findFirst({
    where: { id: sessionId, campaignId },
    include: { entityTags: true },
  })
  if (!session) throw new McpError(ErrorCode.InvalidParams, 'Session not found in this campaign')

  const notes = await db.note.findMany({
    where: { entityType: 'SESSION', entityId: sessionId },
    orderBy: { createdAt: 'asc' },
  })

  return { content: [{ type: 'text', text: JSON.stringify({ ...session, notes }, null, 2) }] }
}
