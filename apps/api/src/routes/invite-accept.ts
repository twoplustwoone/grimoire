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

  const freestandingJournals = await prisma.journal.count({
    where: { ownerId: session.user.id, deletedAt: null, linkedCampaignId: null },
  })

  const result = await prisma.$transaction(async (tx) => {
    await tx.campaignMembership.create({
      data: {
        campaignId: invite.campaignId,
        userId: session.user.id,
        role: invite.role,
      },
    })
    await tx.campaignInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    })

    let claimedPcId: string | null = null
    if (invite.pcId) {
      const pc = await tx.playerCharacter.findFirst({
        where: { id: invite.pcId, ownerType: 'CAMPAIGN', ownerId: invite.campaignId, deletedAt: null },
        include: { campaignMirror: { select: { id: true } } },
      })
      // Quietly skip if the PC is no longer claimable — the user still
      // joined; they can claim a different PC later.
      if (pc && !pc.linkedUserId && !pc.campaignMirror) {
        await tx.playerCharacter.update({
          where: { id: pc.id },
          data: { linkedUserId: session.user.id },
        })
        claimedPcId = pc.id
      }
    }

    // Auto-create a journal in two cases (both preserve the
    // "every membership guarantees a journal" rule):
    //   - zero journals + claimed PC → create + link + mirror
    //   - zero journals + no claimed PC → create freestanding
    let autoCreatedJournalId: string | null = null
    const totalJournals = await tx.journal.count({
      where: { ownerId: session.user.id, deletedAt: null },
    })

    if (totalJournals === 0) {
      const defaultName = session.user.name
        ? `${session.user.name}'s Journal`
        : `${invite.campaign.name} Journal`

      if (claimedPcId) {
        const campaignPc = await tx.playerCharacter.findUnique({ where: { id: claimedPcId } })
        if (!campaignPc) throw new Error('claimed PC vanished')
        const journal = await tx.journal.create({
          data: {
            ownerId: session.user.id,
            name: defaultName,
            linkedCampaignId: invite.campaignId,
          },
        })
        const journalPc = await tx.playerCharacter.create({
          data: {
            ownerType: 'JOURNAL',
            ownerId: journal.id,
            linkedUserId: session.user.id,
            name: campaignPc.name,
            status: 'ACTIVE',
          },
        })
        await tx.playerCharacterMirror.create({
          data: { campaignPcId: campaignPc.id, journalPcId: journalPc.id },
        })
        autoCreatedJournalId = journal.id
      } else {
        const journal = await tx.journal.create({
          data: { ownerId: session.user.id, name: defaultName },
        })
        autoCreatedJournalId = journal.id
      }
    }

    return { claimedPcId, autoCreatedJournalId }
  })

  // Client needs the linking sheet when the user has existing journals
  // AND a PC was claimed from the invite (the linking ceremony binds
  // the claimed PC to one of those journals).
  const requiresLinkingSheet =
    freestandingJournals > 0 && result.claimedPcId !== null

  return c.json({
    campaignId: invite.campaignId,
    success: true,
    autoCreatedJournalId: result.autoCreatedJournalId,
    pcId: result.claimedPcId,
    requiresLinkingSheet,
  })
})

export default inviteAccept
