import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const threads = new Hono()
threads.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

threads.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const list = await prisma.thread.findMany({
    where: { campaignId, deletedAt: null },
    include: { entityTags: true },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
  })
  return c.json(list)
})

threads.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.title?.trim()) return c.json({ error: 'Title is required' }, 400)

  const thread = await prisma.thread.create({
    data: {
      campaignId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      urgency: body.urgency ?? 'MEDIUM',
    },
  })

  await prisma.changelogEntry.create({
    data: { entityType: 'THREAD', entityId: thread.id, campaignId, authorId: user.id, field: 'created', newValue: thread.title },
  })

  return c.json(thread, 201)
})

threads.get('/:threadId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const threadId = c.req.param('threadId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, campaignId, deletedAt: null },
    include: { entityTags: true },
  })
  if (!thread) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({ where: { entityType: 'THREAD', entityId: threadId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'THREAD', entityId: threadId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return c.json({ ...thread, notes, changelog })
})

threads.patch('/:threadId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const threadId = c.req.param('threadId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.thread.findFirst({ where: { id: threadId, campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.thread.update({
    where: { id: threadId },
    data: {
      title: body.title?.trim() ?? existing.title,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      status: body.status ?? existing.status,
      urgency: body.urgency ?? existing.urgency,
      resolvedNote: body.resolvedNote !== undefined ? body.resolvedNote?.trim() ?? null : existing.resolvedNote,
    },
  })

  for (const field of ['title', 'description', 'status', 'urgency', 'resolvedNote'] as const) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: { entityType: 'THREAD', entityId: threadId, campaignId, authorId: user.id, field, oldValue: String((existing as Record<string, unknown>)[field] ?? ''), newValue: String(body[field] ?? '') },
      })
    }
  }

  return c.json(updated)
})

threads.patch('/:threadId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.content?.trim()) return c.json({ error: 'Content is required' }, 400)

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content: body.content.trim() },
  })

  return c.json(note)
})

threads.delete('/:threadId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

threads.post('/:threadId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const threadId = c.req.param('threadId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.content?.trim()) return c.json({ error: 'Content is required' }, 400)

  const note = await prisma.note.create({
    data: {
      entityType: 'THREAD',
      entityId: threadId,
      campaignId,
      authorId: user.id,
      content: body.content.trim(),
    },
  })

  return c.json(note, 201)
})

threads.delete('/:threadId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const threadId = c.req.param('threadId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.thread.findFirst({ where: { id: threadId, campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.thread.update({ where: { id: threadId }, data: { deletedAt: new Date() } })
  await prisma.changelogEntry.create({
    data: {
      entityType: 'THREAD',
      entityId: threadId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.title,
      newValue: null,
    },
  })
  return c.json({ success: true })
})

export default threads
