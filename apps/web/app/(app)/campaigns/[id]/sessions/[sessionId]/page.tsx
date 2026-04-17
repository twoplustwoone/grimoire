import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText } from 'lucide-react'
import { SessionControls } from './session-controls'

interface Props {
  params: Promise<{ id: string; sessionId: string }>
}

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default async function SessionDetailPage({ params }: Props) {
  const { id: campaignId, sessionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const gameSession = await prisma.gameSession.findFirst({
    where: { id: sessionId, campaignId },
    include: { entityTags: true },
  })
  if (!gameSession) notFound()

  const notes = await prisma.note.findMany({
    where: { entityType: 'SESSION', entityId: sessionId },
    orderBy: { createdAt: 'asc' },
  })

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
          <Link href={`/campaigns/${campaignId}/sessions`} className="hover:underline">Sessions</Link>
          {' / '}
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7 text-muted-foreground" />
              Session {gameSession.number}
              {gameSession.title && ` — ${gameSession.title}`}
            </h1>
            {gameSession.playedOn && (
              <p className="text-muted-foreground mt-1">
                {new Date(gameSession.playedOn).toLocaleDateString()}
              </p>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium mt-2 ${statusColors[gameSession.status] ?? ''}`}>
            {gameSession.status}
          </span>
        </div>
      </div>

      <SessionControls
        campaignId={campaignId}
        sessionId={sessionId}
        initialStatus={gameSession.status}
        initialGmSummary={gameSession.gmSummary ?? ''}
        initialNotes={notes}
        initialAiSummary={gameSession.aiSummary}
      />

      {(gameSession.gmSummary || gameSession.aiSummary) && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gameSession.aiSummary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">AI GENERATED</p>
                <p className="text-sm whitespace-pre-wrap">{gameSession.aiSummary}</p>
              </div>
            )}
            {gameSession.gmSummary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">GM NOTES</p>
                <p className="text-sm whitespace-pre-wrap">{gameSession.gmSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {gameSession.entityTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entities in this session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gameSession.entityTags.map((tag) => (
                <span key={tag.id} className="text-xs bg-muted px-2 py-1 rounded-full">
                  {tag.entityType}: {tag.entityId.slice(0, 8)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
