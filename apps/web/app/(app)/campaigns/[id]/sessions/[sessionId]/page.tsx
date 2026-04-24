import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText } from 'lucide-react'
import { SessionControls } from './session-controls'
import { SessionEntityTagger } from '@/components/entities/session-entity-tagger'
import { displaySessionTitle } from '@/lib/session-display'

interface Props {
  params: Promise<{ id: string; sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, sessionId } = await params
  const [gameSession, campaign] = await Promise.all([
    prisma.gameSession.findUnique({ where: { id: sessionId }, select: { title: true, createdAt: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { name: true } }),
  ])
  if (!gameSession) return { title: 'Session' }
  return { title: `${displaySessionTitle(gameSession)} — ${campaign?.name ?? 'Campaign'}` }
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

  const ownedBy = { ownerType: 'CAMPAIGN' as const, ownerId: campaignId }
  const gameSession = await prisma.gameSession.findFirst({
    where: { id: sessionId, ...ownedBy },
    include: { entityTags: true },
  })
  if (!gameSession) notFound()

  const sessionLabel = displaySessionTitle(gameSession)

  const notes = await prisma.note.findMany({
    where: { entityType: 'SESSION', entityId: sessionId },
    orderBy: { createdAt: 'asc' },
  })

  const [npcList, locationList, factionList, threadList, clueList] = await Promise.all([
    prisma.nPC.findMany({ where: { ...ownedBy, deletedAt: null }, select: { id: true, name: true } }),
    prisma.location.findMany({ where: { ...ownedBy, deletedAt: null }, select: { id: true, name: true } }),
    prisma.faction.findMany({ where: { ...ownedBy, deletedAt: null }, select: { id: true, name: true } }),
    prisma.thread.findMany({ where: { ...ownedBy, deletedAt: null }, select: { id: true, title: true } }),
    prisma.clue.findMany({ where: { ...ownedBy, deletedAt: null }, select: { id: true, title: true } }),
  ])

  const availableEntities = [
    ...npcList.map((e) => ({ id: e.id, name: e.name, type: 'NPC' as const })),
    ...locationList.map((e) => ({ id: e.id, name: e.name, type: 'LOCATION' as const })),
    ...factionList.map((e) => ({ id: e.id, name: e.name, type: 'FACTION' as const })),
    ...threadList.map((e) => ({ id: e.id, name: e.title, type: 'THREAD' as const })),
    ...clueList.map((e) => ({ id: e.id, name: e.title, type: 'CLUE' as const })),
  ]

  const taggedWithNames = gameSession.entityTags.map((tag) => ({
    ...tag,
    entityName: availableEntities.find((e) => e.id === tag.entityId)?.name,
  }))

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
          <span>{sessionLabel}</span>
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7 text-muted-foreground" />
              {sessionLabel}
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

      <SessionEntityTagger
        campaignId={campaignId}
        sessionId={sessionId}
        initialTags={taggedWithNames}
        availableEntities={availableEntities}
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
    </div>
  )
}
