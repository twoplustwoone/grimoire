import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import { Plus, Calendar } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Sessions — ${campaign?.name ?? 'Campaign'}` }
}

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default async function SessionsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const gameSessions = await prisma.gameSession.findMany({
    where: { campaignId },
    include: {
      _count: { select: { entityTags: true } },
    },
    orderBy: { number: 'desc' },
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
            Sessions
          </p>
          <h1 className="text-3xl font-bold">Sessions</h1>
        </div>
        <PageHeaderAction href={`/campaigns/${campaignId}/sessions/new`}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </PageHeaderAction>
      </div>

      {gameSessions.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No sessions yet. Log your first session.</p>
            <Button asChild>
              <Link href={`/campaigns/${campaignId}/sessions/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {gameSessions.map((gs) => (
            <Link key={gs.id} href={`/campaigns/${campaignId}/sessions/${gs.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Session {gs.number}{gs.title ? ` — ${gs.title}` : ''}
                    </CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[gs.status] ?? ''}`}>
                      {gs.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1">
                    {gs.playedOn && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(gs.playedOn).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {gs._count.entityTags} entities tagged
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
