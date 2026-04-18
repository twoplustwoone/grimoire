import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const npcs = new Hono()

npcs.use('*', authMiddleware)

// Verify campaign membership helper
async function getCampaignMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId },
  })
}

// List NPCs for a campaign
npcs.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const npcList = await prisma.nPC.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return c.json(npcList)
})

// Create an NPC
npcs.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const npc = await prisma.nPC.create({
    data: {
      campaignId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      locationId: body.locationId ?? null,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'NPC',
      entityId: npc.id,
      campaignId,
      authorId: user.id,
      field: 'created',
      newValue: npc.name,
    },
  })

  return c.json(npc, 201)
})

// Get a single NPC
npcs.get('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
  })

  if (!npc) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
  })

  const changelog = await prisma.changelogEntry.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return c.json({ ...npc, notes, changelog })
})

// Update an NPC
npcs.patch('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  const updated = await prisma.nPC.update({
    where: { id: npcId },
    data: {
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      status: body.status ?? existing.status,
      locationId: body.locationId !== undefined ? body.locationId : existing.locationId,
    },
  })

  // Write changelog entries for changed fields
  const fieldsToTrack = ['name', 'description', 'status', 'locationId'] as const
  for (const field of fieldsToTrack) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: {
          entityType: 'NPC',
          entityId: npcId,
          campaignId,
          authorId: user.id,
          field,
          oldValue: String((existing as Record<string, unknown>)[field] ?? ''),
          newValue: String(body[field] ?? ''),
        },
      })
    }
  }

  return c.json(updated)
})

// Add NPC to a faction
npcs.post('/:npcId/factions', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.factionId) return c.json({ error: 'factionId is required' }, 400)

  const fm = await prisma.factionMembership.upsert({
    where: { factionId_npcId: { factionId: body.factionId, npcId } },
    create: { factionId: body.factionId, npcId, role: body.role ?? null },
    update: { role: body.role ?? null },
  })

  return c.json(fm, 201)
})

// Remove NPC from a faction
npcs.delete('/:npcId/factions/:factionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!
  const factionId = c.req.param('factionId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  await prisma.factionMembership.deleteMany({
    where: { factionId, npcId },
  })

  return c.json({ success: true })
})

// Soft delete an NPC
npcs.delete('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.nPC.update({
    where: { id: npcId },
    data: { deletedAt: new Date() },
  })

  return c.json({ success: true })
})

export default npcs
