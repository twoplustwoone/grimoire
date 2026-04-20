import type { PrismaClient } from '@grimoire/db'

export async function handler(
  _args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const memberships = await db.campaignMembership.findMany({
    where: { userId },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          _count: {
            select: { npcs: true, playerCharacters: true, locations: true, factions: true, threads: true, clues: true, sessions: true },
          },
        },
      },
    },
  })
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(memberships.map(m => ({ ...m.campaign, role: m.role })), null, 2),
    }],
  }
}
