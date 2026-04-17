import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface Props { params: Promise<{ id: string; threadId: string }> }

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

export default async function ThreadDetailPage({ params }: Props) {
  const { id: campaignId, threadId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const thread = await prisma.thread.findFirst({ where: { id: threadId, campaignId, deletedAt: null }, include: { entityTags: true } })
  if (!thread) notFound()

  const notes = await prisma.note.findMany({ where: { entityType: 'THREAD', entityId: threadId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'THREAD', entityId: threadId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/threads`} className="hover:underline">Threads</Link>{' / '}
        </p>
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold">{thread.title}</h1>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${urgencyColors[thread.urgency] ?? ''}`}>{thread.urgency}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[thread.status] ?? ''}`}>{thread.status}</span>
          </div>
        </div>
        {thread.description && <p className="text-muted-foreground mt-2">{thread.description}</p>}
        {thread.resolvedNote && <Card className="mt-4"><CardContent className="py-3"><p className="text-sm"><span className="font-medium">Resolution:</span> {thread.resolvedNote}</p></CardContent></Card>}
      </div>

      {notes.length > 0 && (<Card className="mb-4"><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><div className="space-y-3">{notes.map((n) => (<div key={n.id} className="text-sm border-l-2 pl-3"><p>{n.content}</p><p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p></div>))}</div></CardContent></Card>)}
      {changelog.length > 0 && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />History</CardTitle></CardHeader><CardContent><div className="space-y-2">{changelog.map((e) => (<div key={e.id} className="flex items-start justify-between text-sm"><div><span className="font-medium">{e.field}</span>{e.oldValue && e.newValue && <span className="text-muted-foreground"> changed from <span className="line-through">{e.oldValue}</span> to {e.newValue}</span>}{!e.oldValue && e.newValue && <span className="text-muted-foreground"> set to {e.newValue}</span>}</div><span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span></div>))}</div></CardContent></Card>)}
    </div>
  )
}
