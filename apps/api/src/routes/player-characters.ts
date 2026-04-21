import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'

const playerCharacters = new Hono()

playerCharacters.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

function isGM(role: string | undefined) {
  return role === 'GM' || role === 'CO_GM'
}

playerCharacters.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const pcs = await prisma.playerCharacter.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  })

  return c.json(pcs)
})

playerCharacters.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!isGM(membership.role)) return c.json({ error: 'Not authorized' }, 403)

  const body = await c.req.json()
  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const pc = await prisma.playerCharacter.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      linkedUserId: body.linkedUserId ?? null,
      status: body.status ?? 'ACTIVE',
      externalUrl: body.externalUrl?.trim() ?? null,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'PLAYER_CHARACTER',
      entityId: pc.id,
      campaignId,
      authorId: user.id,
      field: 'created',
      newValue: pc.name,
    },
  })

  const players = await prisma.campaignMembership.findMany({
    where: { campaignId, role: 'PLAYER' },
    select: { userId: true },
  })

  for (const { userId } of players) {
    await prisma.entityReveal.upsert({
      where: {
        entityType_entityId_userId: {
          entityType: 'PLAYER_CHARACTER',
          entityId: pc.id,
          userId,
        },
      },
      create: {
        campaignId,
        entityType: 'PLAYER_CHARACTER',
        entityId: pc.id,
        userId,
      },
      update: {},
    })
  }

  return c.json(pc, 201)
})

playerCharacters.get('/:pcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const pc = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
    },
  })
  if (!pc) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({
    where: { entityType: 'PLAYER_CHARACTER', entityId: pcId },
    orderBy: { createdAt: 'desc' },
  })

  const changelog = await prisma.changelogEntry.findMany({
    where: { entityType: 'PLAYER_CHARACTER', entityId: pcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return c.json({ ...pc, notes, changelog })
})

playerCharacters.patch('/:pcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!isGM(membership.role)) return c.json({ error: 'Not authorized' }, 403)

  const existing = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  const updated = await prisma.playerCharacter.update({
    where: { id: pcId },
    data: {
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? (body.description?.trim() ?? null) : existing.description,
      status: body.status ?? existing.status,
      linkedUserId: body.linkedUserId !== undefined ? body.linkedUserId : existing.linkedUserId,
      externalUrl: body.externalUrl !== undefined ? (body.externalUrl?.trim() ?? null) : existing.externalUrl,
    },
  })

  const fieldsToTrack = ['name', 'description', 'status', 'linkedUserId', 'externalUrl'] as const
  for (const field of fieldsToTrack) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: {
          entityType: 'PLAYER_CHARACTER',
          entityId: pcId,
          campaignId,
          authorId: user.id,
          field,
          oldValue: String((existing as Record<string, unknown>)[field] ?? ''),
          newValue: String(body[field] ?? ''),
        },
      })
    }
  }

  return c.json(updated)
})

playerCharacters.delete('/:pcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!isGM(membership.role)) return c.json({ error: 'Not authorized' }, 403)

  const existing = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.playerCharacter.update({
    where: { id: pcId },
    data: { deletedAt: new Date() },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'PLAYER_CHARACTER',
      entityId: pcId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.name,
      newValue: null,
    },
  })

  return c.json({ success: true })
})

playerCharacters.get('/:pcId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({
    where: { entityType: 'PLAYER_CHARACTER', entityId: pcId },
    orderBy: { createdAt: 'desc' },
  })

  return c.json(notes)
})

playerCharacters.post('/:pcId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!

  const membership = await getMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)
  if (!isGM(membership.role)) return c.json({ error: 'Not authorized' }, 403)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.create({
    data: {
      entityType: 'PLAYER_CHARACTER',
      entityId: pcId,
      campaignId,
      authorId: user.id,
      content: body.content,
      mentions,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'PLAYER_CHARACTER',
      entityId: pcId,
      campaignId,
      authorId: user.id,
      field: 'note',
      oldValue: null,
      newValue: plaintext,
      note: 'Note added',
    },
  })

  return c.json(note, 201)
})

playerCharacters.patch('/:pcId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const pcId = c.req.param('pcId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.note.findUnique({ where: { id: noteId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.authorId !== user.id) return c.json({ error: 'Not authorized' }, 403)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content: body.content, mentions },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'PLAYER_CHARACTER',
      entityId: pcId,
      campaignId,
      authorId: user.id,
      field: 'note',
      oldValue: docToPlainText(existing.content),
      newValue: plaintext,
      note: 'Note edited',
    },
  })

  return c.json(note)
})

playerCharacters.delete('/:pcId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.note.findUnique({ where: { id: noteId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.authorId !== user.id) return c.json({ error: 'Not authorized' }, 403)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

export default playerCharacters
