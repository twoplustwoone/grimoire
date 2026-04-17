import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const campaigns = new Hono()

campaigns.use('*', authMiddleware)

// List campaigns for the current user
campaigns.get('/', async (c) => {
  const user = c.get('user')

  const memberships = await prisma.campaignMembership.findMany({
    where: { userId: user.id },
    include: { campaign: true },
    orderBy: { campaign: { updatedAt: 'desc' } },
  })

  return c.json(memberships.map(({ campaign, role }) => ({ ...campaign, role })))
})

// Create a campaign
campaigns.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      memberships: {
        create: {
          userId: user.id,
          role: 'GM',
        },
      },
    },
  })

  return c.json(campaign, 201)
})

// Get a single campaign
campaigns.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId: id, userId: user.id },
    include: { campaign: true },
  })

  if (!membership) return c.json({ error: 'Not found' }, 404)

  return c.json({ ...membership.campaign, role: membership.role })
})

// Update a campaign
campaigns.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId: id, userId: user.id },
    include: { campaign: true },
  })
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? membership.campaign.name,
      description: body.description !== undefined ? body.description?.trim() ?? null : membership.campaign.description,
    },
  })

  return c.json(updated)
})

export default campaigns
