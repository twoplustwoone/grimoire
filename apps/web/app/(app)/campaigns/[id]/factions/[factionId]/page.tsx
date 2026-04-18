import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock } from 'lucide-react'
import { FactionEditableFields } from '@/components/entities/faction-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityNotes } from '@/components/entities/entity-notes'
import { InformationNodes } from '@/components/entities/information-nodes'

interface Props { params: Promise<{ id: string; factionId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { factionId } = await params
  const faction = await prisma.faction.findUnique({ where: { id: factionId }, select: { name: true } })
  return { title: faction?.name ?? 'Faction' }
}

export default async function FactionDetailPage({ params }: Props) {
  const { id: campaignId, factionId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const faction = await prisma.faction.findFirst({
    where: { id: factionId, campaignId, deletedAt: null },
    include: { memberships: { include: { npc: { select: { id: true, name: true, status: true } } } } },
  })
  if (!faction) notFound()

  const notes = await prisma.note.findMany({ where: { entityType: 'FACTION', entityId: factionId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'FACTION', entityId: factionId }, orderBy: { createdAt: 'desc' }, take: 20 })
  const infoNodes = await prisma.informationNode.findMany({ where: { campaignId, entityType: 'FACTION', entityId: factionId }, orderBy: { createdAt: 'asc' } })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/factions`} className="hover:underline">Factions</Link>{' / '}
          <span>{faction.name}</span>
        </p>
        <FactionEditableFields
          campaignId={campaignId}
          factionId={factionId}
          name={faction.name}
          description={faction.description}
          agenda={faction.agenda}
          status={faction.status}
        />
      </div>

      {faction.memberships.length > 0 && (
        <Card className="mb-6"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Members</CardTitle></CardHeader>
          <CardContent><div className="space-y-1">{faction.memberships.map((fm) => (
            <div key={fm.npcId} className="flex items-center justify-between">
              <Link href={`/campaigns/${campaignId}/npcs/${fm.npc.id}`} className="text-sm hover:underline">{fm.npc.name}</Link>
              {fm.role && <span className="text-xs text-muted-foreground">{fm.role}</span>}
            </div>
          ))}</div></CardContent></Card>
      )}

      <InformationNodes
        nodes={infoNodes}
        campaignId={campaignId}
        entityType="FACTION"
        entityId={factionId}
      />

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/factions/${factionId}/notes`}
          campaignId={campaignId}
          entityType="FACTION"
          entityId={factionId}
        />
      </div>
      {changelog.length > 0 && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />History</CardTitle></CardHeader><CardContent><div className="space-y-2">{changelog.map((e) => (<div key={e.id} className="flex items-start justify-between text-sm"><div><span className="font-medium">{e.field}</span>{e.oldValue && e.newValue && <span className="text-muted-foreground"> changed from <span className="line-through">{e.oldValue}</span> to {e.newValue}</span>}{!e.oldValue && e.newValue && <span className="text-muted-foreground"> set to {e.newValue}</span>}</div><span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span></div>))}</div></CardContent></Card>)}

      <div className="mt-8 pt-6 border-t border-destructive/20">
        <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
        <DeleteEntityButton
          entityName={faction.name}
          deleteEndpoint={`/api/v1/campaigns/${campaignId}/factions/${factionId}`}
          redirectTo={`/campaigns/${campaignId}/factions`}
        />
      </div>
    </div>
  )
}
