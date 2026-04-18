import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createHash } from 'crypto'
import { prisma } from '@grimoire/db'
import { createMcpServer } from './server.js'
import type { Context } from 'hono'
import type { IncomingMessage, ServerResponse } from 'http'

async function authenticateRequest(c: Context): Promise<string | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey) return null
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true } } },
  })

  if (!apiKey) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => { /* non-blocking */ })

  return apiKey.user.id
}

export async function handleMcpRequest(c: Context): Promise<Response> {
  const userId = await authenticateRequest(c)
  if (!userId) {
    return c.json({ error: 'Unauthorized. Provide a valid Grimoire API key as Bearer token.' }, 401)
  }

  const env = c.env as { incoming?: IncomingMessage; outgoing?: ServerResponse }
  const nodeReq = env.incoming
  const nodeRes = env.outgoing
  if (!nodeReq || !nodeRes) {
    return c.json({ error: 'MCP transport requires Node runtime' }, 500)
  }

  let parsedBody: unknown = undefined
  if (nodeReq.method === 'POST') {
    try {
      parsedBody = await c.req.json()
    } catch {
      parsedBody = undefined
    }
  }

  const server = createMcpServer(userId)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  await server.connect(transport)

  try {
    await transport.handleRequest(nodeReq, nodeRes, parsedBody)
  } catch (err) {
    console.error('MCP transport error:', err)
    if (!nodeRes.headersSent) {
      nodeRes.statusCode = 500
      nodeRes.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

  return c.body(null)
}
