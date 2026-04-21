import type { PrismaClient } from '@grimoire/db'
import { requireMember } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  const query = args.query as string
  await requireMember(userId, campaignId, db)

  const ownedBy = { ownerType: 'CAMPAIGN' as const, ownerId: campaignId }
  const where = (field: string) => ({
    ...ownedBy,
    deletedAt: null,
    [field]: { contains: query, mode: 'insensitive' as const },
  })

  const [npcs, playerCharacters, locations, factions, threads, clues] = await Promise.all([
    db.nPC.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
    db.playerCharacter.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
    db.location.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
    db.faction.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
    db.thread.findMany({ where: { ...ownedBy, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true, status: true }, take: 5 }),
    db.clue.findMany({ where: { ...ownedBy, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true }, take: 5 }),
  ])

  return { content: [{ type: 'text', text: JSON.stringify({ npcs, playerCharacters, locations, factions, threads, clues }, null, 2) }] }
}
