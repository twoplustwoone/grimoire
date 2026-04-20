import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { InvitePlayers } from '@/components/campaign/invite-players'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Settings — ${campaign?.name ?? 'Campaign'}` }
}

export default async function CampaignSettingsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'

  const [members, pendingInvites] = await Promise.all([
    prisma.campaignMembership.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.campaignInvite.findMany({
      where: { campaignId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>
          {' / '}
          <span>Settings</span>
        </p>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Campaign membership and invites</p>
      </div>

      {isGM ? (
        <InvitePlayers
          campaignId={campaignId}
          initialInvites={pendingInvites}
          members={members}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Only GMs can manage invites.</p>
      )}
    </div>
  )
}
