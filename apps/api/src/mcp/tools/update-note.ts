import { z } from 'zod'
import type { PrismaClient } from '@grimoire/db'
import { EntityType } from '@grimoire/db'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'
import { validateInput } from '../errors.js'

const inputSchema = z.object({
  campaignId: z.string().min(1),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1),
  noteId: z.string().nullable(),
  content: z.string().min(1, 'content is required'),
})

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { campaignId, entityType, entityId, noteId, content } = validateInput(inputSchema, args)
  await requireGM(userId, campaignId, db)

  const trimmed = content.trim()
  if (!trimmed) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid input: content is required')
  }

  const note = await db.$transaction(async (tx) => {
    if (noteId === null) {
      const created = await tx.note.create({
        data: {
          entityType,
          entityId,
          campaignId,
          authorId: userId,
          content: trimmed,
        },
      })
      await tx.changelogEntry.create({
        data: {
          entityType,
          entityId,
          campaignId,
          authorId: userId,
          field: 'note',
          oldValue: null,
          newValue: trimmed,
          note: 'Note added via MCP',
        },
      })
      return created
    }

    const existing = await tx.note.findUnique({ where: { id: noteId } })
    if (!existing) {
      throw new McpError(ErrorCode.InvalidParams, 'Note not found')
    }
    if (existing.campaignId !== campaignId) {
      throw new McpError(ErrorCode.InvalidParams, 'Note does not belong to this campaign')
    }
    if (existing.entityType !== entityType || existing.entityId !== entityId) {
      throw new McpError(ErrorCode.InvalidParams, 'Note does not belong to the specified entity')
    }

    const updated = await tx.note.update({
      where: { id: noteId },
      data: { content: trimmed },
    })
    await tx.changelogEntry.create({
      data: {
        entityType,
        entityId,
        campaignId,
        authorId: userId,
        field: 'note',
        oldValue: existing.content,
        newValue: trimmed,
        note: 'Note edited via MCP',
      },
    })
    return updated
  })

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }, null, 2),
    }],
  }
}
