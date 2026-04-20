import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import { Plus } from 'lucide-react'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Threads — ${campaign?.name ?? 'Campaign'}` }
}

const urgencyColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RESOLVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DORMANT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export default async function ThreadsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const list = await prisma.thread.findMany({
    where: { campaignId, deletedAt: null },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
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
            Threads
          </p>
          <h1 className="text-3xl font-bold">Threads</h1>
        </div>
        <PageHeaderAction href={`/campaigns/${campaignId}/threads/new`}>
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </PageHeaderAction>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No threads yet.</p>
            <PageHeaderAction href={`/campaigns/${campaignId}/threads/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </PageHeaderAction>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((t) => (
            <Link key={t.id} href={`/campaigns/${campaignId}/threads/${t.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${urgencyColors[t.urgency] ?? ''}`}>{t.urgency}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[t.status] ?? ''}`}>{t.status}</span>
                    </div>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{t.description}</p>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
