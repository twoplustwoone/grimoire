import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { WorldEventsList } from './world-events-list'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `World Events — ${campaign?.name ?? 'Campaign'}` }
}

export default async function WorldEventsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const ownedBy = { ownerType: 'CAMPAIGN' as const, ownerId: campaignId }
  const [events, sessions] = await Promise.all([
    prisma.worldEvent.findMany({
      where: ownedBy,
      include: {
        session: { select: { id: true, number: true, title: true } },
        inWorldDate: { select: { id: true, label: true, sortOrder: true } },
      },
      orderBy: [
        { inWorldDate: { sortOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    }),
    prisma.gameSession.findMany({
      where: ownedBy,
      select: { id: true, number: true, title: true },
      orderBy: { number: 'asc' },
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">
            {membership.campaign.name}
          </Link>
          {' / '}
          <span>World Events</span>
        </p>
        <h1 className="text-3xl font-bold">World Events</h1>
        <p className="text-muted-foreground mt-1">
          Things that happened in the world — during sessions or between them
        </p>
      </div>
      <WorldEventsList
        campaignId={campaignId}
        initialEvents={events}
        sessions={sessions}
      />
    </div>
  )
}
