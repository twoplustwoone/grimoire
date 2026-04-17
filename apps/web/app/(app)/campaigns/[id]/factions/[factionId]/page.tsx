import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock } from 'lucide-react'

interface Props { params: Promise<{ id: string; factionId: string }> }

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/factions`} className="hover:underline">Factions</Link>{' / '}
        </p>
        <h1 className="text-3xl font-bold">{faction.name}</h1>
        {faction.description && <p className="text-muted-foreground mt-2">{faction.description}</p>}
        {faction.agenda && <p className="text-sm text-muted-foreground mt-1 italic">Agenda: {faction.agenda}</p>}
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

      {notes.length > 0 && (<Card className="mb-4"><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><div className="space-y-3">{notes.map((n) => (<div key={n.id} className="text-sm border-l-2 pl-3"><p>{n.content}</p><p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p></div>))}</div></CardContent></Card>)}
      {changelog.length > 0 && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />History</CardTitle></CardHeader><CardContent><div className="space-y-2">{changelog.map((e) => (<div key={e.id} className="flex items-start justify-between text-sm"><div><span className="font-medium">{e.field}</span>{e.oldValue && e.newValue && <span className="text-muted-foreground"> changed from <span className="line-through">{e.oldValue}</span> to {e.newValue}</span>}{!e.oldValue && e.newValue && <span className="text-muted-foreground"> set to {e.newValue}</span>}</div><span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span></div>))}</div></CardContent></Card>)}
    </div>
  )
}
