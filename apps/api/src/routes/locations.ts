import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'

const locations = new Hono()
locations.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

locations.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const list = await prisma.location.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      npcs: { where: { deletedAt: null }, select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
  return c.json(list)
})

locations.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.name?.trim()) return c.json({ error: 'Name is required' }, 400)

  const location = await prisma.location.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      parentId: body.parentId ?? null,
    },
  })

  await prisma.changelogEntry.create({
    data: { entityType: 'LOCATION', entityId: location.id, campaignId, authorId: user.id, field: 'created', newValue: location.name },
  })

  return c.json(location, 201)
})

locations.get('/:locationId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const locationId = c.req.param('locationId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const location = await prisma.location.findFirst({
    where: { id: locationId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      children: { where: { deletedAt: null }, select: { id: true, name: true } },
      npcs: { where: { deletedAt: null }, select: { id: true, name: true, status: true } },
    },
  })
  if (!location) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({ where: { entityType: 'LOCATION', entityId: locationId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'LOCATION', entityId: locationId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return c.json({ ...location, notes, changelog })
})

locations.patch('/:locationId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const locationId = c.req.param('locationId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.location.findFirst({ where: { id: locationId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.location.update({
    where: { id: locationId },
    data: {
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      status: body.status ?? existing.status,
      parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
    },
  })

  for (const field of ['name', 'description', 'status', 'parentId'] as const) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: { entityType: 'LOCATION', entityId: locationId, campaignId, authorId: user.id, field, oldValue: String((existing as Record<string, unknown>)[field] ?? ''), newValue: String(body[field] ?? '') },
      })
    }
  }

  return c.json(updated)
})

locations.patch('/:locationId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const locationId = c.req.param('locationId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.note.findUnique({ where: { id: noteId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

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
      entityType: 'LOCATION',
      entityId: locationId,
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

locations.delete('/:locationId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

locations.post('/:locationId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const locationId = c.req.param('locationId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.create({
    data: {
      entityType: 'LOCATION',
      entityId: locationId,
      campaignId,
      authorId: user.id,
      content: body.content,
      mentions,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'LOCATION',
      entityId: locationId,
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

locations.delete('/:locationId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const locationId = c.req.param('locationId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.location.findFirst({ where: { id: locationId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } })
  await prisma.changelogEntry.create({
    data: {
      entityType: 'LOCATION',
      entityId: locationId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.name,
      newValue: null,
    },
  })
  return c.json({ success: true })
})

export default locations
