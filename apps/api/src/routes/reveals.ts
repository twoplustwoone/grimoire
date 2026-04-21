import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import type { EntityType } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const reveals = new Hono()
reveals.use('*', authMiddleware)

async function getGMMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId, role: { in: ['GM', 'CO_GM'] } },
  })
}

reveals.get('/preview', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const targetUserId = c.req.query('userId')

  if (!targetUserId) return c.json({ error: 'userId is required' }, 400)

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const targetMembership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: targetUserId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!targetMembership) return c.json({ error: 'Player not found' }, 404)

  const entityReveals = await prisma.entityReveal.findMany({
    where: {
      campaignId,
      OR: [
        { userId: targetUserId },
        { userId: null },
      ],
    },
  })

  const allNodes = await prisma.informationNode.findMany({
    where: { campaignId },
  })

  const specificRevealIds = await prisma.informationNodeReveal.findMany({
    where: { membership: { userId: targetUserId, campaignId } },
    select: { informationNodeId: true },
  })
  const specificRevealSet = new Set(specificRevealIds.map(r => r.informationNodeId))

  const visibleNodes = allNodes.filter(node => {
    if (node.visibility === 'GM_ONLY') return false
    if (node.visibility === 'ALL_PLAYERS') return true
    if (node.visibility === 'SPECIFIC_PLAYERS') return specificRevealSet.has(node.id)
    return false
  })

  const revealMap = new Map(entityReveals.map(r => [r.entityId, r]))

  const revealedByType = {
    NPC: entityReveals.filter(r => r.entityType === 'NPC').map(r => r.entityId),
    PLAYER_CHARACTER: entityReveals.filter(r => r.entityType === 'PLAYER_CHARACTER').map(r => r.entityId),
    LOCATION: entityReveals.filter(r => r.entityType === 'LOCATION').map(r => r.entityId),
    FACTION: entityReveals.filter(r => r.entityType === 'FACTION').map(r => r.entityId),
    THREAD: entityReveals.filter(r => r.entityType === 'THREAD').map(r => r.entityId),
    CLUE: entityReveals.filter(r => r.entityType === 'CLUE').map(r => r.entityId),
  }

  const [npcs, pcs, locations, factions, threads, clues, yourCharacter] = await Promise.all([
    revealedByType.NPC.length > 0
      ? prisma.nPC.findMany({ where: { id: { in: revealedByType.NPC }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedByType.PLAYER_CHARACTER.length > 0
      ? prisma.playerCharacter.findMany({ where: { id: { in: revealedByType.PLAYER_CHARACTER }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedByType.LOCATION.length > 0
      ? prisma.location.findMany({ where: { id: { in: revealedByType.LOCATION }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedByType.FACTION.length > 0
      ? prisma.faction.findMany({ where: { id: { in: revealedByType.FACTION }, deletedAt: null }, select: { id: true, name: true, description: true } })
      : [],
    revealedByType.THREAD.length > 0
      ? prisma.thread.findMany({ where: { id: { in: revealedByType.THREAD }, deletedAt: null }, select: { id: true, title: true, description: true } })
      : [],
    revealedByType.CLUE.length > 0
      ? prisma.clue.findMany({ where: { id: { in: revealedByType.CLUE }, deletedAt: null }, select: { id: true, title: true, description: true } })
      : [],
    prisma.playerCharacter.findFirst({
      where: { ownerType: 'CAMPAIGN', ownerId: campaignId, linkedUserId: targetUserId, deletedAt: null },
      select: { id: true, name: true, description: true },
    }),
  ])

  function applyNameReveal(entity: { id: string; name: string; description: string | null }) {
    const reveal = revealMap.get(entity.id)
    return {
      id: entity.id,
      name: reveal?.displayName ?? entity.name,
      description: reveal?.displayDescription ?? entity.description ?? '',
      isNameRevealed: !reveal?.displayName,
      nodes: visibleNodes
        .filter(n => n.entityId === entity.id)
        .map(n => ({ id: n.id, title: n.title, content: n.content })),
    }
  }

  function applyTitleReveal(entity: { id: string; title: string; description: string | null }) {
    const reveal = revealMap.get(entity.id)
    return {
      id: entity.id,
      name: reveal?.displayName ?? entity.title,
      description: reveal?.displayDescription ?? entity.description ?? '',
      isNameRevealed: !reveal?.displayName,
      nodes: visibleNodes
        .filter(n => n.entityId === entity.id)
        .map(n => ({ id: n.id, title: n.title, content: n.content })),
    }
  }

  const otherPCs = yourCharacter
    ? pcs.filter(pc => pc.id !== yourCharacter.id)
    : pcs

  return c.json({
    player: targetMembership.user,
    data: {
      yourCharacter: yourCharacter
        ? {
            id: yourCharacter.id,
            name: yourCharacter.name,
            description: yourCharacter.description ?? '',
            isNameRevealed: true,
            nodes: visibleNodes
              .filter(n => n.entityId === yourCharacter.id)
              .map(n => ({ id: n.id, title: n.title, content: n.content })),
          }
        : null,
      npcs: npcs.map(applyNameReveal),
      playerCharacters: otherPCs.map(applyNameReveal),
      locations: locations.map(applyNameReveal),
      factions: factions.map(applyNameReveal),
      threads: threads.map(applyTitleReveal),
      clues: clues.map(applyTitleReveal),
    },
  })
})

reveals.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const entityType = c.req.query('entityType') as EntityType | undefined
  const entityId = c.req.query('entityId')

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const entityReveals = await prisma.entityReveal.findMany({
    where: {
      campaignId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return c.json(entityReveals)
})

reveals.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const body = await c.req.json()
  if (!body.entityType || !body.entityId) {
    return c.json({ error: 'entityType and entityId are required' }, 400)
  }

  const reveal = await prisma.entityReveal.upsert({
    where: {
      entityType_entityId_userId: {
        entityType: body.entityType,
        entityId: body.entityId,
        userId: body.userId ?? null,
      },
    },
    create: {
      campaignId,
      entityType: body.entityType,
      entityId: body.entityId,
      userId: body.userId ?? null,
      displayName: body.displayName ?? null,
      displayDescription: body.displayDescription ?? null,
    },
    update: {
      displayName: body.displayName ?? null,
      displayDescription: body.displayDescription ?? null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return c.json(reveal, 201)
})

reveals.delete('/:revealId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const revealId = c.req.param('revealId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await prisma.entityReveal.deleteMany({
    where: { id: revealId, campaignId },
  })

  return c.json({ success: true })
})

export default reveals
