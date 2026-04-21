import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const worldEvents = new Hono()
worldEvents.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

worldEvents.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const events = await prisma.worldEvent.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId },
    include: {
      session: { select: { id: true, number: true, title: true } },
      inWorldDate: { select: { id: true, label: true, sortOrder: true } },
    },
    orderBy: [
      { inWorldDate: { sortOrder: 'asc' } },
      { createdAt: 'asc' },
    ],
  })

  return c.json(events)
})

worldEvents.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.title?.trim()) return c.json({ error: 'Title is required' }, 400)

  const event = await prisma.worldEvent.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      sessionId: body.sessionId ?? null,
      inWorldDateId: body.inWorldDateId ?? null,
    },
    include: {
      session: { select: { id: true, number: true, title: true } },
      inWorldDate: { select: { id: true, label: true, sortOrder: true } },
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'WORLD_EVENT',
      entityId: event.id,
      campaignId,
      sessionId: event.sessionId,
      authorId: user.id,
      field: 'created',
      newValue: event.title,
    },
  })

  return c.json(event, 201)
})

worldEvents.patch('/:eventId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const eventId = c.req.param('eventId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.worldEvent.findFirst({ where: { id: eventId, ownerType: 'CAMPAIGN', ownerId: campaignId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.worldEvent.update({
    where: { id: eventId },
    data: {
      title: body.title?.trim() ?? existing.title,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      sessionId: body.sessionId !== undefined ? body.sessionId : existing.sessionId,
      inWorldDateId: body.inWorldDateId !== undefined ? body.inWorldDateId : existing.inWorldDateId,
    },
    include: {
      session: { select: { id: true, number: true, title: true } },
      inWorldDate: { select: { id: true, label: true, sortOrder: true } },
    },
  })

  return c.json(updated)
})

worldEvents.delete('/:eventId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const eventId = c.req.param('eventId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.worldEvent.findFirst({ where: { id: eventId, ownerType: 'CAMPAIGN', ownerId: campaignId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.worldEvent.delete({ where: { id: eventId } })
  return c.json({ success: true })
})

export default worldEvents
