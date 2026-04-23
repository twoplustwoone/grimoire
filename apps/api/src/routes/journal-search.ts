import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalSearch = new Hono()

journalSearch.use('*', authMiddleware)

/** Journal-scoped search for @-mentions inside captures.
 *  Only returns entities owned by this journal (ownerType=JOURNAL, ownerId=journalId).
 *  Campaign entities are reached via cross-references, not mentions. */
journalSearch.get('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const q = c.req.query('q')?.trim() ?? ''
  if (q.length < 1) return c.json([])

  const ownedBy = { ownerType: 'JOURNAL' as const, ownerId: journalId, deletedAt: null }
  const contains = { contains: q, mode: 'insensitive' as const }

  const [npcs, pcs, locations, factions, threads, clues] = await Promise.all([
    prisma.nPC.findMany({ where: { ...ownedBy, name: contains }, select: { id: true, name: true }, take: 5 }),
    prisma.playerCharacter.findMany({ where: { ...ownedBy, name: contains }, select: { id: true, name: true }, take: 5 }),
    prisma.location.findMany({ where: { ...ownedBy, name: contains }, select: { id: true, name: true }, take: 5 }),
    prisma.faction.findMany({ where: { ...ownedBy, name: contains }, select: { id: true, name: true }, take: 5 }),
    prisma.thread.findMany({ where: { ...ownedBy, title: contains }, select: { id: true, title: true }, take: 5 }),
    prisma.clue.findMany({ where: { ...ownedBy, title: contains }, select: { id: true, title: true }, take: 5 }),
  ])

  const results = [
    ...npcs.map((e) => ({ id: e.id, type: 'NPC' as const, name: e.name })),
    ...pcs.map((e) => ({ id: e.id, type: 'PLAYER_CHARACTER' as const, name: e.name })),
    ...locations.map((e) => ({ id: e.id, type: 'LOCATION' as const, name: e.name })),
    ...factions.map((e) => ({ id: e.id, type: 'FACTION' as const, name: e.name })),
    ...threads.map((e) => ({ id: e.id, type: 'THREAD' as const, name: e.title })),
    ...clues.map((e) => ({ id: e.id, type: 'CLUE' as const, name: e.title })),
  ]

  return c.json(results)
})

export default journalSearch
