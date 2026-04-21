import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { generateSessionRecap } from '../lib/recap.js'

const recap = new Hono()
recap.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

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

  try {
    const aiSummary = await generateSessionRecap({ campaignId, sessionId })

    const updated = await prisma.gameSession.update({
      where: { id: sessionId },
      data: { aiSummary },
    })

    return c.json({ aiSummary: updated.aiSummary })
  } catch (err) {
    console.error('Recap generation failed:', err)
    return c.json({ error: 'Failed to generate recap' }, 500)
  }
})

export default recap
