import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MentionRenderer } from '@/components/mentions/mention-renderer'
import { formatRelativeTime } from '@/lib/activity-feed'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  params: Promise<{ id: string; journalId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { journalId } = await params
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { owner: { select: { name: true, email: true } } },
  })
  const name = journal?.owner.name ?? journal?.owner.email ?? 'Player'
  return { title: `${name}'s journal — Shared` }
}

export default async function CampaignJournalDetailPage({ params }: Props) {
  const { id: campaignId, journalId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()
  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  if (!isGM) notFound()

  const journal = await prisma.journal.findFirst({
    where: {
      id: journalId,
      deletedAt: null,
      linkedCampaignId: campaignId,
    },
    include: {
      owner: { select: { name: true, email: true } },
      shares: true,
    },
  })
  if (!journal) notFound()
  if (journal.shares.length === 0) notFound()

  const isJournalWide = journal.shares.some((s) => s.sharedEntityType === 'JOURNAL')
  const sharedCaptureIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'CAPTURE' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )
  const sharedNpcIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'NPC' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )
  const sharedPcIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'PLAYER_CHARACTER' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )

  const captures = await prisma.journalCapture.findMany({
    where: {
      journalId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedCaptureIds) } }),
    },
    include: { journalSession: { select: { id: true, number: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const npcs = await prisma.nPC.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedNpcIds) } }),
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  const pcs = await prisma.playerCharacter.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedPcIds) } }),
    },
    select: { id: true, name: true, description: true },
  })

  const ownerName = journal.owner.name ?? journal.owner.email
  const pc = pcs[0] ?? null

  type SessionBlock = {
    sessionId: string
    sessionNumber: number
    sessionTitle: string | null
    captures: Array<{ id: string; content: ProseMirrorDoc; createdAt: Date }>
  }
  const capturesBySession = new Map<string, SessionBlock>()
  for (const c of captures) {
    const key = c.journalSession.id
    if (!capturesBySession.has(key)) {
      capturesBySession.set(key, {
        sessionId: c.journalSession.id,
        sessionNumber: c.journalSession.number,
        sessionTitle: c.journalSession.title,
        captures: [],
      })
    }
    capturesBySession.get(key)!.captures.push({
      id: c.id,
      content: c.content as unknown as ProseMirrorDoc,
      createdAt: c.createdAt,
    })
  }
  const sessionBlocks = Array.from(capturesBySession.values()).sort(
    (a, b) => b.sessionNumber - a.sessionNumber
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}/journals`} className="hover:underline">Journals</Link>
          {' / '}
          <span>{ownerName}</span>
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">{ownerName}&apos;s journal</h1>
          {isJournalWide ? (
            <Badge variant="secondary">Full journal shared</Badge>
          ) : (
            <Badge variant="outline">Individually shared items</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Shared with you. Read-only.
        </p>
      </div>

      {pc && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Backstory — {pc.name}</CardTitle>
            <p className="text-xs text-muted-foreground">Shared by {ownerName}</p>
          </CardHeader>
          <CardContent>
            {pc.description ? (
              <MentionRenderer content={pc.description as unknown as ProseMirrorDoc} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Backstory is empty.</p>
            )}
          </CardContent>
        </Card>
      )}

      {sessionBlocks.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Captures</h2>
          <p className="text-xs text-muted-foreground -mt-2">Shared by {ownerName}</p>
          {sessionBlocks.map((block) => (
            <Card key={block.sessionId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {block.sessionTitle ?? `Session ${block.sessionNumber}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {block.captures.map((c) => (
                  <div key={c.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatRelativeTime(c.createdAt)}
                    </p>
                    <MentionRenderer content={c.content} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {npcs.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold">Journal entities</h2>
          <p className="text-xs text-muted-foreground -mt-2">Shared by {ownerName}</p>
          {npcs.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{n.name}</CardTitle>
                <p className="text-xs text-muted-foreground">NPC (journal)</p>
              </CardHeader>
              {n.description && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{n.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {!pc && sessionBlocks.length === 0 && npcs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Shared content is no longer available (items may have been deleted or unshared).
          </CardContent>
        </Card>
      )}
    </div>
  )
}
