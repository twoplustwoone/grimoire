import { Hono } from 'hono'
import { prisma, type ShareScope } from '@grimoire/db'
import { docToPlainText, type ProseMirrorDoc } from '@grimoire/db/prosemirror'
import { authMiddleware } from '../lib/auth-middleware.js'
import { guardJournal } from '../lib/journal-guard.js'

const journalShares = new Hono()

journalShares.use('*', authMiddleware)

const ALL_SCOPES = [
  'JOURNAL',
  'NPC',
  'LOCATION',
  'FACTION',
  'THREAD',
  'CLUE',
  'PLAYER_CHARACTER',
  'CAPTURE',
] as const

function isShareScope(s: unknown): s is ShareScope {
  return typeof s === 'string' && (ALL_SCOPES as readonly string[]).includes(s)
}

/** Per-row label used by the settings UI to render a readable
 *  "individually-shared" list. NPC/Location/Faction etc. return the
 *  entity's name; CAPTURE returns a truncated preview; JOURNAL has
 *  no label. */
async function hydrateLabel(
  scope: ShareScope,
  entityId: string | null,
  journalId: string
): Promise<string | null> {
  if (scope === 'JOURNAL' || entityId === null) return null
  const where = { id: entityId, deletedAt: null }
  switch (scope) {
    case 'NPC': {
      const r = await prisma.nPC.findFirst({ where, select: { name: true } })
      return r?.name ?? null
    }
    case 'LOCATION': {
      const r = await prisma.location.findFirst({ where, select: { name: true } })
      return r?.name ?? null
    }
    case 'FACTION': {
      const r = await prisma.faction.findFirst({ where, select: { name: true } })
      return r?.name ?? null
    }
    case 'THREAD': {
      const r = await prisma.thread.findFirst({ where, select: { title: true } })
      return r?.title ?? null
    }
    case 'CLUE': {
      const r = await prisma.clue.findFirst({ where, select: { title: true } })
      return r?.title ?? null
    }
    case 'PLAYER_CHARACTER': {
      const r = await prisma.playerCharacter.findFirst({ where, select: { name: true } })
      return r?.name ?? null
    }
    case 'CAPTURE': {
      const r = await prisma.journalCapture.findFirst({
        where: { id: entityId, journalId, deletedAt: null },
        select: { content: true },
      })
      if (!r) return null
      return docToPlainText(r.content as unknown as ProseMirrorDoc).slice(0, 80)
    }
  }
  return null
}

/** Ownership check for the entity being shared. Returns true if the
 *  entity belongs to this journal and is not soft-deleted. */
async function verifyOwnership(
  scope: ShareScope,
  entityId: string,
  journalId: string
): Promise<boolean> {
  const ownerWhere = { ownerType: 'JOURNAL' as const, ownerId: journalId, deletedAt: null }
  switch (scope) {
    case 'NPC':
      return !!(await prisma.nPC.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } }))
    case 'LOCATION':
      return !!(await prisma.location.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } }))
    case 'FACTION':
      return !!(await prisma.faction.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } }))
    case 'THREAD':
      return !!(await prisma.thread.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } }))
    case 'CLUE':
      return !!(await prisma.clue.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } }))
    case 'PLAYER_CHARACTER':
      return !!(
        await prisma.playerCharacter.findFirst({ where: { id: entityId, ...ownerWhere }, select: { id: true } })
      )
    case 'CAPTURE':
      return !!(
        await prisma.journalCapture.findFirst({
          where: { id: entityId, journalId, deletedAt: null },
          select: { id: true },
        })
      )
    case 'JOURNAL':
      return true
  }
}

journalShares.get('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const shares = await prisma.journalShare.findMany({
    where: { journalId },
    orderBy: { createdAt: 'desc' },
  })

  const hydrated = await Promise.all(
    shares.map(async (s) => ({
      ...s,
      label: await hydrateLabel(s.sharedEntityType, s.sharedEntityId, journalId),
    }))
  )

  return c.json(hydrated)
})

journalShares.post('/', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const body = await c.req.json().catch(() => ({} as Record<string, unknown>))
  const { sharedEntityType, sharedEntityId } = body as {
    sharedEntityType?: unknown
    sharedEntityId?: unknown
  }

  if (!isShareScope(sharedEntityType)) {
    return c.json({ error: 'Invalid sharedEntityType', allowed: ALL_SCOPES }, 400)
  }

  if (sharedEntityType === 'JOURNAL') {
    if (sharedEntityId !== undefined && sharedEntityId !== null) {
      return c.json({ error: 'sharedEntityId must be absent for JOURNAL scope' }, 400)
    }
  } else {
    if (typeof sharedEntityId !== 'string' || sharedEntityId.length === 0) {
      return c.json({ error: 'sharedEntityId is required for non-JOURNAL scopes' }, 400)
    }
    const owned = await verifyOwnership(sharedEntityType, sharedEntityId, journalId)
    if (!owned) return c.json({ error: 'Entity not found' }, 404)
  }

  // Postgres treats NULL as distinct in unique indexes, so upsert
  // can't key reliably when sharedEntityId is null. findFirst +
  // create avoids duplicating a JOURNAL-wide share row.
  const resolvedId = sharedEntityType === 'JOURNAL' ? null : (sharedEntityId as string)
  const existing = await prisma.journalShare.findFirst({
    where: { journalId, sharedEntityType, sharedEntityId: resolvedId },
  })
  if (existing) return c.json(existing)

  const share = await prisma.journalShare.create({
    data: {
      journalId,
      sharedEntityType,
      sharedEntityId: resolvedId,
    },
  })
  return c.json(share, 201)
})

journalShares.delete('/:shareId', async (c) => {
  const user = c.get('user')
  const journalId = c.req.param('id')!
  const shareId = c.req.param('shareId')!
  const guard = await guardJournal(user.id, journalId)
  if (guard.status !== 200) return c.json({ error: guard.status === 403 ? 'Forbidden' : 'Not found' }, guard.status)

  const existing = await prisma.journalShare.findFirst({ where: { id: shareId, journalId } })
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await prisma.journalShare.delete({ where: { id: shareId } })
  return c.json({ success: true })
})

export default journalShares
