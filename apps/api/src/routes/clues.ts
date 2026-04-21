import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'

const clues = new Hono()
clues.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

clues.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const list = await prisma.clue.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      discoveredInSession: { select: { id: true, number: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(list)
})

clues.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!body.title?.trim()) return c.json({ error: 'Title is required' }, 400)

  const clue = await prisma.clue.create({
    data: {
      ownerType: 'CAMPAIGN',
      ownerId: campaignId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      discoveredInSessionId: body.discoveredInSessionId ?? null,
    },
  })

  await prisma.changelogEntry.create({
    data: { entityType: 'CLUE', entityId: clue.id, campaignId, authorId: user.id, field: 'created', newValue: clue.title },
  })

  return c.json(clue, 201)
})

clues.get('/:clueId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const clueId = c.req.param('clueId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const clue = await prisma.clue.findFirst({
    where: { id: clueId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: {
      discoveredInSession: { select: { id: true, number: true, title: true } },
    },
  })
  if (!clue) return c.json({ error: 'Not found' }, 404)

  const notes = await prisma.note.findMany({ where: { entityType: 'CLUE', entityId: clueId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'CLUE', entityId: clueId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return c.json({ ...clue, notes, changelog })
})

clues.patch('/:clueId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const clueId = c.req.param('clueId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.clue.findFirst({ where: { id: clueId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.clue.update({
    where: { id: clueId },
    data: {
      title: body.title?.trim() ?? existing.title,
      description: body.description !== undefined ? body.description?.trim() ?? null : existing.description,
      discoveredInSessionId: body.discoveredInSessionId !== undefined ? body.discoveredInSessionId : existing.discoveredInSessionId,
    },
  })

  for (const field of ['title', 'description'] as const) {
    if (body[field] !== undefined && body[field] !== (existing as Record<string, unknown>)[field]) {
      await prisma.changelogEntry.create({
        data: { entityType: 'CLUE', entityId: clueId, campaignId, authorId: user.id, field, oldValue: String((existing as Record<string, unknown>)[field] ?? ''), newValue: String(body[field] ?? '') },
      })
    }
  }

  return c.json(updated)
})

clues.patch('/:clueId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const clueId = c.req.param('clueId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

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
      entityType: 'CLUE',
      entityId: clueId,
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

clues.delete('/:clueId/notes/:noteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  await prisma.note.delete({ where: { id: noteId } })
  return c.json({ success: true })
})

clues.post('/:clueId/notes', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const clueId = c.req.param('clueId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)
  const note = await prisma.note.create({
    data: {
      entityType: 'CLUE',
      entityId: clueId,
      campaignId,
      authorId: user.id,
      content: body.content,
      mentions,
    },
  })

  await prisma.changelogEntry.create({
    data: {
      entityType: 'CLUE',
      entityId: clueId,
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

clues.delete('/:clueId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const clueId = c.req.param('clueId')!
  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const existing = await prisma.clue.findFirst({ where: { id: clueId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.clue.update({ where: { id: clueId }, data: { deletedAt: new Date() } })
  await prisma.changelogEntry.create({
    data: {
      entityType: 'CLUE',
      entityId: clueId,
      campaignId,
      authorId: user.id,
      field: 'deleted',
      oldValue: existing.title,
      newValue: null,
    },
  })
  return c.json({ success: true })
})

export default clues
