import { z } from 'zod'
import type { PrismaClient, Prisma } from '@grimoire/db'
import { EntityStatus, PlayerCharacterStatus, ThreadStatus } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'
import { validateInput } from '../errors.js'

const StatusEntityType = z.enum(['NPC', 'PLAYER_CHARACTER', 'LOCATION', 'FACTION', 'THREAD'])

const inputSchema = z.object({
  campaignId: z.string().min(1),
  entityType: StatusEntityType,
  entityId: z.string().min(1),
  status: z.string().min(1),
})

const VALID_STATUSES: Record<z.infer<typeof StatusEntityType>, readonly string[]> = {
  NPC: Object.values(EntityStatus),
  PLAYER_CHARACTER: Object.values(PlayerCharacterStatus),
  LOCATION: Object.values(EntityStatus),
  FACTION: Object.values(EntityStatus),
  THREAD: Object.values(ThreadStatus),
}

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { campaignId, entityType, entityId, status } = validateInput(inputSchema, args)
  await requireGM(userId, campaignId, db)

  const allowed = VALID_STATUSES[entityType]
  if (!allowed.includes(status)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid status for ${entityType}. Valid values: ${allowed.join(', ')}`
    )
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await updateEntityStatus(tx, entityType, entityId, campaignId, status)
    if (updated.noop) return updated

    await tx.changelogEntry.create({
      data: {
        entityType,
        entityId,
        campaignId,
        authorId: userId,
        field: 'status',
        oldValue: updated.oldStatus,
        newValue: status,
        note: 'Status updated via MCP',
      },
    })
    return updated
  })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: result.id,
        status: result.status,
        updatedAt: result.updatedAt,
      }, null, 2),
    }],
  }
}

type UpdateResult = {
  noop: false
  id: string
  status: string
  updatedAt: Date
  oldStatus: string
}

async function updateEntityStatus(
  tx: Prisma.TransactionClient,
  entityType: z.infer<typeof StatusEntityType>,
  entityId: string,
  campaignId: string,
  status: string
): Promise<UpdateResult> {
  switch (entityType) {
    case 'NPC': {
      const existing = await tx.nPC.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'NPC not found in this campaign')
      if (existing.status === status) throw noopError(entityType, status)
      const row = await tx.nPC.update({
        where: { id: entityId },
        data: { status: status as EntityStatus },
      })
      return { noop: false, id: row.id, status: row.status, updatedAt: row.updatedAt, oldStatus: existing.status }
    }
    case 'PLAYER_CHARACTER': {
      const existing = await tx.playerCharacter.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'PlayerCharacter not found in this campaign')
      if (existing.status === status) throw noopError(entityType, status)
      const row = await tx.playerCharacter.update({
        where: { id: entityId },
        data: { status: status as PlayerCharacterStatus },
      })
      return { noop: false, id: row.id, status: row.status, updatedAt: row.updatedAt, oldStatus: existing.status }
    }
    case 'LOCATION': {
      const existing = await tx.location.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Location not found in this campaign')
      if (existing.status === status) throw noopError(entityType, status)
      const row = await tx.location.update({
        where: { id: entityId },
        data: { status: status as EntityStatus },
      })
      return { noop: false, id: row.id, status: row.status, updatedAt: row.updatedAt, oldStatus: existing.status }
    }
    case 'FACTION': {
      const existing = await tx.faction.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Faction not found in this campaign')
      if (existing.status === status) throw noopError(entityType, status)
      const row = await tx.faction.update({
        where: { id: entityId },
        data: { status: status as EntityStatus },
      })
      return { noop: false, id: row.id, status: row.status, updatedAt: row.updatedAt, oldStatus: existing.status }
    }
    case 'THREAD': {
      const existing = await tx.thread.findFirst({ where: { id: entityId, campaignId, deletedAt: null } })
      if (!existing) throw new McpError(ErrorCode.InvalidParams, 'Thread not found in this campaign')
      if (existing.status === status) throw noopError(entityType, status)
      const row = await tx.thread.update({
        where: { id: entityId },
        data: { status: status as ThreadStatus },
      })
      return { noop: false, id: row.id, status: row.status, updatedAt: row.updatedAt, oldStatus: existing.status }
    }
  }
}

function noopError(entityType: string, status: string): McpError {
  return new McpError(ErrorCode.InvalidParams, `${entityType} status is already ${status}`)
}
