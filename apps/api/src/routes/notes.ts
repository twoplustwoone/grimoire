import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'

const notes = new Hono()
notes.use('*', authMiddleware)

async function getMembership(userId: string, campaignId: string) {
  return prisma.campaignMembership.findFirst({ where: { userId, campaignId } })
}

notes.post('/:noteId/promote', async (c) => {
  const user = c.get('user')
  const campaignId = c.req.param('campaignId')!
  const noteId = c.req.param('noteId')!

  if (!await getMembership(user.id, campaignId)) return c.json({ error: 'Not found' }, 404)

  const note = await prisma.note.findFirst({
    where: { id: noteId, campaignId },
  })
  if (!note) return c.json({ error: 'Note not found' }, 404)

  const body = await c.req.json()

  const infoNode = await prisma.informationNode.create({
    data: {
      entityType: note.entityType,
      entityId: note.entityId,
      campaignId,
      title: body.title?.trim() ?? note.content.slice(0, 60),
      content: note.content,
      visibility: 'GM_ONLY',
    },
  })

  if (body.deleteNote) {
    await prisma.note.delete({ where: { id: noteId } })
  }

  return c.json(infoNode, 201)
})

export default notes
