import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tag } from 'lucide-react'
import { ThreadEditableFields } from '@/components/entities/thread-editable-fields'
import { EntityNotes } from '@/components/entities/entity-notes'
import { InformationNodes } from '@/components/entities/information-nodes'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityRevealPanel } from '@/components/entities/entity-reveal-panel'
import { ChangelogList } from '@/components/entities/changelog-list'
import { getEntityChipClasses, getEntityLabel } from '@/lib/entity-display'

interface Props { params: Promise<{ id: string; threadId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, threadId } = await params
  const [thread, campaign] = await Promise.all([
    prisma.thread.findUnique({ where: { id: threadId }, select: { title: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { name: true } }),
  ])
  return { title: `${thread?.title ?? 'Thread'} — ${campaign?.name ?? 'Campaign'}` }
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
  const infoNodes = await prisma.informationNode.findMany({ where: { campaignId, entityType: 'THREAD', entityId: threadId }, orderBy: { createdAt: 'asc' } })

  const players = await prisma.campaignMembership.findMany({
    where: { campaignId, role: 'PLAYER' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  const playerMembers = players.map(m => ({ userId: m.userId, name: m.user.name, email: m.user.email }))

  const entityTags = await prisma.threadEntityTag.findMany({ where: { threadId } })
  const resolvedTags = await Promise.all(
    entityTags.map(async (tag) => {
      let name = tag.entityId.slice(0, 8)
      let href: string | null = null
      if (tag.entityType === 'NPC') {
        const e = await prisma.nPC.findFirst({ where: { id: tag.entityId }, select: { name: true } })
        name = e?.name ?? name
        href = `/campaigns/${campaignId}/npcs/${tag.entityId}`
      } else if (tag.entityType === 'LOCATION') {
        const e = await prisma.location.findFirst({ where: { id: tag.entityId }, select: { name: true } })
        name = e?.name ?? name
        href = `/campaigns/${campaignId}/locations/${tag.entityId}`
      } else if (tag.entityType === 'FACTION') {
        const e = await prisma.faction.findFirst({ where: { id: tag.entityId }, select: { name: true } })
        name = e?.name ?? name
        href = `/campaigns/${campaignId}/factions/${tag.entityId}`
      } else if (tag.entityType === 'CLUE') {
        const e = await prisma.clue.findFirst({ where: { id: tag.entityId }, select: { title: true } })
        name = e?.title ?? name
        href = `/campaigns/${campaignId}/clues/${tag.entityId}`
      }
      return { ...tag, name, href }
    })
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/threads`} className="hover:underline">Threads</Link>{' / '}
          <span>{thread.title}</span>
        </p>
        <ThreadEditableFields
          campaignId={campaignId}
          threadId={threadId}
          title={thread.title}
          description={thread.description}
          status={thread.status}
          urgency={thread.urgency}
          resolvedNote={thread.resolvedNote}
        />
      </div>

      {resolvedTags.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Linked Entities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resolvedTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={tag.href ?? '#'}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium hover:opacity-80 transition-opacity ${getEntityChipClasses(tag.entityType)}`}
                >
                  <span className="opacity-60">{getEntityLabel(tag.entityType)}</span>
                  <span>{tag.name}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InformationNodes
        nodes={infoNodes}
        campaignId={campaignId}
        entityType="THREAD"
        entityId={threadId}
      />

      {isGM && players.length > 0 && (
        <EntityRevealPanel
          campaignId={campaignId}
          entityType="THREAD"
          entityId={threadId}
          entityName={thread.title}
          members={playerMembers}
        />
      )}

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/threads/${threadId}/notes`}
          campaignId={campaignId}
          entityType="THREAD"
          entityId={threadId}
        />
      </div>

      <ChangelogList entries={changelog} />

      <div className="mt-8 pt-6 border-t border-destructive/20">
        <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
        <DeleteEntityButton
          entityName={thread.title}
          deleteEndpoint={`/api/v1/campaigns/${campaignId}/threads/${threadId}`}
          redirectTo={`/campaigns/${campaignId}/threads`}
        />
      </div>
    </div>
  )
}
