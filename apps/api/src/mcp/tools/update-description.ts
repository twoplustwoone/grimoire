import { z } from 'zod'
import type { PrismaClient, Prisma } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'
import { validateInput } from '../errors.js'

const DescriptionEntityType = z.enum([
  'NPC',
  'PLAYER_CHARACTER',
  'LOCATION',
  'FACTION',
  'THREAD',
  'CLUE',
])

const inputSchema = z.object({
  campaignId: z.string().min(1),
  entityType: DescriptionEntityType,
  entityId: z.string().min(1),
  description: z.string(),
})

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { campaignId, entityType, entityId, description } = validateInput(inputSchema, args)
  await requireGM(userId, campaignId, db)

  const next = description === '' ? null : description

  const result = await db.$transaction(async (tx) => {
    const updated = await updateEntityDescription(tx, entityType, entityId, campaignId, next)

    await tx.changelogEntry.create({
      data: {
        entityType,
        entityId,
        campaignId,
        authorId: userId,
        field: 'description',
        oldValue: updated.oldDescription,
        newValue: next,
        note: 'Description updated via MCP',
      },
    })
    return updated
  })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: result.id,
        description: result.description,
        updatedAt: result.updatedAt,
      }, null, 2),
    }],
  }
}

type UpdateResult = {
  id: string
  description: string | null
  updatedAt: Date
  oldDescription: string | null
}

async function updateEntityDescription(
  tx: Prisma.TransactionClient,
  entityType: z.infer<typeof DescriptionEntityType>,
  entityId: string,
  campaignId: string,
  description: string | null
): Promise<UpdateResult> {
  switch (entityType) {
    case 'NPC': {
      const existing = await tx.nPC.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'NPC not found in this campaign')
      const row = await tx.nPC.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
    case 'PLAYER_CHARACTER': {
      const existing = await tx.playerCharacter.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'PlayerCharacter not found in this campaign')
      const row = await tx.playerCharacter.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
    case 'LOCATION': {
      const existing = await tx.location.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Location not found in this campaign')
      const row = await tx.location.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
    case 'FACTION': {
      const existing = await tx.faction.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Faction not found in this campaign')
      const row = await tx.faction.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
    case 'THREAD': {
      const existing = await tx.thread.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Thread not found in this campaign')
      const row = await tx.thread.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
    case 'CLUE': {
      const existing = await tx.clue.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Clue not found in this campaign')
      const row = await tx.clue.update({ where: { id: entityId }, data: { description } })
      return { id: row.id, description: row.description, updatedAt: row.updatedAt, oldDescription: existing.description }
    }
  }
}
