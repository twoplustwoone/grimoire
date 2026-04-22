import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { auth } from './lib/auth.js'
import campaigns from './routes/campaigns.js'
import npcs from './routes/npcs.js'
import locations from './routes/locations.js'
import factions from './routes/factions.js'
import threads from './routes/threads.js'
import clues from './routes/clues.js'
import sessions from './routes/sessions.js'
import recapRouter from './routes/recap.js'
import search from './routes/search.js'
import graph from './routes/graph.js'
import worldEvents from './routes/world-events.js'
import notes from './routes/notes.js'
import infoNodes from './routes/information-nodes.js'
import invites from './routes/invites.js'
import inviteAccept from './routes/invite-accept.js'
import reveals from './routes/reveals.js'
import apiKeys from './routes/api-keys.js'
import playerCharacters from './routes/player-characters.js'
import members from './routes/members.js'
import journals from './routes/journals.js'
import journalSessions from './routes/journal-sessions.js'
import journalCaptures from './routes/journal-captures.js'
import { handleMcpRequest } from './mcp/handler.js'
import oauth from './mcp/oauth-routes.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.WEB_URL ?? 'http://localhost:3000',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/campaigns', campaigns)
app.route('/journals', journals)
app.route('/journals/:id/sessions', journalSessions)
app.route('/journals/:id/captures', journalCaptures)
app.route('/campaigns/:campaignId/npcs', npcs)
app.route('/campaigns/:campaignId/player-characters', playerCharacters)
app.route('/campaigns/:campaignId/locations', locations)
app.route('/campaigns/:campaignId/factions', factions)
app.route('/campaigns/:campaignId/threads', threads)
app.route('/campaigns/:campaignId/clues', clues)
app.route('/campaigns/:campaignId/sessions', sessions)
app.route('/campaigns/:campaignId/sessions', recapRouter)
app.route('/campaigns/:campaignId/world-events', worldEvents)
app.route('/campaigns/:campaignId/notes', notes)
app.route('/campaigns/:campaignId/information-nodes', infoNodes)
app.route('/campaigns/:campaignId/invites', invites)
app.route('/campaigns/:campaignId/members', members)
app.route('/campaigns/:campaignId/reveals', reveals)
app.route('/invites', inviteAccept)
app.route('/api-keys', apiKeys)
app.route('/search', search)
app.route('/graph', graph)

app.route('/', oauth)

app.all('/mcp', handleMcpRequest)
app.all('/mcp/*', handleMcpRequest)

const port = Number(process.env.PORT ?? 3005)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})

export default app
