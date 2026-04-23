import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalPlayerCharacters = new Hono()

journalPlayerCharacters.use('*', authMiddleware)

journalPlayerCharacters.get('/:pcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const pcId = c.req.param('pcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const pc = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
    include: {
      journalMirror: {
        include: {
          campaignPc: {
            select: {
              id: true,
              ownerId: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  })
  if (!pc) return c.json({ error: 'Not found' }, 404)
  return c.json(pc)
})

journalPlayerCharacters.patch('/:pcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const pcId = c.req.param('pcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
    include: { journalMirror: { select: { id: true, campaignPcId: true } } },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json()

  // If mirrored and the name changed, sync to the campaign-side PC
  // in a single transaction so the two rows never drift.
  const nextName =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name
  const nextDescription =
    body.description !== undefined ? (body.description?.trim() ?? null) : existing.description

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.playerCharacter.update({
      where: { id: pcId },
      data: {
        name: nextName,
        description: nextDescription,
      },
    })
    if (existing.journalMirror && nextName !== existing.name) {
      await tx.playerCharacter.update({
        where: { id: existing.journalMirror.campaignPcId },
        data: { name: nextName },
      })
    }
    return u
  })

  return c.json(updated)
})

journalPlayerCharacters.delete('/:pcId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const pcId = c.req.param('pcId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.playerCharacter.findFirst({
    where: { id: pcId, ownerType: 'JOURNAL', ownerId: journalId, deletedAt: null },
  })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.playerCharacter.update({
    where: { id: pcId },
    data: { deletedAt: new Date() },
  })
  return c.json({ success: true })
})

export default journalPlayerCharacters
