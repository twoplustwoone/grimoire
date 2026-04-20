import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Network } from 'lucide-react'
import { CampaignGraph } from '@/components/graph/campaign-graph'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Graph — ${campaign?.name ?? 'Campaign'}` }
}

export default async function GraphPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  return (
    <>
      {/* Mobile: the graph isn't meaningfully usable at 375px — small nodes,
          overlapping filter UI. An honest gate is better than a rebuild. */}
      <div className="flex md:hidden flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <Network className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          The relationship graph is best explored on a larger screen.
        </p>
      </div>

      {/* Desktop: full-bleed canvas. */}
      <div className="hidden md:flex flex-col h-full -m-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-card shrink-0">
          <p className="text-sm text-muted-foreground">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>
            {' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">
              {membership.campaign.name}
            </Link>
            {' / '}
            <span>Graph</span>
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <CampaignGraph campaignId={campaignId} />
        </div>
      </div>
    </>
  )
}
