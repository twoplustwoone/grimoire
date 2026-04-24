import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Network } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { JournalEditableFields } from '@/components/entities/journal-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { CaptureCTA } from './capture-cta'
import { CaptureFeed, type FeedSession, type FeedCapture } from './capture-feed'
import { WelcomeBanner } from './welcome-banner'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'

const ACTIVE_SESSION_WINDOW_MS = 12 * 60 * 60 * 1000

function activeWindowStart(): Date {
  return new Date(Date.now() - ACTIVE_SESSION_WINDOW_MS)
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ welcome?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const journal = await prisma.journal.findUnique({ where: { id }, select: { name: true } })
  return { title: journal?.name ?? 'Journal' }
}

export default async function JournalHomePage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const showWelcome = sp.welcome === '1'
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    include: { linkedCampaign: { select: { name: true } } },
  })

  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  const subtitle = journal.linkedCampaign
    ? `Linked to ${journal.linkedCampaign.name}`
    : 'Freestanding journal'

  const latestCapture = await prisma.journalCapture.findFirst({
    where: {
      journalId: journal.id,
      deletedAt: null,
      createdAt: { gt: activeWindowStart() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      journalSession: {
        select: { id: true, title: true, createdAt: true },
      },
    },
  })

  const activeSession = latestCapture?.journalSession
    ? {
        id: latestCapture.journalSession.id,
        title: latestCapture.journalSession.title,
        createdAt: latestCapture.journalSession.createdAt.toISOString(),
      }
    : null

  const sessionsWithCaptures = await prisma.gameSession.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      journalCaptures: { some: { deletedAt: null } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      journalCaptures: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const shares = await prisma.journalShare.findMany({
    where: { journalId: journal.id },
    select: { id: true, sharedEntityType: true, sharedEntityId: true },
  })
  const isJournalWideShare = shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const captureShareById = new Map(
    shares
      .filter((s) => s.sharedEntityType === 'CAPTURE' && s.sharedEntityId)
      .map((s) => [s.sharedEntityId!, s.id])
  )
  const hasLinkedCampaign = journal.linkedCampaignId !== null

  const feedSessions: FeedSession[] = sessionsWithCaptures.map((s) => ({
    id: s.id,
    title: s.title,
    playedOn: s.playedOn ? s.playedOn.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    captures: s.journalCaptures.map<FeedCapture>((c) => ({
      id: c.id,
      content: c.content as unknown as ProseMirrorDoc,
      createdAt: c.createdAt.toISOString(),
      shareId: captureShareById.get(c.id) ?? null,
    })),
  }))

  return (
    <div className="max-w-4xl mx-auto">
      {showWelcome && <WelcomeBanner journalId={journal.id} />}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <span>{journal.name}</span>
        </p>
        <JournalEditableFields journalId={journal.id} name={journal.name} />
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      </div>

      <div className="mb-8">
        <CaptureCTA
          journalId={journal.id}
          activeSession={activeSession}
        />
      </div>

      {feedSessions.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No captures yet. Your captures will appear here, grouped by session.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-8">
          <CaptureFeed
            journalId={journal.id}
            sessions={feedSessions}
            isJournalWideShare={isJournalWideShare}
            hasLinkedCampaign={hasLinkedCampaign}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-8 border-t">
        <div className="flex items-center gap-4">
          <Link
            href={`/journals/${journal.id}/settings`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Settings
          </Link>
          <Link
            href={`/journals/${journal.id}/graph`}
            className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1.5"
          >
            <Network className="h-3.5 w-3.5" />
            Graph
          </Link>
        </div>
        <DeleteEntityButton
          entityName={journal.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}`}
          redirectTo="/journals"
        />
      </div>
    </div>
  )
}
