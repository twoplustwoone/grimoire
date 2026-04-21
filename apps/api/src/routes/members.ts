import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const members = new Hono()

members.use('*', authMiddleware)

members.delete('/:userId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const targetUserId = c.req.param('userId')!

  const callerMembership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: user.id },
  })
  if (!callerMembership) return c.json({ error: 'Not found' }, 404)
  if (callerMembership.role !== 'GM' && callerMembership.role !== 'CO_GM') {
    return c.json({ error: 'Not authorized' }, 403)
  }

  const targetMembership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: targetUserId },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!targetMembership) return c.json({ error: 'Membership not found' }, 404)

  if (targetMembership.role === 'GM' && targetUserId !== user.id) {
    return c.json(
      { error: 'Cannot remove a GM. Transfer the GM role first.', code: 'CANNOT_REMOVE_GM' },
      403
    )
  }

  if (targetUserId === user.id && targetMembership.role === 'GM') {
    const gmCount = await prisma.campaignMembership.count({
      where: { campaignId, role: 'GM' },
    })
    if (gmCount <= 1) {
      return c.json(
        { error: 'Cannot remove the sole GM of a campaign.', code: 'SOLE_GM' },
        403
      )
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const pcs = await tx.playerCharacter.findMany({
      where: { ownerType: 'CAMPAIGN', ownerId: campaignId, linkedUserId: targetUserId, deletedAt: null },
      select: { id: true, name: true, status: true, linkedUserId: true },
    })

    const retired: Array<{ id: string; name: string; previousStatus: string }> = []
    for (const pc of pcs) {
      await tx.playerCharacter.update({
        where: { id: pc.id },
        data: { status: 'RETIRED', linkedUserId: null },
      })
      if (pc.status !== 'RETIRED') {
        await tx.changelogEntry.create({
          data: {
            entityType: 'PLAYER_CHARACTER',
            entityId: pc.id,
            campaignId,
            authorId: user.id,
            field: 'status',
            oldValue: pc.status,
            newValue: 'RETIRED',
            note: 'Retired automatically on player removal from campaign',
          },
        })
      }
      if (pc.linkedUserId) {
        await tx.changelogEntry.create({
          data: {
            entityType: 'PLAYER_CHARACTER',
            entityId: pc.id,
            campaignId,
            authorId: user.id,
            field: 'linkedUserId',
            oldValue: pc.linkedUserId,
            newValue: '',
            note: 'Unlinked on player removal from campaign',
          },
        })
      }
      retired.push({ id: pc.id, name: pc.name, previousStatus: pc.status })
    }

    await tx.campaignMembership.delete({
      where: { id: targetMembership.id },
    })

    await tx.changelogEntry.create({
      data: {
        entityType: 'MEMBERSHIP',
        entityId: targetUserId,
        campaignId,
        authorId: user.id,
        field: 'removed',
        oldValue: targetMembership.user.name ?? targetMembership.user.email,
        newValue: null,
      },
    })

    return { retired }
  })

  return c.json({
    success: true,
    removedUserId: targetUserId,
    retiredPlayerCharacters: result.retired,
  })
})

export default members
