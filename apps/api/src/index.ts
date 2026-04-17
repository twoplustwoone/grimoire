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

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.WEB_URL ?? 'http://localhost:3000',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.on(['GET', 'POST'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/campaigns', campaigns)
app.route('/campaigns/:campaignId/npcs', npcs)
app.route('/campaigns/:campaignId/locations', locations)
app.route('/campaigns/:campaignId/factions', factions)
app.route('/campaigns/:campaignId/threads', threads)
app.route('/campaigns/:campaignId/clues', clues)
app.route('/campaigns/:campaignId/sessions', sessions)
app.route('/campaigns/:campaignId/sessions', recapRouter)

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})

export default app
