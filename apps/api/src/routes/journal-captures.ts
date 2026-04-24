import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import {
  docToPlainText,
  extractMentionsFromDoc,
  isProseMirrorDoc,
} from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'
import { defaultSessionTitle } from '../lib/session-title.js'

const journalCaptures = new Hono()

journalCaptures.use('*', authMiddleware)

const ACTIVE_SESSION_WINDOW_MS = 12 * 60 * 60 * 1000

// Flat list of the journal's captures (newest first) with minimal
// session join so the feed can group on the client.
journalCaptures.get('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const rows = await prisma.journalCapture.findMany({
    where: { journalId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      journalSession: { select: { id: true, number: true, title: true, playedOn: true } },
    },
  })

  return c.json(rows)
})

// Create a capture. If journalSessionId is omitted, the API resolves
// the active session (<12h) or auto-creates a new one.
journalCaptures.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json()

  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  let sessionId: string | null = null

  if (typeof body.journalSessionId === 'string' && body.journalSessionId.length > 0) {
    const session = await prisma.gameSession.findFirst({
      where: { id: body.journalSessionId, ownerType: 'JOURNAL', ownerId: journalId },
    })
    if (!session) return c.json({ error: 'Session not found' }, 404)
    sessionId = session.id
  } else {
    const latest = await prisma.journalCapture.findFirst({
      where: { journalId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (latest && Date.now() - latest.createdAt.getTime() < ACTIVE_SESSION_WINDOW_MS) {
      sessionId = latest.journalSessionId
    } else {
      const lastSession = await prisma.gameSession.findFirst({
        where: { ownerType: 'JOURNAL', ownerId: journalId },
        orderBy: { number: 'desc' },
      })
      const created = await prisma.gameSession.create({
        data: {
          ownerType: 'JOURNAL',
          ownerId: journalId,
          number: (lastSession?.number ?? 0) + 1,
          title: defaultSessionTitle(),
        },
      })
      sessionId = created.id
    }
  }

  const mentions = extractMentionsFromDoc(body.content)

  const capture = await prisma.journalCapture.create({
    data: {
      journalId,
      journalSessionId: sessionId,
      content: body.content,
      mentions,
    },
  })

  return c.json(capture, 201)
})

journalCaptures.patch('/:captureId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const captureId = c.req.param('captureId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.journalCapture.findFirst({
    where: { id: captureId, journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  if (!isProseMirrorDoc(body.content)) {
    return c.json({ error: 'content must be a ProseMirror doc' }, 400)
  }
  const plaintext = docToPlainText(body.content).trim()
  if (!plaintext) return c.json({ error: 'Content is required' }, 400)

  const mentions = extractMentionsFromDoc(body.content)

  const updated = await prisma.journalCapture.update({
    where: { id: captureId },
    data: { content: body.content, mentions },
  })

  return c.json(updated)
})

journalCaptures.delete('/:captureId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const captureId = c.req.param('captureId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.journalCapture.findFirst({
    where: { id: captureId, journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.journalCapture.update({
    where: { id: captureId },
    data: { deletedAt: new Date() },
  })

  return c.json({ success: true })
})

export default journalCaptures
