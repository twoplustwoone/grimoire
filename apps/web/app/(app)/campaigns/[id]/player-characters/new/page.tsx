import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import { NewPlayerCharacterForm } from './new-player-character-form'

export const metadata: Metadata = { title: 'New Player Character' }

interface Props { params: Promise<{ id: string }> }

export default async function NewPlayerCharacterPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
  })
  if (!membership) notFound()
  if (membership.role !== 'GM' && membership.role !== 'CO_GM') notFound()

  const players = await prisma.campaignMembership.findMany({
    where: { campaignId, role: 'PLAYER' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  const playerOptions = players.map(m => ({
    userId: m.userId,
    label: m.user.name ?? m.user.email,
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Player Character</h1>
        <p className="text-muted-foreground mt-1">Add a party member to your campaign</p>
      </div>
      <NewPlayerCharacterForm campaignId={campaignId} players={playerOptions} />
    </div>
  )
}
