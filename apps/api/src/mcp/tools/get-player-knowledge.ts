import type { PrismaClient } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const campaignId = args.campaignId as string
  const playerEmail = args.playerEmail as string
  await requireGM(userId, campaignId, db)

  const player = await db.user.findFirst({ where: { email: playerEmail } })
  if (!player) throw new McpError(ErrorCode.InvalidParams, 'Player not found')

  const playerMembership = await db.campaignMembership.findFirst({
    where: { campaignId, userId: player.id },
  })
  if (!playerMembership) throw new McpError(ErrorCode.InvalidParams, 'Player is not in this campaign')

  const reveals = await db.entityReveal.findMany({
    where: {
      campaignId,
      OR: [{ userId: player.id }, { userId: null }],
    },
  })

  // Group reveal ids by entity type so we can resolve current name/description
  // in one query per type and omit any reveals pointing at soft-deleted entities.
  const idsByType: Record<string, string[]> = {}
  for (const r of reveals) (idsByType[r.entityType] ??= []).push(r.entityId)

  const [npcRows, pcRows, locRows, facRows, thrRows, clueRows] = await Promise.all([
    db.nPC.findMany({ where: { id: { in: idsByType.NPC ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
    db.playerCharacter.findMany({ where: { id: { in: idsByType.PLAYER_CHARACTER ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
    db.location.findMany({ where: { id: { in: idsByType.LOCATION ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
    db.faction.findMany({ where: { id: { in: idsByType.FACTION ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
    db.thread.findMany({ where: { id: { in: idsByType.THREAD ?? [] }, deletedAt: null }, select: { id: true, title: true, description: true } }),
    db.clue.findMany({ where: { id: { in: idsByType.CLUE ?? [] }, deletedAt: null }, select: { id: true, title: true, description: true } }),
  ])

  const lookup = new Map<string, { name: string; description: string | null }>()
  for (const e of npcRows) lookup.set(`NPC:${e.id}`, { name: e.name, description: e.description })
  for (const e of pcRows) lookup.set(`PLAYER_CHARACTER:${e.id}`, { name: e.name, description: e.description })
  for (const e of locRows) lookup.set(`LOCATION:${e.id}`, { name: e.name, description: e.description })
  for (const e of facRows) lookup.set(`FACTION:${e.id}`, { name: e.name, description: e.description })
  for (const e of thrRows) lookup.set(`THREAD:${e.id}`, { name: e.title, description: e.description })
  for (const e of clueRows) lookup.set(`CLUE:${e.id}`, { name: e.title, description: e.description })

  // Alias override precedence: reveal.displayName beats entity.name when present,
  // same for description. Reveals pointing at soft-deleted entities are dropped.
  const enrichedEntities = reveals.flatMap(r => {
    const base = lookup.get(`${r.entityType}:${r.entityId}`)
    if (!base) return []
    return [{
      entityType: r.entityType,
      entityId: r.entityId,
      displayName: r.displayName,
      displayDescription: r.displayDescription,
      isAlias: !!r.displayName,
      name: r.displayName ?? base.name,
      description: r.displayDescription ?? base.description,
    }]
  })

  const allNodes = await db.informationNode.findMany({ where: { campaignId } })
  const specificRevealIds = await db.informationNodeReveal.findMany({
    where: { membership: { userId: player.id, campaignId } },
    select: { informationNodeId: true },
  })
  const specificRevealSet = new Set(specificRevealIds.map(r => r.informationNodeId))

  const visibleNodes = allNodes.filter(n => {
    if (n.visibility === 'GM_ONLY') return false
    if (n.visibility === 'ALL_PLAYERS') return true
    return specificRevealSet.has(n.id)
  })

  const summary = {
    player: { name: player.name, email: player.email },
    revealedEntities: enrichedEntities.length,
    entities: enrichedEntities,
    visibleInformationNodes: visibleNodes.map(n => ({
      title: n.title,
      content: n.content,
      visibility: n.visibility,
      entityType: n.entityType,
      entityId: n.entityId,
    })),
  }

  return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
}
