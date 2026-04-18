import { Hono } from 'hono'
import { oauthStorage } from './oauth-storage.js'
import { randomBytes, createHash } from 'crypto'

const oauth = new Hono()

const ISSUER = process.env.WEB_URL ?? 'http://localhost:3000'

oauth.get('/.well-known/oauth-authorization-server', (c) => {
  return c.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    registration_endpoint: `${ISSUER}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['mcp:tools'],
  })
})

oauth.get('/.well-known/oauth-protected-resource', (c) => {
  return c.json({
    resource: `${ISSUER}/mcp`,
    authorization_servers: [ISSUER],
    scopes_supported: ['mcp:tools'],
  })
})

oauth.post('/oauth/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))

  if (!body.redirect_uris || !Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) {
    return c.json({ error: 'invalid_client_metadata', error_description: 'redirect_uris required' }, 400)
  }

  const clientId = `grim_${randomBytes(16).toString('hex')}`

  const client = await oauthStorage.createClient({
    clientId,
    clientName: body.client_name ?? 'MCP Client',
    redirectUris: body.redirect_uris,
    tokenEndpointAuthMethod: 'none',
  })

  return c.json({
    client_id: clientId,
    client_name: client.clientName,
    redirect_uris: client.redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }, 201)
})

oauth.post('/oauth/token', async (c) => {
  const contentType = c.req.header('content-type') ?? ''
  let body: Record<string, string>

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await c.req.text()
    body = Object.fromEntries(new URLSearchParams(text))
  } else {
    body = await c.req.json().catch(() => ({}))
  }

  const { grant_type, code, code_verifier, client_id, redirect_uri, refresh_token } = body

  if (grant_type === 'authorization_code') {
    if (!code || !code_verifier || !client_id) {
      return c.json({ error: 'invalid_request' }, 400)
    }

    const client = await oauthStorage.getClient(client_id)
    if (!client) return c.json({ error: 'invalid_client' }, 401)

    const authCode = await oauthStorage.consumeAuthorizationCode(code)
    if (!authCode) return c.json({ error: 'invalid_grant' }, 400)
    if (authCode.clientId !== client_id) return c.json({ error: 'invalid_grant' }, 400)
    if (authCode.redirectUri !== redirect_uri) return c.json({ error: 'invalid_grant' }, 400)

    const challenge = createHash('sha256').update(code_verifier).digest('base64url')
    if (challenge !== authCode.codeChallenge) {
      return c.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, 400)
    }

    const { token: accessToken, expiresIn } = await oauthStorage.createAccessToken({
      clientId: client_id,
      userId: authCode.userId,
      scope: authCode.scope ?? undefined,
    })
    const refreshTokenValue = await oauthStorage.createRefreshToken({
      clientId: client_id,
      userId: authCode.userId,
      scope: authCode.scope ?? undefined,
    })

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshTokenValue,
      scope: authCode.scope,
    })
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token) return c.json({ error: 'invalid_request' }, 400)

    const rt = await oauthStorage.consumeRefreshToken(refresh_token)
    if (!rt) return c.json({ error: 'invalid_grant' }, 400)

    const { token: accessToken, expiresIn } = await oauthStorage.createAccessToken({
      clientId: rt.clientId,
      userId: rt.userId,
      scope: rt.scope ?? undefined,
    })
    const newRefreshToken = await oauthStorage.createRefreshToken({
      clientId: rt.clientId,
      userId: rt.userId,
      scope: rt.scope ?? undefined,
    })

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: newRefreshToken,
      scope: rt.scope,
    })
  }

  return c.json({ error: 'unsupported_grant_type' }, 400)
})

export default oauth
