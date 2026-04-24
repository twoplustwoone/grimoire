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
import { displaySessionTitle } from '@/lib/session-display'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  params: Promise<{ id: string; journalId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: campaignId, journalId } = await params
  const [journal, mirrorPc] = await Promise.all([
    prisma.journal.findUnique({
      where: { id: journalId },
      select: { owner: { select: { name: true, email: true } } },
    }),
    prisma.playerCharacter.findFirst({
      where: {
        ownerType: 'JOURNAL',
        ownerId: journalId,
        deletedAt: null,
        journalMirror: { campaignPc: { ownerId: campaignId } },
      },
      select: { name: true },
    }),
  ])
  const name = mirrorPc?.name ?? journal?.owner.name ?? journal?.owner.email ?? 'Player'
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
  const sharedLocationIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'LOCATION' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )
  const sharedFactionIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'FACTION' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )
  const sharedThreadIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'THREAD' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )
  const sharedClueIds = new Set(
    journal.shares
      .filter((s) => s.sharedEntityType === 'CLUE' && s.sharedEntityId)
      .map((s) => s.sharedEntityId!)
  )

  const captures = await prisma.journalCapture.findMany({
    where: {
      journalId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedCaptureIds) } }),
    },
    include: { journalSession: { select: { id: true, title: true, createdAt: true } } },
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

  const locations = await prisma.location.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedLocationIds) } }),
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  const factions = await prisma.faction.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedFactionIds) } }),
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  })

  const threads = await prisma.thread.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedThreadIds) } }),
    },
    select: { id: true, title: true, description: true },
    orderBy: { title: 'asc' },
  })

  const clues = await prisma.clue.findMany({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      ...(isJournalWide ? {} : { id: { in: Array.from(sharedClueIds) } }),
    },
    select: { id: true, title: true, description: true },
    orderBy: { title: 'asc' },
  })

  // Resolve the mirrored PC independent of the share filter above —
  // we want the GM-facing title to use the PC name even when only
  // captures are shared (backstory itself may not be).
  const mirrorPc = await prisma.playerCharacter.findFirst({
    where: {
      ownerType: 'JOURNAL',
      ownerId: journal.id,
      deletedAt: null,
      journalMirror: { campaignPc: { ownerId: campaignId } },
    },
    select: { name: true },
  })

  const ownerName = journal.owner.name ?? journal.owner.email
  const displayName = mirrorPc?.name ?? ownerName
  const pc = pcs[0] ?? null

  type SessionBlock = {
    sessionId: string
    sessionTitle: string | null
    sessionCreatedAt: Date
    captures: Array<{ id: string; content: ProseMirrorDoc; createdAt: Date }>
  }
  const capturesBySession = new Map<string, SessionBlock>()
  for (const c of captures) {
    const key = c.journalSession.id
    if (!capturesBySession.has(key)) {
      capturesBySession.set(key, {
        sessionId: c.journalSession.id,
        sessionTitle: c.journalSession.title,
        sessionCreatedAt: c.journalSession.createdAt,
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
    (a, b) => b.sessionCreatedAt.getTime() - a.sessionCreatedAt.getTime()
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
          <span>{displayName}</span>
        </p>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">{displayName}&apos;s journal</h1>
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
            <p className="text-xs text-muted-foreground">Shared by {displayName}</p>
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
          <p className="text-xs text-muted-foreground -mt-2">Shared by {displayName}</p>
          {sessionBlocks.map((block) => (
            <Card key={block.sessionId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {displaySessionTitle({ title: block.sessionTitle, createdAt: block.sessionCreatedAt })}
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

      {(npcs.length > 0 ||
        locations.length > 0 ||
        factions.length > 0 ||
        threads.length > 0 ||
        clues.length > 0) && (
        <div className="mb-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Journal entities</h2>
            <p className="text-xs text-muted-foreground">Shared by {displayName}</p>
          </div>

          {npcs.length > 0 && (
            <div className="space-y-3">
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

          {locations.length > 0 && (
            <div className="space-y-3">
              {locations.map((l) => (
                <Card key={l.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{l.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Location (journal)</p>
                  </CardHeader>
                  {l.description && (
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{l.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {factions.length > 0 && (
            <div className="space-y-3">
              {factions.map((f) => (
                <Card key={f.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Faction (journal)</p>
                  </CardHeader>
                  {f.description && (
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{f.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {threads.length > 0 && (
            <div className="space-y-3">
              {threads.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">Thread (journal)</p>
                  </CardHeader>
                  {t.description && (
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{t.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {clues.length > 0 && (
            <div className="space-y-3">
              {clues.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">Clue (journal)</p>
                  </CardHeader>
                  {c.description && (
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{c.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!pc &&
        sessionBlocks.length === 0 &&
        npcs.length === 0 &&
        locations.length === 0 &&
        factions.length === 0 &&
        threads.length === 0 &&
        clues.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Shared content is no longer available (items may have been deleted or unshared).
          </CardContent>
        </Card>
      )}
    </div>
  )
}
