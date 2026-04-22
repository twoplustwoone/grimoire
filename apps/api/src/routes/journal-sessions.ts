import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const journalSessions = new Hono()

journalSessions.use('*', authMiddleware)

const ACTIVE_SESSION_WINDOW_MS = 12 * 60 * 60 * 1000

async function guardJournal(userId: string, journalId: string) {
  const journal = await prisma.journal.findFirst({ where: { id: journalId, deletedAt: null } })
  if (!journal) return { status: 404 as const }
  if (journal.ownerId !== userId) return { status: 403 as const }
  return { status: 200 as const, journal }
}

// Active session — the session containing the most recent capture
// within the 12h window. Used by the journal home to decide whether
// to show the "continue or new?" dialog.
journalSessions.get('/active', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const latest = await prisma.journalCapture.findFirst({
    where: { journalId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { journalSession: { select: { id: true, number: true, title: true } } },
  })

  if (!latest) return c.json(null)
  if (Date.now() - latest.createdAt.getTime() > ACTIVE_SESSION_WINDOW_MS) return c.json(null)

  return c.json(latest.journalSession)
})

// Create a session in this journal.
journalSessions.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json().catch(() => ({} as { title?: string; playedOn?: string }))

  const lastSession = await prisma.gameSession.findFirst({
    where: { ownerType: 'JOURNAL', ownerId: journalId },
    orderBy: { number: 'desc' },
  })
  const number = (lastSession?.number ?? 0) + 1

  const session = await prisma.gameSession.create({
    data: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      number,
      title: body.title?.trim() || null,
      playedOn: body.playedOn ? new Date(body.playedOn) : null,
    },
  })

  return c.json(session, 201)
})

// Fetch one session (with its captures).
journalSessions.get('/:sessionId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const sessionId = c.req.param('sessionId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'JOURNAL', ownerId: journalId },
    include: {
      journalCaptures: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!session) return c.json({ error: 'Not found' }, 404)

  return c.json(session)
})

// Update session metadata (title, playedOn). Number/status are immutable in J3.
journalSessions.patch('/:sessionId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const sessionId = c.req.param('sessionId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'JOURNAL', ownerId: journalId },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()
  const updated = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      title: body.title !== undefined ? body.title?.trim() || null : existing.title,
      playedOn: body.playedOn !== undefined ? (body.playedOn ? new Date(body.playedOn) : null) : existing.playedOn,
    },
  })

  return c.json(updated)
})

export default journalSessions
