import { Hono } from 'hono'
import { prisma, type EntityType } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'
import { hydrateEntityNames } from '../lib/hydrate-entity-names.js'

const journalGraph = new Hono()
journalGraph.use('*', authMiddleware)

interface RawNode {
  id: string
  type: string
  label: string
  status: string | null
  urgency?: string
  variant: 'primary' | 'leaf'
}

interface RawEdge {
  id: string
  source: string
  target: string
  label: string
  type: string
  weight?: number
  captureIds?: string[]
  createdAt?: string
  proposedBy?: string
}

journalGraph.get('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) {
    return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)
  }

  const ownedBy = { ownerType: 'JOURNAL' as const, ownerId: journalId }
  const [npcs, pcs, locations, factions, threads, clues, links, captures] = await Promise.all([
    prisma.nPC.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, name: true, status: true },
    }),
    prisma.playerCharacter.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, name: true, status: true },
    }),
    prisma.location.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, name: true, status: true },
    }),
    prisma.faction.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, name: true, status: true },
    }),
    prisma.thread.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, title: true, status: true, urgency: true },
    }),
    prisma.clue.findMany({
      where: { ...ownedBy, deletedAt: null },
      select: { id: true, title: true },
    }),
    prisma.journalLink.findMany({ where: { journalId } }),
    prisma.journalCapture.findMany({
      where: { journalId, deletedAt: null },
      select: { id: true, mentions: true },
    }),
  ])

  const primaryNodes: RawNode[] = [
    ...npcs.map((e) => ({ id: e.id, type: 'NPC', label: e.name, status: e.status, variant: 'primary' as const })),
    ...pcs.map((e) => ({ id: e.id, type: 'PLAYER_CHARACTER', label: e.name, status: e.status, variant: 'primary' as const })),
    ...locations.map((e) => ({ id: e.id, type: 'LOCATION', label: e.name, status: e.status, variant: 'primary' as const })),
    ...factions.map((e) => ({ id: e.id, type: 'FACTION', label: e.name, status: e.status, variant: 'primary' as const })),
    ...threads.map((e) => ({ id: e.id, type: 'THREAD', label: e.title, status: e.status, urgency: e.urgency, variant: 'primary' as const })),
    ...clues.map((e) => ({ id: e.id, type: 'CLUE', label: e.title, status: null, variant: 'primary' as const })),
  ]

  const campaignRefs: Array<{ type: EntityType; id: string }> = links.map((l) => ({
    type: l.campaignEntityType,
    id: l.campaignEntityId,
  }))
  const names = await hydrateEntityNames(campaignRefs)

  // Dedupe leaves — multiple journal entities could link to the same
  // campaign entity in theory; collapse them to one node.
  const leafById = new Map<string, RawNode>()
  for (const l of links) {
    const id = l.campaignEntityId
    if (leafById.has(id)) continue
    leafById.set(id, {
      id,
      type: l.campaignEntityType,
      label: names.get(`${l.campaignEntityType}:${id}`) ?? '(unknown)',
      status: null,
      variant: 'leaf',
    })
  }

  const nodes: RawNode[] = [...primaryNodes, ...Array.from(leafById.values())]
  const nodeIdSet = new Set<string>(nodes.map((n) => n.id))

  const edges: RawEdge[] = []

  // Cross-reference edges (journal entity → leaf campaign entity)
  for (const l of links) {
    if (!nodeIdSet.has(l.journalEntityId) || !nodeIdSet.has(l.campaignEntityId)) continue
    edges.push({
      id: `xref-${l.id}`,
      source: l.journalEntityId,
      target: l.campaignEntityId,
      label: 'cross-ref',
      type: 'cross_ref',
      createdAt: l.createdAt.toISOString(),
      proposedBy: l.proposedBy,
    })
  }

  // Co-mention adjacency from capture mentions. Deduplicate mentions
  // within a single capture before pairing.
  const pairCounts = new Map<string, { count: number; captureIds: string[] }>()
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

  for (const capture of captures) {
    const raw = capture.mentions
    if (!Array.isArray(raw)) continue
    const unique = new Set<string>()
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const id = (entry as { entityId?: unknown }).entityId
      if (typeof id !== 'string') continue
      if (!nodeIdSet.has(id)) continue
      unique.add(id)
    }
    const ids = Array.from(unique)
    if (ids.length < 2) continue
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j])
        const existing = pairCounts.get(key)
        if (existing) {
          existing.count += 1
          existing.captureIds.push(capture.id)
        } else {
          pairCounts.set(key, { count: 1, captureIds: [capture.id] })
        }
      }
    }
  }

  for (const [key, { count, captureIds }] of pairCounts) {
    const [source, target] = key.split('|')
    edges.push({
      id: `co-${source}-${target}`,
      source,
      target,
      label: count > 1 ? `${count}× co-mentioned` : 'co-mentioned',
      type: 'co_mention',
      weight: count,
      captureIds,
    })
  }

  return c.json({ nodes, edges })
})

export default journalGraph
