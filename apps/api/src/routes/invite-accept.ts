import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { auth } from '../lib/auth.js'

const inviteAccept = new Hono()

inviteAccept.get('/:token', async (c) => {
  const token = c.req.param('token')!

  const invite = await prisma.campaignInvite.findUnique({
    where: { token },
    include: {
      campaign: { select: { name: true, description: true } },
    },
  })

  if (!invite) return c.json({ error: 'Invite not found' }, 404)
  if (invite.expiresAt < new Date()) return c.json({ error: 'Invite has expired' }, 410)
  if (invite.acceptedAt) return c.json({ error: 'Invite already accepted' }, 410)

  return c.json({
    email: invite.email,
    campaign: invite.campaign,
    expiresAt: invite.expiresAt,
  })
})

inviteAccept.post('/:token/accept', async (c) => {
  const token = c.req.param('token')!

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Must be signed in to accept invite' }, 401)

  const invite = await prisma.campaignInvite.findUnique({
    where: { token },
    include: { campaign: true },
  })

  if (!invite) return c.json({ error: 'Invite not found' }, 404)
  if (invite.expiresAt < new Date()) return c.json({ error: 'Invite has expired' }, 410)
  if (invite.acceptedAt) return c.json({ error: 'Invite already accepted' }, 410)

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return c.json({ error: 'This invite was sent to a different email address' }, 403)
  }

  const existing = await prisma.campaignMembership.findFirst({
    where: { campaignId: invite.campaignId, userId: session.user.id },
  })
  if (existing) return c.json({ error: 'Already a member' }, 400)

  await prisma.$transaction([
    prisma.campaignMembership.create({
      data: {
        campaignId: invite.campaignId,
        userId: session.user.id,
        role: invite.role,
      },
    }),
    prisma.campaignInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ])

  return c.json({ campaignId: invite.campaignId, success: true })
})

export default inviteAccept
