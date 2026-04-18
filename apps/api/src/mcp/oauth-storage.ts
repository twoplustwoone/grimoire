import { prisma } from '@grimoire/db'
import { randomBytes, createHash } from 'crypto'

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export const oauthStorage = {
  async createClient(client: {
    clientId: string
    clientSecret?: string
    clientName: string
    redirectUris: string[]
    tokenEndpointAuthMethod?: string
  }) {
    return prisma.oAuthClient.create({
      data: {
        clientId: client.clientId,
        clientSecretHash: client.clientSecret ? hashSecret(client.clientSecret) : null,
        clientName: client.clientName,
        redirectUris: client.redirectUris,
        tokenEndpointAuthMethod: client.tokenEndpointAuthMethod ?? 'none',
      },
    })
  },

  async getClient(clientId: string) {
    return prisma.oAuthClient.findUnique({ where: { clientId } })
  },

  async verifyClientSecret(clientId: string, secret: string): Promise<boolean> {
    const client = await prisma.oAuthClient.findUnique({ where: { clientId } })
    if (!client?.clientSecretHash) return false
    return client.clientSecretHash === hashSecret(secret)
  },

  async createAuthorizationCode(data: {
    clientId: string
    userId: string
    redirectUri: string
    scope?: string
    codeChallenge: string
    codeChallengeMethod: string
  }) {
    const code = generateToken()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.oAuthAuthorizationCode.create({
      data: {
        code,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scope: data.scope ?? null,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
        expiresAt,
      },
    })

    return code
  },

  async consumeAuthorizationCode(code: string) {
    const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } })
    if (!record) return null
    if (record.expiresAt < new Date()) {
      await prisma.oAuthAuthorizationCode.delete({ where: { code } })
      return null
    }
    await prisma.oAuthAuthorizationCode.delete({ where: { code } })
    return record
  },

  async createAccessToken(data: { clientId: string; userId: string; scope?: string }) {
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.oAuthAccessToken.create({
      data: {
        token,
        clientId: data.clientId,
        userId: data.userId,
        scope: data.scope ?? null,
        expiresAt,
      },
    })

    return { token, expiresIn: 3600 }
  },

  async validateAccessToken(token: string) {
    const record = await prisma.oAuthAccessToken.findUnique({ where: { token } })
    if (!record) return null
    if (record.expiresAt < new Date()) return null
    return record
  },

  async createRefreshToken(data: { clientId: string; userId: string; scope?: string }) {
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.oAuthRefreshToken.create({
      data: {
        token,
        clientId: data.clientId,
        userId: data.userId,
        scope: data.scope ?? null,
        expiresAt,
      },
    })

    return token
  },

  async consumeRefreshToken(token: string) {
    const record = await prisma.oAuthRefreshToken.findUnique({ where: { token } })
    if (!record) return null
    if (record.expiresAt < new Date()) {
      await prisma.oAuthRefreshToken.delete({ where: { token } })
      return null
    }
    await prisma.oAuthRefreshToken.delete({ where: { token } })
    return record
  },
}
