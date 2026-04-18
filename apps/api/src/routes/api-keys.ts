import { Hono } from 'hono'
import { prisma } from '@grimoire/db'
import { authMiddleware } from '../lib/auth-middleware.js'
import { createHash, randomBytes } from 'crypto'

const apiKeys = new Hono()
apiKeys.use('*', authMiddleware)

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = `grim_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 12)
  return { key: raw, hash, prefix }
}

apiKeys.get('/', async (c) => {
  const user = c.get('user')
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(keys)
})

apiKeys.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const { key, hash, prefix } = generateApiKey()

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: body.name?.trim() || 'My API Key',
      keyHash: hash,
      keyPrefix: prefix,
    },
  })

  return c.json({
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    key,
    createdAt: apiKey.createdAt,
  }, 201)
})

apiKeys.delete('/:keyId', async (c) => {
  const user = c.get('user')
  const keyId = c.req.param('keyId')!

  await prisma.apiKey.deleteMany({
    where: { id: keyId, userId: user.id },
  })

  return c.json({ success: true })
})

export default apiKeys
