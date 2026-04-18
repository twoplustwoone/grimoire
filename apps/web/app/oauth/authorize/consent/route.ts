import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { clientId, redirectUri, codeChallenge, codeChallengeMethod, scope } = body

  if (!clientId || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const client = await prisma.oAuthClient.findUnique({ where: { clientId } })
  if (!client || !client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 400 })
  }

  const code = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId,
      userId: session.user.id,
      redirectUri,
      scope: scope ?? null,
      codeChallenge,
      codeChallengeMethod: codeChallengeMethod ?? 'S256',
      expiresAt,
    },
  })

  return NextResponse.json({ code })
}
