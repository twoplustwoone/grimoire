import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { prisma } from '@grimoire/db'

const server = new McpServer({
  name: 'grimoire',
  version: '1.0.0',
  description: 'Access your Grimoire tabletop RPG campaign data',
})

server.tool(
  'list_campaigns',
  'List all campaigns the GM has access to',
  {},
  async () => {
    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            npcs: true,
            locations: true,
            factions: true,
            threads: true,
            sessions: true,
          },
        },
      },
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(campaigns, null, 2) }],
    }
  }
)

server.tool(
  'get_campaign',
  'Get full details of a campaign including entity counts and open threads',
  { campaignId: z.string().describe('The campaign ID') },
  async ({ campaignId }) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            npcs: true,
            locations: true,
            factions: true,
            threads: true,
            clues: true,
            sessions: true,
          },
        },
      },
    })

    if (!campaign) {
      return { content: [{ type: 'text', text: 'Campaign not found' }] }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(campaign, null, 2) }],
    }
  }
)

server.tool(
  'list_npcs',
  'List all NPCs in a campaign with their status, location, and faction memberships',
  { campaignId: z.string().describe('The campaign ID') },
  async ({ campaignId }) => {
    const npcs = await prisma.nPC.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        location: { select: { name: true } },
        factionMemberships: {
          include: { faction: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(npcs, null, 2) }],
    }
  }
)

server.tool(
  'get_npc',
  'Get full details of an NPC including notes, history, and relationships',
  {
    campaignId: z.string().describe('The campaign ID'),
    npcId: z.string().describe('The NPC ID'),
  },
  async ({ campaignId, npcId }) => {
    const npc = await prisma.nPC.findFirst({
      where: { id: npcId, campaignId, deletedAt: null },
      include: {
        location: true,
        factionMemberships: { include: { faction: true } },
      },
    })

    if (!npc) return { content: [{ type: 'text', text: 'NPC not found' }] }

    const [notes, changelog] = await Promise.all([
      prisma.note.findMany({
        where: { entityType: 'NPC', entityId: npcId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.changelogEntry.findMany({
        where: { entityType: 'NPC', entityId: npcId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    return {
      content: [{ type: 'text', text: JSON.stringify({ ...npc, notes, changelog }, null, 2) }],
    }
  }
)

server.tool(
  'list_open_threads',
  'List all open or dormant plot threads in a campaign, sorted by urgency',
  { campaignId: z.string().describe('The campaign ID') },
  async ({ campaignId }) => {
    const threads = await prisma.thread.findMany({
      where: {
        campaignId,
        deletedAt: null,
        status: { in: ['OPEN', 'DORMANT'] },
      },
      include: {
        entityTags: true,
      },
      orderBy: [
        { urgency: 'asc' },
        { updatedAt: 'desc' },
      ],
    })

    const threadIds = threads.map((t) => t.id)
    const allNotes = threadIds.length
      ? await prisma.note.findMany({
          where: { entityType: 'THREAD', entityId: { in: threadIds } },
          orderBy: { createdAt: 'desc' },
        })
      : []

    const enriched = threads.map((t) => ({
      ...t,
      notes: allNotes.filter((n) => n.entityId === t.id).slice(0, 5),
    }))

    return {
      content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }],
    }
  }
)

server.tool(
  'get_session_recap',
  'Get the recap and notes from a specific session',
  {
    campaignId: z.string().describe('The campaign ID'),
    sessionId: z.string().describe('The session ID'),
  },
  async ({ campaignId, sessionId }) => {
    const session = await prisma.gameSession.findFirst({
      where: { id: sessionId, campaignId },
      include: { entityTags: true },
    })

    if (!session) return { content: [{ type: 'text', text: 'Session not found' }] }

    const notes = await prisma.note.findMany({
      where: { entityType: 'SESSION', entityId: sessionId },
      orderBy: { createdAt: 'asc' },
    })

    return {
      content: [{ type: 'text', text: JSON.stringify({ ...session, notes }, null, 2) }],
    }
  }
)

server.tool(
  'list_sessions',
  'List all sessions in a campaign with their status and recap summaries',
  { campaignId: z.string().describe('The campaign ID') },
  async ({ campaignId }) => {
    const sessions = await prisma.gameSession.findMany({
      where: { campaignId },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        playedOn: true,
        gmSummary: true,
        aiSummary: true,
        _count: { select: { entityTags: true } },
      },
      orderBy: { number: 'desc' },
    })

    return {
      content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }],
    }
  }
)

server.tool(
  'search_entities',
  'Search for entities across a campaign by name',
  {
    campaignId: z.string().describe('The campaign ID'),
    query: z.string().describe('Search query'),
  },
  async ({ campaignId, query }) => {
    const where = (field: string) => ({
      campaignId,
      deletedAt: null,
      [field]: { contains: query, mode: 'insensitive' as const },
    })

    const [npcs, locations, factions, threads, clues] = await Promise.all([
      prisma.nPC.findMany({ where: where('name'), select: { id: true, name: true, status: true }, take: 5 }),
      prisma.location.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
      prisma.faction.findMany({ where: where('name'), select: { id: true, name: true }, take: 5 }),
      prisma.thread.findMany({ where: { campaignId, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true, status: true }, take: 5 }),
      prisma.clue.findMany({ where: { campaignId, deletedAt: null, title: { contains: query, mode: 'insensitive' } }, select: { id: true, title: true }, take: 5 }),
    ])

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ npcs, locations, factions, threads, clues }, null, 2),
      }],
    }
  }
)

server.tool(
  'get_faction',
  'Get details of a faction including its members and agenda',
  {
    campaignId: z.string().describe('The campaign ID'),
    factionId: z.string().describe('The faction ID'),
  },
  async ({ campaignId, factionId }) => {
    const faction = await prisma.faction.findFirst({
      where: { id: factionId, campaignId, deletedAt: null },
      include: {
        memberships: {
          include: { npc: { select: { id: true, name: true, status: true } } },
        },
      },
    })

    if (!faction) return { content: [{ type: 'text', text: 'Faction not found' }] }

    const notes = await prisma.note.findMany({
      where: { entityType: 'FACTION', entityId: factionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      content: [{ type: 'text', text: JSON.stringify({ ...faction, notes }, null, 2) }],
    }
  }
)

server.tool(
  'get_campaign_summary',
  'Get a high-level summary of a campaign — open threads, recent sessions, active NPCs, and world events',
  { campaignId: z.string().describe('The campaign ID') },
  async ({ campaignId }) => {
    const [campaign, openThreads, recentSessions, activeNPCs, recentEvents] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { name: true, description: true, settings: true },
      }),
      prisma.thread.findMany({
        where: { campaignId, deletedAt: null, status: { in: ['OPEN', 'DORMANT'] } },
        select: { title: true, urgency: true, status: true },
        orderBy: { urgency: 'asc' },
      }),
      prisma.gameSession.findMany({
        where: { campaignId },
        select: { number: true, title: true, status: true, aiSummary: true, playedOn: true },
        orderBy: { number: 'desc' },
        take: 3,
      }),
      prisma.nPC.findMany({
        where: { campaignId, deletedAt: null, status: 'ACTIVE' },
        select: { name: true, description: true },
        take: 10,
      }),
      prisma.worldEvent.findMany({
        where: { campaignId },
        select: { title: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const summary = {
      campaign,
      openThreads,
      recentSessions,
      activeNPCs,
      recentWorldEvents: recentEvents,
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Grimoire MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
