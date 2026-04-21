import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'

const npcs = new Hono()

npcs.use('*', authMiddleware)

async function getCampaignMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId },
  })
}

npcs.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const npcList = await prisma.nPC.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
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
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
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

npcs.get('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const npc = await prisma.nPC.findFirst({
    where: {
      id: npcId,
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      deletedAt: null,
    },
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

npcs.patch('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.nPC.findFirst({
    where: {
      id: npcId,
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      deletedAt: null,
    },
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

npcs.patch('/:npcId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!
  const noteId = c.req.param('noteId')!

  if (!await getCampaignMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.note.findUnique({ where: { id: noteId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.update({
    where: { id: noteId },
    data: { content: body.content, mentions },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'NPC',
      entityId: npcId,
      campaignId,
      authorId: user.id,
      field: 'note',
      oldValue: docToPlainText(existing.content),
      newValue: plaintext,
      note: 'Note edited',
    },
  })

  return c.json(note)
})

npcs.delete('/:npcId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getCampaignMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

npcs.post('/:npcId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  if (!await getCampaignMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.create({
    data: {
      entityType: 'NPC',
      entityId: npcId,
      campaignId,
      authorId: user.id,
      content: body.content,
      mentions,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'NPC',
      entityId: npcId,
      campaignId,
      authorId: user.id,
      field: 'note',
      oldValue: null,
      newValue: plaintext,
      note: 'Note added',
    },
  })

  return c.json(note, 201)
})

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

npcs.delete('/:npcId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const npcId = c.req.param('npcId')!

  const membership = await getCampaignMembership(user.id, campaignId)
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.nPC.findFirst({
    where: {
      id: npcId,
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      deletedAt: null,
    },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.nPC.update({
    where: { id: npcId },
    data: { deletedAt: new Date() },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'NPC',
      entityId: npcId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.name,
      newValue: null,
    },
  })

  return c.json({ success: true })
})

export default npcs
