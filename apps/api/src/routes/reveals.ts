import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import type { EntityType } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const reveals = new Hono()
reveals.use('*', authMiddleware)

async function getGMMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId, role: { in: ['GM', 'CO_GM'] } },
  })
}

reveals.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const entityType = c.req.query('entityType') as EntityType | undefined
  const entityId = c.req.query('entityId')

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const entityReveals = await prisma.entityReveal.findMany({
    where: {
      campaignId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return c.json(entityReveals)
})

reveals.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const body = await c.req.json()
  if (!body.entityType || !body.entityId) {
    return c.json({ error: 'entityType and entityId are required' }, 400)
  }

  const reveal = await prisma.entityReveal.upsert({
    where: {
      entityType_entityId_userId: {
        entityType: body.entityType,
        entityId: body.entityId,
        userId: body.userId ?? null,
      },
    },
    create: {
      campaignId,
      entityType: body.entityType,
      entityId: body.entityId,
      userId: body.userId ?? null,
      displayName: body.displayName ?? null,
      displayDescription: body.displayDescription ?? null,
    },
    update: {
      displayName: body.displayName ?? null,
      displayDescription: body.displayDescription ?? null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return c.json(reveal, 201)
})

reveals.delete('/:revealId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const revealId = c.req.param('revealId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await prisma.entityReveal.deleteMany({
    where: { id: revealId, campaignId },
  })

  return c.json({ success: true })
})

export default reveals
