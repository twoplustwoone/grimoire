import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import type { EntityType, NodeVisibility } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const infoNodes = new Hono()
infoNodes.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

infoNodes.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const entityType = c.req.query('entityType') as EntityType | undefined
  const entityId = c.req.query('entityId')

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const nodes = await prisma.informationNode.findMany({
    where: {
      campaignId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    },
    orderBy: { createdAt: 'asc' },
  })

  return c.json(nodes)
})

infoNodes.patch('/:nodeId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const nodeId = c.req.param('nodeId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.informationNode.findFirst({
    where: { id: nodeId, campaignId },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.informationNode.update({
    where: { id: nodeId },
    data: {
      title: body.title?.trim() ?? existing.title,
      content: body.content?.trim() ?? existing.content,
      visibility: (body.visibility as NodeVisibility) ?? existing.visibility,
    },
  })

  return c.json(updated)
})

infoNodes.delete('/:nodeId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const nodeId = c.req.param('nodeId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.informationNode.findFirst({
    where: { id: nodeId, campaignId },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.informationNode.delete({ where: { id: nodeId } })
  return c.json({ success: true })
})

export default infoNodes
