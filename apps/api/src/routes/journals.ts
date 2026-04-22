import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const journals = new Hono()

journals.use('*', authMiddleware)

// List journals owned by the current user.
journals.get('/', async (c) => {
  const user = c.get('user')

  const rows = await prisma.journal.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      linkedCampaignId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return c.json(rows)
})

// Create a journal. Freestanding (linkedCampaignId null).
journals.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const journal = await prisma.journal.create({
    data: {
      ownerId: user.id,
      name: body.name.trim(),
    },
  })

  return c.json(journal, 201)
})

// Get a single journal. Owner-only: 403 on foreign, 404 on missing/deleted.
journals.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
  })
  if (!journal) return c.json({ error: 'Not found' }, 404)
  if (journal.ownerId !== user.id) return c.json({ error: 'Forbidden' }, 403)

  return c.json(journal)
})

// Update a journal. Owner-only. Only `name` is accepted in J2.
journals.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
  })
  if (!journal) return c.json({ error: 'Not found' }, 404)
  if (journal.ownerId !== user.id) return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json()

  if (body.name !== undefined) {
    const trimmed = typeof body.name === 'string' ? body.name.trim() : ''
    if (!trimmed) return c.json({ error: 'Name cannot be empty' }, 400)
    const updated = await prisma.journal.update({
      where: { id },
      data: { name: trimmed },
    })
    return c.json(updated)
  }

  return c.json(journal)
})

// Soft-delete. Owner-only.
journals.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
  })
  if (!journal) return c.json({ error: 'Not found' }, 404)
  if (journal.ownerId !== user.id) return c.json({ error: 'Forbidden' }, 403)

  await prisma.journal.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return c.json({ success: true })
})

export default journals
