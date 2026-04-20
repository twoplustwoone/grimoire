import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const factions = new Hono()
factions.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

factions.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const list = await prisma.faction.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      memberships: { include: { npc: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
  })
  return c.json(list)
})

factions.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.name?.trim()) return c.json({ error: 'Name is required' }, 400)

  const faction = await prisma.faction.create({
    data: {
      campaignId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      agenda: body.agenda?.trim() ?? null,
    },
  })

  await prisma.changelogEntry.create({
    data: { entityType: 'FACTION', entityId: faction.id, campaignId, authorId: user.id, field: 'created', newValue: faction.name },
  })

  return c.json(faction, 201)
})

factions.get('/:factionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const factionId = c.req.param('factionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const faction = await prisma.faction.findFirst({
    where: { id: factionId, campaignId, deletedAt: null },
    include: {
      memberships: { include: { npc: { select: { id: true, name: true, status: true } } } },
    },
  })
  if (!faction) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({ where: { entityType: 'FACTION', entityId: factionId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'FACTION', entityId: factionId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return c.json({ ...faction, notes, changelog })
})

factions.patch('/:factionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const factionId = c.req.param('factionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.faction.findFirst({ where: { id: factionId, campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.faction.update({
    where: { id: factionId },
    data: {
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      agenda: body.agenda !== undefined ? body.agenda?.trim() ?? null : existing.agenda,
      status: body.status ?? existing.status,
    },
  })

  for (const field of ['name', 'description', 'agenda', 'status'] as const) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: { entityType: 'FACTION', entityId: factionId, campaignId, authorId: user.id, field, oldValue: String((existing as Record<string, unknown>)[field] ?? ''), newValue: String(body[field] ?? '') },
      })
    }
  }

  return c.json(updated)
})

factions.patch('/:factionId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.content?.trim()) return c.json({ error: 'Content is required' }, 400)

  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content: body.content.trim() },
  })

  return c.json(note)
})

factions.delete('/:factionId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

factions.post('/:factionId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const factionId = c.req.param('factionId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.content?.trim()) return c.json({ error: 'Content is required' }, 400)

  const note = await prisma.note.create({
    data: {
      entityType: 'FACTION',
      entityId: factionId,
      campaignId,
      authorId: user.id,
      content: body.content.trim(),
    },
  })

  return c.json(note, 201)
})

factions.delete('/:factionId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const factionId = c.req.param('factionId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.faction.findFirst({ where: { id: factionId, campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.faction.update({ where: { id: factionId }, data: { deletedAt: new Date() } })
  await prisma.changelogEntry.create({
    data: {
      entityType: 'FACTION',
      entityId: factionId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.name,
      newValue: null,
    },
  })
  return c.json({ success: true })
})

export default factions
