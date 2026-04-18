import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const search = new Hono()
search.use('*', authMiddleware)

search.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.query('campaignId')
  const q = c.req.query('q')?.trim()

  if (!campaignId || !q || q.length < 1) return c.json([])

  const membership = await prisma.campaignMembership.findFirst({
    where: { userId: user.id, campaignId },
  })
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const where = (field: string) => ({
    campaignId,
    deletedAt: null,
    [field]: { contains: q, mode: 'insensitive' as const },
  })

  const parsedNumber = parseInt(q, 10)
  const sessionOr: Array<Record<string, unknown>> = [
    { title: { contains: q, mode: 'insensitive' as const } },
  ]
  if (!isNaN(parsedNumber)) sessionOr.push({ number: parsedNumber })

  const [npcs, locations, factions, threads, clues, sessions] = await Promise.all([
    prisma.nPC.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
    prisma.location.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
    prisma.faction.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
    prisma.thread.findMany({ where: { campaignId, deletedAt: null, title: { contains: q, mode: 'insensitive' } }, select: { id: true, title: true, status: true, urgency: true }, take: 5 }),
    prisma.clue.findMany({ where: { campaignId, deletedAt: null, title: { contains: q, mode: 'insensitive' } }, select: { id: true, title: true }, take: 5 }),
    prisma.gameSession.findMany({ where: { campaignId, OR: sessionOr }, select: { id: true, number: true, title: true, status: true }, take: 3 }),
  ])

  const results = [
    ...npcs.map(e => ({ id: e.id, type: 'NPC' as const, name: e.name, meta: e.status })),
    ...locations.map(e => ({ id: e.id, type: 'LOCATION' as const, name: e.name, meta: e.status })),
    ...factions.map(e => ({ id: e.id, type: 'FACTION' as const, name: e.name, meta: e.status })),
    ...threads.map(e => ({ id: e.id, type: 'THREAD' as const, name: e.title, meta: e.urgency })),
    ...clues.map(e => ({ id: e.id, type: 'CLUE' as const, name: e.title, meta: null })),
    ...sessions.map(e => ({ id: e.id, type: 'SESSION' as const, name: `Session ${e.number}${e.title ? ` — ${e.title}` : ''}`, meta: e.status })),
  ]

  return c.json(results)
})

export default search
