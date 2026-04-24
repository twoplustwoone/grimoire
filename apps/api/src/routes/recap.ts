import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { generateSessionRecap } from '../lib/recap.js'
import { getRecapUsage, incrementRecapUsage } from '@grimoire/db/ai-limits'

const recap = new Hono()
recap.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

recap.get('/:sessionId/recap/usage', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const usage = await getRecapUsage(user.id)
  return c.json({ usage })
})

recap.post('/:sessionId/recap', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const sessionId = c.req.param('sessionId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'CAMPAIGN', ownerId: campaignId },
  })
  if (!session) return c.json({ error: 'Session not found' }, 404)

  if (!process.env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'ANTHROPIC_API_KEY is not configured' }, 503)
  }

  const usage = await getRecapUsage(user.id)
  if (usage.count >= usage.limit) {
    return c.json(
      {
        error: `You've used ${usage.count}/${usage.limit} recaps this month. Resets on ${new Date(usage.resetsOn).toLocaleDateString()}.`,
        code: 'RECAP_LIMIT_REACHED',
        usage,
      },
      429,
    )
  }

  let aiSummary: string
  try {
    aiSummary = await generateSessionRecap({ campaignId, sessionId })
  } catch (err) {
    console.error('Recap generation failed:', err)
    return c.json({ error: 'Failed to generate recap' }, 500)
  }

  const [updated, newUsage] = await Promise.all([
    prisma.gameSession.update({
      where: { id: sessionId },
      data: { aiSummary },
    }),
    incrementRecapUsage(user.id),
  ])

  return c.json({ aiSummary: updated.aiSummary, usage: newUsage })
})

export default recap
