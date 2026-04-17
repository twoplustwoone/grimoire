import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const sessions = new Hono()
sessions.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

sessions.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const list = await prisma.gameSession.findMany({
    where: { campaignId },
    include: {
      entityTags: true,
      _count: { select: { entityTags: true } },
    },
    orderBy: { number: 'desc' },
  })
  return c.json(list)
})

sessions.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  const lastSession = await prisma.gameSession.findFirst({
    where: { campaignId },
    orderBy: { number: 'desc' },
  })
  const number = (lastSession?.number ?? 0) + 1

  const session = await prisma.gameSession.create({
    data: {
      campaignId,
      number,
      title: body.title?.trim() ?? null,
      playedOn: body.playedOn ? new Date(body.playedOn) : null,
      status: 'PLANNED',
    },
  })

  return c.json(session, 201)
})

sessions.get('/:sessionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, campaignId },
    include: { entityTags: true },
  })
  if (!session) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({
    where: { entityType: 'SESSION', entityId: sessionId },
    orderBy: { createdAt: 'asc' },
  })

  return c.json({ ...session, notes })
})

sessions.patch('/:sessionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.gameSession.findFirst({ where: { id: sessionId, campaignId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      title: body.title !== undefined ? body.title?.trim() ?? null : existing.title,
      playedOn: body.playedOn !== undefined ? (body.playedOn ? new Date(body.playedOn) : null) : existing.playedOn,
      status: body.status ?? existing.status,
      gmSummary: body.gmSummary !== undefined ? body.gmSummary?.trim() ?? null : existing.gmSummary,
      aiSummary: body.aiSummary !== undefined ? body.aiSummary?.trim() ?? null : existing.aiSummary,
    },
  })

  return c.json(updated)
})

sessions.post('/:sessionId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.gameSession.findFirst({ where: { id: sessionId, campaignId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.content?.trim()) return c.json({ error: 'Content is required' }, 400)

  const note = await prisma.note.create({
    data: {
      entityType: 'SESSION',
      entityId: sessionId,
      campaignId,
      sessionId,
      authorId: user.id,
      content: body.content.trim(),
    },
  })

  return c.json(note, 201)
})

sessions.post('/:sessionId/tags', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.entityType || !body.entityId) return c.json({ error: 'entityType and entityId are required' }, 400)

  const tag = await prisma.sessionEntityTag.upsert({
    where: {
      sessionId_entityType_entityId: {
        sessionId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    },
    create: {
      sessionId,
      entityType: body.entityType,
      entityId: body.entityId,
    },
    update: {},
  })

  return c.json(tag, 201)
})

sessions.delete('/:sessionId/tags/:tagId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!
  const tagId = c.req.param('tagId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.sessionEntityTag.deleteMany({
    where: { id: tagId, sessionId },
  })

  return c.json({ success: true })
})

export default sessions
