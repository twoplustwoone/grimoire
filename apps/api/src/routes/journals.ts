import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journals = new Hono()

journals.use('*', authMiddleware)

// List journals owned by the current user.
journals.get('/', async (c) => {
  const user = c.get('user')

  const rows = await prisma.journal.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      linkedCampaignId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return c.json(rows)
})

// Create a journal. Freestanding (linkedCampaignId null).
journals.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const journal = await prisma.journal.create({
    data: {
      ownerId: user.id,
      name: body.name.trim(),
    },
  })

  return c.json(journal, 201)
})

// Get a single journal. Owner-only: 403 on foreign, 404 on missing/deleted.
journals.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')!
  const guard = await guardJournal(user.id, id)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)
  return c.json(guard.journal)
})

// Update a journal. Owner-only. Only `name` is accepted in J2.
journals.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')!
  const guard = await guardJournal(user.id, id)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json()

  if (body.name !== undefined) {
    const trimmed = typeof body.name === 'string' ? body.name.trim() : ''
    if (!trimmed) return c.json({ error: 'Name cannot be empty' }, 400)
    const updated = await prisma.journal.update({
      where: { id },
      data: { name: trimmed },
    })
    return c.json(updated)
  }

  return c.json(guard.journal)
})

// Soft-delete. Owner-only.
journals.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')!
  const guard = await guardJournal(user.id, id)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  await prisma.journal.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return c.json({ success: true })
})

// Link an unlinked journal to a campaign. Handles the three pcChoice
// paths in one transaction: claim_existing (create journal PC + mirror),
// create_new (create both PCs + mirror), or none (link only). Any
// stale mirror from a previous link to a different campaign is torn
// down before the new mirror is created.
journals.post('/:id/link', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')!
  const guard = await guardJournal(user.id, id)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  if (guard.journal.linkedCampaignId) {
    return c.json({ error: 'Journal is already linked. Unlink first.' }, 409)
  }

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const { campaignId, pcChoice, existingPcId, newPcName, seedBackstoryFromCampaignPc } = body as {
    campaignId?: unknown
    pcChoice?: unknown
    existingPcId?: unknown
    newPcName?: unknown
    seedBackstoryFromCampaignPc?: unknown
  }

  if (typeof campaignId !== 'string' || !campaignId) {
    return c.json({ error: 'campaignId is required' }, 400)
  }
  if (pcChoice !== 'claim_existing' && pcChoice !== 'create_new' && pcChoice !== 'none') {
    return c.json({ error: 'pcChoice must be claim_existing | create_new | none' }, 400)
  }

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: user.id },
  })
  if (!membership) return c.json({ error: 'Not a member of this campaign' }, 403)

  // Find any existing journal-side mirror tied to this journal's PCs
  // (stale or otherwise). We'll tear it down if we're creating a new
  // mirror; otherwise leave it alone.
  const staleMirror = await prisma.playerCharacterMirror.findFirst({
    where: { journalPc: { ownerType: 'JOURNAL', ownerId: id } },
  })

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (pcChoice === 'claim_existing') {
        if (typeof existingPcId !== 'string' || !existingPcId) {
          throw Object.assign(new Error('existingPcId required'), { status: 400 })
        }
        const campaignPc = await tx.playerCharacter.findFirst({
          where: { id: existingPcId, ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
          include: { campaignMirror: { select: { id: true } } },
        })
        if (!campaignPc) throw Object.assign(new Error('Campaign PC not found'), { status: 404 })
        if (campaignPc.linkedUserId !== user.id) {
          throw Object.assign(new Error('You do not own this character'), { status: 403 })
        }
        if (campaignPc.campaignMirror) {
          throw Object.assign(new Error('This character is already mirrored'), { status: 409 })
        }

        if (staleMirror) {
          await tx.playerCharacterMirror.delete({ where: { id: staleMirror.id } })
        }

        const journalPc = await tx.playerCharacter.create({
          data: {
            ownerType: 'JOURNAL',
            ownerId: id,
            linkedUserId: user.id,
            name: campaignPc.name,
            description: seedBackstoryFromCampaignPc ? campaignPc.description : null,
            status: 'ACTIVE',
          },
        })
        await tx.playerCharacterMirror.create({
          data: { campaignPcId: campaignPc.id, journalPcId: journalPc.id },
        })
      } else if (pcChoice === 'create_new') {
        if (typeof newPcName !== 'string' || !newPcName.trim()) {
          throw Object.assign(new Error('newPcName required'), { status: 400 })
        }
        const name = newPcName.trim()

        if (staleMirror) {
          await tx.playerCharacterMirror.delete({ where: { id: staleMirror.id } })
        }

        const campaignPc = await tx.playerCharacter.create({
          data: {
            ownerType: 'CAMPAIGN',
            ownerId: campaignId,
            linkedUserId: user.id,
            name,
            status: 'ACTIVE',
          },
        })
        const journalPc = await tx.playerCharacter.create({
          data: {
            ownerType: 'JOURNAL',
            ownerId: id,
            linkedUserId: user.id,
            name,
            status: 'ACTIVE',
          },
        })
        await tx.playerCharacterMirror.create({
          data: { campaignPcId: campaignPc.id, journalPcId: journalPc.id },
        })
      } else {
        // 'none' — clean up any stale mirror, link only.
        if (staleMirror) {
          await tx.playerCharacterMirror.delete({ where: { id: staleMirror.id } })
        }
      }

      const updated = await tx.journal.update({
        where: { id },
        data: { linkedCampaignId: campaignId },
        include: { linkedCampaign: { select: { id: true, name: true } } },
      })
      return updated
    })

    return c.json(result)
  } catch (e) {
    const err = e as { status?: number; message?: string }
    if (err.status && err.message) return c.json({ error: err.message }, err.status as 400 | 403 | 404 | 409)
    throw e
  }
})

// Unlink. Preserve JournalLink rows (stale per design doc) and the
// PlayerCharacterMirror row (becomes effectively stale; torn down
// only during a future re-link to a different campaign).
journals.post('/:id/unlink', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')!
  const guard = await guardJournal(user.id, id)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  if (!guard.journal.linkedCampaignId) {
    return c.json({ error: 'Journal is not linked' }, 409)
  }

  const updated = await prisma.journal.update({
    where: { id },
    data: { linkedCampaignId: null },
  })
  return c.json(updated)
})

export default journals
