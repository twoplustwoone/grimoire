import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalThreads = new Hono()

journalThreads.use('*', authMiddleware)

journalThreads.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return c.json({ error: 'Title is required' }, 400)

  const thread = await prisma.thread.create({
    data: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      title,
      description:
        typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    },
  })
  return c.json(thread, 201)
})

journalThreads.get('/:threadId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const threadId = c.req.param('threadId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!thread) return c.json({ error: 'Not found' }, 404)
  return c.json(thread)
})

journalThreads.patch('/:threadId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const threadId = c.req.param('threadId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.thread.findFirst({
    where: { id: threadId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const next = {
    title:
      typeof body.title === 'string' && body.title.trim() ? body.title.trim() : existing.title,
    description:
      body.description !== undefined ? (body.description?.trim() ?? null) : existing.description,
  }
  if (typeof body.title === 'string' && !body.title.trim()) {
    return c.json({ error: 'Title cannot be empty' }, 400)
  }

  const updated = await prisma.thread.update({ where: { id: threadId }, data: next })
  return c.json(updated)
})

journalThreads.delete('/:threadId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const threadId = c.req.param('threadId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.thread.findFirst({
    where: { id: threadId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.thread.update({ where: { id: threadId }, data: { deletedAt: new Date() } })
  return c.json({ success: true })
})

export default journalThreads
