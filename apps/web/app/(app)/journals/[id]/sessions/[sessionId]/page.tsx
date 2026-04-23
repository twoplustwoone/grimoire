import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalSessionEditableFields } from '@/components/entities/journal-session-editable-fields'
import { SessionCaptures, type DetailCapture } from './session-captures'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  params: Promise<{ id: string; sessionId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, sessionId } = await params
  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'JOURNAL', ownerId: id },
    select: { title: true, number: true },
  })
  if (!session) return { title: 'Session' }
  return { title: session.title ?? `Session ${session.number}` }
}

export default async function JournalSessionPage({ params }: Props) {
  const { id, sessionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

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

  const gameSession = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'JOURNAL', ownerId: journal.id },
    include: {
      journalCaptures: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!gameSession) notFound()

  const sessionLabel = gameSession.title ?? `Session ${gameSession.number}`

  const captures: DetailCapture[] = gameSession.journalCaptures.map((c) => ({
    id: c.id,
    content: c.content as unknown as ProseMirrorDoc,
    createdAt: c.createdAt.toISOString(),
    shareId: captureShareById.get(c.id) ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          <span>Session {gameSession.number}</span>
        </p>
        <JournalSessionEditableFields
          journalId={journal.id}
          sessionId={gameSession.id}
          number={gameSession.number}
          title={gameSession.title}
          playedOn={gameSession.playedOn ? gameSession.playedOn.toISOString() : null}
        />
      </div>

      <SessionCaptures
        journalId={journal.id}
        sessionId={gameSession.id}
        sessionLabel={sessionLabel}
        captures={captures}
        isJournalWideShare={isJournalWideShare}
        hasLinkedCampaign={hasLinkedCampaign}
      />
    </div>
  )
}
