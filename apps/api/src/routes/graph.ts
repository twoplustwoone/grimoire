import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const graph = new Hono()
graph.use('*', authMiddleware)

graph.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.query('campaignId')

  if (!campaignId) return c.json({ error: 'campaignId required' }, 400)

  const membership = await prisma.campaignMembership.findFirst({
    where: { userId: user.id, campaignId },
  })
  if (!membership) return c.json({ error: 'Not found' }, 404)

  const [npcs, pcs, locations, factions, threads, clues, relationships, factionMemberships, npcLocations, threadTags] = await Promise.all([
    prisma.nPC.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, name: true, status: true, locationId: true } }),
    prisma.playerCharacter.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, name: true, status: true } }),
    prisma.location.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, name: true, status: true } }),
    prisma.faction.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, name: true, status: true } }),
    prisma.thread.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, title: true, status: true, urgency: true } }),
    prisma.clue.findMany({ where: { campaignId, deletedAt: null }, select: { id: true, title: true } }),
    prisma.relationship.findMany({ where: { campaignId } }),
    prisma.factionMembership.findMany({
      where: { faction: { campaignId } },
      select: { npcId: true, factionId: true, role: true },
    }),
    prisma.nPC.findMany({
      where: { campaignId, deletedAt: null, locationId: { not: null } },
      select: { id: true, locationId: true },
    }),
    prisma.threadEntityTag.findMany({
      where: { thread: { campaignId } },
      select: { threadId: true, entityType: true, entityId: true },
    }),
  ])

  const nodes = [
    ...npcs.map(e => ({ id: e.id, type: 'NPC', label: e.name, status: e.status })),
    ...pcs.map(e => ({ id: e.id, type: 'PLAYER_CHARACTER', label: e.name, status: e.status })),
    ...locations.map(e => ({ id: e.id, type: 'LOCATION', label: e.name, status: e.status })),
    ...factions.map(e => ({ id: e.id, type: 'FACTION', label: e.name, status: e.status })),
    ...threads.map(e => ({ id: e.id, type: 'THREAD', label: e.title, status: e.status, urgency: e.urgency })),
    ...clues.map(e => ({ id: e.id, type: 'CLUE', label: e.title, status: null })),
  ]

  const edges: { id: string; source: string; target: string; label: string; type: string }[] = []

  relationships.forEach(r => {
    edges.push({
      id: `rel-${r.id}`,
      source: r.entityIdA,
      target: r.entityIdB,
      label: r.bidirectional ? `\u27F7 ${r.label}` : r.label,
      type: 'relationship',
    })
  })

  factionMemberships.forEach(fm => {
    edges.push({
      id: `fm-${fm.npcId}-${fm.factionId}`,
      source: fm.npcId,
      target: fm.factionId,
      label: fm.role ?? 'member of',
      type: 'membership',
    })
  })

  npcLocations.forEach(npc => {
    if (npc.locationId) {
      edges.push({
        id: `loc-${npc.id}-${npc.locationId}`,
        source: npc.id,
        target: npc.locationId,
        label: 'located at',
        type: 'location',
      })
    }
  })

  threadTags.forEach(tag => {
    edges.push({
      id: `tag-${tag.threadId}-${tag.entityId}`,
      source: tag.threadId,
      target: tag.entityId,
      label: 'involves',
      type: 'thread_tag',
    })
  })

  return c.json({ nodes, edges })
})

export default graph
