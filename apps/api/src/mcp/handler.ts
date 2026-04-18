import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createHash } from 'crypto'
import { prisma } from '@grimoire/db'
import { createMcpServer } from './server.js'
import type { Context } from 'hono'
import type { IncomingMessage, ServerResponse } from 'http'

async function authenticateRequest(c: Context): Promise<string | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const rawToken = authHeader.slice(7).trim()
  if (!rawToken) return null

  const accessToken = await prisma.oAuthAccessToken.findUnique({
    where: { token: rawToken },
    include: { user: { select: { id: true } } },
  })
  if (accessToken && accessToken.expiresAt > new Date()) {
    return accessToken.userId
  }

  const keyHash = createHash('sha256').update(rawToken).digest('hex')
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true } } },
  })
  if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => { /* non-blocking */ })
    return apiKey.user.id
  }

  return null
}

export async function handleMcpRequest(c: Context): Promise<Response> {
  const userId = await authenticateRequest(c)
  if (!userId) {
    const issuer = process.env.WEB_URL ?? 'http://localhost:3000'
    c.header('WWW-Authenticate', `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource"`)
    return c.json({ error: 'Unauthorized. Provide a valid OAuth access token or API key as Bearer token.' }, 401)
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
