import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { ClueEditableFields } from '@/components/entities/clue-editable-fields'
import { EntityNotes } from '@/components/entities/entity-notes'
import { InformationNodes } from '@/components/entities/information-nodes'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityRevealPanel } from '@/components/entities/entity-reveal-panel'
import { ChangelogList } from '@/components/entities/changelog-list'

interface Props { params: Promise<{ id: string; clueId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, clueId } = await params
  const [clue, campaign] = await Promise.all([
    prisma.clue.findUnique({ where: { id: clueId }, select: { title: true } }),
    prisma.campaign.findUnique({ where: { id }, select: { name: true } }),
  ])
  return { title: `${clue?.title ?? 'Clue'} — ${campaign?.name ?? 'Campaign'}` }
}

export default async function ClueDetailPage({ params }: Props) {
  const { id: campaignId, clueId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const clue = await prisma.clue.findFirst({
    where: { id: clueId, campaignId, deletedAt: null },
    include: { discoveredInSession: { select: { id: true, number: true, title: true } } },
  })
  if (!clue) notFound()

  const notes = await prisma.note.findMany({ where: { entityType: 'CLUE', entityId: clueId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'CLUE', entityId: clueId }, orderBy: { createdAt: 'desc' }, take: 20 })
  const infoNodes = await prisma.informationNode.findMany({ where: { campaignId, entityType: 'CLUE', entityId: clueId }, orderBy: { createdAt: 'asc' } })
  const players = await prisma.campaignMembership.findMany({
    where: { campaignId, role: 'PLAYER' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  const playerMembers = players.map(m => ({ userId: m.userId, name: m.user.name, email: m.user.email }))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/clues`} className="hover:underline">Clues</Link>{' / '}
          <span>{clue.title}</span>
        </p>
        <ClueEditableFields
          campaignId={campaignId}
          clueId={clueId}
          title={clue.title}
          description={clue.description}
        />
      </div>

      {clue.discoveredInSession && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Discovered in</CardTitle></CardHeader>
          <CardContent>
            <Link href={`/campaigns/${campaignId}/sessions/${clue.discoveredInSession.id}`} className="text-sm hover:underline">
              Session {clue.discoveredInSession.number}{clue.discoveredInSession.title ? `: ${clue.discoveredInSession.title}` : ''}
            </Link>
          </CardContent>
        </Card>
      )}

      <InformationNodes
        nodes={infoNodes}
        campaignId={campaignId}
        entityType="CLUE"
        entityId={clueId}
      />

      {isGM && players.length > 0 && (
        <EntityRevealPanel
          campaignId={campaignId}
          entityType="CLUE"
          entityId={clueId}
          entityName={clue.title}
          members={playerMembers}
        />
      )}

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/clues/${clueId}/notes`}
          campaignId={campaignId}
          entityType="CLUE"
          entityId={clueId}
        />
      </div>

      <ChangelogList entries={changelog} />

      <div className="mt-8 pt-6 border-t border-destructive/20">
        <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
        <DeleteEntityButton
          entityName={clue.title}
          deleteEndpoint={`/api/v1/campaigns/${campaignId}/clues/${clueId}`}
          redirectTo={`/campaigns/${campaignId}/clues`}
        />
      </div>
    </div>
  )
}
