import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { prisma, EntityType } from '@grimoire/db'

import { handler as listCampaigns } from './tools/list-campaigns.js'
import { handler as getCampaignSummary } from './tools/get-campaign-summary.js'
import { handler as listPlayerCharacters } from './tools/list-player-characters.js'
import { handler as listNpcs } from './tools/list-npcs.js'
import { handler as getNpc } from './tools/get-npc.js'
import { handler as listOpenThreads } from './tools/list-open-threads.js'
import { handler as listSessions } from './tools/list-sessions.js'
import { handler as getSessionRecap } from './tools/get-session-recap.js'
import { handler as searchEntities } from './tools/search-entities.js'
import { handler as getPlayerKnowledge } from './tools/get-player-knowledge.js'
import { handler as updateNote } from './tools/update-note.js'
import { handler as updateStatus } from './tools/update-status.js'
import { handler as updateDescription } from './tools/update-description.js'
import { handler as revealEntity } from './tools/reveal-entity.js'

export function createMcpServer(userId: string) {
  const server = new McpServer({
    name: 'grimoire',
    version: '1.0.0',
  })

  server.tool(
    'list_campaigns',
    'List all campaigns you have access to',
    {},
    async (args) => listCampaigns(args, userId, prisma)
  )

  server.tool(
    'get_campaign_summary',
    'Get a high-level summary of a campaign — open threads, recent sessions, active NPCs, world events',
    { campaignId: z.string().describe('The campaign ID') },
    async (args) => getCampaignSummary(args, userId, prisma)
  )

  server.tool(
    'list_player_characters',
    'List all player characters in a campaign with their linked player info',
    { campaignId: z.string() },
    async (args) => listPlayerCharacters(args, userId, prisma)
  )

  server.tool(
    'list_npcs',
    'List all NPCs in a campaign with their status, location, and faction memberships',
    { campaignId: z.string() },
    async (args) => listNpcs(args, userId, prisma)
  )

  server.tool(
    'get_npc',
    'Get full details of an NPC including notes and relationships',
    { campaignId: z.string(), npcId: z.string() },
    async (args) => getNpc(args, userId, prisma)
  )

  server.tool(
    'list_open_threads',
    'List all open or dormant plot threads sorted by urgency',
    { campaignId: z.string() },
    async (args) => listOpenThreads(args, userId, prisma)
  )

  server.tool(
    'list_sessions',
    'List all sessions in a campaign',
    { campaignId: z.string() },
    async (args) => listSessions(args, userId, prisma)
  )

  server.tool(
    'get_session_recap',
    'Get the full recap and notes from a specific session',
    { campaignId: z.string(), sessionId: z.string() },
    async (args) => getSessionRecap(args, userId, prisma)
  )

  server.tool(
    'search_entities',
    'Search for entities across a campaign by name',
    { campaignId: z.string(), query: z.string() },
    async (args) => searchEntities(args, userId, prisma)
  )

  server.tool(
    'get_player_knowledge',
    'Get what a specific player knows about the campaign — their revealed entities and information nodes',
    { campaignId: z.string(), playerEmail: z.string().describe('Email address of the player') },
    async (args) => getPlayerKnowledge(args, userId, prisma)
  )

  server.tool(
    'update_note',
    'Create or edit a note on any entity (GM/CO_GM only). Pass noteId=null to create a new note, or the id of an existing note to update it.',
    {
      campaignId: z.string().describe('The campaign ID'),
      entityType: z.nativeEnum(EntityType).describe('Entity type the note is attached to'),
      entityId: z.string().describe('The entity ID'),
      noteId: z.string().nullable().describe('null to create a new note; note ID to update an existing note'),
      content: z.string().describe('Note content (plain text or markdown)'),
    },
    async (args) => updateNote(args, userId, prisma)
  )

  server.tool(
    'update_status',
    'Update the status of an entity (GM/CO_GM only). Allowed entity types: NPC, PLAYER_CHARACTER, LOCATION, FACTION, THREAD. Valid status values depend on the entity type — see error message on invalid input.',
    {
      campaignId: z.string().describe('The campaign ID'),
      entityType: z.enum(['NPC', 'PLAYER_CHARACTER', 'LOCATION', 'FACTION', 'THREAD']).describe('Entity type'),
      entityId: z.string().describe('The entity ID'),
      status: z.string().describe('New status value; validated against the entity type\'s enum'),
    },
    async (args) => updateStatus(args, userId, prisma)
  )

  server.tool(
    'update_description',
    'Update the description of an entity (GM/CO_GM only). Pass an empty string to clear. Allowed entity types: NPC, PLAYER_CHARACTER, LOCATION, FACTION, THREAD, CLUE.',
    {
      campaignId: z.string().describe('The campaign ID'),
      entityType: z.enum(['NPC', 'PLAYER_CHARACTER', 'LOCATION', 'FACTION', 'THREAD', 'CLUE']).describe('Entity type'),
      entityId: z.string().describe('The entity ID'),
      description: z.string().describe('New description. Empty string clears it.'),
    },
    async (args) => updateDescription(args, userId, prisma)
  )

  server.tool(
    'reveal_entity',
    'Reveal an entity to one or more player users, with optional alias overrides (GM/CO_GM only). Upserts per-player EntityReveal rows. Cannot target GMs.',
    {
      campaignId: z.string().describe('The campaign ID'),
      entityType: z.nativeEnum(EntityType).describe('Entity type to reveal'),
      entityId: z.string().describe('The entity ID'),
      playerUserIds: z.array(z.string()).describe('One or more player user IDs to reveal to'),
      displayName: z.string().nullable().describe('Optional alias name shown to players; null uses the entity\'s real name'),
      displayDescription: z.string().nullable().describe('Optional alias description shown to players; null uses the entity\'s real description'),
    },
    async (args) => revealEntity(args, userId, prisma)
  )

  return server
}
