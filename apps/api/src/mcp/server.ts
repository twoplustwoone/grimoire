import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma } from '@grimoire/db'

export function createMcpServer(userId: string) {
  const server = new McpServer({
    name: 'grimoire',
    version: '1.0.0',
  })

  server.tool(
    'list_campaigns',
    'List all campaigns you have access to',
    {},
    async () => {
      const memberships = await prisma.campaignMembership.findMany({
        where: { userId },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              _count: {
                select: { npcs: true, playerCharacters: true, locations: true, factions: true, threads: true, clues: true, sessions: true },
              },
            },
          },
        },
      })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(memberships.map(m => ({ ...m.campaign, role: m.role })), null, 2),
        }],
      }
    }
  )

  server.tool(
    'get_campaign_summary',
    'Get a high-level summary of a campaign — open threads, recent sessions, active NPCs, world events',
    { campaignId: z.string().describe('The campaign ID') },
    async ({ campaignId }) => {
      const membership = await prisma.campaignMembership.findFirst({
        where: { campaignId, userId },
      })
      if (!membership) return { content: [{ type: 'text', text: 'Campaign not found or access denied' }] }

      const [campaign, openThreads, recentSessions, activeNPCs, playerCharacters, recentEvents] = await Promise.all([
        prisma.campaign.findUnique({
          where: { id: campaignId },
          select: {
            name: true,
            description: true,
            settings: true,
            _count: {
              select: { npcs: true, playerCharacters: true, locations: true, factions: true, threads: true, clues: true, sessions: true },
            },
          },
        }),
        prisma.thread.findMany({
          where: { campaignId, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
          select: { id: true, title: true, urgency: true, status: true, description: true },
          orderBy: { urgency: 'asc' },
        }),
        prisma.gameSession.findMany({
          where: { campaignId },
          select: { id: true, number: true, title: true, status: true, aiSummary: true, playedOn: true },
          orderBy: { number: 'desc' },
          take: 3,
        }),
        prisma.nPC.findMany({
          where: { campaignId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true, name: true, description: true },
          take: 10,
        }),
        prisma.playerCharacter.findMany({
          where: { campaignId, deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            linkedUser: { select: { name: true, email: true } },
          },
        }),
        prisma.worldEvent.findMany({
          where: { campaignId },
          select: { title: true, description: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ campaign, openThreads, recentSessions, activeNPCs, playerCharacters, recentWorldEvents: recentEvents }, null, 2),
        }],
      }
    }
  )

  server.tool(
    'list_player_characters',
    'List all player characters in a campaign with their linked player info',
    { campaignId: z.string() },
    async ({ campaignId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const pcs = await prisma.playerCharacter.findMany({
        where: { campaignId, deletedAt: null },
        include: {
          linkedUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: 'asc' },
      })

      return { content: [{ type: 'text', text: JSON.stringify(pcs, null, 2) }] }
    }
  )

  server.tool(
    'list_npcs',
    'List all NPCs in a campaign with their status, location, and faction memberships',
    { campaignId: z.string() },
    async ({ campaignId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const npcs = await prisma.nPC.findMany({
        where: { campaignId, deletedAt: null },
        include: {
          location: { select: { name: true } },
          factionMemberships: { include: { faction: { select: { name: true } } } },
        },
        orderBy: { name: 'asc' },
      })

      return { content: [{ type: 'text', text: JSON.stringify(npcs, null, 2) }] }
    }
  )

  server.tool(
    'get_npc',
    'Get full details of an NPC including notes and relationships',
    { campaignId: z.string(), npcId: z.string() },
    async ({ campaignId, npcId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const npc = await prisma.nPC.findFirst({
        where: { id: npcId, campaignId, deletedAt: null },
        include: {
          location: true,
          factionMemberships: { include: { faction: true } },
        },
      })
      if (!npc) return { content: [{ type: 'text', text: 'NPC not found' }] }

      const notes = await prisma.note.findMany({
        where: { entityType: 'NPC', entityId: npcId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      return { content: [{ type: 'text', text: JSON.stringify({ ...npc, notes }, null, 2) }] }
    }
  )

  server.tool(
    'list_open_threads',
    'List all open or dormant plot threads sorted by urgency',
    { campaignId: z.string() },
    async ({ campaignId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const threads = await prisma.thread.findMany({
        where: { campaignId, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
        include: { entityTags: true },
        orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
      })

      return { content: [{ type: 'text', text: JSON.stringify(threads, null, 2) }] }
    }
  )

  server.tool(
    'list_sessions',
    'List all sessions in a campaign',
    { campaignId: z.string() },
    async ({ campaignId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const sessions = await prisma.gameSession.findMany({
        where: { campaignId },
        select: {
          id: true, number: true, title: true, status: true,
          playedOn: true, gmSummary: true, aiSummary: true,
          _count: { select: { entityTags: true } },
        },
        orderBy: { number: 'desc' },
      })

      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] }
    }
  )

  server.tool(
    'get_session_recap',
    'Get the full recap and notes from a specific session',
    { campaignId: z.string(), sessionId: z.string() },
    async ({ campaignId, sessionId }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const session = await prisma.gameSession.findFirst({
        where: { id: sessionId, campaignId },
        include: { entityTags: true },
      })
      if (!session) return { content: [{ type: 'text', text: 'Session not found' }] }

      const notes = await prisma.note.findMany({
        where: { entityType: 'SESSION', entityId: sessionId },
        orderBy: { createdAt: 'asc' },
      })

      return { content: [{ type: 'text', text: JSON.stringify({ ...session, notes }, null, 2) }] }
    }
  )

  server.tool(
    'search_entities',
    'Search for entities across a campaign by name',
    { campaignId: z.string(), query: z.string() },
    async ({ campaignId, query }) => {
      const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId } })
      if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }

      const where = (field: string) => ({
        campaignId, deletedAt: null,
        [field]: { contains: query, mode: 'insensitive' as const },
      })

      const [npcs, playerCharacters, locations, factions, threads, clues] = await Promise.all([
        prisma.nPC.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
        prisma.playerCharacter.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
        prisma.location.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
        prisma.faction.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
        prisma.thread.findMany({ where: { campaignId, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true, status: true }, take: 5 }),
        prisma.clue.findMany({ where: { campaignId, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true }, take: 5 }),
      ])

      return { content: [{ type: 'text', text: JSON.stringify({ npcs, playerCharacters, locations, factions, threads, clues }, null, 2) }] }
    }
  )

  server.tool(
    'get_player_knowledge',
    'Get what a specific player knows about the campaign — their revealed entities and information nodes',
    { campaignId: z.string(), playerEmail: z.string().describe('Email address of the player') },
    async ({ campaignId, playerEmail }) => {
      const membership = await prisma.campaignMembership.findFirst({
        where: { campaignId, userId, role: { in: ['GM', 'CO_GM'] } },
      })
      if (!membership) return { content: [{ type: 'text', text: 'Only GMs can query player knowledge' }] }

      const player = await prisma.user.findFirst({ where: { email: playerEmail } })
      if (!player) return { content: [{ type: 'text', text: 'Player not found' }] }

      const playerMembership = await prisma.campaignMembership.findFirst({
        where: { campaignId, userId: player.id },
      })
      if (!playerMembership) return { content: [{ type: 'text', text: 'Player is not in this campaign' }] }

      const reveals = await prisma.entityReveal.findMany({
        where: {
          campaignId,
          OR: [{ userId: player.id }, { userId: null }],
        },
      })

      // Group reveal ids by entity type so we can resolve current name/description
      // in one query per type and omit any reveals pointing at soft-deleted entities.
      const idsByType: Record<string, string[]> = {}
      for (const r of reveals) (idsByType[r.entityType] ??= []).push(r.entityId)

      const [npcRows, pcRows, locRows, facRows, thrRows, clueRows] = await Promise.all([
        prisma.nPC.findMany({ where: { id: { in: idsByType.NPC ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
        prisma.playerCharacter.findMany({ where: { id: { in: idsByType.PLAYER_CHARACTER ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
        prisma.location.findMany({ where: { id: { in: idsByType.LOCATION ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
        prisma.faction.findMany({ where: { id: { in: idsByType.FACTION ?? [] }, deletedAt: null }, select: { id: true, name: true, description: true } }),
        prisma.thread.findMany({ where: { id: { in: idsByType.THREAD ?? [] }, deletedAt: null }, select: { id: true, title: true, description: true } }),
        prisma.clue.findMany({ where: { id: { in: idsByType.CLUE ?? [] }, deletedAt: null }, select: { id: true, title: true, description: true } }),
      ])

      const lookup = new Map<string, { name: string; description: string | null }>()
      for (const e of npcRows) lookup.set(`NPC:${e.id}`, { name: e.name, description: e.description })
      for (const e of pcRows) lookup.set(`PLAYER_CHARACTER:${e.id}`, { name: e.name, description: e.description })
      for (const e of locRows) lookup.set(`LOCATION:${e.id}`, { name: e.name, description: e.description })
      for (const e of facRows) lookup.set(`FACTION:${e.id}`, { name: e.name, description: e.description })
      for (const e of thrRows) lookup.set(`THREAD:${e.id}`, { name: e.title, description: e.description })
      for (const e of clueRows) lookup.set(`CLUE:${e.id}`, { name: e.title, description: e.description })

      // Alias override precedence: reveal.displayName beats entity.name when present,
      // same for description. Reveals pointing at soft-deleted entities are dropped.
      const enrichedEntities = reveals.flatMap(r => {
        const base = lookup.get(`${r.entityType}:${r.entityId}`)
        if (!base) return []
        return [{
          entityType: r.entityType,
          entityId: r.entityId,
          displayName: r.displayName,
          displayDescription: r.displayDescription,
          isAlias: !!r.displayName,
          name: r.displayName ?? base.name,
          description: r.displayDescription ?? base.description,
        }]
      })

      const allNodes = await prisma.informationNode.findMany({ where: { campaignId } })
      const specificRevealIds = await prisma.informationNodeReveal.findMany({
        where: { membership: { userId: player.id, campaignId } },
        select: { informationNodeId: true },
      })
      const specificRevealSet = new Set(specificRevealIds.map(r => r.informationNodeId))

      const visibleNodes = allNodes.filter(n => {
        if (n.visibility === 'GM_ONLY') return false
        if (n.visibility === 'ALL_PLAYERS') return true
        return specificRevealSet.has(n.id)
      })

      const summary = {
        player: { name: player.name, email: player.email },
        revealedEntities: enrichedEntities.length,
        entities: enrichedEntities,
        visibleInformationNodes: visibleNodes.map(n => ({
          title: n.title,
          content: n.content,
          visibility: n.visibility,
          entityType: n.entityType,
          entityId: n.entityId,
        })),
      }

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
    }
  )

  return server
}
