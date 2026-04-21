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
        },
      },
    },
  })

  const campaigns = await Promise.all(
    memberships.map(async (m) => {
      const ownedBy = { ownerType: 'CAMPAIGN' as const, ownerId: m.campaignId }
      const [npcs, playerCharacters, locations, factions, threads, clues, sessions] =
        await Promise.all([
          db.nPC.count({ where: { ...ownedBy, deletedAt: null } }),
          db.playerCharacter.count({ where: { ...ownedBy, deletedAt: null } }),
          db.location.count({ where: { ...ownedBy, deletedAt: null } }),
          db.faction.count({ where: { ...ownedBy, deletedAt: null } }),
          db.thread.count({ where: { ...ownedBy, deletedAt: null } }),
          db.clue.count({ where: { ...ownedBy, deletedAt: null } }),
          db.gameSession.count({ where: ownedBy }),
        ])
      return {
        ...m.campaign,
        role: m.role,
        _count: { npcs, playerCharacters, locations, factions, threads, clues, sessions },
      }
    })
  )

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(campaigns, null, 2),
    }],
  }
}
