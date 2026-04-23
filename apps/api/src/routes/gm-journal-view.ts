import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const gmJournalView = new Hono()

gmJournalView.use('*', authMiddleware)

async function getGMMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({
    where: { userId, campaignId, role: { in: ['GM', 'CO_GM'] } },
  })
}

const JOURNAL_ENTITY_SCOPES = ['NPC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE'] as const

gmJournalView.get('/', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!

  if (!(await getGMMembership(user.id, campaignId))) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const journals = await prisma.journal.findMany({
    where: {
      linkedCampaignId: campaignId,
      deletedAt: null,
      shares: { some: {} },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: { select: { sharedEntityType: true, sharedEntityId: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const rows = journals.map((j) => {
    const isJournalWideShare = j.shares.some((s) => s.sharedEntityType === 'JOURNAL')
    const sharedCaptureCount = j.shares.filter((s) => s.sharedEntityType === 'CAPTURE').length
    const sharedEntityCount = j.shares.filter((s) =>
      (JOURNAL_ENTITY_SCOPES as readonly string[]).includes(s.sharedEntityType)
    ).length
    const hasSharedPc = j.shares.some((s) => s.sharedEntityType === 'PLAYER_CHARACTER')
    return {
      journalId: j.id,
      journalName: j.name,
      ownerName: j.owner.name ?? j.owner.email,
      isJournalWideShare,
      sharedCaptureCount,
      sharedEntityCount,
      hasSharedPc,
    }
  })

  return c.json(rows)
})

gmJournalView.get('/:journalId', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const journalId = c.req.param('journalId')!

  if (!(await getGMMembership(user.id, campaignId))) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const journal = await prisma.journal.findFirst({
    where: { id: journalId, deletedAt: null, linkedCampaignId: campaignId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: true,
    },
  })
  if (!journal) return c.json({ error: 'Not found' }, 404)
  if (journal.shares.length === 0) return c.json({ error: 'Not found' }, 404)

  const isJournalWideShare = journal.shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const sharedCaptureIds = new Set(
    journal.shares.filter((s) => s.sharedEntityType === 'CAPTURE').map((s) => s.sharedEntityId!)
  )
  const sharedNpcIds = new Set(
    journal.shares.filter((s) => s.sharedEntityType === 'NPC').map((s) => s.sharedEntityId!)
  )
  const sharedPcIds = new Set(
    journal.shares.filter((s) => s.sharedEntityType === 'PLAYER_CHARACTER').map((s) => s.sharedEntityId!)
  )

  // Captures (+ session metadata)
  const captures = await prisma.journalCapture.findMany({
    where: {
      journalId,
      deletedAt: null,
      ...(isJournalWideShare ? {} : { id: { in: Array.from(sharedCaptureIds) } }),
    },
    include: {
      journalSession: { select: { id: true, number: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Journal NPCs
  const npcs = await prisma.nPC.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      deletedAt: null,
      ...(isJournalWideShare ? {} : { id: { in: Array.from(sharedNpcIds) } }),
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  // Journal PC (0 or 1 — mirror pattern; tolerate multiple defensively)
  const pcs = await prisma.playerCharacter.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journalId,
      deletedAt: null,
      ...(isJournalWideShare ? {} : { id: { in: Array.from(sharedPcIds) } }),
    },
    select: { id: true, name: true, description: true },
  })

  return c.json({
    journal: {
      id: journal.id,
      name: journal.name,
      ownerName: journal.owner.name ?? journal.owner.email,
    },
    isJournalWideShare,
    pc: pcs[0] ?? null,
    captures: captures.map((cap) => ({
      id: cap.id,
      content: cap.content,
      createdAt: cap.createdAt,
      sessionId: cap.journalSession.id,
      sessionNumber: cap.journalSession.number,
      sessionTitle: cap.journalSession.title,
    })),
    entities: {
      npcs,
      locations: [] as Array<{ id: string; name: string; description: string | null }>,
      factions: [] as Array<{ id: string; name: string; description: string | null }>,
      threads: [] as Array<{ id: string; title: string; description: string | null }>,
      clues: [] as Array<{ id: string; title: string; description: string | null }>,
    },
  })
})

export default gmJournalView
