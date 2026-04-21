import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import { Plus, Calendar } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Clues — ${campaign?.name ?? 'Campaign'}` }
}

export default async function CluesPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const list = await prisma.clue.findMany({
    where: { ownerType: 'CAMPAIGN', ownerId: campaignId, deletedAt: null },
    include: { discoveredInSession: { select: { id: true, number: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>
            {' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">
              {membership.campaign.name}
            </Link>
            {' / '}
            Clues
          </p>
          <h1 className="text-3xl font-bold">Clues</h1>
        </div>
        <PageHeaderAction href={`/campaigns/${campaignId}/clues/new`}>
          <Plus className="h-4 w-4 mr-2" />
          New Clue
        </PageHeaderAction>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No clues yet.</p>
            <PageHeaderAction href={`/campaigns/${campaignId}/clues/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Clue
            </PageHeaderAction>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((clue) => (
            <Link key={clue.id} href={`/campaigns/${campaignId}/clues/${clue.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">{clue.title}</CardTitle>
                  {clue.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{clue.description}</p>}
                  {clue.discoveredInSession && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Calendar className="h-3 w-3" />
                      Session {clue.discoveredInSession.number}{clue.discoveredInSession.title ? `: ${clue.discoveredInSession.title}` : ''}
                    </span>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
