import { z } from 'zod'
import type { PrismaClient } from '@grimoire/db'
import { EntityType } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { requireGM } from '../auth.js'
import { validateInput } from '../errors.js'

const inputSchema = z.object({
  campaignId: z.string().min(1),
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1),
  noteId: z.string().nullable(),
  content: z.record(z.any()),
})

export async function handler(
  args: Record<string, unknown>,
  userId: string,
  db: PrismaClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { campaignId, entityType, entityId, noteId, content } = validateInput(inputSchema, args)
  await requireGM(userId, campaignId, db)

  if (!isProseMirrorDoc(content)) {
    throw new McpError(ErrorCode.InvalidParams, 'content must be a ProseMirror doc (type: "doc")')
  }
  const plaintext = docToPlainText(content).trim()
  if (!plaintext) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid input: content is required')
  }
  const mentions = extractMentionsFromDoc(content)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentJson = content as any
  const note = await db.$transaction(async (tx) => {
    if (noteId === null) {
      const created = await tx.note.create({
        data: {
          entityType,
          entityId,
          campaignId,
          authorId: userId,
          content: contentJson,
          mentions,
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
          newValue: plaintext,
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
      data: { content: contentJson, mentions },
    })
    await tx.changelogEntry.create({
      data: {
        entityType,
        entityId,
        campaignId,
        authorId: userId,
        field: 'note',
        oldValue: docToPlainText(existing.content),
        newValue: plaintext,
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
        content: plaintext,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }, null, 2),
    }],
  }
}
