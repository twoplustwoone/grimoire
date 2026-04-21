import { z } from 'zod'
import type { PrismaClient, Prisma } from '@grimoire/db'
import { EntityType } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'
import { validateInput } from '../errors.js'

const inputSchema = z.object({
  campaignId: z.string().min(1),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1),
  playerUserIds: z.array(z.string().min(1)).min(1, 'at least one playerUserId is required'),
  displayName: z.string().nullable(),
  displayDescription: z.string().nullable(),
})

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { campaignId, entityType, entityId, playerUserIds, displayName, displayDescription } =
    validateInput(inputSchema, args)
  await requireGM(userId, campaignId, db)

  const entity = await findEntity(db, entityType, entityId, campaignId)
  if (!entity) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${entityType} not found in this campaign`
    )
  }

  const uniqueUserIds = Array.from(new Set(playerUserIds))

  const memberships = await db.campaignMembership.findMany({
    where: { campaignId, userId: { in: uniqueUserIds } },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  const byUserId = new Map(memberships.map((m) => [m.userId, m]))

  for (const uid of uniqueUserIds) {
    const m = byUserId.get(uid)
    if (!m) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `User ${uid} is not a member of this campaign`
      )
    }
    if (m.role === 'GM' || m.role === 'CO_GM') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Cannot reveal entities to a GM — GMs see all entities by default'
      )
    }
  }

  const reveals = await db.$transaction(async (tx) => {
    const result: Array<{ userId: string; displayName: string | null; displayDescription: string | null }> = []

    for (const uid of uniqueUserIds) {
      const m = byUserId.get(uid)!
      const reveal = await tx.entityReveal.upsert({
        where: {
          entityType_entityId_userId: {
            entityType,
            entityId,
            userId: uid,
          },
        },
        create: {
          campaignId,
          entityType,
          entityId,
          userId: uid,
          displayName,
          displayDescription,
        },
        update: {
          displayName,
          displayDescription,
        },
      })

      await tx.changelogEntry.create({
        data: {
          entityType,
          entityId,
          campaignId,
          authorId: userId,
          field: 'revealed',
          oldValue: null,
          newValue: m.user.name ?? m.user.email,
          note: 'Entity revealed via MCP',
        },
      })

      result.push({
        userId: reveal.userId!,
        displayName: reveal.displayName,
        displayDescription: reveal.displayDescription,
      })
    }

    return result
  })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ entityId, entityType, reveals }, null, 2),
    }],
  }
}

async function findEntity(
  db: PrismaClient | Prisma.TransactionClient,
  entityType: EntityType,
  entityId: string,
  campaignId: string
): Promise<{ id: string } | null> {
  switch (entityType) {
    case 'NPC':
      return db.nPC.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'PLAYER_CHARACTER':
      return db.playerCharacter.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'LOCATION':
      return db.location.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'FACTION':
      return db.faction.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'THREAD':
      return db.thread.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'CLUE':
      return db.clue.findFirst({ where: { id: entityId, campaignId, deletedAt: null }, select: { id: true } })
    case 'WORLD_EVENT':
      return db.worldEvent.findFirst({ where: { id: entityId, campaignId }, select: { id: true } })
    case 'SESSION':
      return db.gameSession.findFirst({ where: { id: entityId, campaignId }, select: { id: true } })
    case 'MEMBERSHIP':
      throw new McpError(ErrorCode.InvalidParams, 'MEMBERSHIP is not a revealable entity type')
  }
}
