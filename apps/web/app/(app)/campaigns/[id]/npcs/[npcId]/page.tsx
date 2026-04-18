import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { NpcEditableFields } from '@/components/entities/npc-editable-fields'
import { NpcAssignments } from '@/components/entities/npc-assignments'

interface Props {
  params: Promise<{ id: string; npcId: string }>
}

export default async function NPCDetailPage({ params }: Props) {
  const { id: campaignId, npcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
  })
  if (!npc) notFound()

  const notes = await prisma.note.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
  })

  const changelog = await prisma.changelogEntry.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const [availableLocations, availableFactions] = await Promise.all([
    prisma.location.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.faction.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

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
          <Link href={`/campaigns/${campaignId}/npcs`} className="hover:underline">NPCs</Link>
          {' / '}
          <span>{npc.name}</span>
        </p>
        <NpcEditableFields
          campaignId={campaignId}
          npcId={npcId}
          name={npc.name}
          description={npc.description}
          status={npc.status}
        />
      </div>

      <NpcAssignments
        campaignId={campaignId}
        npcId={npcId}
        currentLocationId={npc.locationId}
        currentLocation={npc.location}
        factionMemberships={npc.factionMemberships}
        availableLocations={availableLocations}
        availableFactions={availableFactions}
      />

      {notes.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="text-sm border-l-2 pl-3">
                  <p>{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {changelog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changelog.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between text-sm">
                  <div>
                    <span className="font-medium">{entry.field}</span>
                    {entry.oldValue && entry.newValue && (
                      <span className="text-muted-foreground"> changed from <span className="line-through">{entry.oldValue}</span> to {entry.newValue}</span>
                    )}
                    {!entry.oldValue && entry.newValue && (
                      <span className="text-muted-foreground"> set to {entry.newValue}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
