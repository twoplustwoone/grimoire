import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalClues = new Hono()

journalClues.use('*', authMiddleware)

journalClues.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return c.json({ error: 'Title is required' }, 400)

  const clue = await prisma.clue.create({
    data: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      title,
      description:
        typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    },
  })
  return c.json(clue, 201)
})

journalClues.get('/:clueId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const clueId = c.req.param('clueId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const clue = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!clue) return c.json({ error: 'Not found' }, 404)
  return c.json(clue)
})

journalClues.patch('/:clueId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const clueId = c.req.param('clueId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
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

  const updated = await prisma.clue.update({ where: { id: clueId }, data: next })
  return c.json(updated)
})

journalClues.delete('/:clueId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const clueId = c.req.param('clueId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.clue.update({ where: { id: clueId }, data: { deletedAt: new Date() } })
  return c.json({ success: true })
})

export default journalClues
