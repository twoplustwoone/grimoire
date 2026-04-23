import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalNpcs = new Hono()

journalNpcs.use('*', authMiddleware)

journalNpcs.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return c.json({ error: 'Name is required' }, 400)

  const npc = await prisma.nPC.create({
    data: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      name,
      description:
        typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    },
  })
  return c.json(npc, 201)
})

journalNpcs.get('/:npcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const npcId = c.req.param('npcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!npc) return c.json({ error: 'Not found' }, 404)
  return c.json(npc)
})

journalNpcs.patch('/:npcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const npcId = c.req.param('npcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.nPC.findFirst({
    where: { id: npcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const next = {
    name:
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
    description:
      body.description !== undefined ? (body.description?.trim() ?? null) : existing.description,
  }
  if (typeof body.name === 'string' && !body.name.trim()) {
    return c.json({ error: 'Name cannot be empty' }, 400)
  }

  const updated = await prisma.nPC.update({ where: { id: npcId }, data: next })
  return c.json(updated)
})

journalNpcs.delete('/:npcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const npcId = c.req.param('npcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.nPC.findFirst({
    where: { id: npcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.nPC.update({ where: { id: npcId }, data: { deletedAt: new Date() } })
  return c.json({ success: true })
})

export default journalNpcs
