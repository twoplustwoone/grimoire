import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const invites = new Hono()
invites.use('*', authMiddleware)

async function getGMMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId, role: { in: ['GM', 'CO_GM'] } },
  })
}

invites.post('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const body = await c.req.json()
  if (!body.email?.trim()) return c.json({ error: 'Email is required' }, 400)

  const role: 'PLAYER' | 'CO_GM' = body.role === 'CO_GM' ? 'CO_GM' : 'PLAYER'

  let pcId: string | null = null
  if (body.pcId) {
    if (typeof body.pcId !== 'string') return c.json({ error: 'pcId must be a string' }, 400)
    const pc = await prisma.playerCharacter.findFirst({
      where: { id: body.pcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
      include: { campaignMirror: { select: { id: true } } },
    })
    if (!pc) return c.json({ error: 'PC not found in this campaign' }, 400)
    if (pc.linkedUserId) return c.json({ error: 'That character is already claimed' }, 400)
    if (pc.campaignMirror) return c.json({ error: 'That character is already mirrored to a journal' }, 400)
    pcId = pc.id
  }

  const existingUser = await prisma.user.findFirst({ where: { email: body.email.trim() } })
  if (existingUser) {
    const existingMembership = await prisma.campaignMembership.findFirst({
      where: { campaignId, userId: existingUser.id },
    })
    if (existingMembership) {
      return c.json({ error: 'This user is already a campaign member' }, 400)
    }
  }

  await prisma.campaignInvite.deleteMany({
    where: { campaignId, email: body.email.trim(), acceptedAt: null },
  })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.campaignInvite.create({
    data: {
      campaignId,
      email: body.email.trim(),
      role,
      pcId,
      expiresAt,
    },
  })

  const webUrl = process.env.WEB_URL ?? 'http://localhost:3000'
  const inviteUrl = `${webUrl}/invite/${invite.token}`

  return c.json({ invite, inviteUrl }, 201)
})

invites.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const inviteList = await prisma.campaignInvite.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  })

  return c.json(inviteList)
})

invites.delete('/:inviteId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const inviteId = c.req.param('inviteId')!

  if (!await getGMMembership(user.id, campaignId)) {
    return c.json({ error: 'Not authorized' }, 403)
  }

  await prisma.campaignInvite.deleteMany({
    where: { id: inviteId, campaignId },
  })

  return c.json({ success: true })
})

export default invites
