import { Hono } from 'hono'
import { prisma, type OwnerType } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'
import { hydrateEntityNames } from '../lib/hydrate-entity-names.js'

const journalLinks = new Hono()

journalLinks.use('*', authMiddleware)

/** Link between journal and campaign is only meaningful for entity
 *  types that exist on both sides as first-class nodes. PC is the
 *  mirror's job, not a link. World events / sessions / memberships
 *  don't have journal counterparts in the v1 design. */
const LINKABLE_TYPES = ['NPC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE'] as const
type LinkableType = (typeof LINKABLE_TYPES)[number]

function isLinkable(t: unknown): t is LinkableType {
  return typeof t === 'string' && (LINKABLE_TYPES as readonly string[]).includes(t)
}

/** Polymorphic lookup: resolve an entity by (type, id, owner). Returns
 *  `{ id, name }` on hit (Thread/Clue are renormalised from `title`),
 *  or null on miss. */
async function findEntity(
  type: LinkableType,
  id: string,
  ownerType: OwnerType,
  ownerId: string
): Promise<{ id: string; name: string } | null> {
  const where = { id, ownerType, ownerId, deletedAt: null }
  switch (type) {
    case 'NPC': {
      const r = await prisma.nPC.findFirst({ where, select: { id: true, name: true } })
      return r
    }
    case 'LOCATION': {
      const r = await prisma.location.findFirst({ where, select: { id: true, name: true } })
      return r
    }
    case 'FACTION': {
      const r = await prisma.faction.findFirst({ where, select: { id: true, name: true } })
      return r
    }
    case 'THREAD': {
      const r = await prisma.thread.findFirst({ where, select: { id: true, title: true } })
      return r ? { id: r.id, name: r.title } : null
    }
    case 'CLUE': {
      const r = await prisma.clue.findFirst({ where, select: { id: true, title: true } })
      return r ? { id: r.id, name: r.title } : null
    }
  }
}

journalLinks.get('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const links = await prisma.journalLink.findMany({
    where: { journalId },
    orderBy: { createdAt: 'desc' },
  })

  const names = await hydrateEntityNames([
    ...links.map((l) => ({ type: l.journalEntityType, id: l.journalEntityId })),
    ...links.map((l) => ({ type: l.campaignEntityType, id: l.campaignEntityId })),
  ])

  return c.json(
    links.map((l) => ({
      ...l,
      journalEntityName: names.get(`${l.journalEntityType}:${l.journalEntityId}`) ?? null,
      campaignEntityName: names.get(`${l.campaignEntityType}:${l.campaignEntityId}`) ?? null,
    }))
  )
})

journalLinks.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const journal = guard.journal
  if (!journal.linkedCampaignId) {
    return c.json({ error: 'Journal must be linked to a campaign before cross-referencing' }, 400)
  }

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))

  const { journalEntityType, journalEntityId, campaignEntityType, campaignEntityId } = body as {
    journalEntityType?: unknown
    journalEntityId?: unknown
    campaignEntityType?: unknown
    campaignEntityId?: unknown
  }

  if (!isLinkable(journalEntityType) || !isLinkable(campaignEntityType)) {
    return c.json({ error: 'Unsupported entity type', allowed: LINKABLE_TYPES }, 400)
  }
  if (journalEntityType !== campaignEntityType) {
    return c.json({ error: 'Link types must match (NPC→NPC, LOCATION→LOCATION, etc.)' }, 400)
  }
  if (typeof journalEntityId !== 'string' || typeof campaignEntityId !== 'string') {
    return c.json({ error: 'journalEntityId and campaignEntityId are required' }, 400)
  }

  const [journalSide, campaignSide] = await Promise.all([
    findEntity(journalEntityType, journalEntityId, 'JOURNAL', journalId),
    findEntity(campaignEntityType, campaignEntityId, 'CAMPAIGN', journal.linkedCampaignId),
  ])
  if (!journalSide) return c.json({ error: 'Journal entity not found' }, 404)
  if (!campaignSide) return c.json({ error: 'Campaign entity not found' }, 404)

  try {
    const link = await prisma.journalLink.create({
      data: {
        journalId,
        journalEntityType,
        journalEntityId,
        campaignEntityType,
        campaignEntityId,
        proposedBy: 'PLAYER',
      },
    })
    return c.json(link, 201)
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      return c.json({ error: 'Link already exists' }, 409)
    }
    throw e
  }
})

journalLinks.delete('/:linkId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const linkId = c.req.param('linkId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.journalLink.findFirst({ where: { id: linkId, journalId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.journalLink.delete({ where: { id: linkId } })
  return c.json({ success: true })
})

export default journalLinks
